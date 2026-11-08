class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.recommendationProductId = null;
    this.recommendationsRequestController = null;
    this.recommendationAddRequestController = null;
    this.recommendationsRefreshFrame = null;
    this.recommendationOptionsTrigger = null;

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.addEventListener('click', this.handleRecommendationClick.bind(this));
    this.addEventListener('submit', this.handleRecommendationSubmit.bind(this));
    this.addEventListener('change', this.handleRecommendationChange.bind(this));

    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();

    this.recommendationsObserver = new MutationObserver(() => {
      if (!this.classList.contains('active')) return;

      this.scheduleRecommendationsRefresh();
    });

    this.recommendationsObserver.observe(this, {
      childList: true,
      subtree: true,
    });
  }

  disconnectedCallback() {
    this.recommendationsObserver?.disconnect();
    this.abortRecommendationsRequest();
    this.abortRecommendationAddRequest();

    if (this.recommendationsRefreshFrame) {
      cancelAnimationFrame(this.recommendationsRefreshFrame);
    }
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    if (!cartLink) return;

    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');

    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(cartLink);
    });

    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) {
      this.setActiveElement(triggeredBy);

      /*
        A normal cart-icon click should use Liquid's fallback product:
        cart.items.first, which is Shopify's most recently added cart line.
      */
      this.recommendationProductId = null;
    }

    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');

    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) {
      this.setSummaryAccessibility(cartDrawerNote);
    }

    // Here the animation doesn't seem to always get triggered. A timeout seems to help.
    setTimeout(() => {
      this.classList.add('animate', 'active');
      this.scheduleRecommendationsRefresh();
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');

        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');

        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true },
    );

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.closeRecommendationModal({ restoreFocus: false });

    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.abortRecommendationsRequest();
    this.closeRecommendationModal({ restoreFocus: false });

    this.querySelector('.drawer__inner').classList.contains('is-empty') &&
      this.querySelector('.drawer__inner').classList.remove('is-empty');

    this.productId = parsedState.id;

    const addedProductId = this.getAddedProductId(parsedState);

    if (addedProductId) {
      this.recommendationProductId = addedProductId;
    }

    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (!sectionElement) return;

      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getAddedProductId(parsedState) {
    /*
      Standard Ajax cart-add responses return one line item.
      This also safely supports an items array if a multi-add request is used later.
    */
    const addedItems = Array.isArray(parsedState?.items) ? parsedState.items : [parsedState];
    const lastAddedItem = addedItems.at(-1);

    if (!lastAddedItem?.product_id) return null;

    return String(lastAddedItem.product_id);
  }

  handleRecommendationClick(event) {
    const closeButton = event.target.closest('[data-cart-drawer-recommendation-modal-close]');

    if (closeButton) {
      event.preventDefault();
      this.closeRecommendationModal();
      return;
    }

    const directAddButton = event.target.closest('[data-cart-drawer-recommendation-add]');

    if (directAddButton) {
      event.preventDefault();

      this.addRecommendationVariant({
        variantId: directAddButton.dataset.variantId,
        button: directAddButton,
        errorScope: directAddButton.closest('.cart-drawer__recommendation'),
      });

      return;
    }

    const optionsButton = event.target.closest('[data-cart-drawer-recommendation-options]');

    if (optionsButton) {
      event.preventDefault();

      this.openRecommendationOptions({
        productId: optionsButton.dataset.productId,
        trigger: optionsButton,
      });

      return;
    }

    const modal = event.target.closest('[data-cart-drawer-recommendation-modal]');

    /*
      Clicking the native dialog backdrop returns the dialog itself as the target.
      Clicking anything inside the modal should leave it open.
    */
    if (modal && event.target === modal) {
      this.closeRecommendationModal();
    }
  }

  handleRecommendationSubmit(event) {
    const form = event.target.closest('[data-cart-drawer-recommendation-options-form]');

    if (!form) return;

    event.preventDefault();

    const variantSelect = form.querySelector('[data-cart-drawer-recommendation-variant-select]');
    const submitButton = form.querySelector('[data-cart-drawer-recommendation-modal-add]');
    const selectedVariantId = variantSelect?.value;

    if (!selectedVariantId) {
      this.showRecommendationError(form, form.dataset.selectionError);
      variantSelect?.focus();
      return;
    }

    this.clearRecommendationError(form);

    this.addRecommendationVariant({
      variantId: selectedVariantId,
      button: submitButton,
      errorScope: form,
    });
  }

  handleRecommendationChange(event) {
    const variantSelect = event.target.closest('[data-cart-drawer-recommendation-variant-select]');

    if (!variantSelect) return;

    const form = variantSelect.closest('[data-cart-drawer-recommendation-options-form]');

    if (!form) return;

    this.updateRecommendationModalVariantState(form);
    this.clearRecommendationError(form);
  }

  openRecommendationOptions({ productId, trigger }) {
    const productData = this.getRecommendationProductData(productId);
    const modal = this.querySelector('[data-cart-drawer-recommendation-modal]');

    if (!productData || !modal) return;

    const modalContent = modal.querySelector('[data-cart-drawer-recommendation-modal-content]');

    if (!modalContent) return;

    this.recommendationOptionsTrigger = trigger;

    this.buildRecommendationOptionsModal({
      modal,
      modalContent,
      productData,
      productId,
    });

    if (modal.open) {
      modal.close();
    }

    modal.showModal();
  }

  buildRecommendationOptionsModal({ modal, modalContent, productData, productId }) {
    const fragment = document.createDocumentFragment();

    const title = document.createElement('h2');

    title.id = 'CartDrawer-RecommendationModal-Title';
    title.className = 'cart-drawer__recommendation-modal-title h2';
    title.textContent = productData.title;

    const form = document.createElement('form');

    form.className = 'product-form cart-drawer__recommendation-modal-form';
    form.dataset.cartDrawerRecommendationOptionsForm = '';
    form.dataset.productId = productId;
    form.dataset.selectionError = modal.dataset.optionsLabel;

    const field = document.createElement('div');

    field.className = 'product-form__input product-form__input--dropdown cart-drawer__recommendation-modal-field';

    const label = document.createElement('label');
    const selectWrapper = document.createElement('div');
    const select = document.createElement('select');
    const caretIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    const selectId = `CartDrawer-RecommendationVariant-${productId}`;

    label.className = 'form__label cart-drawer__recommendation-modal-label';
    label.htmlFor = selectId;
    label.textContent = modal.dataset.optionsLabel;

    selectWrapper.className = 'select cart-drawer__recommendation-modal-select-wrapper';

    select.id = selectId;
    select.name = 'id';
    select.className = 'select__select cart-drawer__recommendation-modal-select';
    select.dataset.cartDrawerRecommendationVariantSelect = '';

    caretIcon.setAttribute('aria-hidden', 'true');
    caretIcon.setAttribute('focusable', 'false');
    caretIcon.setAttribute('viewBox', '0 0 10 6');
    caretIcon.setAttribute('fill', 'none');
    caretIcon.classList.add('icon', 'icon-caret');

    caretIcon.innerHTML = `
    <path
      fill="currentColor"
      d="M0 0h10L5 6 0 0Z"
    ></path>
  `;

    const placeholderOption = document.createElement('option');

    placeholderOption.value = '';
    placeholderOption.textContent = modal.dataset.optionsLabel;
    placeholderOption.disabled = true;
    placeholderOption.selected = true;

    select.append(placeholderOption);

    productData.variants.forEach((variant) => {
      const option = document.createElement('option');

      option.value = variant.id;
      option.disabled = !variant.available;
      option.dataset.price = variant.price || '';
      option.dataset.compareAtPrice = variant.compareAtPrice || '';

      const variantLabel = [variant.title, variant.price].filter(Boolean).join(' — ');

      option.textContent = variant.available ? variantLabel : `${variantLabel} — ${modal.dataset.soldOutLabel}`;

      select.append(option);
    });

    selectWrapper.append(select, caretIcon);
    field.append(label, selectWrapper);

    const price = document.createElement('div');
    const compareAtPrice = document.createElement('s');
    const currentPrice = document.createElement('span');

    price.className = 'cart-drawer__recommendation-modal-price';
    price.dataset.cartDrawerRecommendationModalPrice = '';
    price.hidden = true;

    compareAtPrice.className = 'cart-drawer__recommendation-modal-price--compare';
    compareAtPrice.dataset.cartDrawerRecommendationModalComparePrice = '';
    compareAtPrice.hidden = true;

    currentPrice.className = 'cart-drawer__recommendation-modal-price--current';
    currentPrice.dataset.cartDrawerRecommendationModalCurrentPrice = '';

    price.append(compareAtPrice, currentPrice);

    const error = document.createElement('p');

    error.className = 'cart-drawer__recommendation-modal-error form__message';
    error.dataset.cartDrawerRecommendationError = '';
    error.setAttribute('role', 'alert');
    error.hidden = true;

    const actions = document.createElement('div');
    const submitButton = document.createElement('button');
    const submitLabel = document.createElement('span');
    const submitSpinner = document.createElement('span');

    actions.className = 'product-form__buttons cart-drawer__recommendation-modal-actions';

    submitButton.type = 'submit';
    submitButton.className = 'button button--secondary button--full-width cart-drawer__recommendation-modal-add';
    submitButton.dataset.cartDrawerRecommendationModalAdd = '';
    submitButton.disabled = true;

    submitLabel.dataset.cartDrawerRecommendationAddLabel = '';
    submitLabel.textContent = modal.dataset.addToCartLabel;

    submitSpinner.className = 'loading__spinner hidden';
    submitSpinner.dataset.cartDrawerRecommendationAddSpinner = '';
    submitSpinner.setAttribute('aria-hidden', 'true');
    submitSpinner.innerHTML = `
    <svg
      focusable="false"
      class="spinner"
      viewBox="0 0 66 66"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        class="path"
        fill="none"
        stroke-width="6"
        cx="33"
        cy="33"
        r="30"
      ></circle>
    </svg>
  `;

    submitButton.append(submitLabel, submitSpinner);
    actions.append(submitButton);

    form.append(price, field, error, actions);
    fragment.append(title, form);

    modalContent.replaceChildren(fragment);
  }

  updateRecommendationModalVariantState(form) {
    const variantSelect = form.querySelector('[data-cart-drawer-recommendation-variant-select]');
    const submitButton = form.querySelector('[data-cart-drawer-recommendation-modal-add]');
    const price = form.querySelector('[data-cart-drawer-recommendation-modal-price]');
    const compareAtPrice = form.querySelector('[data-cart-drawer-recommendation-modal-compare-price]');
    const currentPrice = form.querySelector('[data-cart-drawer-recommendation-modal-current-price]');

    const selectedOption = variantSelect?.options[variantSelect.selectedIndex];
    const selectedVariantId = selectedOption?.value;
    const selectedVariantPrice = selectedOption?.dataset.price || '';
    const selectedVariantCompareAtPrice = selectedOption?.dataset.compareAtPrice || '';

    const hasSelectedVariant = Boolean(selectedVariantId);

    submitButton.disabled = !hasSelectedVariant;
    price.hidden = !hasSelectedVariant;

    if (!hasSelectedVariant) {
      currentPrice.textContent = '';
      compareAtPrice.textContent = '';
      compareAtPrice.hidden = true;
      return;
    }

    currentPrice.textContent = selectedVariantPrice;

    compareAtPrice.textContent = selectedVariantCompareAtPrice;
    compareAtPrice.hidden = !selectedVariantCompareAtPrice;
  }

  closeRecommendationModal({ restoreFocus = true } = {}) {
    const modal = this.querySelector('[data-cart-drawer-recommendation-modal]');

    if (modal?.open) {
      modal.close();
    }

    if (restoreFocus && this.recommendationOptionsTrigger?.isConnected) {
      requestAnimationFrame(() => {
        this.recommendationOptionsTrigger?.focus();
      });
    }

    this.recommendationOptionsTrigger = null;
  }

  getRecommendationProductData(productId) {
    const productDataScript = [...this.querySelectorAll('[data-cart-drawer-recommendation-product]')].find(
      (script) => script.dataset.cartDrawerRecommendationProduct === String(productId),
    );

    if (!productDataScript) return null;

    try {
      return JSON.parse(productDataScript.textContent);
    } catch (error) {
      console.error('Cart drawer recommendation product data could not be parsed.', error);
      return null;
    }
  }

  addRecommendationVariant({ variantId, button, errorScope }) {
    if (!variantId || !button || this.recommendationAddRequestController) return;

    this.clearRecommendationError(errorScope);
    this.setRecommendationAddButtonLoading(button, true);

    const requestController = new AbortController();

    this.recommendationAddRequestController = requestController;

    const requestBody = {
      items: [
        {
          id: variantId,
          quantity: 1,
        },
      ],
      sections: this.getSectionsToRender().map((section) => section.id),
      sections_url: window.location.pathname,
    };

    fetch(this.getCartAddUrl(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: requestController.signal,
    })
      .then(async (response) => {
        const parsedState = await response.json();

        if (!response.ok) {
          throw new Error(
            parsedState.description || parsedState.message || 'The product could not be added to the cart.',
          );
        }

        if (!parsedState.sections) {
          throw new Error('The cart was updated, but the refreshed drawer content was unavailable.');
        }

        return parsedState;
      })
      .then((parsedState) => {
        if (this.recommendationAddRequestController !== requestController) return;

        this.renderContents(parsedState);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;

        console.error('Cart drawer recommendation could not be added.', error);

        if (this.recommendationAddRequestController === requestController) {
          this.showRecommendationError(errorScope, error.message);
        }
      })
      .finally(() => {
        if (this.recommendationAddRequestController !== requestController) return;

        this.setRecommendationAddButtonLoading(button, false);
        this.recommendationAddRequestController = null;
      });
  }

  getCartAddUrl() {
    if (window.routes?.cart_add_url) {
      return window.routes.cart_add_url;
    }

    const root = window.Shopify?.routes?.root || '/';
    const localeRoot = root.endsWith('/') ? root : `${root}/`;

    return `${localeRoot}cart/add.js`;
  }

  setRecommendationAddButtonLoading(button, isLoading) {
    if (!button) return;

    const label = button.querySelector('[data-cart-drawer-recommendation-add-label]');
    const spinner = button.querySelector('[data-cart-drawer-recommendation-add-spinner]');

    button.disabled = isLoading;
    button.setAttribute('aria-busy', String(isLoading));
    button.classList.toggle('is-loading', isLoading);

    if (label) {
      label.hidden = isLoading;
    }

    if (spinner) {
      spinner.classList.toggle('hidden', !isLoading);
    }
  }

  abortRecommendationAddRequest() {
    if (!this.recommendationAddRequestController) return;

    this.recommendationAddRequestController.abort();
    this.recommendationAddRequestController = null;
  }

  showRecommendationError(scope, message) {
    if (!scope) return;

    let errorElement = scope.querySelector('[data-cart-drawer-recommendation-error]');

    if (!errorElement) {
      errorElement = document.createElement('p');
      errorElement.className = 'cart-drawer__recommendation-error';
      errorElement.dataset.cartDrawerRecommendationError = '';
      errorElement.setAttribute('role', 'alert');

      const actionContainer =
        scope.querySelector('.cart-drawer__recommendation-actions') ||
        scope.querySelector('.cart-drawer__recommendation-modal-form') ||
        scope;

      actionContainer.append(errorElement);
    }

    errorElement.textContent = message;
    errorElement.hidden = false;
  }

  clearRecommendationError(scope) {
    const errorElement = scope?.querySelector('[data-cart-drawer-recommendation-error]');

    if (!errorElement) return;

    errorElement.textContent = '';
    errorElement.hidden = true;
  }

  scheduleRecommendationsRefresh() {
    if (this.recommendationsRefreshFrame) {
      cancelAnimationFrame(this.recommendationsRefreshFrame);
    }

    this.recommendationsRefreshFrame = requestAnimationFrame(() => {
      this.recommendationsRefreshFrame = null;
      this.loadRecommendations();
    });
  }

  loadRecommendations() {
    const recommendationsMount = this.querySelector('[data-cart-drawer-recommendations]');

    if (!recommendationsMount) {
      this.abortRecommendationsRequest();
      this.toggleRecommendationsVisibility(null, false);
      return;
    }

    const productId = this.getRecommendationProductId(recommendationsMount);

    if (!productId) {
      this.abortRecommendationsRequest();
      this.toggleRecommendationsVisibility(recommendationsMount, false);
      return;
    }

    /*
      The drawer was already rendered for this source product.
      This prevents duplicate requests caused by the MutationObserver.
    */
    if (recommendationsMount.dataset.loadedForProductId === productId) {
      return;
    }

    this.abortRecommendationsRequest();

    const requestController = new AbortController();

    this.recommendationsRequestController = requestController;

    recommendationsMount.dataset.loadedForProductId = productId;
    recommendationsMount.setAttribute('aria-busy', 'true');

    this.toggleRecommendationsVisibility(recommendationsMount, false);

    const recommendationsUrl = new URL(recommendationsMount.dataset.recommendationsUrl, window.location.origin);

    recommendationsUrl.searchParams.set('product_id', productId);
    recommendationsUrl.searchParams.set('section_id', recommendationsMount.dataset.sectionId);
    recommendationsUrl.searchParams.set('limit', recommendationsMount.dataset.limit);
    recommendationsUrl.searchParams.set('intent', 'related');

    fetch(recommendationsUrl.toString(), {
      signal: requestController.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Recommendations request failed with status ${response.status}.`);
        }

        return response.text();
      })
      .then((html) => {
        /*
          A newer recommendation request started while this one was loading.
          Never allow older results to overwrite newer recommendations.
        */
        if (this.recommendationsRequestController !== requestController) {
          return;
        }

        const responseDocument = new DOMParser().parseFromString(html, 'text/html');

        const recommendationsContent = responseDocument.querySelector('#CartDrawer-Recommendations-Content');

        if (!recommendationsContent) {
          this.toggleRecommendationsVisibility(recommendationsMount, false);
          return;
        }

        recommendationsMount.innerHTML = recommendationsContent.outerHTML;

        this.toggleRecommendationsVisibility(recommendationsMount, true);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;

        console.error('Cart drawer recommendations could not be loaded.', error);

        if (this.recommendationsRequestController === requestController) {
          this.toggleRecommendationsVisibility(recommendationsMount, false);
        }
      })
      .finally(() => {
        if (this.recommendationsRequestController === requestController) {
          recommendationsMount.removeAttribute('aria-busy');
          this.recommendationsRequestController = null;
        }
      });
  }

  getRecommendationProductId(recommendationsMount) {
    const cartProductIds = this.getCartProductIds();

    /*
      Keep using the product just added as long as it remains in cart.
      This survives drawer rerenders caused by quantity changes.
    */
    if (this.recommendationProductId && cartProductIds.includes(this.recommendationProductId)) {
      return this.recommendationProductId;
    }

    /*
      If that product was removed, use Liquid's fallback:
      the first remaining cart line, which is Shopify's most recently added item.
    */
    const fallbackProductId = recommendationsMount.dataset.productId;

    if (fallbackProductId && cartProductIds.includes(fallbackProductId)) {
      this.recommendationProductId = fallbackProductId;

      return fallbackProductId;
    }

    this.recommendationProductId = null;

    return null;
  }

  getCartProductIds() {
    return [...this.querySelectorAll('[data-cart-product-id]')]
      .map((item) => item.dataset.cartProductId)
      .filter(Boolean);
  }

  toggleRecommendationsVisibility(recommendationsMount, isVisible) {
    const drawerInner = this.querySelector('.drawer__inner');

    drawerInner?.classList.toggle('has-recommendations', isVisible);

    if (!recommendationsMount) return;

    recommendationsMount.hidden = !isVisible;
    recommendationsMount.classList.toggle('is-loaded', isVisible);

    if (!isVisible) {
      recommendationsMount.replaceChildren();
    }
  }

  abortRecommendationsRequest() {
    if (!this.recommendationsRequestController) return;

    this.recommendationsRequestController.abort();
    this.recommendationsRequestController = null;
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);
