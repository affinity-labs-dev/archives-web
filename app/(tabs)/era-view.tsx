// Era View Screen (v5.0 Design System)
// Shows adventures within the selected era with progress header and bento grid

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAdventures } from '@/hooks/useAdventures';
import { useEras } from '@/hooks/useEras';
import { useGamifiedProgress, useAI, useEraProgressStore } from '@/gamification';
import type { EraProgressStats } from '@/gamification';
import BentoGridScreen from '@/components/adventure/types/bento-grid/BentoGridScreen';
import EraProgressHeader from '@/components/shared/EraProgressHeader';
import ComingSoonView from '@/components/eras/ComingSoonView';
import { Typography, DepthButton } from '@/components/ui';
import { colors, spacing } from '@/components/ui/theme';
import { WALKTHROUGH_KEYS } from '@/constants/WalkthroughKeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/clerk-expo';
import { analyticsService } from '@/services/AnalyticsService';
import AdventuresFeed from '@/components/adventure/shared/AdventuresFeed';

export default function AdventuresScreen() {
  const { selectedEra, isLoading: gamificationLoading, setSelectedEra } = useGamifiedProgress();
  const { updateContext } = useAI();
  const supabaseEraId = selectedEra || '';
  const router = useRouter();

  const { adventures, loading, error, refreshAdventures } = useAdventures(supabaseEraId);
  const { eras, loading: erasLoading, error: erasError } = useEras();

  const userProgress = useEraProgressStore((s) => s.userProgress);

  // Focus counter — replays animations when screen regains focus (not first mount)
  const [focusKey, setFocusKey] = useState(0);
  const hasMounted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasMounted.current) {
        setFocusKey(k => k + 1);
      } else {
        hasMounted.current = true;
      }
    }, [])
  );

  // Only show loading screen on INITIAL load
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  useEffect(() => {
    if (!gamificationLoading && !initialLoadDone) {
      setInitialLoadDone(true);
    }
  }, [gamificationLoading, initialLoadDone]);
  const progressLoading = !initialLoadDone && gamificationLoading;

  const [refreshing, setRefreshing] = useState(false);
  const [showPullToRefreshHint, setShowPullToRefreshHint] = useState(true);

  // Adventures Feed sheet
  const [showAdventuresFeed, setShowAdventuresFeed] = useState(false);

  // Era progress - computed locally from Zustand userProgress + adventures
  const quizProgress = useMemo<EraProgressStats>(() => {
    if (!adventures || adventures.length === 0) {
      return { correctAnswers: 0, totalQuestions: 0, percentage: 0, totalXP: 0 };
    }

    const totalQuestions = adventures.reduce((sum, adv) =>
      sum + (adv.content_list || []).reduce((mSum, mod) => mSum + (mod.questions?.length || 0), 0),
    0);

    const eraModules = userProgress.filter(m => m.era_id === supabaseEraId && m.quizCompleted);
    const correctAnswers = eraModules.reduce((sum, m) => sum + (m.quizCorrectAnswers || 0), 0);

    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    return { correctAnswers, totalQuestions, percentage, totalXP: correctAnswers * 10 };
  }, [adventures, userProgress, supabaseEraId]);

  // Get selected era data from eras table
  const selectedEraData = useMemo(() => {
    return eras.find(era => era.era_id === supabaseEraId);
  }, [eras, supabaseEraId]);

  // Auto-correct invalid selectedEra (migration fix)
  useEffect(() => {
    if (!erasLoading && eras.length > 0 && selectedEra && !selectedEraData) {
      console.log(`⚠️ [Adventures] Invalid selectedEra "${selectedEra}" - auto-selecting first era`);
      const firstActiveEra = eras.find(era => era.status === 'active');
      if (firstActiveEra) {
        setSelectedEra(firstActiveEra.era_id);
      }
    }
  }, [erasLoading, eras, selectedEra, selectedEraData, setSelectedEra]);

  // Update AI context when era changes
  useEffect(() => {
    if (selectedEraData) {
      updateContext({
        eraId: supabaseEraId,
        eraName: selectedEraData.title || supabaseEraId,
        currentScreen: 'era-view',
      });
      console.log('🤖 [Adventures] Updated AI context for era:', selectedEraData.title);
    }
  }, [selectedEraData, supabaseEraId, updateContext]);

  // Check if user has seen pull-to-refresh hint
  useEffect(() => {
    const checkPullToRefreshHint = async () => {
      try {
        const hasSeenHint = await AsyncStorage.getItem(WALKTHROUGH_KEYS.PULL_TO_REFRESH);
        if (hasSeenHint === 'true') {
          setShowPullToRefreshHint(false);
        }
      } catch (err) {
        console.error('❌ [Adventures] Error checking pull-to-refresh hint:', err);
      }
    };
    checkPullToRefreshHint();
  }, []);

  // Calculate completed adventures count
  const completedAdventuresCount = useMemo(() => {
    if (!adventures || adventures.length === 0) return 0;

    return adventures.filter(adventure => {
      const adventureModules = adventure.content_list || [];
      const completedModules = adventureModules.filter(module => {
        const mp = userProgress.find(
          p => p.adventureId === adventure.readable_id && p.moduleId === module.id
        );
        return mp?.isCompleted && mp?.quizCompleted;
      });
      return adventureModules.length > 0 && completedModules.length === adventureModules.length;
    }).length;
  }, [adventures, userProgress]);

  const { user, isSignedIn } = useUser();

  // Fallback: Ensure Clerk user ID is set in PostHog
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

  // Track era_started (fires once per era per user)
  const hasTrackedEraStartRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedEra || !selectedEraData || hasTrackedEraStartRef.current === selectedEra) return;

    const trackEraStart = async () => {
      const key = `era_started_${selectedEra}`;
      const hasTracked = await AsyncStorage.getItem(key);
      if (!hasTracked) {
        analyticsService.trackEraStarted({
          era_id: selectedEra,
          era_name: selectedEraData.title || selectedEra,
          screen: 'era_view',
        });
        await AsyncStorage.setItem(key, 'true');
      }
      hasTrackedEraStartRef.current = selectedEra;
    };
    trackEraStart();
  }, [selectedEra, selectedEraData]);

  // Track era_completed (fires once when all adventures in era are done)
  const hasTrackedEraCompleteRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedEra || !adventures || adventures.length === 0) return;
    if (completedAdventuresCount < adventures.length) return;
    if (hasTrackedEraCompleteRef.current === selectedEra) return;

    const trackEraComplete = async () => {
      const key = `era_completed_${selectedEra}`;
      const hasTracked = await AsyncStorage.getItem(key);
      if (!hasTracked) {
        analyticsService.trackEraCompleted({
          era_id: selectedEra,
          era_name: selectedEraData?.title || selectedEra,
          total_adventures: adventures.length,
          total_xp: quizProgress.totalXP || 0,
        });
        await AsyncStorage.setItem(key, 'true');
      }
      hasTrackedEraCompleteRef.current = selectedEra;
    };
    trackEraComplete();
  }, [selectedEra, selectedEraData, adventures, completedAdventuresCount, quizProgress.totalXP]);

  // Track page view
  useFocusEffect(
    useCallback(() => {
      analyticsService.startPageView('adventures', '/(tabs)/era-view');
      return () => {
        analyticsService.endPageView('adventures');
      };
    }, [])
  );

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    if (showPullToRefreshHint) {
      try {
        await AsyncStorage.setItem(WALKTHROUGH_KEYS.PULL_TO_REFRESH, 'true');
        setShowPullToRefreshHint(false);
      } catch (err) {
        console.error('❌ [Adventures] Error saving pull-to-refresh hint:', err);
      }
    }

    try {
      await refreshAdventures();
    } catch (err) {
      console.error('❌ [Adventures] Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAdventures, showPullToRefreshHint]);

  // Navigate to Eras tab
  const goToErasTab = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/eras');
  }, [router]);

  // No era selected
  if (!selectedEra) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="library-outline" size={48} color={colors.bluePrimary} style={{ marginBottom: spacing.md }} />
        <Typography variant="heading.m" color="onyx" align="center">
          No era selected
        </Typography>
        <Typography variant="body.m" color="textMuted" align="center" style={{ marginBottom: spacing.lg }}>
          Choose an era to start your journey
        </Typography>
        <DepthButton variant="tertiary" size="medium" onPress={goToErasTab} isFullWidth={false}>
          <Typography variant="label.m" color="white" weight="700">
            Select Era
          </Typography>
        </DepthButton>
      </View>
    );
  }

  // Loading state
  if (loading || progressLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.bluePrimary} />
        <Typography variant="body.m" color="textMuted" style={{ marginTop: spacing.md }}>
          Loading adventures...
        </Typography>
      </View>
    );
  }

  // Error state
  if (error || erasError) {
    const isNetworkError = (error?.message || erasError || '').toLowerCase().includes('network');
    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name={isNetworkError ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={48}
          color={colors.bluePrimary}
          style={{ marginBottom: spacing.md }}
        />
        <Typography variant="heading.m" color="onyx" align="center">
          {isNetworkError ? 'No internet connection' : 'Failed to load adventures'}
        </Typography>
        <Typography variant="body.s" color="textMuted" align="center" style={{ marginBottom: spacing.lg }}>
          {isNetworkError ? 'Please check your connection and try again' : (error?.message || erasError)}
        </Typography>
        <DepthButton variant="tertiary" size="medium" onPress={handleRefresh} isFullWidth={false}>
          <Typography variant="label.m" color="white" weight="700">
            Try Again
          </Typography>
        </DepthButton>
      </View>
    );
  }

  // No adventures found - show coming soon
  if (!adventures || adventures.length === 0) {
    if (!selectedEraData) {
      if (erasLoading) {
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.bluePrimary} />
            <Typography variant="body.m" color="textMuted" style={{ marginTop: spacing.md }}>
              Loading era...
            </Typography>
          </View>
        );
      }
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="help-circle-outline" size={48} color={colors.bluePrimary} style={{ marginBottom: spacing.md }} />
          <Typography variant="heading.m" color="onyx" align="center">
            Era not found
          </Typography>
          <Typography variant="body.s" color="textMuted" align="center" style={{ marginBottom: spacing.lg }}>
            The selected era is no longer available
          </Typography>
          <DepthButton variant="tertiary" size="medium" onPress={goToErasTab} isFullWidth={false}>
            <Typography variant="label.m" color="white" weight="700">
              Select Era
            </Typography>
          </DepthButton>
        </View>
      );
    }
    return (
      <ComingSoonView
        eraData={selectedEraData}
        onBack={() => {}}
      />
    );
  }

  // Show adventures
  return (
    <View style={styles.container}>
      <EraProgressHeader
        key={`progress-${focusKey}`}
        title={selectedEraData?.title || ''}
        correctAnswers={quizProgress.correctAnswers}
        totalQuestions={quizProgress.totalQuestions}
        totalXP={quizProgress.totalXP}
        onPress={() => setShowAdventuresFeed(true)}
      />

      <BentoGridScreen
        key={`bento-${focusKey}`}
        adventures={adventures}
        userProgress={userProgress}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showPullToRefreshHint={showPullToRefreshHint}
      />

      {/* Adventures Feed Sheet */}
      <AdventuresFeed
        visible={showAdventuresFeed}
        adventures={adventures}
        onDismiss={() => setShowAdventuresFeed(false)}
        onAdventurePress={() => {
          setShowAdventuresFeed(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.snow,
    padding: spacing.lg,
  },
});
