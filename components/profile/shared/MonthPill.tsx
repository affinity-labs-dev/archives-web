import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Typography } from '@/components/ui/Typography';
import { colors, easings, radius, safeDuration } from '@/components/ui/theme';

interface MonthPillProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

export function MonthPill({ label, isSelected, onPress }: MonthPillProps) {
  const fillScale = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    fillScale.value = withTiming(isSelected ? 1 : 0, {
      duration: safeDuration(450),
      easing: easings.power2Out,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelected]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fillScale.value }],
    opacity: fillScale.value,
  }));

  return (
    <TouchableOpacity style={pillStyles.pill} onPress={onPress} activeOpacity={0.7}>
      <Animated.View
        style={[pillStyles.fill, { backgroundColor: colors.bluePrimary }, fillStyle]}
      />
      <Typography
        family="onest"
        size={13}
        weight="600"
        color={isSelected ? 'snow' : 'onyx'}
        style={{ zIndex: 1 }}
      >
        {label}
      </Typography>
    </TouchableOpacity>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.concreteGrey,
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
    transformOrigin: 'left center',
  },
});
