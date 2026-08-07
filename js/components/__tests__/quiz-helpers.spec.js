import { describe, it, expect } from 'vitest';
import { getStars, buildQuizChatMessage, buildAskAboutQuizMessage } from '../quiz-helpers.js';

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


describe('buildQuizChatMessage', () => {
  // Ported verbatim from the app's QuizResults.tsx buildChatMessage; these pin
  // that both platforms prime the assistant identically.

  const questions = [
    {
      question_text: 'Who crossed in 711?',
      answers: [
        { text: 'Tariq ibn Ziyad', is_correct: true },
        { text: 'Musa ibn Nusayr', is_correct: false },
      ],
    },
    {
      question_text: 'What became the capital?',
      answers: [
        { text: 'Toledo', is_correct: false },
        { text: 'Cordoba', is_correct: true },
      ],
    },
  ];

  it('lists each wrong answer with what was chosen and what was right', () => {
    const msg = buildQuizChatMessage(questions, [0, 0], {
      moduleTitle: 'The Crossing',
      eraName: 'Al Andalus',
    });
    expect(msg).toContain('I got 1/2 correct (50%)');
    expect(msg).toContain('- Q: "What became the capital?" | You answered: "Toledo" | Correct: "Cordoba"');
    expect(msg).not.toContain('Who crossed in 711?');
    expect(msg).toContain('Help me understand these topics better');
  });

  it('celebrates a perfect score instead of listing nothing', () => {
    const msg = buildQuizChatMessage(questions, [0, 1], { moduleTitle: 'The Crossing', eraName: 'Al Andalus' });
    expect(msg).toContain('got all 2 questions correct (100%)');
    expect(msg).toContain('deeper historical details');
  });

  it('treats a skipped question as not-wrong rather than inventing an answer', () => {
    const msg = buildQuizChatMessage(questions, [0, null], { eraName: 'Al Andalus' });
    expect(msg).toContain('I got 1/2 correct (50%)');
    expect(msg).not.toContain('got all');
  });
});

describe('buildAskAboutQuizMessage', () => {
  const question = {
    question_text: 'What became the capital?',
    answers: [
      { text: 'Toledo', is_correct: false },
      { text: 'Cordoba', is_correct: true },
    ],
  };

  it('anchors to the one question, saying what went wrong', () => {
    const msg = buildAskAboutQuizMessage(question, 0, { eraName: 'Al Andalus' });
    expect(msg).toContain('What became the capital?');
    expect(msg).toContain('"Cordoba"');
    expect(msg).toContain('I answered "Toledo"');
  });

  it('asks for depth, not correction, when the answer was right', () => {
    const msg = buildAskAboutQuizMessage(question, 1, { eraName: 'Al Andalus' });
    expect(msg).toContain('which I got right');
    expect(msg).not.toContain('Toledo');
  });
});
