import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Typography } from '@/components/ui/Typography';
import { colors, spacing } from '@/components/ui/theme';

export interface AuthInputProps
  extends Omit<
    TextInputProps,
    'style' | 'value' | 'onChangeText' | 'placeholderTextColor' | 'secureTextEntry'
  > {
  /** Label shown above the input. */
  label: string;

  value: string;
  onChangeText: (text: string) => void;

  /** Placeholder shown when empty. Rendered in concreteGrey to match Figma. */
  placeholder?: string;

  /**
   * When true, masks input and renders a trailing eye toggle button.
   * State is owned internally — caller doesn't need to manage visibility.
   */
  isPassword?: boolean;

  /**
   * Optional node rendered at the right edge of the label row — used for
   * the "Forgot password?" link on the Login screen's password field.
   */
  rightSlot?: React.ReactNode;

  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

/**
 * AuthInput — label + bordered input field matching Figma login/signup
 * screens (3645:5390, 3645:5412).
 *
 * Visual: 50px tall input, 1.5px bluePrimary border, rounded 17, white bg.
 * Label above (Onest SemiBold 16 onyx). Placeholder in concreteGrey.
 *
 * Password mode toggles a built-in eye icon on the right to reveal text.
 */
export function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  isPassword = false,
  rightSlot,
  containerStyle,
  inputStyle,
  ...textInputProps
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={containerStyle}>
      <View style={styles.labelRow}>
        <Typography size="md" weight="600" color="onyx">
          {label}
        </Typography>
        {rightSlot}
      </View>

      <View style={styles.inputCard}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.concreteGrey}
          secureTextEntry={isPassword && !showPassword}
          autoCorrect={false}
          style={[styles.input, inputStyle]}
          {...textInputProps}
        />
        {isPassword && (
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            hitSlop={10}
            style={styles.eyeButton}
          >
            <Ionicons
              name={showPassword ? 'eye' : 'eye-off'}
              size={20}
              color={colors.concreteGrey}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  inputCard: {
    height: 50,
    borderWidth: 1.5,
    borderColor: colors.bluePrimary,
    borderRadius: 17,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Onest-SemiBold',
    color: colors.onyx,
    padding: 0,
  },
  eyeButton: {
    marginLeft: 10,
  },
});
