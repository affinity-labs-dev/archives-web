import React from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import { DepthButton } from '@/components/ui/DepthButton';
import { Typography } from '@/components/ui/Typography';
import { durations, easings, safeDuration } from '@/components/ui/theme';

import type { OptionCardProps } from './OptionCard.types';

/**
 * OptionCard — selectable card variant of DepthButton.
 *
 * Entrance: slides in from right with rotation (back.out(1.4), 550ms, 80ms stagger).
 * Selected state swaps surface + shadow colors.
 *
 * Managed by `OptionList` for orchestrated entrance/exit. Can be used standalone.
 */
export function OptionCard({
  label,
  isSelected,
  onPress,
  animationIndex = 0,
  animateIn = true,
  exitSignal = false,
  style,
  isDisabled,
}: OptionCardProps) {
  const translateX = useSharedValue(animateIn ? 400 : 0);
  const rotate = useSharedValue(animateIn ? 3 : 0);
  const opacity = useSharedValue(animateIn ? 0 : 1);
  const selectScale = useSharedValue(1);

  React.useEffect(() => {
    if (!animateIn) return;
    const delay = safeDuration(animationIndex * durations.cardStaggerInterval);
    const dur = safeDuration(durations.cardStagger);
    translateX.value = withDelay(delay, withTiming(0, { duration: dur, easing: easings.backOut14 }));
    rotate.value = withDelay(delay, withTiming(0, { duration: dur, easing: easings.backOut14 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: dur, easing: easings.backOut14 }));
  }, [animateIn, animationIndex, translateX, rotate, opacity]);

  React.useEffect(() => {
    if (!exitSignal) return;
    const delay = safeDuration(animationIndex * durations.cardExitInterval);
    const dur = safeDuration(durations.cardExit);
    translateX.value = withDelay(delay, withTiming(-500, { duration: dur, easing: easings.power3In }));
    rotate.value = withDelay(delay, withTiming(-8, { duration: dur, easing: easings.power3In }));
    opacity.value = withDelay(delay, withTiming(0, { duration: dur, easing: easings.power3In }));
  }, [exitSignal, animationIndex, translateX, rotate, opacity]);

  React.useEffect(() => {
    selectScale.value = withSequence(
      withTiming(0.97, { duration: safeDuration(80), easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: safeDuration(180), easing: Easing.out(Easing.elastic(1)) }),
    );
  }, [isSelected, selectScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
      { scale: selectScale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <DepthButton
        variant={isSelected ? 'tertiary' : 'tertiary-alt'}
        size="medium"
        surfaceColor={isSelected ? 'blueSecondary' : 'white'}
        shadowColor={isSelected ? 'bluePrimary' : 'blueSecondary'}
        borderColor={isSelected ? 'snow' : 'bluePrimary'}
        pressEffect="none"
        onPress={onPress}
        isDisabled={isDisabled}
      >
        <Typography variant="label.s" color="onyx">
          {label}
        </Typography>
      </DepthButton>
    </Animated.View>
  );
}
