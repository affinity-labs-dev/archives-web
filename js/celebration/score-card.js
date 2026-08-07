// The score card: percentage, XP, correct count, and the progress bar.
//
// Everything here goes ON the passed-in timeline rather than starting its own
// tween. That is what lets a test build the screen paused, seek to 8.6s and
// assert what is on screen, with no waiting and no flake. It is also why
// animations.js's animateCounter() is not reused - it fires a detached tween,
// which cannot be seeked and hardcodes power2.out where the 3/3 tier needs
// linear.

import { T, EASE } from './timing.js';
import { SPARKLES, SPARKLE_PATH } from './tiers.js';

const G = typeof window !== 'undefined' ? window.gsap : null;

/**
 * The six-segment wobble the card enters with.
 *
 * Ported from ScoreCardPopIn.tsx. It starts at 10x scale - the card fills the
 * screen and slams down into place - and settles through a decaying rotation.
 * The segment durations sum to 1000ms.
 */
const POP_SEGMENTS = [
  { dur: 200, scale: 6.1, rot: -1.5 },
  { dur: 200, scale: 2.2, rot: -3 },
  { dur: 220, scale: 0.88, rot: 2.2 },
  { dur: 160, scale: 1.08, rot: -1 },
  { dur: 120, scale: 0.97, rot: 0.4 },
  { dur: 100, scale: 1, rot: 0 },
];

/** Markup for the card. Values start at zero; the timeline fills them in. */
export function renderScoreCard(spec, data) {
  const sparkles = SPARKLES.map(
    (s) => `
      <svg class="qres__sparkle" width="${s.size}" height="${s.size}"
           viewBox="0 0 24 24" style="${s.style}" aria-hidden="true">
        <path d="${SPARKLE_PATH}" fill="#FFDD63"/>
      </svg>`,
  ).join('');

  return `
    <div class="qres__card-wrap">
      <div class="qres__sparkles" aria-hidden="true">${sparkles}</div>
      <div class="qres__card" style="background:${spec.cardBg}; color:${spec.cardText}">
        <div class="qres__card-grid">
          <div class="qres__card-col">
            <div class="qres__pct-row">
              <span class="qres__pct">0</span><span class="qres__pct-sign">%</span>
            </div>
            <div class="qres__card-label" style="color:${spec.cardSubText}">Final Score</div>
          </div>
          <div class="qres__card-col qres__card-col--right">
            <div class="qres__xp-row">
              <svg class="qres__xp-star" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="${SPARKLE_PATH}" fill="${spec.cardText}"/>
              </svg>
              <span class="qres__xp">${data.xp} XP</span>
            </div>
            <div class="qres__card-label" style="color:${spec.cardSubText}">Correct: ${data.correct}/${data.total}</div>
          </div>
        </div>
        <div class="qres__track" style="background:${spec.progressTrack}">
          <div class="qres__fill" style="background:${spec.progressFill}"></div>
        </div>
      </div>
    </div>`;
}

/**
 * Put the card's animation on the timeline.
 *
 * @param {object} tl      the GSAP timeline
 * @param {Element} root   the screen root
 * @param {object} spec    TIER_SPECS entry
 * @param {object} timing  TIER_TIMING entry
 * @param {object} data    { correct, total, percentage, xp }
 */
export function animateScoreCard(tl, root, spec, timing, data) {
  if (!G || !tl) return;

  const wrap = root.querySelector('.qres__card-wrap');
  const pct = root.querySelector('.qres__pct');
  const fill = root.querySelector('.qres__fill');
  const sparkleEls = root.querySelectorAll('.qres__sparkle');

  // ── Pop-in ──────────────────────────────────────────────────────────────
  tl.set(wrap, { scale: 10, rotation: 0, opacity: 0 }, T(timing.card));
  tl.to(wrap, { opacity: 1, duration: T(200), ease: 'none' }, T(timing.card));

  let at = timing.card;
  POP_SEGMENTS.forEach((seg) => {
    tl.to(
      wrap,
      {
        scale: seg.scale,
        rotation: seg.rot,
        duration: T(seg.dur),
        ease: EASE.popSegment,
      },
      T(at),
    );
    at += seg.dur;
  });

  // ── Bar fill and count-up, from ONE tweened value ───────────────────────
  // Two tweens would be two clocks: with different eases, or just floating
  // point, the bar can reach 100% while the digits still read 97. Driving
  // both from a single object makes that impossible by construction.
  const counter = { v: 0 };
  tl.to(
    counter,
    {
      v: data.percentage,
      duration: T(timing.barDur),
      ease: timing.barEase,
      onUpdate() {
        const n = Math.round(counter.v);
        pct.textContent = String(n);
        fill.style.width = counter.v + '%';
      },
    },
    T(timing.bar),
  );

  // Under reduced motion every duration is 0, and a zero-length tween may not
  // fire onUpdate at all - so state the end value outright.
  tl.set(pct, { textContent: String(data.percentage) }, T(timing.bar + timing.barDur));
  tl.set(fill, { width: data.percentage + '%' }, T(timing.bar + timing.barDur));

  // ── Sparkles ────────────────────────────────────────────────────────────
  // Each is its own three-stage pop, staggered by the delays in the table.
  sparkleEls.forEach((el, i) => {
    const s = SPARKLES[i];
    if (!s) return;
    tl.set(el, { scale: 0, rotation: 0, opacity: 0 }, T(s.delay));
    tl.to(
      el,
      { scale: 1.4, opacity: 1, duration: T(420), ease: EASE.riseSoft },
      T(s.delay),
    );
    tl.to(el, { scale: 1, duration: T(350), ease: 'power2.out' }, T(s.delay + 420));
    tl.to(
      el,
      { scale: 0.4, opacity: 0, duration: T(630), ease: 'power2.in' },
      T(s.delay + 770),
    );
    tl.to(
      el,
      { rotation: 180, duration: T(1400), ease: 'none' },
      T(s.delay),
    );
  });

  // ── The perfect-score pop ───────────────────────────────────────────────
  // Only at 100%, and only on the 3/3 tier, which is the only one that can
  // reach it. Fires after the bar completes, as a small extra beat.
  if (timing.pop && data.percentage === 100) {
    const row = root.querySelector('.qres__pct-row');
    tl.to(row, { scale: 1.32, duration: T(200), ease: EASE.riseCta }, T(timing.pop));
    tl.to(row, { scale: 1, duration: T(260), ease: 'power2.inOut' }, T(timing.pop + 200));
  }
}
