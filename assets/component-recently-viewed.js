class RecentlyViewed extends HTMLElement {
    constructor() {
      super();
      this.grid = this.querySelector('.grid');
      this.sectionId = this.dataset.sectionId;
      this.slider = this.querySelector('slider-component');
      this.sliderNavigation = this.querySelector('.slider-buttons');
      this.columnsDesktop = parseInt(this.dataset.columnsDesktop, 10);
      this.columnsMobile = parseInt(this.dataset.columnsMobile, 10);

      this.render().then(() => {
        this.reinitSlider();
        this.toggleNavButtons();
      });
    }

    async render() {
      const visitedProducts = JSON.parse(localStorage.getItem('visitedProducts')) || [];
      if (visitedProducts.length === 0) {
        this.remove();
        return;
      }

      const pathNameEntries = new URL(window.location.href).pathname.split('/');
      const arrayOfHandles = visitedProducts
        .map((prod) => prod.handle)
        .filter((handle, index) => pathNameEntries.includes(handle) === false);

      let responses = [];
      try {
        responses = await Promise.all(
          arrayOfHandles.map((prod) =>
            fetch(`${window.routes.root}products/${prod}?section_id=api-product-grid-item`)
          )
        );
      } catch (error) {
        console.error('Error fetching product data:', error);
        this.remove();
        return;
      }
      const validResponses = responses.filter((res) => res.ok);
      let texts = await Promise.all(validResponses.map((res) => res.text()));

      if (texts.some((text) => text === '')) {
        texts = texts.filter((text) => text !== '');
      }

      if (texts.length === 0) {
        this.remove()
        return;
      }

      const slides = texts.map((product, index) => {
        const slide = document.createElement('li');
        slide.id = `Slide-${this.sectionId}-${index + 1}`;
        slide.setAttribute('data-cascade', '');
        slide.style.setProperty('--animation-order', index + 1);
        slide.classList.add('grid__item', 'slider__slide');
        const content = new DOMParser().parseFromString(product, 'text/html');
        const contentCard = content.querySelector('.shopify-section');
        slide.innerHTML = contentCard.innerHTML;
        return slide;
      });

      this.grid.innerHTML = '';
      if (slides.length > 0) {
        this.grid.setAttribute('role', 'list');
      }
      slides.forEach((slide) => this.grid.appendChild(slide));
      this.classList.remove('visually-hidden')
    }

    reinitSlider() {
      if (this.slider) {
        this.slider.resetPages();
      }
    }

    toggleNavButtons() {
      const sliderItems = this.querySelectorAll('.grid__item');

      if (window.innerWidth >= 990 && this.columnsDesktop > sliderItems.length) {
        this.sliderNavigation.classList.add('hidden');
      } else if (window.innerWidth < 990 && this.columnsMobile > sliderItems.length) {
        this.sliderNavigation.classList.add('hidden');
      }
    }
  }

  customElements.define('recently-viewed', RecentlyViewed);
