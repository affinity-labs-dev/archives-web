// The quiz results screen — one builder for all three tiers.
//
// The mobile app has three components here, ~200 lines each, differing only in
// colours, asset names and timings. Those all live in tiers.js, so this is one
// screen whose shape never changes.

import { escapeHtml } from '../utils.js';
import { prefersReducedMotion } from '../animations.js';
import { T, EASE, enter, createTimeline, hasGsap, STATIC_CLASS } from './timing.js';
import { TIER_SPECS, TIER_TIMING, tierFor } from './tiers.js';
import { mountRive } from './rive.js';
import * as cues from './cues.js';
import { renderScoreCard, animateScoreCard } from './score-card.js';
import { renderStars, animateStarFlight } from './effects.js';

const G = typeof window !== 'undefined' ? window.gsap : null;

const PILLS = [
  { action: 'explain', label: 'Understand your answers', icon: 'bulb' },
  { action: 'chat', label: 'Chat to learn more', icon: 'chat' },
];

const ICONS = {
  // Simple outline glyphs rather than an icon font: two shapes do not justify
  // a webfont, and the app has no icon set of its own.
  bulb: '<path d="M9 18h6m-5 3h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 4 11.5a8.4 8.4 0 0 1 8.5-8.4h.5a8.4 8.4 0 0 1 8 8.4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  chevron: '<path d="m9 18 6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
};

/**
 * Build the results screen into `slot`.
 *
 * Returns the screen handle the stage expects: the timeline (so the flow can
 * start it), pauseRives (so a crossfade can freeze it), and destroy.
 *
 * @param {Element} slot
 * @param {object} opts { correct, total, xp, onExplanations, onChat, onContinue, paused }
 */
export function buildQuizResults(slot, opts) {
  const { correct, total, xp } = opts;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const tier = tierFor(percentage);
  const spec = TIER_SPECS[tier];
  const timing = TIER_TIMING[tier];
  const data = { correct, total, percentage, xp };

  // Only offer what is actually wired up. "Understand your answers" has no
  // handler yet, and a visible button that silently does nothing is worse than
  // an absent one - it reads as broken rather than as unbuilt.
  const pills = PILLS.filter((p) =>
    p.action === 'explain' ? typeof opts.onExplanations === 'function'
    : p.action === 'chat' ? typeof opts.onChat === 'function'
    : true,
  );

  const root = document.createElement('div');
  // Without GSAP nothing animates in, and everything that enters would sit at
  // the opacity: 0 CSS gives it - including the CONTINUE button, leaving the
  // user stuck on a screen with a 0% score and no way out. The class reveals
  // the true end state instead.
  root.className = 'qres qres--' + tier + (hasGsap() ? '' : ' ' + STATIC_CLASS);
  // The screen colour behind the Rive. Also the whole visual if Rive failed
  // to load, which is why it is a tier colour and not a neutral.
  root.style.background = spec.screenBg;

  root.innerHTML = `
    <canvas class="qres__bg" aria-hidden="true"></canvas>
    <div class="qres__body">
      ${spec.mascot
        ? '<div class="qres__mascot"><canvas class="qres__mascot-canvas" aria-hidden="true"></canvas></div>'
        : '<div class="qres__mascot qres__mascot--spacer" aria-hidden="true"></div>'}
      <h1 class="qres__headline">${escapeHtml(spec.title)}</h1>
      <p class="qres__sub">${escapeHtml(spec.subtitle)}</p>
      ${renderScoreCard(spec, data)}
      ${renderStars(spec.starColor)}
      <div class="qres__pills">
        ${pills.map(
          (p) => `
          <button class="qres__pill" type="button" data-action="${p.action}">
            <svg class="qres__pill-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">${ICONS[p.icon]}</svg>
            <span class="qres__pill-label">${escapeHtml(p.label)}</span>
            <svg class="qres__pill-chevron" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">${ICONS.chevron}</svg>
          </button>`,
        ).join('')}
      </div>
      <button class="qres__cta" type="button" data-action="continue">CONTINUE</button>
    </div>`;

  slot.appendChild(root);

  const timeline = createTimeline();
  const { tl } = timeline;

  // ── Rive ────────────────────────────────────────────────────────────────
  const bg = mountRive(root.querySelector('.qres__bg'), {
    src: spec.background,
    fit: spec.backgroundFit || 'cover',
  });
  timeline.add(() => bg.destroy());

  // A contained artboard leaves flanks either side on wide windows. Where the
  // spec declares an intro backdrop, a layer behind the canvas continues the
  // scene's sky into them, fading in and out on the artwork's own schedule.
  // Without GSAP, or under reduced motion, it simply never appears and the
  // screen stays on the static screenBg - the settled frame matches that.
  if (spec.introBackdrop && tl && G && !prefersReducedMotion()) {
    const night = document.createElement('div');
    night.className = 'qres__nightfall';
    night.style.background = spec.introBackdrop.gradient;
    const canvas = root.querySelector('.qres__bg');
    canvas.parentNode.insertBefore(night, canvas);

    const nb = spec.introBackdrop;
    tl.to(night, { opacity: 1, duration: T(nb.fadeInDur), ease: 'power1.inOut' }, T(nb.fadeIn));
    tl.to(night, { opacity: 0, duration: T(nb.fadeOutDur), ease: 'power1.inOut' }, T(nb.fadeOut));
  }

  let mascot = null;
  if (spec.mascot) {
    mascot = mountRive(root.querySelector('.qres__mascot-canvas'), {
      src: spec.mascot,
      fit: 'contain',
    });
    timeline.add(() => mascot.destroy());
  }

  // ── Audio ───────────────────────────────────────────────────────────────
  if (tl && G) {
    tl.call(() => cues.play(spec.introCue, { volume: 0.7 }), null, T(timing.intro));
    // Only the intro under reduced motion: every position collapses to zero,
    // so scheduling both would fire them over each other at t=0.
    if (!prefersReducedMotion()) {
      tl.call(() => cues.play(spec.countUpCue, { volume: 0.7 }), null, T(timing.countUp));
    }
  } else {
    cues.play(spec.introCue, { volume: 0.7 });
  }

  // ── Mascot landing ──────────────────────────────────────────────────────
  // The low tier rises from below; the medium tier drops in oversized from
  // above over five seconds. The high tier has no mascot - its background
  // Rive is Ibu, full screen - but the spacer keeps the card in the same
  // place so the three screens do not jump relative to each other.
  const mascotEl = root.querySelector('.qres__mascot');
  if (G && tl && timing.mascot && spec.mascot) {
    const m = timing.mascot;
    const from = { y: m.yFrom, opacity: 1 };
    // Only the medium tier scales; the low tier just rises into place.
    if (m.scaleFrom) from.scale = m.scaleFrom;
    tl.fromTo(
      mascotEl,
      from,
      { y: 0, scale: 1, duration: T(m.dur), ease: EASE.mascotLand },
      T(m.delay),
    );
  }

  // ── Text and controls ───────────────────────────────────────────────────
  if (tl) {
    enter(tl, root.querySelector('.qres__headline'), 'riseSoft', timing.head);
    enter(tl, root.querySelector('.qres__sub'), 'riseSubtle', timing.sub);
    const pillEls = root.querySelectorAll('.qres__pill');
    if (pillEls[0]) enter(tl, pillEls[0], 'riseListItem', timing.pill1);
    if (pillEls[1]) enter(tl, pillEls[1], 'riseListItem', timing.pill2);
    enter(tl, root.querySelector('.qres__cta'), 'riseCta', timing.cta);
  }

  animateScoreCard(tl, root, spec, timing, data);
  animateStarFlight(tl, root, timing, percentage);

  // ── Interaction ─────────────────────────────────────────────────────────
  const onClick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'explain' && opts.onExplanations) opts.onExplanations();
    else if (action === 'chat' && opts.onChat) opts.onChat();
    else if (action === 'continue' && opts.onContinue) opts.onContinue();
  };
  root.addEventListener('click', onClick);
  timeline.add(() => root.removeEventListener('click', onClick));

  return {
    el: root,
    // The stage paints this behind and around the screen, so no app
    // chrome shows through beside a phone column or under short content.
    backdrop: spec.screenBg,
    tier,
    timeline,
    pauseRives() {
      bg.pause();
      if (mascot) mascot.pause();
    },
    resumeRives() {
      bg.play();
      if (mascot) mascot.play();
    },
    destroy() {
      timeline.destroy();
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
}
