// Timing primitives for the celebration screens.
//
// The choreography being ported is long and precise - the 3/3 screen holds
// 6.5s of animation before any text appears, and thirty-odd cues land on
// specific milliseconds. Three ways to express that were considered:
//
//   CSS animation-delay - cannot be cancelled (the router can tear the screen
//     down mid-timeline), needs ~20 hand-written @keyframes blocks in a file
//     already past 4000 lines, and cannot drive the count-up.
//   setTimeout chains   - drift, and background tabs clamp them to >=1000ms,
//     silently stretching a 6500ms gate into something else entirely.
//   GSAP timelines      - already on the CDN, already this app's animation
//     vocabulary, one .kill() cancels everything downstream, and
//     `tl.to(el, {...}, 8.15)` reads exactly like the spec it came from.
//
// GSAP won. Everything here exists to make GSAP express the mobile spec.

import { prefersReducedMotion } from '../animations.js';

const G = typeof window !== 'undefined' ? window.gsap : null;

/**
 * Milliseconds to GSAP seconds, collapsing to 0 under reduced motion.
 *
 * The web twin of the mobile app's `safeDuration()`. Apply it to timeline
 * POSITIONS as well as durations - that is what makes the whole choreography
 * collapse to its final frame rather than merely playing fast. Someone who has
 * asked their OS for less motion should get the score, not a shorter show.
 */
export function T(ms) {
  return prefersReducedMotion() ? 0 : ms / 1000;
}

/**
 * A cubic-bezier easing function, as GSAP's `ease` accepts.
 *
 * GSAP's own CustomEase is a paid Club plugin and is not on the CDN, and the
 * spec uses curves with no GSAP equivalent - cubic-bezier(.65,0,.35,1) for the
 * mascot landing, (.4,0,.2,1) for all six pop-in segments, (.1,0,.9,1) for the
 * XP star flight. So: solve x(t) = the given curve for t by Newton-Raphson,
 * then return y(t). Same maths the browser runs for a CSS cubic-bezier.
 *
 * P0 is (0,0) and P3 is (1,1); only the two control points are parameters,
 * exactly as in CSS.
 */
export function bezier(x1, y1, x2, y2) {
  // Polynomial coefficients for the cubic with P0=(0,0), P3=(1,1).
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t) => (3 * ax * t + 2 * bx) * t + cx;

  return function ease(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Newton-Raphson. Converges in 4 iterations for every curve used here;
    // 8 is cheap insurance against a pathological control point.
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return sampleY(t);
      const d = slopeX(t);
      // A flat slope means Newton would divide by ~0 and shoot off; fall
      // through to bisection rather than returning a wrong answer confidently.
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }

    // Bisection fallback - slower, but cannot diverge.
    let lo = 0;
    let hi = 1;
    t = x;
    while (lo < hi) {
      const err = sampleX(t);
      if (Math.abs(err - x) < 1e-6) return sampleY(t);
      if (x > err) lo = t;
      else hi = t;
      const next = (lo + hi) / 2;
      if (Math.abs(next - t) < 1e-9) break;
      t = next;
    }
    return sampleY(t);
  };
}

// The four curves the spec names that GSAP has no equivalent for.
export const EASE = {
  // Mascot landing.
  mascotLand: bezier(0.65, 0, 0.35, 1),
  // Every one of the six ScoreCardPopIn segments.
  popSegment: bezier(0.4, 0, 0.2, 1),
  // The XP stars' flight along their arc.
  starFlight: bezier(0.1, 0, 0.9, 1),
  // Reanimated's backOut(1.1) / backOut(1.22) / backOut(1.275) as literal
  // beziers. GSAP's back.out(n) is a DIFFERENT parametrisation of "overshoot"
  // and does not match Reanimated's for the same n, so the two moments where
  // the overshoot is the point - the streak check-marks and the perfect-score
  // pop - use these rather than back.out().
  riseSoft: bezier(0.175, 0.885, 0.32, 1.1),
  streakCheck: bezier(0.175, 0.885, 0.32, 1.22),
  riseCta: bezier(0.175, 0.885, 0.32, 1.275),
};

/**
 * The mobile app's entrance presets, as data.
 *
 * Ported from components/ui/animations/presets.ts. Every element that enters a
 * celebration screen uses one of these four, so the vocabulary stays as small
 * on the web as it is on the phone.
 */
export const ENTRANCE = {
  riseSoft: { y: 20, dur: 550, ease: EASE.riseSoft }, // headlines
  riseSubtle: { y: 12, dur: 400, ease: 'power2.out' }, // subheads
  riseListItem: { y: 30, dur: 450, ease: EASE.riseSoft }, // action pills
  riseCta: { y: 30, dur: 450, ease: EASE.riseCta }, // CONTINUE
};

/**
 * Add an entrance to a timeline at an absolute millisecond position.
 *
 * `fromTo` rather than `from`, because `from` reads the element's current
 * state as the destination - and under reduced motion, where every duration is
 * 0, that read can happen before layout and land the element at the wrong
 * place. `fromTo` states both ends.
 */
export function enter(tl, el, preset, atMs) {
  if (!el) return tl;
  const p = typeof preset === 'string' ? ENTRANCE[preset] : preset;
  return tl.fromTo(
    el,
    { opacity: 0, y: p.y },
    { opacity: 1, y: 0, duration: T(p.dur), ease: p.ease },
    T(atMs),
  );
}

/**
 * A paused timeline plus the disposers that belong to the same screen.
 *
 * Paused is not a detail: it is what makes the choreography testable. A test
 * can build a screen, seek to 8.6s and assert the headline is visible, with no
 * wall-clock waiting and no flake. It also means the caller decides when to
 * start - the streak screen waits on document.fonts before it does.
 *
 * `add()` registers anything that must be torn down with the screen: Rive
 * instances, audio cues, ResizeObservers, event listeners. tl.kill() does not
 * know about any of those, and a Rive left running after the screen is gone is
 * a canvas painting into a detached node forever.
 */
export function createTimeline() {
  const disposers = [];
  const tl = G ? G.timeline({ paused: true }) : null;
  let destroyed = false;

  return {
    tl,
    add(disposer) {
      if (typeof disposer === 'function') disposers.push(disposer);
      return disposer;
    },
    play() {
      if (tl && !destroyed) tl.play(0);
    },
    /** Jump to the end state. Used when a tab returns mid-flight. */
    finish() {
      if (tl && !destroyed) tl.progress(1);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (tl) tl.kill();
      // Reverse order: later disposers may depend on earlier ones.
      for (let i = disposers.length - 1; i >= 0; i--) {
        try {
          disposers[i]();
        } catch (e) {
          // A failing disposer must not strand the ones after it. There is
          // nothing to recover here - the screen is going away regardless.
          console.warn('[celebration] disposer failed', e);
        }
      }
      disposers.length = 0;
    },
  };
}
