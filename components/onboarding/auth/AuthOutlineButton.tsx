import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors } from '@/components/ui/theme';

export interface AuthOutlineButtonProps {
  /** Text label shown right of the icon. */
  label: string;

  /** Optional icon node (e.g., `<SvgXml ... />` or `<Ionicons ... />`). */
  icon?: React.ReactNode;

  onPress?: () => void;

  /** Dims + disables interaction. */
  isDisabled?: boolean;

  /**
   * Smaller horizontal padding + gap. Used for the 148px Log In / Sign Up
   * toggle row on Screen 7. Default `false` (full-width social-button spacing).
   */
  compact?: boolean;

  style?: StyleProp<ViewStyle>;
}

/**
 * AuthOutlineButton — 2px-border outline pill button used on Screen 7 (Create
 * Account) for the Log In / Sign Up toggle and "Continue with Email" social
 * slot. Matches Figma 3421:7503 spec.
 *
 * Visual: 48px tall, rounded 27, 2px solid black border, white surface,
 * 20px Onest Medium label (onyx), optional icon slot.
 */
export function AuthOutlineButton({
  label,
  icon,
  onPress,
  isDisabled,
  compact = false,
  style,
}: AuthOutlineButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        compact ? styles.buttonCompact : styles.buttonFull,
        pressed && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
      <Typography
        size={20}
        weight="500"
        color="onyx"
        letterSpacing={-0.2}
        style={styles.label}
      >
        {label}
      </Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 27,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFull: {
    paddingHorizontal: 22,
    gap: 10,
  },
  buttonCompact: {
    paddingHorizontal: 16,
    gap: 5,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {},
});
