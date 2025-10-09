// useLessonTracking.ts - Custom hook for comprehensive lesson analytics
import { useEffect, useRef, useCallback } from 'react';
import { analyticsService } from '@/services/AnalyticsService';

interface UseLessonTrackingProps {
  adventureId: number;
  moduleId: number;
  lessonId: string;
  lessonType: 'video_reading' | 'image_carousel' | 'video_carousel' | 'static_image' | 'scrollable_media';
  // Enhanced video metadata for detailed analytics
  lessonTitle?: string;
  chapterNumber?: number;
  screenUrl?: string; // For PostHog activity tracking ($current_url)
}

export function useLessonTracking({
  adventureId,
  moduleId,
  lessonId,
  lessonType,
  lessonTitle,
  chapterNumber,
  screenUrl
}: UseLessonTrackingProps) {
  const startTimeRef = useRef<number>(Date.now());
  const videoStartTimeRef = useRef<number | null>(null); // Track when video playback starts
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

  // Track video play event with enhanced metadata
  const trackVideoPlay = useCallback((videoDuration?: number) => {
    // Track when video playback starts for completion time calculation
    if (!videoStartTimeRef.current) {
      videoStartTimeRef.current = Date.now();
    }

    console.log(`📊 [LessonTracking] Video played: ${adventureId}-${moduleId}-${lessonId}${lessonTitle ? ` - ${lessonTitle}` : ''}`);
    analyticsService.trackVideoPlayed({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      lesson_title: lessonTitle,
      chapter_number: chapterNumber,
      video_duration_seconds: videoDuration ? Math.floor(videoDuration / 1000) : undefined,
      $current_url: screenUrl,
    });
  }, [adventureId, moduleId, lessonId, lessonTitle, chapterNumber, screenUrl]);

  // Track video pause event with enhanced metadata
  const trackVideoPause = useCallback((position: number, duration: number) => {
    const progress = duration > 0 ? (position / duration) * 100 : 0;
    console.log(`📊 [LessonTracking] Video paused: ${adventureId}-${moduleId}-${lessonId}${lessonTitle ? ` - ${lessonTitle}` : ''} at ${progress.toFixed(1)}%`);
    analyticsService.trackVideoPaused({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      lesson_title: lessonTitle,
      chapter_number: chapterNumber,
      video_progress: progress,
      position_seconds: Math.floor(position / 1000),
      duration_seconds: Math.floor(duration / 1000),
      $current_url: screenUrl,
    });
  }, [adventureId, moduleId, lessonId, lessonTitle, chapterNumber, screenUrl]);

  // Track video completion with enhanced metadata
  const trackVideoComplete = useCallback((videoDuration?: number) => {
    // Calculate how long it took the user to complete the video (from first play)
    const completionTime = videoStartTimeRef.current
      ? Math.floor((Date.now() - videoStartTimeRef.current) / 1000)
      : undefined;

    console.log(`📊 [LessonTracking] Video completed: ${adventureId}-${moduleId}-${lessonId}${lessonTitle ? ` - ${lessonTitle}` : ''}${completionTime ? ` in ${completionTime}s` : ''}`);
    analyticsService.trackVideoCompleted({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      lesson_title: lessonTitle,
      chapter_number: chapterNumber,
      video_duration_seconds: videoDuration ? Math.floor(videoDuration / 1000) : undefined,
      completion_time_seconds: completionTime,
      $current_url: screenUrl,
    });

    // Reset video start time after completion
    videoStartTimeRef.current = null;
  }, [adventureId, moduleId, lessonId, lessonTitle, chapterNumber, screenUrl]);

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

  // Track carousel image view time
  const trackCarouselImageView = useCallback((imageIndex: number, timeSpentSeconds: number, totalImages: number) => {
    console.log(`📊 [LessonTracking] Carousel image ${imageIndex + 1}/${totalImages} viewed for ${timeSpentSeconds}s`);
    analyticsService.trackCarouselImageView({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      image_index: imageIndex,
      time_spent_seconds: timeSpentSeconds,
      total_images: totalImages,
    });
  }, [adventureId, moduleId, lessonId]);

  // Track screen press/interaction
  const trackScreenPress = useCallback((interactionType: 'tap' | 'swipe' | 'card_expand' | 'card_collapse' | 'button_press', target?: string) => {
    console.log(`📊 [LessonTracking] Screen press: ${interactionType}${target ? ` on ${target}` : ''}`);
    analyticsService.trackScreenPress({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      interaction_type: interactionType,
      target,
    });
  }, [adventureId, moduleId, lessonId]);

  // Track video buffering
  const trackVideoBuffering = useCallback((bufferTimeMs: number, videoUrl: string) => {
    console.log(`📊 [LessonTracking] Video buffering: ${bufferTimeMs}ms`);
    analyticsService.trackVideoBuffering({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      buffer_time_ms: bufferTimeMs,
      video_url: videoUrl,
    });
  }, [adventureId, moduleId, lessonId]);

  return {
    trackVideoPlay,
    trackVideoPause,
    trackVideoComplete,
    trackCardExpanded,
    trackLessonComplete,
    trackCarouselImageView,
    trackScreenPress,
    trackVideoBuffering,
  };
}
