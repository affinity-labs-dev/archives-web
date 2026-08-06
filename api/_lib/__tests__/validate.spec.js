import { describe, it, expect } from 'vitest';
import { validAdventureProgress, validDailyProgress } from '../validate.js';

describe('validAdventureProgress', () => {
  it('accepts the real shape', () => {
    expect(validAdventureProgress({ prophets_1: { media_1: 3, media_2: 0 } })).toBe(true);
    expect(validAdventureProgress({})).toBe(true);
  });

  it('rejects anything that is not an object of objects', () => {
    expect(validAdventureProgress(null)).toBe(false);
    expect(validAdventureProgress('nope')).toBe(false);
    expect(validAdventureProgress([1, 2, 3])).toBe(false);
    expect(validAdventureProgress({ prophets_1: 3 })).toBe(false);
    expect(validAdventureProgress({ prophets_1: [3] })).toBe(false);
  });

  it('rejects star values that would corrupt the best-score merge', () => {
    expect(validAdventureProgress({ a: { m: 4 } })).toBe(false);
    expect(validAdventureProgress({ a: { m: -1 } })).toBe(false);
    expect(validAdventureProgress({ a: { m: 2.5 } })).toBe(false);
    expect(validAdventureProgress({ a: { m: '3' } })).toBe(false);
    expect(validAdventureProgress({ a: { m: null } })).toBe(false);
  });

  it('caps size so the JSONB column cannot be used as free storage', () => {
    const many = {};
    for (let i = 0; i < 501; i++) many['adv_' + i] = { m: 1 };
    expect(validAdventureProgress(many)).toBe(false);

    const wide = { adv: {} };
    for (let i = 0; i < 201; i++) wide.adv['m_' + i] = 1;
    expect(validAdventureProgress(wide)).toBe(false);
  });
});

describe('validDailyProgress', () => {
  it('accepts the real shape', () => {
    expect(validDailyProgress({ '2026-08-06': { watch: true, questions: 3 } })).toBe(true);
    expect(validDailyProgress({})).toBe(true);
  });

  it('rejects keys that are not calendar dates', () => {
    expect(validDailyProgress({ today: { watch: true } })).toBe(false);
    expect(validDailyProgress({ '2026-8-6': { watch: true } })).toBe(false);
    expect(validDailyProgress({ '': { watch: true } })).toBe(false);
  });

  it('rejects unknown step names', () => {
    expect(validDailyProgress({ '2026-08-06': { hacked: true } })).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(validDailyProgress(null)).toBe(false);
    expect(validDailyProgress([])).toBe(false);
    expect(validDailyProgress({ '2026-08-06': 'done' })).toBe(false);
  });
});
