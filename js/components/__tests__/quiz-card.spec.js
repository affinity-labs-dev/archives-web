import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sounds to prevent Audio creation in jsdom
vi.mock('../sounds.js', () => ({
  playCorrect: vi.fn(),
  playWrong: vi.fn(),
  playTap: vi.fn(),
}));

import { renderQuizCard, attachQuizHandlers } from '../quiz-card.js';
import { playCorrect, playWrong, playTap } from '../sounds.js';

const sampleQuestion = {
  question_text: 'What is the answer?',
  explanation: 'Because it is correct.',
  answers: [
    { text: 'Wrong A', is_correct: false },
    { text: 'Correct B', is_correct: true },
    { text: 'Wrong C', is_correct: false },
    { text: 'Wrong D', is_correct: false },
  ],
};

describe('renderQuizCard', () => {
  it('renders question text', () => {
    const html = renderQuizCard(sampleQuestion, 0, 3);
    expect(html).toContain('What is the answer?');
  });

  it('renders question counter', () => {
    const html = renderQuizCard(sampleQuestion, 1, 3);
    expect(html).toContain('Question 2 of 3');
  });

  it('renders all answer options with letter badges', () => {
    const html = renderQuizCard(sampleQuestion, 0, 1);
    expect(html).toContain('>A<');
    expect(html).toContain('>B<');
    expect(html).toContain('>C<');
    expect(html).toContain('>D<');
    expect(html).toContain('Wrong A');
    expect(html).toContain('Correct B');
  });

  it('renders progress bars', () => {
    const html = renderQuizCard(sampleQuestion, 1, 3);
    expect(html).toContain('quiz__progress-bar');
    // First bar should be "done", second "active"
    expect(html).toContain('done');
    expect(html).toContain('active');
  });

  it('escapes HTML in question text so it renders as text not elements', () => {
    const q = { ...sampleQuestion, question_text: '<img src=x onerror=alert(1)>' };
    const html = renderQuizCard(q, 0, 1);
    // The angle brackets are escaped, so the tag won't execute
    expect(html).toContain('&lt;img');
    expect(html).toContain('&gt;');
    // When parsed as DOM, no actual <img> element should exist
    const div = document.createElement('div');
    div.innerHTML = html;
    expect(div.querySelector('.quiz__question img')).toBeNull();
  });

  it('marks correct answer with data-correct="true"', () => {
    const html = renderQuizCard(sampleQuestion, 0, 1);
    expect(html).toContain('data-correct="true"');
    // Only one correct answer
    const matches = html.match(/data-correct="true"/g);
    expect(matches).toHaveLength(1);
  });
});

describe('attachQuizHandlers', () => {
  let container;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    container = document.createElement('div');
    container.innerHTML = renderQuizCard(sampleQuestion, 0, 1);
    document.body.appendChild(container);
  });

  it('calls onAnswer when an answer is clicked then Continue pressed', () => {
    const onAnswer = vi.fn();
    attachQuizHandlers(container, sampleQuestion, onAnswer);

    // Click the correct answer (index 1)
    const btn = container.querySelectorAll('.quiz__answer')[1];
    btn.click();

    vi.advanceTimersByTime(200);

    // Click Continue
    const nextBtn = container.querySelector('.quiz__next');
    expect(nextBtn).not.toBeNull();
    nextBtn.click();

    expect(onAnswer).toHaveBeenCalledWith(true, 'Correct B');
  });

  it('prevents double-answer submission', () => {
    const onAnswer = vi.fn();
    attachQuizHandlers(container, sampleQuestion, onAnswer);

    const btns = container.querySelectorAll('.quiz__answer');
    btns[0].click(); // first click
    btns[1].click(); // second click — should be ignored

    vi.advanceTimersByTime(200);

    // Only one answer should be marked
    const answeredBtns = container.querySelectorAll('.quiz__answer.answered');
    // All buttons get "answered" class after first click
    expect(answeredBtns.length).toBeGreaterThan(0);

    // Only one Continue button
    const nextBtns = container.querySelectorAll('.quiz__next');
    expect(nextBtns).toHaveLength(1);
  });

  it('plays tap sound immediately on click', () => {
    const onAnswer = vi.fn();
    attachQuizHandlers(container, sampleQuestion, onAnswer);

    container.querySelectorAll('.quiz__answer')[0].click();
    expect(playTap).toHaveBeenCalledTimes(1);
  });

  it('plays correct sound after 150ms for correct answer', () => {
    const onAnswer = vi.fn();
    attachQuizHandlers(container, sampleQuestion, onAnswer);

    // Click correct answer (index 1)
    container.querySelectorAll('.quiz__answer')[1].click();

    expect(playCorrect).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(playCorrect).toHaveBeenCalledTimes(1);
  });

  it('plays wrong sound after 150ms for wrong answer', () => {
    const onAnswer = vi.fn();
    attachQuizHandlers(container, sampleQuestion, onAnswer);

    // Click wrong answer (index 0)
    container.querySelectorAll('.quiz__answer')[0].click();

    expect(playWrong).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(playWrong).toHaveBeenCalledTimes(1);
  });

  it('reveals correct answer when wrong answer is picked', () => {
    const onAnswer = vi.fn();
    attachQuizHandlers(container, sampleQuestion, onAnswer);

    // Click wrong answer
    container.querySelectorAll('.quiz__answer')[0].click();
    vi.advanceTimersByTime(200);

    const revealed = container.querySelector('.quiz__answer.reveal-correct');
    expect(revealed).not.toBeNull();
    // The revealed answer should be the correct one (index 1)
    expect(revealed.dataset.correct).toBe('true');
  });

  it('shows explanation text after answering', () => {
    const onAnswer = vi.fn();
    attachQuizHandlers(container, sampleQuestion, onAnswer);

    container.querySelectorAll('.quiz__answer')[0].click();
    vi.advanceTimersByTime(200);

    const explanation = container.querySelector('.quiz__explanation');
    expect(explanation).not.toBeNull();
    expect(explanation.textContent).toBe('Because it is correct.');
  });

  it('does not show explanation when question has none', () => {
    const q = { ...sampleQuestion, explanation: null };
    container.innerHTML = renderQuizCard(q, 0, 1);
    const onAnswer = vi.fn();
    attachQuizHandlers(container, q, onAnswer);

    container.querySelectorAll('.quiz__answer')[0].click();
    vi.advanceTimersByTime(200);

    expect(container.querySelector('.quiz__explanation')).toBeNull();
  });
});
