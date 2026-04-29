import React, { useCallback, useEffect } from 'react';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, easings, safeDuration } from '@/components/ui/theme';
import { TOGGLE_KNOB_TRAVEL } from './constants';
import { settingsStyles } from './styles';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (newValue: boolean) => void;
}

export function ToggleSwitch({ value, onValueChange }: ToggleSwitchProps) {
  const knobPosition = useSharedValue(value ? TOGGLE_KNOB_TRAVEL : 0);
  const bgProgress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    knobPosition.value = withTiming(value ? TOGGLE_KNOB_TRAVEL : 0, {
      duration: safeDuration(220),
      easing: easings.backOut2,
    });
    bgProgress.value = withTiming(value ? 1 : 0, {
      duration: safeDuration(260),
      easing: easings.power2Out,
    });
  }, [value, knobPosition, bgProgress]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      [colors.concreteGrey, colors.bluePrimary],
    ),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knobPosition.value }],
  }));

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  }, [value, onValueChange]);

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Animated.View style={[settingsStyles.togglePill, pillStyle]}>
        <Animated.View style={[settingsStyles.toggleKnob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}
