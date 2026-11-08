subscribe(PUB_SUB_EVENTS.cartUpdate, () => {
  fetch(window.location.pathname + '?section_id=cart-progress-bar')
    .then((response) => response.text())
    .then((html) => {
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(html, 'text/html');
      const newSection = newDoc.querySelector('.cart-progress--section');

      if (newSection) {
        const existingSection = document.querySelector('.cart-progress--section');
        existingSection.replaceWith(newSection);
      }
    })
    .catch((err) => console.error('Error updating cart progress bar:', err));
});
