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
export function animateStarFlight(tl, root, timing, percentage, xp) {
  if (!G || !tl) return;

  const stars = root.querySelectorAll('.qres__star');
  if (!stars.length) return;

  // The landing side: each star that arrives bumps the XP figure a step and
  // pulses it, and the last one gets the flourish - a bigger pop, the star
  // icon spinning, and a ring flashing outward. Without this the stars flew
  // into a number that never noticed them.
  const xpEl = root.querySelector('.qres__xp');
  const xpRow = root.querySelector('.qres__xp-row');
  const xpIcon = root.querySelector('.qres__xp-star');
  const ring = root.querySelector('.qres__xp-ring');
  const xpTotal = Number.isFinite(xp) ? xp : 0;
  const counter = { v: 0 };

  if (xpEl && xpTotal > 0) {
    // The markup carries the true figure for the no-GSAP path; the timeline
    // knocks it to zero as the flight begins and the landings pay it back.
    tl.set(xpEl, { textContent: '0 XP' }, T(timing.xp));
    for (let i = 0; i < STAR_COUNT; i++) {
      const landAt = timing.xp + i * STAGGER_MS + FLIGHT_MS;
      const target = Math.round((xpTotal * (i + 1)) / STAR_COUNT);
      tl.to(counter, {
        v: target,
        duration: T(90),
        ease: 'power1.out',
        onUpdate() { xpEl.textContent = Math.round(counter.v) + ' XP'; },
      }, T(landAt));
      if (xpRow) {
        const isLast = i === STAR_COUNT - 1;
        tl.to(xpRow, {
          scale: isLast ? 1.35 : 1.12,
          duration: T(isLast ? 160 : 90),
          ease: isLast ? 'back.out(2.4)' : 'power2.out',
        }, T(landAt));
        tl.to(xpRow, {
          scale: 1,
          duration: T(isLast ? 300 : 130),
          ease: isLast ? 'back.inOut(1.8)' : 'power2.inOut',
        }, T(landAt + (isLast ? 170 : 95)));
      }
    }
    // The flourish rides the last landing.
    const finale = timing.xp + (STAR_COUNT - 1) * STAGGER_MS + FLIGHT_MS;
    if (xpIcon) {
      tl.fromTo(xpIcon, { rotation: 0 }, {
        rotation: 360,
        scale: 1.25,
        duration: T(450),
        ease: 'back.out(1.6)',
      }, T(finale));
      tl.to(xpIcon, { scale: 1, duration: T(200), ease: 'power2.out' }, T(finale + 460));
    }
    if (ring) {
      tl.fromTo(ring, { opacity: 0.85, scale: 0.4 }, {
        opacity: 0,
        scale: 2.4,
        duration: T(550),
        ease: 'power2.out',
      }, T(finale));
      // Rest state, stated outright for reduced motion and for seeks.
      tl.set(ring, { opacity: 0 }, T(finale + 560));
    }
    // Under reduced motion every duration collapses; the counter's tween
    // still ends at the full figure, so state it plainly for safety.
    tl.set(xpEl, { textContent: xpTotal + ' XP' }, T(finale + 600));
  }

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
