class BreadcrumbsManager {
  constructor(wrapperSelector = '.breadcrumbs', containerSelector = '.breadcrumbs ol') {
    this.selectors = {
      wrapper: document.querySelector(wrapperSelector),
      container: document.querySelector(containerSelector)
    }
  }

  async init() {
    try {
      await this.setup();
    } catch (e) {
      console.warn('[BreadcrumbsManager] Error:', e);
    } finally {
      this.selectors.wrapper?.classList.remove('invisible');
      this.injectStructuredData();
    }
  }

  async setup() {
    if (!this.selectors.container) return;

    const isCollectionPage = window.location.href.includes('/collections/');
    const sourceUrl = this.getSourceUrl(isCollectionPage);
    if (!sourceUrl) return;

    const breadcrumb = this.getBreadcrumbData(sourceUrl);
    if (!breadcrumb) return;

    const titles = isCollectionPage ? breadcrumb.title?.slice(1) : breadcrumb.title;
    const urls = isCollectionPage ? breadcrumb.urls?.slice(1) : breadcrumb.urls;

    if (titles?.length) {
      this.insertItems(titles, urls);
      this.removeDynamicItems();
    }
  }

  getSourceUrl(isCollectionPage) {
    if (isCollectionPage) {
      return window.location.href;
    }
    if (document.referrer.includes('/collections/')) {
      return document.referrer;
    }
    return document.querySelector('.dynamic-breadcrumb-removable.onlyone a')?.href;
  }

  getBreadcrumbData(url) {
    try {
      const pathname = new URL(url).pathname;
      return window.breadcrumbs?.[pathname];
    } catch {
      return null;
    }
  }

  insertItems(titles, urls) {
    const firstListItem = this.selectors.container.querySelector('li');
    if (!firstListItem) return;

    titles.forEach((title, index) => {
      if (!title || !urls?.[index]) return;

      const listItem = document.createElement('li');
      const link = document.createElement('a');

      link.href = urls[index];
      link.textContent = title;

      listItem.appendChild(link);
      this.selectors.container.insertBefore(listItem, firstListItem.nextSibling);
    });
  }

  removeDynamicItems() {
    document.querySelectorAll('.dynamic-breadcrumb-removable').forEach(el => el.remove());
  }

  generateStructuredData() {
    const ol = this.selectors.container;
    if (!ol) return null;

    const items = Array.from(ol.querySelectorAll('li'));
    const itemListElement = items.map((li, index) => {
      const anchor = li.querySelector('a');
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: anchor ? anchor.textContent.trim() : li.textContent.trim(),
        ...(anchor && { item: anchor.href })
      };
    });

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement
    };
  }

  injectStructuredData() {
    const jsonLdData = this.generateStructuredData();
    if (!jsonLdData) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLdData, null, 2);
    document.head.appendChild(script);
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const breadcrumbs = new BreadcrumbsManager();
  breadcrumbs.init();
});
