// useLessonTracking.ts - Custom hook for comprehensive lesson analytics
import { useEffect, useRef, useCallback } from 'react';
import { analyticsService } from '@/services/AnalyticsService';

interface UseLessonTrackingProps {
  adventureId: number;
  moduleId: number;
  lessonId: string;
  lessonType: 'video_reading' | 'image_carousel' | 'video_carousel' | 'static_image' | 'scrollable_media';
}

export function useLessonTracking({
  adventureId,
  moduleId,
  lessonId,
  lessonType
}: UseLessonTrackingProps) {
  const startTimeRef = useRef<number>(Date.now());
  const hasStartedRef = useRef(false);

  // Track lesson start on component mount
  useEffect(() => {
    if (!hasStartedRef.current) {
      console.log(`📊 [LessonTracking] Lesson started: ${adventureId}-${moduleId}-${lessonId}`);
      analyticsService.trackLessonStarted({
        adventure_id: adventureId,
        module_id: moduleId,
        lesson_id: lessonId,
        lesson_type: lessonType,
      });
      hasStartedRef.current = true;
    }

    // Track lesson end on unmount (time spent calculation)
    return () => {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      console.log(`📊 [LessonTracking] Lesson ended: ${adventureId}-${moduleId}-${lessonId}, time: ${timeSpent}s`);

      // Note: Lesson completion is tracked separately via completeLesson call in component
    };
  }, [adventureId, moduleId, lessonId, lessonType]);

  // Track video play event
  const trackVideoPlay = useCallback(() => {
    console.log(`📊 [LessonTracking] Video played: ${adventureId}-${moduleId}-${lessonId}`);
    analyticsService.trackVideoPlayed({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
    });
  }, [adventureId, moduleId, lessonId]);

  // Track video pause event
  const trackVideoPause = useCallback((position: number, duration: number) => {
    const progress = duration > 0 ? (position / duration) * 100 : 0;
    console.log(`📊 [LessonTracking] Video paused: ${adventureId}-${moduleId}-${lessonId} at ${progress.toFixed(1)}%`);
    analyticsService.trackVideoPaused({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      video_progress: progress,
      position_seconds: Math.floor(position / 1000),
    });
  }, [adventureId, moduleId, lessonId]);

  // Track video completion
  const trackVideoComplete = useCallback(() => {
    console.log(`📊 [LessonTracking] Video completed: ${adventureId}-${moduleId}-${lessonId}`);
    analyticsService.trackVideoCompleted({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
    });
  }, [adventureId, moduleId, lessonId]);

  // Track reading card expansion
  const trackCardExpanded = useCallback(() => {
    console.log(`📊 [LessonTracking] Reading card expanded: ${adventureId}-${moduleId}-${lessonId}`);
    analyticsService.trackReadingCardExpanded({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
    });
  }, [adventureId, moduleId, lessonId]);

  // Track lesson completion
  const trackLessonComplete = useCallback(() => {
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    console.log(`📊 [LessonTracking] Lesson completed: ${adventureId}-${moduleId}-${lessonId}, time: ${timeSpent}s`);
    analyticsService.trackLessonCompleted({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      time_spent_seconds: timeSpent,
    });
  }, [adventureId, moduleId, lessonId]);

  return {
    trackVideoPlay,
    trackVideoPause,
    trackVideoComplete,
    trackCardExpanded,
    trackLessonComplete,
  };
}
