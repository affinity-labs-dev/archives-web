import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { colors } from '../theme';
import { appleIconSvg, googleIconSvg, emailIconSvg } from '../assets/svgs';

// ─────────────────────────────────────────────
// Button Variant Configs
// ─────────────────────────────────────────────

const BUTTON_RADIUS = 26.5;
const OPTION_RADIUS = 17;
const SHADOW_OFFSET = 4;
const OPTION_SHADOW_OFFSET = 6;

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'tertiary-alt'
  | 'auth-outline'
  | 'auth-google'
  | 'auth-email'
  | 'option-ideal'
  | 'option-selected';

interface ButtonConfig {
  label: string;
  variant: ButtonVariant;
  variantLabel: string;
  description: string;
}

const buttonConfigs: ButtonConfig[] = [
  {
    label: 'CONTINUE',
    variant: 'primary',
    variantLabel: 'Primary',
    description: 'Dark filled CTA with white shadow + border',
  },
  {
    label: 'START MY DAY',
    variant: 'secondary',
    variantLabel: 'Secondary',
    description: 'Purple filled CTA with dark purple shadow',
  },
  {
    label: 'LET\u2019S START',
    variant: 'tertiary',
    variantLabel: 'Tertiary',
    description: 'Blue filled CTA with light blue shadow',
  },
  {
    label: 'LET\u2019S START',
    variant: 'tertiary-alt',
    variantLabel: 'Tertiary Alt',
    description: 'Light blue surface with dark blue shadow',
  },
  {
    label: 'Continue with Apple',
    variant: 'auth-outline',
    variantLabel: 'Auth \u2014 Apple',
    description: 'White outlined CTA with Apple icon',
  },
  {
    label: 'Continue with Google',
    variant: 'auth-google',
    variantLabel: 'Auth \u2014 Google',
    description: 'White outlined CTA with Google icon',
  },
  {
    label: 'Continue with Email',
    variant: 'auth-email',
    variantLabel: 'Auth \u2014 Email',
    description: 'White outlined CTA with email icon',
  },
  {
    label: 'Connect with heritage',
    variant: 'option-ideal',
    variantLabel: 'Option \u2014 Ideal',
    description: 'White surface with blue border, blue shadow',
  },
  {
    label: '5 min/day \u00B7 Casual',
    variant: 'option-selected',
    variantLabel: 'Option \u2014 Selected',
    description: 'Blue surface with white border, dark shadow',
  },
];

// ─────────────────────────────────────────────
// 3D Button Component
// ─────────────────────────────────────────────

// Matches onboarding: 0→6px down (40%), overshoot -2px (70%), settle 0 (100%)
const PRESS_EASING = Easing.bezier(0.25, 0.46, 0.45, 0.94);
const PRESS_DURATION = 350;

function PlaygroundButton({ variant, label }: { variant: ButtonVariant; label: string }) {
  const { width: screenWidth } = useWindowDimensions();
  const isOption = variant === 'option-ideal' || variant === 'option-selected';
  const radius = isOption ? OPTION_RADIUS : BUTTON_RADIUS;
  const offset = isOption ? OPTION_SHADOW_OFFSET : SHADOW_OFFSET;

  const shadowStyle = getShadowStyle(variant, radius);
  const surfaceStyle = getSurfaceStyle(variant, radius);
  const textStyle = getTextStyle(variant);
  const isAuth = variant === 'auth-outline' || variant === 'auth-google' || variant === 'auth-email';
  const showShadow = !isAuth;

  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const surfaceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const authAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    if (isAuth) {
      // Auth: scale down then bounce back
      scale.value = withSequence(
        withTiming(0.96, { duration: PRESS_DURATION * 0.4, easing: PRESS_EASING }),
        withTiming(1.02, { duration: PRESS_DURATION * 0.3, easing: PRESS_EASING }),
        withTiming(1, { duration: PRESS_DURATION * 0.3, easing: PRESS_EASING }),
      );
    } else {
      // 3D buttons: press down 6px, overshoot -2px, settle 0
      translateY.value = withSequence(
        withTiming(6, { duration: PRESS_DURATION * 0.4, easing: PRESS_EASING }),
        withTiming(-2, { duration: PRESS_DURATION * 0.3, easing: PRESS_EASING }),
        withTiming(0, { duration: PRESS_DURATION * 0.3, easing: PRESS_EASING }),
      );
    }
  };

  const onPressOut = () => {
    // Animation is self-completing via withSequence, no action needed
  };

  // Responsive max widths: keep original sizes as max, but allow shrinking
  const maxButtonWidth = isAuth ? 339 : isOption ? 300 : 327;
  const containerWidth = Math.min(maxButtonWidth, screenWidth - 48);

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
      <View style={[styles.buttonContainer, { width: containerWidth, height: (isOption ? 49 : 45) + offset }]}>
        {/* Shadow layer (behind) */}
        {showShadow && (
          <View style={[styles.shadowLayer, { top: offset, borderRadius: radius }, shadowStyle]} />
        )}

        {/* Surface layer (front) — animated */}
        <Animated.View style={[styles.surfaceLayer, { borderRadius: radius }, surfaceStyle, isAuth ? authAnimatedStyle : surfaceAnimatedStyle]}>
          {variant === 'auth-outline' && (
            <SvgXml xml={appleIconSvg} width={15} height={18} />
          )}
          {variant === 'auth-google' && (
            <SvgXml xml={googleIconSvg} width={18} height={18} />
          )}
          {variant === 'auth-email' && (
            <SvgXml xml={emailIconSvg} width={20} height={16} />
          )}
          <Text style={[styles.buttonText, textStyle]}>{label}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

function getShadowStyle(variant: ButtonVariant, radius: number) {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.onyx,
        borderRadius: radius,
      };
    case 'secondary':
      return { backgroundColor: '#3E2368' };
    case 'tertiary':
      return { backgroundColor: '#A2C5FF' };
    case 'tertiary-alt':
      return { backgroundColor: '#1E3C88' };
    case 'option-ideal':
      return {
        backgroundColor: '#A2C5FF',
        borderWidth: 1.5,
        borderColor: '#1E3C88',
      };
    case 'option-selected':
      return { backgroundColor: '#1E3C88' };
    default:
      return {};
  }
}

function getSurfaceStyle(variant: ButtonVariant, radius: number) {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: colors.onyx,
        borderWidth: 1,
        borderColor: colors.onyx,
      };
    case 'secondary':
      return { backgroundColor: '#8C60CD' };
    case 'tertiary':
      return { backgroundColor: '#1E3C88' };
    case 'tertiary-alt':
      return { backgroundColor: '#A2C5FF' };
    case 'auth-outline':
    case 'auth-google':
    case 'auth-email':
      return {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: colors.onyx,
      };
    case 'option-ideal':
      return {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#1E3C88',
      };
    case 'option-selected':
      return {
        backgroundColor: '#A2C5FF',
        borderWidth: 1.5,
        borderColor: '#FAFAFA',
      };
    default:
      return {};
  }
}

function getTextStyle(variant: ButtonVariant) {
  const isOption = variant === 'option-ideal' || variant === 'option-selected';

  if (isOption) {
    return {
      color: colors.onyx,
      fontSize: 16,
      fontWeight: '600' as const,
      letterSpacing: 0,
    };
  }

  if (variant === 'auth-outline' || variant === 'auth-google' || variant === 'auth-email') {
    return {
      color: colors.onyx,
      fontSize: 20,
      fontWeight: '500' as const,
      letterSpacing: -0.2,
      lineHeight: 20,
    };
  }

  if (variant === 'tertiary-alt') {
    return {
      color: colors.onyx,
      fontSize: 18,
      fontWeight: '700' as const,
      letterSpacing: -0.18,
    };
  }

  return {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.18,
  };
}

// ─────────────────────────────────────────────
// Section Badge
// ─────────────────────────────────────────────

function SectionBadge({ label, description }: { label: string; description?: string }) {
  return (
    <View style={styles.sectionBadgeRow}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{label}</Text>
      </View>
      {description ? (
        <Text style={styles.badgeDescription}>{description}</Text>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────
// Buttons Section
// ─────────────────────────────────────────────

export default function ButtonsSection() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>BUTTONS</Text>
        <Text style={styles.subtitle}>
          All button variants with 3D drop-shadow depth effect. Shadow is a separate layer offset behind the surface.
        </Text>
      </View>

      <View style={styles.divider} />

      {/* CTA Buttons */}
      <SectionBadge
        label="CTA Buttons"
        description="Primary actions with 3D depth shadow."
      />

      {buttonConfigs.slice(0, 4).map((btn) => (
        <View key={btn.variant} style={styles.buttonRow}>
          <View style={styles.buttonMeta}>
            <Text style={styles.variantLabel}>{btn.variantLabel}</Text>
            <Text style={styles.variantDesc}>{btn.description}</Text>
          </View>
          <View style={styles.buttonPreview}>
            <PlaygroundButton variant={btn.variant} label={btn.label} />
          </View>
        </View>
      ))}

      <View style={styles.divider} />

      {/* Auth Button */}
      <SectionBadge
        label="Auth"
        description="Authentication buttons with icon."
      />

      {buttonConfigs.slice(4, 7).map((btn) => (
        <View key={btn.variant} style={styles.buttonRow}>
          <View style={styles.buttonMeta}>
            <Text style={styles.variantLabel}>{btn.variantLabel}</Text>
            <Text style={styles.variantDesc}>{btn.description}</Text>
          </View>
          <View style={styles.buttonPreview}>
            <PlaygroundButton variant={btn.variant} label={btn.label} />
          </View>
        </View>
      ))}

      <View style={styles.divider} />

      {/* Option Buttons */}
      <SectionBadge
        label="Options"
        description="Selection buttons for onboarding choices."
      />

      {buttonConfigs.slice(7).map((btn) => (
        <View key={btn.variant} style={styles.buttonRow}>
          <View style={styles.buttonMeta}>
            <Text style={styles.variantLabel}>{btn.variantLabel}</Text>
            <Text style={styles.variantDesc}>{btn.description}</Text>
          </View>
          <View style={styles.buttonPreview}>
            <PlaygroundButton variant={btn.variant} label={btn.label} />
          </View>
        </View>
      ))}

      {/* Specs Reference */}
      <View style={styles.specsCard}>
        <Text style={styles.specsTitle}>Button Specs</Text>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>CTA radius</Text>
          <Text style={styles.specValue}>{BUTTON_RADIUS}px</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Option radius</Text>
          <Text style={styles.specValue}>{OPTION_RADIUS}px</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>CTA shadow offset</Text>
          <Text style={styles.specValue}>{SHADOW_OFFSET}px</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Option shadow offset</Text>
          <Text style={styles.specValue}>{OPTION_SHADOW_OFFSET}px</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Padding (x / y)</Text>
          <Text style={styles.specValue}>22px / 10px</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Font (CTA)</Text>
          <Text style={styles.specValue}>Onest Bold 18</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Font (Option)</Text>
          <Text style={styles.specValue}>Onest SemiBold 16</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Font (Auth)</Text>
          <Text style={styles.specValue}>Onest Medium 20</Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 32,
  },

  // Header
  header: {
    gap: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.onyx,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B6B6B',
    lineHeight: 20,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
  },

  // Section Badge
  sectionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  badge: {
    backgroundColor: '#1E3C88',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.14,
  },
  badgeDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
    flexShrink: 1,
  },

  // Button Row
  buttonRow: {
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  buttonMeta: {
    gap: 2,
  },
  variantLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onyx,
  },
  variantDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: '#737373',
  },
  buttonPreview: {
    alignItems: 'center',
    paddingVertical: 8,
  },

  // 3D Button
  buttonContainer: {
    width: '100%',
    maxWidth: 327,
    position: 'relative',
    alignSelf: 'center',
  },
  shadowLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    bottom: 0,
  },
  surfaceLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 10,
    gap: 8,
  },
  buttonText: {
    textAlign: 'center',
  },

  // Specs Card
  specsCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  specsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onyx,
    marginBottom: 4,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#737373',
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onyx,
    fontVariant: ['tabular-nums'],
  },
});
