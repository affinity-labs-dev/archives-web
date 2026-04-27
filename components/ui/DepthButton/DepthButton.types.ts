import type { PressableProps, ViewStyle, StyleProp } from 'react-native';
import type { ReactNode } from 'react';
import type { ColorKey } from '@/components/ui/theme';

export type DepthButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'tertiary-alt'
  | 'outline';

export type DepthButtonSize = 'large' | 'medium' | 'small';

/**
 * Press interaction behavior:
 * - `dip`: surface translates down into shadow, overshoots, settles (CTA style)
 * - `bounce`: whole button scales up then elastic-settles (auth / outline style)
 * - `none`: no press animation
 */
export type DepthButtonPressEffect = 'dip' | 'bounce' | 'none';

export interface DepthButtonVariantSpec {
  surface: ColorKey;
  shadow: ColorKey | 'transparent';
  border?: ColorKey;
  hasShadow: boolean;
  defaultPressEffect: DepthButtonPressEffect;
}

export interface DepthButtonSizeSpec {
  height: number;
  paddingHorizontal: number;
  radius: number;
  shadowOffset: number;
}

export interface DepthButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  /**
   * Color scheme preset. Defaults to `'primary'`.
   */
  variant?: DepthButtonVariant;

  /**
   * Height + padding preset. Defaults to `'large'`.
   */
  size?: DepthButtonSize;

  /**
   * Override press animation. If unset, derived from variant.
   */
  pressEffect?: DepthButtonPressEffect;

  /**
   * Override surface color from theme.
   */
  surfaceColor?: ColorKey;

  /**
   * Override shadow color from theme.
   */
  shadowColor?: ColorKey;

  /**
   * Override border color from theme.
   */
  borderColor?: ColorKey;

  /**
   * Override border radius (pixels). Defaults derived from size.
   */
  radius?: number;

  /**
   * Override shadow vertical offset (pixels). Defaults derived from size.
   */
  shadowOffset?: number;

  /**
   * Disables press + dims button.
   */
  isDisabled?: boolean;

  /**
   * Stretch to parent width. Defaults to `true`.
   */
  isFullWidth?: boolean;

  /**
   * Icon rendered before children.
   */
  leftIcon?: ReactNode;

  /**
   * Icon rendered after children.
   */
  rightIcon?: ReactNode;

  /**
   * Container style override.
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Surface layer style override (applied on top of variant surface).
   */
  surfaceStyle?: StyleProp<ViewStyle>;

  /**
   * Content inside the surface (typically `<Typography>`).
   */
  children: ReactNode;
}
