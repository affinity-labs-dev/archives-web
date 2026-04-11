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

// When a Live Activity transitions to a terminal state (DailyStory: .completed /
// .incomplete, StreakGuard: .saved / .failed), we immediately end the activity so
// the Dynamic Island disappears, while passing a 15-min dismissalPolicy so the
// lock-screen banner stays pinned. Only the in-progress / expiring states should
// keep the Dynamic Island alive.
const TERMINAL_LINGER_SECONDS = 15 * 60;

export default function LiveActivityTestScreen() {
  const router = useRouter();

  // Status state
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [liveRefs, setLiveRefs] = useState<ActiveActivityRef[]>([]);

  // Activity tracking state
  const [streakGuardId, setStreakGuardId] = useState<ActivityId | null>(null);
  const [dailyStoryId, setDailyStoryId] = useState<ActivityId | null>(null);

  // DailyStory local progression tracking — count of cards completed (0..3).
  // Kept in lockstep with the 3 boolean flags so progress bar and pills never disagree.
  const [storyCompleted, setStoryCompleted] = useState(0);

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
        currentStreak: TEST_STREAK + 1,
      });
      // Terminal state → drop Dynamic Island, banner lingers 15 min on lock screen.
      await endStreakGuard(streakGuardId, TERMINAL_LINGER_SECONDS);
      setStreakGuardId(null);
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
        currentStreak: TEST_STREAK,
      });
      // Terminal state → drop Dynamic Island, banner lingers 15 min on lock screen.
      await endStreakGuard(streakGuardId, TERMINAL_LINGER_SECONDS);
      setStreakGuardId(null);
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

  // MARK: Auto-simulation sequences

  const [simRunning, setSimRunning] = useState(false);

  const handleSimulateSavedSequence = useCallback(async () => {
    if (simRunning) return;
    setSimRunning(true);
    try {
      // 1. Start expiring (30s countdown)
      const endDate = Math.floor(Date.now() / 1000) + 30;
      const id = await startStreakGuard({
        currentStreak: TEST_STREAK,
        streakStartDate: '2026-03-28',
        state: 'expiring',
        endDate,
      });
      setStreakGuardId(id);
      await refreshStatus();
      console.log('[Sim] Started expiring, waiting 10s...');

      // 2. After 10s → transition to saved + end(15 min linger).
      //    Dynamic Island drops immediately; Saved banner pins on lock screen for 15 min.
      await new Promise(r => setTimeout(r, 10000));
      await updateStreakGuard({ id, state: 'saved', endDate: 0, currentStreak: TEST_STREAK + 1 });
      await endStreakGuard(id, TERMINAL_LINGER_SECONDS);
      setStreakGuardId(null);
      await refreshStatus();
      console.log('[Sim] → saved (DI dropped, banner lingers 15 min).');
    } catch (error) {
      handleError('Simulate saved sequence', error);
    } finally {
      setSimRunning(false);
    }
  }, [simRunning, handleError, refreshStatus]);

  const handleSimulateFailedSequence = useCallback(async () => {
    if (simRunning) return;
    setSimRunning(true);
    try {
      // 1. Start expiring (30s countdown)
      const endDate = Math.floor(Date.now() / 1000) + 30;
      const id = await startStreakGuard({
        currentStreak: TEST_STREAK,
        streakStartDate: '2026-03-28',
        state: 'expiring',
        endDate,
      });
      setStreakGuardId(id);
      await refreshStatus();
      console.log('[Sim] Started expiring, waiting 10s...');

      // 2. After 10s → transition to failed + end(15 min linger).
      //    Dynamic Island drops immediately; Failed banner pins on lock screen for 15 min.
      await new Promise(r => setTimeout(r, 10000));
      await updateStreakGuard({ id, state: 'failed', endDate: 0, currentStreak: TEST_STREAK });
      await endStreakGuard(id, TERMINAL_LINGER_SECONDS);
      setStreakGuardId(null);
      await refreshStatus();
      console.log('[Sim] → failed (DI dropped, banner lingers 15 min).');
    } catch (error) {
      handleError('Simulate failed sequence', error);
    } finally {
      setSimRunning(false);
    }
  }, [simRunning, handleError, refreshStatus]);

  const handleSimulateFullCycle = useCallback(async () => {
    if (simRunning) return;
    setSimRunning(true);
    try {
      // Terminal states now auto-end the activity, so the old "expiring → saved → expiring
      // → failed" single-activity flow is no longer possible. Run two independent
      // sub-sequences instead so both terminal banners can be observed in one simulation.

      // === Sub-sequence A: expiring → saved ===
      // 1. Start first expiring activity (20s countdown)
      const endDateA = Math.floor(Date.now() / 1000) + 20;
      const idA = await startStreakGuard({
        currentStreak: TEST_STREAK,
        streakStartDate: '2026-03-28',
        state: 'expiring',
        endDate: endDateA,
      });
      setStreakGuardId(idA);
      await refreshStatus();
      console.log('[Sim] [A] Started expiring, waiting 8s...');

      // 2. After 8s → saved + end(15 min). DI drops, saved banner pins.
      await new Promise(r => setTimeout(r, 8000));
      await updateStreakGuard({ id: idA, state: 'saved', endDate: 0, currentStreak: TEST_STREAK + 1 });
      await endStreakGuard(idA, TERMINAL_LINGER_SECONDS);
      setStreakGuardId(null);
      await refreshStatus();
      console.log('[Sim] [A] → saved (banner lingers), waiting 6s before starting [B]...');

      // 3. Visual pause so saved banner can be inspected before [B] spawns.
      await new Promise(r => setTimeout(r, 6000));

      // === Sub-sequence B: expiring → failed ===
      // 4. Start second expiring activity (20s countdown)
      const endDateB = Math.floor(Date.now() / 1000) + 20;
      const idB = await startStreakGuard({
        currentStreak: TEST_STREAK,
        streakStartDate: '2026-03-28',
        state: 'expiring',
        endDate: endDateB,
      });
      setStreakGuardId(idB);
      await refreshStatus();
      console.log('[Sim] [B] Started expiring, waiting 8s...');

      // 5. After 8s → failed + end(15 min). DI drops, failed banner pins.
      await new Promise(r => setTimeout(r, 8000));
      await updateStreakGuard({ id: idB, state: 'failed', endDate: 0, currentStreak: TEST_STREAK });
      await endStreakGuard(idB, TERMINAL_LINGER_SECONDS);
      setStreakGuardId(null);
      await refreshStatus();
      console.log('[Sim] [B] → failed (banner lingers). Full cycle complete.');
    } catch (error) {
      handleError('Simulate full cycle', error);
    } finally {
      setSimRunning(false);
    }
  }, [simRunning, handleError, refreshStatus]);

  // MARK: DailyStory handlers

  const handleStartDailyStory = useCallback(async () => {
    try {
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const id = await startDailyStory({
        storyId: TEST_STORY_ID,
        storyTitle: TEST_STORY_TITLE,
        eraTitle: TEST_ERA_TITLE,
        dayNumber: 5,
        totalDays: 7,
        state: 'inProgress',
        currentCard: 1,
        totalCards: 3,
        progressPercent: 0,
        watchCompleted: false,
        exploreCompleted: false,
        questionsCompleted: false,
        currentStreak: TEST_STREAK,
        endDate: Math.floor(midnight.getTime() / 1000),
        xpEarned: 0,
      });
      setDailyStoryId(id);
      setStoryCompleted(0);
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
    if (storyCompleted >= 3) return;
    // One advance = one more card completed. Flags and progress stay in lockstep:
    // 1 done → watch ✓ (33%), 2 done → +explore ✓ (66%), 3 done → +questions ✓ (100%).
    // When the 3rd card lands, auto-flip state → `completed` and award +30 XP so the
    // banner swaps to the Quest Complete layout instead of lingering on in-progress.
    const newCount = storyCompleted + 1;
    const progress = newCount / 3;
    const reachedCompletion = newCount >= 3;
    try {
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      await updateDailyStory({
        id: dailyStoryId,
        state: reachedCompletion ? 'completed' : 'inProgress',
        currentCard: Math.min(newCount + 1, 3),
        totalCards: 3,
        progressPercent: progress,
        watchCompleted: newCount >= 1,
        exploreCompleted: newCount >= 2,
        questionsCompleted: newCount >= 3,
        currentStreak: TEST_STREAK,
        endDate: reachedCompletion ? 0 : Math.floor(midnight.getTime() / 1000),
        xpEarned: reachedCompletion ? 30 : 0,
      });
      setStoryCompleted(newCount);
      // Terminal state → drop Dynamic Island, keep banner on lock screen for 15 min.
      if (reachedCompletion) {
        await endDailyStory(dailyStoryId, TERMINAL_LINGER_SECONDS);
        setDailyStoryId(null);
      }
      await refreshStatus();
    } catch (error) {
      handleError('Advance DailyStory', error);
    }
  }, [dailyStoryId, storyCompleted, handleError, refreshStatus]);

  const handleCompleteDailyStory = useCallback(async () => {
    if (!dailyStoryId) {
      Alert.alert('No active DailyStory', 'Start one first.');
      return;
    }
    try {
      await updateDailyStory({
        id: dailyStoryId,
        state: 'completed',
        currentCard: 3,
        totalCards: 3,
        progressPercent: 1,
        watchCompleted: true,
        exploreCompleted: true,
        questionsCompleted: true,
        currentStreak: TEST_STREAK,
        endDate: 0,
        xpEarned: 30,
      });
      setStoryCompleted(3);
      // Terminal state → drop Dynamic Island, banner lingers 15 min on lock screen.
      await endDailyStory(dailyStoryId, TERMINAL_LINGER_SECONDS);
      setDailyStoryId(null);
      await refreshStatus();
    } catch (error) {
      handleError('Complete DailyStory', error);
    }
  }, [dailyStoryId, handleError, refreshStatus]);

  const handleIncompleteDailyStory = useCallback(async () => {
    if (!dailyStoryId) {
      Alert.alert('No active DailyStory', 'Start one first.');
      return;
    }
    try {
      // Simulate midnight hit — user only completed 1 of 3 cards
      await updateDailyStory({
        id: dailyStoryId,
        state: 'incomplete',
        currentCard: 1,
        totalCards: 3,
        progressPercent: 1 / 3,
        watchCompleted: true,
        exploreCompleted: false,
        questionsCompleted: false,
        currentStreak: TEST_STREAK,
        endDate: 0,
        xpEarned: 0,
      });
      setStoryCompleted(1);
      // Terminal state → drop Dynamic Island, banner lingers 15 min on lock screen.
      await endDailyStory(dailyStoryId, TERMINAL_LINGER_SECONDS);
      setDailyStoryId(null);
      await refreshStatus();
    } catch (error) {
      handleError('Incomplete DailyStory', error);
    }
  }, [dailyStoryId, handleError, refreshStatus]);

  // MARK: DailyStory start-in-state shortcuts (to inspect banners directly)

  const handleStartDailyStoryCompleted = useCallback(async () => {
    try {
      const id = await startDailyStory({
        storyId: TEST_STORY_ID,
        storyTitle: TEST_STORY_TITLE,
        eraTitle: TEST_ERA_TITLE,
        dayNumber: 5,
        totalDays: 7,
        state: 'completed',
        currentCard: 3,
        totalCards: 3,
        progressPercent: 1,
        watchCompleted: true,
        exploreCompleted: true,
        questionsCompleted: true,
        currentStreak: TEST_STREAK,
        endDate: 0,
        xpEarned: 30,
      });
      setStoryCompleted(3);
      // Terminal state — drop Dynamic Island immediately so only the banner renders.
      await endDailyStory(id, TERMINAL_LINGER_SECONDS);
      setDailyStoryId(null);
      await refreshStatus();
    } catch (error) {
      handleError('Start DailyStory (completed)', error);
    }
  }, [handleError, refreshStatus]);

  const handleStartDailyStoryIncomplete = useCallback(async () => {
    try {
      const id = await startDailyStory({
        storyId: TEST_STORY_ID,
        storyTitle: TEST_STORY_TITLE,
        eraTitle: TEST_ERA_TITLE,
        dayNumber: 5,
        totalDays: 7,
        state: 'incomplete',
        currentCard: 1,
        totalCards: 3,
        progressPercent: 1 / 3,
        watchCompleted: true,
        exploreCompleted: false,
        questionsCompleted: false,
        currentStreak: TEST_STREAK,
        endDate: 0,
        xpEarned: 0,
      });
      setStoryCompleted(1);
      // Terminal state — drop Dynamic Island immediately so only the banner renders.
      await endDailyStory(id, TERMINAL_LINGER_SECONDS);
      setDailyStoryId(null);
      await refreshStatus();
    } catch (error) {
      handleError('Start DailyStory (incomplete)', error);
    }
  }, [handleError, refreshStatus]);

  // MARK: DailyStory auto-simulation sequences

  const handleSimulateDailyStoryComplete = useCallback(async () => {
    if (simRunning) return;
    setSimRunning(true);
    try {
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const endDate = Math.floor(midnight.getTime() / 1000);

      // 1. Start at card 1 (0%)
      const id = await startDailyStory({
        storyId: TEST_STORY_ID,
        storyTitle: TEST_STORY_TITLE,
        eraTitle: TEST_ERA_TITLE,
        dayNumber: 5,
        totalDays: 7,
        state: 'inProgress',
        currentCard: 1,
        totalCards: 3,
        progressPercent: 0,
        watchCompleted: false,
        exploreCompleted: false,
        questionsCompleted: false,
        currentStreak: TEST_STREAK,
        endDate,
        xpEarned: 0,
      });
      setDailyStoryId(id);
      setStoryCompleted(0);
      await refreshStatus();
      console.log('[Sim] DailyStory started (0/3 done), waiting 8s...');

      // 2. After 8s → 1/3 done (33%, watch ✓)
      await new Promise(r => setTimeout(r, 8000));
      await updateDailyStory({
        id,
        state: 'inProgress',
        currentCard: 2,
        totalCards: 3,
        progressPercent: 1 / 3,
        watchCompleted: true,
        exploreCompleted: false,
        questionsCompleted: false,
        currentStreak: TEST_STREAK,
        endDate,
        xpEarned: 0,
      });
      setStoryCompleted(1);
      await refreshStatus();
      console.log('[Sim] → 1/3 done, waiting 8s...');

      // 3. After 8s → 2/3 done (66%, +explore ✓)
      await new Promise(r => setTimeout(r, 8000));
      await updateDailyStory({
        id,
        state: 'inProgress',
        currentCard: 3,
        totalCards: 3,
        progressPercent: 2 / 3,
        watchCompleted: true,
        exploreCompleted: true,
        questionsCompleted: false,
        currentStreak: TEST_STREAK,
        endDate,
        xpEarned: 0,
      });
      setStoryCompleted(2);
      await refreshStatus();
      console.log('[Sim] → 2/3 done, waiting 8s...');

      // 4. After 8s → completed (100%, all ✓, +30 XP).
      //    Follow up with end(15 min) so Dynamic Island drops immediately but the
      //    Quest Complete banner lingers on lock screen for the spec'd 15 minutes.
      await new Promise(r => setTimeout(r, 8000));
      await updateDailyStory({
        id,
        state: 'completed',
        currentCard: 3,
        totalCards: 3,
        progressPercent: 1,
        watchCompleted: true,
        exploreCompleted: true,
        questionsCompleted: true,
        currentStreak: TEST_STREAK,
        endDate: 0,
        xpEarned: 30,
      });
      setStoryCompleted(3);
      await endDailyStory(id, TERMINAL_LINGER_SECONDS);
      setDailyStoryId(null);
      await refreshStatus();
      console.log('[Sim] → completed (DI dropped, banner lingers 15 min).');
    } catch (error) {
      handleError('Simulate DailyStory complete', error);
    } finally {
      setSimRunning(false);
    }
  }, [simRunning, handleError, refreshStatus]);

  const handleSimulateDailyStoryIncomplete = useCallback(async () => {
    if (simRunning) return;
    setSimRunning(true);
    try {
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const endDate = Math.floor(midnight.getTime() / 1000);

      // 1. Start at card 1 (0%)
      const id = await startDailyStory({
        storyId: TEST_STORY_ID,
        storyTitle: TEST_STORY_TITLE,
        eraTitle: TEST_ERA_TITLE,
        dayNumber: 5,
        totalDays: 7,
        state: 'inProgress',
        currentCard: 1,
        totalCards: 3,
        progressPercent: 0,
        watchCompleted: false,
        exploreCompleted: false,
        questionsCompleted: false,
        currentStreak: TEST_STREAK,
        endDate,
        xpEarned: 0,
      });
      setDailyStoryId(id);
      setStoryCompleted(0);
      await refreshStatus();
      console.log('[Sim] DailyStory started, waiting 10s...');

      // 2. After 10s → watch done only (stuck at 33%)
      await new Promise(r => setTimeout(r, 10000));
      await updateDailyStory({
        id,
        state: 'inProgress',
        currentCard: 2,
        totalCards: 3,
        progressPercent: 1 / 3,
        watchCompleted: true,
        exploreCompleted: false,
        questionsCompleted: false,
        currentStreak: TEST_STREAK,
        endDate,
        xpEarned: 0,
      });
      setStoryCompleted(1);
      await refreshStatus();
      console.log('[Sim] → 1/3 done, waiting 10s then hitting midnight...');

      // 3. After 10s → midnight fires, transition to incomplete.
      //    Follow up with end(15 min) so Dynamic Island drops immediately but the
      //    Quest Incomplete banner lingers on lock screen for 15 minutes.
      await new Promise(r => setTimeout(r, 10000));
      await updateDailyStory({
        id,
        state: 'incomplete',
        currentCard: 2,
        totalCards: 3,
        progressPercent: 1 / 3,
        watchCompleted: true,
        exploreCompleted: false,
        questionsCompleted: false,
        currentStreak: TEST_STREAK,
        endDate: 0,
        xpEarned: 0,
      });
      await endDailyStory(id, TERMINAL_LINGER_SECONDS);
      setDailyStoryId(null);
      await refreshStatus();
      console.log('[Sim] → incomplete (DI dropped, banner lingers 15 min).');
    } catch (error) {
      handleError('Simulate DailyStory incomplete', error);
    } finally {
      setSimRunning(false);
    }
  }, [simRunning, handleError, refreshStatus]);

  const handleEndDailyStoryImmediate = useCallback(async () => {
    if (!dailyStoryId) {
      Alert.alert('No active DailyStory', 'Start one first.');
      return;
    }
    try {
      await endDailyStory(dailyStoryId, 0);
      setDailyStoryId(null);
      setStoryCompleted(0);
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
      setStoryCompleted(0);
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
              {dailyStoryId ? `${storyCompleted}/3 cards done` : 'None'}
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
            label="Update → Saved (+ auto-end)"
            description="Story completed before midnight — DI drops, banner lingers 15 min"
            onPress={handleTransitionToSaved}
            disabled={!streakGuardId}
          />
          <ActionButton
            label="Update → Failed (+ auto-end)"
            description="Midnight passed, streak lost — DI drops, banner lingers 15 min"
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

          <Text style={styles.subheader}>Auto Simulate</Text>
          <ActionButton
            label={simRunning ? 'Simulation running...' : 'Expiring → Saved (10s)'}
            description="Start expiring, after 10s → saved + auto-end (banner lingers 15 min)"
            onPress={handleSimulateSavedSequence}
            disabled={!!streakGuardId || simRunning}
          />
          <ActionButton
            label={simRunning ? 'Simulation running...' : 'Expiring → Failed (10s)'}
            description="Start expiring, after 10s → failed + auto-end (banner lingers 15 min)"
            onPress={handleSimulateFailedSequence}
            disabled={!!streakGuardId || simRunning}
          />
          <ActionButton
            label={simRunning ? 'Simulation running...' : 'Full Cycle: [A] Expiring→Saved, [B] Expiring→Failed (~22s)'}
            description="2 separate activities — observe saved banner, then failed banner"
            onPress={handleSimulateFullCycle}
            disabled={!!streakGuardId || simRunning}
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
            description="Fresh story — inProgress banner with timer"
            onPress={handleStartDailyStory}
            disabled={!!dailyStoryId}
          />
          <ActionButton
            label="Start directly in Completed state"
            description="Skip progression — inspect Quest Complete banner immediately"
            onPress={handleStartDailyStoryCompleted}
            disabled={!!dailyStoryId}
          />
          <ActionButton
            label="Start directly in Incomplete state"
            description="Skip progression — inspect Quest Incomplete banner immediately"
            onPress={handleStartDailyStoryIncomplete}
            disabled={!!dailyStoryId}
          />

          <Text style={styles.subheader}>Transition</Text>
          <ActionButton
            label={
              storyCompleted >= 2
                ? 'Mark card 3 complete → Completed (+30 XP)'
                : `Mark card ${Math.min(storyCompleted + 1, 3)} complete (${Math.round(Math.min(storyCompleted + 1, 3) / 3 * 100)}%)`
            }
            description={`Currently ${storyCompleted}/3 done — last tap auto-flips to Quest Complete`}
            onPress={handleAdvanceDailyStory}
            disabled={!dailyStoryId || storyCompleted >= 3}
          />
          <ActionButton
            label="Update → Completed (+30 XP)"
            description="All 3 cards done before midnight — success state"
            onPress={handleCompleteDailyStory}
            disabled={!dailyStoryId}
          />
          <ActionButton
            label="Update → Incomplete (midnight hit)"
            description="Simulate midnight passing with only WATCH done — failure state"
            onPress={handleIncompleteDailyStory}
            disabled={!dailyStoryId}
            destructive
          />

          <Text style={styles.subheader}>End</Text>
          <ActionButton
            label="End immediately"
            description="Remove from lock screen now"
            onPress={handleEndDailyStoryImmediate}
            disabled={!dailyStoryId}
          />

          <Text style={styles.subheader}>Auto Simulate</Text>
          <ActionButton
            label={simRunning ? 'Simulation running...' : 'Card 1 → 2 → 3 → Completed → End (42s)'}
            description="Walk through full success path: progression every 8s, then dismiss"
            onPress={handleSimulateDailyStoryComplete}
            disabled={!!dailyStoryId || simRunning}
          />
          <ActionButton
            label={simRunning ? 'Simulation running...' : 'Card 1 → 1/3 done → Incomplete → End (40s)'}
            description="Walk through failure path: only WATCH done when midnight hits"
            onPress={handleSimulateDailyStoryIncomplete}
            disabled={!!dailyStoryId || simRunning}
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
