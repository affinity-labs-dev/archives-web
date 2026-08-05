import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock state.js to control the sfx setting
vi.mock('../../state.js', () => ({
  getSetting: vi.fn(() => true),
}));

import { getSetting } from '../../state.js';

// Mock Audio - sounds.js creates Audio objects once (lazy singleton)
const mockPlay = vi.fn(() => Promise.resolve());
class MockAudio {
  constructor() {
    this.currentTime = 0;
    this.volume = 1;
    this.play = mockPlay;
  }
}
globalThis.Audio = MockAudio;

// Import after mocks
import { playCorrect, playWrong, playTap, playStars } from '../sounds.js';

describe('Sound effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSetting.mockReturnValue(true);
  });

  it('playCorrect triggers audio play', () => {
    playCorrect();
    expect(mockPlay).toHaveBeenCalled();
  });

  it('playWrong triggers audio play', () => {
    playWrong();
    expect(mockPlay).toHaveBeenCalled();
  });

  it('playTap triggers audio play', () => {
    playTap();
    expect(mockPlay).toHaveBeenCalled();
  });

  it('does not play when sfx setting is off', () => {
    getSetting.mockReturnValue(false);
    mockPlay.mockClear();
    playCorrect();
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('playStars does nothing for 0 stars', () => {
    vi.useFakeTimers();
    mockPlay.mockClear();
    playStars(0);
    vi.advanceTimersByTime(500);
    expect(mockPlay).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('playStars triggers sound after 200ms delay for non-zero stars', () => {
    vi.useFakeTimers();
    mockPlay.mockClear();
    playStars(3);
    expect(mockPlay).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(mockPlay).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
