// useQuizTracking.ts - Custom hook for comprehensive quiz analytics
import { useEffect, useRef, useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsService } from '@/services/AnalyticsService';
import { useProgress } from '@/context/ProgressContext';

interface UseQuizTrackingProps {
  adventureId: number | string; // Support both Era 1 (number) and Era 2 (string)
  moduleId: number | string;    // Support both Era 1 (number) and Era 2 (UUID string)
  totalQuestions: number;
  // Era context for funnel analysis
  eraId?: number;              // 1 = Umayyad, 2 = Rise of Islam
  eraName?: string;            // "umayyad" | "riseOfIslam"
  adventureNumber?: number;    // 1-5 for cross-era comparison
  moduleNumber?: number;       // 1-3 for cross-era comparison
  quizId?: string;             // Quiz identifier (optional)
  quizTitle?: string;          // Quiz title for tracking (optional)
  screenUrl?: string;          // Screen URL for PostHog activity tracking
}

export function useQuizTracking({
  adventureId,
  moduleId,
  totalQuestions,
  eraId,
  eraName,
  adventureNumber,
  moduleNumber,
  quizId,
  quizTitle,
  screenUrl
}: UseQuizTrackingProps) {
  const startTimeRef = useRef<number>(Date.now());
  const hasStartedRef = useRef(false);
  const answeredQuestionsRef = useRef<Set<number>>(new Set());
  const [newUserProgress, setNewUserProgress] = useState<any[]>([]);

  // Access progress context for XP calculations
  const { calculateTotalXP, moduleProgress } = useProgress();

  // Load new user progress data for XP calculations
  useEffect(() => {
    const loadNewProgress = async () => {
      try {
        const data = await AsyncStorage.getItem('new_user_progress');
        if (data) {
          setNewUserProgress(JSON.parse(data));
        }
      } catch (error) {
        console.error('📊 [QuizTracking] Error loading new user progress:', error);
      }
    };
    loadNewProgress();
  }, []);

  // Track quiz start on component mount
  useEffect(() => {
    if (!hasStartedRef.current) {
      console.log(`📊 [QuizTracking] Quiz started: ${adventureId}-${moduleId}`);
      analyticsService.trackQuizStarted({
        adventure_id: adventureId,
        module_id: moduleId,
        total_questions: totalQuestions,
        era_id: eraId,
        era_name: eraName,
        adventure_number: adventureNumber,
        module_number: moduleNumber,
        quiz_id: quizId,
        quiz_title: quizTitle,
        $current_url: screenUrl,
      });
      hasStartedRef.current = true;
    }

    // Track quiz abandonment on unmount if not completed
    return () => {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const questionsAnswered = answeredQuestionsRef.current.size;

      if (questionsAnswered > 0 && questionsAnswered < totalQuestions) {
        console.log(`📊 [QuizTracking] Quiz abandoned: ${adventureId}-${moduleId} after ${questionsAnswered}/${totalQuestions} questions`);
      }
    };
  }, [adventureId, moduleId, totalQuestions, eraId, eraName, adventureNumber, moduleNumber, quizId, quizTitle, screenUrl]);

  // Track individual question answered
  const trackQuestionAnswered = useCallback((questionNumber: number, isCorrect: boolean, timeTaken: number) => {
    answeredQuestionsRef.current.add(questionNumber);
    console.log(`📊 [QuizTracking] Question answered: ${adventureId}-${moduleId} Q${questionNumber} - ${isCorrect ? 'Correct' : 'Incorrect'}`);

    // Calculate XP properties
    const xpEarned = isCorrect ? 10 : 0;
    const currentTotalXP = calculateTotalXP(moduleProgress, newUserProgress);

    analyticsService.trackQuizQuestionAnswered({
      adventure_id: adventureId,
      module_id: moduleId,
      question_number: questionNumber,
      is_correct: isCorrect,
      time_taken_seconds: timeTaken,
      xp_earned: xpEarned,
      current_total_xp: currentTotalXP,
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
      quiz_id: quizId,
      $current_url: screenUrl,
    });

    console.log(`📊 [QuizTracking] XP tracking - Earned: ${xpEarned}, Total: ${currentTotalXP}`);
  }, [adventureId, moduleId, eraId, eraName, adventureNumber, moduleNumber, quizId, screenUrl, calculateTotalXP, moduleProgress, newUserProgress]);

  // Track quiz completion
  const trackQuizComplete = useCallback((score: number, correctAnswers: number, isRetake: boolean = false) => {
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    console.log(`📊 [QuizTracking] Quiz completed: ${adventureId}-${moduleId}, score: ${correctAnswers}/${totalQuestions}, time: ${timeSpent}s`);

    // Calculate XP properties
    const totalXPBefore = calculateTotalXP(moduleProgress, newUserProgress);
    const xpEarned = correctAnswers * 10;
    const totalXPAfter = totalXPBefore + xpEarned;

    analyticsService.trackQuizCompleted({
      adventure_id: adventureId,
      module_id: moduleId,
      quiz_score: score,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      time_spent_seconds: timeSpent,
      is_retake: isRetake,
      xp_earned: xpEarned,
      total_xp_before: totalXPBefore,
      total_xp_after: totalXPAfter,
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
      quiz_id: quizId,
      quiz_title: quizTitle,
      $current_url: screenUrl,
    });

    console.log(`📊 [QuizTracking] XP tracking - Before: ${totalXPBefore}, Earned: ${xpEarned}, After: ${totalXPAfter}`);
  }, [adventureId, moduleId, totalQuestions, eraId, eraName, adventureNumber, moduleNumber, quizId, quizTitle, screenUrl, calculateTotalXP, moduleProgress, newUserProgress]);

  // Track quiz retake
  const trackQuizRetake = useCallback((previousScore: number) => {
    console.log(`📊 [QuizTracking] Quiz retake: ${adventureId}-${moduleId}, previous score: ${previousScore}`);

    // Reset tracking for retake
    startTimeRef.current = Date.now();
    answeredQuestionsRef.current.clear();

    analyticsService.trackQuizRetake({
      adventure_id: adventureId,
      module_id: moduleId,
      previous_score: previousScore,
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
      quiz_id: quizId,
      $current_url: screenUrl,
    });
  }, [adventureId, moduleId, eraId, eraName, adventureNumber, moduleNumber, quizId, screenUrl]);

  return {
    trackQuestionAnswered,
    trackQuizComplete,
    trackQuizRetake,
  };
}
