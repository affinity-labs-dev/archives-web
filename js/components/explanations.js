// The "Understand your answers" sheet.
//
// Useful at t=0, before any network: it opens with one card per question -
// the verdict, both answers, and the AUTHORED lesson explanation, which is
// the reviewed content and therefore the typographic lead. The AI's
// "going deeper" text arrives as a clearly-labelled addition beneath it,
// never above it: fluent unvetted prose must not outrank vetted prose in a
// children's education product.
//
// Rules that must survive refactors (each earned by a real defect):
//
// 1. After the first response, EVERYTHING renders from the server's mode -
//    the cached isPremium() picks the initial skeleton and nothing else.
//    The first version recomputed locks from the cached flag on retry and
//    re-locked paying subscribers after one network error.
// 2. Reopening reuses the response already fetched for this quiz attempt.
//    The first version refetched on every open - a metered model call spent
//    on text the client already held.
// 3. openExplanations() removes any existing sheet SYNCHRONOUSLY. The first
//    version let the closing sheet linger 400ms while inserting a new one
//    with the same ids; every lookup then bound to the dying node and the
//    new sheet stayed invisible while intercepting every click.
// 4. The sheet is a real dialog: focus moves in, Tab cycles inside it,
//    Escape closes it, focus returns to the opener, the page behind is
//    scroll-locked. It sits over the celebration, whose CTA must not remain
//    legible through the scrim.

import { explainAnswers } from '../services/gemini.js';
import { isPremium } from '../services/revenuecat.js';
import { showPaywall } from './paywall.js';
import { escapeHtml } from '../utils.js';
import { prefersReducedMotion } from '../animations.js';

var sheetState = null;

var TIMEOUT_MS = 15000;
var MAX_RETRIES = 2;

function verdictFor(question, userIdx) {
  var answers = Array.isArray(question.answers) ? question.answers : [];
  var correctIdx = answers.findIndex(function (a) { return a && a.is_correct; });
  var answered = Number.isInteger(userIdx) && userIdx >= 0 && userIdx < answers.length;
  return {
    // Malformed content (no flagged correct answer) or a missing user index
    // must never render as a blank "correct": it becomes an explicit
    // unknown, with the texts it can honestly show.
    known: correctIdx !== -1 && answered,
    isCorrect: answered && userIdx === correctIdx,
    userText: answered ? (answers[userIdx].text || '') : '',
    correctText: correctIdx !== -1 ? (answers[correctIdx].text || '') : '',
  };
}

/** The instant part of a card: everything the client already knows. */
function renderCardTop(question, userIdx, number) {
  var v = verdictFor(question, userIdx);
  var pip;
  var answerLine;
  if (!v.known) {
    pip = '<span class="exp__pip exp__pip--unknown" aria-label="No answer recorded">–</span>';
    answerLine = v.correctText
      ? 'Correct answer: <strong>' + escapeHtml(v.correctText) + '</strong>'
      : 'No answer recorded';
  } else if (v.isCorrect) {
    pip = '<span class="exp__pip exp__pip--right" aria-label="Correct">✓</span>';
    answerLine = 'You answered: <strong>' + escapeHtml(v.correctText) + '</strong>';
  } else {
    pip = '<span class="exp__pip exp__pip--wrong" aria-label="Incorrect">✗</span>';
    answerLine = 'Your answer: <strong>' + escapeHtml(v.userText) + '</strong> · Correct: <strong>' + escapeHtml(v.correctText) + '</strong>';
  }

  // The authored explanation is the reviewed content: full size, full
  // opacity, amber-marked. It leads.
  var lesson = question.explanation
    ? '<div class="exp__lesson"><div class="exp__lesson-label">From the lesson</div>' + escapeHtml(question.explanation) + '</div>'
    : '';

  return '<div class="exp__card-head">' + pip
    + '<div class="exp__card-q"><div class="exp__card-number">Question ' + number + '</div>'
    + '<div class="exp__card-text">' + escapeHtml(question.question_text || '') + '</div>'
    + '<div class="exp__card-answers">' + answerLine + '</div></div></div>'
    + lesson;
}

/** The AI slot of an unlocked card, in its loading state. */
function renderDeeperLoading() {
  return '<div class="exp__deeper exp__deeper--loading">'
    + '<div class="exp__deeper-label">Going deeper<span class="exp__ai-tag">AI</span></div>'
    + '<div class="exp__shimmer" style="width:92%"></div>'
    + '<div class="exp__shimmer" style="width:84%"></div>'
    + '<div class="exp__shimmer" style="width:61%"></div>'
    + '</div>';
}

/**
 * A locked card's filler: synthetic bars behind a fade. Nothing to reveal -
 * the text does not exist on this side of the paywall.
 */
function renderLockedFiller() {
  return '<div class="exp__deeper exp__deeper--locked" aria-hidden="true">'
    + '<div class="exp__filler" style="width:95%"></div>'
    + '<div class="exp__filler" style="width:88%"></div>'
    + '<div class="exp__filler" style="width:72%"></div>'
    + '</div>';
}

function renderSheet(questions, userAnswers, assumePremium) {
  var cards = questions.map(function (q, i) {
    var locked = !assumePremium && i > 0;
    var v = verdictFor(q, userAnswers[i]);
    // Wrong answers are the reason this sheet exists; their cards carry the
    // accent so the eye lands on what needs re-learning.
    var mod = v.known && !v.isCorrect ? ' exp__card--wrong' : '';
    return '<div class="exp__card' + mod + '" data-q="' + i + '">'
      + renderCardTop(q, userAnswers[i], i + 1)
      + '<div class="exp__slot" data-slot="' + i + '">'
      + (locked ? renderLockedFiller() : renderDeeperLoading())
      + '</div>'
      + '</div>';
  }).join('');

  return '<div class="exp-sheet" id="exp-sheet" role="dialog" aria-modal="true" aria-label="Understand your answers">'
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
    + '<div class="exp__status" id="exp-status" role="status" aria-live="polite"></div>'
    + cards
    + '<div class="exp__tail" id="exp-tail" aria-live="polite"></div>'
    + '<div class="exp__foot">The lesson notes are written and reviewed by Archives. "Going deeper" is AI-written context and can be imperfect.</div>'
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

/** Locked state per card index, derived from the truth we have. Before any
 * response that is the cached flag (skeleton only); after a response it is
 * ONLY the server's verdict. */
function isLocked(i) {
  var s = sheetState;
  if (!s) return false;
  if (s.lastResponse) return i >= s.lastResponse.unlockedCount;
  return !s.assumePremium && i > 0;
}

/** Normalise a server response; null when the shape is unusable. */
function normalizeResponse(out, questionCount) {
  if (!out || (out.mode !== 'full' && out.mode !== 'preview')) return null;
  var unlocked = Number.isInteger(out.unlockedCount)
    ? Math.max(0, Math.min(out.unlockedCount, questionCount))
    : (out.mode === 'full' ? questionCount : 1);
  return {
    explanations: Array.isArray(out.explanations) ? out.explanations : [],
    mode: out.mode,
    unlockedCount: unlocked,
    lockedCount: questionCount - unlocked,
    entitlementUnknown: out.entitlementUnknown === true,
    degraded: out.degraded === true,
  };
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
        setSlot(i, '<div class="exp__deeper"><div class="exp__deeper-label">Going deeper<span class="exp__ai-tag">AI</span></div>'
          + '<div class="exp__deeper-text">' + escapeHtml(e.explanation) + '</div></div>');
      } else {
        setSlot(i, '<div class="exp__deeper exp__deeper--failed">'
          + '<span>Couldn\'t go deeper on this one. The lesson note above is complete.</span>'
          + '</div>');
      }
    } else {
      setSlot(i, renderLockedFiller());
    }
  }

  if (out.mode === 'preview' && n > out.unlockedCount) {
    var locked = n - out.unlockedCount;
    if (out.entitlementUnknown) {
      setTail('<div class="exp__promo exp__promo--neutral">'
        + '<div class="exp__promo-title">Couldn\'t verify your subscription</div>'
        + '<div class="exp__promo-sub">' + locked + ' more AI explanation' + (locked === 1 ? '' : 's') + ' waiting.</div>'
        + '<button class="exp__promo-btn" id="exp-reverify">Try again</button>'
        + '</div>');
      var reverify = el('exp-reverify');
      if (reverify) reverify.addEventListener('click', function () {
        if (sheetState && sheetState.inFlight) return;
        startFetch(true);
      });
    } else {
      // Honest copy: the corrections and lesson notes above are already
      // free; what Premium adds is the AI expansion on the locked cards.
      setTail('<div class="exp__promo">'
        + '<div class="exp__promo-title">Go deeper on ' + (locked === 1 ? 'the other question' : 'all ' + n + ' questions') + '</div>'
        + '<div class="exp__promo-sub">Premium adds the AI context for ' + locked + ' more answer' + (locked === 1 ? '' : 's') + '.</div>'
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
  } else {
    setTail('');
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

  // The authored content stays; only the AI slots change. Locks come from
  // isLocked(), which prefers the last server verdict over any cached flag.
  for (var i = 0; i < s.questions.length; i++) {
    setSlot(i, isLocked(i)
      ? renderLockedFiller()
      : '<div class="exp__deeper exp__deeper--failed"><span>Couldn\'t load the deeper explanation.</span></div>');
  }

  if (err && err.code === 'QUOTA_EXHAUSTED') {
    setStatus('');
    setTail('<div class="exp__promo">'
      + '<div class="exp__promo-title">You\'ve used this month\'s free AI explanations</div>'
      + '<div class="exp__promo-sub">The lesson notes above stay free. Premium removes the AI limit.</div>'
      + '<button class="exp__promo-btn" id="exp-upgrade">Upgrade</button>'
      + '</div>');
    var upgrade = el('exp-upgrade');
    if (upgrade) upgrade.addEventListener('click', function () { showPaywall(); });
    return;
  }

  var label = err && err.code === 'TIMEOUT'
    ? 'Taking longer than expected.'
    : 'Couldn\'t reach the AI.';
  if (s.retries < MAX_RETRIES) {
    setStatus('<div class="exp__strip">'
      + '<span>' + label + '</span>'
      + '<button class="exp__strip-btn" id="exp-retry">Retry</button>'
      + '</div>');
    wireRetry();
  } else {
    // Terminal, but not a dead end: say what still works.
    setStatus('<div class="exp__strip exp__strip--final">'
      + '<span>The AI isn\'t reachable right now. Your lesson notes above are complete - try again from your next quiz.</span>'
      + '</div>');
  }
}

function wireRetry() {
  var btn = el('exp-retry');
  if (btn) {
    btn.addEventListener('click', function () {
      if (!sheetState || sheetState.inFlight) return;
      sheetState.retries++;
      startFetch(false);
    });
  }
}

function startFetch(isReverify) {
  var s = sheetState;
  if (!s || s.inFlight) return;
  s.inFlight = true;

  // Abort any straggler before starting anew.
  if (s.controller) {
    try { s.controller.abort(); } catch (e) { /* already done */ }
  }

  // Reset the AI slots to loading; the card tops never move. Locks derive
  // from the last verdict when there is one.
  for (var i = 0; i < s.questions.length; i++) {
    var locked = isReverify ? false : isLocked(i);
    setSlot(i, locked ? renderLockedFiller() : renderDeeperLoading());
  }
  setStatus('');
  if (!isReverify) setTail('');

  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  s.controller = controller;
  var mySeq = ++s.fetchSeq;

  // The timer must reach applyError even where AbortController does not
  // exist - otherwise the sheet shimmers forever on old WebViews.
  var timer = setTimeout(function () {
    if (controller) { controller.abort(); return; }
    if (!sheetState || sheetState.fetchSeq !== mySeq) return;
    sheetState.inFlight = false;
    applyError({ code: 'TIMEOUT' });
  }, TIMEOUT_MS);

  explainAnswers(
    { questions: s.questions, userAnswers: s.userAnswers, eraName: s.eraName, adventureName: s.adventureName },
    { signal: controller && controller.signal }
  ).then(function (out) {
    clearTimeout(timer);
    if (!sheetState || sheetState.fetchSeq !== mySeq) return;
    sheetState.inFlight = false;
    var normalized = normalizeResponse(out, s.questions.length);
    if (!normalized) {
      applyError({ code: 'REQUEST_FAILED' });
      return;
    }
    applyResponse(normalized);
  }).catch(function (err) {
    clearTimeout(timer);
    if (!sheetState || sheetState.fetchSeq !== mySeq) return;
    sheetState.inFlight = false;
    if (err && err.name === 'AbortError') err = { code: 'TIMEOUT' };
    applyError(err);
  });
}

/** Focusable elements currently inside the sheet. */
function focusables() {
  var sheet = el('exp-sheet');
  if (!sheet) return [];
  return [...sheet.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')]
    .filter(function (n) { return n.offsetParent !== null; });
}

function onKeydown(e) {
  if (!sheetState) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeExplanations();
    return;
  }
  if (e.key === 'Tab') {
    var items = focusables();
    if (items.length === 0) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!el('exp-sheet').contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  }
}

/**
 * Open the sheet.
 *
 * @param {object} opts
 * @param {Array}  opts.questions     raw content questions, in quiz order
 * @param {Array}  opts.userAnswers   chosen answer indices, same order
 * @param {string} opts.eraName
 * @param {string} [opts.adventureName]
 * @param {Function} [opts.onAsk]     opens chat; rendered in full mode only
 */
export function openExplanations(opts) {
  // Synchronous teardown of ANY existing sheet - see rule 3 in the header.
  var carried = null;
  if (sheetState
      && sheetState.lastResponse
      && sheetState.questions === opts.questions
      && sheetState.userAnswers === opts.userAnswers) {
    // Same quiz attempt: the fetched explanations are still the truth.
    // Reopening must not spend another model call on them - see rule 2.
    carried = sheetState.lastResponse;
  }
  destroySheet();

  var assumePremium = carried ? null : isPremium();

  sheetState = {
    questions: opts.questions,
    userAnswers: opts.userAnswers,
    eraName: opts.eraName,
    adventureName: opts.adventureName,
    onAsk: opts.onAsk,
    assumePremium: carried ? carried.mode === 'full' : assumePremium,
    retries: 0,
    fetchSeq: 0,
    controller: null,
    inFlight: false,
    lastResponse: carried,
    opener: document.activeElement instanceof HTMLElement ? document.activeElement : null,
  };

  document.body.insertAdjacentHTML('beforeend', renderSheet(opts.questions, opts.userAnswers, sheetState.assumePremium));
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKeydown, true);

  if (prefersReducedMotion()) {
    el('exp-sheet').classList.add('exp-sheet--open');
  } else {
    requestAnimationFrame(function () {
      var sheet = el('exp-sheet');
      if (sheet) sheet.classList.add('exp-sheet--open');
    });
  }

  el('exp-close').addEventListener('click', closeExplanations);
  el('exp-scrim').addEventListener('click', closeExplanations);
  el('exp-close').focus();

  // An in-sheet upgrade fires this; refetching turns the locked cards real.
  var onPremiumChanged = function () {
    if (!sheetState || sheetState.inFlight) return;
    sheetState.retries = 0;
    startFetch(true);
  };
  sheetState.onPremiumChanged = onPremiumChanged;
  window.addEventListener('archives:premium-changed', onPremiumChanged);

  if (carried) {
    applyResponse(carried);
  } else {
    startFetch(false);
  }
}

/** Remove the sheet from the DOM immediately, with no transition grace. */
function destroySheet() {
  if (sheetState) {
    if (sheetState.controller) {
      try { sheetState.controller.abort(); } catch (e) { /* already done */ }
    }
    if (sheetState.onPremiumChanged) {
      window.removeEventListener('archives:premium-changed', sheetState.onPremiumChanged);
    }
  }
  document.removeEventListener('keydown', onKeydown, true);
  document.body.style.overflow = '';
  var sheet = el('exp-sheet');
  if (sheet) sheet.remove();
}

export function closeExplanations() {
  var opener = sheetState && sheetState.opener;
  var lastResponse = sheetState && sheetState.lastResponse;
  var questions = sheetState && sheetState.questions;
  var userAnswers = sheetState && sheetState.userAnswers;

  if (sheetState) {
    if (sheetState.controller) {
      try { sheetState.controller.abort(); } catch (e) { /* already done */ }
    }
    if (sheetState.onPremiumChanged) {
      window.removeEventListener('archives:premium-changed', sheetState.onPremiumChanged);
    }
  }
  document.removeEventListener('keydown', onKeydown, true);
  document.body.style.overflow = '';

  var sheet = el('exp-sheet');
  if (sheet) {
    if (prefersReducedMotion()) {
      sheet.remove();
    } else {
      sheet.classList.remove('exp-sheet--open');
      sheet.addEventListener('transitionend', function () { sheet.remove(); }, { once: true });
      setTimeout(function () { if (sheet.parentNode) sheet.remove(); }, 400);
    }
  }

  // Keep the fetched answers around so reopening the same results screen
  // reuses them instead of refetching. Cleared when a new sheet opens for a
  // different attempt, or on navigation via the view's cleanup.
  sheetState = lastResponse
    ? { questions: questions, userAnswers: userAnswers, lastResponse: lastResponse, closed: true }
    : null;

  if (opener && document.contains(opener)) opener.focus();
}
