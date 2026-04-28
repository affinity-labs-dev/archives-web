// Entrance animation presets for QuizResults — values mirror
// Downloads/03 questions/DEVELOPER_INSTRUCTIONS.md so the live screen
// matches the mock timing exactly.

import { Easing } from 'react-native-reanimated';

import { easings } from '@/components/ui';
import type { EntranceConfig } from '@/components/ui/animations';

export const MASCOT_LOW_MED: EntranceConfig = {
  translateY: { from: -20, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 600,
  easing: easings.backOut2,
};

export const MASCOT_HIGH: EntranceConfig = {
  translateY: { from: -20, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 700,
  easing: Easing.out(Easing.elastic(1)),
};

export const HEADLINE_PRESET: EntranceConfig = {
  translateY: { from: 20, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 550,
  easing: easings.backOut14,
};

export const SUBHEAD_PRESET: EntranceConfig = {
  translateY: { from: 12, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 400,
  easing: easings.power2Out,
};

export const SCORE_CARD_PRESET: EntranceConfig = {
  translateY: { from: 30, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 500,
  easing: easings.backOut14,
};

export const PILL_PRESET: EntranceConfig = {
  translateY: { from: 30, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 450,
  easing: easings.backOut14,
};

export const CTA_PRESET: EntranceConfig = {
  translateY: { from: 30, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 450,
  easing: easings.backOut2,
};
