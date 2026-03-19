import { getAdventure } from '../api.js';
import { markComplete } from '../state.js';
import { renderHeader } from '../components/header.js';
import { renderQuizCard, attachQuizHandlers } from '../components/quiz-card.js';
import { playStars } from '../components/sounds.js';
import { openChat } from '../components/chat.js';
import { escapeHtml } from '../utils.js';
import { isPremium } from '../services/revenuecat.js';
import { showPaywall } from '../components/paywall.js';

function getStars(score, total) {
  if (total === 0) return 0;
  var pct = score / total;
  if (pct >= 1) return 3;
  if (pct >= 0.66) return 2;
  if (pct >= 0.33) return 1;
  return 0;
}

// 3-tier reward video system matching the mobile app
function getRewardVideo(percentage) {
  if (percentage >= 70) return 'assets/videos/quiz_reward/quiz-reward3.mp4';
  if (percentage >= 34) return 'assets/videos/quiz_reward/quiz-reward2.mp4';
  return 'assets/videos/quiz_reward/quiz-reward1.mp4';
}

function getResultMessage(percentage) {
  if (percentage >= 70) return { title: 'Brilliant Effort!', subtitle: "You're getting better every time" };
  return { title: "You've Got This!", subtitle: 'Revisit the lessons & try again' };
}

function renderStars(earned, total) {
  var html = '<div class="stars">';
  for (var i = 0; i < total; i++) {
    var filled = i < earned;
    var delay = i * 0.2;
    html += '<div class="star ' + (filled ? 'star--filled' : 'star--empty') + '" style="animation-delay:' + delay + 's">'
      + '<svg viewBox="0 0 24 24" fill="' + (filled ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.5">'
      + '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'
      + '</svg>'
      + '</div>';
  }
  html += '</div>';
  return html;
}

export default function quizView(app, { readableId, moduleIndex }) {
  app.innerHTML = '<div class="loading"><div class="spinner"></div>Loading</div>';

  const idx = parseInt(moduleIndex, 10);
  let aborted = false;

  getAdventure(readableId).then(adv => {
    if (aborted) return;
    if (!adv) {
      app.innerHTML = '<div class="error-msg">Adventure not found.</div>';
      return;
    }

    const modules = (adv.content_list || []).sort((a, b) => a.order_by - b.order_by);
    const mod = modules[idx];
    if (!mod || !mod.questions || mod.questions.length === 0) {
      app.innerHTML = '<div class="error-msg">No quiz available.</div>';
      return;
    }

    const questions = mod.questions;
    const advTitle = escapeHtml(adv.adventure_title?.replace(/\r?\n/g, ' '));
    const modTitle = escapeHtml(mod.thumbnail_title || 'Module ' + (idx + 1));
    const eraId = adv.era_id || 'prophets';
    const eraName = escapeHtml((adv.card_content && adv.card_content.era_name) || eraId);
    let current = 0;
    let score = 0;
    let incorrectAnswers = [];

    var quizCrumbs = [
      { label: 'Home', hash: '/' },
      { label: eraName, hash: '/era/' + encodeURIComponent(eraId) },
      { label: advTitle, hash: '/adventure/' + readableId },
      { label: 'Quiz' }
    ];

    function showQuestion() {
      if (aborted) return;
      const backHash = '/lesson/' + readableId + '/' + idx;

      app.innerHTML = renderHeader('Quiz', backHash, quizCrumbs)
        + '<div class="quiz-wrap">'
        + '<div class="quiz fade-in" id="quiz-container">'
        + renderQuizCard(questions[current], current, questions.length)
        + '</div></div>';

      const container = document.getElementById('quiz-container');
      attachQuizHandlers(container, questions[current], (isCorrect, selectedAnswer) => {
        if (aborted) return;
        if (isCorrect) {
          score++;
        } else {
          var correctAns = questions[current].answers.find(function(a) { return a.is_correct; });
          incorrectAnswers.push({
            question: questions[current].question_text,
            userAnswer: selectedAnswer,
            correctAnswer: correctAns ? correctAns.text : ''
          });
        }
        current++;

        if (current < questions.length) {
          showQuestion();
        } else {
          showScore();
        }
      });
    }

    function showScore() {
      if (aborted) return;
      const stars = getStars(score, questions.length);
      markComplete(readableId, mod.id, stars);

      const nextIdx = idx + 1;
      const hasNext = nextIdx < modules.length;
      const adventureHash = '/adventure/' + readableId;
      const percentage = Math.round((score / questions.length) * 100);
      const videoSrc = getRewardVideo(percentage);
      const msg = getResultMessage(percentage);

      app.innerHTML = renderHeader('', adventureHash, [
            { label: 'Home', hash: '/' },
            { label: eraName, hash: '/era/' + encodeURIComponent(eraId) },
            { label: advTitle, hash: '/adventure/' + readableId },
            { label: 'Quiz Complete' }
          ])
        + '<div class="quiz-score fade-in">'
        + '<div class="quiz-score__video-wrap">'
        + '<video class="quiz-score__video" autoplay playsinline>'
        + '<source src="' + escapeHtml(videoSrc) + '" type="video/mp4">'
        + '</video></div>'
        + '<div class="quiz-score__title">' + escapeHtml(msg.title) + '</div>'
        + '<div class="quiz-score__subtitle">' + escapeHtml(msg.subtitle) + '</div>'
        + '<div class="quiz-score__stats">'
        + '<div class="quiz-score__stats-left">'
        + '<div class="quiz-score__percentage">' + percentage + '%</div>'
        + '<div class="quiz-score__final">Final Score</div>'
        + '</div>'
        + '<div class="quiz-score__stats-right">'
        + '<div class="quiz-score__correct">Correct: ' + score + '/' + questions.length + '</div>'
        + '</div></div>'
        + '<div class="quiz-score__progress-bar"><div class="quiz-score__progress-fill" style="width:' + percentage + '%"></div></div>'
        + '<div class="quiz-score__actions" id="quiz-actions">'
        + (hasNext ? '<button class="cta-btn" data-action="next">Continue</button>' : '')
        + '<button class="quiz-score__retry" data-action="retry">Retake Quiz</button>'
        + '<button class="quiz-score__chat" data-action="chat">Chat to Learn More</button>'
        + '<button class="quiz-score__back" data-action="back">Back to Adventure</button>'
        + '</div></div>';

      // Attach click handlers
      const actions = document.getElementById('quiz-actions');
      if (actions) {
        actions.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action]');
          if (!btn) return;
          if (btn.dataset.action === 'next') window.location.hash = '/lesson/' + readableId + '/' + nextIdx;
          else if (btn.dataset.action === 'retry') window.location.hash = '/quiz/' + readableId + '/' + idx;
          else if (btn.dataset.action === 'chat') {
            if (!isPremium()) { showPaywall(); return; }
            // Build module summary from reading text (strip HTML)
            var summaryHtml = (mod.bottom_content && mod.bottom_content.reading_text) || '';
            var tmp = document.createElement('div');
            tmp.innerHTML = summaryHtml;
            var summaryText = (tmp.textContent || tmp.innerText || '').substring(0, 1000);

            openChat({
              eraName: (adv.card_content && adv.card_content.era_name) || eraId,
              moduleTitle: mod.thumbnail_title || 'Module ' + (idx + 1),
              moduleSummary: summaryText,
              incorrectQuestions: incorrectAnswers
            });
          }
          else if (btn.dataset.action === 'back') window.location.hash = adventureHash;
        });
      }

      // Play star sound after render
      setTimeout(function() { playStars(stars); }, 100);
    }

    showQuestion();
  }).catch(err => {
    if (aborted) return;
    app.innerHTML = '<div class="error-msg">Failed to load quiz.</div>';
  });

  return () => { aborted = true; };
}
