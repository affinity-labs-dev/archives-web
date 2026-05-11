// Quiz-results tier spec — score-percentage → visual identity mapping.
// Each tier dictates mascot asset, headline copy, score-card palette,
// and (for tier 3) the confetti palette. Lookup is `tierFor(percentage)`.

import type { ColorKey } from '@/components/ui';

export type Tier = 'low' | 'medium' | 'high';

export interface TierSpec {
  title: string;
  subtitle: string;
  scoreCardBg: ColorKey;
  scoreCardText: ColorKey;
  scoreCardSubText: ColorKey;
  progressTrack: string;
  progressFill: ColorKey;
}

export const TIER_SPECS: Record<Tier, TierSpec> = {
  // <34% — Blue Primary card, sad mascot
  low: {
    title: 'NICE EFFORT!',
    subtitle: 'Revisit the lessons & try again',
    scoreCardBg: 'bluePrimary',
    scoreCardText: 'white',
    scoreCardSubText: 'blueSecondary',
    progressTrack: 'rgba(255,255,255,0.3)',
    progressFill: 'white',
  },
  // 34–69% — Acai Primary card, standing/skating mascot
  medium: {
    title: "YOU'VE GOT THIS!",
    subtitle: 'Revisit the lessons & try again',
    scoreCardBg: 'acaiPrimary',
    scoreCardText: 'white',
    scoreCardSubText: 'acaiTertiary',
    progressTrack: 'rgba(229,212,255,0.3)',
    progressFill: 'acaiTertiary',
  },
  // ≥70% — Aspen Gold card, celebrating mascot
  high: {
    title: 'AMAZING JOB!',
    subtitle: "You're getting better every time",
    scoreCardBg: 'aspenGold',
    scoreCardText: 'onyx',
    scoreCardSubText: 'onyx',
    progressTrack: 'rgba(26,26,26,0.18)',
    progressFill: 'onyx',
  },
};

export const tierFor = (pct: number): Tier =>
  pct >= 70 ? 'high' : pct >= 34 ? 'medium' : 'low';

// Tier-3 (high) celebration confetti — palette ported verbatim from the
// HTML mock (Downloads/03 questions/index.html ≈line 2308). Brand-spanning
// 6-color set so the burst reads as a celebration over the whole screen
// instead of just dressing up the gold card.
export const HIGH_TIER_CONFETTI_PALETTE = [
  '#FFDD63', // Aspen Gold
  '#8C60CD', // Acai Secondary (purple)
  '#E84E80', // pink
  '#A2C5FF', // Blue Secondary
  '#1E3C88', // Blue Primary
  '#FFFFFF', // white
];
