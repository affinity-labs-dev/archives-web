/**
 * Archives Design System — Motion tokens
 *
 * Shared easing curves and durations for onboarding + app animations.
 * Mappings from GSAP → Reanimated compiled from Downloads/01 Onboarding spec.
 */

import { Easing } from 'react-native-reanimated';
import { AccessibilityInfo } from 'react-native';

export const easings = {
  linear: Easing.linear,
  power2Out: Easing.out(Easing.quad),
  power2In: Easing.in(Easing.quad),
  power2InOut: Easing.inOut(Easing.quad),
  power3In: Easing.in(Easing.cubic),
  power3Out: Easing.out(Easing.cubic),
  backOut14: Easing.bezier(0.175, 0.885, 0.32, 1.1),
  backOut15: Easing.bezier(0.175, 0.885, 0.32, 1.15),
  backOut17: Easing.bezier(0.175, 0.885, 0.32, 1.175),
  backOut2: Easing.bezier(0.175, 0.885, 0.32, 1.275),
  ctaPress: Easing.bezier(0.25, 0.46, 0.45, 0.94),
} as const;

export type EasingKey = keyof typeof easings;

export const durations = {
  instant: 0,
  fast: 200,
  medium: 350,
  slow: 500,
  bubbleEntrance: 400,
  mascotEntrance: 600,
  cardStagger: 550,
  cardStaggerInterval: 80,
  cardExit: 350,
  cardExitInterval: 40,
  screenCrossfade: 400,
  ctaPressTotal: 350,
  typewriterChar: 40,
  typewriterCursorHide: 800,
  progressBar: 600,
} as const;

export type DurationKey = keyof typeof durations;

// ─────────────────────────────────────────────
// Reduced motion helper
// ─────────────────────────────────────────────

let _reducedMotion = false;

AccessibilityInfo.isReduceMotionEnabled()
  .then((enabled) => {
    _reducedMotion = enabled;
  })
  .catch(() => {
    // Fail open — keep animations enabled
  });

AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  _reducedMotion = enabled;
});

/**
 * Returns 0 when the user has enabled reduce motion in OS settings,
 * otherwise returns the original duration. Use this for every animated duration.
 */
export const safeDuration = (ms: number): number => (_reducedMotion ? 0 : ms);

export const isReducedMotion = (): boolean => _reducedMotion;
