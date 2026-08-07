// The XP star flight.
//
// Five stars leave the filled end of the progress bar and arc up into the XP
// figure on the right of the card. Ported from XPStarFlight.tsx, including its
// quadratic Bezier: the arc is the whole point, a straight line reads as a
// slide rather than a throw.

import { T, EASE } from './timing.js';
import { SPARKLE_PATH } from './tiers.js';

const G = typeof window !== 'undefined' ? window.gsap : null;

const STAR_COUNT = 5;
const STAR_SIZE = 17;
const STAGGER_MS = 100;
const FLIGHT_MS = 650;
/** How far above the straight line the arc peaks. */
const ARC_RISE = 40;

/** Quadratic Bezier: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2. */
function quad(p0, p1, p2, t) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

export function renderStars(color) {
  let html = '<div class="qres__stars" aria-hidden="true">';
  for (let i = 0; i < STAR_COUNT; i++) {
    html += `<svg class="qres__star" width="${STAR_SIZE}" height="${STAR_SIZE}"
                  viewBox="0 0 24 24"><path d="${SPARKLE_PATH}" fill="${color}"/></svg>`;
  }
  return html + '</div>';
}

/**
 * Put the flight on the timeline.
 *
 * Every tween here is added to the timeline rather than spawned from a
 * callback. A detached tween would animate correctly on a normal playthrough
 * and then be invisible to seek(), which is how the rest of this screen is
 * tested - so "it works when you watch it, and cannot be asserted" is exactly
 * the trap to avoid.
 *
 * Geometry still has to be measured at runtime: the card is mid-pop-in when
 * this timeline is built, so its rect then is meaningless. It is measured once
 * in the first tween's onStart into a shared object the onUpdates read.
 */
export function animateStarFlight(tl, root, timing, percentage) {
  if (!G || !tl) return;

  const stars = root.querySelectorAll('.qres__star');
  if (!stars.length) return;

  // Measured in onStart, read by every onUpdate below.
  const geo = { ready: false };

  const measure = () => {
    const wrap = root.querySelector('.qres__card-wrap');
    const track = root.querySelector('.qres__track');
    const xp = root.querySelector('.qres__xp-row');
    if (!wrap || !track || !xp) return;

    const base = wrap.getBoundingClientRect();
    const t = track.getBoundingClientRect();
    const x = xp.getBoundingClientRect();
    if (!t.width) return; // laid out but not yet sized (display:none ancestor)

    // Origin: the leading edge of the filled portion of the bar.
    geo.fromX = t.left - base.left + (t.width * percentage) / 100;
    geo.fromY = t.top - base.top + t.height / 2;
    // Destination: the XP figure on the right of the card.
    geo.toX = x.left - base.left + x.width / 2;
    geo.toY = x.top - base.top + x.height / 2;
    // Control point: midway across and lifted, so the path arcs over the card
    // rather than sliding along it.
    geo.ctrlX = (geo.fromX + geo.toX) / 2;
    geo.ctrlY = Math.min(geo.fromY, geo.toY) - ARC_RISE;
    geo.ready = true;
  };

  stars.forEach((star, i) => {
    const prog = { t: 0 };
    const at = timing.xp + i * STAGGER_MS;

    tl.set(star, { opacity: 0 }, 0);
    tl.to(
      prog,
      {
        t: 1,
        duration: T(FLIGHT_MS),
        ease: EASE.starFlight,
        onStart() {
          // The first star to start does the measuring; the rest reuse it.
          if (!geo.ready) measure();
          if (geo.ready) G.set(star, { opacity: 1 });
        },
        onUpdate() {
          if (!geo.ready) return;
          const p = prog.t;
          G.set(star, {
            x: quad(geo.fromX, geo.ctrlX, geo.toX, p),
            y: quad(geo.fromY, geo.ctrlY, geo.toY, p),
            // Swells through the middle, so the throw has some weight.
            scale: p < 0.5 ? 0.7 + p : 1.2 - (p - 0.5) * 0.4,
            rotation: p * 360,
          });
        },
        onComplete() {
          G.set(star, { opacity: 0 });
        },
      },
      T(at),
    );
    // Under reduced motion every duration is 0 and onComplete may not run, so
    // state the resting value outright. The stars carry no information the
    // card does not already show, so not seeing them costs nothing.
    tl.set(star, { opacity: 0 }, T(at + FLIGHT_MS));
  });
}
