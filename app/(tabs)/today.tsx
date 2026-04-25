// Daily Quest Tab - New card-based design with expandable sections
// Features: Calendar week view, progress tracker, three content cards (WATCH, EXPLORE, QUESTIONS)

import TodayScrollableLesson from "@/components/lessons/today/TodayScrollableLesson";
import TodayVideoLesson from "@/components/lessons/today/TodayVideoLesson";
import Quiz from "@/components/quiz/Quiz";
import TodayCalendar from "@/components/today/TodayCalendar";
import TodayCardDeck, {
  type TodayCardData,
} from "@/components/today/TodayCardDeck";
import TodayHeader from "@/components/today/TodayHeader";
import TodayProgressBar from "@/components/today/TodayProgressBar";
import { DepthButton, Typography, easings } from "@/components/ui";
import { AnimatedEntrance } from "@/components/ui/animations";
import { useTodayPaywall } from "@/hooks/useTodayPaywall";
import { useTodayProgress } from "@/hooks/useTodayProgress";
import { useTodayQuest } from "@/hooks/useTodayQuest";
import { useVideoPreloader } from "@/hooks/useVideoPreloader";
import type { ContentItem } from "@/components/shared/types";
import ArchivesTheme from "@/constants/ArchivesTheme";
import { toLocalDateString } from "@/utils/dateUtils";
import { useGamificationOrchestrator } from "@/gamification";
import { useDailyStoryTracking } from "@/hooks/useDailyStoryTracking";
import { supabase } from "@/hooks/lib/supabase";
import { analyticsService } from "@/services/AnalyticsService";
import AppLogger from "@/services/AppLogger";
import { liveActivityManager } from "@/services/LiveActivityManager";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

// Theme styles
const themeStyles = ArchivesTheme.common.today;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// (Quest fetching, types, and per-section progress have moved to:
//  - hooks/useTodayQuest.ts
//  - hooks/useTodayProgress.ts
//  - hooks/useTodayPaywall.ts )


// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TodayScreen() {
  const { user } = useUser();
  const { isSubscribed, isLoading: isSubscriptionLoading } = useRevenueCat();
  const {
    streak,
    reportTodayComplete,
    showStreakCelebration,
  } = useGamificationOrchestrator();
  const {
    todayQuest,
    loading,
    saveQuestCompletion,
  } = useTodayQuest(user?.id);

  // Track page view for Today tab
  useFocusEffect(
    useCallback(() => {
      analyticsService.startPageView('today', '/(tabs)/today');
      return () => {
        analyticsService.endPageView('today');
      };
    }, [])
  );

  // Debug logging
  useEffect(() => {
    if (todayQuest) {
      console.log("📋 [Today UI] Quest loaded:", {
        card1_media: todayQuest.content?.card1?.media_url,
        card2_voice: todayQuest.content?.card2?.inner_voice,
        card3_questions: todayQuest.content?.card3?.questions?.length,
      });
    }
  }, [todayQuest]);

  // Warm disk cache for today's thumbnails so cards render instantly on tab open.
  // Only prefetch image URLs — video URLs would waste bandwidth trying to decode as images.
  useEffect(() => {
    const card1 = todayQuest?.content?.card1;
    if (!card1) return;
    const thumbs: string[] = [];
    if (typeof card1.thumbnail_url === 'string' && card1.thumbnail_url.length > 0) {
      thumbs.push(card1.thumbnail_url);
    }
    if (card1.content_type === 'image_carousel') {
      const firstMedia = Array.isArray(card1.media_url) ? card1.media_url[0] : card1.media_url;
      if (typeof firstMedia === 'string' && firstMedia.length > 0) thumbs.push(firstMedia);
    }
    if (thumbs.length > 0) {
      Image.prefetch(thumbs, { cachePolicy: 'disk' }).catch(() => {});
    }
  }, [todayQuest]);

  // Preload today's watch video so the modal opens without a cold-start spinner
  const watchVideoUrls = useMemo(() => {
    const card1 = todayQuest?.content?.card1;
    if (!card1) return [];
    if (card1.content_type !== 'reel' && card1.content_type !== 'video_carousel') return [];
    const source = card1.media_hls_url ?? card1.media_url;
    const urls = Array.isArray(source) ? source : [source];
    return urls.filter((u): u is string => typeof u === 'string' && u.length > 0);
  }, [todayQuest]);

  useVideoPreloader(watchVideoUrls, { maxVideos: 2 });


  // Single enum state for modal management (prevents flicker during transitions)
  type ModalState = "none" | "video" | "reading" | "quiz";
  const [activeModal, setActiveModal] = useState<ModalState>("none");
  const [previousModal, setPreviousModal] = useState<ModalState>("none");

  // Dual-slot architecture for Apple-style push/pop transitions
  // Two absolutely-positioned slots allow both outgoing and incoming content
  // to be visible simultaneously during transitions (no white flash).
  const activeSlotRef = useRef<"A" | "B">("A");
  const [slotAModal, setSlotAModal] = useState<ModalState>("none");
  const [slotBModal, setSlotBModal] = useState<ModalState>("none");
  const isModalTransitioning = useRef(false);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const [outgoingSlot, setOutgoingSlot] = useState<"A" | "B" | null>(null);
  const { width: screenWidth } = useWindowDimensions();

  // Cleanup on unmount — prevent state updates after component is removed
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      isModalTransitioning.current = false;
    };
  }, []);

  // Slot A animation values
  const slotATranslateX = useSharedValue(0);
  const slotAOpacity = useSharedValue(1);
  const slotAZIndex = useSharedValue(1);

  // Slot B animation values
  const slotBTranslateX = useSharedValue(0);
  const slotBOpacity = useSharedValue(0);
  const slotBZIndex = useSharedValue(0);

  const slotAAnimatedStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    top: 0, left: 0, right: 0, bottom: 0,
    transform: [{ translateX: slotATranslateX.value }],
    opacity: slotAOpacity.value,
    zIndex: slotAZIndex.value,
  }));

  const slotBAnimatedStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    top: 0, left: 0, right: 0, bottom: 0,
    transform: [{ translateX: slotBTranslateX.value }],
    opacity: slotBOpacity.value,
    zIndex: slotBZIndex.value,
  }));

  // Clean up after transition completes — always releases the lock
  const finishTransition = (
    newActiveSlot: "A" | "B",
    nextModal: ModalState,
  ) => {
    // Clear safety timeout (safe to call from JS thread)
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    if (!isMountedRef.current) return; // Component unmounted
    if (!isModalTransitioning.current) return; // Already finished (safety timeout race)
    try {
      activeSlotRef.current = newActiveSlot;
      // Clear the outgoing slot
      if (newActiveSlot === "A") {
        setSlotBModal("none");
        slotBTranslateX.value = 0;
        slotBOpacity.value = 0;
        slotBZIndex.value = 0;
      } else {
        setSlotAModal("none");
        slotATranslateX.value = 0;
        slotAOpacity.value = 0;
        slotAZIndex.value = 0;
      }
      // Sync activeModal for other effects (music pause, chat message, etc.)
      setActiveModal(nextModal);
      setOutgoingSlot(null);
    } catch (error) {
      AppLogger.error("quiz", "[Today] Error in finishTransition:", {}, error);
      // Force full reset to recover
      setSlotAModal("none");
      setSlotBModal("none");
      setActiveModal("none");
      setOutgoingSlot(null);
      activeSlotRef.current = "A";
    } finally {
      isModalTransitioning.current = false;
    }
  };

  // Apple-style push/pop transition between modal content views
  const animateModalTransition = (
    nextModal: ModalState,
    prevModal: ModalState,
    direction: "forward" | "backward",
  ) => {
    if (isModalTransitioning.current) {
      console.warn("⚠️ [Today] Transition blocked — already transitioning");
      return;
    }
    isModalTransitioning.current = true;
    const currentSlot = activeSlotRef.current;
    setOutgoingSlot(currentSlot);

    const incomingSlot = currentSlot === "A" ? "B" : "A";

    // Get refs for the correct slots
    const outX = currentSlot === "A" ? slotATranslateX : slotBTranslateX;
    const outOpacity = currentSlot === "A" ? slotAOpacity : slotBOpacity;
    const outZ = currentSlot === "A" ? slotAZIndex : slotBZIndex;
    const inX = incomingSlot === "A" ? slotATranslateX : slotBTranslateX;
    const inOpacity = incomingSlot === "A" ? slotAOpacity : slotBOpacity;
    const inZ = incomingSlot === "A" ? slotAZIndex : slotBZIndex;
    const setIncoming = incomingSlot === "A" ? setSlotAModal : setSlotBModal;

    // Set z-order: forward = incoming on top, backward = outgoing on top
    if (direction === "forward") {
      outZ.value = 1;
      inZ.value = 2;
    } else {
      outZ.value = 2;
      inZ.value = 1;
    }

    // Position incoming offscreen and render it
    inX.value = direction === "forward" ? screenWidth : -screenWidth * 0.3;
    inOpacity.value = 1;
    setIncoming(nextModal);
    setPreviousModal(prevModal);

    // Safety timeout: force cleanup if animation doesn't complete in 1s
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = setTimeout(() => {
      if (isModalTransitioning.current) {
        console.warn("⚠️ [Today] Modal transition timed out, forcing cleanup");
        finishTransition(incomingSlot, nextModal);
      }
    }, 1000);

    // Wait one frame for React to mount the incoming content, then animate both
    rafRef.current = requestAnimationFrame(() => {
      const duration = 300;
      const timingConfig = { duration, easing: Easing.out(Easing.cubic) };

      // Outgoing: slide away + dim slightly
      const outTarget = direction === "forward" ? -screenWidth * 0.3 : screenWidth;
      outX.value = withTiming(outTarget, timingConfig);
      if (direction === "forward") {
        outOpacity.value = withTiming(0.5, { duration });
      }

      // Incoming: slide to center — finishTransition handles timeout cleanup on JS thread
      inX.value = withTiming(0, timingConfig, () => {
        runOnJS(finishTransition)(incomingSlot, nextModal);
      });
    });
  };

  // Week navigation and historical content viewing
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [displayedQuest, setDisplayedQuest] = useState<
    typeof todayQuest | null
  >(null);
  const [isHistoricalView, setIsHistoricalView] = useState(false);

  // Daily story PostHog tracking
  const tracking = useDailyStoryTracking({
    storyId: (displayedQuest || todayQuest)?.id || null,
    storyDate: (displayedQuest || todayQuest)?.date || null,
    storyTitle: (displayedQuest || todayQuest)?.content?.today_title || (displayedQuest || todayQuest)?.content?.card1?.title || null,
    entrySource: isHistoricalView ? 'rewind' : 'today_tab',
    isToday: !isHistoricalView,
    isSubscribed,
  });

  // Cache for completed quest dates (for calendar display)
  const [completedDatesCache, setCompletedDatesCache] =
    useState<Set<string> | null>(null);

  // Fetch historical quest by date from Supabase
  const fetchQuestByDate = async (dateString: string) => {
    try {
      console.log(`📅 [Today] Fetching quest for date: ${dateString}`);
      const { data, error } = await supabase
        .from("daily_content")
        .select("*")
        .eq("date", dateString)
        .maybeSingle();

      if (error) {
        console.error(
          `❌ [Today] Error fetching quest for ${dateString}:`,
          error,
        );
        return null;
      }

      if (!data) {
        console.log(`📅 [Today] No content found for ${dateString}`);
        return null;
      }

      console.log(`✅ [Today] Quest loaded for ${dateString}:`, data);
      return data;
    } catch (err) {
      console.error(`❌ [Today] Exception fetching quest:`, err);
      return null;
    }
  };

  // Paywall presentation flow for daily-story rewind. Owns `justPurchasedRef`
  // (race-guard against the subscription-expiration recovery effect) and the
  // re-entrancy guard. On unlock, navigates the calendar to the gated date.
  const { handleShowPaywall, justPurchasedRef } = useTodayPaywall({
    fetchQuestByDate,
    onUnlockHistoricalDate: (date, quest) => {
      setSelectedDate(date);
      setIsHistoricalView(true);
      setDisplayedQuest(quest);
    },
  });

  // Set displayedQuest when todayQuest loads (for current day)
  useEffect(() => {
    const today = toLocalDateString(new Date());
    const selectedDateStr = toLocalDateString(selectedDate);

    if (todayQuest && selectedDateStr === today) {
      setDisplayedQuest(todayQuest);
      setIsHistoricalView(false);
    }
  }, [todayQuest, selectedDate]);

  // Handle subscription expiration while viewing historical content
  useEffect(() => {
    // Skip reset if user just completed a purchase (prevents race condition)
    // The RevenueCat listener hasn't updated isSubscribed yet, but purchase was successful
    if (justPurchasedRef.current) {
      AppLogger.info('subscription', 'Skipping reset - purchase just completed, waiting for subscription state sync');
      return;
    }

    // If user is viewing historical content and subscription expires, reset to today
    if (isHistoricalView && !isSubscribed && !isSubscriptionLoading) {
      AppLogger.warn('subscription', 'Subscription expired while viewing historical content - resetting to today');
      const today = new Date();
      setSelectedDate(today);
      setIsHistoricalView(false);
      setDisplayedQuest(todayQuest);
    }
  }, [isSubscribed, isSubscriptionLoading, isHistoricalView, todayQuest, justPurchasedRef]);

  // Audio player for voiceover (from inner_voice URL in Supabase)
  const player = useAudioPlayer(
    todayQuest?.content?.card2?.inner_voice || null,
  );

  // Configure audio mode for silent mode playback
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true, // Audio plays even in silent mode
        });
        console.log(
          "🎵 [Today] Audio mode configured for silent mode playback",
        );
      } catch (error) {
        console.error("🎵 [Today] Failed to configure audio mode:", error);
      }
    };

    configureAudio();
  }, []);

  // Handle StatusBar for fullscreen Explore modal (checks slots too for mid-transition)
  const isReadingVisible = activeModal === "reading" || slotAModal === "reading" || slotBModal === "reading";
  useEffect(() => {
    if (isReadingVisible) {
      StatusBar.setBarStyle("dark-content");
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor("transparent");
        StatusBar.setTranslucent(true);
      }
    } else {
      if (Platform.OS === "android") {
        StatusBar.setTranslucent(false);
      }
    }
  }, [isReadingVisible]);

  // Toggle audio playback
  const toggleAudio = () => {
    console.log("🎵 [Today] Toggle audio clicked");
    console.log("   Player loaded:", player.isLoaded);
    console.log("   Player playing:", player.playing);
    console.log(
      "   Audio URI:",
      todayQuest?.content?.card2?.inner_voice ? "Yes" : "No",
    );

    if (!player.isLoaded) {
      console.log("❌ [Today] Player not loaded yet");
      return;
    }

    if (player.playing) {
      console.log("⏸️ [Today] Pausing audio");
      player.pause();
    } else {
      console.log("▶️ [Today] Playing audio");
      player.play();
    }
  };

  // Handle calendar date click
  const handleDateClick = async (date: Date) => {
    const dateStr = toLocalDateString(date);
    const today = toLocalDateString(new Date());
    const isPastDate = dateStr < today;

    console.log(`📅 [Today] Date clicked: ${dateStr}`);

    // Track rewind tapped for past dates
    if (isPastDate) {
      const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      tracking.trackRewindTapped(dateStr, daysAgo);
    }

    // Wait for subscription status to load before making gate decisions
    if (isPastDate && isSubscriptionLoading) {
      console.log(`⏳ [Today] Waiting for subscription status...`);
      return;
    }

    if (dateStr === today) {
      // Viewing current day - always allowed
      console.log(`✅ [Today] Returning to current day`);
      setSelectedDate(date);
      setDisplayedQuest(todayQuest);
      setIsHistoricalView(false);
    } else if (isPastDate && !isSubscribed) {
      // Past date and not subscribed - track block and show paywall
      const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      tracking.trackRewindBlocked(dateStr, daysAgo);
      console.log(`🔒 [Today] Subscription required for: ${dateStr}`);
      await handleShowPaywall(date);
    } else {
      // Past date and subscribed - load historical content
      console.log(`📜 [Today] Loading historical content for ${dateStr}`);
      setSelectedDate(date);
      setIsHistoricalView(true);
      const historicalQuest = await fetchQuestByDate(dateStr);
      setDisplayedQuest(historicalQuest);
    }
  };

  // Fetch completed quest dates from Supabase for calendar display
  const fetchCompletedQuestDates = async (
    startDate: Date,
    endDate: Date,
  ): Promise<Set<string>> => {
    if (!user?.id) return new Set();

    try {
      const startDateStr = toLocalDateString(startDate);
      const endDateStr = toLocalDateString(endDate);

      // Only mark dates as completed if ALL sections are done:
      // watch_completed = true, explore_completed = true, score > 0 (quiz done)
      const { data, error } = await supabase
        .from("user_daily_quest_progress")
        .select(
          "daily_quest_id, daily_content!fk_daily_quest!inner(date), watch_completed, explore_completed, score",
        )
        .eq("user_id", user.id)
        .eq("watch_completed", true)
        .eq("explore_completed", true)
        .gt("score", 0)
        .gte("daily_content.date", startDateStr)
        .lte("daily_content.date", endDateStr);

      if (error) {
        console.error("❌ [Calendar] Error fetching completed dates:", error);
        return new Set();
      }

      const completedDates = new Set(
        data?.map((row: any) => row.daily_content.date) || [],
      );
      console.log(
        "📅 [Calendar] Fetched completed dates:",
        Array.from(completedDates),
      );
      return completedDates;
    } catch (error) {
      console.error("❌ [Calendar] Exception fetching completed dates:", error);
      return new Set();
    }
  };

  // Per-section completion state for the active quest. Loads from Supabase
  // (with AsyncStorage fallback), exposes setters + a save helper that
  // round-trips to both stores, and derives `progress` / unlock flags.
  const {
    watchCompleted,
    exploreCompleted,
    questCompleted,
    progress,
    isExploreUnlocked,
    isQuizUnlocked,
    setWatchCompleted,
    setExploreCompleted,
    setQuestCompleted,
    saveProgress,
  } = useTodayProgress({
    displayedQuest,
    todayQuest,
    userId: user?.id,
    isHistoricalView,
  });

  // Live Activity — cache quiz results for XP plumbing to Live Activity completion
  const lastQuizCorrectAnswersRef = useRef(0);

  // Guard: streak starts as 0 before cloud hydration — don't expose pre-hydration value
  const isStreakHydrated = streak > 0;
  const streakRef = useRef(streak);
  useEffect(() => { streakRef.current = streak; }, [streak]);

  // Handle quiz completion
  const handleQuizComplete = async () => {
    setQuestCompleted(true);
    console.log("✅ [Today] Quiz completed, quest finished!");

    // Track daily story completed
    await tracking.trackCompleted();

    // Trigger celebration immediately when quiz is completed (including replays)
    const currentQuest = displayedQuest || todayQuest;
    if (currentQuest?.date && watchCompleted && exploreCompleted) {
      const questDate = currentQuest.date;
      const xpEarned = lastQuizCorrectAnswersRef.current * 10;
      console.log(`🎬 [Today] Triggering celebration for ${questDate} (XP: ${xpEarned})...`);
      await reportTodayComplete(questDate, xpEarned);
      console.log(`✅ [Today] Celebration triggered`);
    }
  };

  // Modal opener — puts content in active slot, resets everything
  const openModal = (modal: ModalState) => {
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    isModalTransitioning.current = false;
    const slot = activeSlotRef.current;
    if (slot === "A") {
      setSlotAModal(modal);
      slotATranslateX.value = 0;
      slotAOpacity.value = 1;
      slotAZIndex.value = 1;
      setSlotBModal("none");
      slotBOpacity.value = 0;
      slotBZIndex.value = 0;
    } else {
      setSlotBModal(modal);
      slotBTranslateX.value = 0;
      slotBOpacity.value = 1;
      slotBZIndex.value = 1;
      setSlotAModal("none");
      slotAOpacity.value = 0;
      slotAZIndex.value = 0;
    }
    setActiveModal(modal);
    setPreviousModal("none");
    if (modal === "video") tracking.trackCardViewed(1);
    if (modal === "reading") tracking.trackCardViewed(2);
    if (modal === "quiz") tracking.trackCardViewed(3);
  };

  // Close modal entirely — clear both slots
  const closeModal = () => {
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    isModalTransitioning.current = false;
    setSlotAModal("none");
    setSlotBModal("none");
    slotATranslateX.value = 0;
    slotAOpacity.value = 1;
    slotAZIndex.value = 1;
    slotBTranslateX.value = 0;
    slotBOpacity.value = 0;
    slotBZIndex.value = 0;
    activeSlotRef.current = "A";
    setActiveModal("none");
    setPreviousModal("none");
  };

  // Note: Celebration now triggered directly in handleQuizComplete (not useEffect)
  // This ensures animation shows only when user actively completes quiz, not when loading completed quest

  // Fetch completed quest dates for calendar display
  useEffect(() => {
    const loadCompletedDates = async () => {
      if (!user?.id) {
        setCompletedDatesCache(new Set());
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch for a wider range to cover both week view and month modal
      // Go back 60 days to cover historical data
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 60);

      const completedDates = await fetchCompletedQuestDates(startDate, today);
      setCompletedDatesCache(completedDates);
    };

    loadCompletedDates();
  }, [user?.id, questCompleted]); // Refetch when user changes or quest completed
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Live Activity — update DailyStory progress if activity is running
  // Guard: only update if user is interacting with TODAY's quest (not historical/rewind)
  // Live Activity always belongs to today's story; updates from past-day quests must be ignored
  const updateDailyStoryIfActive = useCallback((cards: {
    watchCompleted: boolean;
    exploreCompleted: boolean;
    questionsCompleted: boolean;
  }) => {
    if (!liveActivityManager.isDailyStoryActive) return;

    // Only apply updates from today's quest — skip if user is doing a historical quest
    if (isHistoricalView) return;
    const quest = displayedQuest || todayQuest;
    const today = toLocalDateString(new Date());
    if (!quest || quest.date !== today) return;

    liveActivityManager.updateDailyStoryProgress({
      ...cards,
      currentStreak: streak,
    }).catch((err) => {
      AppLogger.error('gamification', 'DailyStory Live Activity update failed', {}, err as Error);
    });
  }, [streak, isHistoricalView, displayedQuest, todayQuest]);

  // Live Activity — start DailyStory on first Today tab open of the day
  // Specs: starts when user opens Today tab, once per day, only if quest incomplete
  useFocusEffect(
    useCallback(() => {
      if (!todayQuest) return;

      // Don't start if quest is already fully completed
      if (questCompleted && watchCompleted && exploreCompleted) return;

      const today = toLocalDateString(new Date());
      if (todayQuest.date !== today) return;

      // Skip if streak hasn't hydrated yet — prevents brief "0-day streak" on lock screen
      if (!isStreakHydrated) return;

      liveActivityManager.startDailyStoryActivity({
        storyId: todayQuest.id,
        storyTitle: todayQuest.content.today_title,
        dayNumber: todayQuest.content.day_number,
        totalDays: todayQuest.content.total_days,
        currentStreak: streakRef.current,
        watchCompleted,
        exploreCompleted,
        questionsCompleted: questCompleted,
      }).catch((err) => {
        AppLogger.error('gamification', 'DailyStory Live Activity start failed', {}, err as Error);
      });
    }, [todayQuest, questCompleted, watchCompleted, exploreCompleted, isStreakHydrated])
  );

  // Sync streak changes to Live Activity (card completions already handled by onNext callbacks)
  useEffect(() => {
    if (!liveActivityManager.isDailyStoryActive) return;
    if (isHistoricalView) return;
    liveActivityManager.updateDailyStoryProgress({
      watchCompleted,
      exploreCompleted,
      questionsCompleted: questCompleted,
      currentStreak: streak,
    }).catch((err) => {
      AppLogger.error('gamification', 'DailyStory streak sync failed', {}, err as Error);
    });
  }, [streak, isHistoricalView]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={themeStyles.container} edges={["top"]}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator
            size="large"
            color={ArchivesTheme.colors.persianOrange}
          />
          <Text
            style={{
              fontFamily: "DM Sans",
              fontSize: 16,
              fontWeight: "600",
              color: ArchivesTheme.colors.shoeBrown,
              marginTop: 16,
            }}
          >
            Loading today’s quest...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const headerTitle = (() => {
    if (isHistoricalView && !displayedQuest) {
      const day = selectedDate.getDate();
      const month = selectedDate.toLocaleDateString("en-US", { month: "short" });
      return `${day} ${month}'s Story`;
    }

    const currentQuest = displayedQuest || todayQuest;
    if (!currentQuest?.date) return "Today's Story";

    const today = toLocalDateString(new Date());
    if (currentQuest.date === today) return "Today's Story";

    const questDate = new Date(currentQuest.date + "T00:00:00");
    const day = questDate.getDate();
    const month = questDate.toLocaleDateString("en-US", { month: "short" });
    return `${day} ${month}'s Story`;
  })();

  const progressLabel = (() => {
    if (isHistoricalView && !displayedQuest) {
      const day = selectedDate.getDate();
      const month = selectedDate.toLocaleDateString("en-US", { month: "short" });
      return `${day} ${month}'s progress`;
    }

    const currentQuest = displayedQuest || todayQuest;
    if (!currentQuest?.date) return "Progress today";

    const today = toLocalDateString(new Date());
    if (currentQuest.date === today) return "Progress today";

    const questDate = new Date(currentQuest.date + "T00:00:00");
    const day = questDate.getDate();
    const month = questDate.toLocaleDateString("en-US", { month: "short" });
    return `${day} ${month}'s progress`;
  })();

  // Render content for a given modal state (used by both slots)
  const renderModalContent = (modal: ModalState) => {
    if (modal === "none") return null;

    const quest = displayedQuest || todayQuest;
    if (!quest) {
      console.error("❌ [Today] renderModalContent called with no quest data");
      return null;
    }

    if (modal === "video") {
      const card1 = quest.content.card1;
      const sourceUrl = card1.media_hls_url !== undefined ? card1.media_hls_url : card1.media_url;
      const mediaUrls = Array.isArray(sourceUrl)
        ? sourceUrl
        : [sourceUrl];

      return (
        <TodayVideoLesson
          contentItem={{
            id: quest.id,
            thumbnail_title: card1.title,
            thumbnail_url: "",
            media_url: mediaUrls,
            content_type: card1.content_type || "reel",
            background_music_url: card1.background_music_url,
            bottom_content: {
              title: card1.title,
              description: card1.content.reading_text,
              reading_text: card1.content.reading_text,
              captions: card1.content.captions || [],
            },
            order_by: 0,
          } as ContentItem}
          progress={progress}
          onMediaPlayed={() => tracking.trackMediaPlayed("video", quest.id)}
          onNext={async () => {
            if (isModalTransitioning.current) return;
            setWatchCompleted(true);
            await saveProgress("watch");
            updateDailyStoryIfActive({ watchCompleted: true, exploreCompleted: false, questionsCompleted: false });
            animateModalTransition("reading", "video", "forward");
            tracking.trackCardViewed(2);
          }}
          onDismiss={() => {
            if (isModalTransitioning.current) return;
            closeModal();
          }}
        />
      );
    }

    if (modal === "reading") {
      return (
        <TodayScrollableLesson
          contentBlocks={
            quest.content.card2.content_blocks || []
          }
          progress={progress}
          innerVoiceUrl={
            quest.content.card2.inner_voice
          }
          onMediaPlayed={() => tracking.trackMediaPlayed("audio", quest.id)}
          onContinue={async () => {
            if (isModalTransitioning.current) return;
            setExploreCompleted(true);
            await saveProgress("explore");
            updateDailyStoryIfActive({ watchCompleted: true, exploreCompleted: true, questionsCompleted: false });
            animateModalTransition("quiz", "reading", "forward");
            tracking.trackCardViewed(3);
          }}
          onBack={() => {
            if (isModalTransitioning.current) return;
            if (previousModal === "video") {
              animateModalTransition("video", "none", "backward");
              tracking.trackCardViewed(1);
            } else {
              closeModal();
            }
          }}
        />
      );
    }

    if (modal === "quiz") {
      if (!user) {
        AppLogger.error("quiz", "[Today] Quiz modal opened without authenticated user");
        closeModal();
        return null;
      }
      return (
        <SafeAreaView
          style={{ flex: 1, backgroundColor: ArchivesTheme.colors.creamWhite }}
          edges={[]}
        >
          <Quiz
            contentItem={
              {
                id: quest.id,
                questions: quest.content.card3.questions,
                thumbnail_title: quest.content.card3.title,
                thumbnail_url: "",
                media_url: [],
                content_type: "reel",
                bottom_content: null,
                order_by: 0,
              } as ContentItem
            }
            adventureId="daily_quest"
            moduleId={quest.id}
            eraId="daily_quest"
            eraName="Daily Quest"
            isToday={true}
            progress={progress}
            showTodayHeader={true}
            onQuizResults={async (score, correctAnswers, totalQuestions) => {
              // Cache for Live Activity XP plumbing (read in handleQuizComplete)
              lastQuizCorrectAnswersRef.current = correctAnswers;
              try {
                await saveQuestCompletion(
                  user.id,
                  quest.id,
                  score,
                  correctAnswers,
                  totalQuestions,
                );
                console.log("✅ [Today] Quest completion saved to Supabase");
              } catch (error) {
                console.error("❌ [Today] Failed to save completion:", error);
              }
            }}
            onContinue={async () => {
              if (isModalTransitioning.current) return;
              await handleQuizComplete();
              closeModal();
            }}
            onDismiss={() => {
              if (isModalTransitioning.current) return;
              if (previousModal === "reading") {
                animateModalTransition("reading", "video", "backward");
                tracking.trackCardViewed(2);
              } else {
                closeModal();
              }
            }}
            onBack={() => {
              if (isModalTransitioning.current) return;
              if (previousModal === "reading") {
                animateModalTransition("reading", "video", "backward");
                tracking.trackCardViewed(2);
              } else {
                closeModal();
              }
            }}
          />
        </SafeAreaView>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={themeStyles.container} edges={["top"]}>
      <ScrollView
        style={themeStyles.scrollView}
        contentContainerStyle={themeStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/*
          Today entrance timeline — ported 1:1 from
          `Downloads/02 daily story/index.html:1843-1888` (`enterScreen1`).

            Element              | from→to                    | dur  | easing       | delay
            ──────────────────────┼────────────────────────────┼──────┼──────────────┼──────
            Title (header)        | y -16 → 0, opacity 0 → 1   | 450  | power2.out   | 0
            Calendar (week row)   | y -10 → 0, opacity 0 → 1   | 400  | back.out(2)  | 180
            Progress              | opacity 0 → 1              | 300  | power2.out   | 500
            Card deck             | y 60 → 0, opacity 0 → 1    | 550  | back.out(1.4)| 650
            Start button          | y 40 → 0, opacity 0 → 1    | 500  | back.out(2)  | 1050
        */}
        <AnimatedEntrance
          delay={0}
          preset={{
            translateY: { from: -16, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 450,
            easing: easings.power2Out,
          }}
        >
          <TodayHeader
            title={headerTitle}
            streak={streak}
            onStreakPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              showStreakCelebration();
            }}
            style={{ marginBottom: 15 }}
          />
        </AnimatedEntrance>

        {/* Calendar — per-day-cell entrance with 50ms stagger lives inside
            TodayCalendar (not wrapped here) to match the mock's `.week-row .day` stagger. */}
        <TodayCalendar
          selectedDate={selectedDate}
          onSelectDate={handleDateClick}
          completedDates={completedDatesCache ?? new Set<string>()}
          isSubscribed={isSubscribed}
          style={{ marginBottom: 22 }}
          entranceDelay={180}
        />

        <AnimatedEntrance
          delay={500}
          preset={{
            opacity: { from: 0, to: 1 },
            duration: 300,
            easing: easings.power2Out,
          }}
        >
          <TodayProgressBar label={progressLabel} progress={progress} style={{ marginBottom: 30 }} />
        </AnimatedEntrance>

        {/* No Quest Available - Shows inline when no content exists (historical or today) */}
        {(isHistoricalView && !displayedQuest) ||
        (!isHistoricalView && !todayQuest) ? (
          <View
            style={{
              flex: 1,
              paddingVertical: 80,
              paddingHorizontal: 32,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={64}
              color={ArchivesTheme.colors.persianOrange}
              style={{ marginBottom: 20 }}
            />
            <Text
              style={{
                fontFamily: "DM Sans",
                fontSize: 22,
                fontWeight: "700",
                color: ArchivesTheme.colors.persianOrange,
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              {isHistoricalView ? "No Quest Available" : "No Quest Today"}
            </Text>
            <Text
              style={{
                fontFamily: "DM Sans",
                fontSize: 15,
                fontWeight: "400",
                color: ArchivesTheme.colors.shoeBrown,
                textAlign: "center",
                lineHeight: 22,
              }}
            >
              {isHistoricalView
                ? "There's no daily content for this date. Try selecting a different day from the calendar."
                : "Check back tomorrow for a new daily quest!"}
            </Text>
          </View>
        ) : (
          <>
            {(() => {
              const quest = displayedQuest || todayQuest;
              const card1 = quest?.content?.card1;
              const card2 = quest?.content?.card2;

              const cardsData: [TodayCardData, TodayCardData, TodayCardData] = [
                {
                  kind: "explore",
                  kicker: "Explore",
                  title: card2?.thumbnail_title ?? "",
                  minutes: exploreCompleted ? "DONE" : "1 MIN",
                  pillLabel: "Start",
                  imageSource: require("@/assets/images/eras/era1-bg.jpg"),
                  onPress: () => {
                    if (isExploreUnlocked) openModal("reading");
                  },
                },
                {
                  kind: "watch",
                  kicker: "Watch",
                  title: card1?.title ?? "",
                  minutes: watchCompleted ? "DONE" : "2 MIN",
                  pillLabel: "Watch",
                  imageSource: require("@/assets/images/adventure-backgrounds/UmmayadDynasty.png"),
                  onPress: () => {
                    if (card1?.media_url) openModal("video");
                  },
                },
                {
                  kind: "questions",
                  kicker: "Questions",
                  title: "Test your knowledge",
                  minutes: questCompleted ? "DONE" : "2 MIN",
                  pillLabel: "Start",
                  imageSource: require("@/assets/images/eras/era2-bg.jpg"),
                  onPress: () => {
                    if (isQuizUnlocked) openModal("quiz");
                  },
                },
              ];

              return (
                <AnimatedEntrance
                  delay={650}
                  preset={{
                    translateY: { from: 60, to: 0 },
                    opacity: { from: 0, to: 1 },
                    duration: 550,
                    easing: easings.backOut14,
                  }}
                >
                  <TodayCardDeck cards={cardsData} />
                </AnimatedEntrance>
              );
            })()}

            {/* Bottom Spacing for fixed button */}
            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* Start My Day Button - Fixed at Bottom with 3D depth effect */}
      {!(isHistoricalView && !displayedQuest) && (
        <AnimatedEntrance
          delay={1050}
          preset={{
            translateY: { from: 40, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 500,
            easing: easings.backOut2,
          }}
          style={themeStyles.bottomButtonContainer}
        >
          <DepthButton
            isFullWidth
            variant="secondary"
            onPress={() => {
              if (progress === 100) {
                openModal("video");
              } else if (!watchCompleted) {
                openModal("video");
              } else if (!exploreCompleted) {
                openModal("reading");
              } else if (isQuizUnlocked) {
                openModal("quiz");
              }
            }}
          >
            <Typography variant="label.m" color="white">
              {progress === 100 ? "DAY COMPLETE!" : "START MY DAY"}
            </Typography>
          </DepthButton>
        </AnimatedEntrance>
      )}

      {/* Dual-slot modal for Apple-style push/pop transitions */}
      {(slotAModal !== "none" || slotBModal !== "none") &&
        (displayedQuest || todayQuest) && (
          <Modal
            visible={true}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent={true}
          >
            <View style={{ flex: 1 }}>
              <Animated.View
                style={slotAAnimatedStyle}
                pointerEvents={slotAModal !== "none" && outgoingSlot !== "A" ? "auto" : "none"}
              >
                {renderModalContent(slotAModal)}
              </Animated.View>
              <Animated.View
                style={slotBAnimatedStyle}
                pointerEvents={slotBModal !== "none" && outgoingSlot !== "B" ? "auto" : "none"}
              >
                {renderModalContent(slotBModal)}
              </Animated.View>
            </View>
          </Modal>
        )}

    </SafeAreaView>
  );
}
