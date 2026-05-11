import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { DepthButton } from '@/components/ui/DepthButton';
import { Typography } from '@/components/ui/Typography';

export type AuthProvider = 'apple' | 'google' | 'email';

export interface AuthButtonProps {
  provider: AuthProvider;
  onPress: () => void;
  isDisabled?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

const providerLabels: Record<AuthProvider, string> = {
  apple: 'Continue with Apple',
  google: 'Continue with Google',
  email: 'Continue with Email',
};

function AppleIconSlot() {
  return <View style={[styles.icon, styles.appleIcon]} />;
}

function GoogleIconSlot() {
  return <View style={[styles.icon, styles.googleIcon]} />;
}

function EmailIconSlot() {
  return <View style={[styles.icon, styles.emailIcon]} />;
}

const iconMap: Record<AuthProvider, React.ComponentType> = {
  apple: AppleIconSlot,
  google: GoogleIconSlot,
  email: EmailIconSlot,
};

/**
 * AuthButton — thin wrapper around DepthButton for OAuth/email sign-in.
 * Outline variant with provider icon + localized label.
 *
 * Note: icons are currently placeholder `<View>` slots. Replace with actual
 * SVG imports from DesignPlayground/assets/svgs.ts before shipping.
 */
export function AuthButton({
  provider,
  onPress,
  isDisabled,
  label,
  style,
}: AuthButtonProps) {
  const IconComponent = iconMap[provider];
  const resolvedLabel = label ?? providerLabels[provider];

  return (
    <DepthButton
      variant="outline"
      size="large"
      onPress={onPress}
      isDisabled={isDisabled}
      leftIcon={<IconComponent />}
      style={style}
    >
      <Typography variant="label.l" color="onyx">
        {resolvedLabel}
      </Typography>
    </DepthButton>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 20,
    height: 20,
  },
  appleIcon: {
    backgroundColor: '#000',
    borderRadius: 4,
  },
  googleIcon: {
    backgroundColor: '#4285F4',
    borderRadius: 10,
  },
  emailIcon: {
    backgroundColor: '#EA4335',
    borderRadius: 4,
  },
});
