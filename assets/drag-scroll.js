function initializeSlider(slider) {
  if (slider.dataset.dragInitialized) return;
  slider.dataset.dragInitialized = "true";

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let isDragging = false;

  slider.addEventListener("mousedown", (e) => {
    isDown = true;
    isDragging = false;
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
    e.preventDefault();
  });

  slider.addEventListener("mouseleave", () => {
    if (isDown) {
      isDown = false;
      isDragging = true;
    }
  });

  slider.addEventListener("mouseup", () => {
    isDown = false;
    setTimeout(() => (isDragging = false), 50);
  });

  slider.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    isDragging = true;
    const walk = (e.pageX - slider.offsetLeft - startX) * 1.5;
    slider.scrollLeft = scrollLeft - walk;
  });

  slider.addEventListener("click", (e) => {
    if (isDragging && e.target.closest("a")) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
}

document.addEventListener("mouseenter", (e) => {
  const target = e.target;
  if (target instanceof Element && target.matches(".grab-enabled .grid")) {
    initializeSlider(target);
  }
}, true);