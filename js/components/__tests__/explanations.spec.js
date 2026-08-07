import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The sheet's contract, in order of importance:
//
// 1. It is useful at t=0 - authored content renders before any network.
// 2. After the response, everything renders from the server's `mode`; the
//    cached premium flag only ever picked the initial skeleton.
// 3. Locked cards contain synthetic filler, never fetched text.
// 4. Failure degrades the AI slots; the authored cards never disappear.

const explainAnswers = vi.fn();
const isPremium = vi.fn();
const showPaywall = vi.fn();

vi.mock('../../services/gemini.js', () => ({
  explainAnswers: (...a) => explainAnswers(...a),
  ChatError: class ChatError extends Error {
    constructor(message, code) { super(message); this.code = code; }
  },
}));
vi.mock('../../services/revenuecat.js', () => ({
  isPremium: () => isPremium(),
}));
vi.mock('../paywall.js', () => ({
  showPaywall: () => showPaywall(),
}));

const { openExplanations, closeExplanations } = await import('../explanations.js');

const QUESTIONS = [
  {
    question_text: 'Who crossed in 711?',
    explanation: 'Tariq ibn Ziyad led the crossing.',
    answers: [
      { text: 'Tariq ibn Ziyad', is_correct: true },
      { text: 'Musa ibn Nusayr', is_correct: false },
    ],
  },
  {
    question_text: 'What became the capital?',
    explanation: 'Cordoba became the Umayyad capital.',
    answers: [
      { text: 'Toledo', is_correct: false },
      { text: 'Cordoba', is_correct: true },
    ],
  },
  {
    question_text: 'Which year did Cordoba fall?',
    explanation: '',
    answers: [
      { text: '1236', is_correct: true },
      { text: '1492', is_correct: false },
    ],
  },
];
const ANSWERS = [0, 0, 0]; // right, wrong, right

const FULL = {
  explanations: [
    { explanation: 'Deeper one.' },
    { explanation: 'Deeper two.' },
    { explanation: 'Deeper three.' },
  ],
  mode: 'full',
  unlockedCount: 3,
  lockedCount: 0,
};
const PREVIEW = {
  explanations: [{ explanation: 'Deeper one.' }],
  mode: 'preview',
  unlockedCount: 1,
  lockedCount: 2,
};

/** Resolve pending promises and the sheet's rAF-based open. */
const settle = () => new Promise((r) => setTimeout(r, 0));

const sheet = () => document.getElementById('exp-sheet');
const text = () => sheet()?.textContent || '';

beforeEach(() => {
  document.body.innerHTML = '';
  explainAnswers.mockReset();
  isPremium.mockReset().mockReturnValue(false);
  showPaywall.mockReset();
});
afterEach(() => {
  closeExplanations();
  vi.useRealTimers();
});

describe('the explanations sheet', () => {
  it('renders every card from client data before the network answers', async () => {
    explainAnswers.mockReturnValue(new Promise(() => {})); // never resolves
    openExplanations({ questions: QUESTIONS, userAnswers: ANSWERS, eraName: 'Al Andalus' });

    // All three cards, verdicts, and the authored text - at t=0.
    expect(text()).toContain('Who crossed in 711?');
    expect(text()).toContain('What became the capital?');
    expect(text()).toContain('Tariq ibn Ziyad led the crossing.');
    expect(text()).toContain('From the lesson');
    expect(sheet().querySelectorAll('.exp__pip--right')).toHaveLength(2);
    expect(sheet().querySelectorAll('.exp__pip--wrong')).toHaveLength(1);
    // Wrong answer shows both what was chosen and what was right.
    expect(text()).toContain('Toledo');
    expect(text()).toContain('Cordoba');
  });

  it('renders full mode with a deeper text per card and the ask pill', async () => {
    explainAnswers.mockResolvedValue(FULL);
    const onAsk = vi.fn();
    openExplanations({ questions: QUESTIONS, userAnswers: ANSWERS, eraName: 'Al Andalus', onAsk });
    await settle();

    expect(text()).toContain('Deeper one.');
    expect(text()).toContain('Deeper three.');
    expect(sheet().querySelector('.exp__promo')).toBeNull();

    const ask = document.getElementById('exp-ask');
    expect(ask).not.toBeNull();
    ask.click();
    expect(onAsk).toHaveBeenCalled();
  });

  it('renders preview mode from the response even when the cached flag said premium', async () => {
    // The flag picks the skeleton; the server's mode decides the truth. A
    // stale "premium" cache must end at a locked layout, not an unlocked one.
    isPremium.mockReturnValue(true);
    explainAnswers.mockResolvedValue(PREVIEW);
    openExplanations({ questions: QUESTIONS, userAnswers: ANSWERS, eraName: 'Al Andalus' });
    await settle();

    expect(text()).toContain('Deeper one.');
    expect(sheet().querySelectorAll('.exp__deeper--locked')).toHaveLength(2);
    expect(text()).toContain('Unlock all 3 explanations');
  });

  it('locked cards contain synthetic filler, never fetched text', async () => {
    explainAnswers.mockResolvedValue(PREVIEW);
    openExplanations({ questions: QUESTIONS, userAnswers: ANSWERS, eraName: 'Al Andalus' });
    await settle();

    const locked = sheet().querySelectorAll('.exp__deeper--locked');
    expect(locked).toHaveLength(2);
    locked.forEach((el) => {
      expect(el.textContent.trim()).toBe('');
      expect(el.querySelectorAll('.exp__filler').length).toBeGreaterThan(0);
    });
    // And the upgrade button routes to the paywall.
    document.getElementById('exp-upgrade').click();
    expect(showPaywall).toHaveBeenCalled();
  });

  it('shows a neutral verify strip - not an upsell - when entitlement is unknown', async () => {
    explainAnswers.mockResolvedValue({ ...PREVIEW, entitlementUnknown: true });
    openExplanations({ questions: QUESTIONS, userAnswers: ANSWERS, eraName: 'Al Andalus' });
    await settle();

    expect(text()).toContain("Couldn't verify your subscription");
    expect(text()).not.toContain('Upgrade');
  });

  it('keeps the authored cards and offers retry when the request fails', async () => {
    explainAnswers.mockRejectedValue(Object.assign(new Error('down'), { code: 'REQUEST_FAILED' }));
    openExplanations({ questions: QUESTIONS, userAnswers: ANSWERS, eraName: 'Al Andalus' });
    await settle();

    // The failure cost the AI slots, nothing else.
    expect(text()).toContain('Tariq ibn Ziyad led the crossing.');
    expect(text()).toContain("Couldn't reach the AI");
    expect(document.getElementById('exp-retry')).not.toBeNull();

    // Retry succeeds and the strip goes away.
    explainAnswers.mockResolvedValue(FULL);
    document.getElementById('exp-retry').click();
    await settle();
    expect(text()).toContain('Deeper one.');
    expect(text()).not.toContain("Couldn't reach the AI");
  });

  it('stops offering retry after MAX_RETRIES', async () => {
    explainAnswers.mockRejectedValue(Object.assign(new Error('down'), { code: 'REQUEST_FAILED' }));
    openExplanations({ questions: QUESTIONS, userAnswers: ANSWERS, eraName: 'Al Andalus' });
    await settle();

    for (let i = 0; i < 2; i++) {
      const btn = document.getElementById('exp-retry');
      expect(btn, `retry ${i + 1}`).not.toBeNull();
      btn.click();
      await settle();
    }
    expect(document.getElementById('exp-retry')).toBeNull();
  });

  it('turns quota exhaustion into the upgrade card, not an error', async () => {
    explainAnswers.mockRejectedValue(Object.assign(new Error('quota'), { code: 'QUOTA_EXHAUSTED' }));
    openExplanations({ questions: QUESTIONS, userAnswers: ANSWERS, eraName: 'Al Andalus' });
    await settle();

    expect(text()).toContain("used this month's free explanations");
    expect(document.getElementById('exp-retry')).toBeNull();
  });

  it('refetches when premium changes under it', async () => {
    explainAnswers.mockResolvedValue(PREVIEW);
    openExplanations({ questions: QUESTIONS, userAnswers: ANSWERS, eraName: 'Al Andalus' });
    await settle();
    expect(sheet().querySelectorAll('.exp__deeper--locked')).toHaveLength(2);

    explainAnswers.mockResolvedValue(FULL);
    window.dispatchEvent(new CustomEvent('archives:premium-changed'));
    await settle();
    expect(text()).toContain('Deeper three.');
    expect(sheet().querySelectorAll('.exp__deeper--locked')).toHaveLength(0);
  });

  it('marks a per-question parse miss without losing the card', async () => {
    explainAnswers.mockResolvedValue({
      ...FULL,
      explanations: [{ explanation: 'Deeper one.' }, null, { explanation: 'Deeper three.' }],
    });
    openExplanations({ questions: QUESTIONS, userAnswers: ANSWERS, eraName: 'Al Andalus' });
    await settle();

    expect(text()).toContain('Deeper one.');
    expect(text()).toContain("Couldn't go deeper on this one.");
    expect(text()).toContain('Deeper three.');
    // The authored text on the failed card is untouched.
    expect(text()).toContain('Cordoba became the Umayyad capital.');
  });

  it('closes cleanly and stops listening', async () => {
    explainAnswers.mockResolvedValue(PREVIEW);
    openExplanations({ questions: QUESTIONS, userAnswers: ANSWERS, eraName: 'Al Andalus' });
    await settle();

    closeExplanations();
    await new Promise((r) => setTimeout(r, 450)); // transition fallback

    expect(sheet()).toBeNull();
    // A premium change after close must not resurrect anything.
    explainAnswers.mockClear();
    window.dispatchEvent(new CustomEvent('archives:premium-changed'));
    await settle();
    expect(explainAnswers).not.toHaveBeenCalled();
  });
});
