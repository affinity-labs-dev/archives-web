import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { safeDuration } from '@/components/ui/theme';

// Subtle 1.9s in/out breathe — applied to the avatar Image so the
// portrait feels alive even when the user is idle. Yo-yo via withRepeat
// `reverse=true` instead of two timings so the loop direction stays in
// sync if the JS thread pauses.
export function useAvatarBreathe() {
  const breatheScale = useSharedValue(1);
  const breatheY = useSharedValue(0);

  useEffect(() => {
    breatheScale.value = withRepeat(
      withSequence(
        withTiming(1.01, {
          duration: safeDuration(1900),
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: safeDuration(1900),
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );
    breatheY.value = withRepeat(
      withSequence(
        withTiming(-0.5, {
          duration: safeDuration(1900),
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: safeDuration(1900),
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );

    return () => {
      cancelAnimation(breatheScale);
      cancelAnimation(breatheY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useAnimatedStyle(() => ({
    transform: [
      { scale: breatheScale.value },
      { translateY: breatheY.value },
    ],
  }));
}
