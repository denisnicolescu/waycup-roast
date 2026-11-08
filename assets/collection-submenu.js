class SubmenuLayout extends HTMLElement {
  constructor() {
    super();
    this.submenuList = this.querySelector('.submenu-list');
    this.resizeObserver = new ResizeObserver(() => this.countRows());

    if (this.submenuList) {
      this.items = Array.from(this.submenuList.querySelectorAll('.submenu-item'));
    }
  }

  connectedCallback() {
    if (!this.submenuList) return;

    this.maxRows = Number(this.submenuList.dataset.maxRows) || 2;

    this.countRows();
    this.resizeObserver.observe(this.submenuList);
    window.addEventListener('resize', this.debouncedCountRows);
  }

  disconnectedCallback() {
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.debouncedCountRows);
  }

  debouncedCountRows = this.debounce(() => this.countRows(), 200);

  countRows() {
    if (!this.items.length) return;

    const firstItem = this.items[0];
    const rowHeight = firstItem?.getBoundingClientRect().height || 0;
    this.submenuList.style.setProperty('--row-height', `${rowHeight}px`);

    let firstTop = firstItem.getBoundingClientRect().top;
    let rowCount = 1;

    this.items.forEach((item) => {
      const itemTop = item.getBoundingClientRect().top;
      if (itemTop !== firstTop) {
        rowCount++;
        firstTop = itemTop;
      }
    });

    const existingRows = this.submenuList.querySelectorAll('.submenu-row');

    if (rowCount >= this.maxRows && existingRows.length === 0) {
      const itemsPerRow = Math.ceil(this.items.length / this.maxRows);
      let rowStartIndex = 0;
      for (let i = 0; i < this.maxRows; i++) {
        const row = document.createElement('div');
        row.classList.add('submenu-row');
        const rowEndIndex = rowStartIndex + itemsPerRow;
        const rowItems = this.items.slice(rowStartIndex, rowEndIndex);
        row.append(...rowItems);
        this.submenuList.appendChild(row);
        rowStartIndex = rowEndIndex;
      }
      this.submenuList.classList.add('scrollable');
    } else if (rowCount < this.maxRows) {
      existingRows.forEach((row) => row.remove());
      this.items.forEach((item) => this.submenuList.appendChild(item));
      this.submenuList.classList.remove('scrollable');
    }

    requestAnimationFrame(() => {
      if (this.submenuList.scrollWidth > this.submenuList.clientWidth) {
        this.submenuList.classList.add('scrollable');
      } else {
        this.submenuList.classList.remove('scrollable');
      }

      this.submenuList.classList.remove('visibly-hidden');
    });
  }

  debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
}

customElements.define('submenu-layout', SubmenuLayout);