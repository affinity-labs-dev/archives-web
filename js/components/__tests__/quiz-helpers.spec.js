import { describe, it, expect } from 'vitest';
import { getStars } from '../quiz-helpers.js';

describe('getStars', () => {
  it('returns 3 stars for perfect score', () => {
    expect(getStars(3, 3)).toBe(3);
    expect(getStars(5, 5)).toBe(3);
  });

  it('returns 2 stars for 66%+', () => {
    expect(getStars(2, 3)).toBe(2);
    expect(getStars(4, 5)).toBe(2);
  });

  it('returns 1 star for 33%+', () => {
    expect(getStars(1, 3)).toBe(1);
    expect(getStars(2, 5)).toBe(1);
  });

  it('returns 0 stars for <33%', () => {
    expect(getStars(0, 3)).toBe(0);
    expect(getStars(1, 5)).toBe(0);
  });

  it('returns 0 when total is 0 (division guard)', () => {
    expect(getStars(0, 0)).toBe(0);
  });

  it('handles boundary at exactly 0.66', () => {
    // 0.66 exactly → 2 stars
    expect(getStars(66, 100)).toBe(2);
  });

  it('handles boundary at exactly 0.33', () => {
    // 0.33 exactly → 1 star
    expect(getStars(33, 100)).toBe(1);
  });
});

