import type {
  DepthButtonVariant,
  DepthButtonSize,
  DepthButtonVariantSpec,
  DepthButtonSizeSpec,
} from './DepthButton.types';

/**
 * Variant → color scheme mapping.
 * Borders only apply to `primary` (onyx + onyx border) and `outline` variants.
 */
export const variantSpecs: Record<DepthButtonVariant, DepthButtonVariantSpec> = {
  primary: {
    surface: 'onyx',
    shadow: 'white',
    border: 'onyx',
    hasShadow: true,
    defaultPressEffect: 'dip',
  },
  secondary: {
    surface: 'acaiSecondary',
    shadow: 'acaiPrimary',
    hasShadow: true,
    defaultPressEffect: 'dip',
  },
  tertiary: {
    surface: 'bluePrimary',
    shadow: 'blueSecondary',
    hasShadow: true,
    defaultPressEffect: 'dip',
  },
  'tertiary-alt': {
    surface: 'blueSecondary',
    shadow: 'bluePrimary',
    border: 'bluePrimary',
    hasShadow: true,
    defaultPressEffect: 'dip',
  },
  outline: {
    surface: 'white',
    shadow: 'transparent',
    border: 'onyx',
    hasShadow: false,
    defaultPressEffect: 'bounce',
  },
};

/**
 * Size → dimensions mapping.
 * `large` = default CTA height (45px). `medium` = option card (49px, larger radius curl).
 * `small` = compact secondary actions.
 */
export const sizeSpecs: Record<DepthButtonSize, DepthButtonSizeSpec> = {
  large: {
    height: 45,
    paddingHorizontal: 22,
    radius: 26.5,
    shadowOffset: 4,
  },
  medium: {
    height: 49,
    paddingHorizontal: 20,
    radius: 17,
    shadowOffset: 6,
  },
  small: {
    height: 36,
    paddingHorizontal: 14,
    radius: 18,
    shadowOffset: 3,
  },
};
