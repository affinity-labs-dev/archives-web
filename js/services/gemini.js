// "Chat to Learn More" client.
//
// This used to call Google directly, which meant the Gemini API key had to be
// in the page: it was hardcoded here as a fallback and appended to the request
// URL, so anyone who opened the site could lift it and spend real money on the
// account. The key now exists only in the /api/ai/chat function's environment,
// as does the system prompt.
//
// chatToLearn() keeps its signature, so js/components/chat.js needs no changes
// beyond nicer error text.

import { getClerk } from '../auth.js';

/** Carries a code so the chat UI can distinguish "not subscribed" from a fault. */
export class ChatError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ChatError';
    this.code = code;
  }
}

async function sessionToken() {
  const clerk = getClerk();
  if (!clerk || !clerk.session) return null;
  return clerk.session.getToken();
}

/**
 * Send a chat message and get the reply.
 *
 * @param {object} ctx - { eraName, moduleTitle, moduleSummary, incorrectQuestions[] }
 * @param {Array} messages - conversation history [{ role: 'user'|'ai'|'model', text }]
 * @returns {Promise<string>} the assistant's reply
 */
export async function chatToLearn(ctx, messages) {
  const token = await sessionToken();
  if (!token) {
    throw new ChatError('Please sign in again to keep chatting.', 'NO_SESSION');
  }

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ context: ctx, messages }),
  });

  if (res.status === 403) {
    throw new ChatError('Chat to Learn More is part of Premium.', 'NOT_SUBSCRIBED');
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.error || '';
    } catch (e) { /* error body was not JSON */ }
    throw new ChatError(detail || 'The assistant is unavailable right now.', 'REQUEST_FAILED');
  }

  const data = await res.json();
  return data.text || '';
}
