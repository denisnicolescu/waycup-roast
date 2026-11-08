document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector("header");
  const section = document.querySelector("main > section:first-of-type");

  if (!header || !section) return;

  const observer = new IntersectionObserver(
    ([entry]) =>
      header.classList.toggle(
        "transparent-section",
        entry.boundingClientRect.bottom <= header.offsetHeight
      ),
    {
      rootMargin: `-${header.offsetHeight}px 0px 0px 0px`
    }
  );
  observer.observe(section);
});
