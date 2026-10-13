/* GENVI — motion & interactions (vanilla, sans dépendance) */
(function () {
  'use strict';
  const html = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) html.classList.add('reduced');

  /* ---------- Intro loader ---------- */
  const loader = document.getElementById('loader');
  const heroArt = document.getElementById('heroArt');
  const seen = (() => { try { return sessionStorage.getItem('genvi_intro') === '1'; } catch (e) { return false; } })();

  function startHero() {
    html.classList.add('is-ready');
    // après l'entrée des bols, on passe au flottement continu
    const delay = reduced ? 0 : 2000;
    setTimeout(() => { if (heroArt) heroArt.classList.add('is-live'); }, delay);
  }

  let introDone = false;
  function runIntro() {
    if (introDone) return;
    introDone = true;
    if (!loader) { startHero(); return; }
    if (reduced || seen) {
      loader.remove();
      startHero();
      return;
    }
    body.classList.add('is-locked');
    loader.classList.add('is-on');
    setTimeout(() => {
      loader.classList.add('is-off');
      body.classList.remove('is-locked');
      startHero();
      try { sessionStorage.setItem('genvi_intro', '1'); } catch (e) { /* ignore */ }
      setTimeout(() => loader.remove(), 900);
    }, 1150);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(runIntro);
    setTimeout(runIntro, 1800); // garde-fou si les polices tardent
  } else {
    runIntro();
  }

  /* ---------- Nav ---------- */
  const nav = document.getElementById('nav');
  function onNav() { if (nav) nav.classList.toggle('is-solid', window.scrollY > 40); }
  onNav();

  /* ---------- Reveal au scroll ---------- */
  const rv = document.querySelectorAll('.rv, .chips, .crousty__art, .promo__big, .infos__photo');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    rv.forEach((el) => io.observe(el));
  } else {
    rv.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Compose : scrub au scroll ---------- */
  const build = document.getElementById('carte');
  const ring = document.getElementById('buildRing');
  const layers = build ? build.querySelectorAll('.build__layer') : [];
  const steps = build ? build.querySelectorAll('.build__step') : [];
  const nums = build ? build.querySelectorAll('.build__num span') : [];
  const dots = build ? build.querySelectorAll('.build__dots i') : [];
  const STEPS = 5;
  const RING = 295.3;
  let current = 1;
  let ticking = false;

  function setStep(n) {
    if (n === current) return;
    current = n;
    layers.forEach((el) => el.classList.toggle('is-active', +el.dataset.step === n));
    steps.forEach((el) => el.classList.toggle('is-active', +el.dataset.step === n));
    nums.forEach((el) => {
      const s = +el.dataset.step;
      el.classList.toggle('is-active', s === n);
      el.classList.toggle('is-past', s < n);
    });
    dots.forEach((el, i) => el.classList.toggle('is-active', i + 1 === n));
  }

  function onBuild() {
    if (!build || reduced) return;
    const rect = build.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = build.offsetHeight - vh;
    if (total <= 0) return;
    const raw = (-rect.top) / total;
    const p = Math.min(1, Math.max(0, raw));
    // 5 paliers, avec une petite zone morte au début pour laisser lire l'étape 1
    const idx = Math.min(STEPS, Math.max(1, Math.floor(p * STEPS + 0.0001) + 1));
    setStep(idx);
    if (ring) ring.style.strokeDashoffset = String(RING * (1 - p));
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onNav(); onBuild(); ticking = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onBuild();

  /* ---------- Parallaxe souris (desktop) ---------- */
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (heroArt && fine && !reduced) {
    const bowls = heroArt.querySelectorAll('.hero__bowl');
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    function tick() {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      bowls.forEach((b) => {
        const d = parseFloat(b.dataset.depth || '0.5');
        b.style.setProperty('--px', (cx * 28 * d).toFixed(1) + 'px');
        b.style.setProperty('--py', (cy * 22 * d).toFixed(1) + 'px');
      });
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf = requestAnimationFrame(tick); else raf = null;
    }
    const hero = heroArt.closest('.hero');
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
  }

  /* ---------- Tilt des cartes (desktop) ---------- */
  if (fine && !reduced) {
    document.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateY(-6px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- Ancres : compenser la nav fixe ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - (id === 'carte' ? 0 : 56);
      window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    });
  });
})();
