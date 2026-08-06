import { requireUser } from '../_lib/auth.js';
import { handler, json, methodNotAllowed } from '../_lib/http.js';
import { SYSTEM_PROMPT, buildContext } from '../_lib/prompts.js';
import { isConfigured, rcSubscriber, activeEntitlement } from '../_lib/revenuecat.js';
import { UpstreamError } from '../_lib/supabase.js';

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Enough for a lesson recap plus a conversation, without letting a caller push
// an unbounded prompt through a metered API on someone else's bill.
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4000;
const MAX_SUMMARY_CHARS = 4000;

function clampString(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

/** Normalises the client's context object; everything is optional. */
function sanitizeContext(raw) {
  const ctx = raw && typeof raw === 'object' ? raw : {};
  const incorrect = Array.isArray(ctx.incorrectQuestions)
    ? ctx.incorrectQuestions.slice(0, 20).map((q) => ({
        question: clampString(q?.question, 500),
        userAnswer: clampString(q?.userAnswer, 300),
        correctAnswer: clampString(q?.correctAnswer, 300),
      }))
    : [];

  return {
    eraName: clampString(ctx.eraName, 200),
    moduleTitle: clampString(ctx.moduleTitle, 300),
    moduleSummary: clampString(ctx.moduleSummary, MAX_SUMMARY_CHARS),
    incorrectQuestions: incorrect,
  };
}

// POST /api/ai/chat
//
// Replaces the browser calling Gemini directly. The key used to be hardcoded in
// js/services/gemini.js and sent in a URL query string, so anyone who opened
// the site could lift it and spend real money on the account. It now lives only
// in this function's environment.
//
// "Chat to Learn More" is a premium feature, but that was enforced with a
// client-side isPremium() check that anyone could skip. Because this endpoint
// costs money per call, the entitlement is checked server-side here.
export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['POST'])) return;

  if (!GEMINI_KEY) {
    console.error('GEMINI_API_KEY is not set');
    return json(res, 503, { error: 'Not configured' });
  }

  const userId = await requireUser(req);

  // Entitlement gate. Fails closed on an outage rather than handing out free
  // model calls, but says so distinctly enough to debug.
  if (!isConfigured()) {
    console.error('REVENUECAT_V1_API_KEY is not set');
    return json(res, 503, { error: 'Not configured' });
  }
  let entitled = false;
  try {
    entitled = Boolean(activeEntitlement(await rcSubscriber(userId)));
  } catch (err) {
    if (err instanceof UpstreamError) {
      console.error('entitlement check failed:', err.message);
      return json(res, 503, { error: 'Could not verify subscription' });
    }
    throw err;
  }
  if (!entitled) {
    return json(res, 403, { error: 'Premium required', code: 'NOT_SUBSCRIBED' });
  }

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : null;
  if (!messages || messages.length === 0) {
    return json(res, 400, { error: 'messages[] is required' });
  }
  if (messages.length > MAX_MESSAGES) {
    return json(res, 400, { error: `At most ${MAX_MESSAGES} messages` });
  }

  const contents = messages.map((m) => ({
    role: m?.role === 'ai' || m?.role === 'model' ? 'model' : 'user',
    parts: [{ text: clampString(m?.text, MAX_MESSAGE_CHARS) }],
  }));

  const systemPrompt = `${SYSTEM_PROMPT}\n\n${buildContext(sanitizeContext(req.body?.context))}`;

  const resp = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(GEMINI_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 1.0,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 2048 },
      },
    }),
  });

  if (!resp.ok) {
    // Never echo the upstream body: it can contain the key in an error URL.
    console.error('Gemini error', resp.status, (await resp.text().catch(() => '')).slice(0, 300));
    return json(res, 502, { error: 'The assistant is unavailable right now.' });
  }

  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    console.error('unexpected Gemini response shape');
    return json(res, 502, { error: 'The assistant is unavailable right now.' });
  }

  // Drop thinking parts; return only prose, as the client did.
  const text = parts
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text)
    .join('\n');

  json(res, 200, { text });
});
