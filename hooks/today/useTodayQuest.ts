import { useEffect, useState } from "react";

import { supabase } from "@/hooks/lib/supabase";
import type { ContentBlock } from "@/components/shared/types";
import AppLogger from "@/services/AppLogger";
import { toLocalDateString } from "@/utils/dateUtils";

// ============================================================================
// TYPES
// ============================================================================

export interface Card1Content {
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

export interface Card2Content {
  content_type: "scrollable_media_view";
  title: string;
  thumbnail_title?: string; // Display title for card2 (explore)
  thumbnail_url?: string; // Background thumbnail for EXPLORE card; falls back to static when absent
  inner_image: string;
  inner_voice: string;
  content: string;
  content_blocks?: ContentBlock[]; // New content_blocks array structure
}

export interface Card3Content {
  title: string;
  thumbnail_url?: string; // Background thumbnail for QUESTIONS card; falls back to static when absent
  questions: {
    question_id: string;
    question_text: string;
    question_type: "mcq" | "trueFalse";
    answers: {
      answer_id: string;
      text: string;
      is_correct: boolean;
    }[];
    explanation: string;
    order: number;
  }[];
}

export interface TodayContent {
  card1: Card1Content;
  card2: Card2Content;
  card3: Card3Content;
  today_title: string;
  day_number: number;
  total_days: number;
}

export interface Today {
  id: string;
  date: string;
  content: TodayContent;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TodayProgress {
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
// HOOK
// ============================================================================

export function useTodayQuest(userId?: string) {
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

      AppLogger.info("daily", "Fetching today's quest", { todayDate });

      const { data: questData, error: questError } = await supabase
        .from("daily_content")
        .select("*")
        .eq("date", todayDate)
        .in("is_active", [true, "TRUE", "true"])
        .single();

      if (questError) {
        AppLogger.error("daily", "Error fetching quest", {}, questError);
        setError("No quest available for today");
        setTodayQuest(null);
        setLoading(false);
        return;
      }

      AppLogger.info("daily", "Quest fetched", {
        title: questData?.content?.card1?.title,
      });
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
            AppLogger.warn("daily", "Progress query failed", {
              message: progressError.message,
            });
          } else if (progressData) {
            AppLogger.info("daily", "User already completed this quest");
            setQuestProgress(progressData as TodayProgress);
          }
        } catch (err) {
          AppLogger.warn("daily", "Progress check failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      setLoading(false);
    } catch (err) {
      AppLogger.error("daily", "Unexpected error fetching today's quest", {}, err);
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
          AppLogger.info("daily", "Realtime update received", {
            eventType: payload.eventType,
          });
          // Refetch without showing loading spinner for smoother UX
          fetchTodayQuest(false);
        },
      )
      .subscribe((status) => {
        AppLogger.info("daily", "Realtime subscription status", { status });
      });

    // Cleanup subscription on unmount
    return () => {
      AppLogger.info("daily", "Unsubscribing from realtime");
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
      AppLogger.info("daily", "Saving completion", {
        correctAnswers,
        totalQuestions,
        score,
      });

      // Check if a record already exists
      const { data: existing } = await supabase
        .from("user_daily_quest_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("daily_quest_id", questId)
        .maybeSingle();

      // If exists and new score is lower, keep the better score
      if (existing && existing.score >= score) {
        AppLogger.info("daily", "Keeping existing better score", {
          existingScore: existing.score,
        });
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
        AppLogger.error("daily", "Error saving completion", {}, error);
        throw error;
      }

      AppLogger.info("daily", "Completion saved", {
        operation: existing ? "Updated" : "New",
      });
      setQuestProgress(data as TodayProgress);
      return data;
    } catch (err) {
      AppLogger.error("daily", "Failed to save completion", {}, err);
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
