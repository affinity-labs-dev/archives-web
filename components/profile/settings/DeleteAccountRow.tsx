import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Typography } from '@/components/ui/Typography';
import { colors, easings, safeDuration } from '@/components/ui/theme';
import { SettingsCard } from './SettingsCard';
import { iconChevRow, iconTrash, svgIcon } from './icons';
import { settingsStyles } from './styles';
import { DELETE_CONFIRM_WINDOW_MS } from './constants';

interface DeleteAccountRowProps {
  onDelete: () => void;
}

export function DeleteAccountRow({ onDelete }: DeleteAccountRowProps) {
  // Two-tap-within-window confirmation. The lastTapRef + window check is
  // deliberately not lifted to state — we never want a re-render between
  // the first and second tap.
  const lastTapRef = useRef<number>(0);
  const wobbleRotation = useSharedValue(0);

  const wobbleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wobbleRotation.value}deg` }],
  }));

  const handlePress = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastTapRef.current;

    if (elapsed < DELETE_CONFIRM_WINDOW_MS && lastTapRef.current !== 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      lastTapRef.current = 0;
      onDelete();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      lastTapRef.current = now;

      wobbleRotation.value = withSequence(
        withTiming(1.2, { duration: safeDuration(80), easing: easings.power2Out }),
        withTiming(-1.2, { duration: safeDuration(80), easing: easings.power2InOut }),
        withTiming(1.0, { duration: safeDuration(70), easing: easings.power2InOut }),
        withTiming(-0.8, { duration: safeDuration(70), easing: easings.power2InOut }),
        withTiming(0, { duration: safeDuration(100), easing: easings.power2Out }),
      );
    }
  }, [onDelete, wobbleRotation]);

  return (
    <Animated.View style={wobbleStyle}>
      <SettingsCard
        surfaceColor={colors.incorrectTertiary}
        shadowColor={colors.incorrectSecondary}
        borderColor={colors.incorrectSecondary}
        onPress={handlePress}
        style={settingsStyles.rowWrapper}
      >
        <View style={settingsStyles.rowContent}>
          <View style={settingsStyles.rowLeft}>
            {svgIcon(iconTrash(colors.incorrectSecondary), 22, 24)}
            <Typography family="onest" weight="600" size={14} color="onyx">
              Delete Account
            </Typography>
          </View>
          {svgIcon(iconChevRow(colors.incorrectSecondary), 10, 18)}
        </View>
      </SettingsCard>
    </Animated.View>
  );
}
