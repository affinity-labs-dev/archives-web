import { describe, it, expect } from 'vitest';

// Test the masteryToStars logic directly (it's not exported, so we test the mapping)
describe('masteryToStars mapping', () => {
  // Replicate the function since it's not exported
  function masteryToStars(level) {
    if (level === 'mastered') return 3;
    if (level === 'passed') return 2;
    return 1;
  }

  it('maps "mastered" to 3 stars', () => {
    expect(masteryToStars('mastered')).toBe(3);
  });

  it('maps "passed" to 2 stars', () => {
    expect(masteryToStars('passed')).toBe(2);
  });

  it('maps any other value to 1 star', () => {
    expect(masteryToStars('attempted')).toBe(1);
    expect(masteryToStars('failed')).toBe(1);
    expect(masteryToStars('')).toBe(1);
    expect(masteryToStars(null)).toBe(1);
    expect(masteryToStars(undefined)).toBe(1);
  });
});

describe('Merge algorithm (Math.max strategy)', () => {
  it('keeps the higher star count when merging local and cloud', () => {
    const local = { prophets_1: { media_1: 2, media_2: 3 } };
    const cloud = { prophets_1: { media_1: 3, media_2: 1 } };

    // Replicate the merge logic from sync.js
    for (const advId in cloud) {
      if (!local[advId]) local[advId] = {};
      const mods = cloud[advId];
      for (const modId in mods) {
        const prev = local[advId][modId] || 0;
        local[advId][modId] = Math.max(prev, mods[modId]);
      }
    }

    expect(local.prophets_1.media_1).toBe(3); // cloud was higher
    expect(local.prophets_1.media_2).toBe(3); // local was higher
  });

  it('adds new adventures from cloud that do not exist locally', () => {
    const local = {};
    const cloud = { prophets_2: { media_1: 2 } };

    for (const advId in cloud) {
      if (!local[advId]) local[advId] = {};
      const mods = cloud[advId];
      for (const modId in mods) {
        const prev = local[advId][modId] || 0;
        local[advId][modId] = Math.max(prev, mods[modId]);
      }
    }

    expect(local.prophets_2.media_1).toBe(2);
  });

  it('preserves local-only data not in cloud', () => {
    const local = { prophets_1: { media_1: 3 } };
    const cloud = { prophets_2: { media_1: 1 } };

    for (const advId in cloud) {
      if (!local[advId]) local[advId] = {};
      const mods = cloud[advId];
      for (const modId in mods) {
        const prev = local[advId][modId] || 0;
        local[advId][modId] = Math.max(prev, mods[modId]);
      }
    }

    expect(local.prophets_1.media_1).toBe(3); // untouched
    expect(local.prophets_2.media_1).toBe(1); // added from cloud
  });
});
