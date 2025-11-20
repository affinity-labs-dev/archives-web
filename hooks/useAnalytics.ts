import { Platform } from 'react-native';
import { usePostHog } from 'posthog-react-native';
import { useUser } from '@clerk/clerk-expo';

/**
 * Custom hook for PostHog analytics in the Archives educational app
 * Provides educational-specific tracking events and user identification
 * Includes ATT safety checks to prevent tracking before permission granted
 */
export function useAnalytics() {
  const posthog = usePostHog();
  const { user } = useUser();

  // Helper function to safely execute tracking
  const safeTrack = (trackingFn: () => void, eventName?: string) => {
    if (!posthog) {
      // PostHog may not be initialized during early app lifecycle or when ATT permission not granted
      // This is expected behavior - events will be tracked once PostHog initializes
      if (__DEV__) {
        console.log(`📊 [Analytics] Skipping event (PostHog not ready): ${eventName || 'unknown'}`);
      }
      return;
    }

    trackingFn();
  };

  // Identify user when they sign in (combines Clerk + PostHog)
  const identifyUser = () => {
    safeTrack(() => {
      if (user) {
        posthog.identify(user.id, {
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt,
        });
      }
    }, 'identify_user');
  };

  // Educational progress tracking
  const trackLessonStarted = (adventureId: number, moduleId: number, lessonId: number) => {
    safeTrack(() => {
      posthog.capture('lesson_started', {
        adventure_id: adventureId,
        module_id: moduleId,
        lesson_id: lessonId,
        lesson_path: `adventure_${adventureId}_module_${moduleId}_lesson_${lessonId}`,
      });
    }, 'lesson_started');
  };

  const trackLessonCompleted = (adventureId: number, moduleId: number, lessonId: number, duration?: number) => {
    safeTrack(() => {
      posthog.capture('lesson_completed', {
        adventure_id: adventureId,
        module_id: moduleId,
        lesson_id: lessonId,
        lesson_path: `adventure_${adventureId}_module_${moduleId}_lesson_${lessonId}`,
        duration_seconds: duration,
      });
    }, 'lesson_completed');
  };

  const trackQuizStarted = (adventureId: number, moduleId: number) => {
    safeTrack(() => {
      posthog.capture('quiz_started', {
        adventure_id: adventureId,
        module_id: moduleId,
        quiz_path: `adventure_${adventureId}_module_${moduleId}_quiz`,
      });
    }, 'quiz_started');
  };

  const trackQuizCompleted = (adventureId: number, moduleId: number, score: number, totalQuestions: number) => {
    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = percentage >= 40; // Based on 40% minimum from CLAUDE.md

    safeTrack(() => {
      posthog.capture('quiz_completed', {
        adventure_id: adventureId,
        module_id: moduleId,
        quiz_path: `adventure_${adventureId}_module_${moduleId}_quiz`,
        score,
        total_questions: totalQuestions,
        percentage,
        passed,
      });
    }, 'quiz_completed');
  };

  const trackModuleCompleted = (adventureId: number, moduleId: number) => {
    safeTrack(() => {
      posthog.capture('module_completed', {
        adventure_id: adventureId,
        module_id: moduleId,
        module_path: `adventure_${adventureId}_module_${moduleId}`,
      });
    }, 'module_completed');
  };

  const trackAdventureUnlocked = (adventureId: number) => {
    safeTrack(() => {
      posthog.capture('adventure_unlocked', {
        adventure_id: adventureId,
      });
    }, 'adventure_unlocked');
  };

  // Video engagement tracking
  const trackVideoPlayed = (videoUrl: string, adventureId?: number, moduleId?: number) => {
    safeTrack(() => {
      posthog.capture('video_played', {
        video_url: videoUrl,
        adventure_id: adventureId,
        module_id: moduleId,
        video_type: videoUrl.includes('cloudfront') ? 'aws_cloudfront' : 'local',
      });
    }, 'video_played');
  };

  const trackVideoCompleted = (videoUrl: string, duration: number, adventureId?: number, moduleId?: number) => {
    safeTrack(() => {
      posthog.capture('video_completed', {
        video_url: videoUrl,
        duration_seconds: duration,
        adventure_id: adventureId,
        module_id: moduleId,
        video_type: videoUrl.includes('cloudfront') ? 'aws_cloudfront' : 'local',
      });
    }, 'video_completed');
  };

  // Navigation tracking
  const trackScreenView = (screenName: string, params?: Record<string, any>) => {
    safeTrack(() => {
      posthog.screen(screenName, params);
    }, `screen_view_${screenName.toLowerCase().replace(/\s+/g, '_')}`);
  };

  // Audio tracking
  const trackAudioPlayed = (audioUrl: string, adventureId?: number, moduleId?: number) => {
    safeTrack(() => {
      posthog.capture('audio_played', {
        audio_url: audioUrl,
        adventure_id: adventureId,
        module_id: moduleId,
        audio_type: audioUrl.includes('cloudfront') ? 'aws_cloudfront' : 'local',
      });
    }, 'audio_played');
  };

  // Error tracking
  const trackError = (error: string, context?: Record<string, any>) => {
    safeTrack(() => {
      posthog.capture('error_occurred', {
        error_message: error,
        ...context,
      });
    }, 'error_occurred');
  };

  // App lifecycle
  const trackAppOpened = () => {
    safeTrack(() => {
      posthog.capture('app_opened');
    }, 'app_opened');
  };

  const trackAppBackgrounded = () => {
    safeTrack(() => {
      posthog.capture('app_backgrounded');
    }, 'app_backgrounded');
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

    // Error handling
    trackError,
    
    // App lifecycle
    trackAppOpened,
    trackAppBackgrounded,
    
    // Direct PostHog access for custom events
    posthog,
  };
}