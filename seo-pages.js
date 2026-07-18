document.addEventListener("DOMContentLoaded", () => {
  const burger = document.querySelector(".nav-burger");
  if (burger) burger.addEventListener("click", () => document.body.classList.toggle("menu-open"));
  document.querySelectorAll(".nav-links a").forEach((link) => link.addEventListener("click", () => document.body.classList.remove("menu-open")));
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;
  const image = lightbox.querySelector(".lb-img");
  const caption = lightbox.querySelector(".lb-cap");
  const items = [...document.querySelectorAll("[data-lightbox]")];
  let current = 0;
  const show = (index) => {
    current = (index + items.length) % items.length;
    const item = items[current];
    image.src = item.dataset.full || item.querySelector("img").src;
    image.alt = item.querySelector("img").alt;
    caption.textContent = `${current + 1} / ${items.length} · ${item.dataset.cap || ""}`;
    lightbox.classList.add("open");
  };
  const close = () => lightbox.classList.remove("open");
  items.forEach((item, index) => item.addEventListener("click", () => show(index)));
  lightbox.querySelector(".lb-close").addEventListener("click", close);
  lightbox.querySelector(".lb-next").addEventListener("click", () => show(current + 1));
  lightbox.querySelector(".lb-prev").addEventListener("click", () => show(current - 1));
  lightbox.addEventListener("click", (event) => { if (event.target === lightbox || event.target.classList.contains("lb-stage")) close(); });
  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("open")) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowRight") show(current + 1);
    if (event.key === "ArrowLeft") show(current - 1);
  });
});
