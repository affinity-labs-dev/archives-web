// ActionPill — blue-on-blue stacked DepthButton used for the two
// "Understand your answers" / "Chat to learn more" rows. White surface,
// blueSecondary shadow, 1.5px bluePrimary border. Icon on the left,
// label flex-grow, chevron on the right. Press feedback is the standard
// DepthButton dip.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DepthButton, Typography, colors } from '@/components/ui';

interface ActionPillProps {
  icon: 'bulb' | 'chat';
  label: string;
  onPress: () => void;
}

export function ActionPill({ icon, label, onPress }: ActionPillProps) {
  const iconName = icon === 'bulb' ? 'bulb' : 'chatbubble-ellipses';
  return (
    <DepthButton
      variant="tertiary-alt"
      size="medium"
      surfaceColor="white"
      shadowColor="blueSecondary"
      borderColor="bluePrimary"
      onPress={onPress}
      surfaceStyle={styles.pillSurface}
      haptic="light"
    >
      <View style={styles.pillRow}>
        <Ionicons name={iconName} size={22} color={colors.bluePrimary} />
        <Typography
          family="onest"
          size="md"
          weight="600"
          style={styles.pillLabel}
        >
          {label}
        </Typography>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.bluePrimary}
        />
      </View>
    </DepthButton>
  );
}

const styles = StyleSheet.create({
  pillSurface: {
    paddingHorizontal: 18,
  },
  pillRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillLabel: {
    flex: 1,
    color: colors.onyx,
    marginLeft: 12,
  },
});
