// Scoring helper for both quiz flows.
//
// getRewardVideo() and getResultMessage() lived here too and are gone with the
// score screen they fed: the celebration picks its own copy and assets per
// tier in js/celebration/tiers.js. getStars stays - it is what gets PERSISTED,
// for adventures via markComplete and for the daily story via
// setDailyStepComplete, and adventure-detail.js reads it back.

export function getStars(score, total) {
  if (total === 0) return 0;
  var pct = score / total;
  if (pct >= 1) return 3;
  if (pct >= 0.66) return 2;
  if (pct >= 0.33) return 1;
  return 0;
}

/**
 * The chat's hidden first message, ported verbatim from the app's
 * QuizResults.tsx buildChatMessage so both platforms prime the assistant
 * identically. Takes the raw question objects and the answer indices the
 * quiz captured; skipped questions (null/undefined index) are treated as
 * not-wrong rather than guessed at.
 */
export function buildQuizChatMessage(questions, userAnswers, opts) {
  opts = opts || {};
  var moduleTitle = opts.moduleTitle;
  var eraName = opts.eraName || 'this era';

  var total = questions.length;
  var correct = 0;
  var incorrectLines = [];

  questions.forEach(function (q, i) {
    var userIdx = userAnswers[i];
    var correctIdx = q.answers.findIndex(function (a) { return a.is_correct; });
    if (userIdx === undefined || userIdx === null) return;
    if (userIdx === correctIdx) {
      correct++;
      return;
    }
    incorrectLines.push(
      '- Q: "' + q.question_text + '" | You answered: "' + (q.answers[userIdx] ? q.answers[userIdx].text : '') +
      '" | Correct: "' + (q.answers[correctIdx] ? q.answers[correctIdx].text : '') + '"'
    );
  });

  var percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  var title = moduleTitle || 'this module';
  var incorrectList = incorrectLines.join('\n');

  if (incorrectList) {
    return 'I just finished the quiz on "' + title + '" in ' + eraName + '. I got ' + correct + '/' + total +
      ' correct (' + percentage + '%). Here are the questions I got wrong:\n' + incorrectList +
      '\n\nHelp me understand these topics better with real historical context.';
  }
  // The perfect-score line requires the score to actually be perfect. A
  // skipped question (impossible in the UI, but the shape allows null) is
  // neither right nor wrong, and "got all N correct (50%)" reads as broken.
  if (correct === total) {
    return 'I just finished the quiz on "' + title + '" in ' + eraName + ' and got all ' + total +
      ' questions correct (' + percentage + '%)! Can you share some deeper historical details about this topic that I might not have learned in the lessons?';
  }
  return 'I just finished the quiz on "' + title + '" in ' + eraName + '. I got ' + correct + '/' + total +
    ' correct (' + percentage + '%). Help me understand this topic better with real historical context.';
}

/**
 * First message for the "Ask about any of these" path out of the
 * explanations sheet: same voice as buildQuizChatMessage, anchored to one
 * question instead of the whole result.
 */
export function buildAskAboutQuizMessage(question, userAnswerIdx, opts) {
  opts = opts || {};
  var eraName = opts.eraName || 'this era';
  var correctIdx = question.answers.findIndex(function (a) { return a.is_correct; });
  var wasCorrect = userAnswerIdx === correctIdx;
  var correctText = question.answers[correctIdx] ? question.answers[correctIdx].text : '';

  var base = 'From my quiz on ' + eraName + ': "' + question.question_text + '" The correct answer is "' + correctText + '"';
  if (wasCorrect) {
    return base + ', which I got right. Tell me more about the history behind it.';
  }
  var userText = question.answers[userAnswerIdx] ? question.answers[userAnswerIdx].text : '';
  return base + ', but I answered "' + userText + '". Help me understand why, with real historical context.';
}
