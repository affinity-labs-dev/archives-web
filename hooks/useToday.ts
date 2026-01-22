// Hook to fetch today's content from Supabase (updated for new table structure)
import { useState, useEffect } from 'react';
import { supabase } from '@/hooks/lib/supabase';

// Card 1: Reel (WATCH)
interface Card1Content {
  content_type: 'reel';
  title: string;
  media_url: string;  // Changed from video_url to match Supabase
  content: {
    reading_text: string;
  };
}

// Card 2: Scrollable Media View (EXPLORE)
interface Card2Content {
  content_type: 'scrollable_media_view';
  title: string;
  inner_image: string;
  inner_voice: string;  // Eleven Labs audio URL
  content: string;      // HTML content
}

// Card 3: Quiz (QUESTIONS)
interface Card3Content {
  title: string;
  questions: Array<{
    question_id: string;
    question_text: string;
    question_type: 'mcq' | 'trueFalse';
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
}

interface Today {
  id: string;
  date: string;  // Format: YYYY-MM-DD
  content: TodayContent;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TodayProgress {
  id: string;
  user_id: string;
  daily_quest_id: string;
  completed_at: string;
  score: number;
  correct_answers: number;
  total_questions: number;
}

export function useToday(userId?: string) {
  const [todayQuest, setTodayQuest] = useState<Today | null>(null);
  const [questProgress, setQuestProgress] = useState<TodayProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodayQuest = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const todayDate = today.toISOString().split('T')[0]; // "2026-01-22"

        console.log(`🔍 [useToday] Fetching quest for ${todayDate}`);

        // Fetch today's quest from new daily_content table
        const { data: questData, error: questError } = await supabase
          .from('daily_content')
          .select('*')
          .eq('date', todayDate)
          .eq('is_active', true)
          .single();

        if (questError) {
          console.error('❌ [useToday] Error fetching quest:', questError);
          setError('No quest available for today');
          setTodayQuest(null);
          setLoading(false);
          return;
        }

        console.log('✅ [useToday] Quest fetched:', questData?.content?.card1?.title);
        console.log('🎬 [useToday] Full quest data:', JSON.stringify(questData, null, 2));
        console.log('🎬 [useToday] Card1 media_url:', questData?.content?.card1?.media_url);
        console.log('🎬 [useToday] Card2 inner_voice:', questData?.content?.card2?.inner_voice);
        setTodayQuest(questData as Today);

        // Fetch user's progress for this quest (if userId provided)
        if (userId && questData) {
          try {
            const { data: progressData, error: progressError } = await supabase
              .from('user_daily_quest_progress')
              .select('*')
              .eq('user_id', userId)
              .eq('daily_quest_id', questData.id)
              .maybeSingle();

            if (progressError) {
              // Silently handle UUID type mismatch error (daily_quest_id expects UUID but we use TEXT id)
              console.warn('⚠️ [useToday] Progress query failed (expected - table may need TEXT id column):', progressError.message);
            } else if (progressData) {
              console.log('✅ [useToday] User already completed this quest');
              setQuestProgress(progressData as TodayProgress);
            }
          } catch (err) {
            console.warn('⚠️ [useToday] Progress check failed:', err);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('❌ [useToday] Unexpected error:', err);
        setError('Failed to load daily quest');
        setLoading(false);
      }
    };

    fetchTodayQuest();
  }, [userId]);

  // Function to save quest completion
  const saveQuestCompletion = async (
    userId: string,
    questId: string,
    score: number,
    correctAnswers: number,
    totalQuestions: number
  ) => {
    try {
      console.log(`💾 [useToday] Saving completion: ${correctAnswers}/${totalQuestions}`);

      const { data, error } = await supabase
        .from('user_daily_quest_progress')
        .insert({
          user_id: userId,
          daily_quest_id: questId,
          score,
          correct_answers: correctAnswers,
          total_questions: totalQuestions,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [useToday] Error saving completion:', error);
        throw error;
      }

      console.log('✅ [useToday] Completion saved');
      setQuestProgress(data as TodayProgress);
      return data;
    } catch (err) {
      console.error('❌ [useToday] Failed to save completion:', err);
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
