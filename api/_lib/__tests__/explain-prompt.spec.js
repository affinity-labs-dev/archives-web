import { describe, it, expect } from 'vitest';
import { buildExplainPrompt } from '../prompts.js';

// The prompt is the entitlement boundary: a free user's preview is enforced
// by which questions are IN the prompt, not by hiding text client-side. So
// the tests pin what goes in, not just that something does.

const Q = (n, correct) => ({
  questionText: `Question ${n}?`,
  userAnswer: correct ? `Right ${n}` : `Wrong ${n}`,
  correctAnswer: `Right ${n}`,
  isCorrect: correct,
  lessonNote: `Authored note ${n}.`,
});

describe('buildExplainPrompt', () => {
  it('includes every question passed and no others', () => {
    const prompt = buildExplainPrompt([Q(1, true), Q(2, false)], { eraName: 'Al Andalus' });
    expect(prompt).toContain('Q1: Question 1?');
    expect(prompt).toContain('Q2: Question 2?');
    expect(prompt).not.toContain('Q3');
    expect(prompt).toContain('exactly 2 objects');
  });

  it('marks correct and incorrect answers differently', () => {
    const prompt = buildExplainPrompt([Q(1, true), Q(2, false)], { eraName: 'Al Andalus' });
    expect(prompt).toContain('User answered: Right 1 ✓ (Correct)');
    expect(prompt).toContain('User answered: Wrong 2 ✗ (Incorrect, correct answer: Right 2)');
  });

  it('carries the authored lesson note with a do-not-repeat instruction', () => {
    // Without this the model paraphrases the text the user read seconds ago,
    // and the feature reads as a broken echo of the lesson.
    const prompt = buildExplainPrompt([Q(1, true)], { eraName: 'Al Andalus' });
    expect(prompt).toContain('LESSON NOTE (already shown to the user, do NOT repeat or paraphrase it): Authored note 1.');
    expect(prompt).toContain('Never restate it.');
  });

  it('omits the lesson-note line when a question has none', () => {
    // The general instructions still mention lesson notes; what must go is
    // the per-question line, which would otherwise read "NOTE: " and invite
    // the model to hallucinate what the note said.
    const q = { ...Q(1, true), lessonNote: '' };
    expect(buildExplainPrompt([q], { eraName: 'X' })).not.toContain('LESSON NOTE (already');
  });

  it('names the era and, when present, the adventure', () => {
    expect(buildExplainPrompt([Q(1, true)], { eraName: 'Al Andalus' })).toContain(
      'explaining Al Andalus history',
    );
    expect(
      buildExplainPrompt([Q(1, true)], { eraName: 'Al Andalus', adventureName: 'The Rise' }),
    ).toContain('explaining Al Andalus (The Rise) history');
  });

  it('keeps the honorific rule', () => {
    // The chat system prompt carries the full etiquette block; this prompt
    // stands alone, so it must carry the rule itself.
    expect(buildExplainPrompt([Q(1, true)], { eraName: 'X' })).toContain(
      'Prophet Muhammad (peace be upon him)',
    );
  });
});
