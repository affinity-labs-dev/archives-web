/**
 * ProfileTab — v5 redesign of the Profile tab.
 *
 * Reads ALL state from hooks/context (no props).
 * Uses @/components/ui design-system primitives exclusively.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';

// UI design-system
import { Typography } from '@/components/ui/Typography';
import { DepthButton } from '@/components/ui/DepthButton';
import { AnimatedEntrance } from '@/components/ui/animations/AnimatedEntrance';
import { StaggerGroup } from '@/components/ui/animations/StaggerGroup';
import {
  colors,
  spacing,
  radius,
  shadows,
  easings,
  safeDuration,
} from '@/components/ui/theme';

// Gamification
import {
  useGamifiedProgress,
  useGamificationOrchestrator,
  useRewards,
  calculateLessonsCompleted,
} from '@/gamification';
import { GrayscaleImage } from '@/gamification/ui/achievement/GrayscaleImage';

// Context / Services
import { usePreferences } from '@/context/PreferencesContext';
import { analyticsService } from '@/services/AnalyticsService';
import { liveActivityManager } from '@/services/LiveActivityManager';
import {
  clearAllRememberedAccounts,
  upsertRememberedAccount,
} from '@/services/RememberedAccountService';
import {
  getPaywallSeenSnapshot,
  removeUserFromPaywallSeen,
  restorePaywallSeenSnapshot,
} from '@/services/PaywallGateService';

// Stores
import { useOnboardingStore } from '@/stores/onboardingStore';

// Sibling components
import { WeeklyXPChart } from '@/components/profile/WeeklyXPChart';
import { AchievementsScreen } from '@/components/profile/AchievementsScreen';
import { MonthlyBadgesScreen } from '@/components/profile/MonthlyBadgesScreen';

// Fallback image for achievements
import CamelImage from '@/assets/images/quiz-images/Camel.png';

// ═══════════════════════════════════════════════
// SettingsSheet — file-private components
// ═══════════════════════════════════════════════

// ─────────────────────────────────────────────
// SVG icon helpers (inline XML — CSS vars don't work in RN)
// ─────────────────────────────────────────────

const svgIcon = (xml: string, w: number, h: number) => <SvgXml xml={xml} width={w} height={h} />;

const iconBgMusic = (c: string) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.306 18.681C.435 17.801 0 16.744 0 15.51c0-1.235.435-2.292 1.306-3.172.87-.879 1.917-1.319 3.139-1.319.426 0 .82.052 1.18.155.362.103.709.257 1.042.463V2.992c0-.281.088-.53.264-.744.176-.215.393-.342.653-.38L18.694.018c.334-.056.635.024.903.239.269.215.403.5.403.856v12.153c0 1.235-.435 2.292-1.306 3.171-.87.88-1.917 1.32-3.139 1.32s-2.222-.44-3.093-1.32c-.87-.879-1.306-1.936-1.306-3.171 0-1.235.435-2.292 1.306-3.171.87-.88 1.917-1.319 3.138-1.319.426 0 .82.051 1.181.155.361.103.708.257 1.041.463V4.76L8.89 6.529v8.98c0 1.236-.435 2.293-1.306 3.172-.87.88-1.917 1.32-3.139 1.32s-2.222-.44-3.139-1.32Z" fill="${c}"/></svg>`;
const iconSfx = (c: string) => `<svg viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21.333 11c0-1.836-.489-3.512-1.466-5.027-.978-1.515-2.29-2.649-3.934-3.401-.333-.155-.578-.393-.733-.714-.156-.32-.178-.647-.067-.978.133-.354.373-.608.717-.763.344-.155.694-.155 1.05 0 2.156.951 3.878 2.406 5.167 4.364C23.356 6.437 24 8.611 24 11s-.644 4.563-1.933 6.52c-1.29 1.958-3.011 3.413-5.167 4.364-.356.155-.706.155-1.05 0-.345-.155-.584-.41-.717-.763-.111-.332-.089-.658.067-.979.155-.32.4-.559.733-.714 1.645-.752 2.956-1.886 3.934-5.027C20.844 14.512 21.333 12.836 21.333 11ZM5.333 15.015H1.333C.956 15.015.64 14.888.383 14.634.128 14.379 0 14.064 0 13.688V8.379c0-.377.128-.692.383-.947C.64 7.178.956 7.051 1.333 7.051h4L9.733 2.671c.423-.42.906-.514 1.45-.282.545.232.817.647.817 1.244v14.8c0 .597-.272 1.012-.817 1.244-.544.232-1.027.142-1.45-.278L5.333 15.015ZM18 11.033c0 .93-.211 1.809-.633 2.638-.423.83-.978 1.51-1.667 2.041-.222.133-.45.138-.683.017-.234-.122-.35-.316-.35-.581V6.852c0-.266.116-.459.35-.581.233-.122.461-.116.683.017.689.553 1.244 1.25 1.667 2.09.422.841.633 1.726.633 2.655Z" fill="${c}"/></svg>`;
const iconVibrate = (c: string) => `<svg viewBox="0 0 20 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.667 30c-.734 0-1.361-.267-1.884-.801C.261 28.665 0 28.023 0 27.273V2.727C0 1.977.261 1.335.783.801 1.306.267 1.933 0 2.667 0H16c.733 0 1.361.267 1.883.801.523.534.784 1.176.784 1.926v4.228c.4.159.722.409.966.75.245.341.367.727.367 1.159v2.727c0 .432-.122.818-.367 1.159-.244.341-.566.591-.966.75v13.773c0 .75-.261 1.392-.784 1.926-.522.534-1.15.801-1.883.801H2.667Zm0-2.727H16V2.727H2.667v24.546Zm7.616-1.756c.256-.261.384-.585.384-.972 0-.386-.128-.71-.384-.972-.255-.261-.572-.392-.95-.392s-.694.13-.95.392c-.255.261-.383.586-.383.972s.128.71.383.972c.256.261.573.392.95.392s.695-.131.95-.392Z" fill="${c}"/></svg>`;
const iconShield = (c: string) => `<svg viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.98 19.171c.263-.252.395-.565.395-.938v-5.266c0-.373-.132-.685-.395-.938-.264-.252-.59-.378-.98-.378-.39 0-.716.126-.98.378-.263.253-.395.565-.395.938v5.266c0 .373.132.686.395.938.264.252.59.378.98.378.39 0 .716-.126.98-.378Zm0-10.532c.263-.252.395-.565.395-.938s-.132-.686-.395-.938c-.264-.252-.59-.378-.98-.378-.39 0-.716.126-.98.378-.263.252-.395.565-.395.938 0 .373.132.685.395.938.264.252.59.378.98.378.39 0 .716-.126.98-.378ZM10.553 25.967c-.138-.022-.275-.055-.413-.099-3.093-.987-5.557-2.814-7.39-5.48C.917 17.723 0 14.854 0 11.782V5.562c0-.549.166-1.042.498-1.481.333-.44.762-.757 1.29-.955L10.037.165C10.358.055 10.68 0 11 0c.32 0 .642.055.963.165l8.25 2.961c.527.198.957.516 1.289.955.332.44.498.933.498 1.481v6.22c0 3.072-.917 5.941-2.75 8.607-1.833 2.666-4.297 4.492-7.39 5.48-.138.043-.275.077-.413.098-.138.022-.287.033-.447.033-.16 0-.31-.011-.447-.033ZM11 23.367c2.383-.724 4.354-2.172 5.913-4.344 1.558-2.172 2.337-4.586 2.337-7.24V5.562L11 2.6l-8.25 2.962v6.22c0 2.655.78 5.069 2.338 7.241C6.645 21.195 8.617 22.643 11 23.367Z" fill="${c}"/></svg>`;
const iconQuestion = (c: string) => `<svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.921 17.201c.266-.265.399-.591.399-.976s-.133-.71-.399-.976c-.266-.266-.591-.399-.976-.399s-.71.133-.976.399c-.266.265-.399.59-.399.976 0 .385.133.71.399.976.266.266.59.399.976.399.385 0 .71-.133.976-.399ZM11 22c-1.522 0-2.952-.289-4.29-.866-1.338-.578-2.503-1.361-3.493-2.351-.99-.99-1.774-2.154-2.351-3.493C.289 13.952 0 12.522 0 11s.289-2.952.866-4.29C1.444 5.372 2.228 4.208 3.218 3.218 4.208 2.228 5.372 1.444 6.71.866 8.048.289 9.478 0 11 0s2.952.289 4.29.866c1.338.578 2.502 1.362 3.493 2.352.99.99 1.773 2.154 2.351 3.492C21.711 8.048 22 9.478 22 11s-.289 2.952-.866 4.29c-.578 1.338-1.362 2.503-2.351 3.493-.99.99-2.155 1.773-3.493 2.351C13.952 21.711 12.522 22 11 22Zm0-2.2c2.457 0 4.538-.853 6.243-2.558C18.948 15.538 19.8 13.457 19.8 11s-.852-4.538-2.557-6.243C15.537 3.053 13.457 2.2 11 2.2S6.463 3.053 4.758 4.758C3.053 6.462 2.2 8.543 2.2 11s.853 4.538 2.558 6.243C6.462 18.947 8.543 19.8 11 19.8Zm.11-13.53c.458 0 .857.147 1.196.44.339.293.509.66.509 1.1 0 .403-.124.761-.371 1.073-.248.311-.528.605-.84.88-.421.366-.792.77-1.113 1.21-.32.44-.481.935-.481 1.485 0 .257.096.472.289.646.192.174.417.261.674.261.275 0 .508-.092.701-.275.193-.183.316-.413.371-.688.074-.385.239-.728.496-1.031.256-.303.531-.591.825-.866.421-.404.783-.843 1.086-1.32.302-.477.454-1.008.454-1.595 0-.935-.38-1.7-1.141-2.296-.761-.596-1.646-.894-2.656-.894-.697 0-1.361.147-1.994.44-.632.294-1.113.743-1.443 1.348-.128.22-.17.453-.123.701.045.247.17.435.371.564.257.147.523.192.798.138.275-.056.504-.211.688-.468.201-.275.454-.486.756-.633.303-.147.619-.22.949-.22Z" fill="${c}"/></svg>`;
const iconChatFaq = (c: string) => `<svg viewBox="0 0 24 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.8 23c-.16 0-.31-.031-.45-.093-.14-.062-.27-.154-.39-.278L19.2 19.785H7.2c-.66 0-1.225-.242-1.695-.727-.47-.484-.705-1.066-.705-1.747V16.075H18c.66 0 1.225-.242 1.695-.726.47-.485.705-1.067.705-1.747V4.946h1.2c.66 0 1.225.242 1.695.727.47.484.705 1.066.705 1.746v14.313c0 .371-.12.675-.36.912-.24.237-.52.356-.84.356ZM2.4 12.582 3.81 11.129H15.6V2.473H2.4v10.109ZM1.2 16.817c-.32 0-.6-.118-.84-.355-.24-.237-.36-.541-.36-.912V2.473c0-.68.235-1.262.705-1.747C1.175.242 1.74 0 2.4 0h13.2c.66 0 1.225.242 1.695.726.47.485.705 1.067.705 1.747v8.656c0 .68-.235 1.262-.705 1.747-.47.484-1.035.726-1.695.726H4.8l-1.76 2.844c-.12.124-.25.217-.39.278-.14.062-.29.093-.45.093Z" fill="${c}"/></svg>`;
const iconCard = (c: string) => `<svg viewBox="0 0 25 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M25 2.5v15c0 .688-.245 1.276-.734 1.766C23.776 19.755 23.188 20 22.5 20H2.5c-.688 0-1.276-.245-1.766-.734C.245 18.776 0 18.188 0 17.5V2.5C0 1.813.245 1.224.734.734 1.224.245 1.813 0 2.5 0h20c.688 0 1.276.245 1.766.734.489.49.734 1.079.734 1.766ZM2.5 5h20V2.5h-20V5Zm0 5v7.5h20V10h-20Z" fill="${c}"/></svg>`;
const iconTrash = (c: string) => `<svg viewBox="0 0 22 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.125 24c-.756 0-1.404-.261-1.942-.783C1.644 22.694 1.375 22.067 1.375 21.333V4c-.39 0-.716-.128-.98-.383C.132 3.361 0 3.044 0 2.667c0-.378.132-.695.395-.95.264-.256.59-.384.98-.384h5.5c0-.377.132-.694.395-.95.264-.255.59-.383.98-.383h5.5c.39 0 .716.128.98.383.263.256.395.573.395.95h5.5c.39 0 .716.128.98.384.263.255.395.572.395.95 0 .377-.132.694-.395.95-.264.255-.591.383-.98.383v17.333c0 .734-.27 1.361-.808 1.884-.539.522-1.187.783-1.942.783H4.125Zm13.75-20h-13.75v17.333h13.75V4ZM9.23 18.283c.263-.255.395-.572.395-.95V8c0-.378-.132-.694-.395-.95-.264-.256-.59-.384-.98-.384-.39 0-.716.128-.98.384-.263.256-.395.572-.395.95v9.333c0 .378.132.695.395.95.264.256.59.384.98.384.39 0 .716-.128.98-.384Zm5.5 0c.263-.255.395-.572.395-.95V8c0-.378-.132-.694-.395-.95-.264-.256-.59-.384-.98-.384-.39 0-.717.128-.98.384-.264.256-.395.572-.395.95v9.333c0 .378.131.695.395.95.263.256.59.384.98.384.39 0 .716-.128.98-.384Z" fill="${c}"/></svg>`;
const iconCloseX = (c: string) => `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 20.1l4.35 4.35c.275.275.625.413 1.05.413s.775-.138 1.05-.413c.275-.275.413-.625.413-1.05s-.138-.775-.413-1.05L20.1 18l4.35-4.35c.275-.275.413-.625.413-1.05s-.138-.775-.413-1.05c-.275-.275-.625-.413-1.05-.413s-.775.138-1.05.413L18 15.9l-4.35-4.35c-.275-.275-.625-.413-1.05-.413s-.775.138-1.05.413c-.275.275-.413.625-.413 1.05s.138.775.413 1.05L15.9 18l-4.35 4.35c-.275.275-.413.625-.413 1.05s.138.775.413 1.05c.275.275.625.413 1.05.413s.775-.138 1.05-.413L18 20.1ZM18 33c-2.075 0-4.025-.394-5.85-1.181-1.825-.788-3.413-1.856-4.763-3.206S5.044 25.675 4.181 23.85C3.394 22.025 3 20.075 3 18s.394-4.025 1.181-5.85c.788-1.825 1.856-3.413 3.206-4.763S10.325 5.044 12.15 4.181C13.975 3.394 15.925 3 18 3s4.025.394 5.85 1.181c1.825.788 3.413 1.856 4.763 3.206s2.344 2.938 3.206 4.763C32.606 13.975 33 15.925 33 18s-.394 4.025-1.181 5.85c-.788 1.825-1.856 3.413-3.206 4.763s-2.938 2.344-4.763 3.206C22.025 32.606 20.075 33 18 33Zm0-3c3.35 0 6.188-1.163 8.513-3.488C28.837 24.188 30 21.35 30 18s-1.163-6.188-3.488-8.513C24.188 7.163 21.35 6 18 6s-6.188 1.163-8.513 3.488C7.163 11.813 6 14.65 6 18s1.163 6.188 3.488 8.513C11.812 28.837 14.65 30 18 30Z" fill="${c}"/></svg>`;
const iconChevRow = (c: string) => `<svg viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.41.59l7.59 7.59c.38.38.38 1.02 0 1.41L1.41 17.18c-.38.38-1.02.38-1.41 0-.38-.38-.38-1.02 0-1.41L6.59 9.18.59 2.59C.21 2.21.21 1.57.59 1.18.97.8 1.03.21 1.41.59Z" fill="${c}"/></svg>`;

// ─────────────────────────────────────────────
// SettingsSheet Types
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
// SettingsSheet Constants
// ─────────────────────────────────────────────

const SETTINGS_CARD_HORIZONTAL_MARGIN = 30;
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
      <Animated.View style={[settingsStyles.togglePill, pillStyle]}>
        <Animated.View style={[settingsStyles.toggleKnob, knobStyle]} />
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
  borderColor = colors.bluePrimary,
  onPress,
  style: containerStyle,
}: {
  children: React.ReactNode;
  surfaceColor?: string;
  shadowColor?: string;
  borderColor?: string;
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
          settingsStyles.cardContainer,
          { paddingBottom: CARD_SHADOW_OFFSET },
        ]}
      >
        {/* Shadow layer */}
        <View
          style={[
            settingsStyles.cardShadow,
            {
              top: CARD_SHADOW_OFFSET,
              borderRadius: CARD_BORDER_RADIUS,
              backgroundColor: shadowColor,
              borderWidth: CARD_BORDER_WIDTH,
              borderColor: borderColor,
            },
          ]}
        />
        {/* Surface layer */}
        <Animated.View
          style={[
            settingsStyles.cardSurface,
            {
              height: CARD_HEIGHT,
              borderRadius: CARD_BORDER_RADIUS,
              backgroundColor: surfaceColor,
              borderWidth: CARD_BORDER_WIDTH,
              borderColor: borderColor,
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
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (newValue: boolean) => void;
}) {
  return (
    <SettingsCard style={settingsStyles.rowWrapper}>
      <View style={settingsStyles.rowContent}>
        <View style={settingsStyles.rowLeft}>
          {icon}
          <View style={settingsStyles.textStack}>
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
  icon,
  title,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
}) {
  return (
    <SettingsCard onPress={onPress} style={settingsStyles.rowWrapper}>
      <View style={settingsStyles.rowContent}>
        <View style={settingsStyles.rowLeft}>
          {icon}
          <Typography
            family="onest"
            weight="600"
            size={14}
            color="onyx"
          >
            {title}
          </Typography>
        </View>
        {svgIcon(iconChevRow(colors.concreteGrey), 10, 18)}
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
        borderColor={colors.incorrectSecondary}
        onPress={handlePress}
        style={settingsStyles.rowWrapper}
      >
        <View style={settingsStyles.rowContent}>
          <View style={settingsStyles.rowLeft}>
            {svgIcon(iconTrash(colors.incorrectSecondary), 22, 24)}
            <Typography
              family="onest"
              weight="600"
              size={14}
              color="onyx"
            >
              Delete Account
            </Typography>
          </View>
          {svgIcon(iconChevRow(colors.incorrectSecondary), 10, 18)}
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
        settingsStyles.divider,
        { transformOrigin: 'left center' },
        dividerStyle,
      ]}
    />
  );
}

// ─────────────────────────────────────────────
// SettingsSheet Component
// ─────────────────────────────────────────────

function SettingsSheet({
  visible,
  onClose,
  backgroundMusicEnabled: settingsBgMusic,
  soundEffectsEnabled: settingsSfx,
  hapticsEnabled: settingsHaptics,
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
          {/* Toggle rows */}
          <StaggerGroup
            preset="fadeScale"
            baseDelay={220}
            staggerInterval={90}
          >
            <ToggleRow
              icon={svgIcon(iconBgMusic(colors.blueSecondary), 20, 20)}
              title="Background Music"
              subtitle="Ambient music during lessons"
              value={settingsBgMusic}
              onValueChange={onToggleBackgroundMusic}
            />
            <ToggleRow
              icon={svgIcon(iconSfx(colors.blueSecondary), 24, 22)}
              title="Sound Effects"
              subtitle="Quiz feedback and celebrations"
              value={settingsSfx}
              onValueChange={onToggleSoundEffects}
            />
            <ToggleRow
              icon={svgIcon(iconVibrate(colors.blueSecondary), 20, 30)}
              title="Vibration"
              subtitle="Haptic feedback"
              value={settingsHaptics}
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
// SettingsSheet Styles
// ─────────────────────────────────────────────

const settingsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  closeButtonWrapper: {
    marginLeft: SETTINGS_CARD_HORIZONTAL_MARGIN,
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
    marginHorizontal: SETTINGS_CARD_HORIZONTAL_MARGIN,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.bluePrimary,
    marginHorizontal: SETTINGS_CARD_HORIZONTAL_MARGIN,
    marginVertical: spacing.md,
  },
});

// ═══════════════════════════════════════════════
// ProfileScreen — internal components
// ═══════════════════════════════════════════════

// ──────────────────────────────────────────────
// Avatar image constants (v5 clean avatars — no baked-in ring)
// ──────────────────────────────────────────────
const DefaultAvatar = require('@/assets/images/profile/icons/profile-avatar.png');
const AvatarArchitect = require('@/assets/images/profile/avatars/av-01-architect.png');
const AvatarMusician = require('@/assets/images/profile/avatars/av-02-musician.png');
const AvatarLamplighter = require('@/assets/images/profile/avatars/av-03-lamplighter.png');
const AvatarReader = require('@/assets/images/profile/avatars/av-04-reader.png');
const AvatarExplorer = require('@/assets/images/profile/avatars/av-05-explorer.png');
const AvatarPhysician = require('@/assets/images/profile/avatars/av-06-physician.png');
const AvatarElder = require('@/assets/images/profile/avatars/av-07-elder.png');
const AvatarApothecary = require('@/assets/images/profile/avatars/av-08-apothecary.png');
const AvatarMerchant = require('@/assets/images/profile/avatars/av-09-merchant.png');

// ──────────────────────────────────────────────
// Constants & helpers
// ──────────────────────────────────────────────

const AVATAR_IMAGE_MAP: Record<string, any> = {
  // Map old Supabase image_url keys to new v5 avatars
  'avatars/Al-Khwarizmi.png': AvatarArchitect,
  'avatars/Fatima-al-Fihri.png': AvatarReader,
  'avatars/ibn-sina-avicenna.png': AvatarPhysician,
  'avatars/Ziryab.png': AvatarMusician,
  'avatars/Al-Razi.png': AvatarApothecary,
  'avatars/Ibn-Battuta.png': AvatarExplorer,
  'avatars/Lubna-of-Cordoba.png': AvatarLamplighter,
  'avatars/Mariam-al-Asturlabi.png': AvatarElder,
  'avatars/Zaynab-al-Shahda.png': AvatarMerchant,
};

const getAvatarImage = (imageUrl: string) =>
  AVATAR_IMAGE_MAP[imageUrl] || DefaultAvatar;

// Monthly badge images (v5 — from profile assets folder)
const BADGE_IMAGE_MAP: Record<string, any> = {
  'ACH_MonthlyActive_1.png': require('@/assets/images/profile/badges/badge-january-scholar.png'),
  'ACH_MonthlyActive_2.png': require('@/assets/images/profile/badges/badge-february-caravan.png'),
  'ACH_MonthlyActive_3.png': require('@/assets/images/profile/badges/badge-march-astronomer.png'),
  'ACH_MonthlyActive_4.png': require('@/assets/images/profile/badges/badge-april-calligrapher.png'),
  'ACH_MonthlyActive_5.png': require('@/assets/images/profile/badges/badge-may-architect.png'),
  'ACH_MonthlyActive_6.png': require('@/assets/images/profile/badges/badge-june-healer.png'),
  'ACH_MonthlyActive_7.png': require('@/assets/images/profile/badges/badge-july-cartographer.png'),
  'ACH_MonthlyActive_8.png': require('@/assets/images/profile/badges/badge-august-sailor.png'),
  'ACH_MonthlyActive_9.png': require('@/assets/images/profile/badges/badge-september-wayfinder.png'),
  'ACH_MonthlyActive_10.png': require('@/assets/images/profile/badges/badge-october-oasis.png'),
  'ACH_MonthlyActive_11.png': require('@/assets/images/profile/badges/badge-november-lantern.png'),
  'ACH_MonthlyActive_12.png': require('@/assets/images/profile/badges/badge-december-storyteller.png'),
};

const getBadgeImage = (imagePath: string) => BADGE_IMAGE_MAP[imagePath];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Era 2+ progress type
interface NewUserProgress {
  adventureId: string;
  moduleId: string;
  quizScore: number;
  quizCorrectAnswers?: number;
  isCompleted: boolean;
  quizCompleted: boolean;
  completedAt: string;
  era_id: number;
}

// ──────────────────────────────────────────────
// Count-up animated number
// ──────────────────────────────────────────────
function CountUpText({
  target,
  textColor,
  animate = true,
  delay = 0,
}: {
  target: number;
  textColor: string;
  animate?: boolean;
  delay?: number;
}) {
  const [displayed, setDisplayed] = useState(animate ? 0 : target);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!animate || target === 0) {
      setDisplayed(target);
      return;
    }

    const startAnimation = () => {
      const duration = 900;
      const startTime = Date.now();

      const tick = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t * (2 - t);
        const value = Math.round(eased * target);
        setDisplayed(value);

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      setDisplayed(0);
      rafRef.current = requestAnimationFrame(tick);
    };

    if (delay > 0) {
      setDisplayed(0);
      timerRef.current = setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [target, animate, delay]);

  return (
    <Typography
      family="bounded"
      size={32}
      weight="900"
      extraColor={textColor}
      style={{ lineHeight: 38 }}
    >
      {displayed}
    </Typography>
  );
}

// ──────────────────────────────────────────────
// Stat Tile
// ──────────────────────────────────────────────
type TileColorScheme = 'blueDark' | 'blueLight' | 'acaiDark' | 'acaiLight';

const TILE_COLORS: Record<TileColorScheme, { bg: string; text: string; label: string }> = {
  blueDark: { bg: colors.bluePrimary, text: colors.snow, label: colors.blueSecondary },
  blueLight: { bg: colors.blueSecondary, text: colors.bluePrimary, label: colors.bluePrimary },
  acaiDark: { bg: colors.acaiSecondary, text: colors.snow, label: colors.acaiTertiary },
  acaiLight: { bg: colors.acaiTertiary, text: colors.acaiPrimary, label: colors.acaiSecondary },
};

interface StatTileProps {
  value: number;
  label: string;
  colorScheme: TileColorScheme;
  position: 'left' | 'right' | 'full';
  suffix?: string;
  animate?: boolean;
  /** Delay before count-up starts (ms). Use to sync with entrance animation. */
  countUpDelay?: number;
}

function StatTile({ value, label, colorScheme, position, suffix, animate = true, countUpDelay = 0 }: StatTileProps) {
  const scheme = TILE_COLORS[colorScheme];

  const borderRadiusStyle = useMemo(() => {
    if (position === 'full') {
      return {
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
      };
    }
    if (position === 'left') {
      return {
        borderTopLeftRadius: 15,
        borderBottomLeftRadius: 15,
        borderTopRightRadius: 5,
        borderBottomRightRadius: 5,
      };
    }
    // right
    return {
      borderTopLeftRadius: 5,
      borderBottomLeftRadius: 5,
      borderTopRightRadius: 15,
      borderBottomRightRadius: 15,
    };
  }, [position]);

  return (
    <View style={[profileStyles.statTile, { backgroundColor: scheme.bg }, borderRadiusStyle]}>
      <View style={profileStyles.statTileContent}>
        <CountUpText target={value} textColor={scheme.text} animate={animate} delay={countUpDelay} />
        {suffix ? (
          <Typography
            family="bounded"
            size={14}
            weight="900"
            extraColor={scheme.text}
            style={{ lineHeight: 18, marginTop: 2 }}
          >
            {suffix}
          </Typography>
        ) : null}
      </View>
      <Typography
        family="onest"
        size={12}
        weight="bold"
        extraColor={scheme.label}
      >
        {label}
      </Typography>
    </View>
  );
}

// ──────────────────────────────────────────────
// Monthly badge pill with ink-wash animation
// ──────────────────────────────────────────────
function MonthPill({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const fillScale = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    fillScale.value = withTiming(isSelected ? 1 : 0, {
      duration: safeDuration(450),
      easing: easings.power2Out,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelected]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fillScale.value }],
    opacity: fillScale.value,
  }));

  return (
    <TouchableOpacity
      style={profileStyles.monthPill}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Background fill (ink-wash) */}
      <Animated.View
        style={[
          profileStyles.monthPillFill,
          { backgroundColor: colors.bluePrimary },
          fillStyle,
        ]}
      />
      <Typography
        family="onest"
        size={13}
        weight="600"
        color={isSelected ? 'snow' : 'onyx'}
        style={{ zIndex: 1 }}
      >
        {label}
      </Typography>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════
// DEBUG: Set to true to show fake large numbers for animation testing.
//        Set back to false before committing.
// ══════════════════════════════════════════════
const USE_FAKE_STATS = false;
const FAKE = {
  longestStreak: 85,
  streak: 67,
  lessonsCompleted: 37,
  totalXP: 780,
  minutesLearned: 112,
  weeklyXP: [100, 100, 200, 50, 100, 100, 300],
};

// ──────────────────────────────────────────────
// Lift-on-press wrapper (hover-lift for badge/achievement previews)
// ──────────────────────────────────────────────
function LiftPressable({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Pressable
      onHoverIn={() => {
        translateY.value = withTiming(-3, { duration: safeDuration(160) });
        scale.value = withTiming(1.04, { duration: safeDuration(160) });
      }}
      onHoverOut={() => {
        translateY.value = withSpring(0, { damping: 12, stiffness: 200 });
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
      onPress={() => {
        // Quick press feedback then fire callback
        scale.value = withSequence(
          withTiming(0.97, { duration: safeDuration(100) }),
          withSpring(1, { damping: 12, stiffness: 200 }),
        );
        onPress?.();
      }}
    >
      <Animated.View style={style}>{children}</Animated.View>
    </Pressable>
  );
}

// ══════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════
export default function ProfileTab() {
  // Track first mount — animations only play once, not on every tab switch
  const hasAnimated = useRef(false);
  useEffect(() => {
    hasAnimated.current = true;
  }, []);
  const shouldAnimate = !hasAnimated.current;

  const { signOut } = useAuth();
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const {
    state: gamificationState,
    moduleProgress,
    calculateTotalXP,
    calculateModulesCompleted,
  } = useGamifiedProgress();
  const {
    backgroundMusicEnabled,
    soundEffectsEnabled,
    hapticsEnabled,
    setBackgroundMusicEnabled,
    setSoundEffectsEnabled,
    setHapticsEnabled,
  } = usePreferences();
  const {
    avatars,
    selectedAvatar,
    setSelectedAvatar,
  } = useRewards();
  const {
    achievements,
    streak,
    longestStreak,
  } = useGamificationOrchestrator();
  const dailyGoalMinutes = useOnboardingStore((s) => s.dailyGoalMinutes);

  // ── State ──────────────────────────────────
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  // Avatar modal will be wired in separately
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [selectedBadgeMonth, setSelectedBadgeMonth] = useState<number | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showMonthlyBadges, setShowMonthlyBadges] = useState(false);
  const [previewAchievement, setPreviewAchievement] = useState<typeof achievements[0] | null>(null);
  const [previewBadge, setPreviewBadge] = useState<{ month: number; label: string; earned: boolean; image: any } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingPortal, _setIsLoadingPortal] = useState(false);

  // Era 2+ progress
  const [newUserProgress, setNewUserProgress] = useState<NewUserProgress[]>([]);

  // Load Era 2+ progress on focus
  useFocusEffect(
    useCallback(() => {
      const loadNewProgress = async () => {
        try {
          const data = await AsyncStorage.getItem('new_user_progress');
          if (data) {
            const parsed: NewUserProgress[] = JSON.parse(data);
            setNewUserProgress(parsed);
          }
        } catch (error) {
          console.error('Error loading Era 2+ progress:', error);
        }
      };
      loadNewProgress();
    }, []),
  );

  // Stored totalXP
  const [storedTotalXP, setStoredTotalXP] = useState<number | null>(null);

  useEffect(() => {
    async function loadTotalXP() {
      try {
        const xpData = await AsyncStorage.getItem('totalXP');
        if (xpData) {
          setStoredTotalXP(JSON.parse(xpData));
        }
      } catch (error) {
        console.error('Error loading stored totalXP:', error);
      }
    }
    loadTotalXP();
  }, [moduleProgress, newUserProgress]);

  const totalXP = useMemo(() => {
    if (storedTotalXP !== null) return storedTotalXP;
    return calculateTotalXP() || 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedTotalXP, moduleProgress, newUserProgress, calculateTotalXP]);

  // Fallback: set PostHog user props
  useEffect(() => {
    if (isSignedIn && user) {
      analyticsService.setUserProperties(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      });
    }
  }, [isSignedIn, user]);

  // Track page views
  useFocusEffect(
    useCallback(() => {
      analyticsService.startPageView('profile', '/profile');
      return () => analyticsService.endPageView('profile');
    }, []),
  );

  // ── Derived data ───────────────────────────
  const currentAvatar = selectedAvatar || avatars[0];

  // Used in delete-account analytics and potentially future stat tiles
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const modulesFinished = useMemo(
    () => calculateModulesCompleted(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moduleProgress, newUserProgress, calculateModulesCompleted],
  );

  const lessonsCompleted = useMemo(() => {
    return calculateLessonsCompleted(moduleProgress, gamificationState?.progress || []);
  }, [moduleProgress, gamificationState?.progress]);

  // Derive weekly XP from progress entries (Mo-Su for current week)
  const weeklyXPData = useMemo(() => {
    const progress = gamificationState?.progress || [];
    const now = new Date();
    // Monday of current week
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const dailyXP = [0, 0, 0, 0, 0, 0, 0]; // Mo-Su

    for (const entry of progress) {
      const dateStr = entry.completedAt || entry.first_attempt_at;
      if (!dateStr) continue;
      const entryDate = new Date(dateStr);
      if (entryDate < monday) continue;
      const diffDays = Math.floor((entryDate.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        const xp = entry.xp_earned || ((entry.quizCorrectAnswers || 0) * 10);
        dailyXP[diffDays] += xp;
      }
    }

    return dailyXP;
  }, [gamificationState?.progress]);

  const weeklyXPTotal = useMemo(() => weeklyXPData.reduce((sum, v) => sum + v, 0), [weeklyXPData]);

  const displayName = useMemo(() => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName.charAt(0)}.`;
    }
    return user?.firstName || 'User';
  }, [user]);

  const joinedYear = useMemo(
    () =>
      user?.createdAt
        ? new Date(user.createdAt).getFullYear()
        : new Date().getFullYear(),
    [user],
  );

  // Monthly badges
  const currentYear = new Date().getFullYear();
  const monthlyBadges = useMemo(() => {
    return [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((month) => {
      const badgeYear = month >= 10 ? currentYear - 1 : currentYear;
      const earned = moduleProgress.some((m) => {
        if (!m.quizScore || !m.unlockedAt) return false;
        const completionYear = parseInt(m.unlockedAt.substring(0, 4), 10);
        const completionMonth = parseInt(m.unlockedAt.substring(5, 7), 10);
        return completionYear === badgeYear && completionMonth === month;
      });
      return {
        id: `monthly_${month}`,
        month,
        display_text: MONTH_NAMES[month - 1],
        imagePath: `ACH_MonthlyActive_${month}.png`,
        earned,
        level: month,
      };
    });
  }, [moduleProgress, currentYear]);

  // Pick the first 3 earned monthly badges for display, or first 3 if none earned
  const displayedMonthlyBadges = useMemo(() => {
    const earned = monthlyBadges.filter((b) => b.earned);
    if (earned.length >= 3) return earned.slice(0, 3);
    return monthlyBadges.slice(0, 3);
  }, [monthlyBadges]);

  // Default selected badge month to the first displayed badge
  useEffect(() => {
    if (selectedBadgeMonth === null && displayedMonthlyBadges.length > 0) {
      setSelectedBadgeMonth(displayedMonthlyBadges[0].month);
    }
  }, [displayedMonthlyBadges, selectedBadgeMonth]);

  // First 3 achievements for display
  const displayedAchievements = useMemo(() => {
    const unlocked = achievements.filter((a) => a.unlocked);
    if (unlocked.length >= 3) return unlocked.slice(0, 3);
    return achievements.slice(0, 3);
  }, [achievements]);

  // ── Avatar breathe animation ───────────────
  const breatheScale = useSharedValue(1);
  const breatheY = useSharedValue(0);

  useEffect(() => {
    breatheScale.value = withRepeat(
      withSequence(
        withTiming(1.01, { duration: safeDuration(1900), easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: safeDuration(1900), easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    breatheY.value = withRepeat(
      withSequence(
        withTiming(-0.5, { duration: safeDuration(1900), easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: safeDuration(1900), easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: breatheScale.value },
      { translateY: breatheY.value },
    ],
  }));

  // ── Business logic ─────────────────────────

  const clearUserData = async () => {
    try {
      await AsyncStorage.multiRemove([
        'selected_era',
        'adventure_progress',
        'module_progress',
        'new_user_progress',
        'totalXP',
        'user_preferences',
        'user_unlockables_data',
      ]);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  };

  const handleSignOut = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      console.log('Signing out...');

      const hadSelectedEra = !!(await AsyncStorage.getItem('selected_era'));
      analyticsService.trackUserSessionOut({
        trigger: 'manual_profile',
        session_duration_seconds: null,
        had_selected_era: hadSelectedEra,
      });
      analyticsService.manualSignOutInProgress = true;

      // Snapshot remembered account
      const rememberedSnapshot =
        user?.id && user?.primaryEmailAddress?.emailAddress
          ? {
              userId: user.id,
              firstName: user.firstName ?? null,
              email: user.primaryEmailAddress.emailAddress,
              avatarUrl: user.imageUrl ?? null,
              lastAuthMethod: (() => {
                const provider = user.externalAccounts?.[0]?.provider ?? null;
                if (provider === 'apple') return 'oauth_apple' as const;
                if (provider === 'google') return 'oauth_google' as const;
                return 'email' as const;
              })(),
              lastSignedInAt: Date.now(),
            }
          : null;

      const paywallSeenSnapshot = await getPaywallSeenSnapshot();

      await liveActivityManager.forceEndAll();

      // Sign out via Clerk FIRST (needs token from AsyncStorage)
      await signOut();

      // Wait for React re-render cascade
      await new Promise((resolve) => setTimeout(resolve, 300));

      await AsyncStorage.clear();

      if (rememberedSnapshot) {
        await upsertRememberedAccount(rememberedSnapshot);
      }
      if (paywallSeenSnapshot) {
        await restorePaywallSeenSnapshot(paywallSeenSnapshot);
      }

      router.replace(
        (rememberedSnapshot ? '/welcome-back' : '/onboarding-step-1') as never,
      );
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [signOut, user, router]);

  const handleDeleteAccount = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (isDeletingAccount) return;

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) {
              Alert.alert('Error', 'No user account found to delete.');
              return;
            }
            setIsDeletingAccount(true);
            setShowSettingsSheet(false);

            try {
              const accountAgeDays = user.createdAt
                ? Math.floor(
                    (Date.now() - new Date(user.createdAt).getTime()) /
                      (1000 * 60 * 60 * 24),
                  )
                : undefined;

              const umayyedAdventuresComplete = [1, 2, 3, 4, 5].filter(
                (advId) => {
                  const modulesForAdventure = moduleProgress.filter(
                    (m) => m.adventureId === advId,
                  );
                  return (
                    modulesForAdventure.length === 3 &&
                    modulesForAdventure.every((m) => m.isCompleted)
                  );
                },
              ).length;
              const roiAdventuresComplete = newUserProgress.filter(
                (m) => m.isCompleted,
              ).length;
              const totalAdventuresCompleted =
                umayyedAdventuresComplete + roiAdventuresComplete;

              const hadSelectedEra = !!(await AsyncStorage.getItem('selected_era'));
              analyticsService.trackUserSessionOut({
                trigger: 'account_deleted',
                session_duration_seconds: null,
                had_selected_era: hadSelectedEra,
              });
              analyticsService.manualSignOutInProgress = true;

              analyticsService.trackUserAccountDeleted({
                account_age_days: accountAgeDays,
                total_xp: totalXP,
                adventures_completed: totalAdventuresCompleted,
              });

              await liveActivityManager.forceEndAll();
              await clearUserData();
              await clearAllRememberedAccounts();

              if (user?.id) {
                await removeUserFromPaywallSeen(user.id);
              }

              await user.delete();
              router.replace('/onboarding-step-1');
            } catch (error) {
              setIsDeletingAccount(false);
              console.error('Account deletion error:', error);
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : 'An unexpected error occurred while deleting your account.';
              Alert.alert(
                'Account Deletion Failed',
                `${errorMessage}\n\nPlease try again or contact support if the problem persists.`,
                [
                  { text: 'OK', style: 'default' },
                  {
                    text: 'Contact Support',
                    style: 'default',
                    onPress: () => {
                      Linking.openURL('https://archiveszone.app/support').catch(
                        () => Alert.alert('Error', 'Could not open support page'),
                      );
                    },
                  },
                ],
              );
            }
          },
        },
      ],
    );
  }, [isDeletingAccount, user, moduleProgress, newUserProgress, totalXP, router]);

  const handleManageSubscription = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLoadingPortal) return;
    Alert.alert(
      'Manage Subscription',
      'To cancel or modify your subscription:\n\n1. Go to your email receipt from Archives\n2. Click "Manage Subscription" in the email\n3. Or contact support for assistance',
      [
        {
          text: 'Contact Support',
          onPress: () => {
            Linking.openURL('https://archiveszone.app/support').catch(() =>
              Alert.alert('Error', 'Could not open support page'),
            );
          },
        },
        { text: 'OK', style: 'cancel' },
      ],
    );
  }, [isLoadingPortal]);

  const handlePrivacyPolicy = useCallback(() => {
    // Will be handled by SettingsSheet or separate modal
    console.log('Privacy policy pressed');
  }, []);

  const handleSupport = useCallback(() => {
    Linking.openURL('https://archiveszone.app/support').catch(() =>
      Alert.alert('Error', 'Could not open support page'),
    );
  }, []);

  const handleFAQ = useCallback(() => {
    // Will be handled by SettingsSheet or separate modal
    console.log('FAQ pressed');
  }, []);

  // Will be used when avatar selection modal is wired in
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAvatarSelection = useCallback(
    (avatar: any) => {
      Haptics.selectionAsync();
      setSelectedAvatar(avatar);
      setShowAvatarModal(false);
    },
    [setSelectedAvatar],
  );

  // ──────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────
  return (
    <SafeAreaView
      style={[profileStyles.safeArea, Platform.OS === 'android' && { paddingTop: 20 }]}
    >
      <ScrollView
        style={profileStyles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={profileStyles.scrollContent}
      >
        {/* ── Header ────────────────────────── */}
        <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={60}>
          <View style={profileStyles.header}>
            <Typography
              family="bounded"
              size={22}
              weight="900"
              color="onyx"
              uppercase
              style={{ lineHeight: undefined }}
            >
              PROFILE
            </Typography>
            <TouchableOpacity
              style={profileStyles.gearButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowSettingsSheet(true);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="settings-outline" size={24} color={colors.onyx} />
            </TouchableOpacity>
          </View>
        </AnimatedEntrance>

        {/* ── Avatar section ─────────────────── */}
        <View style={profileStyles.avatarSection}>
          {/* Ring */}
          <AnimatedEntrance
            preset={{
              scale: { from: 0.7, to: 1 },
              opacity: { from: 0, to: 1 },
              duration: 700,
              easing: easings.backOut17,
            }}
            delay={180}
          >
            <TouchableOpacity
              style={profileStyles.avatarRing}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAvatarModal(true);
              }}
              activeOpacity={0.85}
            >
              <AnimatedEntrance
                autoPlay={shouldAnimate}
                preset={{
                  scale: { from: 0.6, to: 1 },
                  opacity: { from: 0, to: 1 },
                  duration: 600,
                  easing: Easing.out(Easing.elastic(1.2)),
                }}
                delay={240}
              >
                <Animated.View style={avatarAnimatedStyle}>
                  <Image
                    source={getAvatarImage(currentAvatar?.image_url || '')}
                    style={profileStyles.avatarImage}
                  />
                </Animated.View>
              </AnimatedEntrance>
              {/* Edit badge */}
              <View style={profileStyles.editBadge}>
                <MaterialIcons name="edit" size={16} color={colors.white} />
              </View>
            </TouchableOpacity>
          </AnimatedEntrance>

          {/* Identity block */}
          <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={520}>
            <View style={profileStyles.identityBlock}>
              <Typography
                family="onest"
                size={24}
                weight="600"
                color="onyx"
                align="center"
                style={{ marginBottom: 8 }}
              >
                {displayName}
              </Typography>

              {currentAvatar && (
                <View style={profileStyles.identityPills}>
                  <Typography family="onest" size={16} weight="500" color="bluePrimary">
                    {currentAvatar.display_text || ''}
                  </Typography>
                  <View style={profileStyles.identityDot} />
                  <Typography family="onest" size={16} weight="500" color="bluePrimary">
                    {currentAvatar.subtitle || ''}
                  </Typography>
                </View>
              )}

              <Typography
                family="onest"
                size={14}
                weight="500"
                color="onyx"
                align="center"
              >
                {`Joined ${joinedYear}`}
              </Typography>
            </View>
          </AnimatedEntrance>
        </View>

        {/* ── Stat Tiles Grid ────────────────── */}
        <View style={profileStyles.statSection}>
          <StaggerGroup
              autoPlay={shouldAnimate}
            preset={{
              translateY: { from: 20, to: 0 },
              scale: { from: 0.94, to: 1 },
              opacity: { from: 0, to: 1 },
              duration: 500,
              easing: easings.backOut14,
            }}
            baseDelay={820}
            staggerInterval={80}
          >
            {/* Row 1 — blue */}
            <View style={profileStyles.statRow}>
              <StatTile
                value={USE_FAKE_STATS ? FAKE.longestStreak : longestStreak}
                label="Longest streak"
                colorScheme="blueDark"
                position="left"
                animate={shouldAnimate}
                countUpDelay={shouldAnimate ? 1050 : 0}
              />
              <StatTile
                value={USE_FAKE_STATS ? FAKE.streak : streak}
                label="Current streak"
                colorScheme="blueLight"
                position="right"
                animate={shouldAnimate}
                countUpDelay={shouldAnimate ? 1050 : 0}
              />
            </View>

            {/* Row 2 — acai */}
            <View style={profileStyles.statRow}>
              <StatTile
                value={USE_FAKE_STATS ? FAKE.lessonsCompleted : lessonsCompleted}
                label="Videos watched"
                colorScheme="acaiLight"
                position="left"
                animate={shouldAnimate}
                countUpDelay={shouldAnimate ? 1130 : 0}
              />
              <View style={[profileStyles.statTile, profileStyles.statTileRight, { backgroundColor: colors.acaiSecondary }]}>
                <View style={profileStyles.statTileContent}>
                  <Typography
                    family="bounded"
                    size={18}
                    weight="900"
                    color="snow"
                    style={{ lineHeight: 22 }}
                  >
                    TOP 2%
                  </Typography>
                </View>
                <Typography
                  family="onest"
                  size={12}
                  weight="bold"
                  color="snow"
                  style={{ opacity: 0.85 }}
                >
                  {"World\u2019s learners"}
                </Typography>
              </View>
            </View>

          </StaggerGroup>

          {/* Expanded rows — outside StaggerGroup for instant toggle */}
          {isStatsExpanded && (
            <StaggerGroup
              autoPlay
              preset={{
                translateY: { from: 14, to: 0 },
                scale: { from: 0.96, to: 1 },
                opacity: { from: 0, to: 1 },
                duration: 350,
                easing: easings.backOut14,
              }}
              baseDelay={0}
              staggerInterval={60}
            >
              {/* Row 3 — acai */}
              <View style={profileStyles.statRow}>
                <StatTile
                  value={USE_FAKE_STATS ? FAKE.minutesLearned : 0}
                  label="Minutes learned"
                  colorScheme="acaiDark"
                  position="left"
                  animate
                  countUpDelay={200}
                />
                <StatTile
                  value={USE_FAKE_STATS ? FAKE.totalXP : totalXP}
                  label="Total XP"
                  colorScheme="acaiLight"
                  position="right"
                  animate
                  countUpDelay={200}
                />
              </View>

              {/* Row 4 — full width acai light */}
              <View style={profileStyles.statRowFull}>
                <StatTile
                  value={USE_FAKE_STATS ? FAKE.lessonsCompleted : lessonsCompleted}
                  label="Lessons completed"
                  colorScheme="acaiLight"
                  position="full"
                  animate
                  countUpDelay={260}
                />
              </View>
            </StaggerGroup>
          )}

          {/* See more / Show less toggle */}
          <TouchableOpacity
            style={profileStyles.seeMoreToggle}
            onPress={() => setIsStatsExpanded(!isStatsExpanded)}
            activeOpacity={0.6}
          >
            <Typography
              family="onest"
              size={14}
              weight="600"
              color="acaiSecondary"
            >
              {isStatsExpanded ? 'Show less' : 'See more'}
            </Typography>
            <Ionicons
              name={isStatsExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.acaiSecondary}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </View>

        {/* ── XP This Week ───────────────────── */}
        <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={1100}>
          <View style={profileStyles.sectionContainer}>
            <Typography
              family="onest"
              size={20}
              weight="600"
              color="onyx"
              style={{ marginBottom: 10 }}
            >
              XP this week
            </Typography>
            <WeeklyXPChart
              data={USE_FAKE_STATS ? FAKE.weeklyXP : weeklyXPData}
              totalXP={USE_FAKE_STATS ? 900 : weeklyXPTotal}
            />
          </View>
        </AnimatedEntrance>

        {/* ── Monthly Badges ─────────────────── */}
        <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={1250}>
          <View style={profileStyles.sectionContainer}>
            <TouchableOpacity
              style={profileStyles.sectionHeader}
              onPress={() => setShowMonthlyBadges(true)}
              activeOpacity={0.7}
            >
              <Typography family="onest" size={20} weight="600" color="onyx">
                Monthly Badges
              </Typography>
              <Ionicons name="chevron-forward" size={22} color={colors.concreteGrey} />
            </TouchableOpacity>

            {/* Badges + pills — each badge with its pill directly below */}
            <View style={profileStyles.badgeRow}>
              {displayedMonthlyBadges.map((badge) => (
                <View key={badge.id} style={profileStyles.badgeItem}>
                  <LiftPressable onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPreviewBadge({ month: badge.month, label: badge.display_text, earned: badge.earned, image: getBadgeImage(badge.imagePath) });
                  }}>
                    <GrayscaleImage
                      source={getBadgeImage(badge.imagePath)}
                      style={profileStyles.badgeImage}
                      width={92}
                      height={92}
                      resizeMode="contain"
                      grayscale={!badge.earned}
                    />
                  </LiftPressable>
                  <MonthPill
                    label={badge.display_text}
                    isSelected={selectedBadgeMonth === badge.month}
                    onPress={() => setSelectedBadgeMonth(badge.month)}
                  />
                </View>
              ))}
            </View>
          </View>
        </AnimatedEntrance>

        {/* ── Achievements ────────────────────── */}
        <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={1400}>
          <View style={profileStyles.sectionContainer}>
            <TouchableOpacity
              style={profileStyles.sectionHeader}
              onPress={() => setShowAchievements(true)}
              activeOpacity={0.7}
            >
              <Typography family="onest" size={20} weight="600" color="onyx">
                Achievements
              </Typography>
              <Ionicons name="chevron-forward" size={22} color={colors.concreteGrey} />
            </TouchableOpacity>

            <View style={profileStyles.achievementRow}>
              {displayedAchievements.map((achievement) => (
                <View key={achievement.id} style={profileStyles.achievementItem}>
                  <LiftPressable onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPreviewAchievement(achievement);
                  }}>
                    <View style={profileStyles.achievementIconWrap}>
                      <GrayscaleImage
                        source={achievement.image || CamelImage}
                        style={profileStyles.achievementImage}
                        width={92}
                        height={92}
                        resizeMode="contain"
                        grayscale={!achievement.unlocked}
                      />
                    </View>
                  </LiftPressable>
                  <Typography
                    family="onest"
                    size={12}
                    weight="600"
                    color={achievement.unlocked ? 'onyx' : 'concreteGrey'}
                    align="center"
                    style={{ marginTop: 6 }}
                  >
                    {achievement.name}
                  </Typography>
                </View>
              ))}
            </View>
          </View>
        </AnimatedEntrance>

        {/* ── Learning Preferences ────────────── */}
        <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={1550}>
          <View style={profileStyles.sectionContainer}>
            <Typography
              family="onest"
              size={20}
              weight="600"
              color="onyx"
              style={{ marginBottom: 10 }}
            >
              Learning Preferences
            </Typography>

            <View style={profileStyles.preferenceRow}>
              <View style={profileStyles.preferenceLeft}>
                <Ionicons
                  name="time-outline"
                  size={22}
                  color={colors.acaiSecondary}
                />
                <Typography
                  family="onest"
                  size={16}
                  weight="500"
                  color="onyx"
                  style={{ marginLeft: 12 }}
                >
                  Daily goal
                </Typography>
              </View>
              <Typography family="onest" size={16} weight="600" color="acaiSecondary">
                {dailyGoalMinutes ? `${dailyGoalMinutes} mins` : 'Not set'}
              </Typography>
            </View>
          </View>
        </AnimatedEntrance>

        {/* ── Sign Out CTA ────────────────────── */}
        <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={1700}>
          <View style={profileStyles.signOutContainer}>
            <DepthButton
              variant="tertiary"
              size="large"
              onPress={handleSignOut}
            >
              <Typography
                family="onest"
                size={18}
                weight="bold"
                color="snow"
                uppercase
              >
                SIGN OUT
              </Typography>
            </DepthButton>
          </View>
        </AnimatedEntrance>

        <View style={profileStyles.bottomSpacer} />
      </ScrollView>

      {/* ── Achievement Preview Detail Card ──── */}
      {previewAchievement && (
        <Modal visible transparent animationType="none" onRequestClose={() => setPreviewAchievement(null)}>
          <AnimatedEntrance preset="fadeIn" delay={0}>
            <Pressable style={profileStyles.detailBackdrop} onPress={() => setPreviewAchievement(null)}><View /></Pressable>
          </AnimatedEntrance>
          <View style={profileStyles.detailCenter} pointerEvents="box-none">
            <AnimatedEntrance
              preset={{ translateY: { from: 40, to: 0 }, scale: { from: 0.94, to: 1 }, opacity: { from: 0, to: 1 }, duration: 500, easing: easings.backOut14 }}
              delay={50}
            >
              <View style={profileStyles.detailCardOuter}>
                <TouchableOpacity style={profileStyles.detailClose} onPress={() => setPreviewAchievement(null)}>
                  <Ionicons name="close" size={22} color="#888" />
                </TouchableOpacity>
                <AnimatedEntrance
                  preset={{ scale: { from: 0.75, to: 1 }, opacity: { from: 0, to: 1 }, translateY: { from: 20, to: 0 }, duration: 650, easing: easings.backOut2 }}
                  delay={150}
                >
                  <Image source={previewAchievement.image || CamelImage} style={profileStyles.detailImage} resizeMode="contain" />
                </AnimatedEntrance>
                <LinearGradient
                  colors={previewAchievement.unlocked ? ['#FFDD63', '#FFFFFF'] : ['#C3C3C3', '#FFFFFF']}
                  start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 0.6 }}
                  style={profileStyles.detailCard}
                >
                  <Typography family="onest" size={28} weight="700" extraColor={previewAchievement.unlocked ? '#1a1a1a' : '#9e9ea3'} style={{ marginBottom: 10 }}>
                    {previewAchievement.name}
                  </Typography>
                  <Typography family="onest" size={16} weight="600" extraColor={previewAchievement.unlocked ? '#1D1D1D' : '#9e9ea3'} style={{ marginBottom: 18 }}>
                    {previewAchievement.description}
                  </Typography>
                  <View style={profileStyles.detailPills}>
                    {previewAchievement.unlocked ? (
                      <>
                        <View style={[profileStyles.detailPill, { backgroundColor: colors.pinkSecondary }]}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Typography family="onest" size={12} weight="600" color="snow">Unlocked</Typography>
                        </View>
                        {previewAchievement.unlockedAt && (
                          <View style={[profileStyles.detailPill, { backgroundColor: colors.acaiSecondary }]}>
                            <Typography family="onest" size={12} weight="600" color="snow">
                              {new Date(previewAchievement.unlockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Typography>
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={[profileStyles.detailPill, { backgroundColor: colors.bluePrimary }]}>
                        <Ionicons name="lock-closed" size={14} color="#fff" />
                        <Typography family="onest" size={12} weight="600" color="snow">Locked</Typography>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </View>
            </AnimatedEntrance>
          </View>
        </Modal>
      )}

      {/* ── Badge Preview Detail Card ────────── */}
      {previewBadge && (
        <Modal visible transparent animationType="none" onRequestClose={() => setPreviewBadge(null)}>
          <AnimatedEntrance preset="fadeIn" delay={0}>
            <Pressable style={profileStyles.detailBackdrop} onPress={() => setPreviewBadge(null)}><View /></Pressable>
          </AnimatedEntrance>
          <View style={profileStyles.detailCenter} pointerEvents="box-none">
            <AnimatedEntrance
              preset={{ translateY: { from: 40, to: 0 }, scale: { from: 0.94, to: 1 }, opacity: { from: 0, to: 1 }, duration: 500, easing: easings.backOut14 }}
              delay={50}
            >
              <View style={profileStyles.detailCardOuter}>
                <TouchableOpacity style={profileStyles.detailClose} onPress={() => setPreviewBadge(null)}>
                  <Ionicons name="close" size={22} color="#888" />
                </TouchableOpacity>
                <AnimatedEntrance
                  preset={{ scale: { from: 0.75, to: 1 }, opacity: { from: 0, to: 1 }, translateY: { from: 20, to: 0 }, duration: 650, easing: easings.backOut2 }}
                  delay={150}
                >
                  <Image source={previewBadge.image} style={profileStyles.detailImage} resizeMode="contain" />
                </AnimatedEntrance>
                <LinearGradient
                  colors={previewBadge.earned ? ['#FFDD63', '#FFFFFF'] : ['#C3C3C3', '#FFFFFF']}
                  start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 0.6 }}
                  style={profileStyles.detailCard}
                >
                  <Typography family="onest" size={28} weight="700" extraColor={previewBadge.earned ? '#1a1a1a' : '#9e9ea3'} style={{ marginBottom: 10 }}>
                    {previewBadge.label}
                  </Typography>
                  <View style={profileStyles.detailPills}>
                    {previewBadge.earned ? (
                      <View style={[profileStyles.detailPill, { backgroundColor: colors.pinkSecondary }]}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                        <Typography family="onest" size={12} weight="600" color="snow">Unlocked</Typography>
                      </View>
                    ) : (
                      <View style={[profileStyles.detailPill, { backgroundColor: colors.bluePrimary }]}>
                        <Ionicons name="lock-closed" size={14} color="#fff" />
                        <Typography family="onest" size={12} weight="600" color="snow">Locked</Typography>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </View>
            </AnimatedEntrance>
          </View>
        </Modal>
      )}

      {/* ── Achievements Grid ────────────────── */}
      <AchievementsScreen
        visible={showAchievements}
        onClose={() => setShowAchievements(false)}
      />

      {/* ── Monthly Badges Grid ──────────────── */}
      {showMonthlyBadges && (
        <MonthlyBadgesScreen
          onClose={() => setShowMonthlyBadges(false)}
          earnedMonths={monthlyBadges.filter((b) => b.earned).map((b) => b.month)}
        />
      )}

      {/* ── Settings Sheet ────────────────────── */}
      {showSettingsSheet && (
        <SettingsSheet
          visible={showSettingsSheet}
          onClose={() => setShowSettingsSheet(false)}
          backgroundMusicEnabled={backgroundMusicEnabled}
          soundEffectsEnabled={soundEffectsEnabled}
          hapticsEnabled={hapticsEnabled}
          onToggleBackgroundMusic={setBackgroundMusicEnabled}
          onToggleSoundEffects={setSoundEffectsEnabled}
          onToggleHaptics={setHapticsEnabled}
          onManageSubscription={handleManageSubscription}
          onPrivacyPolicy={handlePrivacyPolicy}
          onSupport={handleSupport}
          onFAQ={handleFAQ}
          onDeleteAccount={handleDeleteAccount}
        />
      )}
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════
// ProfileScreen Styles
// ══════════════════════════════════════════════
const HORIZONTAL_PADDING = spacing.lg; // 24

const profileStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  gearButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: spacing.lg,
  },
  avatarRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 4,
    borderColor: colors.acaiSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: 155,
    height: 155,
    borderRadius: 77.5,
    resizeMode: 'contain' as const,
  },
  editBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.acaiSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },

  // Identity
  identityBlock: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  identityPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  identityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bluePrimary,
    opacity: 0.95,
  },

  // Stat tiles
  statSection: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  statRowFull: {
    marginBottom: 6,
  },
  statTile: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    minHeight: 90,
  },
  statTileRight: {
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
  },
  statTileContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  seeMoreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },

  // Sections shared
  sectionContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  // Monthly badges
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  badgeItem: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  badgeImage: {
    width: 92,
    height: 92,
  },
  monthPillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  monthPill: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.concreteGrey,
    overflow: 'hidden',
  },
  monthPillFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
    transformOrigin: 'left center',
  },

  // Achievements
  achievementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 16,
  },
  achievementItem: {
    alignItems: 'center',
    flex: 1,
  },
  achievementIconWrap: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  achievementImage: {
    width: 92,
    height: 92,
  },

  // Learning Preferences
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.acaiTertiary,
    height: 57,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Sign out
  signOutContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginTop: 28,
    marginBottom: spacing.lg,
  },

  bottomSpacer: {
    height: 40,
  },

  // Detail card overlay (shared by achievement + badge previews)
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  detailCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCardOuter: {
    width: 328,
    alignItems: 'center',
  },
  detailClose: {
    position: 'absolute',
    top: -44,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  detailImage: {
    width: 180,
    height: 170,
    marginBottom: -60,
    zIndex: 5,
  },
  detailCard: {
    width: 328,
    borderRadius: 25,
    paddingTop: 80,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  detailPills: {
    flexDirection: 'row',
    gap: 11,
    alignItems: 'center',
  },
  detailPill: {
    height: 30,
    borderRadius: 17,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
