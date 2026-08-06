import React, { useMemo } from 'react';
import { Text } from 'react-native';

import {
  colors,
  sizeConfigs,
  lineHeightConfigs,
  textAlignConfigs,
  fontFamilyMap,
  typographyVariants,
} from '@/components/ui/theme';
import type { TypographyVariantSpec } from '@/components/ui/theme';

import type { TypographyProps } from './Typography.types';

/**
 * Typography — design-system text component.
 *
 * Merge order (low → high priority):
 *   1. Variant preset (if `variant` prop set)
 *   2. Individual props (`size`, `weight`, `color`, ...)
 *   3. `style` prop
 *
 * @example
 * // Preset
 * <Typography variant="display.hero">LEARN ISLAMIC</Typography>
 *
 * // Preset + override
 * <Typography variant="heading.xl" color="acaiPrimary">Custom colored</Typography>
 *
 * // Fully custom
 * <Typography family="onest" size="lg" weight="600" color="onyx">Plain text</Typography>
 */
export function Typography({
  variant,
  family,
  size,
  lineHeight,
  weight,
  fontStyle = 'normal',
  color = 'onyx',
  extraColor,
  align = 'left',
  letterSpacing,
  uppercase,
  children,
  style,
  ...rest
}: TypographyProps) {
  const resolvedStyle = useMemo(() => {
    const variantSpec: TypographyVariantSpec | undefined = variant
      ? typographyVariants[variant]
      : undefined;

    const resolvedFamily = family ?? variantSpec?.family ?? 'onest';
    const resolvedWeight = weight ?? variantSpec?.weight ?? 'normal';
    const resolvedUppercase = uppercase ?? variantSpec?.uppercase ?? false;
    const resolvedLetterSpacing = letterSpacing ?? variantSpec?.letterSpacing;

    const resolvedSize =
      size !== undefined
        ? typeof size === 'number'
          ? size
          : sizeConfigs[size]
        : variantSpec?.size ?? sizeConfigs.md;

    const resolvedLineHeight =
      lineHeight !== undefined
        ? typeof lineHeight === 'number'
          ? lineHeight
          : lineHeightConfigs[lineHeight]
        : variantSpec?.lineHeight ?? resolvedSize * 1.4;

    const resolvedFontFamily =
      fontFamilyMap[resolvedFamily][resolvedWeight][fontStyle];

    return {
      fontSize: resolvedSize,
      lineHeight: resolvedLineHeight,
      fontFamily: resolvedFontFamily,
      fontWeight: resolvedWeight,
      fontStyle,
      color: extraColor ?? colors[color],
      textAlign: textAlignConfigs[align],
      ...(resolvedLetterSpacing !== undefined && {
        letterSpacing: resolvedLetterSpacing,
      }),
      ...(resolvedUppercase && { textTransform: 'uppercase' as const }),
    };
  }, [
    variant,
    family,
    size,
    lineHeight,
    weight,
    fontStyle,
    color,
    extraColor,
    align,
    letterSpacing,
    uppercase,
  ]);

  return (
    <Text
      allowFontScaling={false}
      style={[resolvedStyle, style]}
      testID="typography"
      {...rest}
    >
      {children}
    </Text>
  );
}
