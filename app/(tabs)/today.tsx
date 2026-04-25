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
import { useVideoPreloader } from "@/hooks/useVideoPreloader";
import type { ContentBlock, ContentItem } from "@/components/shared/types";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
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
// TYPES & INTERFACES (from useToday.ts)
// ============================================================================

interface Card1Content {
  content_type: "reel" | "video_carousel" | "image_carousel";
  title: string;
  media_url: string | string[]; // Single URL for reel, array for carousels
  media_hls_url?: string | string[]; // HLS version of media_url (preferred when available)
  thumbnail_url?: string; // Background thumbnail for WATCH card
  background_music_url?: string; // Background music for ambient audio
  content: {
    reading_text: string;
    captions?: string[]; // Optional captions for carousel items
  };
}

interface Card2Content {
  content_type: "scrollable_media_view";
  title: string;
  thumbnail_title?: string; // Display title for card2 (explore)
  inner_image: string;
  inner_voice: string;
  content: string;
  content_blocks?: ContentBlock[]; // New content_blocks array structure
}

interface Card3Content {
  title: string;
  questions: Array<{
    question_id: string;
    question_text: string;
    question_type: "mcq" | "trueFalse";
    answers: Array<{
      answer_id: string;
      text: string;
      is_correct: boolean;
    }>;
    explanation: string;
    order: number;
  }>;
}

interface TodayContent {
  card1: Card1Content;
  card2: Card2Content;
  card3: Card3Content;
  today_title: string;
  day_number: number;
  total_days: number;
}

interface Today {
  id: string;
  date: string;
  content: TodayContent;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TodayProgress {
  user_id: string;
  daily_quest_id: string;
  watch_completed?: boolean;
  explore_completed?: boolean;
  score: number;
  correct_answers: number;
  total_questions: number;
  created_at?: string | null;
  updated_at?: string | null;
}

// ============================================================================
// CUSTOM HOOK (from useToday.ts)
// ============================================================================

function useToday(userId?: string) {
  const [todayQuest, setTodayQuest] = useState<Today | null>(null);
  const [questProgress, setQuestProgress] = useState<TodayProgress | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract fetch function so it can be reused by realtime subscription
  const fetchTodayQuest = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const today = new Date();
      const todayDate = toLocalDateString(today);

      console.log(`🔍 [useToday] Fetching quest for ${todayDate}`);

      const { data: questData, error: questError } = await supabase
        .from("daily_content")
        .select("*")
        .eq("date", todayDate)
        .in("is_active", [true, "TRUE", "true"])
        .single();

      if (questError) {
        console.error("❌ [useToday] Error fetching quest:", questError);
        setError("No quest available for today");
        setTodayQuest(null);
        setLoading(false);
        return;
      }

      console.log(
        "✅ [useToday] Quest fetched:",
        questData?.content?.card1?.title,
      );
      setTodayQuest(questData as Today);

      if (userId && questData) {
        try {
          const { data: progressData, error: progressError } = await supabase
            .from("user_daily_quest_progress")
            .select("*")
            .eq("user_id", userId)
            .eq("daily_quest_id", questData.id)
            .maybeSingle();

          if (progressError) {
            console.warn(
              "⚠️ [useToday] Progress query failed:",
              progressError.message,
            );
          } else if (progressData) {
            console.log("✅ [useToday] User already completed this quest");
            setQuestProgress(progressData as TodayProgress);
          }
        } catch (err) {
          console.warn("⚠️ [useToday] Progress check failed:", err);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("❌ [useToday] Unexpected error:", err);
      setError("Failed to load daily quest");
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchTodayQuest(true);

    // Subscribe to realtime changes on daily_content table
    const channel = supabase
      .channel("daily-content-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_content" },
        (payload) => {
          console.log(
            "🔄 [useToday] Realtime update received:",
            payload.eventType,
          );
          // Refetch without showing loading spinner for smoother UX
          fetchTodayQuest(false);
        },
      )
      .subscribe((status) => {
        console.log("📡 [useToday] Realtime subscription status:", status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log("🔌 [useToday] Unsubscribing from realtime");
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const saveQuestCompletion = async (
    userId: string,
    questId: string,
    score: number,
    correctAnswers: number,
    totalQuestions: number,
  ) => {
    try {
      console.log(
        `💾 [useToday] Saving completion: ${correctAnswers}/${totalQuestions} (Score: ${score})`,
      );

      // Check if a record already exists
      const { data: existing } = await supabase
        .from("user_daily_quest_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("daily_quest_id", questId)
        .maybeSingle();

      // If exists and new score is lower, keep the better score
      if (existing && existing.score >= score) {
        console.log(
          `✅ [useToday] Keeping existing better score: ${existing.score}`,
        );
        setQuestProgress(existing as TodayProgress);
        return existing;
      }

      // Upsert: Insert new or update with better score
      const { data, error } = await supabase
        .from("user_daily_quest_progress")
        .upsert(
          {
            user_id: userId,
            daily_quest_id: questId,
            score,
            correct_answers: correctAnswers,
            total_questions: totalQuestions,
          },
          {
            onConflict: "user_id,daily_quest_id",
          },
        )
        .select()
        .single();

      if (error) {
        console.error("❌ [useToday] Error saving completion:", error);
        throw error;
      }

      console.log(
        `✅ [useToday] Completion saved (${existing ? "Updated" : "New"})`,
      );
      setQuestProgress(data as TodayProgress);
      return data;
    } catch (err) {
      console.error("❌ [useToday] Failed to save completion:", err);
      throw err;
    }
  };

  return {
    todayQuest,
    questProgress,
    loading,
    error,
    isCompleted: !!questProgress,
    saveQuestCompletion,
  };
}

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
  } = useToday(user?.id);

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

  // Flag to prevent race condition between purchase completion and subscription state update
  // Using ref (not state) because we don't need re-renders when this changes
  const justPurchasedRef = useRef(false);

  // Ref to prevent multiple simultaneous paywall presentations
  const isPaywallPresentedRef = useRef(false);

  // Present paywall using imperative API (Android-safe, no overlay needed)
  const handleShowPaywall = async (date: Date) => {
    if (isPaywallPresentedRef.current) {
      AppLogger.warn('subscription', 'Paywall already presented, skipping');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Track paywall view triggered from daily story rewind
    analyticsService.trackSubscribeScreenViewed({
      trigger: 'daily_story_rewind',
    });

    try {
      isPaywallPresentedRef.current = true;
      const result = await RevenueCatUI.presentPaywall();

      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED: {
          const action = result === PAYWALL_RESULT.PURCHASED ? 'Purchase' : 'Restore';
          AppLogger.info('subscription', `${action} completed`, { trigger: 'daily_story_rewind' });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Set flag and schedule cleanup BEFORE async work so it always clears
          // even if fetchQuestByDate throws
          justPurchasedRef.current = true;
          setTimeout(() => {
            justPurchasedRef.current = false;
            AppLogger.info('subscription', 'Purchase protection window ended');
          }, 5000);

          if (result === PAYWALL_RESULT.PURCHASED) {
            analyticsService.trackSubscribePurchaseCompleted({
              trigger: 'daily_story_rewind',
              plan: 'yearly', // TODO: imperative API doesn't return purchased plan; update if monthly added
            });
          } else {
            analyticsService.trackSubscribeRestoreSuccess({
              trigger: 'daily_story_rewind',
            });
          }

          // Unlock the gated date immediately
          const dateStr = toLocalDateString(date);
          AppLogger.info('subscription', `Unlocking content for: ${dateStr}`);
          const historicalQuest = await fetchQuestByDate(dateStr);
          setSelectedDate(date);
          setIsHistoricalView(true);
          setDisplayedQuest(historicalQuest);
          break;
        }

        case PAYWALL_RESULT.CANCELLED:
          AppLogger.info('subscription', 'Paywall cancelled');
          analyticsService.trackSubscribePurchaseCancelled({
            trigger: 'daily_story_rewind',
          });
          break;

        case PAYWALL_RESULT.NOT_PRESENTED:
          AppLogger.warn('subscription', 'Paywall not presented (no offerings or config issue)', { result });
          analyticsService.trackSubscribePurchaseFailed({
            trigger: 'daily_story_rewind',
            error_code: 'NOT_PRESENTED',
          });
          break;

        case PAYWALL_RESULT.ERROR:
          AppLogger.error('subscription', 'Paywall error', { result });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          analyticsService.trackSubscribePurchaseFailed({
            trigger: 'daily_story_rewind',
            error_code: 'ERROR',
          });
          break;
      }
    } catch (error) {
      AppLogger.error('subscription', 'Error presenting paywall', { trigger: 'daily_story_rewind' }, error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      analyticsService.trackSubscribePurchaseFailed({
        trigger: 'daily_story_rewind',
        error_code: error instanceof Error ? error.message : 'unknown',
      });
    } finally {
      isPaywallPresentedRef.current = false;
    }
  };

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
  }, [isSubscribed, isSubscriptionLoading, isHistoricalView, todayQuest]);

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

  // Track completion state for each section (per quest ID via AsyncStorage)
  const [watchCompleted, setWatchCompleted] = useState(false);
  const [exploreCompleted, setExploreCompleted] = useState(false);
  const [questCompleted, setQuestCompleted] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  // Live Activity — cache quiz results for XP plumbing to Live Activity completion
  const lastQuizCorrectAnswersRef = useRef(0);

  // Guard: streak starts as 0 before cloud hydration — don't expose pre-hydration value
  const isStreakHydrated = streak > 0;
  const streakRef = useRef(streak);
  useEffect(() => { streakRef.current = streak; }, [streak]);

  // Load progress from AsyncStorage when quest changes
  useEffect(() => {
    // CRITICAL: Reset state IMMEDIATELY when quest changes (synchronous)
    // This prevents showing stale progress from previous date during async load
    setIsLoadingProgress(true);
    setWatchCompleted(false);
    setExploreCompleted(false);
    setQuestCompleted(false);

    const loadProgress = async () => {
      // When viewing historical date with no content, don't fall back to today's quest
      if (isHistoricalView && !displayedQuest) {
        console.log(
          "📅 [Today] Historical date with no content - keeping progress at 0%",
        );
        setIsLoadingProgress(false);
        return;
      }

      const currentQuestId = displayedQuest?.id || todayQuest?.id;
      if (!currentQuestId) {
        setIsLoadingProgress(false);
        return;
      }

      try {
        // PRIMARY: Load all progress from Supabase (watch, explore, quiz)
        if (user?.id) {
          const { data, error } = await supabase
            .from("user_daily_quest_progress")
            .select("*")
            .eq("user_id", user.id)
            .eq("daily_quest_id", currentQuestId)
            .maybeSingle();

          if (error) {
            console.warn("⚠️ [Today] Supabase query error:", error.message);
          }

          if (data) {
            // Load from Supabase (single source of truth)
            const watchDone = !!data.watch_completed;
            const exploreDone = !!data.explore_completed;
            // Quiz is only completed if score > 0 (not just if the field exists)
            const quizDone =
              data.score !== undefined && data.score !== null && data.score > 0;

            setWatchCompleted(watchDone);
            setExploreCompleted(exploreDone);
            setQuestCompleted(quizDone);

            console.log(
              `✅ [Today] Loaded progress from Supabase for ${currentQuestId}:`,
              {
                watch: watchDone,
                explore: exploreDone,
                quiz: quizDone,
                score: data.score,
              },
            );

            // BACKUP: Cache to AsyncStorage for offline access
            const key = `@today_progress_${currentQuestId}`;
            await AsyncStorage.setItem(
              key,
              JSON.stringify({
                watch: !!data.watch_completed,
                explore: !!data.explore_completed,
                completedDate: data.created_at || null,
              }),
            );
            return;
          }
        }

        // FALLBACK: If Supabase has no data or user not logged in, try AsyncStorage
        const key = `@today_progress_${currentQuestId}`;
        const stored = await AsyncStorage.getItem(key);

        if (stored) {
          const progress = JSON.parse(stored);
          const watchDone = progress.watch || false;
          const exploreDone = progress.explore || false;

          setWatchCompleted(watchDone);
          setExploreCompleted(exploreDone);

          console.log(
            `📖 [Today] Loaded progress from AsyncStorage (offline) for ${currentQuestId}:`,
            progress,
          );
        }
        // Note: If no stored data anywhere, state already reset to false at useEffect start
      } catch (error) {
        console.error("❌ [Today] Error loading progress:", error);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [
    displayedQuest?.id,
    todayQuest?.id,
    user?.id,
    isHistoricalView,
    displayedQuest,
  ]);

  // Save watch/explore progress to Supabase (with AsyncStorage backup)
  const saveProgress = async (section: "watch" | "explore") => {
    const currentQuestId = displayedQuest?.id || todayQuest?.id;
    if (!currentQuestId || !user?.id) {
      console.warn(
        "⚠️ [Today] Cannot save progress - missing quest ID or user",
      );
      return;
    }

    try {
      const fieldName =
        section === "watch" ? "watch_completed" : "explore_completed";

      // PRIMARY: Save to Supabase using upsert
      const { error: upsertError } = await supabase
        .from("user_daily_quest_progress")
        .upsert(
          {
            user_id: user.id,
            daily_quest_id: currentQuestId,
            [fieldName]: true,
            // Provide defaults for NOT NULL fields when creating new row
            score: 0,
            correct_answers: 0,
            total_questions: 0,
          },
          {
            onConflict: "user_id,daily_quest_id",
            ignoreDuplicates: false, // Update existing row
          },
        );

      if (upsertError) {
        console.error(
          `❌ [Today] Supabase upsert error for ${section}:`,
          upsertError,
        );
      } else {
        console.log(
          `✅ [Today] Saved ${section} completion to Supabase for ${currentQuestId}`,
        );
      }

      // BACKUP: Save to AsyncStorage for offline access
      const key = `@today_progress_${currentQuestId}`;
      const stored = await AsyncStorage.getItem(key);
      const existing = stored ? JSON.parse(stored) : {};

      const current = {
        watch: section === "watch" ? true : existing.watch || false,
        explore: section === "explore" ? true : existing.explore || false,
        completedDate: existing.completedDate || null,
      };

      await AsyncStorage.setItem(key, JSON.stringify(current));
      console.log(
        `💾 [Today] Cached ${section} completion to AsyncStorage for ${currentQuestId}`,
      );
    } catch (error) {
      console.error("❌ [Today] Error saving progress:", error);
    }
  };

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

  // Calculate progress percentage based on actual completion
  const calculateProgress = () => {
    // During loading transition, always show 0% to prevent flash of old progress
    if (isLoadingProgress) return 0;

    let completed = 0;
    if (watchCompleted) completed++;
    if (exploreCompleted) completed++;
    if (questCompleted) completed++; // Only use questCompleted (loaded per date from Supabase)
    return Math.round((completed / 3) * 100);
  };

  // SEQUENTIAL UNLOCK LOGIC:
  // - WATCH: Always available
  // - EXPLORE: Unlocked after WATCH completed
  // - QUIZ: Unlocked after EXPLORE completed
  const isExploreUnlocked = watchCompleted;
  const isQuizUnlocked = watchCompleted && exploreCompleted;

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

  const progress = calculateProgress();

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
            {/* Completion Banner - Shows when quest is completed, allows replay */}
            {/* {isCompleted && (
          <View
            style={{
              backgroundColor: ArchivesTheme.colors.persianOrange,
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                }}
              >
                <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#FFFFFF",
                    marginBottom: 4,
                  }}
                >
                  Quest Complete! 🎉
                </Text>
                <Text
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 14,
                    fontWeight: "400",
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  {questProgress?.score !== undefined
                    ? `Best score: ${questProgress.score}%`
                    : "Great job today!"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={async () => {
                // Clear AsyncStorage progress
                const currentQuestId = displayedQuest?.id || todayQuest?.id;
                if (currentQuestId) {
                  const key = `@today_progress_${currentQuestId}`;
                  await AsyncStorage.removeItem(key);
                  console.log(`🗑️ [Today] Cleared progress for ${currentQuestId}`);
                }
                // Clear celebration shown flag for testing
                await AsyncStorage.removeItem('@daily_story_end_shown_date');
                console.log('🗑️ [Today] Cleared daily story end celebration flag');
                // Reset state
                setWatchCompleted(false);
                setExploreCompleted(false);
                setQuestCompleted(false);
                openModal('video');
              }}
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: "rgba(255,255,255,0.4)",
              }}
            >
              <Text
                style={{
                  fontFamily: "DM Sans",
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#FFFFFF",
                }}
              >
                Replay
              </Text>
            </TouchableOpacity>
          </View>
        )} */}

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
