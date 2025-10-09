// useQuizTracking.ts - Custom hook for comprehensive quiz analytics
import { useEffect, useRef, useCallback } from 'react';
import { analyticsService } from '@/services/AnalyticsService';

interface UseQuizTrackingProps {
  adventureId: number;
  moduleId: number;
  totalQuestions: number;
}

export function useQuizTracking({
  adventureId,
  moduleId,
  totalQuestions
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
  }, [adventureId, moduleId, totalQuestions]);

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
    });
  }, [adventureId, moduleId]);

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
    });
  }, [adventureId, moduleId, totalQuestions]);

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
    });
  }, [adventureId, moduleId]);

  return {
    trackQuestionAnswered,
    trackQuizComplete,
    trackQuizRetake,
  };
}
