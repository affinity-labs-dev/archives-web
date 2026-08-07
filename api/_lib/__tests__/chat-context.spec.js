import { describe, it, expect } from 'vitest';
import { buildContext } from '../prompts.js';

// The chat context grew a full per-question record (verdicts included) so the
// assistant can reinforce right answers too. The fallback to the old
// wrong-answers-only shape is NOT optional: cached bundles send it during
// every deploy, so both paths must produce a sane prompt.

describe('buildContext', () => {
  it('prefers the full record and shows the verdicts', () => {
    const out = buildContext({
      eraName: 'Al Andalus',
      questions: [
        { question: 'Q1?', userAnswer: 'Right', correctAnswer: 'Right', isCorrect: true },
        { question: 'Q2?', userAnswer: 'Wrong', correctAnswer: 'Other', isCorrect: false },
      ],
      // Present at the same time, as real requests will send both.
      incorrectQuestions: [{ question: 'Q2?', userAnswer: 'Wrong', correctAnswer: 'Other' }],
    });

    expect(out).toContain("The quiz, with the user's answers:");
    expect(out).toContain('Answered correctly: Right');
    expect(out).toContain('User answered: Wrong');
    expect(out).toContain('Correct answer: Other');
    expect(out).not.toContain('Questions the user got wrong');
  });

  it('falls back to the old wrong-answers-only shape', () => {
    const out = buildContext({
      eraName: 'Al Andalus',
      incorrectQuestions: [{ question: 'Q2?', userAnswer: 'Wrong', correctAnswer: 'Other' }],
    });
    expect(out).toContain('Questions the user got wrong:');
    expect(out).toContain('User answered: Wrong');
  });

  it('still reports a clean sweep when neither list has entries', () => {
    const out = buildContext({ eraName: 'Al Andalus', questions: [], incorrectQuestions: [] });
    expect(out).toContain('answered all questions correctly');
  });
});
