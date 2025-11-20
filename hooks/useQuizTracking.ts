// useQuizTracking.ts - Custom hook for comprehensive quiz analytics
import { useEffect, useRef, useCallback } from 'react';
import { analyticsService } from '@/services/AnalyticsService';

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

    analyticsService.trackQuizQuestionAnswered({
      adventure_id: adventureId,
      module_id: moduleId,
      question_number: questionNumber,
      is_correct: isCorrect,
      time_taken_seconds: timeTaken,
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
      quiz_id: quizId,
      $current_url: screenUrl,
    });
  }, [adventureId, moduleId, eraId, eraName, adventureNumber, moduleNumber, quizId, screenUrl]);

  // Track quiz completion
  const trackQuizComplete = useCallback((score: number, correctAnswers: number, isRetake: boolean = false) => {
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    console.log(`📊 [QuizTracking] Quiz completed: ${adventureId}-${moduleId}, score: ${correctAnswers}/${totalQuestions}, time: ${timeSpent}s`);

    analyticsService.trackQuizCompleted({
      adventure_id: adventureId,
      module_id: moduleId,
      quiz_score: score,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      time_spent_seconds: timeSpent,
      is_retake: isRetake,
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
      quiz_id: quizId,
      quiz_title: quizTitle,
      $current_url: screenUrl,
    });
  }, [adventureId, moduleId, totalQuestions, eraId, eraName, adventureNumber, moduleNumber, quizId, quizTitle, screenUrl]);

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
