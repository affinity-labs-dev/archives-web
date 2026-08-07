// The "Understand your answers" bottom sheet.
//
// Useful at t=0, before any network: it opens with one card per question
// built from data the client already holds - the verdict, both answers, and
// the authored lesson explanation under a "From the lesson" label - then asks
// /api/ai/explain to go deeper, card by card. That design is both the answer
// to redundancy (the AI is told not to repeat the authored text) and the
// answer to failure (a timeout degrades a card footer, never the screen).
//
// The one rule that must survive refactors: after the response arrives,
// everything renders from the server's `mode` - the client's cached
// isPremium() picks the initial skeleton and NOTHING else. The free tier's
// locked cards contain synthetic filler bars, never blurred real text,
// because the server never generated the locked explanations at all.
//
// Same idioms as chat.js: module state, insertAdjacentHTML, rAF for the
// open transition, transitionend + timeout fallback on close.

import { explainAnswers } from '../services/gemini.js';
import { isPremium } from '../services/revenuecat.js';
import { showPaywall } from './paywall.js';
import { escapeHtml } from '../utils.js';

var sheetState = null;

var TIMEOUT_MS = 15000;
var MAX_RETRIES = 2;

function verdictFor(question, userIdx) {
  var correctIdx = question.answers.findIndex(function (a) { return a.is_correct; });
  return {
    correctIdx: correctIdx,
    isCorrect: userIdx === correctIdx,
    userText: (question.answers[userIdx] && question.answers[userIdx].text) || '',
    correctText: (question.answers[correctIdx] && question.answers[correctIdx].text) || '',
  };
}

/** The instant part of a card: everything the client already knows. */
function renderCardTop(question, userIdx, number) {
  var v = verdictFor(question, userIdx);
  var pip = v.isCorrect
    ? '<span class="exp__pip exp__pip--right" aria-label="Correct">✓</span>'
    : '<span class="exp__pip exp__pip--wrong" aria-label="Incorrect">✗</span>';
  var answerLine = v.isCorrect
    ? 'You answered: <strong>' + escapeHtml(v.correctText) + '</strong>'
    : 'Your answer: <strong>' + escapeHtml(v.userText) + '</strong> · Correct: <strong>' + escapeHtml(v.correctText) + '</strong>';

  var lesson = question.explanation
    ? '<div class="exp__lesson"><div class="exp__lesson-label">From the lesson</div>' + escapeHtml(question.explanation) + '</div>'
    : '';

  return '<div class="exp__card-head">' + pip
    + '<div class="exp__card-q"><div class="exp__card-number">Question ' + number + '</div>'
    + '<div class="exp__card-text">' + escapeHtml(question.question_text) + '</div>'
    + '<div class="exp__card-answers">' + answerLine + '</div></div></div>'
    + lesson;
}

/** The AI slot of an unlocked card, in its loading state. */
function renderDeeperLoading() {
  return '<div class="exp__deeper exp__deeper--loading">'
    + '<div class="exp__deeper-label">Going deeper…</div>'
    + '<div class="exp__shimmer" style="width:92%"></div>'
    + '<div class="exp__shimmer" style="width:84%"></div>'
    + '<div class="exp__shimmer" style="width:61%"></div>'
    + '</div>';
}

/**
 * A locked card's filler: synthetic bars behind a fade. Nothing to reveal -
 * the text does not exist on this side of the paywall - so devtools finds
 * exactly what the design promises: decoration.
 */
function renderLockedFiller() {
  return '<div class="exp__deeper exp__deeper--locked" aria-hidden="true">'
    + '<div class="exp__filler" style="width:95%"></div>'
    + '<div class="exp__filler" style="width:88%"></div>'
    + '<div class="exp__filler" style="width:72%"></div>'
    + '<div class="exp__filler" style="width:80%"></div>'
    + '</div>';
}

function renderSheet(questions, userAnswers, assumePremium) {
  var cards = questions.map(function (q, i) {
    var locked = !assumePremium && i > 0;
    return '<div class="exp__card" data-q="' + i + '">'
      + renderCardTop(q, userAnswers[i], i + 1)
      + '<div class="exp__slot" data-slot="' + i + '">'
      + (locked ? renderLockedFiller() : renderDeeperLoading())
      + '</div>'
      + '</div>';
  }).join('');

  return '<div class="exp-sheet" id="exp-sheet" role="dialog" aria-label="Understand your answers">'
    + '<div class="exp__scrim" id="exp-scrim"></div>'
    + '<div class="exp__panel">'
    + '<div class="exp__grab" aria-hidden="true"></div>'
    + '<div class="exp__header">'
    + '<div class="exp__title">Understand your answers</div>'
    + '<button class="exp__close" id="exp-close" aria-label="Close">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    + '</button>'
    + '</div>'
    + '<div class="exp__body" id="exp-body">'
    + '<div class="exp__status" id="exp-status"></div>'
    + cards
    + '<div class="exp__tail" id="exp-tail"></div>'
    + '</div>'
    + '</div></div>';
}

function el(id) { return document.getElementById(id); }

function setSlot(i, html) {
  var slot = document.querySelector('#exp-sheet [data-slot="' + i + '"]');
  if (slot) slot.innerHTML = html;
}

function setStatus(html) {
  var status = el('exp-status');
  if (status) status.innerHTML = html;
}

function setTail(html) {
  var tail = el('exp-tail');
  if (tail) tail.innerHTML = html;
}

/** Render the server's answer. The response's mode decides everything. */
function applyResponse(out) {
  if (!sheetState) return;
  var s = sheetState;
  s.lastResponse = out;

  var explanations = out.explanations || [];
  var n = s.questions.length;

  for (var i = 0; i < n; i++) {
    if (i < out.unlockedCount) {
      var e = explanations[i];
      if (e && e.explanation) {
        setSlot(i, '<div class="exp__deeper"><div class="exp__deeper-label">Going deeper</div>'
          + '<div class="exp__deeper-text">' + escapeHtml(e.explanation) + '</div></div>');
      } else {
        // This question's explanation did not survive parsing; the authored
        // text above the slot is intact, so the loss is a footer, not a card.
        setSlot(i, '<div class="exp__deeper exp__deeper--failed">'
          + '<span>Couldn\'t go deeper on this one.</span>'
          + '</div>');
      }
    } else {
      setSlot(i, renderLockedFiller());
    }
  }

  if (out.mode === 'preview' && n > out.unlockedCount) {
    if (out.entitlementUnknown) {
      // Possibly a subscriber; RevenueCat could not say. An upsell here would
      // pitch Premium to someone who may already pay for it.
      setTail('<div class="exp__promo exp__promo--neutral">'
        + '<div class="exp__promo-title">Couldn\'t verify your subscription</div>'
        + '<div class="exp__promo-sub">' + (n - out.unlockedCount) + ' more explanations are waiting.</div>'
        + '<button class="exp__promo-btn" id="exp-reverify">Try again</button>'
        + '</div>');
      var reverify = el('exp-reverify');
      if (reverify) reverify.addEventListener('click', function () { startFetch(true); });
    } else {
      setTail('<div class="exp__promo">'
        + '<div class="exp__promo-title">Unlock all ' + n + ' explanations</div>'
        + '<div class="exp__promo-sub">Premium explains every answer, right or wrong.</div>'
        + '<button class="exp__promo-btn" id="exp-upgrade">Upgrade</button>'
        + '</div>');
      var upgrade = el('exp-upgrade');
      if (upgrade) upgrade.addEventListener('click', function () { showPaywall(); });
    }
  } else if (out.mode === 'full' && typeof s.onAsk === 'function') {
    setTail('<button class="exp__ask" id="exp-ask">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
      + '<span>Ask about any of these</span>'
      + '</button>');
    var ask = el('exp-ask');
    if (ask) ask.addEventListener('click', function () {
      var cb = s.onAsk;
      closeExplanations();
      cb();
    });
  }

  if (out.degraded) {
    setStatus('<div class="exp__strip">'
      + '<span>The AI answers came back garbled.</span>'
      + (s.retries < MAX_RETRIES ? '<button class="exp__strip-btn" id="exp-retry">Retry</button>' : '')
      + '</div>');
    wireRetry();
  } else {
    setStatus('');
  }
}

function applyError(err) {
  if (!sheetState) return;
  var s = sheetState;

  // Whatever happened, the authored content stays; only the AI slots change.
  for (var i = 0; i < s.questions.length; i++) {
    var locked = !s.assumePremium && i > 0;
    setSlot(i, locked ? renderLockedFiller() : '<div class="exp__deeper exp__deeper--failed"><span>Couldn\'t load the deeper explanation.</span></div>');
  }

  if (err && err.code === 'QUOTA_EXHAUSTED') {
    setStatus('');
    setTail('<div class="exp__promo">'
      + '<div class="exp__promo-title">You\'ve used this month\'s free explanations</div>'
      + '<div class="exp__promo-sub">Premium removes the limit.</div>'
      + '<button class="exp__promo-btn" id="exp-upgrade">Upgrade</button>'
      + '</div>');
    var upgrade = el('exp-upgrade');
    if (upgrade) upgrade.addEventListener('click', function () { showPaywall(); });
    return;
  }

  var label = err && err.code === 'TIMEOUT'
    ? 'Taking longer than expected.'
    : 'Couldn\'t reach the AI.';
  setStatus('<div class="exp__strip">'
    + '<span>' + label + '</span>'
    + (s.retries < MAX_RETRIES ? '<button class="exp__strip-btn" id="exp-retry">Retry</button>' : '')
    + '</div>');
  wireRetry();
}

function wireRetry() {
  var btn = el('exp-retry');
  if (btn) {
    btn.addEventListener('click', function () {
      if (!sheetState) return;
      sheetState.retries++;
      startFetch(false);
    });
  }
}

function startFetch(isReverify) {
  var s = sheetState;
  if (!s) return;

  // Reset the AI slots to loading; the card tops never move.
  for (var i = 0; i < s.questions.length; i++) {
    var locked = !s.assumePremium && i > 0 && !isReverify;
    setSlot(i, locked ? renderLockedFiller() : renderDeeperLoading());
  }
  setStatus('');
  if (!isReverify) setTail('');

  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  s.controller = controller;
  var timer = setTimeout(function () {
    if (controller) controller.abort();
  }, TIMEOUT_MS);

  var mySeq = ++s.fetchSeq;

  explainAnswers(
    { questions: s.questions, userAnswers: s.userAnswers, eraName: s.eraName, adventureName: s.adventureName },
    { signal: controller && controller.signal }
  ).then(function (out) {
    clearTimeout(timer);
    if (!sheetState || sheetState.fetchSeq !== mySeq) return;
    applyResponse(out);
  }).catch(function (err) {
    clearTimeout(timer);
    if (!sheetState || sheetState.fetchSeq !== mySeq) return;
    if (err && err.name === 'AbortError') err = { code: 'TIMEOUT' };
    applyError(err);
  });
}

/**
 * Open the sheet.
 *
 * @param {object} opts
 * @param {Array}  opts.questions     raw content questions, in quiz order
 * @param {Array}  opts.userAnswers   chosen answer indices, same order
 * @param {string} opts.eraName
 * @param {string} [opts.adventureName]
 * @param {Function} [opts.onAsk]     opens chat; rendered as the trailing
 *                                    pill in full mode only, because chat
 *                                    403s non-subscribers server-side
 */
export function openExplanations(opts) {
  closeExplanations();

  // The ONLY use of the cached flag: choosing which skeleton shows for the
  // second or two before the server answers. Everything after renders from
  // the response's mode.
  var assumePremium = isPremium();

  sheetState = {
    questions: opts.questions,
    userAnswers: opts.userAnswers,
    eraName: opts.eraName,
    adventureName: opts.adventureName,
    onAsk: opts.onAsk,
    assumePremium: assumePremium,
    retries: 0,
    fetchSeq: 0,
    controller: null,
    lastResponse: null,
    onPremiumChanged: null,
  };

  document.body.insertAdjacentHTML('beforeend', renderSheet(opts.questions, opts.userAnswers, assumePremium));

  requestAnimationFrame(function () {
    var sheet = el('exp-sheet');
    if (sheet) sheet.classList.add('exp-sheet--open');
  });

  el('exp-close').addEventListener('click', closeExplanations);
  el('exp-scrim').addEventListener('click', closeExplanations);

  // An in-sheet upgrade fires this; refetching turns the locked cards real.
  var onPremiumChanged = function () {
    if (!sheetState) return;
    sheetState.retries = 0;
    startFetch(true);
  };
  sheetState.onPremiumChanged = onPremiumChanged;
  window.addEventListener('archives:premium-changed', onPremiumChanged);

  startFetch(false);
}

export function closeExplanations() {
  if (sheetState) {
    if (sheetState.controller) {
      try { sheetState.controller.abort(); } catch (e) { /* already done */ }
    }
    if (sheetState.onPremiumChanged) {
      window.removeEventListener('archives:premium-changed', sheetState.onPremiumChanged);
    }
  }
  var sheet = el('exp-sheet');
  if (sheet) {
    sheet.classList.remove('exp-sheet--open');
    sheet.addEventListener('transitionend', function () { sheet.remove(); }, { once: true });
    setTimeout(function () { if (sheet.parentNode) sheet.remove(); }, 400);
  }
  sheetState = null;
}
