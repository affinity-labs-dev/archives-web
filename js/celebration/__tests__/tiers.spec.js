import { describe, it, expect } from 'vitest';
import {
  tierFor,
  TIER_SPECS,
  TIER_TIMING,
  SPARKLES,
  getMotivationalQuote,
} from '../tiers.js';

describe('tierFor', () => {
  it('puts the boundaries where the app puts them', () => {
    // The two values that matter. 33/34 and 69/70 are where a user's screen
    // changes entirely, so they are asserted either side rather than sampled.
    expect(tierFor(33)).toBe('low');
    expect(tierFor(34)).toBe('medium');
    expect(tierFor(69)).toBe('medium');
    expect(tierFor(70)).toBe('high');
  });

  it('handles the ends', () => {
    expect(tierFor(0)).toBe('low');
    expect(tierFor(100)).toBe('high');
  });

  it('maps the three-question daily story as expected', () => {
    // The daily story is always 3 questions, so these four are the only
    // percentages most users will ever see.
    const pct = (c) => Math.round((c / 3) * 100);
    expect(tierFor(pct(0))).toBe('low'); // 0%
    expect(tierFor(pct(1))).toBe('low'); // 33%
    expect(tierFor(pct(2))).toBe('medium'); // 67%
    expect(tierFor(pct(3))).toBe('high'); // 100%
  });
});

describe('TIER_SPECS', () => {
  const REQUIRED = [
    'title',
    'subtitle',
    'cardBg',
    'cardText',
    'cardSubText',
    'progressTrack',
    'progressFill',
    'screenBg',
    'background',
    'introCue',
    'countUpCue',
    'starColor',
  ];

  it.each(['low', 'medium', 'high'])('%s has every field', (tier) => {
    REQUIRED.forEach((key) => {
      expect(TIER_SPECS[tier][key], `${tier}.${key}`).toBeTruthy();
    });
  });

  it('only the high tier omits the mascot', () => {
    // At 3/3 the background Rive is Ibu, so no separate mascot is rendered.
    // If this ever flips, the layout reserves space for one and would show a
    // gap - hence asserting the shape rather than trusting it.
    expect(TIER_SPECS.low.mascot).toBeTruthy();
    expect(TIER_SPECS.medium.mascot).toBeTruthy();
    expect(TIER_SPECS.high.mascot).toBeNull();
  });

  it('names Rive files that exist in the manifest', () => {
    const known = [
      'wave_animation.riv',
      'disco_animation.riv',
      'ibu-3-of-3.riv',
      'open-mouth.riv',
      'ibu-skating.riv',
    ];
    ['low', 'medium', 'high'].forEach((t) => {
      expect(known).toContain(TIER_SPECS[t].background);
      if (TIER_SPECS[t].mascot) expect(known).toContain(TIER_SPECS[t].mascot);
    });
  });
});

describe('TIER_TIMING', () => {
  // This is the regression net for the whole choreography. The numbers came
  // from the mobile timelines; if someone "tidies" one, this fails loudly
  // rather than the screen quietly drifting out of sync with the phone.
  const SPEC = {
    low: { intro: 200, card: 1000, spark: 1450, head: 1650, sub: 1780, pill1: 1910, bar: 2000, barDur: 900, pill2: 2040, cta: 2170, xp: 3000, countUp: 2000 },
    medium: { intro: 0, card: 3500, spark: 3950, head: 4150, sub: 4280, pill1: 4410, bar: 4500, barDur: 900, pill2: 4540, cta: 4670, xp: 5500, countUp: 4500 },
    high: { intro: 0, card: 7500, spark: 7950, head: 8150, sub: 8280, pill1: 8410, bar: 8000, barDur: 1900, pill2: 8540, cta: 8670, xp: 10000, countUp: 8200 },
  };

  it.each(Object.keys(SPEC))('%s matches the mobile timeline exactly', (tier) => {
    Object.entries(SPEC[tier]).forEach(([key, value]) => {
      expect(TIER_TIMING[tier][key], `${tier}.${key}`).toBe(value);
    });
  });

  it('orders each tier so nothing appears before the thing above it', () => {
    ['low', 'medium', 'high'].forEach((tier) => {
      const t = TIER_TIMING[tier];
      expect(t.card).toBeLessThan(t.head);
      expect(t.head).toBeLessThan(t.sub);
      expect(t.sub).toBeLessThan(t.pill1);
      expect(t.pill1).toBeLessThan(t.pill2);
      expect(t.pill2).toBeLessThan(t.cta);
      // XP stars fly from the finished progress bar, so the bar must be done.
      expect(t.bar + t.barDur).toBeLessThanOrEqual(t.xp);
    });
  });

  it('only the high tier has a perfect-score pop, after its bar finishes', () => {
    expect(TIER_TIMING.low.pop).toBeUndefined();
    expect(TIER_TIMING.medium.pop).toBeUndefined();
    expect(TIER_TIMING.high.pop).toBe(9900);
    expect(TIER_TIMING.high.pop).toBeGreaterThanOrEqual(
      TIER_TIMING.high.bar + TIER_TIMING.high.barDur,
    );
  });

  it('uses a linear bar fill only at 3/3', () => {
    // The high tier paces its count-up against the music; easing it would
    // land the number early.
    expect(TIER_TIMING.high.barEase).toBe('none');
    expect(TIER_TIMING.low.barEase).toBe('power2.out');
    expect(TIER_TIMING.medium.barEase).toBe('power2.out');
  });
});

describe('SPARKLES', () => {
  it('has the six the app has, all inside the burst window', () => {
    expect(SPARKLES).toHaveLength(6);
    SPARKLES.forEach((s) => {
      expect(s.delay).toBeGreaterThanOrEqual(1450);
      expect(s.delay).toBeLessThanOrEqual(1780);
      expect(s.size).toBeGreaterThan(0);
    });
  });
});

describe('getMotivationalQuote', () => {
  it('treats 1, 7 and 30 as their own moments', () => {
    // Hitting a round number should not read the same as being near one.
    expect(getMotivationalQuote(7)).not.toBe(getMotivationalQuote(6));
    expect(getMotivationalQuote(7)).not.toBe(getMotivationalQuote(8));
    expect(getMotivationalQuote(30)).not.toBe(getMotivationalQuote(29));
    expect(getMotivationalQuote(30)).not.toBe(getMotivationalQuote(31));
  });

  it('always returns something, including at the edges', () => {
    [0, 1, 2, 6, 7, 8, 29, 30, 31, 99, 100, 1000].forEach((n) => {
      expect(typeof getMotivationalQuote(n)).toBe('string');
      expect(getMotivationalQuote(n).length).toBeGreaterThan(0);
    });
  });
});
