/**
 * Archives Design System — New Theme Tokens
 *
 * Source of truth: Figma "Archives_Raw_File"
 * Fonts: Bounded (display) + Onest (UI & body)
 *
 * NOTE: Bounded and Onest fonts must be installed in the project
 * before this theme renders correctly. Until then, system fonts
 * will be used as fallback.
 */

// ─────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────

export const colors = {
  // Brand · Purple (Acai)
  acaiPrimary: '#3E2368',
  acaiSecondary: '#8C60CD',
  acaiTertiary: '#E5D4FF',

  // Brand · Blue
  bluePrimary: '#1E3C88',
  blueSecondary: '#A2C5FF',

  // Accent
  aspenGold: '#FFDD63',
  pinkSecondary: '#C63D78',
  pinkPrimary: '#C63D78',

  // Neutral
  onyx: '#1A1A1A',
  snow: '#FAFAFA',
  concreteGrey: '#C3C3C3',

  // Success · Correct
  correctPrimary: '#234200',
  correctSecondary: '#5B980C',
  correctTertiary: '#D6FFB8',

  // Error · Incorrect
  incorrectPrimary: '#6E0B0E',
  incorrectSecondary: '#C82A4B',
  incorrectTertiary: '#FFB8B9',
} as const;

// ─────────────────────────────────────────────
// Semantic Tokens · Buttons
// ─────────────────────────────────────────────

export const buttonTokens = {
  primary: {
    surface: '#1A1A1A',
    shadow: '#FFFFFF',
    border: '#1A1A1A',
    text: '#FFFFFF',
  },
  secondary: {
    surface: '#E5D4FF',
    shadow: '#3E2368',
    text: '#1A1A1A',
  },
  tertiary: {
    surface: '#1E3C88',
    shadow: '#A2C5FF',
    text: '#FFFFFF',
  },
  outline: {
    surface: 'transparent',
    border: '#1A1A1A',
    text: '#1A1A1A',
  },
} as const;

// ─────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────

export const fonts = {
  bounded: {
    black: 'Bounded-Black',
  },
  onest: {
    black: 'Onest-Black',
    bold: 'Onest-Bold',
    semiBold: 'Onest-SemiBold',
    medium: 'Onest-Medium',
  },
} as const;

export const typography = {
  // Display — Bounded Black, for hero moments & page titles
  display: {
    hero: {
      fontFamily: fonts.bounded.black,
      fontSize: 50,
      lineHeight: 60,
      fontWeight: '900' as const,
      letterSpacing: 0,
      textTransform: 'uppercase' as const,
    },
    large: {
      fontFamily: fonts.bounded.black,
      fontSize: 28,
      lineHeight: 42,
      fontWeight: '900' as const,
      letterSpacing: 0,
      textTransform: 'uppercase' as const,
    },
  },

  // Heading — Onest Black & Bold, for section titles inside screens
  heading: {
    xl: {
      fontFamily: fonts.onest.black,
      fontSize: 30,
      fontWeight: '900' as const,
      letterSpacing: 0,
    },
    m: {
      fontFamily: fonts.onest.bold,
      fontSize: 22,
      fontWeight: '700' as const,
      letterSpacing: 0,
    },
  },

  // Body — Onest, for paragraphs, inputs, and long form copy
  body: {
    l: {
      fontFamily: fonts.onest.semiBold,
      fontSize: 20,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    m: {
      fontFamily: fonts.onest.semiBold,
      fontSize: 16,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    s: {
      fontFamily: fonts.onest.medium,
      fontSize: 14,
      fontWeight: '500' as const,
      letterSpacing: 0,
    },
    xs: {
      fontFamily: fonts.onest.semiBold,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600' as const,
      letterSpacing: -0.14,
    },
  },

  // Label — Onest, for buttons, tags, and UI controls
  label: {
    l: {
      fontFamily: fonts.onest.medium,
      fontSize: 20,
      fontWeight: '500' as const,
      letterSpacing: -0.2,
    },
    m: {
      fontFamily: fonts.onest.bold,
      fontSize: 18,
      fontWeight: '700' as const,
      letterSpacing: -0.18,
    },
    s: {
      fontFamily: fonts.onest.semiBold,
      fontSize: 16,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    xs: {
      fontFamily: fonts.onest.bold,
      fontSize: 14,
      lineHeight: 15,
      fontWeight: '700' as const,
      letterSpacing: 0.14,
    },
  },
} as const;

// ─────────────────────────────────────────────
// Spacing (8px base unit)
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Border Radius
// ─────────────────────────────────────────────

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 100,
} as const;

// ─────────────────────────────────────────────
// Shadows
// ─────────────────────────────────────────────

export const shadows = {
  small: {
    shadowColor: colors.onyx,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.onyx,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: colors.onyx,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ─────────────────────────────────────────────
// Playground display metadata (for rendering swatches)
// ─────────────────────────────────────────────

export const colorSwatches = {
  'Brand · Purple (Acai)': [
    { name: 'Acai Primary', hex: colors.acaiPrimary, token: '--acai-primary', description: 'Pantone Acai \u2014 deep purple. Primary brand purple.' },
    { name: 'Acai Secondary', hex: colors.acaiSecondary, token: '--acai-secondary', description: 'Pantone 2665 C (Bellflower) \u2014 mid purple. Secondary brand purple.' },
    { name: 'Acai Tertiary', hex: colors.acaiTertiary, token: '--acai-tertiary', description: 'Pantone Lavender Fog \u2014 pale lavender. Tertiary brand purple.' },
  ],
  'Brand · Blue': [
    { name: 'Blue Primary', hex: colors.bluePrimary, token: '--blue-primary', description: 'Pantone 2748 C \u2014 deep navy / royal blue. Primary brand blue.' },
    { name: 'Blue Secondary', hex: colors.blueSecondary, token: '--blue-secondary', description: 'Light sky blue \u2014 secondary blue accent.' },
  ],
  'Accent': [
    { name: 'Aspen Gold', hex: colors.aspenGold, token: '--aspen-gold', description: 'Pantone Aspen Gold \u2014 buttercup yellow.' },
    { name: 'Pink Secondary', hex: colors.pinkSecondary, token: '--pink', description: 'Pantone Pink Yarrow \u2014 magenta-rose.' },
    { name: 'Pink Primary', hex: colors.pinkPrimary, token: '--pink', description: 'Pantone Pink Yarrow \u2014 magenta-rose.' },
  ],
  'Neutral': [
    { name: 'Onyx', hex: colors.onyx, token: '--onyx', description: 'Pantone Onyx \u2014 near-black.' },
    { name: 'Snow', hex: colors.snow, token: '--snow', description: 'Pantone Bright White \u2014 off-white.' },
    { name: 'Concrete Grey', hex: colors.concreteGrey, token: '--grey', description: 'Pantone Concrete Grey.' },
  ],
  'Success · Correct': [
    { name: 'Correct Primary', hex: colors.correctPrimary, token: '--correct-primary' },
    { name: 'Correct Secondary', hex: colors.correctSecondary, token: '--correct-secondary' },
    { name: 'Correct Tertiary', hex: colors.correctTertiary, token: '--correct-tertiary' },
  ],
  'Error · Incorrect': [
    { name: 'Incorrect Primary', hex: colors.incorrectPrimary, token: '--incorrect-primary' },
    { name: 'Incorrect Secondary', hex: colors.incorrectSecondary, token: '--incorrect-secondary' },
    { name: 'Incorrect Tertiary', hex: colors.incorrectTertiary, token: '--incorrect-tertiary' },
  ],
} as const;

export const typographyRows = {
  'Display': {
    description: 'Bounded Black \u2014 for hero moments & page titles.',
    rows: [
      { name: 'Display/Hero', spec: 'Bounded Black \u00B7 50 / 60 \u00B7 0%', sample: 'Welcome, Ahmed!', style: typography.display.hero },
      { name: 'Display/Large', spec: 'Bounded Black \u00B7 28 / 42 \u00B7 0%', sample: 'Join over 50,000 learners today', style: typography.display.large },
    ],
  },
  'Heading': {
    description: 'Onest Black & Bold \u2014 for section titles inside screens.',
    rows: [
      { name: 'Heading/XL', spec: 'Onest Black \u00B7 30 \u00B7 0%', sample: 'But we\u2019d love for you to try Archives Plus', style: typography.heading.xl },
      { name: 'Heading/M', spec: 'Onest Bold \u00B7 22 \u00B7 0%', sample: '3 Eras', style: typography.heading.m },
    ],
  },
  'Body': {
    description: 'Onest \u2014 for paragraphs, inputs, and long form copy.',
    rows: [
      { name: 'Body/L', spec: 'Onest SemiBold \u00B7 20 \u00B7 0%', sample: 'Archives is free to use', style: typography.body.l },
      { name: 'Body/M', spec: 'Onest SemiBold \u00B7 16 \u00B7 0%', sample: 'Your first name', style: typography.body.m },
      { name: 'Body/S', spec: 'Onest Medium \u00B7 14 \u00B7 0%', sample: 'My 6 year old daughter insists to sit with me on Archives, we love questioning each other.', style: typography.body.s },
      { name: 'Body/XS', spec: 'Onest SemiBold \u00B7 14 / 20 \u00B7 \u22121%', sample: 'Discover the early Prophets and how they shaped Islam, every week a new era.', style: typography.body.xs },
    ],
  },
  'Label': {
    description: 'Onest \u2014 for buttons, tags, and UI controls.',
    rows: [
      { name: 'Label/L', spec: 'Onest Medium \u00B7 20 \u00B7 \u22121%', sample: 'Continue with Google', style: typography.label.l },
      { name: 'Label/M', spec: 'Onest Bold \u00B7 18 \u00B7 \u22121%', sample: 'LET\u2019S START', style: typography.label.m },
      { name: 'Label/S', spec: 'Onest SemiBold \u00B7 16 \u00B7 0%', sample: 'Just for fun', style: typography.label.s },
      { name: 'Label/XS', spec: 'Onest Bold \u00B7 14 / 15 \u00B7 +1%', sample: 'Less than 5 mins a day', style: typography.label.xs },
    ],
  },
} as const;

export const buttonTokenRows = [
  {
    name: 'Button \u00B7 Primary',
    description: 'Dark filled CTA (Continue).',
    tokens: [
      { key: 'color/primary/surface', hex: buttonTokens.primary.surface, cssVar: '--color-primary-surface', scopes: 'FRAME_FILL, SHAPE_FILL' },
      { key: 'color/primary/shadow', hex: buttonTokens.primary.shadow, cssVar: '--color-primary-shadow', scopes: 'FRAME_FILL, SHAPE_FILL' },
      { key: 'color/primary/border', hex: buttonTokens.primary.border, cssVar: '--color-primary-border', scopes: 'STROKE_COLOR' },
      { key: 'color/primary/text', hex: buttonTokens.primary.text, cssVar: '--color-primary-text', scopes: 'TEXT_FILL' },
    ],
  },
  {
    name: 'Button \u00B7 Secondary',
    description: 'Purple filled CTA (Start my day).',
    tokens: [
      { key: 'color/secondary/surface', hex: buttonTokens.secondary.surface, cssVar: '--color-secondary-surface', scopes: 'FRAME_FILL, SHAPE_FILL' },
      { key: 'color/secondary/shadow', hex: buttonTokens.secondary.shadow, cssVar: '--color-secondary-shadow', scopes: 'FRAME_FILL, SHAPE_FILL' },
      { key: 'color/secondary/text', hex: buttonTokens.secondary.text, cssVar: '--color-secondary-text', scopes: 'TEXT_FILL' },
    ],
  },
  {
    name: 'Button \u00B7 Tertiary',
    description: 'Blue filled CTA (Let\u2019s start).',
    tokens: [
      { key: 'color/tertiary/surface', hex: buttonTokens.tertiary.surface, cssVar: '--color-tertiary-surface', scopes: 'FRAME_FILL, SHAPE_FILL' },
      { key: 'color/tertiary/shadow', hex: buttonTokens.tertiary.shadow, cssVar: '--color-tertiary-shadow', scopes: 'FRAME_FILL, SHAPE_FILL' },
      { key: 'color/tertiary/text', hex: buttonTokens.tertiary.text, cssVar: '--color-tertiary-text', scopes: 'TEXT_FILL' },
    ],
  },
  {
    name: 'Button \u00B7 Outline',
    description: 'White outlined CTA (Continue with Apple).',
    tokens: [
      { key: 'color/outline/surface', hex: buttonTokens.outline.surface, cssVar: '--color-outline-surface', scopes: 'FRAME_FILL, SHAPE_FILL' },
      { key: 'color/outline/border', hex: buttonTokens.outline.border, cssVar: '--color-outline-border', scopes: 'STROKE_COLOR' },
      { key: 'color/outline/text', hex: buttonTokens.outline.text, cssVar: '--color-outline-text', scopes: 'TEXT_FILL' },
    ],
  },
] as const;

// ─────────────────────────────────────────────
// Unified export
// ─────────────────────────────────────────────

const PlaygroundTheme = {
  colors,
  buttonTokens,
  fonts,
  typography,
  spacing,
  borderRadius,
  shadows,
  colorSwatches,
  typographyRows,
  buttonTokenRows,
} as const;

export default PlaygroundTheme;
