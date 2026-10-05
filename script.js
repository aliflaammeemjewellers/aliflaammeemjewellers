(() => {
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const map = (v, inA, inB, outA, outB) => {
    const t = (v - inA) / (inB - inA);
    return lerp(outA, outB, clamp(t, 0, 1));
  };

  const heroJewel = document.getElementById("heroJewel");
  const heroLight = document.getElementById("heroLight");
  const heroCopy = document.getElementById("heroCopy");
  const rotateJewel = document.getElementById("rotateJewel");
  const pieces = [...document.querySelectorAll("[data-piece]")];
  const focusJewel = document.getElementById("focusJewel");
  const focusCopy = document.getElementById("focusCopy");
  const craftFrame = document.getElementById("craftFrame");
  const craftImg = craftFrame?.querySelector("img");
  const craftCopy = document.getElementById("craftCopy");
  const ctaInner = document.getElementById("ctaInner");
  const sweeps = [...document.querySelectorAll(".gold-sweep")];
  const glow = document.querySelector(".glow");
  const isMobile = matchMedia("(max-width: 900px)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let ticking = false;

  function progressIn(el) {
    const r = el.getBoundingClientRect();
    const vh = innerHeight;
    const start = vh * 0.95;
    const end = -r.height * 0.15;
    return clamp((start - r.top) / (start - end), 0, 1);
  }

  function update() {
    ticking = false;
    if (reduce) return;

    const pHero = progressIn(heroJewel.parentElement);
    const light = map(pHero, 0.05, 0.55, 0, 1);
    heroJewel.style.opacity = String(map(pHero, 0.02, 0.4, 0, 1));
    heroJewel.style.filter = `brightness(${map(pHero, 0.05, 0.7, 0.12, 1.08)})`;
    heroJewel.style.transform = `translate3d(0, ${map(pHero, 0, 1, 48, -10)}px, 0) scale(${map(pHero, 0, 1, 0.9, 1.05)})`;
    heroLight.style.opacity = String(light);
    heroLight.style.transform = `scale(${map(pHero, 0, 1, 0.72, 1.12)})`;
    heroCopy.style.opacity = String(map(pHero, 0.35, 0.75, 0, 1));
    heroCopy.style.transform = `translateY(${map(pHero, 0.35, 0.75, 28, 0)}px)`;

    const pRot = progressIn(rotateJewel.parentElement);
    const rot = isMobile ? map(pRot, 0, 1, -6, 10) : map(pRot, 0, 1, -18, 22);
    rotateJewel.style.transform = `perspective(900px) rotateY(${rot}deg) scale(${map(pRot, 0, 1, 0.94, 1.06)})`;
    rotateJewel.querySelector(".gold-sweep").style.transform = `translateX(${map(pRot, 0.1, 0.9, -120, 120)}%)`;

    pieces.forEach((el, i) => {
      const p = progressIn(el);
      const delay = i * 0.08;
      const t = clamp((p - delay) / 0.55, 0, 1);
      el.style.opacity = String(t);
      el.style.transform = `translate3d(0, ${lerp(56, 0, t)}px, 0) translateY(${(1 - p) * (8 + i * 4)}px)`;
    });

    const pFocus = progressIn(focusJewel.parentElement);
    focusJewel.style.transform = `perspective(1000px) rotateY(${map(pFocus, 0, 1, -8, 12)}deg) scale(${map(pFocus, 0.1, 0.9, 0.92, 1.08)})`;
    if (glow) glow.style.opacity = String(map(pFocus, 0.2, 0.7, 0, 0.9));
    focusCopy.style.opacity = String(map(pFocus, 0.25, 0.7, 0, 1));
    focusCopy.style.transform = `translateX(${map(pFocus, 0.25, 0.7, 32, 0)}px)`;
    const sweepF = focusJewel.querySelector(".gold-sweep");
    if (sweepF) sweepF.style.transform = `translateX(${map(pFocus, 0.15, 0.85, -110, 110)}%)`;

    const pCraft = progressIn(craftFrame.parentElement);
    if (craftImg) {
      craftImg.style.transform = `scale(${map(pCraft, 0, 1, 1.12, 1.02)}) translate3d(${map(pCraft, 0, 1, -2, 1)}%, ${map(pCraft, 0, 1, 2, -1)}%, 0)`;
      craftImg.style.filter = `brightness(${map(pCraft, 0, 1, 0.4, 0.72)}) saturate(1.08)`;
    }
    craftCopy.style.opacity = String(map(pCraft, 0.25, 0.65, 0, 1));

    const pCta = progressIn(ctaInner.parentElement);
    ctaInner.style.opacity = String(map(pCta, 0.2, 0.7, 0, 1));
    ctaInner.style.transform = `scale(${map(pCta, 0.2, 0.8, 0.94, 1)})`;

    sweeps[0] && (heroJewel.querySelector(".gold-sweep").style.transform =
      `translateX(${map(pHero, 0.2, 0.85, -130, 80)}%)`);
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  update();

  document.querySelector(".cta-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelector(".scene-collection")?.scrollIntoView({ behavior: "smooth" });
  });
})();
