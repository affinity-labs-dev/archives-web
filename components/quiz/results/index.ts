// Barrel export for QuizResults internals — single import surface for
// the parent file: `import { Mascot, ScoreCard, ActionPill, ... } from
// './results'`.

export { Mascot } from './Mascot';
export { ScoreCard } from './ScoreCard';
export { ActionPill } from './ActionPill';

export {
  TIER_SPECS,
  HIGH_TIER_CONFETTI_PALETTE,
  tierFor,
  type Tier,
  type TierSpec,
} from './tiers';

export {
  MASCOT_LOW_MED,
  MASCOT_HIGH,
  HEADLINE_PRESET,
  SUBHEAD_PRESET,
  SCORE_CARD_PRESET,
  PILL_PRESET,
  CTA_PRESET,
} from './animations';
