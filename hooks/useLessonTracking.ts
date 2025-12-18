// useLessonTracking.ts - Custom hook for comprehensive lesson analytics
import { useEffect, useRef, useCallback } from 'react';
import { analyticsService } from '@/services/AnalyticsService';

interface UseLessonTrackingProps {
  adventureId: number | string; // Support both Era 1 (number) and Era 2 (string)
  moduleId: number | string;    // Support both Era 1 (number) and Era 2 (UUID string)
  lessonId: string;
  lessonType: 'video_reading' | 'image_carousel' | 'video_carousel' | 'static_image' | 'scrollable_media' | 'reel'; // Add 'reel' for ROI
  // Era context for funnel analysis
  eraId?: number;              // 1 = Umayyad, 2 = Rise of Islam (optional for backward compatibility)
  eraName?: string;            // "umayyad" | "riseOfIslam" (optional for backward compatibility)
  adventureNumber?: number;    // 1-5 for cross-era comparison (optional)
  moduleNumber?: number;       // 1-3 for cross-era comparison (optional)
  // Enhanced video metadata for detailed analytics
  lessonTitle?: string;
  chapterNumber?: number;
  screenUrl?: string; // For PostHog activity tracking ($current_url)
  screen?: string;    // Custom screen name for PostHog (e.g., "ROI Lesson - roi_adventure_1 lesson1")
}

export function useLessonTracking({
  adventureId,
  moduleId,
  lessonId,
  lessonType,
  eraId,
  eraName,
  adventureNumber,
  moduleNumber,
  lessonTitle,
  chapterNumber,
  screenUrl,
  screen
}: UseLessonTrackingProps) {
  const startTimeRef = useRef<number>(Date.now());
  const videoStartTimeRef = useRef<number | null>(null); // Track when video playback starts
  const hasStartedRef = useRef(false);

  // Track lesson start on component mount
  useEffect(() => {
    if (!hasStartedRef.current) {
      analyticsService.trackLessonStarted({
        adventure_id: adventureId,
        module_id: moduleId,
        lesson_id: lessonId,
        lesson_type: lessonType,
        era_id: eraId,
        era_name: eraName,
        adventure_number: adventureNumber,
        module_number: moduleNumber,
        $screen_name: screen,
      });
      hasStartedRef.current = true;
    }

    // Track lesson end on unmount (time spent calculation)
    return () => {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      console.log(`📊 [LessonTracking] Lesson ended: ${adventureId}-${moduleId}-${lessonId}, time: ${timeSpent}s`);

      // Note: Lesson completion is tracked separately via completeLesson call in component
    };
  }, [adventureId, moduleId, lessonId, lessonType, eraId, eraName, adventureNumber, moduleNumber, screen]);

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
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
    });
  }, [adventureId, moduleId, lessonId, lessonTitle, chapterNumber, screenUrl, eraId, eraName, adventureNumber, moduleNumber]);

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
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
    });
  }, [adventureId, moduleId, lessonId, lessonTitle, chapterNumber, screenUrl, eraId, eraName, adventureNumber, moduleNumber]);

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
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
    });

    // Reset video start time after completion
    videoStartTimeRef.current = null;
  }, [adventureId, moduleId, lessonId, lessonTitle, chapterNumber, screenUrl, eraId, eraName, adventureNumber, moduleNumber]);

  // Track reading card expansion
  const trackCardExpanded = useCallback(() => {
    console.log(`📊 [LessonTracking] Reading card expanded: ${adventureId}-${moduleId}-${lessonId}`);
    analyticsService.trackReadingCardExpanded({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
    });
  }, [adventureId, moduleId, lessonId, eraId, eraName, adventureNumber, moduleNumber]);

  // Track lesson completion
  const trackLessonComplete = useCallback(() => {
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    console.log(`📊 [LessonTracking] Lesson completed: ${adventureId}-${moduleId}-${lessonId}, time: ${timeSpent}s`);
    analyticsService.trackLessonCompleted({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      time_spent_seconds: timeSpent,
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
      $screen_name: screen,
    });
  }, [adventureId, moduleId, lessonId, eraId, eraName, adventureNumber, moduleNumber, screen]);

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
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
    });
  }, [adventureId, moduleId, lessonId, eraId, eraName, adventureNumber, moduleNumber]);

  // Track screen press/interaction
  const trackScreenPress = useCallback((interactionType: 'tap' | 'swipe' | 'card_expand' | 'card_collapse' | 'button_press', target?: string) => {
    console.log(`📊 [LessonTracking] Screen press: ${interactionType}${target ? ` on ${target}` : ''}`);
    analyticsService.trackScreenPress({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      interaction_type: interactionType,
      target,
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
    });
  }, [adventureId, moduleId, lessonId, eraId, eraName, adventureNumber, moduleNumber]);

  // Track video buffering
  const trackVideoBuffering = useCallback((bufferTimeMs: number, videoUrl: string) => {
    console.log(`📊 [LessonTracking] Video buffering: ${bufferTimeMs}ms`);
    analyticsService.trackVideoBuffering({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      buffer_time_ms: bufferTimeMs,
      video_url: videoUrl,
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
    });
  }, [adventureId, moduleId, lessonId, eraId, eraName, adventureNumber, moduleNumber]);

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
