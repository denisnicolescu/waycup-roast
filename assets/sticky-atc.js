class StickyCart extends HTMLElement {
  constructor() {
    super();
    this.mainATC = document.querySelector('.product-form');
    this.productVariants = JSON.parse(this.dataset.productData || '[]');
    this.checkStickyVisibility = this.checkStickyVisibility.bind(this);
    this.init();
  }

  connectedCallback() {
    this.setupListeners();
  }

  disconnectedCallback() {
    document.removeEventListener('scroll', this.checkStickyVisibility);
    window.removeEventListener('resize', this.checkStickyVisibility);
  }

  init() {
    if (!this.mainATC) return;

    this.checkStickyVisibility();
    this.initStickyATC();
    this.initVariantSelectors();
    this.subscribeToMainVariantChange();

    const mainVariantId = this.mainATC.querySelector('input[name="id"]')?.value;
    const currentVariant = this.productVariants.find(v => v.id === Number(mainVariantId));
    if (currentVariant) this.updateUIWithVariant(currentVariant);
  }

  setupListeners() {
    document.addEventListener('scroll', this.checkStickyVisibility);
    window.addEventListener('resize', this.checkStickyVisibility);
  }

  checkStickyVisibility() {
    const isDesktop = window.innerWidth > 768;
    const isEnabled = isDesktop
      ? this.dataset.enabledDesktop === 'true'
      : this.dataset.enabledMobile === 'true';

    if (!isEnabled || !this.mainATC) {
      this.classList.add('visually-hidden');
      return;
    }

    const rect = this.mainATC.getBoundingClientRect();
    if (rect.bottom < 0) {
      this.classList.remove('visually-hidden');
    } else if (rect.top > 0) {
      this.classList.add('visually-hidden');
    }
  }

  initStickyATC() {
    const stickyBtn = this.querySelector('.sticky-atc__submit');
    if (stickyBtn && this.mainATC) {
      stickyBtn.addEventListener('click', () => {
        this.mainATC.querySelector('[type="submit"]')?.click();
      });
    }
  }

  initVariantSelectors() {
    const selects = this.querySelectorAll('.sticky-atc__variants select');

    selects.forEach(select => {
      select.addEventListener('change', () => {
        const selectedOptions = Array.from(selects).map(s => s.value);
        const matchedVariant = this.productVariants.find(v =>
          v.options.every((opt, i) => opt === selectedOptions[i])
        );
        if (!matchedVariant) return;

        // when user changes variant in sticky atc, update main form
        this.syncMainFormVariant(matchedVariant);
      });
    });
  }

  // when user changes variants in the main product form
  subscribeToMainVariantChange() {
    const subscribeFn = window.subscribe || (typeof subscribe !== 'undefined' && subscribe);
    const events = window.PUB_SUB_EVENTS || (typeof PUB_SUB_EVENTS !== 'undefined' && PUB_SUB_EVENTS);

    if (typeof subscribeFn === 'function' && events?.variantChange) {
      subscribeFn(events.variantChange, ({ data }) => {
        if (data?.variant) {
          this.updateUIWithVariant(data.variant);
          this.syncStickyVariantSelectors(data.variant);

          const mainForm = document.querySelector('.product-form__buttons');
          if (mainForm) {
            this.dataset.preorderActive = mainForm.dataset.preorderActive || 'false';
            this.dataset.preorderExpired = mainForm.dataset.preorderExpired || 'false';
          }

          this.updateStickyButton(data.variant);
        }
      });
    }
  }

  syncMainFormVariant(variant) {
    const variantPicker = document.querySelector('variant-selects');
    if (!variantPicker) return;

    const groups = variantPicker.querySelectorAll('fieldset, select');

    variant.options.forEach((val, i) => {
      let updated = false;

      // radio
      const radios = groups[i]?.querySelectorAll('input[type="radio"]');
      if (radios?.length) {
        const match = Array.from(radios).find(r => r.value === val);
        if (match && !match.checked) {
          match.checked = true;
          match.dispatchEvent(new Event('change', { bubbles: true }));
          updated = true;
        }
      }

      // select
      if (!updated) {
        const selectField = groups[i]?.tagName === 'SELECT' ? groups[i] : groups[i]?.querySelector('select');
        if (selectField && selectField.value !== val) {
          selectField.value = val;
          selectField.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
  }

  updateStickyImage(variant) {
    const img = this.querySelector('.sticky-atc__image img');
    if (!img) return;

    const fallbackImg = document.querySelector('.product__media-wrapper img');
    const fallbackSrc = fallbackImg?.getAttribute('src');
    const fallbackAlt = fallbackImg?.getAttribute('alt') || 'Product image';

    const variantImg = variant?.featured_image?.src;
    const alt = variant?.featured_image?.alt || variant?.name || fallbackAlt;
    const srcset = variant?.featured_image?.srcset || '';

    img.src = variantImg || fallbackSrc || '';
    img.srcset = srcset;
    img.alt = alt;
  }

  updateStickyPrice(variant) {
    const container = this.querySelector('#StickyCartPrice');
    if (!container) return;

    const moneyFormat = this.dataset.moneyFormat ||' {{amount}}';

    const formatMoney = (amount) => {
      if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
        return Shopify.formatMoney(amount, moneyFormat);
      }
      const formatted = (amount / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return moneyFormat.replace('{{amount}}', formatted);
    };

    const showSale = variant.compare_at_price && variant.compare_at_price > variant.price;
    const saleWrapper = container.querySelector('.price--sale');
    if (saleWrapper) saleWrapper.classList.toggle('hidden', !showSale);

    const regularWrapper = container.querySelector('.price--regular');
    if (regularWrapper) regularWrapper.classList.toggle('hidden', showSale);

    const regular = container.querySelector('.price-item--regular');
    if (regular) regular.textContent = formatMoney(variant.compare_at_price);

    const sale = container.querySelector('.price-item--sale');
    if (sale) sale.textContent = formatMoney(variant.price);

    const single = container.querySelector('.price-item--single');
    if (single) single.textContent = formatMoney(variant.price);
  }

  updateStickyButton(variant) {
    const btn = this.querySelector('.sticky-atc__submit');
    if (!btn) return;

    const isTracked = variant.inventory_management === 'shopify';
    const preorderActive = this.dataset.preorderActive === 'true';
    const preorderExpired = this.dataset.preorderExpired === 'true';

    if (isTracked) {
      btn.textContent = variant.available ? window.variantStrings.addToCart : window.variantStrings.soldOut;
      btn.disabled = !variant.available;
      btn.classList.toggle('disabled', !variant.available);
    } else {
      const btnLabel = btn.querySelector('span');
      if (preorderActive || !variant.available) {
        if (btnLabel) btnLabel.textContent = window.variantStrings.preOrder;
        btn.disabled = false;
        btn.classList.remove('disabled');
      } else if (preorderExpired) {
        if (btnLabel) btnLabel.textContent = window.variantStrings.outOfStock;
        btn.disabled = true;
        btn.classList.add('disabled');
      }
    }
  }

  syncStickyVariantSelectors(variant) {
    const selects = this.querySelectorAll('.sticky-atc__variants select');
    if (!selects.length || !variant?.options) return;

    selects.forEach((select, i) => {
      const val = variant.options[i];
      const option = Array.from(select.options).find(o => o.value === val);
      if (option) select.value = option.value;
    });
  }

  updateVariantSummary(variant) {
    const summary = this.querySelector('.variant-summary');
    if (summary && variant?.options) {
      summary.textContent = variant.options.join(' / ');
    }
  }

  updateUIWithVariant(variant) {
    this.updateStickyImage(variant);
    this.updateStickyPrice(variant);
    this.updateStickyButton(variant);
    this.syncStickyVariantSelectors(variant);
    this.updateVariantSummary(variant);
  }
}

customElements.define('sticky-atc', StickyCart);