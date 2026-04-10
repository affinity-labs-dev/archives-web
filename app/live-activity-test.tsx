// Live Activity Test Screen
//
// Developer-only screen for triggering and testing Live Activity variants.
// Gated by a navigation link that only appears in __DEV__ builds (see profile.tsx).
//
// Exercises the full StreakGuardActivity lifecycle (.expiring → .saved/.failed)
// and the DailyStoryActivity card progression flow. Each button corresponds to a
// single native bridge call from @/modules/live-activity.
//
// Usage:
//   1. Build to a physical iPhone (Live Activities don't render on simulator)
//   2. Tap "Start StreakGuard — Expiring (30s countdown)" to spawn an activity
//   3. Lock the phone — banner should appear on lock screen
//   4. Long-press Dynamic Island (if device has one) to see expanded variant
//   5. Tap transition buttons to test .saved and .failed states
//   6. Use "End All" as a safety net if an activity gets stuck

import ArchivesTheme from '@/constants/ArchivesTheme';
import {
  areActivitiesEnabled,
  endAllActivities,
  endDailyStory,
  endStreakGuard,
  listActiveActivities,
  startDailyStory,
  startStreakGuard,
  updateDailyStory,
  updateStreakGuard,
  type ActiveActivityRef,
  type ActivityId,
} from '@/modules/live-activity';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const TEST_STREAK = 12;
const TEST_STORY_TITLE = 'The Golden Age of Baghdad';
const TEST_ERA_TITLE = 'The Golden Age';
const TEST_STORY_ID = '2026-04-09';

export default function LiveActivityTestScreen() {
  const router = useRouter();

  // Status state
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [liveRefs, setLiveRefs] = useState<ActiveActivityRef[]>([]);

  // Activity tracking state
  const [streakGuardId, setStreakGuardId] = useState<ActivityId | null>(null);
  const [dailyStoryId, setDailyStoryId] = useState<ActivityId | null>(null);

  // DailyStory local progression tracking (for update button parameters)
  const [storyCard, setStoryCard] = useState(1);

  // MARK: Status refresh

  const refreshStatus = useCallback(async () => {
    try {
      const [isEnabled, refs] = await Promise.all([
        areActivitiesEnabled(),
        listActiveActivities(),
      ]);
      setEnabled(isEnabled);
      setLiveRefs(refs);
    } catch (error) {
      console.error('[LiveActivityTest] Failed to refresh status:', error);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // MARK: Error helper

  const handleError = useCallback((label: string, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[LiveActivityTest] ${label} failed:`, error);
    Alert.alert(`${label} failed`, message);
  }, []);

  // MARK: StreakGuard handlers

  const handleStartStreakGuardExpiring = useCallback(async () => {
    try {
      const endDate = Math.floor(Date.now() / 1000) + 30; // 30s from now
      const id = await startStreakGuard({
        currentStreak: TEST_STREAK,
        streakStartDate: '2026-03-28',
        state: 'expiring',
        endDate,
      });
      setStreakGuardId(id);
      await refreshStatus();
    } catch (error) {
      handleError('Start StreakGuard (expiring)', error);
    }
  }, [handleError, refreshStatus]);

  const handleStartStreakGuardLongCountdown = useCallback(async () => {
    try {
      // 2 minutes — easier to long-press Dynamic Island and see timer animate
      const endDate = Math.floor(Date.now() / 1000) + 120;
      const id = await startStreakGuard({
        currentStreak: TEST_STREAK,
        streakStartDate: '2026-03-28',
        state: 'expiring',
        endDate,
      });
      setStreakGuardId(id);
      await refreshStatus();
    } catch (error) {
      handleError('Start StreakGuard (2min countdown)', error);
    }
  }, [handleError, refreshStatus]);

  const handleTransitionToSaved = useCallback(async () => {
    if (!streakGuardId) {
      Alert.alert('No active StreakGuard', 'Start one first.');
      return;
    }
    try {
      await updateStreakGuard({
        id: streakGuardId,
        state: 'saved',
        endDate: 0,
      });
      await refreshStatus();
    } catch (error) {
      handleError('Transition to saved', error);
    }
  }, [streakGuardId, handleError, refreshStatus]);

  const handleTransitionToFailed = useCallback(async () => {
    if (!streakGuardId) {
      Alert.alert('No active StreakGuard', 'Start one first.');
      return;
    }
    try {
      await updateStreakGuard({
        id: streakGuardId,
        state: 'failed',
        endDate: 0,
      });
      await refreshStatus();
    } catch (error) {
      handleError('Transition to failed', error);
    }
  }, [streakGuardId, handleError, refreshStatus]);

  const handleEndStreakGuardImmediate = useCallback(async () => {
    if (!streakGuardId) {
      Alert.alert('No active StreakGuard', 'Start one first.');
      return;
    }
    try {
      await endStreakGuard(streakGuardId, 0);
      setStreakGuardId(null);
      await refreshStatus();
    } catch (error) {
      handleError('End StreakGuard immediate', error);
    }
  }, [streakGuardId, handleError, refreshStatus]);

  const handleEndStreakGuardLinger = useCallback(async () => {
    if (!streakGuardId) {
      Alert.alert('No active StreakGuard', 'Start one first.');
      return;
    }
    try {
      await endStreakGuard(streakGuardId, 15 * 60); // 15 min linger per spec
      setStreakGuardId(null);
      await refreshStatus();
    } catch (error) {
      handleError('End StreakGuard (15min linger)', error);
    }
  }, [streakGuardId, handleError, refreshStatus]);

  // MARK: DailyStory handlers

  const handleStartDailyStory = useCallback(async () => {
    try {
      const id = await startDailyStory({
        storyId: TEST_STORY_ID,
        storyTitle: TEST_STORY_TITLE,
        eraTitle: TEST_ERA_TITLE,
        dayNumber: 5,
        totalDays: 7,
        currentCard: 1,
        totalCards: 3,
        progressPercent: 0,
        watchCompleted: false,
        exploreCompleted: false,
        questionsCompleted: false,
      });
      setDailyStoryId(id);
      setStoryCard(1);
      await refreshStatus();
    } catch (error) {
      handleError('Start DailyStory', error);
    }
  }, [handleError, refreshStatus]);

  const handleAdvanceDailyStory = useCallback(async () => {
    if (!dailyStoryId) {
      Alert.alert('No active DailyStory', 'Start one first.');
      return;
    }
    const nextCard = Math.min(storyCard + 1, 3);
    const progress = nextCard / 3;
    try {
      await updateDailyStory({
        id: dailyStoryId,
        currentCard: nextCard,
        totalCards: 3,
        progressPercent: progress,
        watchCompleted: nextCard >= 2,
        exploreCompleted: nextCard >= 3,
        questionsCompleted: false,
      });
      setStoryCard(nextCard);
      await refreshStatus();
    } catch (error) {
      handleError('Advance DailyStory', error);
    }
  }, [dailyStoryId, storyCard, handleError, refreshStatus]);

  const handleCompleteDailyStory = useCallback(async () => {
    if (!dailyStoryId) {
      Alert.alert('No active DailyStory', 'Start one first.');
      return;
    }
    try {
      await updateDailyStory({
        id: dailyStoryId,
        currentCard: 3,
        totalCards: 3,
        progressPercent: 1,
        watchCompleted: true,
        exploreCompleted: true,
        questionsCompleted: true,
      });
      setStoryCard(3);
      await refreshStatus();
    } catch (error) {
      handleError('Complete DailyStory', error);
    }
  }, [dailyStoryId, handleError, refreshStatus]);

  const handleEndDailyStoryImmediate = useCallback(async () => {
    if (!dailyStoryId) {
      Alert.alert('No active DailyStory', 'Start one first.');
      return;
    }
    try {
      await endDailyStory(dailyStoryId, 0);
      setDailyStoryId(null);
      setStoryCard(1);
      await refreshStatus();
    } catch (error) {
      handleError('End DailyStory', error);
    }
  }, [dailyStoryId, handleError, refreshStatus]);

  // MARK: Safety net

  const handleEndAll = useCallback(async () => {
    try {
      await endAllActivities();
      setStreakGuardId(null);
      setDailyStoryId(null);
      setStoryCard(1);
      await refreshStatus();
    } catch (error) {
      handleError('End All Activities', error);
    }
  }, [handleError, refreshStatus]);

  // MARK: Render

  if (Platform.OS !== 'ios') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unsupportedContainer}>
          <Text style={styles.unsupportedTitle}>iOS Only</Text>
          <Text style={styles.unsupportedText}>
            Live Activities are an iOS feature. This screen has no effect on Android or web.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={ArchivesTheme.colors.shoeBrown} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Activity Test</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Activities enabled:</Text>
            <Text style={[
              styles.statusValue,
              enabled === true && styles.statusGood,
              enabled === false && styles.statusBad,
            ]}>
              {enabled === null ? '…' : enabled ? 'Yes' : 'No (check Settings)'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Active iOS-side:</Text>
            <Text style={styles.statusValue}>{liveRefs.length}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Tracked StreakGuard:</Text>
            <Text style={styles.statusValue}>{streakGuardId ? 'Yes' : 'None'}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Tracked DailyStory:</Text>
            <Text style={styles.statusValue}>
              {dailyStoryId ? `Card ${storyCard}/3` : 'None'}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={refreshStatus}>
            <Text style={styles.refreshButtonText}>Refresh Status</Text>
          </TouchableOpacity>
        </View>

        {/* StreakGuard section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>StreakGuard</Text>
          <Text style={styles.sectionDescription}>
            Lifecycle: expiring → saved / failed. Banner shows maroon urgency (expiring),
            dark gray celebration (saved), or maroon lost (failed).
          </Text>

          <Text style={styles.subheader}>Start</Text>
          <ActionButton
            label="Start Expiring (30s countdown)"
            description="Quick test — countdown reaches 0 in 30 seconds"
            onPress={handleStartStreakGuardExpiring}
            disabled={!!streakGuardId}
          />
          <ActionButton
            label="Start Expiring (2min countdown)"
            description="Longer window to inspect Dynamic Island expanded view"
            onPress={handleStartStreakGuardLongCountdown}
            disabled={!!streakGuardId}
          />

          <Text style={styles.subheader}>Transition</Text>
          <ActionButton
            label="Update → Saved"
            description="User completed story before midnight"
            onPress={handleTransitionToSaved}
            disabled={!streakGuardId}
          />
          <ActionButton
            label="Update → Failed"
            description="Midnight passed, streak lost"
            onPress={handleTransitionToFailed}
            disabled={!streakGuardId}
            destructive
          />

          <Text style={styles.subheader}>End</Text>
          <ActionButton
            label="End immediately"
            description="Remove from lock screen now"
            onPress={handleEndStreakGuardImmediate}
            disabled={!streakGuardId}
          />
          <ActionButton
            label="End with 15-minute linger"
            description="Production behavior for .saved and .failed terminal states"
            onPress={handleEndStreakGuardLinger}
            disabled={!streakGuardId}
          />
        </View>

        {/* DailyStory section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DailyStory</Text>
          <Text style={styles.sectionDescription}>
            3-card story progression. Circular ring in Dynamic Island fills as user
            completes each card. Expanded view shows WATCH / EXPLORE / QUESTIONS pills.
          </Text>

          <Text style={styles.subheader}>Start</Text>
          <ActionButton
            label="Start at Card 1 (0%)"
            description="Fresh story — no cards completed"
            onPress={handleStartDailyStory}
            disabled={!!dailyStoryId}
          />

          <Text style={styles.subheader}>Update</Text>
          <ActionButton
            label={`Advance to Card ${Math.min(storyCard + 1, 3)} (${Math.round(Math.min(storyCard + 1, 3) / 3 * 100)}%)`}
            description="Mark next card complete and update ring"
            onPress={handleAdvanceDailyStory}
            disabled={!dailyStoryId || storyCard >= 3}
          />
          <ActionButton
            label="Complete all cards (100%)"
            description="Jump directly to full completion state"
            onPress={handleCompleteDailyStory}
            disabled={!dailyStoryId}
          />

          <Text style={styles.subheader}>End</Text>
          <ActionButton
            label="End immediately"
            description="Remove from lock screen now"
            onPress={handleEndDailyStoryImmediate}
            disabled={!dailyStoryId}
          />
        </View>

        {/* Safety net */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Net</Text>
          <Text style={styles.sectionDescription}>
            If an activity gets stuck, use this to clear all active Live Activities
            owned by Archives at once.
          </Text>
          <ActionButton
            label="End All Activities"
            description="Force-removes every active Live Activity"
            onPress={handleEndAll}
            destructive
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// MARK: - Button component

interface ActionButtonProps {
  label: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

function ActionButton({ label, description, onPress, disabled, destructive }: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        destructive && styles.buttonDestructive,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.buttonLabel,
        destructive && styles.buttonLabelDestructive,
        disabled && styles.buttonLabelDisabled,
      ]}>
        {label}
      </Text>
      <Text style={[
        styles.buttonDescription,
        disabled && styles.buttonLabelDisabled,
      ]}>
        {description}
      </Text>
    </TouchableOpacity>
  );
}

// MARK: - Styles

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ArchivesTheme.colors.shoeBrown,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: ArchivesTheme.colors.shoeBrown,
    opacity: 0.7,
    marginBottom: 12,
    lineHeight: 18,
  },
  subheader: {
    fontSize: 13,
    fontWeight: '700',
    color: ArchivesTheme.colors.persianOrange,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statusLabel: {
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
    opacity: 0.8,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: ArchivesTheme.colors.shoeBrown,
  },
  statusGood: {
    color: '#34A853',
  },
  statusBad: {
    color: '#D32F2F',
  },
  refreshButton: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: ArchivesTheme.colors.persianOrange,
    fontWeight: '600',
    fontSize: 14,
  },
  button: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    borderRadius: 10,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(201, 145, 81, 0.3)',
  },
  buttonDestructive: {
    borderColor: 'rgba(211, 47, 47, 0.3)',
    backgroundColor: 'rgba(211, 47, 47, 0.05)',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: ArchivesTheme.colors.shoeBrown,
  },
  buttonLabelDestructive: {
    color: '#D32F2F',
  },
  buttonLabelDisabled: {
    color: 'rgba(77, 57, 46, 0.5)',
  },
  buttonDescription: {
    fontSize: 12,
    color: ArchivesTheme.colors.shoeBrown,
    opacity: 0.6,
    marginTop: 2,
  },
  unsupportedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  unsupportedTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 12,
  },
  unsupportedText: {
    fontSize: 15,
    color: ArchivesTheme.colors.shoeBrown,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22,
  },
});
