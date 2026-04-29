import React from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedEntrance } from '@/components/ui/animations/AnimatedEntrance';
import { StaggerGroup } from '@/components/ui/animations/StaggerGroup';
import type { EntranceConfig } from '@/components/ui/animations';
import { colors, easings } from '@/components/ui/theme';

import { AnimatedDivider } from './AnimatedDivider';
import { DeleteAccountRow } from './DeleteAccountRow';
import { NavRow } from './NavRow';
import { ToggleRow } from './ToggleRow';
import {
  iconBgMusic,
  iconCard,
  iconChatFaq,
  iconQuestion,
  iconSfx,
  iconShield,
  iconVibrate,
  svgIcon,
} from './icons';
import { settingsStyles } from './styles';

// Cascade timing matches the mock at
// ~/Downloads/05 profile and settings/index.html (enterSettings):
//  - backdrop fade + sheet slide at t=0 (sheet slide handled by RN Modal)
//  - close button: scale 0.85→1, rotate -15→0, opacity 0→1, 450ms,
//    back.out(1.7), t=300ms
//  - rows (toggles + nav + delete): y 28→0, scale 0.96→1, opacity 0→1,
//    500ms, back.out(1.4), 90ms stagger starting t=350ms
//  - divider: scaleX 0→1, 400ms, power2.out, t=650ms (handled inside
//    AnimatedDivider)

const ROW_PRESET: EntranceConfig = {
  translateY: { from: 28, to: 0 },
  scale: { from: 0.96, to: 1 },
  opacity: { from: 0, to: 1 },
  duration: 500,
  easing: easings.backOut14,
};

const STAGGER_MS = 90;

// Toggles index 0–2 → delays 350, 440, 530
const TOGGLE_BASE_DELAY = 350;
// Nav rows index 0–3 → delays 620, 710, 800, 890 (continuing the cascade
// after the 3 toggle rows)
const NAV_BASE_DELAY = TOGGLE_BASE_DELAY + 3 * STAGGER_MS;
// Delete row continues at index 7 → delay 980
const DELETE_DELAY = TOGGLE_BASE_DELAY + 7 * STAGGER_MS;

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  // Toggle state from PreferencesContext
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
  // Sheet body — same on both platforms; only the outer Modal framing
  // differs (iOS pageSheet vs Android transparent + manual sizing).
  const sheetContent = (
    <SafeAreaView
      edges={[]}
      style={
        Platform.OS === 'ios' ? settingsStyles.container : settingsStyles.androidSheet
      }
    >
      <View style={settingsStyles.swipeIndicator} />

      <AnimatedEntrance
        preset={{
          scale: { from: 0.85, to: 1 },
          rotate: { from: -15, to: 0 },
          opacity: { from: 0, to: 1 },
          duration: 450,
          easing: easings.backOut17,
        }}
        delay={300}
        style={settingsStyles.closeButtonWrapper}
      >
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={settingsStyles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close settings"
        >
          <Ionicons name="close" size={24} color={colors.onyx} />
        </Pressable>
      </AnimatedEntrance>

      <Animated.ScrollView
        contentContainerStyle={settingsStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={Platform.OS === 'ios'}
        // Android scroll perf: drop off-screen subviews + skip
        // overscroll glow. ScrollEventThrottle 16 = 60fps; default 0
        // posts every native frame which is wasteful for a static
        // sheet with no scroll-driven animation.
        removeClippedSubviews={Platform.OS === 'android'}
        scrollEventThrottle={16}
        overScrollMode={Platform.OS === 'android' ? 'never' : 'auto'}
      >
        {/* Toggle rows. Wrap StaggerGroup in a View so its Fragment
            siblings inherit the 20px gap from this View; if we put the
            View *inside* StaggerGroup, StaggerGroup would only see one
            child and lose the per-row stagger. */}
        <View style={settingsStyles.rowGroup}>
          <StaggerGroup
            preset={ROW_PRESET}
            baseDelay={TOGGLE_BASE_DELAY}
            staggerInterval={STAGGER_MS}
          >
            <ToggleRow
              icon={svgIcon(iconBgMusic(colors.blueSecondary), 20, 20)}
              title="Background Music"
              subtitle="Ambient music during lessons"
              value={backgroundMusicEnabled}
              onValueChange={onToggleBackgroundMusic}
            />
            <ToggleRow
              icon={svgIcon(iconSfx(colors.blueSecondary), 24, 22)}
              title="Sound Effects"
              subtitle="Quiz feedback and celebrations"
              value={soundEffectsEnabled}
              onValueChange={onToggleSoundEffects}
            />
            <ToggleRow
              icon={svgIcon(iconVibrate(colors.blueSecondary), 20, 30)}
              title="Vibration"
              subtitle="Haptic feedback"
              value={hapticsEnabled}
              onValueChange={onToggleHaptics}
            />
          </StaggerGroup>
        </View>

        <AnimatedDivider />

        <View style={settingsStyles.rowGroup}>
          <StaggerGroup
            preset={ROW_PRESET}
            baseDelay={NAV_BASE_DELAY}
            staggerInterval={STAGGER_MS}
          >
            <NavRow
              icon={svgIcon(iconShield(colors.blueSecondary), 22, 26)}
              title="Privacy Policy"
              onPress={onPrivacyPolicy}
            />
            <NavRow
              icon={svgIcon(iconQuestion(colors.blueSecondary), 22, 22)}
              title="Support"
              onPress={onSupport}
            />
            <NavRow
              icon={svgIcon(iconChatFaq(colors.blueSecondary), 24, 23)}
              title="FAQ"
              onPress={onFAQ}
            />
            <NavRow
              icon={svgIcon(iconCard(colors.blueSecondary), 25, 20)}
              title="Manage Subscription"
              onPress={onManageSubscription}
            />
          </StaggerGroup>
        </View>

        <AnimatedEntrance preset={ROW_PRESET} delay={DELETE_DELAY}>
          <DeleteAccountRow onDelete={onDeleteAccount} />
        </AnimatedEntrance>
      </Animated.ScrollView>
    </SafeAreaView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      // iOS: native bottom sheet at ~90% with built-in swipe-to-dismiss.
      // Android: transparent overlay so we can render a 90% sheet at
      // the bottom with our own backdrop dismiss.
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      transparent={Platform.OS === 'android'}
      onRequestClose={onClose}
    >
      {Platform.OS === 'android' ? (
        <View style={settingsStyles.androidBackdrop}>
          {/* Tap-outside-to-dismiss (top 10% region above the sheet). */}
          <Pressable
            style={settingsStyles.androidBackdropDismiss}
            onPress={onClose}
          />
          {sheetContent}
        </View>
      ) : (
        sheetContent
      )}
    </Modal>
  );
}
