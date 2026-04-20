/**
 * Archives Design System — Typography tokens
 *
 * Fonts: Bounded (display) + Onest (UI & body).
 * Both must be registered globally in app/_layout.tsx before use.
 */

// ─────────────────────────────────────────────
// Font size scale
// ─────────────────────────────────────────────

export const sizeConfigs = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 22,
  heading: 28,
  display: 30,
  hero: 50,
} as const;

export type SizeKey = keyof typeof sizeConfigs;

// ─────────────────────────────────────────────
// Line height scale
// ─────────────────────────────────────────────

export const lineHeightConfigs = {
  xs: 15,
  sm: 18,
  md: 20,
  lg: 22,
  xl: 26,
  xxl: 28,
  heading: 36,
  display: 42,
  hero: 60,
} as const;

export type LineHeightKey = keyof typeof lineHeightConfigs;

// ─────────────────────────────────────────────
// Text alignment
// ─────────────────────────────────────────────

export const textAlignConfigs = {
  left: 'left',
  center: 'center',
  right: 'right',
  justify: 'justify',
} as const;

export type AlignKey = keyof typeof textAlignConfigs;

// ─────────────────────────────────────────────
// Font weights + styles
// ─────────────────────────────────────────────

export type FontWeight = '400' | '500' | '600' | '700' | '900' | 'normal' | 'bold';
export type FontStyle = 'normal' | 'italic';
export type FontFamily = 'bounded' | 'onest';

/**
 * Font file resolution: family → weight → style → font file name.
 * Bounded only has Black (900) — all weights fall back to that file.
 * Onest has Medium (500), SemiBold (600), Bold (700), Black (900).
 */
export const fontFamilyMap: Record<
  FontFamily,
  Record<FontWeight, Record<FontStyle, string>>
> = {
  bounded: {
    normal: { normal: 'Bounded-Black', italic: 'Bounded-Black' },
    bold: { normal: 'Bounded-Black', italic: 'Bounded-Black' },
    '400': { normal: 'Bounded-Black', italic: 'Bounded-Black' },
    '500': { normal: 'Bounded-Black', italic: 'Bounded-Black' },
    '600': { normal: 'Bounded-Black', italic: 'Bounded-Black' },
    '700': { normal: 'Bounded-Black', italic: 'Bounded-Black' },
    '900': { normal: 'Bounded-Black', italic: 'Bounded-Black' },
  },
  onest: {
    normal: { normal: 'Onest-Medium', italic: 'Onest-Medium' },
    bold: { normal: 'Onest-Bold', italic: 'Onest-Bold' },
    '400': { normal: 'Onest-Medium', italic: 'Onest-Medium' },
    '500': { normal: 'Onest-Medium', italic: 'Onest-Medium' },
    '600': { normal: 'Onest-SemiBold', italic: 'Onest-SemiBold' },
    '700': { normal: 'Onest-Bold', italic: 'Onest-Bold' },
    '900': { normal: 'Onest-Black', italic: 'Onest-Black' },
  },
};

// ─────────────────────────────────────────────
// Typography variants — preset combinations from Figma
// Source: DesignPlayground/theme.ts typographyRows
// ─────────────────────────────────────────────

export interface TypographyVariantSpec {
  family: FontFamily;
  size: number;
  lineHeight?: number;
  weight: FontWeight;
  letterSpacing?: number;
  uppercase?: boolean;
}

export const typographyVariants = {
  // Display — Bounded Black, for hero moments & page titles
  'display.hero': {
    family: 'bounded',
    size: 50,
    lineHeight: 60,
    weight: '900',
    letterSpacing: 0,
    uppercase: true,
  },
  'display.large': {
    family: 'bounded',
    size: 28,
    lineHeight: 42,
    weight: '900',
    letterSpacing: 0,
    uppercase: true,
  },

  // Heading — Onest Black & Bold, for section titles inside screens
  'heading.xl': {
    family: 'onest',
    size: 30,
    weight: '900',
    letterSpacing: 0,
  },
  'heading.m': {
    family: 'onest',
    size: 22,
    weight: '700',
    letterSpacing: 0,
  },

  // Body — Onest, for paragraphs, inputs, and long-form copy
  'body.l': {
    family: 'onest',
    size: 20,
    weight: '600',
    letterSpacing: 0,
  },
  'body.m': {
    family: 'onest',
    size: 16,
    weight: '600',
    letterSpacing: 0,
  },
  'body.s': {
    family: 'onest',
    size: 14,
    weight: '500',
    letterSpacing: 0,
  },
  'body.xs': {
    family: 'onest',
    size: 14,
    lineHeight: 20,
    weight: '600',
    letterSpacing: -0.14,
  },

  // Label — Onest, for buttons, tags, and UI controls
  'label.l': {
    family: 'onest',
    size: 20,
    weight: '500',
    letterSpacing: -0.2,
  },
  'label.m': {
    family: 'onest',
    size: 18,
    weight: '700',
    letterSpacing: -0.18,
  },
  'label.s': {
    family: 'onest',
    size: 16,
    weight: '600',
    letterSpacing: 0,
  },
  'label.xs': {
    family: 'onest',
    size: 14,
    lineHeight: 15,
    weight: '700',
    letterSpacing: 0.14,
  },
} as const satisfies Record<string, TypographyVariantSpec>;

export type TypographyVariant = keyof typeof typographyVariants;
