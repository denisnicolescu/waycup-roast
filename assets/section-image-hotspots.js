if (!customElements.get('image-hotspots')) {
  customElements.define(
    'image-hotspots',
    class ImageHotspots extends HTMLElement {
      connectedCallback() {
        this.triggers = this.querySelectorAll('[data-hotspot-trigger]');
        this.panels = this.querySelectorAll('[data-hotspot-panel]');

        if (!this.triggers.length || !this.panels.length) return;

        this.triggers.forEach((trigger) => {
          trigger.addEventListener('click', () => {
            this.setActiveHotspot(trigger.dataset.hotspotTrigger);
          });
        });
      }

      setActiveHotspot(index) {
        this.triggers.forEach((trigger) => {
          const isActive = trigger.dataset.hotspotTrigger === index;

          trigger.classList.toggle('is-active', isActive);
          trigger.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        });

        this.panels.forEach((panel) => {
          const isActive = panel.dataset.hotspotPanel === index;

          panel.classList.toggle('is-active', isActive);
          panel.hidden = !isActive;
        });
      }
    }
  );
}