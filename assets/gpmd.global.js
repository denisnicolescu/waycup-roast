function importScript(scriptPath, dataset = {}) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${scriptPath}"]`)) {
      return resolve();
    }
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = scriptPath;
    for (const [key, value] of Object.entries(dataset)) {
      if (key.startsWith('args')) {
        const attributeName = key.slice(4).toLowerCase();
        script.setAttribute(attributeName, value);
      }
    }
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function importCss(path) {
  const existing = document.querySelector(`link[href="${path}"]`);
  if (existing) {
    return existing.sheet
      ? Promise.resolve()
      : new Promise((resolve) => {
          existing.addEventListener('load', resolve, { once: true });
        });
  }
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = path;
    link.onload = resolve;
    link.onerror = resolve;
    document.head.appendChild(link);
  });
}

class SectionRenderer extends HTMLElement {
  constructor() {
    super();
    this.init();
  }

  importAllCss() {
    if (!this.dataset.css) return Promise.resolve();
    return Promise.all(this.dataset.css.split(',').map(url => importCss(url.trim())));
  }

  init() {
    this.addEventListener('click', () => this.handleClick(this));
    // Preload CSS + prefetch section HTML on hover/touch
    const preload = () => {
      this.importAllCss();
      if (this.dataset.url && !this._prefetch) {
        this._prefetch = this.fetch(this.dataset.url).then(html => { this._prefetchedHtml = html; }).catch(() => {});
      }
      this.removeEventListener('pointerenter', preload);
      this.removeEventListener('touchstart', preload);
    };
    this.addEventListener('pointerenter', preload);
    this.addEventListener('touchstart', preload, { passive: true });
  }

  async handleClick(section) {
    const { url, type, script, target } = section.dataset;
    try {
      const sectionId = this.extractSectionId(url);

      // If a target shell exists, activate it immediately then fill content async
      if (target) {
        const targetEl = document.querySelector(target);
        const drawer = targetEl?.closest('.drawer');
        if (drawer) {
          this.activate(section, type, null, drawer);

          // Body already populated (re-open) — just load deps
          if (targetEl.children.length > 0) {
            await Promise.all([this.importAllCss(), script ? importScript(script) : Promise.resolve()]);
            return;
          }

          const [content] = await Promise.all([
            this._prefetchedHtml || (this._prefetch ? this._prefetch.then(() => this._prefetchedHtml) : this.fetch(url)),
            this.importAllCss(),
            script ? importScript(script) : Promise.resolve(),
          ]);

          const parsed = new DOMParser().parseFromString(content, 'text/html');
          const source = parsed.querySelector('.drawer__inner');
          if (source) {
            const nodes = source.querySelectorAll(':scope > :not(.drawer__header)');
            targetEl.replaceChildren();
            nodes.forEach(node => targetEl.appendChild(document.adoptNode(node)));
          }
          return;
        }
      }

      // Already in DOM (e.g. re-open) — just activate
      if (document.getElementById(`shopify-section-${sectionId}`)) {
        await Promise.all([this.importAllCss(), script ? importScript(script) : Promise.resolve()]);
        this.activate(section, type, sectionId);
        return;
      }

      // Fallback: no shell, render from scratch
      document.body.classList.add('overflow-hidden');
      const [content] = await Promise.all([
        this._prefetchedHtml || (this._prefetch ? this._prefetch.then(() => this._prefetchedHtml) : this.fetch(url)),
        this.importAllCss(),
        script ? importScript(script) : Promise.resolve(),
      ]);
      this.render(content);
      this.activate(section, type, sectionId);
    } catch (error) {
      document.body.classList.remove('overflow-hidden');
      SectionRenderer.hide();
      console.error('Error handling section click:', error);
    }
  }

  async fetch(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch content: ${response.statusText}`);
    return response.text();
  }
  render(html) {
    document.body.insertAdjacentHTML('beforeend', html);
  }

  activate(section, type, sectionId, element) {
    document.body.classList.add('overflow-hidden');
    switch (type) {
      case 'modal':
        this.activateModal(sectionId);
        break;
      case 'drawer':
        this.activateDrawer(sectionId, element);
        break;
      default:
        console.warn(`Unknown section type: ${type}`);
    }
  }

  activateModal(sectionId) {
    const modal = document.querySelector(`[data-section="${sectionId}"]`);
    const triggerButton = document.activeElement;
    modal.setAttribute('open', 'true');

    this.trapFocus(modal);

    const closeButton = modal.querySelector('[aria-label="Close"]');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        modal.removeAttribute('open');
        modal.classList.remove('active');
        if (triggerButton) triggerButton.focus();
      });
    }
  }

  activateDrawer(sectionId, drawerEl) {
    let drawer = drawerEl;
    if (!drawer) {
      const sectionEl = document.getElementById(`shopify-section-${sectionId}`);
      drawer = sectionEl.querySelector('.drawer') || sectionEl.firstElementChild;
    }
    const triggerButton = document.activeElement;

    setTimeout(() => {
      drawer.classList.add('active');

      setTimeout(() => {
        this.trapFocus(drawer);
      }, 200); // delay to match CSS animation duration
    }, 0);

    drawer.addEventListener('transitionend', () => {
      if (!drawer.classList.contains('active') && triggerButton) {
        triggerButton.focus();
      }
    });

    // Bind close handlers via JS for iOS compatibility
    if (!drawer._closeHandlersBound) {
      drawer._closeHandlersBound = true;
      const closeDrawer = (e) => {
        if (!e.target.closest('.drawer__inner')) SectionRenderer.hide();
      };
      drawer.addEventListener('click', closeDrawer);

      const inner = drawer.querySelector('.drawer__inner');
      if (inner) inner.addEventListener('click', (e) => e.stopPropagation());

      const closeBtn = drawer.querySelector('.drawer__close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => { e.stopPropagation(); SectionRenderer.hide(); });
      }
    }
  }

  trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );

    if (element.hasAttribute('tabindex') && element.getAttribute('tabindex') === '-1') {
      focusableElements.unshift(element);
    }

    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];

    function handleFocus(event) {
      if (event.shiftKey && document.activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    }

    function keydownListener(event) {
      if (event.key === 'Tab') {
        handleFocus(event);
      } else if (event.key === 'Escape') {
        SectionRenderer.hide();
        document.removeEventListener('keydown', keydownListener);
      }
    }

    document.addEventListener('keydown', keydownListener);
    if (firstFocusableElement) {
      firstFocusableElement.focus();
    } else {
      console.warn('No focusable elements found in the drawer.');
    }
  }

  extractSectionId(url) {
    const match = url.match(/[?&]section_id=([^&]+)/);
    return match?.[1] ?? null;
  }
  static hide() {
    document.body.classList.remove('overflow-hidden');
    document.querySelectorAll('.section-renderer').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.drawer.active').forEach((el) => el.classList.remove('active'));
  }
}

customElements.define('section-renderer', SectionRenderer);

class LazyContentLoader extends HTMLElement {
  observer = undefined;

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.dataset.observer === 'false' || document.querySelector(`.${this.dataset.identifier}`)) {
      return;
    }
    this.initializeLazyLoading();
  }

  initializeLazyLoading() {
    // Clear any existing observer
    if (this.observer) {
      this.observer.disconnect();
    }
    this.observer = new IntersectionObserver(
      (entries, observer) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        if (this.dataset.css) importCss(this.dataset.css);
        if (this.dataset.script) importScript(this.dataset.script);
        this.loadContent();
      },
      {
        rootMargin: this.dataset.rootMargin || '0px 0px 400px 0px',
      }
    );
    this.observer.observe(this);
  }

  loadContent() {
    fetch(this.dataset.url)
      .then((response) => response.text())
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const sectionElement = doc.body.firstElementChild;
        if (this.dataset.identifier) {
          this.classList.add(this.dataset.identifier);
        }
        if (this.dataset.targetSelector) {
          document.querySelector(this.dataset.targetSelector).append(sectionElement);
        } else {
          this.innerHTML = sectionElement.innerHTML;
        }

        if (!this.querySelector('slideshow-component') && this.classList.contains('complementary-products')) {
          this.remove();
        }
      })
      .catch((error) => {
        console.error('Content loading failed:', error);
        if (this.dataset.errorClass) {
          this.classList.add(this.dataset.errorClass);
        }
      });
  }
}
customElements.define('lazy-content-loader', LazyContentLoader);
