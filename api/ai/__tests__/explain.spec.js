import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The route's job is deciding what the model is ASKED, so most of these pin
// the prompt that leaves the building: a free user's locked questions must
// never be in it. The rest pin the failure contract - which errors fail
// closed, which degrade to preview, and that no upstream body (which can
// carry the API key in an error URL) ever reaches the client.

const requireUser = vi.fn();
const rcSubscriber = vi.fn();
const isConfigured = vi.fn();
const consumeQuota = vi.fn();

vi.mock('../../_lib/auth.js', async () => {
  const actual = await vi.importActual('../../_lib/auth.js');
  return { ...actual, requireUser: (req) => requireUser(req) };
});
vi.mock('../../_lib/revenuecat.js', async () => {
  const actual = await vi.importActual('../../_lib/revenuecat.js');
  return {
    ...actual,
    isConfigured: () => isConfigured(),
    rcSubscriber: (id) => rcSubscriber(id),
    // activeEntitlement stays real: it is pure and its shape-parsing is part
    // of what the entitled path exercises.
  };
});
vi.mock('../../_lib/quota.js', async () => {
  const actual = await vi.importActual('../../_lib/quota.js');
  return { ...actual, consumeQuota: (args) => consumeQuota(args) };
});

const FAKE_KEY = 'AIzaFAKEKEYFAKEKEYFAKEKEYFAKEKEYFAKEKE';
process.env.GEMINI_API_KEY = FAKE_KEY;
process.env.REVENUECAT_V1_API_KEY = 'sk_test_dummy';

const { default: route } = await import('../explain.js');

const USER = 'user_2abcDEF';

// What rcSubscriber resolves to: the subscriber object itself, already
// unwrapped from RevenueCat's {subscriber: ...} envelope.
const ENTITLED = {
  entitlements: { premium: { expires_date: '2999-01-01T00:00:00Z' } },
};
const FREE = { entitlements: {} };

const QUESTIONS = [1, 2, 3].map((n) => ({
  question_text: `Question ${n}?`,
  explanation: `Note ${n}.`,
  answers: [
    { text: `Right ${n}`, is_correct: true },
    { text: `Wrong ${n}`, is_correct: false },
  ],
}));
const BODY = {
  questions: QUESTIONS,
  userAnswers: [0, 1, 0],
  eraName: 'Al Andalus',
  adventureName: 'The Rise',
};

const geminiReply = (explanations) => ({
  ok: true,
  json: async () => ({
    candidates: [
      { content: { parts: [{ text: JSON.stringify(explanations.map((e) => ({ explanation: e }))) }] } },
    ],
  }),
});

function makeRes() {
  return {
    statusCode: 0,
    headers: {},
    body: undefined,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
}
const parsed = (res) => JSON.parse(res.body);

/** The prompt of the (only) Gemini call this test made. */
const sentPrompt = () => {
  const call = global.fetch.mock.calls.find(([url]) => String(url).includes('generativelanguage'));
  return JSON.parse(call[1].body).contents[0].parts[0].text;
};

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue(USER);
  isConfigured.mockReset().mockReturnValue(true);
  rcSubscriber.mockReset().mockResolvedValue(FREE);
  consumeQuota.mockReset().mockResolvedValue({ allowed: true, used: 1 });
  global.fetch = vi.fn().mockResolvedValue(geminiReply(['One.', 'Two.', 'Three.']));
});
afterEach(() => {
  delete global.fetch;
});

describe('POST /api/ai/explain', () => {
  it('rejects anything but POST, without calling the model', async () => {
    const res = makeRes();
    await route({ method: 'GET', headers: {}, body: {} }, res);
    expect(res.statusCode).toBe(405);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects malformed bodies before spending anything', async () => {
    const bad = [
      {},
      { questions: [], userAnswers: [] },
      { questions: QUESTIONS, userAnswers: [0, 1] },       // length mismatch
      { questions: QUESTIONS, userAnswers: [0, 1, 99] },   // index out of range
      { questions: [{ question_text: 'Q?', answers: [{ text: 'A' }] }], userAnswers: [0] }, // no correct answer
    ];
    for (const body of bad) {
      const res = makeRes();
      await route({ method: 'POST', headers: {}, body }, res);
      expect(res.statusCode, JSON.stringify(body).slice(0, 60)).toBe(400);
    }
    expect(global.fetch).not.toHaveBeenCalled();
    expect(consumeQuota).not.toHaveBeenCalled();
  });

  it('gives a subscriber the full batch', async () => {
    rcSubscriber.mockResolvedValue(ENTITLED);
    const res = makeRes();
    await route({ method: 'POST', headers: {}, body: BODY }, res);

    expect(res.statusCode).toBe(200);
    const out = parsed(res);
    expect(out.mode).toBe('full');
    expect(out.unlockedCount).toBe(3);
    expect(out.lockedCount).toBe(0);
    expect(out.explanations).toHaveLength(3);
    expect(sentPrompt()).toContain('Q3');
    // Subscribers are not metered.
    expect(consumeQuota).not.toHaveBeenCalled();
  });

  it('gives a free user question 1 only - enforced in the prompt itself', async () => {
    const res = makeRes();
    await route({ method: 'POST', headers: {}, body: BODY }, res);

    expect(res.statusCode).toBe(200);
    const out = parsed(res);
    expect(out.mode).toBe('preview');
    expect(out.unlockedCount).toBe(1);
    expect(out.lockedCount).toBe(2);
    expect(out.explanations).toHaveLength(1);

    const prompt = sentPrompt();
    expect(prompt).toContain('Q1: Question 1?');
    // The lock is server-side generation, not client-side CSS: the locked
    // questions never reach the model, so their explanations cannot exist.
    expect(prompt).not.toContain('Question 2?');
    expect(prompt).not.toContain('Question 3?');
  });

  it('meters free users and refuses an exhausted allowance without a model call', async () => {
    consumeQuota.mockResolvedValue({ allowed: false, used: 10 });
    const res = makeRes();
    await route({ method: 'POST', headers: {}, body: BODY }, res);

    expect(res.statusCode).toBe(429);
    expect(parsed(res).code).toBe('QUOTA_EXHAUSTED');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('degrades to preview + entitlementUnknown when RevenueCat is down - NOT a 503', async () => {
    // The branch most likely to be "fixed" by a future reader into an error.
    // Chat fails closed because a wrong yes costs money per message; here a
    // wrong no shows a subscriber an upsell, which is worse than one preview
    // explanation. decideStatus() client-side encodes the same house rule.
    const { UpstreamError } = await import('../../_lib/supabase.js');
    rcSubscriber.mockRejectedValue(new UpstreamError('rc 500'));

    const res = makeRes();
    await route({ method: 'POST', headers: {}, body: BODY }, res);

    expect(res.statusCode).toBe(200);
    const out = parsed(res);
    expect(out.mode).toBe('preview');
    expect(out.entitlementUnknown).toBe(true);
  });

  it('serves preview + entitlementUnknown when RevenueCat is unconfigured', async () => {
    isConfigured.mockReturnValue(false);
    const res = makeRes();
    await route({ method: 'POST', headers: {}, body: BODY }, res);
    expect(res.statusCode).toBe(200);
    expect(parsed(res).entitlementUnknown).toBe(true);
    expect(rcSubscriber).not.toHaveBeenCalled();
  });

  it('turns a Gemini failure into a 502 that never echoes the upstream body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => `error at https://generativelanguage.googleapis.com/?key=${FAKE_KEY}`,
    });
    const res = makeRes();
    await route({ method: 'POST', headers: {}, body: BODY }, res);

    expect(res.statusCode).toBe(502);
    expect(res.body).not.toContain(FAKE_KEY);
  });

  it('turns an upstream abort into a 504 TIMEOUT', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    global.fetch = vi.fn().mockRejectedValue(abort);

    const res = makeRes();
    await route({ method: 'POST', headers: {}, body: BODY }, res);
    expect(res.statusCode).toBe(504);
    expect(parsed(res).code).toBe('TIMEOUT');
  });

  it('marks a fully unparseable model reply degraded instead of failing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'I cannot answer in JSON.' }] } }],
      }),
    });
    const res = makeRes();
    await route({ method: 'POST', headers: {}, body: BODY }, res);

    expect(res.statusCode).toBe(200);
    const out = parsed(res);
    expect(out.degraded).toBe(true);
    expect(out.explanations.every((e) => e === null)).toBe(true);
  });

  it('carries the lesson note into the prompt', async () => {
    const res = makeRes();
    await route({ method: 'POST', headers: {}, body: BODY }, res);
    expect(res.statusCode).toBe(200);
    expect(sentPrompt()).toContain('LESSON NOTE (already shown to the user, do NOT repeat or paraphrase it): Note 1.');
  });
});
