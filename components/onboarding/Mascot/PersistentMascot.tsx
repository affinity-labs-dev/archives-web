import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { durations, easings, safeDuration, spacing } from '@/components/ui/theme';

import { Mascot } from './Mascot';
import { MASCOT_SLOT_HEIGHT, MASCOT_SLOT_WIDTH } from './MascotSlot';
import { usePersistentMascotState } from './PersistentMascotContext';

// OnboardingHeader has minHeight: 28 with content max ~22px (back arrow), so
// the rendered height is exactly 28 across all mascot screens.
const HEADER_HEIGHT = 28;
// Each mascot screen wraps content in <View style={styles.body}> with
// paddingTop: spacing.xl. Mirror it so this layout-level Mascot lands on the
// exact spot each in-screen <MascotSlot /> reserves.
const BODY_PADDING_TOP = spacing.xl;

/**
 * Layout-level overlay Mascot that survives navigations between mascot
 * screens. The instance never unmounts, so its breathe + sway loops run
 * uninterrupted. Visibility is refcounted via `useMascotPresence` — the
 * counter never dips to 0 during a transition between two mascot screens,
 * so there's no flicker.
 *
 * First appearance plays the original entrance (slide from x:-120 + fade).
 * Subsequent show/hide cycles only fade — the mascot has earned its place
 * and shouldn't keep sliding back from off-screen between screens.
 */
export function PersistentMascot() {
  const insets = useSafeAreaInsets();
  const { visibleCount } = usePersistentMascotState();

  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-120);
  const hasEnteredOnceRef = useRef(false);

  useEffect(() => {
    if (visibleCount > 0) {
      if (!hasEnteredOnceRef.current) {
        hasEnteredOnceRef.current = true;
        const dur = safeDuration(durations.mascotEntrance);
        opacity.value = withTiming(1, { duration: dur, easing: easings.backOut2 });
        translateX.value = withTiming(0, { duration: dur, easing: easings.backOut2 });
      } else {
        opacity.value = withTiming(1, { duration: 250, easing: easings.power2Out });
      }
    } else {
      opacity.value = withTiming(0, { duration: 250, easing: easings.power2Out });
    }
  }, [visibleCount, opacity, translateX]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.mascotBox,
          {
            top: insets.top + HEADER_HEIGHT + BODY_PADDING_TOP,
            left: spacing.lg,
          },
          animStyle,
        ]}
      >
        <Mascot
          width={MASCOT_SLOT_WIDTH}
          height={MASCOT_SLOT_HEIGHT}
          autoPlayEntrance={false}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  mascotBox: {
    position: 'absolute',
    width: MASCOT_SLOT_WIDTH,
    height: MASCOT_SLOT_HEIGHT,
  },
});
