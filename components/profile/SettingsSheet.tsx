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
import { SvgXml } from 'react-native-svg';

import { Typography } from '@/components/ui';
import { AnimatedEntrance, StaggerGroup } from '@/components/ui/animations';
import {
  colors,
  spacing,
  easings,
  safeDuration,
} from '@/components/ui/theme';

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
              borderColor: borderColor,
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
    <SettingsCard style={styles.rowWrapper}>
      <View style={styles.rowContent}>
        <View style={styles.rowLeft}>
          {icon}
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
  icon,
  title,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
}) {
  return (
    <SettingsCard onPress={onPress} style={styles.rowWrapper}>
      <View style={styles.rowContent}>
        <View style={styles.rowLeft}>
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
        style={styles.rowWrapper}
      >
        <View style={styles.rowContent}>
          <View style={styles.rowLeft}>
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
            {svgIcon(iconCloseX(colors.bluePrimary), 36, 36)}
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
              icon={svgIcon(iconBgMusic(colors.bluePrimary), 20, 20)}
              title="Background Music"
              subtitle="Ambient music during lessons"
              value={backgroundMusicEnabled}
              onValueChange={onToggleBackgroundMusic}
            />
            <ToggleRow
              icon={svgIcon(iconSfx(colors.bluePrimary), 24, 22)}
              title="Sound Effects"
              subtitle="Quiz feedback and celebrations"
              value={soundEffectsEnabled}
              onValueChange={onToggleSoundEffects}
            />
            <ToggleRow
              icon={svgIcon(iconVibrate(colors.bluePrimary), 20, 30)}
              title="Vibration"
              subtitle="Haptic feedback"
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
              icon={svgIcon(iconShield(colors.bluePrimary), 22, 26)}
              title="Privacy Policy"
              onPress={onPrivacyPolicy}
            />
            <NavRow
              icon={svgIcon(iconQuestion(colors.bluePrimary), 22, 22)}
              title="Support"
              onPress={onSupport}
            />
            <NavRow
              icon={svgIcon(iconChatFaq(colors.bluePrimary), 24, 23)}
              title="FAQ"
              onPress={onFAQ}
            />
            <NavRow
              icon={svgIcon(iconCard(colors.bluePrimary), 25, 20)}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.bluePrimary,
    marginHorizontal: CARD_HORIZONTAL_MARGIN,
    marginVertical: spacing.md,
  },
});
