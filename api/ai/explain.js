import { requireUser } from '../_lib/auth.js';
import { handler, json, methodNotAllowed } from '../_lib/http.js';
import { buildExplainPrompt } from '../_lib/prompts.js';
import { parseExplanations } from '../_lib/explain-parse.js';
import { consumeQuota, FREE_EXPLAIN_PER_MONTH } from '../_lib/quota.js';
import { isConfigured, rcSubscriber, activeEntitlement } from '../_lib/revenuecat.js';
import { UpstreamError } from '../_lib/supabase.js';

// A key of its own, falling back to the shared one: if explain traffic ever
// burns a quota, it burns explain, not paying subscribers' chat.
const GEMINI_KEY = process.env.GEMINI_EXPLAIN_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_QUESTIONS = 10;
// Abort before Vercel's 30s cap (vercel.json raises api/ai/* for this route)
// so the client gets a distinct TIMEOUT rather than a platform-shaped 504.
const UPSTREAM_TIMEOUT_MS = 20000;

const clamp = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

/**
 * Validate and normalise the request into the prompt's question shape.
 * Returns { questions, eraName, adventureName } or null when malformed.
 *
 * The request mirrors what the mobile app already sends its backend
 * (questions with answers[] + userAnswers[] of indices), so a future
 * convergence does not need a second shape.
 */
function sanitize(body) {
  const rawQuestions = Array.isArray(body?.questions) ? body.questions : null;
  const rawAnswers = Array.isArray(body?.userAnswers) ? body.userAnswers : null;
  if (!rawQuestions || !rawAnswers) return null;
  if (rawQuestions.length === 0 || rawQuestions.length > MAX_QUESTIONS) return null;
  if (rawAnswers.length !== rawQuestions.length) return null;

  const questions = [];
  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i];
    const answers = Array.isArray(q?.answers) ? q.answers : [];
    const correctIdx = answers.findIndex((a) => a?.is_correct === true);
    const userIdx = rawAnswers[i];
    if (!q?.question_text || correctIdx === -1) return null;
    if (!Number.isInteger(userIdx) || userIdx < 0 || userIdx >= answers.length) return null;

    questions.push({
      questionText: clamp(q.question_text, 500),
      userAnswer: clamp(answers[userIdx]?.text, 300),
      correctAnswer: clamp(answers[correctIdx]?.text, 300),
      isCorrect: userIdx === correctIdx,
      lessonNote: clamp(q.explanation, 1000),
    });
  }
  return {
    questions,
    eraName: clamp(body.eraName, 200),
    adventureName: clamp(body.adventureName, 300),
  };
}

// POST /api/ai/explain
//
// "Understand your answers", server-enforced. An entitled user gets an AI
// explanation per question; a free user gets question 1 only, as a preview.
// The preview is enforced by WHAT THE SERVER GENERATES - the locked
// questions' explanations are never produced, never billed, never in the
// DOM - not by hiding text in the client.
//
// Response: { explanations: [{explanation}|null, ...], mode: 'full'|'preview',
//             unlockedCount, lockedCount, entitlementUnknown?, degraded? }
// `mode` is load-bearing: the client renders from it, never from its own
// cached premium flag.
export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['POST'])) return;

  if (!GEMINI_KEY) {
    console.error('GEMINI_API_KEY is not set');
    return json(res, 503, { error: 'Not configured' });
  }

  const userId = await requireUser(req);

  const input = sanitize(req.body);
  if (!input) {
    return json(res, 400, { error: 'questions[] with answers and matching userAnswers[] are required' });
  }

  // Entitlement decides the batch size, so it cannot be parallelised away.
  // Unlike chat, an outage here does NOT fail closed to an error: a possible
  // subscriber gets the preview plus entitlementUnknown, and the client shows
  // "couldn't verify" instead of an upsell. decideStatus() in the client
  // encodes the same house rule: a failed check is never evidence of free.
  let entitled = false;
  let entitlementUnknown = false;
  if (!isConfigured()) {
    console.error('REVENUECAT_V1_API_KEY is not set; serving preview');
    entitlementUnknown = true;
  } else {
    try {
      entitled = Boolean(activeEntitlement(await rcSubscriber(userId)));
    } catch (err) {
      if (err instanceof UpstreamError) {
        console.error('entitlement check failed:', err.message);
        entitlementUnknown = true;
      } else {
        throw err;
      }
    }
  }

  // Free users spend their monthly allowance; the spend happens before the
  // model call (atomic, no race) and fails open if metering is down.
  let quotaDegraded = false;
  if (!entitled) {
    const quota = await consumeQuota({
      userId,
      feature: 'explain',
      limit: FREE_EXPLAIN_PER_MONTH,
    });
    quotaDegraded = quota.degraded === true;
    if (!quota.allowed) {
      return json(res, 429, {
        error: 'Monthly free explanations used up',
        code: 'QUOTA_EXHAUSTED',
        limit: FREE_EXPLAIN_PER_MONTH,
      });
    }
  }

  // The entitlement boundary: what goes IN the prompt.
  const asked = entitled ? input.questions : input.questions.slice(0, 1);
  const prompt = buildExplainPrompt(asked, {
    eraName: input.eraName,
    adventureName: input.adventureName,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(GEMINI_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 3072,
          // Latency-critical (a sheet is open and shimmering); chat thinks
          // with 2048, this gets a quarter of that.
          thinkingConfig: { thinkingBudget: 512 },
          // The single biggest reliability win over the mobile call: no
          // fences, no preamble, at the source.
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { explanation: { type: 'STRING' } },
              required: ['explanation'],
            },
          },
        },
      }),
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      return json(res, 504, { error: 'The explanation took too long', code: 'TIMEOUT' });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    // Never echo the upstream body: it can contain the key in an error URL.
    console.error('Gemini error', resp.status, (await resp.text().catch(() => '')).slice(0, 300));
    return json(res, 502, { error: 'Explanations are unavailable right now.' });
  }

  const data = await resp.json();
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text)
    .join('\n');

  const explanations = parseExplanations(text, asked.length);
  const degraded = explanations.every((e) => e === null) || undefined;

  return json(res, 200, {
    explanations,
    mode: entitled ? 'full' : 'preview',
    unlockedCount: asked.length,
    lockedCount: input.questions.length - asked.length,
    ...(entitlementUnknown ? { entitlementUnknown: true } : {}),
    ...(degraded || quotaDegraded ? { degraded: true } : {}),
  });
});
