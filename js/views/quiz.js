import { getAdventure } from '../api.js';
import { markComplete } from '../state.js';
import { renderHeader } from '../components/header.js';
import { renderQuizCard, attachQuizHandlers } from '../components/quiz-card.js';
import { openChat } from '../components/chat.js';
import { isPremium } from '../services/revenuecat.js';
import { showPaywall } from '../components/paywall.js';
import { getStars, buildQuizChatMessage } from '../components/quiz-helpers.js';
import {
  runCelebration,
  prepareCelebration,
  unlockCelebrationAudio,
} from '../celebration/index.js';

export default function quizView(app, { readableId, moduleIndex }) {
  app.innerHTML = '<div class="skeleton-quiz" style="padding:80px var(--page-px) 20px">'
    + '<div class="skeleton skeleton--text" style="width:200px;margin-bottom:24px"></div>'
    + '<div class="skeleton skeleton--text" style="margin-bottom:32px"></div>'
    + '<div class="skeleton skeleton--card" style="height:56px;margin-bottom:12px"></div>'
    + '<div class="skeleton skeleton--card" style="height:56px;margin-bottom:12px"></div>'
    + '<div class="skeleton skeleton--card" style="height:56px;margin-bottom:12px"></div>'
    + '<div class="skeleton skeleton--card" style="height:56px"></div>'
    + '</div>';

  const idx = parseInt(moduleIndex, 10);
  let aborted = false;
  let celebration = null;

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
    const advTitle = (adv.adventure_title?.replace(/\r?\n/g, ' '));
    const eraId = adv.era_id || 'prophets';
    const eraName = (adv.card_content && adv.card_content.era_name) || eraId;
    let current = 0;
    let score = 0;
    let incorrectAnswers = [];
    // Answer indices in question order, the shape /api/ai/explain and the
    // richer chat prompt are built from. incorrectAnswers stays alongside it
    // because the chat endpoint's older context shape still reads it.
    let userAnswers = [];

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
        + '<div class="quiz" id="quiz-container">'
        + renderQuizCard(questions[current], current, questions.length)
        + '</div></div>';

      const container = document.getElementById('quiz-container');
      attachQuizHandlers(container, questions[current], (isCorrect, selectedAnswer, answerIdx) => {
        unlockCelebrationAudio();
        if (aborted) return;
        userAnswers.push(Number.isInteger(answerIdx) ? answerIdx : null);
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
      markComplete(readableId, mod.id, getStars(score, questions.length));

      const nextIdx = idx + 1;
      const hasNext = nextIdx < modules.length;
      const adventureHash = '/adventure/' + readableId;

      celebration = runCelebration({
        correct: score,
        total: questions.length,
        mode: 'adventure',
        onChat: openAdventureChat,
        onContinue: function () {
          window.location.hash = hasNext
            ? '/lesson/' + readableId + '/' + nextIdx
            : adventureHash;
        }
      });
    }

    function openAdventureChat() {
      if (!isPremium()) { showPaywall(); return; }
      var summaryHtml = (mod.bottom_content && mod.bottom_content.reading_text) || '';
      var tmp = document.createElement('div');
      tmp.innerHTML = summaryHtml;
      var summaryText = (tmp.textContent || tmp.innerText || '').substring(0, 1000);
      var moduleTitle = mod.thumbnail_title || 'Module ' + (idx + 1);

      openChat({
        eraName: eraName,
        moduleTitle: moduleTitle,
        moduleSummary: summaryText,
        incorrectQuestions: incorrectAnswers,
        // The full record: the server prompt sees right answers too, so the
        // assistant can reinforce them instead of guessing what went well.
        questions: buildAnswerRecord()
      }, {
        firstMessage: buildQuizChatMessage(questions, userAnswers, {
          moduleTitle: moduleTitle,
          eraName: eraName
        })
      });
    }

    function buildAnswerRecord() {
      return questions.map(function (q, i) {
        var correctAns = q.answers.find(function (a) { return a.is_correct; });
        var userIdx = userAnswers[i];
        return {
          question: q.question_text,
          userAnswer: (userIdx !== null && userIdx !== undefined && q.answers[userIdx]) ? q.answers[userIdx].text : '',
          correctAnswer: correctAns ? correctAns.text : '',
          isCorrect: !!(correctAns && q.answers[userIdx] === correctAns)
        };
      });
    }

    // Downloads the celebration audio while the user answers, and creates the
    // elements the first answer tap unlocks.
    prepareCelebration();

    showQuestion();
  }).catch(err => {
    if (aborted) return;
    app.innerHTML = '<div class="error-msg">Failed to load quiz.</div>';
  });

  return () => {
    aborted = true;
    // Synchronous, and before the router's own teardown: the celebration is
    // mounted on body, so a slower cleanup leaves it over the next page.
    if (celebration) { celebration.destroy(); celebration = null; }
  };
}
