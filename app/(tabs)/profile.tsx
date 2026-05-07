/**
 * ProfileTab — v5 redesign of the Profile tab.
 *
 * Slim orchestrator: state from hooks, JSX from sectioned components.
 * Mirrors the today.tsx pattern (hooks/today/* + components/today/*).
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '@/components/ui/Typography';
import { DepthButton } from '@/components/ui/DepthButton';
import { AnimatedEntrance } from '@/components/ui/animations/AnimatedEntrance';
import { colors } from '@/components/ui/theme';

// Gamification
import {
  useGamifiedProgress,
  useGamificationOrchestrator,
  useRewards,
} from '@/gamification';

// Context / stores
import { usePreferences } from '@/context/PreferencesContext';
import { useOnboardingStore } from '@/stores/onboardingStore';

// Profile hooks (logic)
import {
  useAvatarBreathe,
  useMonthlyBadges,
  useNewUserProgress,
  useProfileAccount,
  useProfileFirstMount,
  useProfilePageView,
  useProfileStats,
  useStoredTotalXP,
} from '@/hooks/profile';

// Profile UI
import { AchievementsScreen } from '@/components/profile/AchievementsScreen';
import { AvatarSelectorSheet } from '@/components/profile/AvatarSelectorSheet';
import { MonthlyBadgesScreen } from '@/components/profile/MonthlyBadgesScreen';
import { WeeklyXPChart } from '@/components/profile/WeeklyXPChart';
import { SettingsSheet } from '@/components/profile/settings/SettingsSheet';
import { AchievementDetailCard } from '@/components/profile/shared/AchievementDetailCard';
import { ProfileAchievements } from '@/components/profile/sections/ProfileAchievements';
import { ProfileAvatarSection } from '@/components/profile/sections/ProfileAvatarSection';
import { ProfileHeader } from '@/components/profile/sections/ProfileHeader';
import { ProfileLearningPreferences } from '@/components/profile/sections/ProfileLearningPreferences';
import { ProfileMonthlyBadges } from '@/components/profile/sections/ProfileMonthlyBadges';
import { ProfileStatGrid } from '@/components/profile/sections/ProfileStatGrid';
import { profileStyles } from '@/components/profile/sections/styles';
import type { BadgePreview, DisplayAchievement } from '@/components/profile/types';

import CamelImage from '@/assets/images/quiz-images/Camel.png';

export default function ProfileTab() {
  // Animations only play on first mount, not on every tab return
  const shouldAnimate = useProfileFirstMount();

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
  const { avatars, selectedAvatar, setSelectedAvatar } = useRewards();
  const { achievements, streak, longestStreak } = useGamificationOrchestrator();
  const dailyGoalMinutes = useOnboardingStore((s) => s.dailyGoalMinutes);

  // ── UI state ──────────────────────────────────
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showMonthlyBadges, setShowMonthlyBadges] = useState(false);
  const [previewAchievement, setPreviewAchievement] = useState<DisplayAchievement | null>(null);
  const [previewBadge, setPreviewBadge] = useState<BadgePreview | null>(null);

  // ── Data hooks ────────────────────────────────
  const newUserProgress = useNewUserProgress();
  const totalXP = useStoredTotalXP({
    moduleProgress,
    newUserProgress,
    calculateTotalXP,
  });
  const { lessonsCompleted, minutesLearned, xpPercentile, weeklyXPData, weeklyXPTotal } = useProfileStats({
    moduleProgress,
    progressEntries: gamificationState?.progress || [],
    newUserProgress,
    calculateModulesCompleted,
    totalXP,
  });

  useProfilePageView({ isSignedIn, user, totalXP, currentStreak: streak, lessonsCompleted });
  const {
    monthlyBadges,
    earnedMonths,
    selectedBadgeMonth,
    setSelectedBadgeMonth,
  } = useMonthlyBadges({ moduleProgress });
  const avatarAnimatedStyle = useAvatarBreathe();

  // ── Account actions ───────────────────────────
  const {
    handleSignOut,
    handleDeleteAccount,
    handleManageSubscription,
    handlePrivacyPolicy,
    handleSupport,
    handleFAQ,
  } = useProfileAccount({
    user,
    signOut,
    router,
    moduleProgress,
    newUserProgress,
    totalXP,
    onSettingsClose: () => setShowSettingsSheet(false),
  });

  // ── Derived display values ────────────────────
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

  // ── Stable callbacks ─────────────────────────
  // Stable refs prevent memoized section components from re-rendering
  // every time ProfileTab re-renders (e.g. when isStatsExpanded toggles).
  const handleOpenSettings = useCallback(() => setShowSettingsSheet(true), []);
  const handleCloseSettings = useCallback(() => setShowSettingsSheet(false), []);
  const handleToggleStats = useCallback(() => setIsStatsExpanded((v) => !v), []);
  const handleOpenMonthlyBadges = useCallback(
    () => setShowMonthlyBadges(true),
    [],
  );
  const handleCloseMonthlyBadges = useCallback(
    () => setShowMonthlyBadges(false),
    [],
  );
  const handleOpenAchievements = useCallback(() => setShowAchievements(true), []);
  const handleCloseAchievements = useCallback(() => setShowAchievements(false), []);
  const handleOpenAvatarPicker = useCallback(() => setShowAvatarSelector(true), []);
  const handleCloseAvatarSelector = useCallback(() => setShowAvatarSelector(false), []);
  const [localAvatarId, setLocalAvatarId] = useState<string | null>(null);

  const baseAvatar = selectedAvatar || avatars[0];
  // When user picks from the avatar selector, localAvatarId overrides
  // the image_url so getAvatarImage resolves the new v5 asset immediately
  const currentAvatar = localAvatarId
    ? { ...baseAvatar, image_url: localAvatarId }
    : baseAvatar;

  const handleSaveAvatar = useCallback(
    (avatarId: string) => {
      // Store the local ID so getAvatarImage can resolve it immediately
      setLocalAvatarId(avatarId);

      // Sync with Supabase rewards system
      const match = avatars.find(
        (a) =>
          a.id === avatarId ||
          a.name === avatarId ||
          a.name?.toLowerCase() === avatarId ||
          a.image_url?.toLowerCase().includes(avatarId),
      );
      if (match) {
        setSelectedAvatar(match);
      }
    },
    [avatars, setSelectedAvatar],
  );
  const handleClosePreviewAchievement = useCallback(
    () => setPreviewAchievement(null),
    [],
  );
  const handleClosePreviewBadge = useCallback(() => setPreviewBadge(null), []);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        profileStylesLocal.safeArea,
        Platform.OS === 'android' && profileStylesLocal.androidTopPad,
      ]}
    >
      <Animated.ScrollView
        style={profileStylesLocal.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={profileStylesLocal.scrollContent}
        // Android scroll perf: unmount off-screen subviews while
        // scrolling. Big win on a screen with multiple Reanimated
        // entrances + GrayscaleImage SVG filters in the badge/
        // achievement rows that stay mounted otherwise.
        removeClippedSubviews={Platform.OS === 'android'}
        // 16ms = 60fps; default is 0 (every frame, expensive on JS).
        // Profile has no scroll-driven animation — 16 is plenty.
        scrollEventThrottle={16}
        // Android: native overscroll glow flicker disabled (cosmetic + tiny perf win).
        overScrollMode={Platform.OS === 'android' ? 'never' : 'auto'}
      >
        <ProfileHeader
          shouldAnimate={shouldAnimate}
          onOpenSettings={handleOpenSettings}
        />

        <ProfileAvatarSection
          shouldAnimate={shouldAnimate}
          currentAvatar={currentAvatar}
          displayName={displayName}
          joinedYear={joinedYear}
          avatarAnimatedStyle={avatarAnimatedStyle}
          onOpenAvatarPicker={handleOpenAvatarPicker}
        />

        <ProfileStatGrid
          shouldAnimate={shouldAnimate}
          longestStreak={longestStreak}
          streak={streak}
          lessonsCompleted={lessonsCompleted}
          totalXP={totalXP}
          minutesLearned={minutesLearned}
          xpPercentile={xpPercentile}
          isExpanded={isStatsExpanded}
          onToggleExpanded={handleToggleStats}
        />

        <View style={profileStylesLocal.bottomStack}>
          <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={1100}>
            <View style={profileStyles.sectionContainer}>
              <Typography
                family="onest"
                size={20}
                weight="600"
                color="onyx"
                style={profileStylesLocal.sectionLabel}
              >
                XP this week
              </Typography>
              <WeeklyXPChart
                data={weeklyXPData}
                totalXP={weeklyXPTotal}
              />
            </View>
          </AnimatedEntrance>

          <ProfileMonthlyBadges
            shouldAnimate={shouldAnimate}
            badges={monthlyBadges}
            selectedMonth={selectedBadgeMonth}
            onSelectMonth={setSelectedBadgeMonth}
            onOpenAll={handleOpenMonthlyBadges}
            onPreviewBadge={setPreviewBadge}
          />

          <ProfileAchievements
            shouldAnimate={shouldAnimate}
            achievements={achievements}
            onOpenAll={handleOpenAchievements}
            onPreviewAchievement={setPreviewAchievement}
          />

          <ProfileLearningPreferences
            shouldAnimate={shouldAnimate}
            dailyGoalMinutes={dailyGoalMinutes}
          />

          <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={1700}>
            <View style={profileStyles.signOutContainer}>
              <DepthButton variant="tertiary" size="large" onPress={handleSignOut}>
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
        </View>
      </Animated.ScrollView>

      <AchievementDetailCard
        visible={!!previewAchievement}
        onClose={handleClosePreviewAchievement}
        image={previewAchievement?.image || CamelImage}
        title={previewAchievement?.name || ''}
        description={previewAchievement?.description}
        unlocked={!!previewAchievement?.unlocked}
        unlockedAt={previewAchievement?.unlockedAt}
      />

      <AchievementDetailCard
        visible={!!previewBadge}
        onClose={handleClosePreviewBadge}
        image={previewBadge?.image}
        title={previewBadge?.label || ''}
        unlocked={!!previewBadge?.earned}
        // Badges only have a single colored asset — apply the SVG
        // grayscale filter when locked. Achievements pass pre-rendered
        // locked artwork instead and leave this off.
        useGrayscaleWhenLocked
      />

      <AchievementsScreen
        visible={showAchievements}
        onClose={handleCloseAchievements}
      />

      {showMonthlyBadges && (
        <MonthlyBadgesScreen
          onClose={handleCloseMonthlyBadges}
          earnedMonths={earnedMonths}
        />
      )}

      <AvatarSelectorSheet
        visible={showAvatarSelector}
        onClose={handleCloseAvatarSelector}
        currentAvatarId={currentAvatar?.image_url?.toLowerCase().replace('avatars/', '').replace('.png', '') ?? null}
        onSave={handleSaveAvatar}
      />

      {showSettingsSheet && (
        <SettingsSheet
          visible={showSettingsSheet}
          onClose={handleCloseSettings}
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

// Screen-level chrome only (safeArea + scroll wrapping). The section
// styles (header/avatar/stats/etc.) live next to the components they
// belong to in components/profile/sections/styles.ts.
const profileStylesLocal = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  // Android pads ~status bar height; iOS already handled by SafeAreaView edges.
  androidTopPad: {
    paddingTop: 11,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  // Vertical gap between bottom-half sections (XP chart → monthly badges
  // → achievements → learning prefs → sign-out CTA). Hoisted so React
  // doesn't allocate a new style object every render.
  bottomStack: {
    gap: 32,
  },
  sectionLabel: {
    marginBottom: 10,
  },
});
