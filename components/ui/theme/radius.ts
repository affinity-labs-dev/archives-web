/**
 * Archives Design System — Border radius tokens
 */

export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  button: 26.5,
  option: 17,
  pill: 100,
} as const;

export type RadiusKey = keyof typeof radius;
