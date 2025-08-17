import { usePostHog } from 'posthog-react-native';
import { useUser } from '@clerk/clerk-expo';

/**
 * Custom hook for PostHog analytics in the Archives educational app
 * Provides educational-specific tracking events and user identification
 */
export function useAnalytics() {
  const posthog = usePostHog();
  const { user } = useUser();

  // Identify user when they sign in (combines Clerk + PostHog)
  const identifyUser = () => {
    if (user) {
      posthog?.identify(user.id, {
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      });
    }
  };

  // Educational progress tracking
  const trackLessonStarted = (adventureId: number, moduleId: number, lessonId: number) => {
    posthog?.capture('lesson_started', {
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      lesson_path: `adventure_${adventureId}_module_${moduleId}_lesson_${lessonId}`,
    });
  };

  const trackLessonCompleted = (adventureId: number, moduleId: number, lessonId: number, duration?: number) => {
    posthog?.capture('lesson_completed', {
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      lesson_path: `adventure_${adventureId}_module_${moduleId}_lesson_${lessonId}`,
      duration_seconds: duration,
    });
  };

  const trackQuizStarted = (adventureId: number, moduleId: number) => {
    posthog?.capture('quiz_started', {
      adventure_id: adventureId,
      module_id: moduleId,
      quiz_path: `adventure_${adventureId}_module_${moduleId}_quiz`,
    });
  };

  const trackQuizCompleted = (adventureId: number, moduleId: number, score: number, totalQuestions: number) => {
    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = percentage >= 40; // Based on 40% minimum from CLAUDE.md
    
    posthog?.capture('quiz_completed', {
      adventure_id: adventureId,
      module_id: moduleId,
      quiz_path: `adventure_${adventureId}_module_${moduleId}_quiz`,
      score,
      total_questions: totalQuestions,
      percentage,
      passed,
    });
  };

  const trackModuleCompleted = (adventureId: number, moduleId: number) => {
    posthog?.capture('module_completed', {
      adventure_id: adventureId,
      module_id: moduleId,
      module_path: `adventure_${adventureId}_module_${moduleId}`,
    });
  };

  const trackAdventureUnlocked = (adventureId: number) => {
    posthog?.capture('adventure_unlocked', {
      adventure_id: adventureId,
    });
  };

  // Video engagement tracking
  const trackVideoPlayed = (videoUrl: string, adventureId?: number, moduleId?: number) => {
    posthog?.capture('video_played', {
      video_url: videoUrl,
      adventure_id: adventureId,
      module_id: moduleId,
      video_type: videoUrl.includes('cloudfront') ? 'aws_cloudfront' : 'local',
    });
  };

  const trackVideoCompleted = (videoUrl: string, duration: number, adventureId?: number, moduleId?: number) => {
    posthog?.capture('video_completed', {
      video_url: videoUrl,
      duration_seconds: duration,
      adventure_id: adventureId,
      module_id: moduleId,
      video_type: videoUrl.includes('cloudfront') ? 'aws_cloudfront' : 'local',
    });
  };

  // Navigation tracking
  const trackScreenView = (screenName: string, params?: Record<string, any>) => {
    posthog?.screen(screenName, params);
  };

  // Era and content tracking
  const trackEraSelected = (eraName: string) => {
    posthog?.capture('era_selected', {
      era_name: eraName,
    });
  };

  // Audio tracking
  const trackAudioPlayed = (audioUrl: string, adventureId?: number, moduleId?: number) => {
    posthog?.capture('audio_played', {
      audio_url: audioUrl,
      adventure_id: adventureId,
      module_id: moduleId,
      audio_type: audioUrl.includes('cloudfront') ? 'aws_cloudfront' : 'local',
    });
  };

  // Error tracking
  const trackError = (error: string, context?: Record<string, any>) => {
    posthog?.capture('error_occurred', {
      error_message: error,
      ...context,
    });
  };

  // App lifecycle
  const trackAppOpened = () => {
    posthog?.capture('app_opened');
  };

  const trackAppBackgrounded = () => {
    posthog?.capture('app_backgrounded');
  };

  return {
    // User management
    identifyUser,
    
    // Educational progress
    trackLessonStarted,
    trackLessonCompleted,
    trackQuizStarted,
    trackQuizCompleted,
    trackModuleCompleted,
    trackAdventureUnlocked,
    
    // Media engagement
    trackVideoPlayed,
    trackVideoCompleted,
    trackAudioPlayed,
    
    // Navigation
    trackScreenView,
    trackEraSelected,
    
    // Error handling
    trackError,
    
    // App lifecycle
    trackAppOpened,
    trackAppBackgrounded,
    
    // Direct PostHog access for custom events
    posthog,
  };
}