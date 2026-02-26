import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ActivityIndicator, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAdventures } from '@/hooks/useAdventures';
import { useEras } from '@/hooks/useEras';
import { useGamifiedProgress, useAI, useGamificationOrchestrator } from '@/gamification';
import type { EraProgressStats } from '@/gamification';
import BentoGridScreen from '@/components/adventure/types/bento-grid/BentoGridScreen';
import EraProgressHeader from '@/components/shared/EraProgressHeader';
import ComingSoonView from '@/components/eras/ComingSoonView';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { WALKTHROUGH_KEYS } from '@/constants/WalkthroughKeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/clerk-expo';
import { analyticsService } from '@/services/AnalyticsService';
import GameHub from '@/gamification/ui/games/GameHub';

// User progress type (era-agnostic)
interface UserProgress {
  adventureId: string;
  moduleId: string;
  quizScore: number;
  quizCorrectAnswers?: number;
  isCompleted: boolean;
  quizCompleted: boolean;
  completedAt: string;
  era_id: string;
}

export default function AdventuresScreen() {
  // Get selected era from context (data-driven)
  const { selectedEra, moduleProgress, isLoading: gamificationLoading, setSelectedEra } = useGamifiedProgress();

  // Get AI context for updating era awareness
  const { updateContext } = useAI();

  // Get centralized era progress calculation
  const { getEraProgress } = useGamificationOrchestrator();

  // Use selectedEra directly (already Supabase era_id format)
  const supabaseEraId = selectedEra || '';

  // Router for navigation
  const router = useRouter();

  // Fetch adventures for selected era (dynamic, not hardcoded)
  const { adventures, loading, error, refreshAdventures } = useAdventures(supabaseEraId);
  const { eras, loading: erasLoading, error: erasError } = useEras();
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPullToRefreshHint, setShowPullToRefreshHint] = useState(true);

  // Puzzle FAB state
  const [showGameHub, setShowGameHub] = useState(false);
  const [showNewPuzzleBadge, setShowNewPuzzleBadge] = useState(false);

  // Era progress from orchestrator (centralized calculation)
  const [quizProgress, setQuizProgress] = useState<EraProgressStats>({
    correctAnswers: 0,
    totalQuestions: 0,
    percentage: 0,
    totalXP: 0,
  });

  // Get selected era data from eras table
  const selectedEraData = useMemo(() => {
    return eras.find(era => era.era_id === supabaseEraId);
  }, [eras, supabaseEraId]);

  // Auto-correct invalid selectedEra (migration fix)
  // If user has a selectedEra that doesn't exist in Supabase, auto-select first available era
  // IMPORTANT: Only auto-correct AFTER eras have fully loaded (prevents race condition)
  useEffect(() => {
    if (!erasLoading && eras.length > 0 && selectedEra && !selectedEraData) {
      console.log(`⚠️ [Adventures] Invalid selectedEra "${selectedEra}" - auto-selecting first era`);
      const firstActiveEra = eras.find(era => era.status === 'active');
      if (firstActiveEra) {
        setSelectedEra(firstActiveEra.era_id);
      }
    }
  }, [erasLoading, eras, selectedEra, selectedEraData, setSelectedEra]);

  // Update AI context when era changes (for AI chat awareness)
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

  // Check if user has seen pull-to-refresh hint (hide after first use)
  useEffect(() => {
    const checkPullToRefreshHint = async () => {
      try {
        const hasSeenHint = await AsyncStorage.getItem(WALKTHROUGH_KEYS.PULL_TO_REFRESH);
        if (hasSeenHint === 'true') {
          setShowPullToRefreshHint(false);
          console.log('🔄 [Adventures] Pull-to-refresh hint already seen, hiding');
        } else {
          console.log('🔄 [Adventures] Showing pull-to-refresh hint (first time)');
        }
      } catch (error) {
        console.error('❌ [Adventures] Error checking pull-to-refresh hint:', error);
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
        const moduleProgress = userProgress.find(
          p => p.adventureId === adventure.readable_id && p.moduleId === module.id
        );
        return moduleProgress?.isCompleted && moduleProgress?.quizCompleted;
      });
      return adventureModules.length > 0 && completedModules.length === adventureModules.length;
    }).length;
  }, [adventures, userProgress]);

  // Fetch quiz progress from orchestrator (centralized calculation)
  useEffect(() => {
    const fetchEraProgress = async () => {
      if (!supabaseEraId) return;
      try {
        const progress = await getEraProgress(supabaseEraId);
        setQuizProgress(progress);
      } catch (error) {
        console.error('❌ [Adventures] Error fetching era progress:', error);
      }
    };
    fetchEraProgress();
  }, [supabaseEraId, getEraProgress, userProgress]);

  // User sign-in detection for data reload
  const { user, isSignedIn } = useUser();

  // Get user's completed eras for puzzle contextualization
  const getUserCompletedEras = useCallback(async (): Promise<string[]> => {
    const completedEras: string[] = [];

    // Check legacy Era 1 (Umayyad Dynasty) - no era_id in old system
    if (moduleProgress && moduleProgress.length > 0) {
      completedEras.push('era_1'); // Legacy era uses 'era_1' key for themes
    }

    // Check new eras - read from AsyncStorage
    try {
      const newProgressData = await AsyncStorage.getItem('new_user_progress');
      if (newProgressData) {
        const newProgress: UserProgress[] = JSON.parse(newProgressData);
        const uniqueEras = [...new Set(newProgress.map((p: UserProgress) => p.era_id))];
        // Add all unique era_ids from Supabase directly
        completedEras.push(...uniqueEras);
      }
    } catch (error) {
      console.error('❌ [Adventures] Error reading new progress:', error);
    }

    return completedEras;
  }, [moduleProgress]);

  // Check for new unlocked puzzle eras and show badge
  useEffect(() => {
    const checkNewEras = async () => {
      try {
        const currentEras = await getUserCompletedEras();
        const lastKnownEras = await AsyncStorage.getItem('last_known_puzzle_eras');

        if (currentEras.length === 0) {
          // No completed eras yet
          setShowNewPuzzleBadge(false);
          return;
        }

        if (!lastKnownEras) {
          // First time - show badge if user has any completed eras
          setShowNewPuzzleBadge(currentEras.length > 0);
          return;
        }

        const lastEras: string[] = JSON.parse(lastKnownEras);
        const hasNewEras = currentEras.some(era => !lastEras.includes(era));
        setShowNewPuzzleBadge(hasNewEras);

        if (hasNewEras) {
          console.log('🎉 [Adventures] New puzzle eras unlocked!', currentEras);
        }
      } catch (error) {
        console.error('❌ [Adventures] Error checking puzzle eras:', error);
      }
    };

    checkNewEras();
  }, [getUserCompletedEras]);

  // Load user progress from AsyncStorage
  const loadProgress = useCallback(async () => {
    try {
      const progressData = await AsyncStorage.getItem('new_user_progress');
      if (progressData) {
        const parsedProgress: UserProgress[] = JSON.parse(progressData);
        setUserProgress(parsedProgress);
        console.log(`📊 [Adventures] Loaded progress for era: ${selectedEra}`);
      } else {
        setUserProgress([]);
      }
    } catch (error) {
      console.error('❌ [Adventures] Error loading progress:', error);
    } finally {
      setProgressLoading(false);
    }
  }, [selectedEra]);

  // Initial load - wait for sync to complete if user is signed in
  useEffect(() => {
    // Skip if no era selected
    if (!selectedEra) {
      setProgressLoading(false);
      return;
    }

    const loadData = async () => {
      // If not signed in, load immediately
      if (!isSignedIn) {
        console.log(`📖 [Adventures] No user signed in, loading local data for: ${selectedEra}`);
        loadProgress();
        return;
      }

      // If signed in but user object not yet available, wait for Clerk
      if (isSignedIn && !user) {
        console.log('⏳ [Adventures] Waiting for Clerk user object...');
        return;
      }

      // If signed in, WAIT for GamifiedProgress to finish loading first
      if (gamificationLoading) {
        console.log('⏳ [Adventures] Waiting for gamification to initialize...');
        return;
      }

      console.log(`✅ [Adventures] Gamification ready, loading data for: ${selectedEra}`);
      loadProgress();
    };

    loadData();
  }, [isSignedIn, user?.id, gamificationLoading, loadProgress, selectedEra]);

  // Fallback: Ensure Clerk user ID is set in PostHog (production safety)
  useEffect(() => {
    if (isSignedIn && user) {
      analyticsService.setUserProperties(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      });
      console.log('✅ [Adventures] User properties set for Clerk ID:', user.id);
    }
  }, [isSignedIn, user]);

  // Reload progress whenever screen comes into focus (e.g., after quiz completion)
  useFocusEffect(
    useCallback(() => {
      if (selectedEra) {
        console.log(`🔄 [Adventures] Screen focused, reloading progress for: ${selectedEra}`);
        loadProgress();
      }
    }, [loadProgress, selectedEra])
  );

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    console.log(`🔄 [Adventures] Pull-to-refresh for era: ${selectedEra}`);
    setRefreshing(true);

    // Hide hint after first use (walkthrough pattern)
    if (showPullToRefreshHint) {
      try {
        await AsyncStorage.setItem(WALKTHROUGH_KEYS.PULL_TO_REFRESH, 'true');
        setShowPullToRefreshHint(false);
        console.log('✅ [Adventures] Pull-to-refresh hint marked as seen');
      } catch (error) {
        console.error('❌ [Adventures] Error saving pull-to-refresh hint:', error);
      }
    }

    try {
      await refreshAdventures();
      await loadProgress();
      console.log('✅ [Adventures] Refresh complete');
    } catch (error) {
      console.error('❌ [Adventures] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAdventures, loadProgress, selectedEra, showPullToRefreshHint]);

  // Handle puzzle FAB press
  const handlePuzzleFABPress = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Save current completed eras to clear badge
      const currentEras = await getUserCompletedEras();
      await AsyncStorage.setItem('last_known_puzzle_eras', JSON.stringify(currentEras));
      setShowNewPuzzleBadge(false);

      // Open GameHub
      setShowGameHub(true);

      // Track analytics
      analyticsService.trackCustomEvent('puzzle_fab_pressed', {
        completed_eras: currentEras,
        had_badge: showNewPuzzleBadge,
      });

      console.log('🎮 [Adventures] Opening puzzle hub');
    } catch (error) {
      console.error('❌ [Adventures] Error opening puzzle hub:', error);
    }
  }, [getUserCompletedEras, showNewPuzzleBadge]);

  // Navigate to Eras tab
  const goToErasTab = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/eras');
  }, [router]);

  // No era selected - show message with button
  if (!selectedEra) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="library-outline" size={48} color={ArchivesTheme.colors.shoeBrown} style={{ marginBottom: 16 }} />
        <Text style={styles.errorText}>No era selected</Text>
        <Text style={styles.errorSubtext}>Choose an era to start your journey</Text>
        <TouchableOpacity style={styles.ctaButton} onPress={goToErasTab}>
          <Text style={styles.ctaButtonText}>Select Era</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
  if (loading || progressLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
        <Text style={styles.loadingText}>Loading adventures...</Text>
      </View>
    );
  }

  // Error state (network or data fetch error)
  if (error || erasError) {
    const isNetworkError = (error?.message || erasError || '').toLowerCase().includes('network');
    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name={isNetworkError ? "cloud-offline-outline" : "alert-circle-outline"}
          size={48}
          color={ArchivesTheme.colors.shoeBrown}
          style={{ marginBottom: 16 }}
        />
        <Text style={styles.errorText}>
          {isNetworkError ? 'No internet connection' : 'Failed to load adventures'}
        </Text>
        <Text style={styles.errorSubtext}>
          {isNetworkError ? 'Please check your connection and try again' : (error?.message || erasError)}
        </Text>
        <TouchableOpacity style={styles.ctaButton} onPress={handleRefresh}>
          <Text style={styles.ctaButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No adventures found - show coming soon (data-driven from Supabase)
  if (!adventures || adventures.length === 0) {
    // Still loading eras or era not found in database
    if (!selectedEraData) {
      // If eras are still loading, show loading state
      if (erasLoading) {
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
            <Text style={styles.loadingText}>Loading era...</Text>
          </View>
        );
      }
      // Eras loaded but selected era not found - prompt to select a new one
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="help-circle-outline" size={48} color={ArchivesTheme.colors.shoeBrown} style={{ marginBottom: 16 }} />
          <Text style={styles.errorText}>Era not found</Text>
          <Text style={styles.errorSubtext}>The selected era is no longer available</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={goToErasTab}>
            <Text style={styles.ctaButtonText}>Select Era</Text>
          </TouchableOpacity>
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

  // Show adventures (era-agnostic)
  return (
    <View style={styles.container}>
      <EraProgressHeader
        title={selectedEraData?.title || ''}
        correctAnswers={quizProgress.correctAnswers}
        totalQuestions={quizProgress.totalQuestions}
        totalXP={quizProgress.totalXP}
      />
      <BentoGridScreen
        adventures={adventures}
        userProgress={userProgress}
        onProgressUpdate={loadProgress}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showPullToRefreshHint={showPullToRefreshHint}
      />

      {/* Floating Action Button for Puzzles - Commented out for release */}
      {/* <TouchableOpacity
        style={styles.fab}
        onPress={handlePuzzleFABPress}
        activeOpacity={0.8}
      >
        <Ionicons name="extension-puzzle" size={28} color="white" />
        {showNewPuzzleBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>NEW</Text>
          </View>
        )}
      </TouchableOpacity> */}

      {/* GameHub Modal */}
      <GameHub
        visible={showGameHub}
        onClose={() => setShowGameHub(false)}
        initialGameType="jigsaw"
        initialTopic="Islamic History"
        currentEraId={supabaseEraId} // Pass current era for contextual puzzles
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ArchivesTheme.colors.creamWhite,
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'DM Sans',
    color: ArchivesTheme.colors.shoeBrown,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'DM Sans',
    fontWeight: '600',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: 'DM Sans',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  ctaButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ArchivesTheme.colors.persianOrange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.creamWhite,
  },
  badgeText: {
    fontFamily: 'DM Sans',
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
});
