class BackToTop extends HTMLElement {
  constructor() {
    super();
    this.btn = this;

    window.addEventListener("scroll", () => {

      if (window.scrollY > 400) {
        this.btn.style.display = "flex";
        this.btn.style.opacity = "1";
      } else {
        this.btn.style.opacity = "0";
        setTimeout(() => {
          if (window.scrollY <= 400) {
            this.btn.style.display = "none";
          }
        }, 300);
      }
    });

    this.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

customElements.define("back-to-top", BackToTop);