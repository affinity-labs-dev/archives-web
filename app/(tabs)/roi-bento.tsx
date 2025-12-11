import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAdventures } from '@/hooks/useAdventures';
import { useProgress } from '@/context/ProgressContext';
import BentoGridScreen from '@/components/adventure/types/bento-grid/BentoGridScreen';
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

// Map context era IDs to Supabase era_id format
const ERA_ID_MAP: Record<string, string> = {
  'riseOfIslam': 'rise_of_islam',
  'umayyad': 'umayyad',
  'abbasid': 'abbasid',
  'ottoman': 'ottoman',
  'fatimid': 'fatimid',
};

export default function AdventuresScreen() {
  // Get selected era from context (data-driven)
  const { selectedEra } = useProgress();

  // Map context era to Supabase era_id format
  const supabaseEraId = selectedEra ? (ERA_ID_MAP[selectedEra] || selectedEra) : '';

  // Fetch adventures for selected era (dynamic, not hardcoded)
  const { adventures, loading, error, refreshAdventures } = useAdventures(supabaseEraId);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  // No adventures found - show coming soon (data-driven)
  if (!adventures || adventures.length === 0) {
    const comingSoonEra = selectedEra as 'umayyad' | 'riseOfIslam' | 'abbasid' | 'ottoman' | 'fatimid';
    return (
      <ComingSoonView
        era={comingSoonEra}
        onBack={() => {}}
      />
    );
  }

  // Show adventures (era-agnostic)
  return (
    <BentoGridScreen
      adventures={adventures}
      userProgress={userProgress}
      onProgressUpdate={loadProgress}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    />
  );
}

const styles = StyleSheet.create({
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
