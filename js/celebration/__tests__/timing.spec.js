import { describe, it, expect, vi, afterEach } from 'vitest';
import { bezier, EASE, ENTRANCE } from '../timing.js';

/**
 * Load a fresh timing.js with matchMedia reporting the given preference.
 *
 * animations.js captures the MediaQueryList once at module scope
 * (`const motionQuery = window.matchMedia(...)`), which is correct in a
 * browser - the object stays live - but means stubbing matchMedia after the
 * import cannot reach it. So the stub goes in first and the module graph is
 * reset, which exercises the real prefersReducedMotion() rather than mocking
 * it away.
 */
async function loadTiming(reduced) {
  vi.resetModules();
  vi.stubGlobal('matchMedia', (q) => ({
    matches: /prefers-reduced-motion/.test(q) ? reduced : false,
    media: q,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  }));
  return import('../timing.js');
}

describe('bezier', () => {
  it('is pinned at both ends', () => {
    const e = bezier(0.4, 0, 0.2, 1);
    expect(e(0)).toBe(0);
    expect(e(1)).toBe(1);
  });

  it('clamps outside [0,1]', () => {
    const e = bezier(0.4, 0, 0.2, 1);
    expect(e(-0.5)).toBe(0);
    expect(e(1.5)).toBe(1);
  });

  it('is monotonic for the curves the spec actually uses', () => {
    // Overshoot curves are NOT monotonic in y - that is the point of them -
    // so this covers only the three that should never go backwards.
    [EASE.mascotLand, EASE.popSegment, EASE.starFlight].forEach((e) => {
      let prev = -Infinity;
      for (let x = 0; x <= 1.0001; x += 0.01) {
        const y = e(x);
        expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = y;
      }
    });
  });

  it('matches a linear curve exactly', () => {
    // cubic-bezier(1/3, 1/3, 2/3, 2/3) is the identity. A cheap check that the
    // solver is solving rather than approximating something else.
    const e = bezier(1 / 3, 1 / 3, 2 / 3, 2 / 3);
    for (let x = 0; x <= 1.0001; x += 0.1) {
      expect(e(x)).toBeCloseTo(x, 4);
    }
  });

  it('eases in and out symmetrically for a symmetric curve', () => {
    const e = bezier(0.4, 0, 0.6, 1);
    expect(e(0.5)).toBeCloseTo(0.5, 4);
    // Slow at the start: at 25% of the time, less than 25% of the distance.
    expect(e(0.25)).toBeLessThan(0.25);
    expect(e(0.75)).toBeGreaterThan(0.75);
  });

  it('overshoots past 1 for the back-out curves', () => {
    // These are Reanimated's backOut(1.1/1.22/1.275) written as literal
    // beziers, because GSAP's back.out(n) is a different parametrisation and
    // does not match for the same n. If someone swaps them for back.out(),
    // the overshoot changes and this catches it.
    let peak = 0;
    for (let x = 0; x <= 1.0001; x += 0.005) {
      peak = Math.max(peak, EASE.riseCta(x));
    }
    expect(peak).toBeGreaterThan(1);
  });
});

describe('T', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('converts milliseconds to seconds', async () => {
    const { T } = await loadTiming(false);
    expect(T(500)).toBe(0.5);
    expect(T(1900)).toBe(1.9);
    expect(T(0)).toBe(0);
  });

  it('collapses to zero under reduced motion', async () => {
    // Not "faster" - zero. Applied to timeline positions as well as
    // durations, this is what makes the whole 10s choreography resolve to its
    // final frame for someone who asked their OS for less motion.
    const { T } = await loadTiming(true);
    expect(T(500)).toBe(0);
    expect(T(10000)).toBe(0);
  });
});

describe('ENTRANCE', () => {
  it('has the four presets the screens use', () => {
    ['riseSoft', 'riseSubtle', 'riseListItem', 'riseCta'].forEach((k) => {
      expect(ENTRANCE[k]).toBeDefined();
      expect(ENTRANCE[k].y).toBeGreaterThan(0);
      expect(ENTRANCE[k].dur).toBeGreaterThan(0);
      expect(ENTRANCE[k].ease).toBeDefined();
    });
  });

  it('matches the mobile preset values', () => {
    expect(ENTRANCE.riseSoft.y).toBe(20);
    expect(ENTRANCE.riseSoft.dur).toBe(550);
    expect(ENTRANCE.riseSubtle.y).toBe(12);
    expect(ENTRANCE.riseSubtle.dur).toBe(400);
    expect(ENTRANCE.riseListItem.y).toBe(30);
    expect(ENTRANCE.riseListItem.dur).toBe(450);
    expect(ENTRANCE.riseCta.y).toBe(30);
    expect(ENTRANCE.riseCta.dur).toBe(450);
  });
});
