import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { safeDuration } from '@/components/ui/theme';

interface LiftPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
}

// Hover-lift on web + press feedback on mobile. The hover handlers are
// no-ops on native (RN passes them through), so the same component
// works across platforms without branching.
export function LiftPressable({ children, onPress }: LiftPressableProps) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Pressable
      onHoverIn={() => {
        translateY.value = withTiming(-3, { duration: safeDuration(160) });
        scale.value = withTiming(1.04, { duration: safeDuration(160) });
      }}
      onHoverOut={() => {
        translateY.value = withSpring(0, { damping: 12, stiffness: 200 });
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
      onPress={() => {
        scale.value = withSequence(
          withTiming(0.97, { duration: safeDuration(100) }),
          withSpring(1, { damping: 12, stiffness: 200 }),
        );
        onPress?.();
      }}
    >
      <Animated.View style={style}>{children}</Animated.View>
    </Pressable>
  );
}
