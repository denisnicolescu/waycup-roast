class PaginationLoadMore extends HTMLElement {
  constructor() {
    super();

    this.nextPage = this.dataset.nextPage;
    if (!this.nextPage) return;

    this.type = this.dataset.type; // standard | load_more | infinite
    this.containerSelector = this.dataset.container;
    this.grid = document.querySelector(this.containerSelector);
    this.button = this.querySelector('button');
    this.spinner = this.querySelector('.pagination__item .loading__spinner');
    this.isLoading = false;

    this.loadItems = this.loadItems.bind(this);
    this.handleIntersect = this.handleIntersect.bind(this);

    if (this.type === 'infinite') {
      this.button?.addEventListener('click', async (e) => {
        await this.loadItems(e);
        this.initObserver();
        this.hideButton();
      });
    } else {
      this.button.addEventListener('click', this.loadItems);
    }
  }

  initObserver() {
    if (!this.observer) {
      this.observer = new IntersectionObserver(this.handleIntersect, {
        rootMargin: '200px',
      });
    }
    this.observer.observe(this);
  }

  async loadItems(event) {
    if (event) event.preventDefault();
    if (this.isLoading || !this.nextPage) return;

    this.isLoading = true;
    this.button?.setAttribute('disabled', 'disabled');
    this.button?.classList.add('loading');
    this.spinner?.classList.remove('hidden');

    try {
      const response = await fetch(this.nextPage);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const text = await response.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const newItems = doc.querySelector(this.containerSelector)?.innerHTML;
      const nextPagination = doc.querySelector('pagination-load-more');

      if (newItems && this.grid) {
        this.grid.insertAdjacentHTML('beforeend', newItems);
      }
      if (nextPagination?.dataset.nextPage) {
        this.nextPage = nextPagination.dataset.nextPage;
      } else {
        this.nextPage = null;
        this.observer?.disconnect();
        this.remove();
      }
    } catch (error) {
      console.error("Pagination error:", error);
    } finally {
      this.isLoading = false;
      this.button?.removeAttribute('disabled');
      this.button?.classList.remove('loading');
      this.spinner?.classList.add('hidden');
    }
  }

  handleIntersect(entries) {
    const [entry] = entries;
    if (entry.isIntersecting && !this.isLoading) {
      this.loadItems();
    }
  }

  hideButton() {
    if (this.button) this.button.classList.add('hidden');
  }
}

customElements.define('pagination-load-more', PaginationLoadMore);
