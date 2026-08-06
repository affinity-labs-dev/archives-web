// Barrel export for QuizResults internals — single import surface for
// the parent file: `import { Mascot, ScoreCard, ActionPill, ... } from
// './results'`. Entrance presets live in `@/components/ui/animations`
// (see `presets.ts`) so they're reusable across surfaces.

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
