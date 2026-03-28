import { playCorrect, playWrong, playTap } from './sounds.js';
import { escapeHtml } from '../utils.js';
import { shakeWrong, bounceCorrect } from '../animations.js';

export function renderQuizCard(question, index, total) {
  const bars = Array.from({ length: total }, (_, i) => {
    let cls = 'quiz__progress-bar';
    if (i < index) cls += ' done';
    else if (i === index) cls += ' active';
    return '<div class="' + cls + '"></div>';
  }).join('');

  const answers = question.answers
    .map((a, i) => {
      const letter = String.fromCharCode(65 + i);
      return '<button class="quiz__answer" data-index="' + i + '" data-correct="' + !!a.is_correct + '">'
        + '<span class="quiz__answer-letter">' + letter + '</span>'
        + '<span class="quiz__answer-text">' + escapeHtml(a.text) + '</span>'
        + '</button>';
    })
    .join('');

  return '<div class="quiz__progress">' + bars + '</div>'
    + '<div class="quiz__count">Question ' + (index + 1) + ' of ' + total + '</div>'
    + '<div class="quiz__question">' + escapeHtml(question.question_text) + '</div>'
    + '<div class="quiz__answers">' + answers + '</div>';
}

export function attachQuizHandlers(container, question, onAnswer) {
  let answered = false;

  container.querySelectorAll('.quiz__answer').forEach(btn => {
    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;

      const isCorrect = btn.dataset.correct === 'true';
      const selectedText = btn.querySelector('.quiz__answer-text')?.textContent || '';

      // Play tap on selection, then correct/wrong after brief delay
      playTap();
      setTimeout(function() {
        if (isCorrect) {
          playCorrect();
        } else {
          playWrong();
        }
      }, 150);

      btn.classList.add(isCorrect ? 'correct' : 'wrong');
      btn.classList.add('answered');

      // GSAP-powered feedback
      if (isCorrect) {
        bounceCorrect(btn);
      } else {
        shakeWrong(btn);
      }

      if (!isCorrect) {
        container.querySelectorAll('.quiz__answer').forEach(b => {
          if (b.dataset.correct === 'true') b.classList.add('reveal-correct');
          b.classList.add('answered');
        });
      } else {
        container.querySelectorAll('.quiz__answer').forEach(b => b.classList.add('answered'));
      }

      // Show explanation
      if (question.explanation) {
        const exp = document.createElement('div');
        exp.className = 'quiz__explanation';
        exp.textContent = question.explanation;
        container.querySelector('.quiz__answers').after(exp);
      }

      // Show next button
      const nextBtn = document.createElement('button');
      nextBtn.className = 'quiz__next';
      nextBtn.textContent = 'Continue';
      container.appendChild(nextBtn);
      nextBtn.addEventListener('click', () => onAnswer(isCorrect, selectedText));
    });
  });
}
