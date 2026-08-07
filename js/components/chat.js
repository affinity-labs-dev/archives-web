import { chatToLearn } from '../services/gemini.js';
import { escapeHtml } from '../utils.js';
import { prefersReducedMotion } from '../animations.js';

var chatState = null;

function renderMarkdown(text) {
  var html = escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return '<p>' + html + '</p>';
}

function renderChatPanel() {
  return '<div class="chat-panel" id="chat-panel">'
    + '<div class="chat__header">'
    + '<div class="chat__header-title">Chat to Learn</div>'
    + '<div class="chat__header-actions">'
    + '<button class="chat__expand" id="chat-expand" title="Expand">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>'
    + '</button>'
    + '<button class="chat__close" id="chat-close" title="Close">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    + '</button>'
    + '</div>'
    + '</div>'
    + '<div class="chat__messages" id="chat-messages"></div>'
    + '<div class="chat__input-wrap">'
    + '<input type="text" class="chat__input" id="chat-input" placeholder="Ask a question..." autocomplete="off">'
    + '<button class="chat__send" id="chat-send">'
    + '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>'
    + '</button>'
    + '</div>'
    + '</div>';
}

/**
 * The context chip: the visible trace of the hidden priming message. The
 * first user turn is sent to the model but never rendered - without this,
 * the assistant appears to open the conversation psychically, already
 * knowing the quiz score. One muted line keeps the mechanism honest.
 */
function addContextChip(context) {
  var messagesEl = document.getElementById('chat-messages');
  if (!messagesEl) return;
  var parts = [];
  if (context.moduleTitle) parts.push(context.moduleTitle);
  var n = context.questions ? context.questions.length
    : (context.incorrectQuestions ? context.incorrectQuestions.length : 0);
  if (n > 0) parts.push('your quiz answers');
  if (parts.length === 0) return;

  var div = document.createElement('div');
  div.className = 'chat__context-chip';
  div.textContent = 'The assistant can see: ' + parts.join(' · ');
  messagesEl.appendChild(div);
}

function addMessage(role, text) {
  var messagesEl = document.getElementById('chat-messages');
  if (!messagesEl) return;

  var div = document.createElement('div');
  div.className = 'chat__bubble chat__bubble--' + role;
  if (role === 'ai') {
    typewrite(div, text, messagesEl);
  } else {
    div.innerHTML = '<p>' + escapeHtml(text) + '</p>';
  }
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/**
 * Types an assistant reply out, mobile-style, without a timer per character:
 * one rAF loop slices the SOURCE text by elapsed time and re-renders the
 * markdown over the slice - slicing rendered HTML would tear tags apart
 * mid-entity. Clamped so a long reply cannot crawl (a 2000-char answer at
 * mobile's fixed 10ms/char would take 20 seconds), instant under reduced
 * motion, and a click completes it.
 */
function typewrite(div, text, messagesEl) {
  if (prefersReducedMotion() || !text) {
    div.innerHTML = renderMarkdown(text);
    return;
  }

  var msPerChar = Math.max(4, Math.min(10, 3000 / text.length));
  var start = null;
  var raf = 0;
  var done = false;

  function finish() {
    if (done) return;
    done = true;
    if (raf) cancelAnimationFrame(raf);
    div.innerHTML = renderMarkdown(text);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  div.addEventListener('click', finish, { once: true });

  function frame(now) {
    if (done) return;
    if (start === null) start = now;
    var chars = Math.floor((now - start) / msPerChar);
    if (chars >= text.length) {
      finish();
      return;
    }
    div.innerHTML = renderMarkdown(text.slice(0, chars));
    messagesEl.scrollTop = messagesEl.scrollHeight;
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
}

function showTyping() {
  var messagesEl = document.getElementById('chat-messages');
  if (!messagesEl) return null;

  var div = document.createElement('div');
  div.className = 'chat__bubble chat__bubble--ai chat__typing';
  div.id = 'chat-typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function removeTyping() {
  var el = document.getElementById('chat-typing');
  if (el) el.remove();
}

function toggleExpand() {
  var panel = document.getElementById('chat-panel');
  if (!panel) return;

  var isExpanded = panel.classList.toggle('chat-panel--expanded');
  var expandBtn = document.getElementById('chat-expand');
  if (expandBtn) {
    if (isExpanded) {
      // Show collapse icon
      expandBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
      expandBtn.title = 'Collapse';
    } else {
      // Show expand icon
      expandBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
      expandBtn.title = 'Expand';
    }
  }

  // Scroll to bottom after transition
  setTimeout(function() {
    var messagesEl = document.getElementById('chat-messages');
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }, 350);
}

async function sendMessage(text) {
  if (!chatState || !text.trim()) return;

  var userText = text.trim();
  addMessage('user', userText);
  chatState.history.push({ role: 'user', text: userText });

  var input = document.getElementById('chat-input');
  var sendBtn = document.getElementById('chat-send');
  if (input) { input.value = ''; input.disabled = true; }
  if (sendBtn) sendBtn.disabled = true;

  showTyping();

  try {
    var response = await chatToLearn(chatState.context, chatState.history);
    removeTyping();
    addMessage('ai', response);
    chatState.history.push({ role: 'model', text: response });
  } catch (err) {
    removeTyping();
    addMessage('ai', err && err.code ? err.message : 'Sorry, something went wrong. Please try again.');
  }

  if (input) { input.disabled = false; input.focus(); }
  if (sendBtn) sendBtn.disabled = false;
}

/**
 * Open the chat panel with quiz context.
 *
 * @param {object} context - { eraName, moduleTitle, moduleSummary,
 *   incorrectQuestions[], questions[]? } - `questions` is the full
 *   per-question record [{question, userAnswer, correctAnswer, isCorrect}]
 *   that lets the server prompt see right answers too.
 * @param {object} [opts]
 * @param {string} [opts.firstMessage] - the priming message. Sent to the
 *   model as the first user turn but NEVER rendered; the context chip is its
 *   visible trace. The old code pushed it to history and relied on nothing
 *   re-rendering history - the same behaviour, now on purpose and marked.
 */
export function openChat(context, opts) {
  closeChat();

  chatState = {
    context: context,
    history: []
  };

  document.body.insertAdjacentHTML('beforeend', renderChatPanel());

  // Animate in
  requestAnimationFrame(function() {
    var panel = document.getElementById('chat-panel');
    if (panel) panel.classList.add('chat-panel--open');
  });

  // Attach handlers
  document.getElementById('chat-close').addEventListener('click', closeChat);
  document.getElementById('chat-expand').addEventListener('click', toggleExpand);

  var input = document.getElementById('chat-input');
  var sendBtn = document.getElementById('chat-send');

  sendBtn.addEventListener('click', function() {
    sendMessage(input.value);
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });

  addContextChip(context);

  // The hidden first message.
  var firstMessage = (opts && opts.firstMessage) || 'Tell me more about what I just learned.';
  chatState.history.push({ role: 'user', text: firstMessage, hidden: true });
  showTyping();

  chatToLearn(context, chatState.history).then(function(response) {
    removeTyping();
    addMessage('ai', response);
    chatState.history.push({ role: 'model', text: response });
  }).catch(function(err) {
    removeTyping();
    addMessage('ai', err && err.code ? err.message : 'Sorry, something went wrong. Please try again.');
  });
}

export function closeChat() {
  var panel = document.getElementById('chat-panel');
  if (panel) {
    panel.classList.remove('chat-panel--open');
    panel.addEventListener('transitionend', function() { panel.remove(); }, { once: true });
    // Fallback removal if transition doesn't fire
    setTimeout(function() { if (panel.parentNode) panel.remove(); }, 400);
  }
  chatState = null;
}
