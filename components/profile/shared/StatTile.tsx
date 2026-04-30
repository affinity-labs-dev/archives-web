import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors } from '@/components/ui/theme';
import { CountUpText } from './CountUpText';

export type TileColorScheme = 'blueDark' | 'blueLight' | 'acaiDark' | 'acaiLight';

const TILE_COLORS: Record<
  TileColorScheme,
  { bg: string; text: string; label: string }
> = {
  blueDark: { bg: colors.bluePrimary, text: colors.snow, label: colors.blueSecondary },
  blueLight: { bg: colors.blueSecondary, text: colors.bluePrimary, label: colors.bluePrimary },
  acaiDark: { bg: colors.acaiSecondary, text: colors.snow, label: colors.acaiTertiary },
  acaiLight: { bg: colors.acaiTertiary, text: colors.acaiPrimary, label: colors.acaiSecondary },
};

interface StatTileProps {
  value: number;
  label: string;
  colorScheme: TileColorScheme;
  position: 'left' | 'right' | 'full';
  suffix?: string;
  animate?: boolean;
  /** Delay before count-up starts (ms). Use to sync with entrance animation. */
  countUpDelay?: number;
  style?: StyleProp<ViewStyle>;
}

export function StatTile({
  value,
  label,
  colorScheme,
  position,
  suffix,
  animate = true,
  countUpDelay = 0,
  style: styleProp,
}: StatTileProps) {
  const scheme = TILE_COLORS[colorScheme];

  // Asymmetric corner radii give the row of two tiles a "joined pill"
  // look — outer corners are rounded 15px, inner corners only 5px.
  const borderRadiusStyle = useMemo(() => {
    if (position === 'full') {
      return {
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
      };
    }
    if (position === 'left') {
      return {
        borderTopLeftRadius: 15,
        borderBottomLeftRadius: 15,
        borderTopRightRadius: 5,
        borderBottomRightRadius: 5,
      };
    }
    return {
      borderTopLeftRadius: 5,
      borderBottomLeftRadius: 5,
      borderTopRightRadius: 15,
      borderBottomRightRadius: 15,
    };
  }, [position]);

  return (
    <View
      style={[
        statTileStyles.tile,
        { backgroundColor: scheme.bg },
        borderRadiusStyle,
        styleProp,
      ]}
    >
      <View style={statTileStyles.content}>
        <CountUpText
          target={value}
          textColor={scheme.text}
          animate={animate}
          delay={countUpDelay}
        />
        {suffix ? (
          <Typography
            family="bounded"
            size={14}
            weight="900"
            extraColor={scheme.text}
            style={{ lineHeight: 18, marginTop: 2 }}
          >
            {suffix}
          </Typography>
        ) : null}
      </View>
      <Typography family="onest" size={12} weight="bold" extraColor={scheme.label}>
        {label}
      </Typography>
    </View>
  );
}

const statTileStyles = StyleSheet.create({
  tile: {
    flex: 1,
    height: 80,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
});
