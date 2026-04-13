// Daily Quest Tab - New card-based design with expandable sections
// Features: Calendar week view, progress tracker, three content cards (WATCH, EXPLORE, QUESTIONS)

import TodayScrollableLesson from "@/components/lessons/today/TodayScrollableLesson";
import TodayVideoLesson from "@/components/lessons/today/TodayVideoLesson";
import Quiz from "@/components/quiz/Quiz";
import type { ContentBlock, ContentItem } from "@/components/shared/types";
import ArchivesTheme from "@/constants/ArchivesTheme";
import { toLocalDateString } from "@/utils/dateUtils";
import {
  useAI,
  useGamificationOrchestrator,
} from "@/gamification";
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
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";

// Theme styles
const themeStyles = ArchivesTheme.common.today;

// Streak icon (flame) - accepts color prop for different contexts - OUTLINED version from assets/images/icons/streak.svg
const StreakIcon = ({
  size = 14,
  color = ArchivesTheme.colors.persianOrange,
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      fill={color}
      d="M240-400q0 52 21 98.5t60 81.5q-1-5-1-9v-9q0-32 12-60t35-51l113-111 113 111q23 23 35 51t12 60v9q0 4-1 9 39-35 60-81.5t21-98.5q0-50-18.5-94.5T648-574q-20 13-42 19.5t-45 6.5q-62 0-107.5-41T401-690q-39 33-69 68.5t-50.5 72Q261-513 250.5-475T240-400Zm240 52-57 56q-11 11-17 25t-6 29q0 32 23.5 55t56.5 23q33 0 56.5-23t23.5-55q0-16-6-29.5T537-292l-57-56Zm0-492v132q0 34 23.5 57t57.5 23q18 0 33.5-7.5T622-658l18-22q74 42 117 117t43 163q0 134-93 227T480-80q-134 0-227-93t-93-227q0-129 86.5-245T480-840Z"
    />
  </Svg>
);

// Calendar-specific icons - from assets/images/icons
const CalendarFlameIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      fill="#FFFFFF"
      d="M160-400q0-113 67-217t184-182q22-15 45.5-1.5T480-760v52q0 34 23.5 57t57.5 23q17 0 32.5-7.5T621-657q8-10 20.5-12.5T665-664q63 45 99 115t36 149q0 88-43 160.5T644-125q17-24 26.5-52.5T680-238q0-40-15-75.5T622-377L480-516 339-377q-29 29-44 64t-15 75q0 32 9.5 60.5T316-125q-70-42-113-114.5T160-400Zm320-4 85 83q17 17 26 38t9 45q0 49-35 83.5T480-120q-50 0-85-34.5T360-238q0-23 9-44.5t26-38.5l85-83Z"
    />
  </Svg>
);

const CalendarLockIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      fill="#FFFFFF"
      d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm240-200q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z"
    />
  </Svg>
);

// ============================================================================
// TYPES & INTERFACES (from useToday.ts)
// ============================================================================

interface Card1Content {
  content_type: "reel" | "video_carousel" | "image_carousel";
  title: string;
  media_url: string | string[]; // Single URL for reel, array for carousels
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
    pauseCelebrationQueue,
    resumeCelebrationQueue,
  } = useGamificationOrchestrator();
  const { openChatToLearn, isChatOpen } = useAI();
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

  const [expandedCard, setExpandedCard] = useState<
    "watch" | "explore" | "questions" | null
  >(null);

  // Animated values for card heights using reanimated
  const watchCardHeight = useSharedValue(80);
  const exploreCardHeight = useSharedValue(61);
  const questionsCardHeight = useSharedValue(61);

  // Animated values for expanded content opacity (smooth fade-in)
  const watchExpandOpacity = useSharedValue(0);
  const exploreExpandOpacity = useSharedValue(0);
  const questionsExpandOpacity = useSharedValue(0);

  // Animate card expansions with smooth spring (no bounce, fluid motion)
  useEffect(() => {
    if (expandedCard === "watch") {
      watchCardHeight.value = withSpring(140, {
        damping: 30,
        stiffness: 200,
        overshootClamping: true,
        mass: 1,
      });
      watchExpandOpacity.value = withTiming(1, { duration: 300 });
    } else {
      watchCardHeight.value = withSpring(80, {
        damping: 30,
        stiffness: 200,
        overshootClamping: true,
        mass: 1,
      });
      watchExpandOpacity.value = withTiming(0, { duration: 200 });
    }

    if (expandedCard === "explore") {
      exploreCardHeight.value = withSpring(151, {
        damping: 30,
        stiffness: 200,
        overshootClamping: true,
        mass: 1,
      });
      exploreExpandOpacity.value = withTiming(1, { duration: 300 });
    } else {
      exploreCardHeight.value = withSpring(61, {
        damping: 30,
        stiffness: 200,
        overshootClamping: true,
        mass: 1,
      });
      exploreExpandOpacity.value = withTiming(0, { duration: 200 });
    }

    if (expandedCard === "questions") {
      questionsCardHeight.value = withSpring(151, {
        damping: 30,
        stiffness: 200,
        overshootClamping: true,
        mass: 1,
      });
      questionsExpandOpacity.value = withTiming(1, { duration: 300 });
    } else {
      questionsCardHeight.value = withSpring(61, {
        damping: 30,
        stiffness: 200,
        overshootClamping: true,
        mass: 1,
      });
      questionsExpandOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [expandedCard]);

  // Single enum state for modal management (prevents flicker during transitions)
  type ModalState = "none" | "video" | "reading" | "quiz";
  const [activeModal, setActiveModal] = useState<ModalState>("none");
  const [previousModal, setPreviousModal] = useState<ModalState>("none");
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null);

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

  // Open AI chat after quiz modal fully unmounts (fixes modal-on-modal on iOS)
  useEffect(() => {
    if (activeModal === "none" && pendingChatMessage) {
      requestAnimationFrame(() => {
        openChatToLearn(pendingChatMessage);
        setPendingChatMessage(null);
      });
    }
  }, [activeModal, pendingChatMessage, openChatToLearn]);

  // Resume celebration queue only on true→false transition (not on initial mount)
  // Delay 500ms to let AIChatModal dismiss animation complete before presenting celebration
  const wasChatOpenRef = useRef(false);
  useEffect(() => {
    if (wasChatOpenRef.current && !isChatOpen) {
      const timer = setTimeout(() => resumeCelebrationQueue(), 500);
      wasChatOpenRef.current = false;
      return () => clearTimeout(timer);
    }
    wasChatOpenRef.current = isChatOpen;
  }, [isChatOpen, resumeCelebrationQueue]);

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

  // Animation for iOS Calendar-style week transitions
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  // Responsive calendar dimensions based on screen width
  const calendarDimensions = useMemo(() => {
    // Container takes 95% of screen width, max 370px, min for small screens
    const containerWidth = Math.min(Math.max(SCREEN_WIDTH * 0.95, 280), 370);
    const containerPadding = 16; // padding on each side
    const innerWidth = containerWidth - containerPadding * 2;

    // Calculate day width and margin to fit 7 days in inner width
    // Formula: 7 * dayWidth + 6 * dayMargin = innerWidth
    // Use ratio: dayMargin ≈ 0.3 * dayWidth (keeps proportions nice)
    // 7 * dayWidth + 6 * 0.3 * dayWidth = innerWidth
    // 7 * dayWidth + 1.8 * dayWidth = innerWidth
    // 8.8 * dayWidth = innerWidth
    const dayWidth = Math.floor(innerWidth / 8.8);
    const dayMargin = Math.floor((innerWidth - 7 * dayWidth) / 6);

    // Recalculate exact week width with integer values
    const weekWidth = dayWidth * 7 + dayMargin * 6;
    const scrollDistance = weekWidth + dayMargin;

    return {
      containerWidth,
      containerPadding,
      dayWidth,
      dayMargin,
      weekWidth,
      scrollDistance,
    };
  }, [SCREEN_WIDTH]);

  // Initialize translation (will be updated in useEffect when dimensions are ready)
  const translateX = useSharedValue(-350);
  const startX = useSharedValue(0);

  // Update translateX when responsive dimensions change
  useEffect(() => {
    translateX.value = -calendarDimensions.scrollDistance;
  }, [calendarDimensions.scrollDistance]);

  // ScrollView ref for calendar horizontal scrolling
  const calendarScrollRef = useRef<ScrollView>(null);

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

  // Extract responsive calendar dimensions
  const {
    dayWidth,
    dayMargin,
    weekWidth,
    scrollDistance,
    containerWidth,
    containerPadding,
  } = calendarDimensions;

  // Snap positions: 0 = previous week visible, -scrollDistance = current week visible
  const POSITION_PREV_WEEK = 0;
  const POSITION_CURRENT_WEEK = -scrollDistance;

  // Rubber band resistance factor (0.3 = 30% of finger movement past edge)
  const RUBBER_BAND_FACTOR = 0.3;

  // Gesture handler for continuous scroll with snap and rubber band edges
  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      const newX = startX.value + event.translationX;

      // Apply rubber band resistance when past edges (iOS-style overscroll)
      if (newX > POSITION_PREV_WEEK) {
        // Overscrolling right past previous week - show blank space with resistance
        const overscroll = newX - POSITION_PREV_WEEK;
        translateX.value = POSITION_PREV_WEEK + overscroll * RUBBER_BAND_FACTOR;
      } else if (newX < POSITION_CURRENT_WEEK) {
        // Overscrolling left past current week - show blank space with resistance
        const overscroll = POSITION_CURRENT_WEEK - newX;
        translateX.value =
          POSITION_CURRENT_WEEK - overscroll * RUBBER_BAND_FACTOR;
      } else {
        // Within bounds - normal 1:1 finger tracking
        translateX.value = newX;
      }
    })
    .onEnd((event) => {
      // Determine which week to snap to based on:
      // 1. Current position (which week is more visible)
      // 2. Swipe velocity (quick flicks override position)

      const velocityThreshold = 500;
      const midPoint = POSITION_CURRENT_WEEK / 2; // halfway point (responsive)

      let targetPosition: number;

      // If past edges, always snap back to nearest valid position
      if (translateX.value > POSITION_PREV_WEEK) {
        targetPosition = POSITION_PREV_WEEK;
      } else if (translateX.value < POSITION_CURRENT_WEEK) {
        targetPosition = POSITION_CURRENT_WEEK;
      } else if (Math.abs(event.velocityX) > velocityThreshold) {
        // Quick flick - snap based on direction
        targetPosition =
          event.velocityX > 0 ? POSITION_PREV_WEEK : POSITION_CURRENT_WEEK;
      } else {
        // Slow drag - snap to nearest week
        targetPosition =
          translateX.value > midPoint
            ? POSITION_PREV_WEEK
            : POSITION_CURRENT_WEEK;
      }

      // Animate to snap position with spring
      translateX.value = withSpring(targetPosition, {
        damping: 20,
        stiffness: 150,
        mass: 0.8,
        overshootClamping: false,
      });
    });

  // Animated style for calendar week transitions
  const calendarAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Animated styles for card expansions
  const watchAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: watchCardHeight.value,
      marginBottom: 7,
    };
  });

  const exploreAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: exploreCardHeight.value,
      marginBottom: 7,
    };
  });

  const questionsAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: questionsCardHeight.value,
      marginBottom: 16,
    };
  });

  // Animated styles for expanded content (fade-in effect)
  const watchExpandedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: watchExpandOpacity.value,
    };
  });

  const exploreExpandedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: exploreExpandOpacity.value,
    };
  });

  const questionsExpandedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: questionsExpandOpacity.value,
    };
  });

  // Scroll to show current week on mount with today visible
  useEffect(() => {
    // Calculate scroll position to show today in visible area
    // Each day: 48px width + 12px spacing = 60px per day
    const dayWithSpacing = 48 + 12;

    // Get today's day of week (0 = Sunday, 6 = Saturday)
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Calculate position: skip previous week (7 days) + days before today in current week
    const daysToSkip = 7 + dayOfWeek;
    const scrollToPosition = dayWithSpacing * daysToSkip;

    // Scroll after layout settles
    const timer = setTimeout(() => {
      calendarScrollRef.current?.scrollTo({
        x: scrollToPosition,
        animated: false, // Instant on mount
      });
    }, 150); // Slightly longer delay for layout

    return () => clearTimeout(timer);
  }, []);

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

  // Handle voice change and save to Supabase
  // Get 14 days for continuous horizontal scrolling (last week + current week)
  const getWeekDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStart = new Date(today); // Keep original today for comparison
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const dates = [];

    // Start from beginning of previous week (14 days total)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek - 7); // Go back to Sunday of last week

    // Use completed dates from Supabase (cached in state)
    const completedDates = completedDatesCache || new Set<string>();

    console.log("📅 [Calendar] Week view (completion-based):", {
      completedDates: Array.from(completedDates),
      today: toLocalDateString(today),
    });

    // Generate 14 days (previous week + current week for continuous scrolling)
    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStart = new Date(date.setHours(0, 0, 0, 0));
      const dateString = toLocalDateString(dateStart);
      const isToday = dateStart.getTime() === todayStart.getTime();
      const isPast = dateStart < todayStart;
      const isFuture = dateStart > todayStart;

      // Check if this day's quest was completed using the Set
      const isCompleted = completedDates.has(dateString);

      // Missed = past date that was not completed (lock icon)
      const isMissed = isPast && !isCompleted;

      // Calculate day of week for this date
      const dayIndex = date.getDay(); // 0 = Sunday, 6 = Saturday

      dates.push({
        day: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][dayIndex],
        date: date.getDate(),
        dateObj: dateStart,
        isToday,
        isCompleted,
        isMissed,
        isFuture,
      });
    }

    return dates;
  };

  // Track completion state for each section (per quest ID via AsyncStorage)
  const [watchCompleted, setWatchCompleted] = useState(false);
  const [exploreCompleted, setExploreCompleted] = useState(false);
  const [questCompleted, setQuestCompleted] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  // Live Activity — cache quiz results for XP plumbing to Live Activity completion
  const lastQuizCorrectAnswersRef = useRef(0);

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
  const updateDailyStoryIfActive = useCallback((cards: {
    watchCompleted: boolean;
    exploreCompleted: boolean;
    questionsCompleted: boolean;
  }) => {
    if (!liveActivityManager.isDailyStoryActive) return;
    liveActivityManager.updateDailyStoryProgress({
      ...cards,
      currentStreak: streak,
    }).catch((err) => {
      AppLogger.error('gamification', 'DailyStory Live Activity update failed', {}, err as Error);
    });
  }, [streak]);

  // Live Activity — start DailyStory on first Today tab open of the day
  // Specs: starts when user opens Today tab, once per day, only if quest incomplete
  useFocusEffect(
    useCallback(() => {
      if (!todayQuest) return;

      // Don't start if quest is already fully completed
      if (questCompleted && watchCompleted && exploreCompleted) return;

      const today = toLocalDateString(new Date());
      if (todayQuest.date !== today) return;

      liveActivityManager.startDailyStoryActivity({
        storyId: todayQuest.id,
        storyTitle: todayQuest.content.today_title,
        dayNumber: todayQuest.content.day_number,
        totalDays: todayQuest.content.total_days,
        currentStreak: streak,
        watchCompleted,
        exploreCompleted,
        questionsCompleted: questCompleted,
      }).catch((err) => {
        AppLogger.error('gamification', 'DailyStory Live Activity start failed', {}, err as Error);
      });
    }, [todayQuest, questCompleted, watchCompleted, exploreCompleted, streak])
  );

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

  const weekDates = getWeekDates();
  const progress = calculateProgress();

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
      const mediaUrls = Array.isArray(card1.media_url)
        ? card1.media_url
        : [card1.media_url];

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
            onChatToLearn={(msg) => {
              pauseCelebrationQueue();
              setPendingChatMessage(msg);
              closeModal();
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
        {/* Header with Title and Streak */}
        <View style={themeStyles.headerTop}>
          <View style={themeStyles.headerLeft}>
            <Text style={themeStyles.headerTitle}>
              {(() => {
                // When viewing historical date with no content, use selectedDate
                if (isHistoricalView && !displayedQuest) {
                  const day = selectedDate.getDate();
                  const month = selectedDate.toLocaleDateString("en-US", {
                    month: "short",
                  });
                  return `${day} ${month}'s Story`;
                }

                const currentQuest = displayedQuest || todayQuest;
                if (!currentQuest?.date) return "Today's Story";

                const today = toLocalDateString(new Date());
                if (currentQuest.date === today) return "Today's Story";

                // Historical date: format as "2 Feb's Story"
                const questDate = new Date(currentQuest.date + "T00:00:00");
                const day = questDate.getDate();
                const month = questDate.toLocaleDateString("en-US", {
                  month: "short",
                });
                return `${day} ${month}'s Story`;
              })()}
            </Text>
          </View>
          <TouchableOpacity
            style={themeStyles.streakInline}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              showStreakCelebration();
            }}
            activeOpacity={0.7}
          >
            <StreakIcon size={24} />
            <Text style={themeStyles.streakText}>{streak} </Text>
            <Text style={themeStyles.streakText}>
              {streak === 1 ? "day" : "days"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subtitle: Day X of 7 - Story Title */}
        {(displayedQuest || todayQuest) && (
          <View style={{ marginTop: 8, marginBottom: 8 }}>
            <Text
              style={{
                fontFamily: "DM Sans",
                fontSize: 18,
                color: ArchivesTheme.colors.shoeBrown,
              }}
            >
              <Text style={{ fontWeight: "700" }}>
                Day {(displayedQuest || todayQuest)?.content.day_number}
              </Text>
              <Text
                style={{
                  fontWeight: "600",
                  color: ArchivesTheme.colors.tweedBeige,
                }}
              >
                {" "}
                of {(displayedQuest || todayQuest)?.content.total_days} -{" "}
              </Text>
              <Text style={{ fontWeight: "700" }}>
                {(displayedQuest || todayQuest)?.content?.today_title}
              </Text>
            </Text>
          </View>
        )}

        {/* Calendar Week View - Week-wise navigation with swipe gestures */}
        {/* Outer container has responsive width to show exactly 7 days */}
        <View
          style={{
            marginTop: 12,
            marginBottom: 12,
            backgroundColor: "#41425E",
            borderRadius: 16,
            paddingTop: 20,
            paddingBottom: 10,
            paddingHorizontal: containerPadding,
            overflow: "hidden", // Clip dates as they slide in/out
            alignSelf: "center",
            width: containerWidth, // Responsive: 95% of screen, max 370px
          }}
        >
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                {
                  flexDirection: "row",
                  // Removed justifyContent and paddingHorizontal - translateX handles positioning
                  paddingBottom: 10,
                },
                calendarAnimatedStyle,
              ]}
            >
              {/* Render all 14 days - viewport shows 7, gesture scrolls between weeks */}
              {weekDates.map((item, index) => {
                // Check if this date is currently selected
                const isSelected =
                  toLocalDateString(selectedDate) ===
                  toLocalDateString(item.dateObj);

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      themeStyles.calendarDay,
                      {
                        width: dayWidth, // Responsive width
                        marginRight: index < 13 ? dayMargin : 0, // Responsive spacing
                        overflow: "visible", // Allow lock icon to extend beyond bounds
                        zIndex: isSelected ? 1000 : 1, // Much higher z-index for selected date
                        elevation: isSelected ? 1000 : 1, // Android z-index equivalent
                      },
                    ]}
                    onPress={() =>
                      !item.isFuture && handleDateClick(item.dateObj)
                    }
                    disabled={item.isFuture}
                    activeOpacity={0.7}
                  >
                    <Text style={themeStyles.calendarDayLabel}>{item.day}</Text>
                    <View
                      style={[
                        themeStyles.calendarDateCircle,
                        item.isCompleted && {
                          backgroundColor: ArchivesTheme.colors.persianOrange,
                        },
                        item.isMissed && {
                          backgroundColor: "#B8AA92",
                        },
                        item.isFuture && { backgroundColor: "#222446" },
                        // All other past/present days without selection
                        !isSelected &&
                          !item.isFuture &&
                          !item.isCompleted &&
                          !item.isMissed && {
                            backgroundColor: "#222446",
                          },
                        // Show moss green border for ANY selected date - slightly bigger
                        // This comes last to override any previous border settings
                        isSelected && {
                          borderWidth: 2,
                          borderColor: "#f4ebdb",
                          // borderColor: ArchivesTheme.colors.mossGreen,
                          transform: [{ scale: 1.08 }], // Slightly bigger (8% increase)
                        },
                        // item.isToday &&
                        //   item.isCompleted && {
                        //     transform: [{ scale: 1.1 }],
                        //     shadowColor: ArchivesTheme.colors.persianOrange,
                        //     shadowOpacity: 0.5,
                        //     shadowRadius: 8,
                        //     shadowOffset: { width: 0, height: 2 },
                        //     elevation: 4,
                        //   },
                      ]}
                    >
                      {item.isCompleted ? (
                        // Completed day: Show white flame icon
                        <CalendarFlameIcon size={20} />
                      ) : (
                        // All days (missed, today, future, past): Show date number
                        <Text
                          style={{
                            fontFamily: "DM Sans",
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#FFFFFF",
                          }}
                        >
                          {item.date}
                        </Text>
                      )}
                    </View>
                    {/* Lock icon overlapping with bottom circumference for missed days (only for non-subscribers) */}
                    {item.isMissed && !isSubscribed && (
                      <View
                        style={{
                          position: "absolute",
                          bottom: -6,
                          alignSelf: "center",
                          zIndex: 10,
                        }}
                      >
                        <CalendarLockIcon size={14} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Progress Tracker */}
        <View style={themeStyles.progressContainer}>
          <View style={themeStyles.progressHeader}>
            <Text style={themeStyles.progressLabel}>
              {(() => {
                // When viewing historical date with no content, use selectedDate
                if (isHistoricalView && !displayedQuest) {
                  const day = selectedDate.getDate();
                  const month = selectedDate.toLocaleDateString("en-US", {
                    month: "short",
                  });
                  return `${day} ${month}'s progress`;
                }

                const currentQuest = displayedQuest || todayQuest;
                if (!currentQuest?.date) return "Progress today";

                const today = toLocalDateString(new Date());
                if (currentQuest.date === today) return "Progress today";

                // Historical date: format as "2 Feb's progress"
                const questDate = new Date(currentQuest.date + "T00:00:00");
                const day = questDate.getDate();
                const month = questDate.toLocaleDateString("en-US", {
                  month: "short",
                });
                return `${day} ${month}'s progress`;
              })()}
            </Text>
            <Text style={themeStyles.progressPercentage}>{progress}%</Text>
          </View>
          <View style={themeStyles.progressBarBackground}>
            <View
              style={[themeStyles.progressBarFill, { width: `${progress}%` }]}
            />
          </View>
        </View>

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

            {/* WATCH Card */}
            <Animated.View style={watchAnimatedStyle}>
            <TouchableOpacity
              style={[
                themeStyles.cardWatch,
                { height: '100%' },
              ]}
              onPress={() =>
                setExpandedCard(expandedCard === "watch" ? null : "watch")
              }
              activeOpacity={0.9}
            >
              {/* Background Image */}
              {(() => {
                const card1 = (displayedQuest || todayQuest)?.content?.card1;
                if (!card1) return null;

                // Get first media URL if array, otherwise use as-is
                const thumbnailUri = card1.thumbnail_url ||
                  (Array.isArray(card1.media_url) ? card1.media_url[0] : card1.media_url);

                if (!thumbnailUri) return null;

                return (
                  <Image
                    source={{ uri: thumbnailUri }}
                    style={themeStyles.cardWatchBackground}
                    contentFit="cover"
                  />
                );
              })()}

              {/* Dark Overlay */}
              <LinearGradient
                colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.8)"]}
                style={themeStyles.cardWatchOverlay}
              />
              {/* Content */}
              <View style={themeStyles.cardWatchContent}>
                <View style={themeStyles.cardHeader}>
                  {/* Green Start button on LEFT when collapsed, Title when expanded */}
                  {!expandedCard || expandedCard !== "watch" ? (
                    <TouchableOpacity
                      style={themeStyles.cardWatchButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (
                          (displayedQuest || todayQuest)?.content.card1
                            .media_url
                        ) {
                          openModal("video");
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="play-outline"
                        size={16}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={themeStyles.cardWatchButtonText}>Start</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text
                      style={[
                        themeStyles.cardWatchSubtitle,
                        { flex: 1, marginRight: 12 },
                      ]}
                    >
                      {(displayedQuest || todayQuest)?.content.card1.title}
                    </Text>
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {/* Show duration when collapsed */}
                    {expandedCard !== "watch" && (
                      <Text style={themeStyles.cardDuration}>
                        {watchCompleted ? "DONE" : "2 MIN"}
                      </Text>
                    )}
                    <Ionicons
                      name={
                        expandedCard === "watch" ? "chevron-up" : "chevron-down"
                      }
                      size={28}
                      color="#FFFFFF"
                    />
                  </View>
                </View>

                <Animated.View style={[watchExpandedContentStyle, {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  marginTop: 8,
                  gap: 8,
                }]}>
                  <Text style={themeStyles.cardDuration}>
                    {watchCompleted ? "DONE" : "2 MIN"}
                  </Text>
                  <TouchableOpacity
                    style={themeStyles.cardWatchButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (
                        (displayedQuest || todayQuest)?.content.card1
                          .media_url
                      ) {
                        openModal("video");
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="play-outline"
                      size={16}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={themeStyles.cardWatchButtonText}>Start</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </TouchableOpacity>
            </Animated.View>

            {/* EXPLORE Card */}
            <Animated.View style={exploreAnimatedStyle}>
            <TouchableOpacity
              style={[themeStyles.cardExplore, { height: '100%' }]}
              onPress={() =>
                setExpandedCard(expandedCard === "explore" ? null : "explore")
              }
              activeOpacity={0.8}
            >
              <View style={themeStyles.cardHeader}>
                <View style={themeStyles.cardHeaderLeft}>
                  <Ionicons name="book-outline" size={20} color="#FFFFFF" />
                  <Text style={themeStyles.cardTitle}>Explore</Text>
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text style={themeStyles.cardDuration}>
                    {exploreCompleted ? "DONE" : "1 MIN"}
                  </Text>
                  <Ionicons
                    name={
                      expandedCard === "explore" ? "chevron-up" : "chevron-down"
                    }
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
              </View>

              <Animated.View style={exploreExpandedContentStyle}>
                <Text style={themeStyles.cardSubtitle}>
                  {
                    (displayedQuest || todayQuest)?.content?.card2
                      ?.thumbnail_title
                  }
                </Text>
                <TouchableOpacity
                  style={themeStyles.cardActionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (isExploreUnlocked) {
                      openModal("reading");
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "white",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={ArchivesTheme.colors.mutedNavy}
                      style={{ transform: [{ rotate: "-45deg" }] }}
                    />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </TouchableOpacity>
            </Animated.View>

            {/* QUESTIONS Card */}
            <Animated.View style={questionsAnimatedStyle}>
            <TouchableOpacity
              style={[themeStyles.cardQuestions, { height: '100%' }]}
              onPress={() =>
                setExpandedCard(
                  expandedCard === "questions" ? null : "questions",
                )
              }
              activeOpacity={0.8}
            >
              <View style={themeStyles.cardHeader}>
                <View style={themeStyles.cardHeaderLeft}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={ArchivesTheme.colors.shoeBrown}
                  />
                  <Text
                    style={[
                      themeStyles.cardTitle,
                      { color: ArchivesTheme.colors.shoeBrown },
                    ]}
                  >
                    Questions
                  </Text>
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text
                    style={[
                      themeStyles.cardDuration,
                      { color: ArchivesTheme.colors.shoeBrown },
                    ]}
                  >
                    {questCompleted ? "DONE" : "2 MIN"}
                  </Text>
                  <Ionicons
                    name={
                      expandedCard === "questions"
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={20}
                    color={ArchivesTheme.colors.shoeBrown}
                  />
                </View>
              </View>

              <Animated.View style={questionsExpandedContentStyle}>
                <Text
                  style={[
                    themeStyles.cardSubtitle,
                    { color: ArchivesTheme.colors.shoeBrown },
                  ]}
                >
                  Test your knowledge
                </Text>
                <TouchableOpacity
                  style={themeStyles.cardActionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (isQuizUnlocked) {
                      openModal("quiz");
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "white",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={ArchivesTheme.colors.shoeBrown}
                      style={{ transform: [{ rotate: "-45deg" }] }}
                    />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </TouchableOpacity>
            </Animated.View>

            {/* Bottom Spacing for fixed button */}
            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* Start My Day Button - Fixed at Bottom with 3D depth effect */}
      {!(isHistoricalView && !displayedQuest) && (
        <View style={themeStyles.bottomButtonContainer}>
          {/* Shadow layer for 3D effect */}
          <View style={themeStyles.startButtonShadow} />
          {/* Main button */}
          <TouchableOpacity
            style={themeStyles.startButton}
            onPress={() => {
              if (progress === 100) {
                // Day Complete - reopen WATCH to replay
                openModal("video");
              } else if (!watchCompleted) {
                // Step 1: Open WATCH if not completed
                openModal("video");
              } else if (!exploreCompleted) {
                // Step 2: Open EXPLORE if WATCH done but EXPLORE not done
                openModal("reading");
              } else if (isQuizUnlocked) {
                // Step 3: Open QUIZ if both WATCH and EXPLORE done
                openModal("quiz");
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={themeStyles.startButtonText}>
              {progress === 100 ? "Day Complete!" : "Start My Day"}
            </Text>
          </TouchableOpacity>
        </View>
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
