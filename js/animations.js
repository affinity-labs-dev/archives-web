// animations.js — Central animation utilities powered by GSAP
// All animation logic lives here to keep view files clean.

const G = window.gsap;
const ST = window.ScrollTrigger;
if (G && ST) G.registerPlugin(ST);

// ── Accessibility ──────────────────────────────────────────────
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export function prefersReducedMotion() {
  return motionQuery.matches;
}

// ── Context management (auto-cleanup per view) ─────────────────
export function createContext(container) {
  if (!G) return { add() {}, revert() {} };
  return G.context(() => {}, container);
}

// ── View transitions ───────────────────────────────────────────
let previousDepth = 0;

function hashDepth(hash) {
  return (hash || '/').split('/').filter(Boolean).length;
}

export function getDirection(newHash) {
  const newDepth = hashDepth(newHash);
  const dir = newDepth > previousDepth ? 'forward' : 'back';
  previousDepth = newDepth;
  return dir;
}

export function transitionOut(container) {
  if (!G) return Promise.resolve();
  const dir = container._transDir || 'forward';
  const x = dir === 'forward' ? -30 : 30;

  if (prefersReducedMotion()) {
    return new Promise(resolve => {
      G.to(container, { opacity: 0, duration: 0.15, ease: 'power2.out', onComplete: resolve });
    });
  }

  return new Promise(resolve => {
    G.to(container, {
      opacity: 0,
      x: x,
      duration: 0.25,
      ease: 'power2.out',
      onComplete: resolve
    });
  });
}

export function transitionIn(container, direction) {
  if (!G) return;
  const x = direction === 'forward' ? 30 : -30;

  if (prefersReducedMotion()) {
    G.fromTo(container, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: 'power2.out' });
    return;
  }

  G.fromTo(container,
    { opacity: 0, x: x },
    { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
  );
}

// ── Hero entrance sequences ────────────────────────────────────
export function heroEntrance(selectors, ctx) {
  if (!G || prefersReducedMotion()) return;

  const tl = G.timeline({ defaults: { ease: 'power2.out' } });

  if (selectors.bg) {
    const bgEl = typeof selectors.bg === 'string' ? document.querySelector(selectors.bg) : selectors.bg;
    if (bgEl) {
      tl.fromTo(bgEl, { scale: 1.08 }, { scale: 1, duration: 1.2, onComplete: () => {
        // Clear inline transform so CSS :hover effects work
        bgEl.style.transform = '';
      }}, 0);
    }
  }
  if (selectors.elements) {
    selectors.elements.forEach((sel, i) => {
      const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!el) return;
      tl.fromTo(el,
        { y: 15 + (i === 1 ? 5 : 0), opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, onComplete: () => { G.set(el, { clearProps: 'all' }); } },
        0.2 + i * 0.12
      );
    });
  }

  if (ctx) ctx.add(() => tl);
  return tl;
}

// ── Stagger entrance ───────────────────────────────────────────
export function staggerEntrance(elements, opts = {}) {
  if (!G || prefersReducedMotion() || !elements || elements.length === 0) return;

  const { delay = 0, stagger = 0.08, y = 25, duration = 0.5 } = opts;

  G.fromTo(elements,
    { y, opacity: 0 },
    { y: 0, opacity: 1, duration, stagger, delay, ease: 'power2.out' }
  );
}

// ── Scroll-triggered reveals ───────────────────────────────────
export function revealOnScroll(selector, opts = {}) {
  if (!G || !ST || prefersReducedMotion()) return;

  const { stagger = 0.08, y = 40, duration = 0.5, start = 'top 85%' } = opts;
  const elements = typeof selector === 'string' ? document.querySelectorAll(selector) : selector;
  if (!elements || elements.length === 0) return;

  G.fromTo(elements,
    { y, opacity: 0 },
    {
      y: 0, opacity: 1, duration, stagger,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: elements[0].parentElement || elements[0],
        start,
        once: true
      }
    }
  );
}

// ── Tactile button press (squash & stretch) ────────────────────
const PRESS_SELECTORS = [
  '.era-card', '.adventure-card', '.mtile', '.home__daily', '.home__hero-cta',
  '.dh__start-btn', '.ds__next-btn', '.ds__finish-btn', '.quiz__next',
  '.quiz-score__retry', '.quiz-score__back', '.quiz__answer', '.cta-btn',
  '.header__back'
].join(',');

let pressListenersAttached = false;

export function initButtonPress() {
  if (!G || prefersReducedMotion() || pressListenersAttached) return;
  pressListenersAttached = true;

  const app = document.getElementById('app');
  if (!app) return;

  document.addEventListener('pointerdown', function(e) {
    const target = e.target.closest(PRESS_SELECTORS);
    if (!target) return;
    G.to(target, { scale: 0.96, duration: 0.1, ease: 'power2.out', overwrite: true });
  });

  document.addEventListener('pointerup', onRelease);
  document.addEventListener('pointercancel', onRelease);

  function onRelease(e) {
    if (!e.target || !e.target.closest) return;
    const target = e.target.closest(PRESS_SELECTORS);
    if (!target) return;
    G.to(target, { scale: 1, duration: 0.35, ease: 'elastic.out(1, 0.4)', overwrite: true });
  }
}

// ── Quiz answer feedback ───────────────────────────────────────
export function shakeWrong(el) {
  if (!G || prefersReducedMotion()) return;
  G.fromTo(el,
    { x: 0 },
    { x: -6, duration: 0.08, ease: 'power2.inOut',
      repeat: 5, yoyo: true, onComplete: () => G.set(el, { x: 0 }) }
  );
}

export function bounceCorrect(el) {
  if (!G || prefersReducedMotion()) return;
  G.fromTo(el,
    { scale: 1 },
    { scale: 1.03, duration: 0.15, ease: 'power2.out', yoyo: true, repeat: 1 }
  );
}

// ── Text reveal (word by word) ─────────────────────────────────
export function textReveal(el) {
  if (!G || prefersReducedMotion() || !el) return;

  const text = el.textContent;
  const words = text.split(/\s+/);
  el.innerHTML = words.map(w =>
    '<span style="display:inline-block;overflow:hidden;vertical-align:top">' +
    '<span class="tr-word" style="display:inline-block;transform:translateY(100%);opacity:0">' +
    w + '</span></span>'
  ).join(' ');

  G.to(el.querySelectorAll('.tr-word'), {
    y: 0, opacity: 1, duration: 0.5,
    stagger: 0.04, ease: 'power2.out'
  });
}

// ── Counter animation ──────────────────────────────────────────
export function animateCounter(el, from, to, opts = {}) {
  if (!G || prefersReducedMotion() || !el) {
    if (el) el.textContent = to;
    return;
  }

  const { duration = 1, suffix = '', prefix = '' } = opts;
  const obj = { val: from };

  G.to(obj, {
    val: to,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      el.textContent = prefix + Math.round(obj.val) + suffix;
    }
  });
}

// ── Celebration burst ──────────────────────────────────────────
export function celebrationBurst(container, opts = {}) {
  if (!G || prefersReducedMotion() || !container) return;

  const { count = 25, color = '#D4A04A', spread = 120 } = opts;
  const rect = container.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = 'position:fixed;width:6px;height:6px;border-radius:50%;pointer-events:none;z-index:9999;background:' + color;
    dot.style.left = cx + 'px';
    dot.style.top = cy + 'px';
    document.body.appendChild(dot);

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = spread * (0.5 + Math.random() * 0.5);

    G.to(dot, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 30,
      opacity: 0,
      scale: 0,
      duration: 1 + Math.random() * 0.5,
      ease: 'power2.out',
      delay: Math.random() * 0.15,
      onComplete: () => dot.remove()
    });
  }
}

// ── Star pop-in ────────────────────────────────────────────────
export function starPopIn(stars) {
  if (!G || prefersReducedMotion() || !stars || stars.length === 0) {
    // Fallback: just make them visible
    if (stars) stars.forEach(function(s) { s.style.opacity = '1'; s.style.transform = 'scale(1)'; });
    return;
  }

  G.fromTo(stars,
    { scale: 0, rotation: -45, opacity: 0 },
    { scale: 1, rotation: 0, opacity: 1, duration: 0.5, stagger: 0.15, ease: 'back.out(2)' }
  );
}

// ── Card hover parallax (desktop only) ─────────────────────────
export function initCardParallax() {
  if (!G || prefersReducedMotion()) return;
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip touch devices

  document.addEventListener('mousemove', function(e) {
    if (!e.target || !e.target.closest) return;
    const card = e.target.closest('.era-card, .adventure-card');
    if (!card) return;

    const bg = card.querySelector('.era-card__bg, .adventure-card__bg');
    if (!bg) return;

    const rect = card.getBoundingClientRect();
    const dx = ((e.clientX - rect.left) / rect.width - 0.5) * -8;
    const dy = ((e.clientY - rect.top) / rect.height - 0.5) * -8;

    G.to(bg, { x: dx, y: dy, duration: 0.4, ease: 'power2.out', overwrite: true });
  });

  document.addEventListener('mouseleave', function(e) {
    if (!e.target || !e.target.closest) return;
    const card = e.target.closest('.era-card, .adventure-card');
    if (!card) return;
    const bg = card.querySelector('.era-card__bg, .adventure-card__bg');
    if (bg) G.to(bg, { x: 0, y: 0, duration: 0.4, ease: 'power2.out' });
  }, true);
}

// ── Header entrance ────────────────────────────────────────────
export function headerEntrance() {
  if (!G || prefersReducedMotion()) return;

  const back = document.querySelector('.header__back');
  const title = document.querySelector('.header__title');

  if (back) {
    G.fromTo(back, { x: -10, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
  }
  if (title) {
    G.fromTo(title, { opacity: 0 }, { opacity: 1, duration: 0.25, delay: 0.1, ease: 'power2.out' });
  }
}

// ── Skeleton utilities ─────────────────────────────────────────
export function skeletonToContent(skeletonEl, contentEl) {
  if (!G || !skeletonEl || !contentEl) {
    if (skeletonEl) skeletonEl.style.display = 'none';
    if (contentEl) contentEl.style.opacity = '1';
    return;
  }

  if (prefersReducedMotion()) {
    skeletonEl.style.display = 'none';
    contentEl.style.opacity = '1';
    return;
  }

  G.to(skeletonEl, {
    opacity: 0,
    duration: 0.3,
    ease: 'power2.out',
    onComplete: () => { skeletonEl.style.display = 'none'; }
  });

  G.fromTo(contentEl,
    { opacity: 0 },
    { opacity: 1, duration: 0.4, delay: 0.15, ease: 'power2.out' }
  );
}

// ── Scroll hint for carousels ──────────────────────────────────
export function initScrollHint(gridEl) {
  if (!gridEl || prefersReducedMotion()) return;

  // Check if content overflows
  if (gridEl.scrollWidth <= gridEl.clientWidth) return;

  const wrapper = gridEl.parentElement;
  if (!wrapper) return;
  wrapper.classList.add('mtile-grid-wrap--has-overflow');

  // Update gradient visibility on scroll
  function updateGradients() {
    const atStart = gridEl.scrollLeft < 10;
    const atEnd = gridEl.scrollLeft + gridEl.clientWidth >= gridEl.scrollWidth - 10;
    wrapper.classList.toggle('mtile-grid-wrap--at-start', atStart);
    wrapper.classList.toggle('mtile-grid-wrap--at-end', atEnd);
  }

  updateGradients();
  gridEl.addEventListener('scroll', updateGradients, { passive: true });

  // Pulse hint arrow on right side (first time only)
  const hinted = sessionStorage.getItem('carousel_hinted');
  if (!hinted && G) {
    const arrow = document.createElement('div');
    arrow.className = 'mtile-grid-hint';
    arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="9 6 15 12 9 18"/></svg>';
    wrapper.appendChild(arrow);

    G.fromTo(arrow,
      { x: 0, opacity: 0.8 },
      { x: 6, opacity: 0.4, duration: 0.8, ease: 'power2.inOut', repeat: 3, yoyo: true,
        onComplete: () => {
          G.to(arrow, { opacity: 0, duration: 0.3, onComplete: () => arrow.remove() });
        }
      }
    );

    gridEl.addEventListener('scroll', function once() {
      sessionStorage.setItem('carousel_hinted', '1');
      G.to(arrow, { opacity: 0, duration: 0.2, onComplete: () => arrow.remove() });
      gridEl.removeEventListener('scroll', once);
    }, { once: true });
  }
}

// ── Init global listeners (call once) ──────────────────────────
let globalInited = false;
export function initGlobalAnimations() {
  if (globalInited) return;
  globalInited = true;
  initButtonPress();
  initCardParallax();
}
