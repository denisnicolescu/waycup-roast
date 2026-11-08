class CardProductSwatchExpand {
  constructor(swatch) {
    this.component = swatch;
    this.wrapper = swatch.parentElement;
    this.swatches = swatch.querySelectorAll('.swatch-wrapper');
    this.count = this.swatches.length;
    this.resizeObserver = null;
  }

  async init() {
    this.update();
    this.observeResize();
    this.listenToggleClick();
  }

  getSwatchWidth() {
    const swatch = this.swatches[0];
    return swatch?.offsetWidth || swatch?.clientWidth || 0;
  }

  update() {
    const width = this.getSwatchWidth();

    this.component.querySelector('.swatch-toggle')?.remove();
    this.swatches.forEach(s => s.classList.remove('swatch-hidden'));

    let max = Math.floor(this.wrapper.offsetWidth / width);
    if (max < this.count) {
      max--;
      this.component.classList.add('has-toggle');
    } else {
      this.component.classList.remove('has-toggle');
    }

    this.swatches.forEach((s, i) => i >= max && s.classList.add('swatch-hidden'));
    this.component.classList.remove('visibility-hidden');

    if (max < this.count) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch-toggle';
      btn.dataset.action = 'reveal-swatches';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', 'swatch-list');
      btn.textContent = `+${this.count - max}`;
      this.swatches[max - 1].after(btn);
    }

    if (max >= this.count) {
      this.component.classList.remove('expanded');
    }
  }

  listenToggleClick() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="reveal-swatches"]');
      if (!btn) return;
      const container = btn.closest('card-product-swatch');
      if (!container || container !== this.component) return;
      container.classList.add('expanded');
      btn.remove();
    });
  }

  observeResize() {
    const handler = debounce(() => {
      if (!this.component.classList.contains('expanded')) this.update();
    }, 100);

    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(handler);
      this.resizeObserver.observe(this.wrapper);
    } else {
      window.addEventListener('resize', handler);
    }
  }
}
