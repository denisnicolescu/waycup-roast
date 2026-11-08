class CardProductSwatch extends HTMLElement {
  constructor() {
    super();
    requestAnimationFrame(() => this.init());
  }

  async init() {
    try {
      this.querySelectorAll('.swatch-input__input').forEach(input => {
        input.addEventListener('change', () => this.updateProduct(input));

        input.addEventListener('keydown', e => {
          if ((e.key === 'Enter' || e.key === ' ') && input.checked) {
            const productUrl = input.dataset.productUrl;
            if (productUrl) {
              window.location.href = productUrl;
            }
          }
        });
      });

      if (this.dataset.display === 'expand') {
        const expander = new CardProductSwatchExpand(this);
        await expander.init();
      }
    } catch (error) {
      console.error('Error initialising card-product swatch:', error);
    }
  }

  updateProduct(input) {
    const { productImage, productUrl } = input.dataset;
    const imageBase = productImage && `/cdn/shop/${productImage}`;
    const img = this.parentElement.querySelector('img');
    const link = this.parentElement.querySelector('.full-unstyled-link');

    if (img && imageBase) {
      img.src = `${imageBase}?width=${window.swatches.baseImageSize}`;
      img.srcset = window.swatches.imageSizes.split(",")
        .map(w => `${imageBase}?width=${w} ${w}w`)
        .join(', ');
    }

    if (link && productUrl) {
      link.href = productUrl;
    }
  }
}

customElements.define('card-product-swatch', CardProductSwatch);
