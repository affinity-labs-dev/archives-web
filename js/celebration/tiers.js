// The three result tiers, as data.
//
// Ported from components/quiz/results/tiers.ts and the three tier components
// beside it. Everything that differs between a 1/3, a 2/3 and a 3/3 lives in
// this file, so quiz-results.js can be one screen builder rather than three
// near-identical ones - which is the mistake the app itself made and the
// reason its three tier components are 200 lines each of the same code.

/**
 * Which tier a percentage lands in.
 *
 * For the three-question daily story that means: 0/3 and 1/3 are `low`
 * (0% and 33%), 2/3 is `medium` (67%), 3/3 is `high` (100%). Adventure
 * quizzes have more questions and use the whole range.
 */
export function tierFor(percentage) {
  if (percentage >= 70) return 'high';
  if (percentage >= 34) return 'medium';
  return 'low';
}

/**
 * Colours and copy per tier.
 *
 * These are the mobile app's palette, not the website's - the celebration is
 * deliberately a different surface, and matching #1E3C88 / #3E2368 / #FFDD63
 * exactly is what makes it read as the app. Do not substitute --amber here.
 */
export const TIER_SPECS = {
  low: {
    title: 'NICE EFFORT!',
    subtitle: 'Revisit the lessons & try again',
    cardBg: '#1E3C88',
    cardText: '#FFFFFF',
    cardSubText: '#A2C5FF',
    progressTrack: 'rgba(255, 255, 255, 0.3)',
    progressFill: '#FFFFFF',
    // Behind the Rive, and all that shows if the Rive fails to load. All
    // three tiers use the app's `snow`, not a tier colour: the Rive IS the
    // colour, and the headline over it is onyx on every tier.
    screenBg: '#FAFAFA',
    // Measured, so nobody "fixes" it later: this is a ~2s one-shot that
    // animates in and then settles on a still frame. It is not stuck.
    background: 'wave_animation.riv',
    mascot: 'open-mouth.riv',
    introCue: 'lowIntro',
    countUpCue: 'lowCountUp',
    starColor: '#FFDD63',
  },
  medium: {
    title: "YOU'VE GOT THIS!",
    subtitle: 'Revisit the lessons & try again',
    cardBg: '#3E2368',
    cardText: '#FFFFFF',
    cardSubText: '#E5D4FF',
    progressTrack: 'rgba(229, 212, 255, 0.3)',
    progressFill: '#E5D4FF',
    screenBg: '#FAFAFA',
    background: 'disco_animation.riv',
    mascot: 'ibu-skating.riv',
    introCue: 'mediumIntro',
    countUpCue: 'mediumCountUp',
    starColor: '#FFDD63',
  },
  high: {
    title: 'AMAZING JOB!',
    subtitle: "You're getting better every time",
    cardBg: '#FFDD63',
    cardText: '#1A1A1A',
    cardSubText: '#1A1A1A',
    progressTrack: 'rgba(26, 26, 26, 0.18)',
    progressFill: '#1A1A1A',
    screenBg: '#FAFAFA',
    background: 'ibu-3-of-3.riv',
    // This background is a portrait-authored CHARACTER scene, unlike the two
    // ambient patterns above. Cover scales it to fill the window and crops
    // whatever does not fit - on desktop that cut Ibu out of his own
    // celebration entirely. It renders contained at EVERY size: the whole
    // scene, aspect ratio kept, centred over the backdrop colour. On a phone
    // the artboard's aspect is close enough to the screen's that this looks
    // identical to Cover anyway.
    backgroundFit: 'contain',
    // The flanks either side of the contained artboard, animated in sync
    // with the artwork. The scene opens light, fades into a night sky by
    // 1.2s, holds it to ~7.4s, and dissolves back to light - measured by
    // sampling the rendered canvas edge at 400ms intervals. The sky gradient
    // is horizontally uniform, so continuing it into the flanks makes the
    // artboard boundary all but disappear during the dark stretch.
    introBackdrop: {
      gradient: 'linear-gradient(180deg, #080F22 0%, #0D1A3B 45%, #142758 100%)',
      fadeIn: 600, fadeInDur: 600,
      fadeOut: 7400, fadeOutDur: 500,
    },
    // No mascot: at 3/3 the background Rive IS Ibu, full screen. The layout
    // still reserves the space, so the card sits where it does in the other
    // two tiers rather than jumping up.
    mascot: null,
    introCue: 'highIntro',
    countUpCue: 'highCountUp',
    starColor: '#1A1A1A',
  },
};

/**
 * The choreography, in absolute milliseconds from the screen appearing.
 *
 * The app expresses these as a "body gate" plus mount-relative delays, because
 * on a phone the tier components mount their subtrees late to keep the intro
 * animation smooth. There is nothing to defer on the web, so the same instants
 * are written here as wall-clock - which also means this table can be compared
 * directly against the spec, and a unit test does exactly that.
 *
 * Read `high` and note it holds 7.5 seconds before the score card appears.
 * That is not a mistake; ibu-3-of-3.riv is a seven-second animation and the
 * screen is meant to be watched.
 */
export const TIER_TIMING = {
  low: {
    intro: 200,
    card: 1000,
    spark: 1450,
    head: 1650,
    sub: 1780,
    pill1: 1910,
    bar: 2000,
    barDur: 900,
    barEase: 'power2.out',
    pill2: 2040,
    cta: 2170,
    xp: 3000,
    countUp: 2000,
    mascot: { delay: 500, scaleFrom: null, yFrom: 184, dur: 2000 },
  },
  medium: {
    intro: 0,
    card: 3500,
    spark: 3950,
    head: 4150,
    sub: 4280,
    pill1: 4410,
    bar: 4500,
    barDur: 900,
    barEase: 'power2.out',
    pill2: 4540,
    cta: 4670,
    xp: 5500,
    countUp: 4500,
    mascot: { delay: 0, scaleFrom: 2, yFrom: -100, dur: 5000 },
  },
  high: {
    intro: 0,
    card: 7500,
    spark: 7950,
    head: 8150,
    sub: 8280,
    pill1: 8410,
    bar: 8000,
    barDur: 1900,
    // Linear, not power2.out: the bar is pacing a 1.9s count-up against the
    // music, and an eased fill would finish the number early.
    barEase: 'none',
    pill2: 8540,
    cta: 8670,
    xp: 10000,
    countUp: 8200,
    // Only at 100%: the percentage pops after the bar completes.
    pop: 9900,
    mascot: null,
  },
};

/**
 * The six sparkles that burst around the score card.
 *
 * (size, delay, position) triples from ScoreCardSparkles.tsx. Positions are
 * relative to a container inset around the card, which is why several are
 * negative-adjacent - `top: 0` here is above the card's top edge.
 */
export const SPARKLES = [
  { size: 36, delay: 1450, style: 'top:0; left:0;' },
  { size: 28, delay: 1550, style: 'top:4px; right:0;' },
  { size: 24, delay: 1700, style: 'top:110px; left:0;' },
  { size: 32, delay: 1500, style: 'top:114px; right:0;' },
  { size: 20, delay: 1600, style: 'top:134px; left:30%;' },
  { size: 20, delay: 1780, style: 'top:134px; left:60%;' },
];

/** The four-point sparkle, as an SVG path. */
export const SPARKLE_PATH =
  'M 12 0 L 14 10 L 24 12 L 14 14 L 12 24 L 10 14 L 0 12 L 10 10 Z';

/**
 * The streak screen's motivational line.
 *
 * Ported from StreakCelebration/motivational.ts. Seven tiers, and the
 * boundaries are exact values rather than ranges at 1, 7 and 30 - hitting a
 * round number should say something different from being near one.
 */
export function getMotivationalQuote(streak) {
  if (streak <= 1) return 'Every journey starts with a single day.';
  if (streak < 7) return "You're building something. Keep going.";
  if (streak === 7) return 'A full week. That is a habit forming.';
  if (streak < 30) return 'Consistency is quietly compounding.';
  if (streak === 30) return 'Thirty days. That is real dedication.';
  if (streak < 100) return 'You have made this part of who you are.';
  return 'One hundred days and counting. Remarkable.';
}
