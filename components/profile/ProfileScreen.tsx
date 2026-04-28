/**
 * ProfileScreen — v5 redesign of the Profile tab.
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
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

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
import { SettingsSheet } from '@/components/profile/SettingsSheet';
import { AchievementsScreen } from '@/components/profile/AchievementsScreen';
import { MonthlyBadgesScreen } from '@/components/profile/MonthlyBadgesScreen';

// Fallback image for achievements
import CamelImage from '@/assets/images/quiz-images/Camel.png';

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
    <View style={[styles.statTile, { backgroundColor: scheme.bg }, borderRadiusStyle]}>
      <View style={styles.statTileContent}>
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
      style={styles.monthPill}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Background fill (ink-wash) */}
      <Animated.View
        style={[
          styles.monthPillFill,
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
const USE_FAKE_STATS = true;
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
export function ProfileScreen() {
  // Track first mount — animations only play once, not on every tab switch
  const hasAnimated = useRef(false);
  useEffect(() => {
    hasAnimated.current = true;
  }, []);
  // DEBUG: Force true to test animations. Set back to !hasAnimated.current for production.
  const shouldAnimate = true;

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
      style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: 20 }]}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header ────────────────────────── */}
        <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={60}>
          <View style={styles.header}>
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
              style={styles.gearButton}
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
        <View style={styles.avatarSection}>
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
              style={styles.avatarRing}
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
                    style={styles.avatarImage}
                  />
                </Animated.View>
              </AnimatedEntrance>
              {/* Edit badge */}
              <View style={styles.editBadge}>
                <MaterialIcons name="edit" size={16} color={colors.white} />
              </View>
            </TouchableOpacity>
          </AnimatedEntrance>

          {/* Identity block */}
          <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={520}>
            <View style={styles.identityBlock}>
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
                <View style={styles.identityPills}>
                  <Typography family="onest" size={16} weight="500" color="bluePrimary">
                    {currentAvatar.display_text || ''}
                  </Typography>
                  <View style={styles.identityDot} />
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
        <View style={styles.statSection}>
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
            <View style={styles.statRow}>
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
            <View style={styles.statRow}>
              <StatTile
                value={USE_FAKE_STATS ? FAKE.lessonsCompleted : lessonsCompleted}
                label="Videos watched"
                colorScheme="acaiLight"
                position="left"
                animate={shouldAnimate}
                countUpDelay={shouldAnimate ? 1130 : 0}
              />
              <View style={[styles.statTile, styles.statTileRight, { backgroundColor: colors.acaiSecondary }]}>
                <View style={styles.statTileContent}>
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
              <View style={styles.statRow}>
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
              <View style={styles.statRowFull}>
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
            style={styles.seeMoreToggle}
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
          <View style={styles.sectionContainer}>
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
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowMonthlyBadges(true)}
              activeOpacity={0.7}
            >
              <Typography family="onest" size={20} weight="600" color="onyx">
                Monthly Badges
              </Typography>
              <Ionicons name="chevron-forward" size={22} color={colors.concreteGrey} />
            </TouchableOpacity>

            {/* Badges + pills — each badge with its pill directly below */}
            <View style={styles.badgeRow}>
              {displayedMonthlyBadges.map((badge) => (
                <View key={badge.id} style={styles.badgeItem}>
                  <LiftPressable onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPreviewBadge({ month: badge.month, label: badge.display_text, earned: badge.earned, image: getBadgeImage(badge.imagePath) });
                  }}>
                    <GrayscaleImage
                      source={getBadgeImage(badge.imagePath)}
                      style={styles.badgeImage}
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
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowAchievements(true)}
              activeOpacity={0.7}
            >
              <Typography family="onest" size={20} weight="600" color="onyx">
                Achievements
              </Typography>
              <Ionicons name="chevron-forward" size={22} color={colors.concreteGrey} />
            </TouchableOpacity>

            <View style={styles.achievementRow}>
              {displayedAchievements.map((achievement) => (
                <View key={achievement.id} style={styles.achievementItem}>
                  <LiftPressable onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPreviewAchievement(achievement);
                  }}>
                    <View style={styles.achievementIconWrap}>
                      <GrayscaleImage
                        source={achievement.image || CamelImage}
                        style={styles.achievementImage}
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
          <View style={styles.sectionContainer}>
            <Typography
              family="onest"
              size={20}
              weight="600"
              color="onyx"
              style={{ marginBottom: 10 }}
            >
              Learning Preferences
            </Typography>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceLeft}>
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
          <View style={styles.signOutContainer}>
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

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Achievement Preview Detail Card ──── */}
      {previewAchievement && (
        <Modal visible transparent animationType="none" onRequestClose={() => setPreviewAchievement(null)}>
          <AnimatedEntrance preset="fadeIn" delay={0}>
            <Pressable style={styles.detailBackdrop} onPress={() => setPreviewAchievement(null)}><View /></Pressable>
          </AnimatedEntrance>
          <View style={styles.detailCenter} pointerEvents="box-none">
            <AnimatedEntrance
              preset={{ translateY: { from: 40, to: 0 }, scale: { from: 0.94, to: 1 }, opacity: { from: 0, to: 1 }, duration: 500, easing: easings.backOut14 }}
              delay={50}
            >
              <View style={styles.detailCardOuter}>
                <TouchableOpacity style={styles.detailClose} onPress={() => setPreviewAchievement(null)}>
                  <Ionicons name="close" size={22} color="#888" />
                </TouchableOpacity>
                <AnimatedEntrance
                  preset={{ scale: { from: 0.75, to: 1 }, opacity: { from: 0, to: 1 }, translateY: { from: 20, to: 0 }, duration: 650, easing: easings.backOut2 }}
                  delay={150}
                >
                  <Image source={previewAchievement.image || CamelImage} style={styles.detailImage} resizeMode="contain" />
                </AnimatedEntrance>
                <LinearGradient
                  colors={previewAchievement.unlocked ? ['#FFDD63', '#FFFFFF'] : ['#C3C3C3', '#FFFFFF']}
                  start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 0.6 }}
                  style={styles.detailCard}
                >
                  <Typography family="onest" size={28} weight="700" extraColor={previewAchievement.unlocked ? '#1a1a1a' : '#9e9ea3'} style={{ marginBottom: 10 }}>
                    {previewAchievement.name}
                  </Typography>
                  <Typography family="onest" size={16} weight="600" extraColor={previewAchievement.unlocked ? '#1D1D1D' : '#9e9ea3'} style={{ marginBottom: 18 }}>
                    {previewAchievement.description}
                  </Typography>
                  <View style={styles.detailPills}>
                    {previewAchievement.unlocked ? (
                      <>
                        <View style={[styles.detailPill, { backgroundColor: colors.pinkSecondary }]}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Typography family="onest" size={12} weight="600" color="snow">Unlocked</Typography>
                        </View>
                        {previewAchievement.unlockedAt && (
                          <View style={[styles.detailPill, { backgroundColor: colors.acaiSecondary }]}>
                            <Typography family="onest" size={12} weight="600" color="snow">
                              {new Date(previewAchievement.unlockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Typography>
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={[styles.detailPill, { backgroundColor: colors.bluePrimary }]}>
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
            <Pressable style={styles.detailBackdrop} onPress={() => setPreviewBadge(null)}><View /></Pressable>
          </AnimatedEntrance>
          <View style={styles.detailCenter} pointerEvents="box-none">
            <AnimatedEntrance
              preset={{ translateY: { from: 40, to: 0 }, scale: { from: 0.94, to: 1 }, opacity: { from: 0, to: 1 }, duration: 500, easing: easings.backOut14 }}
              delay={50}
            >
              <View style={styles.detailCardOuter}>
                <TouchableOpacity style={styles.detailClose} onPress={() => setPreviewBadge(null)}>
                  <Ionicons name="close" size={22} color="#888" />
                </TouchableOpacity>
                <AnimatedEntrance
                  preset={{ scale: { from: 0.75, to: 1 }, opacity: { from: 0, to: 1 }, translateY: { from: 20, to: 0 }, duration: 650, easing: easings.backOut2 }}
                  delay={150}
                >
                  <Image source={previewBadge.image} style={styles.detailImage} resizeMode="contain" />
                </AnimatedEntrance>
                <LinearGradient
                  colors={previewBadge.earned ? ['#FFDD63', '#FFFFFF'] : ['#C3C3C3', '#FFFFFF']}
                  start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 0.6 }}
                  style={styles.detailCard}
                >
                  <Typography family="onest" size={28} weight="700" extraColor={previewBadge.earned ? '#1a1a1a' : '#9e9ea3'} style={{ marginBottom: 10 }}>
                    {previewBadge.label}
                  </Typography>
                  <View style={styles.detailPills}>
                    {previewBadge.earned ? (
                      <View style={[styles.detailPill, { backgroundColor: colors.pinkSecondary }]}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                        <Typography family="onest" size={12} weight="600" color="snow">Unlocked</Typography>
                      </View>
                    ) : (
                      <View style={[styles.detailPill, { backgroundColor: colors.bluePrimary }]}>
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
// Styles
// ══════════════════════════════════════════════
const HORIZONTAL_PADDING = spacing.lg; // 24

const styles = StyleSheet.create({
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
