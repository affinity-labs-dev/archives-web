import type { TextProps, StyleProp, TextStyle } from 'react-native';
import type { ReactNode } from 'react';
import type {
  ColorKey,
  SizeKey,
  LineHeightKey,
  AlignKey,
  FontWeight,
  FontStyle,
  FontFamily,
  TypographyVariant,
} from '@/components/ui/theme';

export interface TypographyProps extends Omit<TextProps, 'style'> {
  /**
   * Preset combination of family + size + weight + spacing.
   * When set, serves as base defaults; individual props override variant fields.
   * Example: `<Typography variant="display.hero">TITLE</Typography>`
   */
  variant?: TypographyVariant;

  /**
   * Typeface. Defaults to variant's family, else `'onest'`.
   */
  family?: FontFamily;

  /**
   * Font size. Accepts a token key (`'xs'`-`'hero'`) or a raw pixel number.
   * Overrides variant size when set.
   */
  size?: SizeKey | number;

  /**
   * Line height. Token key or raw pixel number.
   * Defaults to variant's lineHeight, else `fontSize × 1.4`.
   */
  lineHeight?: LineHeightKey | number;

  /**
   * Font weight — CSS standard strings. Overrides variant weight.
   */
  weight?: FontWeight;

  /**
   * `'normal'` | `'italic'`. Default `'normal'`.
   */
  fontStyle?: FontStyle;

  /**
   * Theme color key.
   */
  color?: ColorKey;

  /**
   * Escape hatch for colors not in the theme.
   */
  extraColor?: string;

  /**
   * Text alignment.
   */
  align?: AlignKey;

  /**
   * Override letter spacing in pixels. Overrides variant's letterSpacing.
   */
  letterSpacing?: number;

  /**
   * Force uppercase. Overrides variant's uppercase (Bounded variants default `true`).
   */
  uppercase?: boolean;

  /**
   * Content to render.
   */
  children: ReactNode;

  /**
   * Highest-priority style override. Applied last.
   */
  style?: StyleProp<TextStyle>;
}
