import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { easings, safeDuration } from '@/components/ui/theme';
import { settingsStyles } from './styles';

export function AnimatedDivider() {
  const scaleX = useSharedValue(0);

  useEffect(() => {
    scaleX.value = withDelay(
      safeDuration(650),
      withTiming(1, {
        duration: safeDuration(400),
        easing: easings.power2Out,
      }),
    );
  }, [scaleX]);

  const dividerStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleX.value }],
  }));

  return (
    <Animated.View
      style={[
        settingsStyles.divider,
        { transformOrigin: 'left center' },
        dividerStyle,
      ]}
    />
  );
}
