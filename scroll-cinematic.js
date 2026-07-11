/* ============================================================
   Doce Felicidade — scroll engine
   Canvas frame-sequence scrub sections + Lenis smooth scroll
   + scroll reveals + lightbox + mobile nav
   ============================================================ */

/* ---------- Canvas frame-sequence scrub ---------- */
function initScrub(cfg) {
  const section = document.querySelector(cfg.section);
  if (!section) return null;
  const canvas = section.querySelector("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const lines = [...section.querySelectorAll(".reveal-line")];
  const bgFill = cfg.bg || "#fbf6ee";
  const images = [];
  let firstDrawn = false;
  let loaded = false;

  function preload() {
    if (loaded) return;
    loaded = true;
    for (let i = 0; i < cfg.frameCount; i++) {
      const img = new Image();
      img.src = cfg.framePath(i + 1);
      img.onload = () => { if (!firstDrawn) { firstDrawn = true; draw(0); } };
      images[i] = img;
    }
  }

  if (cfg.eager) {
    preload();
  } else {
    // frames só descarregam quando a secção se aproxima do viewport
    const lazyIO = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { preload(); lazyIO.disconnect(); }
    }, { rootMargin: "150% 0%" });
    lazyIO.observe(section);
  }

  let current = -1;

  function draw(index) {
    const img = images[index];
    if (!img || !img.complete || !img.naturalWidth) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    let dw, dh, dx, dy;
    if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
    else { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
    ctx.fillStyle = bgFill; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(current < 0 ? 0 : current);
  }

  function update() {
    // recupera de um arranque com viewport a 0 (separador em background)
    if (canvas.width === 0 && canvas.clientWidth > 0) resize();
    const rect = section.getBoundingClientRect();
    if (rect.bottom < -window.innerHeight || rect.top > window.innerHeight) return;
    const scrollable = rect.height - window.innerHeight;
    const p = Math.min(Math.max(-rect.top / scrollable, 0), 1);
    const idx = Math.min(cfg.frameCount - 1, Math.floor(p * (cfg.frameCount - 1)));
    if (idx !== current) { current = idx; draw(idx); }

    // progress fill (per section, optional)
    const fill = section.querySelector(".progress-fill");
    if (fill) fill.style.width = (p * 100).toFixed(2) + "%";

    // scrubbed overlay copy
    for (const el of lines) {
      const a = parseFloat(el.dataset.in), b = parseFloat(el.dataset.out);
      const mid = (a + b) / 2, half = (b - a) / 2;
      let o = 1 - Math.abs(p - mid) / half;
      o = Math.max(0, Math.min(1, o));
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${(1 - o) * 28}px)`;
    }

    // hero persistent copy: fade out near the end of the hero scrub
    const fadeOut = section.querySelector("[data-fadeout]");
    if (fadeOut) {
      const start = 0.72;
      let o = p < start ? 1 : 1 - (p - start) / (1 - start);
      o = Math.max(0, Math.min(1, o));
      fadeOut.style.opacity = o.toFixed(3);
      fadeOut.style.transform = `translateY(${(1 - o) * -18}px)`;
    }
  }

  window.addEventListener("resize", resize);
  resize();
  return { update, resize };
}

/* ---------- Count-up stats ---------- */
function animateCount(el) {
  const target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || "";
  const dur = 1400, t0 = performance.now();
  function step(t) {
    const k = Math.min((t - t0) / dur, 1), eased = 1 - Math.pow(1 - k, 3);
    el.textContent = (target % 1 === 0 ? Math.round(target * eased) : (target * eased).toFixed(1)) + suffix;
    if (k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- Lightbox ---------- */
function initLightbox() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  const imgEl = lb.querySelector(".lb-img");
  const capEl = lb.querySelector(".lb-cap");
  const items = [...document.querySelectorAll("[data-lightbox]")];
  let idx = 0;

  function open(i) {
    idx = (i + items.length) % items.length;
    const src = items[idx].getAttribute("data-full") || items[idx].querySelector("img").src;
    const cap = items[idx].getAttribute("data-cap") || "";
    imgEl.src = src;
    capEl.textContent = cap;
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
    if (window.__lenis) window.__lenis.stop();
  }
  function close() {
    lb.classList.remove("open");
    document.body.style.overflow = "";
    if (window.__lenis) window.__lenis.start();
  }
  items.forEach((it, i) => it.addEventListener("click", () => open(i)));
  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.querySelector(".lb-next").addEventListener("click", (e) => { e.stopPropagation(); open(idx + 1); });
  lb.querySelector(".lb-prev").addEventListener("click", (e) => { e.stopPropagation(); open(idx - 1); });
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("lb-stage")) close(); });
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") open(idx + 1);
    if (e.key === "ArrowLeft") open(idx - 1);
  });
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const scrubs = (window.SCRUB_SECTIONS || [])
    .filter(c => document.querySelector(c.section))
    .map(initScrub)
    .filter(Boolean);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: !reduce, wheelMultiplier: 1 });
  window.__lenis = lenis;
  function raf(t) { lenis.raf(t); scrubs.forEach(s => s.update()); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);

  // scroll reveals + stat counters
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      if (e.target.classList.contains("stat-num")) animateCount(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.18 });
  document.querySelectorAll(".reveal, .stat-num").forEach((el) => io.observe(el));

  // nav state on scroll + hide scroll hint
  const nav = document.querySelector(".nav");
  lenis.on("scroll", ({ scroll }) => {
    if (nav) nav.classList.toggle("nav--solid", scroll > 40);
    document.querySelectorAll(".scroll-hint").forEach(h => h.style.opacity = scroll > 60 ? "0" : "1");
  });

  // smooth anchor links via Lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      lenis.scrollTo(t, { offset: -64 });
      document.body.classList.remove("menu-open");
    });
  });

  // mobile menu toggle
  const burger = document.querySelector(".nav-burger");
  if (burger) burger.addEventListener("click", () => document.body.classList.toggle("menu-open"));

  initLightbox();

  // year
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
});
