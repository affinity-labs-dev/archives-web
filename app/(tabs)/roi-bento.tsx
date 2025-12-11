import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAdventures } from '@/hooks/useAdventures';
import BentoGridScreen from '@/components/adventure/types/bento-grid/BentoGridScreen';
import ArchivesTheme from '@/constants/ArchivesTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBackgroundSync } from '@/context/BackgroundSyncProvider';
import { useUser } from '@clerk/clerk-expo';
import { analyticsService } from '@/services/AnalyticsService';

// User progress type for Era 2+
interface UserProgress {
  adventureId: string;
  moduleId: string;
  quizScore: number;
  quizCorrectAnswers?: number; // Actual correct answers (for XP calculation)
  isCompleted: boolean;
  quizCompleted: boolean;
  completedAt: string;
  era_id: string;
}

export default function ROIBentoScreen() {
  // Fetch adventures for Rise of Islam era
  const { adventures, loading, error, refreshAdventures } = useAdventures('rise_of_islam');
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
        console.log('📊 [ROI] Loaded user progress:', parsedProgress);
      } else {
        setUserProgress([]);
      }
    } catch (error) {
      console.error('❌ [ROI] Error loading progress:', error);
    } finally {
      setProgressLoading(false);
    }
  }, []);

  // Initial load - wait for sync to complete if user is signed in
  useEffect(() => {
    const loadData = async () => {
      // If not signed in, load immediately
      if (!isSignedIn) {
        console.log('📖 [ROI] No user signed in, loading local data only');
        loadProgress();
        return;
      }

      // If signed in, WAIT for background sync to complete first
      if (isSignedIn && user) {
        if (!syncInitialized) {
          console.log('⏳ [ROI] Waiting for background sync to complete...');
          return; // Don't load yet, wait for syncInitialized to become true
        }

        console.log('✅ [ROI] Background sync complete, loading data from AsyncStorage...');
        loadProgress();
      }
    };

    loadData();
  }, [isSignedIn, user?.id, syncInitialized, loadProgress]);

  // Fallback: Ensure Clerk user ID is set in PostHog (production safety)
  useEffect(() => {
    if (isSignedIn && user) {
      analyticsService.setUserProperties(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      });
      console.log('✅ [ROIBento] User properties set for Clerk ID:', user.id);
    }
  }, [isSignedIn, user]);

  // Reload progress whenever screen comes into focus (e.g., after quiz completion)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 [ROI] Screen focused, reloading progress...');
      loadProgress();
    }, [loadProgress])
  );

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    console.log('🔄 [ROI] Pull-to-refresh triggered');
    setRefreshing(true);
    try {
      await refreshAdventures(); // Refresh adventures from Supabase
      await loadProgress(); // Reload user progress
      console.log('✅ [ROI] Refresh complete');
    } catch (error) {
      console.error('❌ [ROI] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAdventures, loadProgress]);

  if (loading || progressLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
        <Text style={styles.loadingText}>Loading adventures...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load adventures</Text>
        <Text style={styles.errorSubtext}>{error.message}</Text>
      </View>
    );
  }

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
