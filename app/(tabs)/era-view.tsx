import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAdventures } from '@/hooks/useAdventures';
import { useEras } from '@/hooks/useEras';
import { useProgress } from '@/context/ProgressContext';
import { useAI } from '@/context/AIContext';
import BentoGridScreen from '@/components/adventure/types/bento-grid/BentoGridScreen';
import EraProgressHeader from '@/components/shared/EraProgressHeader';
import ComingSoonView from '@/components/eras/ComingSoonView';
import ArchivesTheme from '@/constants/ArchivesTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBackgroundSync } from '@/context/BackgroundSyncProvider';
import { useUser } from '@clerk/clerk-expo';
import { analyticsService } from '@/services/AnalyticsService';

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
  const { selectedEra } = useProgress();

  // Get AI context for updating era awareness
  const { updateContext } = useAI();

  // Use selectedEra directly (already Supabase era_id format)
  const supabaseEraId = selectedEra || '';

  // Fetch adventures for selected era (dynamic, not hardcoded)
  const { adventures, loading, error, refreshAdventures } = useAdventures(supabaseEraId);
  const { eras } = useEras();
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get selected era data from eras table
  const selectedEraData = useMemo(() => {
    return eras.find(era => era.era_id === supabaseEraId);
  }, [eras, supabaseEraId]);

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

  // Calculate quiz-based progress (for progress bar) - ERA SPECIFIC
  const quizProgress = useMemo(() => {
    if (!adventures || adventures.length === 0) {
      return { correctAnswers: 0, totalQuestions: 0, totalXP: 0 };
    }

    // Count total modules across all adventures (each module has 1 quiz with 5 questions)
    const totalModules = adventures.reduce((sum, adventure) => {
      return sum + (adventure.content_list?.length || 0);
    }, 0);
    const totalQuestions = totalModules * 5; // 5 questions per quiz

    // Sum up correct answers and XP from user progress - FILTERED BY CURRENT ERA
    let correctAnswers = 0;
    let totalXP = 0;

    // Only count progress for the current era
    const eraProgress = userProgress.filter(progress => progress.era_id === supabaseEraId);

    eraProgress.forEach(progress => {
      if (progress.quizCorrectAnswers !== undefined) {
        correctAnswers += progress.quizCorrectAnswers;
        totalXP += progress.quizCorrectAnswers * 10; // 10 XP per correct answer
      }
    });

    console.log(`📊 [Adventures] Quiz progress for ${supabaseEraId}: ${correctAnswers}/${totalQuestions} (${Math.round((correctAnswers / totalQuestions) * 100)}%)`);

    return { correctAnswers, totalQuestions, totalXP };
  }, [adventures, userProgress, supabaseEraId]);

  // User sign-in detection for data reload
  const { user, isSignedIn } = useUser();

  // CRITICAL: Wait for background sync to complete before loading data on login
  const { isInitialized: syncInitialized } = useBackgroundSync();

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

      // If signed in, WAIT for background sync to complete first
      if (isSignedIn && user) {
        if (!syncInitialized) {
          console.log('⏳ [Adventures] Waiting for background sync to complete...');
          return;
        }

        console.log(`✅ [Adventures] Background sync complete, loading data for: ${selectedEra}`);
        loadProgress();
      }
    };

    loadData();
  }, [isSignedIn, user?.id, syncInitialized, loadProgress, selectedEra]);

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
    try {
      await refreshAdventures();
      await loadProgress();
      console.log('✅ [Adventures] Refresh complete');
    } catch (error) {
      console.error('❌ [Adventures] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAdventures, loadProgress, selectedEra]);

  // No era selected - show message
  if (!selectedEra) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No era selected</Text>
        <Text style={styles.errorSubtext}>Please select an era to view adventures</Text>
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

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load adventures</Text>
        <Text style={styles.errorSubtext}>{error.message}</Text>
      </View>
    );
  }

  // No adventures found - show coming soon (data-driven from Supabase)
  if (!adventures || adventures.length === 0) {
    if (!selectedEraData) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading era...</Text>
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
  },
});
