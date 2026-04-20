/**
 * Entrance animation presets — curated from the onboarding animation spec.
 * All values are sourced from Downloads/01 Onboarding/DEVELOPER_INSTRUCTIONS.md.
 *
 * Each preset defines `{ from, to }` for each transform axis that should animate.
 * Unset axes are not animated (identity).
 */

import type { EasingFunction, EasingFunctionFactory } from 'react-native-reanimated';
import { Easing } from 'react-native-reanimated';

import { easings } from '@/components/ui/theme';

export type EntranceEasing = EasingFunction | EasingFunctionFactory;

export interface EntranceAxis {
  from: number;
  to: number;
}

export interface EntranceConfig {
  translateX?: EntranceAxis;
  translateY?: EntranceAxis;
  rotate?: EntranceAxis;
  scale?: EntranceAxis;
  opacity?: EntranceAxis;
  duration?: number;
  easing?: EntranceEasing;
}

export const ENTRANCE_PRESETS = {
  /** Mascot slide-in from left. `back.out(2)`, 600ms. */
  slideFromLeft: {
    translateX: { from: -120, to: 0 },
    rotate: { from: -8, to: 0 },
    opacity: { from: 0, to: 1 },
    duration: 600,
    easing: easings.backOut2,
  },

  /** Option card / right-side entry. `back.out(1.4)`, 550ms. */
  slideFromRight: {
    translateX: { from: 400, to: 0 },
    rotate: { from: 3, to: 0 },
    opacity: { from: 0, to: 1 },
    duration: 550,
    easing: easings.backOut14,
  },

  /** Title drops from above with rotate. `back.out(1.7)`, 700ms. */
  slideFromTop: {
    translateY: { from: -100, to: 0 },
    opacity: { from: 0, to: 1 },
    duration: 700,
    easing: easings.backOut17,
  },

  /** CTA button rises from below. `back.out(2)`, 600ms. */
  slideFromBottom: {
    translateY: { from: 60, to: 0 },
    opacity: { from: 0, to: 1 },
    duration: 600,
    easing: easings.backOut2,
  },

  /** Simple fade. 400ms. */
  fadeIn: {
    opacity: { from: 0, to: 1 },
    duration: 400,
    easing: easings.power2Out,
  },

  /** Fade + subtle scale — good for cards / secondary content. 500ms. */
  fadeScale: {
    scale: { from: 0.95, to: 1 },
    opacity: { from: 0, to: 1 },
    duration: 500,
    easing: easings.power2Out,
  },

  /** Speech bubble pop (scale + rotate + fade). `back.out(2)`, 400ms. */
  bubblePop: {
    scale: { from: 0.9, to: 1 },
    rotate: { from: -5, to: 0 },
    opacity: { from: 0, to: 1 },
    duration: 400,
    easing: easings.backOut2,
  },

  /** Elastic drop — for hero text (IBU, WELCOME). `elastic.out(1, 0.6)`, 800ms. */
  elasticDrop: {
    scale: { from: 0.7, to: 1 },
    translateY: { from: -120, to: 0 },
    opacity: { from: 0, to: 1 },
    duration: 800,
    easing: Easing.out(Easing.elastic(1.2)),
  },

  /** Accordion layer — for 3-layer welcome text. `back.out(1.4)`, 600ms. */
  accordionLayer: {
    translateY: { from: 200, to: 0 },
    opacity: { from: 0, to: 1 },
    duration: 600,
    easing: easings.backOut14,
  },
} as const satisfies Record<string, EntranceConfig>;

export type EntrancePresetKey = keyof typeof ENTRANCE_PRESETS;

/**
 * Exit animation presets — inverse of entrance, for transitions out.
 */
export const EXIT_PRESETS = {
  /** Card swipes off-left with rotation. `power3.in`, 350ms. */
  swipeLeft: {
    translateX: { from: 0, to: -500 },
    rotate: { from: 0, to: -8 },
    opacity: { from: 1, to: 0 },
    duration: 350,
    easing: easings.power3In,
  },

  /** Fade out. 250ms. */
  fadeOut: {
    opacity: { from: 1, to: 0 },
    duration: 250,
    easing: easings.power2In,
  },

  /** Shrink + fade — for bubbles leaving. 300ms. */
  shrinkFade: {
    scale: { from: 1, to: 0.9 },
    opacity: { from: 1, to: 0 },
    duration: 300,
    easing: easings.power2InOut,
  },
} as const satisfies Record<string, EntranceConfig>;

export type ExitPresetKey = keyof typeof EXIT_PRESETS;
