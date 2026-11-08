window.attachPhotoSwipeListeners = function () {
  document.querySelectorAll('.photoswipe-prevent-default').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!document.querySelector(`script[src="${window.dynamicImport.photoswipeLightbox}"]`)) {
        event.preventDefault();
      }
    });
  });
};

window.attachPhotoSwipeListeners();
