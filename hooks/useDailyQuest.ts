// Hook to fetch today's daily quest from Supabase
import { useState, useEffect } from 'react';
import { supabase } from '@/hooks/lib/supabase';

interface DailyQuestContent {
  title: string;
  image_url: string;
  video_url: string | null;  // Video URL for WATCH section
  text_content: string;
  audio_url: string | null;
  questions: Array<{
    question_text: string;
    question_type: 'mcq' | 'trueFalse';
    explanation: string;
    answers: Array<{
      text: string;
      is_correct: boolean;
    }>;
  }>;
}

interface DailyQuest {
  id: string;
  year: number;
  month: number;
  day: number;
  content: DailyQuestContent;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DailyQuestProgress {
  id: string;
  user_id: string;
  daily_quest_id: string;
  completed_at: string;
  score: number;
  correct_answers: number;
  total_questions: number;
}

export function useDailyQuest(userId?: string) {
  const [todayQuest, setTodayQuest] = useState<DailyQuest | null>(null);
  const [questProgress, setQuestProgress] = useState<DailyQuestProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodayQuest = async () => {
      try {
        setLoading(true);
        setError(null);

        const today = new Date();
        const year = today.getFullYear(); // 2026, 2027, etc.
        const month = today.getMonth() + 1; // 1-12
        const day = today.getDate(); // 1-31

        console.log(`🔍 [useDailyQuest] Fetching quest for ${year}-${month}-${day}`);

        // Fetch today's quest
        const { data: questData, error: questError } = await supabase
          .from('daily_quests')
          .select('*')
          .eq('year', year)
          .eq('month', month)
          .eq('day', day)
          .eq('is_active', true)
          .single();

        if (questError) {
          console.error('❌ [useDailyQuest] Error fetching quest:', questError);
          setError('No quest available for today');
          setTodayQuest(null);
          setLoading(false);
          return;
        }

        console.log('✅ [useDailyQuest] Quest fetched:', questData?.content?.title);
        setTodayQuest(questData as DailyQuest);

        // Fetch user's progress for this quest (if userId provided)
        if (userId && questData) {
          const { data: progressData, error: progressError } = await supabase
            .from('user_daily_quest_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('daily_quest_id', questData.id)
            .maybeSingle();

          if (progressError) {
            console.error('❌ [useDailyQuest] Error fetching progress:', progressError);
          } else if (progressData) {
            console.log('✅ [useDailyQuest] User already completed this quest');
            setQuestProgress(progressData as DailyQuestProgress);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('❌ [useDailyQuest] Unexpected error:', err);
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
      console.log(`💾 [useDailyQuest] Saving completion: ${correctAnswers}/${totalQuestions}`);

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
        console.error('❌ [useDailyQuest] Error saving completion:', error);
        throw error;
      }

      console.log('✅ [useDailyQuest] Completion saved');
      setQuestProgress(data as DailyQuestProgress);
      return data;
    } catch (err) {
      console.error('❌ [useDailyQuest] Failed to save completion:', err);
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
