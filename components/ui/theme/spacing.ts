/**
 * Archives Design System — Spacing scale
 *
 * 8px base unit. Use these tokens for padding, margin, and gaps.
 */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
} as const;

export type SpacingKey = keyof typeof spacing;
