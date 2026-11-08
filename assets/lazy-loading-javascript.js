window.addEventListener('scroll', async function loadStickyHeaderScriptOnScroll() {
    try {
      await importScript(window.dynamicImport.stickyHeader);
    } catch (error) {
      console.error('Failed to load sticky header script:', error);
    }
    window.removeEventListener('scroll', loadStickyHeaderScriptOnScroll);
});
window.addEventListener('scroll', async function loadBackToTopOnScroll() {
  try {
    await importScript(window.dynamicImport.backToTop);
  } catch (error) {
    console.error('Failed to load back-to-top script:', error);
  }
  window.removeEventListener('scroll', loadBackToTopOnScroll);
});
class LazyLoadingJs extends HTMLElement {
  constructor() {
    super();
    this.isLoading = null; // null (not loaded), true (loading), false (loaded)
    this.events = ['mouseenter', 'touchstart', 'click'];
    this.init();
  }

  init() {
    const { url, intersection, intersectionThreshold, ...dataset } = this.dataset;
    if (!url) return;
    this.clickStatus = false;
    this.url = url;
    this.datasetParams = dataset;
    this.intersectionThreshold = parseFloat(intersectionThreshold) || 0.1;

    if (intersection) {
      this.observeIntersection();
    } else {
      this.addEventListeners();
    }
  }

  async loadScript() {
    if (this.isLoading === false) return;
    if (this.isLoading === true) {
      return new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (this.isLoading === false) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
      });
    }

    // Start loading
    this.isLoading = true;
    try {
      await importScript(this.url, this.datasetParams);
    } catch (error) {
      console.error('Failed to load script:', error);
    }
    this.isLoading = false;
  }

  async handleEvent(event) {
    if (event.type === 'click') {
      this.clickStatus = true;
    }
    await this.loadScript();
    if (this.isLoading !== false) return;

    this.events.forEach((eventType) => this.removeEventListener(eventType, this.handleEvent));
    if (this.clickStatus === true) event.target.click(); // Re-trigger click if applicable
  }

  observeIntersection() {
    const observer = new IntersectionObserver(
      (entries, observerInstance) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.loadScript();
            observerInstance.unobserve(entry.target);
          }
        });
      },
      { threshold: this.intersectionThreshold }
    );

    observer.observe(this);
  }

  addEventListeners() {
    this.events.forEach((eventType) =>
      this.addEventListener(eventType, this.handleEvent.bind(this), { once: true, passive: true })
    );
  }
}

customElements.define('lazy-loading-js', LazyLoadingJs);
