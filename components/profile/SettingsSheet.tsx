import React, { useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Typography } from '@/components/ui';
import { AnimatedEntrance, StaggerGroup } from '@/components/ui/animations';
import {
  colors,
  spacing,
  easings,
  safeDuration,
} from '@/components/ui/theme';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  // Toggle states from PreferencesContext
  backgroundMusicEnabled: boolean;
  soundEffectsEnabled: boolean;
  hapticsEnabled: boolean;
  onToggleBackgroundMusic: (value: boolean) => void;
  onToggleSoundEffects: (value: boolean) => void;
  onToggleHaptics: (value: boolean) => void;
  // Navigation handlers
  onPrivacyPolicy: () => void;
  onSupport: () => void;
  onFAQ: () => void;
  onManageSubscription: () => void;
  onDeleteAccount: () => void;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const CARD_HORIZONTAL_MARGIN = 30;
const CARD_HEIGHT = 68;
const CARD_BORDER_RADIUS = 17;
const CARD_BORDER_WIDTH = 1.5;
const CARD_SHADOW_OFFSET = 8;
const TOGGLE_WIDTH = 38;
const TOGGLE_HEIGHT = 23;
const TOGGLE_BORDER_RADIUS = 11.5;
const TOGGLE_KNOB_SIZE = 18;
const TOGGLE_KNOB_TRAVEL = 15;

const DELETE_CONFIRM_WINDOW_MS = 3000;

// ─────────────────────────────────────────────
// Toggle Switch (inline implementation)
// ─────────────────────────────────────────────

function ToggleSwitch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (newValue: boolean) => void;
}) {
  const knobPosition = useSharedValue(value ? TOGGLE_KNOB_TRAVEL : 0);
  const bgProgress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    knobPosition.value = withTiming(value ? TOGGLE_KNOB_TRAVEL : 0, {
      duration: safeDuration(220),
      easing: easings.backOut2,
    });
    bgProgress.value = withTiming(value ? 1 : 0, {
      duration: safeDuration(260),
      easing: easings.power2Out,
    });
  }, [value, knobPosition, bgProgress]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      [colors.concreteGrey, colors.bluePrimary],
    ),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knobPosition.value }],
  }));

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  }, [value, onValueChange]);

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Animated.View style={[styles.togglePill, pillStyle]}>
        <Animated.View style={[styles.toggleKnob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────
// Card shell (shadow + surface pattern)
// ─────────────────────────────────────────────

function SettingsCard({
  children,
  surfaceColor = colors.white,
  shadowColor = colors.blueSecondary,
  onPress,
  style: containerStyle,
}: {
  children: React.ReactNode;
  surfaceColor?: string;
  shadowColor?: string;
  onPress?: () => void;
  style?: object;
}) {
  const translateY = useSharedValue(0);

  const surfaceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!onPress) return;
    translateY.value = withSequence(
      withTiming(CARD_SHADOW_OFFSET, {
        duration: safeDuration(140),
        easing: easings.ctaPress,
      }),
      withTiming(-2, {
        duration: safeDuration(105),
        easing: easings.ctaPress,
      }),
      withTiming(0, {
        duration: safeDuration(105),
        easing: easings.ctaPress,
      }),
    );
  }, [onPress, translateY]);

  const Wrapper = onPress ? Pressable : View;
  const wrapperProps = onPress
    ? { onPress, onPressIn: handlePressIn }
    : {};

  return (
    <Wrapper {...(wrapperProps as any)} style={containerStyle}>
      <View
        style={[
          styles.cardContainer,
          { paddingBottom: CARD_SHADOW_OFFSET },
        ]}
      >
        {/* Shadow layer */}
        <View
          style={[
            styles.cardShadow,
            {
              top: CARD_SHADOW_OFFSET,
              borderRadius: CARD_BORDER_RADIUS,
              backgroundColor: shadowColor,
              borderWidth: CARD_BORDER_WIDTH,
              borderColor: colors.bluePrimary,
            },
          ]}
        />
        {/* Surface layer */}
        <Animated.View
          style={[
            styles.cardSurface,
            {
              height: CARD_HEIGHT,
              borderRadius: CARD_BORDER_RADIUS,
              backgroundColor: surfaceColor,
              borderWidth: CARD_BORDER_WIDTH,
              borderColor: colors.bluePrimary,
            },
            surfaceAnimatedStyle,
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Wrapper>
  );
}

// ─────────────────────────────────────────────
// Toggle Row
// ─────────────────────────────────────────────

function ToggleRow({
  iconName,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (newValue: boolean) => void;
}) {
  return (
    <SettingsCard style={styles.rowWrapper}>
      <View style={styles.rowContent}>
        <View style={styles.rowLeft}>
          <Ionicons name={iconName} size={24} color="#1E3C88" />
          <View style={styles.textStack}>
            <Typography
              family="onest"
              weight="600"
              size={16}
              color="onyx"
            >
              {title}
            </Typography>
            <Typography
              family="onest"
              weight="500"
              size={12}
              color="onyx"
              style={{ opacity: 0.72 }}
            >
              {subtitle}
            </Typography>
          </View>
        </View>
        <ToggleSwitch value={value} onValueChange={onValueChange} />
      </View>
    </SettingsCard>
  );
}

// ─────────────────────────────────────────────
// Nav Row
// ─────────────────────────────────────────────

function NavRow({
  iconName,
  title,
  onPress,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  return (
    <SettingsCard onPress={onPress} style={styles.rowWrapper}>
      <View style={styles.rowContent}>
        <View style={styles.rowLeft}>
          <Ionicons name={iconName} size={22} color="#1E3C88" />
          <Typography
            family="onest"
            weight="600"
            size={14}
            color="onyx"
          >
            {title}
          </Typography>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#C3C3C3" />
      </View>
    </SettingsCard>
  );
}

// ─────────────────────────────────────────────
// Delete Account Row
// ─────────────────────────────────────────────

function DeleteAccountRow({ onDelete }: { onDelete: () => void }) {
  const lastTapRef = useRef<number>(0);
  const wobbleRotation = useSharedValue(0);

  const wobbleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wobbleRotation.value}deg` }],
  }));

  const handlePress = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastTapRef.current;

    if (elapsed < DELETE_CONFIRM_WINDOW_MS && lastTapRef.current !== 0) {
      // Second tap within window — fire deletion
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      lastTapRef.current = 0;
      onDelete();
    } else {
      // First tap — wobble animation
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      lastTapRef.current = now;

      wobbleRotation.value = withSequence(
        withTiming(1.2, {
          duration: safeDuration(80),
          easing: easings.power2Out,
        }),
        withTiming(-1.2, {
          duration: safeDuration(80),
          easing: easings.power2InOut,
        }),
        withTiming(1.0, {
          duration: safeDuration(70),
          easing: easings.power2InOut,
        }),
        withTiming(-0.8, {
          duration: safeDuration(70),
          easing: easings.power2InOut,
        }),
        withTiming(0, {
          duration: safeDuration(100),
          easing: easings.power2Out,
        }),
      );
    }
  }, [onDelete, wobbleRotation]);

  return (
    <Animated.View style={wobbleStyle}>
      <SettingsCard
        surfaceColor={colors.incorrectTertiary}
        shadowColor={colors.incorrectSecondary}
        onPress={handlePress}
        style={styles.rowWrapper}
      >
        <View style={styles.rowContent}>
          <View style={styles.rowLeft}>
            <Ionicons name="trash-outline" size={22} color="#C82A4B" />
            <Typography
              family="onest"
              weight="600"
              size={14}
              color="incorrectPrimary"
            >
              Delete Account
            </Typography>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C82A4B" />
        </View>
      </SettingsCard>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────
// Divider with scaleX entrance
// ─────────────────────────────────────────────

function AnimatedDivider() {
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
        styles.divider,
        { transformOrigin: 'left center' },
        dividerStyle,
      ]}
    />
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export function SettingsSheet({
  visible,
  onClose,
  backgroundMusicEnabled,
  soundEffectsEnabled,
  hapticsEnabled,
  onToggleBackgroundMusic,
  onToggleSoundEffects,
  onToggleHaptics,
  onPrivacyPolicy,
  onSupport,
  onFAQ,
  onManageSubscription,
  onDeleteAccount,
}: SettingsSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.md,
          },
        ]}
      >
        {/* Close button */}
        <AnimatedEntrance
          preset={{
            scale: { from: 0.85, to: 1 },
            rotate: { from: -15, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 450,
            easing: easings.backOut2,
          }}
          delay={120}
          style={styles.closeButtonWrapper}
        >
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close settings"
          >
            <Ionicons name="close-circle-outline" size={36} color="#1A1A1A" />
          </Pressable>
        </AnimatedEntrance>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Toggle rows */}
          <StaggerGroup
            preset="fadeScale"
            baseDelay={220}
            staggerInterval={90}
          >
            <ToggleRow
              iconName="musical-notes-outline"
              title="Background Music"
              subtitle="Plays ambient music during lessons"
              value={backgroundMusicEnabled}
              onValueChange={onToggleBackgroundMusic}
            />
            <ToggleRow
              iconName="volume-high-outline"
              title="Sound Effects"
              subtitle="Quiz sounds and UI feedback"
              value={soundEffectsEnabled}
              onValueChange={onToggleSoundEffects}
            />
            <ToggleRow
              iconName="phone-portrait-outline"
              title="Vibration"
              subtitle="Haptic feedback on interactions"
              value={hapticsEnabled}
              onValueChange={onToggleHaptics}
            />
          </StaggerGroup>

          {/* Divider */}
          <AnimatedDivider />

          {/* Nav rows */}
          <StaggerGroup
            preset="fadeScale"
            baseDelay={740}
            staggerInterval={80}
          >
            <NavRow
              iconName="shield-checkmark-outline"
              title="Privacy Policy"
              onPress={onPrivacyPolicy}
            />
            <NavRow
              iconName="help-circle-outline"
              title="Support"
              onPress={onSupport}
            />
            <NavRow
              iconName="chatbox-ellipses-outline"
              title="FAQ"
              onPress={onFAQ}
            />
            <NavRow
              iconName="card-outline"
              title="Manage Subscription"
              onPress={onManageSubscription}
            />
          </StaggerGroup>

          {/* Delete Account */}
          <AnimatedEntrance
            preset="fadeScale"
            delay={1200}
          >
            <DeleteAccountRow onDelete={onDeleteAccount} />
          </AnimatedEntrance>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  closeButtonWrapper: {
    marginLeft: CARD_HORIZONTAL_MARGIN,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: CARD_BORDER_WIDTH,
    borderColor: colors.bluePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  rowWrapper: {
    marginHorizontal: CARD_HORIZONTAL_MARGIN,
    marginBottom: spacing.sm,
  },
  cardContainer: {
    position: 'relative',
  },
  cardShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4, // 12px
    flex: 1,
  },
  textStack: {
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  togglePill: {
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    borderRadius: TOGGLE_BORDER_RADIUS,
    justifyContent: 'center',
    paddingLeft: 2.5,
  },
  toggleKnob: {
    width: TOGGLE_KNOB_SIZE,
    height: TOGGLE_KNOB_SIZE,
    borderRadius: TOGGLE_KNOB_SIZE / 2,
    backgroundColor: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: colors.bluePrimary,
    marginHorizontal: CARD_HORIZONTAL_MARGIN,
    marginVertical: spacing.md,
  },
});
