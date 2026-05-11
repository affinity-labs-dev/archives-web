import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, easings, safeDuration } from '@/components/ui/theme';
import {
  CARD_BORDER_RADIUS,
  CARD_BORDER_WIDTH,
  CARD_HEIGHT,
  CARD_SHADOW_OFFSET,
} from './constants';
import { settingsStyles } from './styles';

interface SettingsCardProps {
  children: React.ReactNode;
  surfaceColor?: string;
  shadowColor?: string;
  borderColor?: string;
  onPress?: () => void;
  style?: object;
}

export function SettingsCard({
  children,
  surfaceColor = colors.white,
  shadowColor = colors.blueSecondary,
  borderColor = colors.bluePrimary,
  onPress,
  style: containerStyle,
}: SettingsCardProps) {
  const translateY = useSharedValue(0);

  const surfaceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!onPress) return;
    translateY.value = withSequence(
      withTiming(CARD_SHADOW_OFFSET, {
        duration: safeDuration(140),
        easing: easings.ctaPress,
      }),
      withTiming(-2, {
        duration: safeDuration(105),
        easing: easings.ctaPress,
      }),
      withTiming(0, {
        duration: safeDuration(105),
        easing: easings.ctaPress,
      }),
    );
  }, [onPress, translateY]);

  const Wrapper = onPress ? Pressable : View;
  const wrapperProps = onPress ? { onPress, onPressIn: handlePressIn } : {};

  return (
    <Wrapper {...(wrapperProps as any)} style={containerStyle}>
      <View
        style={[
          settingsStyles.cardContainer,
          { paddingBottom: CARD_SHADOW_OFFSET },
        ]}
      >
        <View
          style={[
            settingsStyles.cardShadow,
            {
              top: CARD_SHADOW_OFFSET,
              borderRadius: CARD_BORDER_RADIUS,
              backgroundColor: shadowColor,
              borderWidth: CARD_BORDER_WIDTH,
              borderColor: borderColor,
            },
          ]}
        />
        <Animated.View
          style={[
            settingsStyles.cardSurface,
            {
              height: CARD_HEIGHT,
              borderRadius: CARD_BORDER_RADIUS,
              backgroundColor: surfaceColor,
              borderWidth: CARD_BORDER_WIDTH,
              borderColor: borderColor,
            },
            surfaceAnimatedStyle,
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Wrapper>
  );
}
