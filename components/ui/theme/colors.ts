/**
 * Archives Design System — Color tokens
 *
 * Source of truth for the new Archives design system.
 * Sourced from Figma "Archives_Raw_File" via DesignPlayground/theme.ts.
 */

export const colors = {
  // Brand · Purple (Acai)
  acaiPrimary: '#3E2368',
  acaiDeep: '#482E6E',
  acaiSecondary: '#8C60CD',
  acaiTertiary: '#E5D4FF',

  // Brand · Blue
  bluePrimary: '#1E3C88',
  blueSecondary: '#A2C5FF',
  blueMutedNavy: '#41425E',

  // Accent
  aspenGold: '#FFDD63',
  pinkPrimary: '#6B1A3D',
  pinkSecondary: '#C63D78',

  // Neutral
  onyx: '#1A1A1A',
  snow: '#FAFAFA',
  cream: '#FAF3DA',
  concreteGrey: '#C3C3C3',

  // Success · Correct
  correctPrimary: '#234200',
  correctSecondary: '#5B980C',
  correctTertiary: '#D6FFB8',

  // Error · Incorrect
  incorrectPrimary: '#6E0B0E',
  incorrectSecondary: '#C82A4B',
  incorrectTertiary: '#FFB8B9',

  // Pure
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Semantic aliases (convenience)
  background: '#FAFAFA',
  textPrimary: '#1A1A1A',
  textMuted: '#737373',
  border: '#E5E5E5',
} as const;

export type ColorKey = keyof typeof colors;
