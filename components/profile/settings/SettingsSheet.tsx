import React from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedEntrance } from '@/components/ui/animations/AnimatedEntrance';
import { StaggerGroup } from '@/components/ui/animations/StaggerGroup';
import { colors, easings, spacing } from '@/components/ui/theme';

import { AnimatedDivider } from './AnimatedDivider';
import { DeleteAccountRow } from './DeleteAccountRow';
import { NavRow } from './NavRow';
import { ToggleRow } from './ToggleRow';
import {
  iconBgMusic,
  iconCard,
  iconChatFaq,
  iconCloseX,
  iconQuestion,
  iconSfx,
  iconShield,
  iconVibrate,
  svgIcon,
} from './icons';
import { settingsStyles } from './styles';

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
          settingsStyles.container,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.md,
          },
        ]}
      >
        <AnimatedEntrance
          preset={{
            scale: { from: 0.85, to: 1 },
            rotate: { from: -15, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 450,
            easing: easings.backOut2,
          }}
          delay={120}
          style={settingsStyles.closeButtonWrapper}
        >
          <Pressable
            onPress={onClose}
            style={settingsStyles.closeButton}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close settings"
          >
            {svgIcon(iconCloseX(colors.blueSecondary), 36, 36)}
          </Pressable>
        </AnimatedEntrance>

        <ScrollView
          contentContainerStyle={settingsStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <StaggerGroup
            preset="fadeScale"
            baseDelay={220}
            staggerInterval={90}
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

          <AnimatedDivider />

          <StaggerGroup
            preset="fadeScale"
            baseDelay={740}
            staggerInterval={80}
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

          <AnimatedEntrance preset="fadeScale" delay={1200}>
            <DeleteAccountRow onDelete={onDeleteAccount} />
          </AnimatedEntrance>
        </ScrollView>
      </View>
    </Modal>
  );
}
