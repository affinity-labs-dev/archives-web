// Daily Quest Tab - New card-based design with expandable sections
// Features: Calendar week view, progress tracker, three content cards (WATCH, EXPLORE, QUESTIONS)

import TodayScrollableLesson from "@/components/lessons/today/TodayScrollableLesson";
import TodayVideoLesson from "@/components/lessons/today/TodayVideoLesson";
import Quiz from "@/components/quiz/Quiz";
import type { ContentBlock, ContentItem } from "@/components/shared/types";
import ArchivesTheme from "@/constants/ArchivesTheme";
import {
  useGamificationOrchestrator,
  useGamifiedProgress,
} from "@/gamification";
import { supabase } from "@/hooks/lib/supabase";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

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
  content_type: "reel";
  title: string;
  media_url: string;
  thumbnail_url?: string; // Background thumbnail for WATCH card
  content: {
    reading_text: string;
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
  completed_at: string;
  score: number;
  correct_answers: number;
  total_questions: number;
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
      const todayDate = today.toISOString().split("T")[0];

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
        `💾 [useToday] Saving completion: ${correctAnswers}/${totalQuestions} (Score: ${score}%)`,
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
          `✅ [useToday] Keeping existing better score: ${existing.score}%`,
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
  const {
    streak,
    longestStreak,
    lastActiveBeforeUpdate,
    streakBeforeUpdate,
    reportTodayComplete,
  } = useGamificationOrchestrator();
  const { getStreak } = useGamifiedProgress();
  const {
    todayQuest,
    questProgress,
    loading,
    error,
    isCompleted,
    saveQuestCompletion,
  } = useToday(user?.id);
  const { width: contentWidth } = useWindowDimensions();

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

  // Single enum state for modal management (prevents flicker during transitions)
  type ModalState = "none" | "video" | "reading" | "quiz" | "calendar";
  const [activeModal, setActiveModal] = useState<ModalState>("none");

  // Week navigation and historical content viewing
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [displayedQuest, setDisplayedQuest] = useState<
    typeof todayQuest | null
  >(null);
  const [isHistoricalView, setIsHistoricalView] = useState(false);

  // Week navigation state (0 = current week, 1 = previous week)
  const [weekView, setWeekView] = useState<0 | 1>(0);

  // Swipe detection for week navigation
  const touchStartX = useRef<number>(0);

  // ScrollView ref for calendar horizontal scrolling
  const calendarScrollRef = useRef<ScrollView>(null);

  // Set displayedQuest when todayQuest loads (for current day)
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const selectedDateStr = selectedDate.toISOString().split("T")[0];

    if (todayQuest && selectedDateStr === today) {
      setDisplayedQuest(todayQuest);
      setIsHistoricalView(false);
    }
  }, [todayQuest, selectedDate]);

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

  // Handle StatusBar for fullscreen Explore modal
  useEffect(() => {
    if (activeModal === "reading") {
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
  }, [activeModal]);

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
    const dateStr = date.toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    console.log(`📅 [Today] Date clicked: ${dateStr}`);
    setSelectedDate(date);

    if (dateStr === today) {
      // Viewing current day
      console.log(`✅ [Today] Returning to current day`);
      setDisplayedQuest(todayQuest);
      setIsHistoricalView(false);
    } else {
      // Viewing historical day
      console.log(`📜 [Today] Loading historical content for ${dateStr}`);
      setIsHistoricalView(true);
      const historicalQuest = await fetchQuestByDate(dateStr);
      setDisplayedQuest(historicalQuest);
    }
  };

  // Handle swipe gestures for week navigation
  const handleTouchStart = (e: GestureResponderEvent) => {
    touchStartX.current = e.nativeEvent.pageX;
  };

  const handleTouchEnd = (e: GestureResponderEvent) => {
    const touchEndX = e.nativeEvent.pageX;
    const diff = touchStartX.current - touchEndX;
    const swipeThreshold = 30; // Reduced threshold for easier swipes

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left -> go to current week (only if currently on previous week)
        if (weekView === 1) {
          setWeekView(0);
        }
      } else {
        // Swipe right -> go to previous week (only if currently on current week)
        if (weekView === 0) {
          setWeekView(1);
        }
      }
    }
  };

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

    // Get full streak data from GamifiedProgress (includes longestStreakDate)
    const fullStreak = getStreak();
    const { longestStreakDate, lastActiveDate } = fullStreak;

    // Build a Set of all streak dates for efficient lookup
    const streakDates = new Set<string>();
    const missedDates = new Set<string>();

    // Check if we should show historical longest streak (when it's bigger than current)
    const useHistoricalStreak = longestStreak > streak;

    if (useHistoricalStreak && longestStreakDate) {
      console.log("📅 [Calendar] Using historical streak mode");

      // Add historical longest streak dates (e.g., 47 days ending Jan 24)
      const historicalEnd = new Date(longestStreakDate);
      historicalEnd.setHours(0, 0, 0, 0);

      for (let i = 0; i < longestStreak; i++) {
        const date = new Date(historicalEnd);
        date.setDate(historicalEnd.getDate() - i);
        streakDates.add(date.toISOString().split("T")[0]);
      }

      // Calculate current streak start date
      const currentStart = new Date(lastActiveDate);
      currentStart.setHours(0, 0, 0, 0);
      currentStart.setDate(currentStart.getDate() - (streak - 1));

      // Calculate gap between historical end and current start
      const gapDays =
        Math.floor(
          (currentStart.getTime() - historicalEnd.getTime()) /
            (1000 * 60 * 60 * 24),
        ) - 1;

      if (gapDays > 0) {
        console.log(
          `📅 [Calendar] Found ${gapDays} missed days between streaks`,
        );
        for (let i = 1; i <= gapDays; i++) {
          const missedDate = new Date(historicalEnd);
          missedDate.setDate(historicalEnd.getDate() + i);
          missedDates.add(missedDate.toISOString().split("T")[0]);
        }
      }

      // Add current streak dates (e.g., 2 days ending today)
      if (streak > 0) {
        for (let i = 0; i < streak; i++) {
          const date = new Date(currentStart);
          date.setDate(currentStart.getDate() + i);
          streakDates.add(date.toISOString().split("T")[0]);
        }
      }
    } else {
      console.log("📅 [Calendar] Using normal streak mode");

      // Normal mode: show current streak only
      const lastActive = new Date(lastActiveDate);
      lastActive.setHours(0, 0, 0, 0);

      if (streak > 0) {
        for (let i = 0; i < streak; i++) {
          const streakDate = new Date(lastActive);
          streakDate.setDate(lastActive.getDate() - i);
          streakDates.add(streakDate.toISOString().split("T")[0]);
        }
      }

      // Missed days: gap between lastActive and today (if gap > 1)
      const daysDiff = Math.floor(
        (todayStart.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysDiff > 1) {
        for (let i = 1; i < daysDiff; i++) {
          const missedDate = new Date(lastActive);
          missedDate.setDate(lastActive.getDate() + i);
          missedDates.add(missedDate.toISOString().split("T")[0]);
        }
      }
    }

    console.log("📅 [Calendar] Week view:", {
      streak,
      longestStreak,
      longestStreakDate,
      streakDates: Array.from(streakDates),
      missedDates: Array.from(missedDates),
      today: today.toISOString().split("T")[0],
    });

    // Generate 14 days (previous week + current week for continuous scrolling)
    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStart = new Date(date.setHours(0, 0, 0, 0));
      const dateString = dateStart.toISOString().split("T")[0];
      const isToday = dateStart.getTime() === todayStart.getTime();
      const isPast = dateStart < todayStart;
      const isFuture = dateStart > todayStart;

      // Check if this day is part of the streak using the Set
      const isInStreak = streakDates.has(dateString);

      // Check if this day was missed using the Set
      const isMissed = missedDates.has(dateString);

      // Completed = part of streak only (today shows orange ONLY after actually completing)
      const isCompleted = isInStreak;

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

  // Load progress from AsyncStorage when quest changes
  useEffect(() => {
    // CRITICAL: Reset state IMMEDIATELY when quest changes (synchronous)
    // This prevents showing stale progress from previous date during async load
    setWatchCompleted(false);
    setExploreCompleted(false);
    setQuestCompleted(false);

    const loadProgress = async () => {
      const currentQuestId = displayedQuest?.id || todayQuest?.id;
      if (!currentQuestId) return;

      try {
        // Load watch/explore from AsyncStorage
        const key = `@today_progress_${currentQuestId}`;
        const stored = await AsyncStorage.getItem(key);

        if (stored) {
          const progress = JSON.parse(stored);
          setWatchCompleted(progress.watch || false);
          setExploreCompleted(progress.explore || false);
          console.log(
            `📖 [Today] Loaded progress for ${currentQuestId}:`,
            progress,
          );
        }
        // Note: If no stored data, state already reset to false at useEffect start

        // Check Supabase for quiz completion
        if (user?.id) {
          const { data } = await supabase
            .from("user_daily_quest_progress")
            .select("*")
            .eq("user_id", user.id)
            .eq("daily_quest_id", currentQuestId)
            .maybeSingle();

          setQuestCompleted(!!data);
          if (data) {
            console.log(
              `✅ [Today] Quiz already completed for ${currentQuestId}`,
            );
          }
        }
      } catch (error) {
        console.error("❌ [Today] Error loading progress:", error);
      }
    };

    loadProgress();
  }, [displayedQuest?.id, todayQuest?.id, user?.id]);

  // Save progress to AsyncStorage (completedDate set in completion check useEffect)
  const saveProgress = async (section: "watch" | "explore") => {
    const currentQuestId = displayedQuest?.id || todayQuest?.id;
    if (!currentQuestId) return;

    try {
      const key = `@today_progress_${currentQuestId}`;

      // Load existing progress to preserve completedDate if already set
      const stored = await AsyncStorage.getItem(key);
      const existing = stored ? JSON.parse(stored) : {};

      const current = {
        watch: section === "watch" ? true : existing.watch || false,
        explore: section === "explore" ? true : existing.explore || false,
        completedDate: existing.completedDate || null, // Preserve existing completedDate
      };

      await AsyncStorage.setItem(key, JSON.stringify(current));
      console.log(
        `💾 [Today] Saved ${section} completion for ${currentQuestId}`,
        current,
      );
    } catch (error) {
      console.error("❌ [Today] Error saving progress:", error);
    }
  };

  // Handle quiz completion
  const handleQuizComplete = async () => {
    setQuestCompleted(true);
    console.log("✅ [Today] Quiz completed, quest finished!");
  };

  // ========== Trigger streak update when Today screen reaches 100% ==========
  // When all three sections are completed, check completedDate stamp to trigger streak
  useEffect(() => {
    const checkCompletion = async () => {
      // Check if all sections are complete (100% progress)
      if (watchCompleted && exploreCompleted && questCompleted) {
        const progress = calculateProgress();
        console.log(`✅ [Today] All sections complete! Progress: ${progress}%`);

        if (progress === 100) {
          const currentQuestId = displayedQuest?.id || todayQuest?.id;
          const currentQuest = displayedQuest || todayQuest;
          if (!currentQuestId || !currentQuest?.date) return;

          try {
            const today = new Date().toISOString().split("T")[0];
            const questDate = currentQuest.date; // The quest's actual date (e.g., "2026-02-02")
            const key = `@today_progress_${currentQuestId}`;

            // Load existing progress
            const stored = await AsyncStorage.getItem(key);
            const savedProgress = stored ? JSON.parse(stored) : {};

            // If no completedDate yet, set it to the QUEST'S date (not today)
            if (!savedProgress.completedDate) {
              savedProgress.completedDate = questDate;
              await AsyncStorage.setItem(key, JSON.stringify(savedProgress));
              console.log(
                `📅 [Today] Set completedDate to ${questDate} for ${currentQuestId}`,
              );
            }

            // CRITICAL: Only trigger streak if quest's completedDate matches today
            // This is the single source of truth - no need for multiple validations
            if (savedProgress.completedDate === today) {
              console.log(
                `🔥 [Today] Quest completed on today's date (${today}), triggering streak...`,
              );
              await reportTodayComplete(today);
              console.log(`✅ [Today] Streak update triggered successfully`);
            } else {
              console.log(
                `⏭️ [Today] Quest completed on different date (${savedProgress.completedDate}), not today (${today}), skipping streak`,
              );
            }
          } catch (error) {
            console.error(`❌ [Today] Error checking completion date:`, error);
          }
        }
      }
    };

    checkCompletion();
  }, [watchCompleted, exploreCompleted, questCompleted]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Note: reportTodayComplete and displayedQuest intentionally excluded to prevent double triggers
  // ========== END STREAK TRIGGER ==========

  // Calculate progress percentage based on actual completion
  const calculateProgress = () => {
    let completed = 0;
    if (watchCompleted) completed++;
    if (exploreCompleted) completed++;
    if (isCompleted || questCompleted) completed++;
    return Math.round((completed / 3) * 100);
  };

  // SEQUENTIAL UNLOCK LOGIC:
  // - WATCH: Always available
  // - EXPLORE: Unlocked after WATCH completed
  // - QUIZ: Unlocked after EXPLORE completed
  const isExploreUnlocked = watchCompleted;
  const isQuizUnlocked = watchCompleted && exploreCompleted;

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

  // Error state - show "No Quest" screen only for today's quest errors
  if (error || !todayQuest) {
    return (
      <SafeAreaView style={themeStyles.container} edges={["top"]}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 40,
          }}
        >
          <Ionicons
            name="calendar-outline"
            size={64}
            color={ArchivesTheme.colors.shoeBrown}
          />
          <Text
            style={[
              themeStyles.headerTitle,
              { marginTop: 20, textAlign: "center" },
            ]}
          >
            No Quest Today
          </Text>
          <Text
            style={{
              fontFamily: "DM Sans",
              fontSize: 14,
              fontWeight: "400",
              color: ArchivesTheme.colors.shoeBrown,
              textAlign: "center",
              marginTop: 10,
            }}
          >
            Check back tomorrow for a new daily quest!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const weekDates = getWeekDates();
  const progress = calculateProgress();

  // Get full month calendar data with streak tracking
  const getMonthCalendar = () => {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayDay = today.getDate();
    const year = today.getFullYear();
    const month = today.getMonth();

    // First day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Get full streak data from GamifiedProgress (includes longestStreakDate)
    const fullStreak = getStreak();
    const { longestStreakDate, lastActiveDate } = fullStreak;

    // Calculate which days were in the streak
    const streakDays = new Set<number>();
    const missedDays = new Set<number>();

    // Check if we should show historical longest streak (when it's bigger than current)
    const useHistoricalStreak = longestStreak > streak;

    if (useHistoricalStreak && longestStreakDate) {
      console.log("📅 [Calendar Modal] Using historical streak mode");

      // Add historical longest streak dates (e.g., 47 days ending Jan 24)
      const historicalEnd = new Date(longestStreakDate);
      historicalEnd.setHours(0, 0, 0, 0);

      for (let i = 0; i < longestStreak; i++) {
        const date = new Date(historicalEnd);
        date.setDate(historicalEnd.getDate() - i);

        // Only add to set if this day is in the current viewing month
        if (date.getMonth() === month && date.getFullYear() === year) {
          streakDays.add(date.getDate());
        }
      }

      // Calculate current streak start date
      const currentStart = new Date(lastActiveDate);
      currentStart.setHours(0, 0, 0, 0);
      currentStart.setDate(currentStart.getDate() - (streak - 1));

      // Calculate gap between historical end and current start
      const gapDays =
        Math.floor(
          (currentStart.getTime() - historicalEnd.getTime()) /
            (1000 * 60 * 60 * 24),
        ) - 1;

      if (gapDays > 0) {
        console.log(
          `📅 [Calendar Modal] Found ${gapDays} missed days between streaks`,
        );
        for (let i = 1; i <= gapDays; i++) {
          const missedDate = new Date(historicalEnd);
          missedDate.setDate(historicalEnd.getDate() + i);

          // Only add to set if this day is in the current viewing month
          if (
            missedDate.getMonth() === month &&
            missedDate.getFullYear() === year
          ) {
            missedDays.add(missedDate.getDate());
          }
        }
      }

      // Add current streak dates (e.g., 2 days ending today)
      if (streak > 0) {
        for (let i = 0; i < streak; i++) {
          const date = new Date(currentStart);
          date.setDate(currentStart.getDate() + i);

          // Only add to set if this day is in the current viewing month
          if (date.getMonth() === month && date.getFullYear() === year) {
            streakDays.add(date.getDate());
          }
        }
      }
    } else {
      console.log("📅 [Calendar Modal] Using normal streak mode");

      // Normal mode: show current streak only
      const lastActive = new Date(lastActiveDate);
      lastActive.setHours(0, 0, 0, 0);

      if (streak > 0) {
        for (let i = 0; i < streak; i++) {
          const streakDate = new Date(lastActive);
          streakDate.setDate(lastActive.getDate() - i);

          // Only add to set if this day is in the current viewing month
          if (
            streakDate.getMonth() === month &&
            streakDate.getFullYear() === year
          ) {
            streakDays.add(streakDate.getDate());
          }
        }
      }

      // Missed days: gap between lastActive and today (if gap > 1)
      const daysDiff = Math.floor(
        (todayStart.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysDiff > 1) {
        for (let i = 1; i < daysDiff; i++) {
          const missedDate = new Date(lastActive);
          missedDate.setDate(lastActive.getDate() + i);

          // Only add to set if this day is in the current viewing month
          if (
            missedDate.getMonth() === month &&
            missedDate.getFullYear() === year
          ) {
            missedDays.add(missedDate.getDate());
          }
        }
      }
    }

    console.log("📅 [Calendar Modal] Month view:", {
      streak,
      longestStreak,
      longestStreakDate,
      streakDays: Array.from(streakDays),
      missedDays: Array.from(missedDays),
      today: today.toISOString().split("T")[0],
    });

    const calendar: Array<{
      date: number | null;
      isToday: boolean;
      hasStreak: boolean;
      isMissed: boolean;
      isFuture: boolean;
      isCurrentMonth: boolean;
    }> = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      calendar.push({
        date: null,
        isToday: false,
        hasStreak: false,
        isMissed: false,
        isFuture: false,
        isCurrentMonth: false,
      });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStart = new Date(date.setHours(0, 0, 0, 0));
      const isToday = dateStart.getTime() === todayStart.getTime();
      const isPast = dateStart < todayStart;
      const isFuture = dateStart > todayStart;

      // Check if this day is part of the streak using the Set
      const hasStreak = streakDays.has(day) || isToday;

      // Check if this day was missed using the Set
      const isMissed = missedDays.has(day);

      calendar.push({
        date: day,
        isToday,
        hasStreak,
        isMissed,
        isFuture,
        isCurrentMonth: true,
      });
    }

    return calendar;
  };

  const monthCalendar = getMonthCalendar();

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
                const currentQuest = displayedQuest || todayQuest;
                if (!currentQuest?.date) return "Today's Story";

                const today = new Date().toISOString().split("T")[0];
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
          <View style={themeStyles.streakInline}>
            <StreakIcon size={24} />
            <Text style={themeStyles.streakText}>{streak} </Text>
            <Text style={themeStyles.streakText}>{streak === 1 ? "day" : "days"}</Text>
          </View>
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
        <View
          style={{
            marginTop: 12,
            marginBottom: 12,
            backgroundColor: "#41425E",
            borderRadius: 16,
            paddingTop: 20,
            paddingBottom: 10, // Must be at least 35px to show lock icon (extends ~11px below circle)
            overflow: "visible", // Ensure lock icon isn't clipped
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Week calendar days - Show only current week based on weekView */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              paddingHorizontal: 16,
              paddingBottom: 10,
            }}
          >
            {weekDates
              .slice(weekView === 0 ? 7 : 0, weekView === 0 ? 14 : 7)
              .map((item, index) => {
                // Check if this date is currently selected
                const isSelected =
                  selectedDate.toISOString().split("T")[0] ===
                  item.dateObj.toISOString().split("T")[0];

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      themeStyles.calendarDay,
                      {
                        width: 38, // Fixed width for each day
                        marginRight: index < 6 ? 12 : 0, // Add spacing between days except last (0-6 = 7 days)
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
                          borderColor: ArchivesTheme.colors.mossGreen,
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
                    {/* Lock icon overlapping with bottom circumference for missed days */}
                    {item.isMissed && (
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
          </View>
        </View>

        {/* Progress Tracker */}
        <View style={themeStyles.progressContainer}>
          <View style={themeStyles.progressHeader}>
            <Text style={themeStyles.progressLabel}>
              {(() => {
                const currentQuest = displayedQuest || todayQuest;
                if (!currentQuest?.date) return "Progress today";

                const today = new Date().toISOString().split("T")[0];
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

        {/* No Quest Available - Shows inline when viewing historical date with no content */}
        {isHistoricalView && !displayedQuest ? (
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
              No Quest Available
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
              There's no daily content for this date. Try selecting a different
              day from the calendar.
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
                setActiveModal('video');
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
            <TouchableOpacity
              style={[
                themeStyles.cardWatch,
                expandedCard === "watch" && themeStyles.cardWatchExpanded,
              ]}
              onPress={() =>
                setExpandedCard(expandedCard === "watch" ? null : "watch")
              }
              activeOpacity={0.9}
            >
              {/* Background Image */}
              {((displayedQuest || todayQuest)?.content?.card1?.thumbnail_url ||
                (displayedQuest || todayQuest)?.content?.card1?.media_url) && (
                <Image
                  source={{
                    uri:
                      (displayedQuest || todayQuest)?.content?.card1
                        ?.thumbnail_url ||
                      (displayedQuest || todayQuest)?.content?.card1?.media_url,
                  }}
                  style={themeStyles.cardWatchBackground}
                  contentFit="cover"
                />
              )}
              {/* Dark Overlay */}
              <LinearGradient
                colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.8)"]}
                style={themeStyles.cardWatchOverlay}
              />
              {/* Content */}
              <View style={themeStyles.cardWatchContent}>
                <View style={themeStyles.cardHeader}>
                  {/* Green Watch button on LEFT when collapsed, Title when expanded */}
                  {!expandedCard || expandedCard !== "watch" ? (
                    <TouchableOpacity
                      style={themeStyles.cardWatchButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (
                          (displayedQuest || todayQuest)?.content.card1
                            .media_url
                        ) {
                          setActiveModal("video");
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
                      <Text style={themeStyles.cardWatchButtonText}>Watch</Text>
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
                      <Text style={themeStyles.cardDuration}>2 MIN</Text>
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

                {expandedCard === "watch" && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      marginTop: 8,
                      gap: 8,
                    }}
                  >
                    <Text style={themeStyles.cardDuration}>2 MIN</Text>
                    <TouchableOpacity
                      style={themeStyles.cardWatchButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (
                          (displayedQuest || todayQuest)?.content.card1
                            .media_url
                        ) {
                          setActiveModal("video");
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
                      <Text style={themeStyles.cardWatchButtonText}>Watch</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* EXPLORE Card */}
            <TouchableOpacity
              style={themeStyles.cardExplore}
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
                  <Text style={themeStyles.cardDuration}>1 MIN</Text>
                  <Ionicons
                    name={
                      expandedCard === "explore" ? "chevron-up" : "chevron-down"
                    }
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
              </View>

              {expandedCard === "explore" && (
                <>
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
                        setActiveModal("reading");
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
                </>
              )}
            </TouchableOpacity>

            {/* QUESTIONS Card */}
            <TouchableOpacity
              style={themeStyles.cardQuestions}
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
                    2 MIN
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

              {expandedCard === "questions" && (
                <>
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
                        setActiveModal("quiz");
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
                </>
              )}
            </TouchableOpacity>

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
              if (!watchCompleted) {
                // Step 1: Open WATCH if not completed
                setActiveModal("video");
              } else if (!exploreCompleted) {
                // Step 2: Open EXPLORE if WATCH done but EXPLORE not done
                setActiveModal("reading");
              } else if (isQuizUnlocked) {
                // Step 3: Open QUIZ if both WATCH and EXPLORE done
                setActiveModal("quiz");
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={themeStyles.startButtonText}>Start My Day</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Single Modal for all lesson types - prevents flash on transitions */}
      {(activeModal === "video" ||
        activeModal === "reading" ||
        activeModal === "quiz") &&
        (displayedQuest || todayQuest) && (
          <Modal
            visible={true}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent={true}
          >
            {/* Video Lesson (WATCH) */}
            {activeModal === "video" && (
              <TodayVideoLesson
                contentItem={
                  {
                    id: (displayedQuest || todayQuest)!.id,
                    thumbnail_title: (displayedQuest || todayQuest)!.content
                      .card1.title,
                    thumbnail_url: "", // TODO: Replace with random image from 3 hardcoded options
                    media_url: [
                      (displayedQuest || todayQuest)!.content.card1.media_url,
                    ],
                    content_type: "reel",
                    bottom_content: {
                      title: (displayedQuest || todayQuest)!.content.card1
                        .title,
                      description: (displayedQuest || todayQuest)!.content.card1
                        .content.reading_text,
                      reading_text: (displayedQuest || todayQuest)!.content
                        .card1.content.reading_text,
                    },
                    order_by: 0,
                  } as ContentItem
                }
                progress={progress}
                onNext={async () => {
                  setWatchCompleted(true);
                  await saveProgress("watch");
                  setActiveModal("reading");
                }}
                onDismiss={() => setActiveModal("none")}
              />
            )}

            {/* Reading View (EXPLORE) */}
            {activeModal === "reading" && (
              <TodayScrollableLesson
                contentBlocks={
                  (displayedQuest || todayQuest)!.content.card2
                    .content_blocks || []
                }
                progress={progress}
                innerVoiceUrl={
                  (displayedQuest || todayQuest)!.content.card2.inner_voice
                }
                onContinue={async () => {
                  setExploreCompleted(true);
                  await saveProgress("explore");
                  setActiveModal("quiz");
                }}
                onBack={() => setActiveModal("none")}
              />
            )}

            {/* Quiz */}
            {activeModal === "quiz" && user && (
              <SafeAreaView
                style={{
                  flex: 1,
                  backgroundColor: ArchivesTheme.colors.creamWhite,
                }}
                edges={[]}
              >
                <Quiz
                  contentItem={
                    {
                      id: (displayedQuest || todayQuest)!.id,
                      questions: (displayedQuest || todayQuest)!.content.card3
                        .questions,
                      thumbnail_title: (displayedQuest || todayQuest)!.content
                        .card3.title,
                      thumbnail_url: "", // TODO: Replace with random image from 3 hardcoded options
                      media_url: [],
                      content_type: "reel",
                      bottom_content: null,
                      order_by: 0,
                    } as ContentItem
                  }
                  adventureId="daily_quest"
                  moduleId={(displayedQuest || todayQuest)!.id}
                  eraId="daily_quest"
                  eraName="Daily Quest"
                  isToday={true}
                  progress={progress}
                  showTodayHeader={true}
                  onQuizResults={async (
                    score,
                    correctAnswers,
                    totalQuestions,
                  ) => {
                    try {
                      await saveQuestCompletion(
                        user.id,
                        (displayedQuest || todayQuest)!.id,
                        score,
                        correctAnswers,
                        totalQuestions,
                      );
                      console.log(
                        "✅ [Today] Quest completion saved to Supabase",
                      );
                    } catch (error) {
                      console.error(
                        "❌ [Today] Failed to save completion:",
                        error,
                      );
                    }
                  }}
                  onContinue={async () => {
                    await handleQuizComplete();
                    setActiveModal("none");
                  }}
                  onDismiss={() => setActiveModal("none")}
                  onBack={() => setActiveModal("none")}
                />
              </SafeAreaView>
            )}
          </Modal>
        )}

      {/* Calendar Modal - Full month view with streak stats */}
      {activeModal === "calendar" && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView
            style={{
              flex: 1,
              backgroundColor: ArchivesTheme.colors.creamWhite,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#E0E0E0",
              }}
            >
              <Text
                style={{
                  fontFamily: "DM Sans",
                  fontSize: 20,
                  fontWeight: "700",
                  color: ArchivesTheme.colors.shoeBrown,
                }}
              >
                Calendar
              </Text>
              <TouchableOpacity
                onPress={() => setActiveModal("none")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close"
                  size={28}
                  color={ArchivesTheme.colors.shoeBrown}
                />
              </TouchableOpacity>
            </View>

            {/* Calendar Content */}
            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
            >
              {/* Current Month Calendar - full month grid */}
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 18,
                    fontWeight: "600",
                    color: ArchivesTheme.colors.mutedNavy,
                    textAlign: "center",
                    marginBottom: 20,
                  }}
                >
                  {new Date().toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </Text>

                {/* Day headers (S M T W T F S) */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-around",
                    marginBottom: 12,
                  }}
                >
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <View
                      key={index}
                      style={{ width: 40, alignItems: "center" }}
                    >
                      <Text
                        style={{
                          fontFamily: "DM Sans",
                          fontSize: 12,
                          fontWeight: "600",
                          color: ArchivesTheme.colors.mutedNavy,
                          opacity: 0.6,
                        }}
                      >
                        {day}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {monthCalendar.map((item, index) => (
                    <View
                      key={index}
                      style={{
                        width: "14.28%",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      {item.date ? (
                        <View style={{ alignItems: "center" }}>
                          {/* Date circle */}
                          <View
                            style={[
                              {
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor:
                                  item.hasStreak || item.isToday
                                    ? ArchivesTheme.colors.persianOrange
                                    : item.isMissed
                                      ? "#999999"
                                      : "#FFFFFF", // White background for empty days
                                borderWidth:
                                  item.hasStreak ||
                                  item.isToday ||
                                  item.isMissed
                                    ? 0
                                    : 2,
                                borderColor: "#E5E5E5", // Light gray border for empty days
                              },
                            ]}
                          >
                            {item.hasStreak || item.isToday ? (
                              <Text
                                style={{
                                  fontFamily: "DM Sans",
                                  fontSize: 14,
                                  fontWeight: "700",
                                  color: "#FFFFFF",
                                }}
                              >
                                {item.date}
                              </Text>
                            ) : item.isMissed ? (
                              <Text
                                style={{
                                  fontFamily: "DM Sans",
                                  fontSize: 20,
                                  fontWeight: "700",
                                  color: "#FFFFFF",
                                  lineHeight: 32,
                                }}
                              >
                                -
                              </Text>
                            ) : (
                              <Text
                                style={{
                                  fontFamily: "DM Sans",
                                  fontSize: 14,
                                  fontWeight: "600",
                                  color: "#C3C3C3", // Light gray text on white background
                                }}
                              >
                                {item.date}
                              </Text>
                            )}
                          </View>
                        </View>
                      ) : (
                        <View style={{ width: 36, height: 36 }} />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Streak Stats Card - Fixed at Bottom */}
            <View
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                right: 20,
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 24,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              {/* Current Streak - Left */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                }}
              >
                {/* Icon - Commented out for now */}
                {/* <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: ArchivesTheme.colors.persianOrange,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <StreakIcon size={20} />
                </View> */}
                <View>
                  <Text
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#666",
                    }}
                  >
                    Current Streak
                  </Text>
                  <Text
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 24,
                      fontWeight: "700",
                      color: ArchivesTheme.colors.shoeBrown,
                    }}
                  >
                    {streak} {streak === 1 ? "day" : "days"}
                  </Text>
                </View>
              </View>

              {/* Vertical Divider */}
              <View
                style={{
                  width: 1,
                  height: "60%",
                  backgroundColor: "#E0E0E0",
                  marginHorizontal: 16,
                }}
              />

              {/* Longest Streak - Right */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                }}
              >
                {/* Icon - Commented out for now */}
                {/* <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "#FFD700",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="trophy" size={20} color="#FFFFFF" />
                </View> */}
                <View>
                  <Text
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#666",
                    }}
                  >
                    Longest Streak
                  </Text>
                  <Text
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 24,
                      fontWeight: "700",
                      color: ArchivesTheme.colors.shoeBrown,
                    }}
                  >
                    {longestStreak} {longestStreak === 1 ? "day" : "days"}
                  </Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}
