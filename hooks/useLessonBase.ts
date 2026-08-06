// useLessonBase.ts - Shared logic for all lesson types
// Extracts common setup code to reduce duplication across lesson components

import { useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { WALKTHROUGH_KEYS } from '@/constants/WalkthroughKeys';
import { useLessonTracking } from '@/hooks/useLessonTracking';
import { useGamifiedProgress, type ProgressEntry } from '@/gamification';
import { analyticsService } from '@/services/AnalyticsService';
import type { ContentItem } from '@/components/shared/types';

// Lesson type for analytics and walkthrough
export type LessonType = 'reel' | 'video_carousel' | 'image_carousel' | 'scrollable_media';

// Walkthrough key mapping
const WALKTHROUGH_KEY_MAP: Record<LessonType, string | null> = {
  reel: WALKTHROUGH_KEYS.REEL,
  video_carousel: WALKTHROUGH_KEYS.CAROUSEL,
  image_carousel: WALKTHROUGH_KEYS.CAROUSEL,
  scrollable_media: null, // No walkthrough for scrollable
};

interface UseLessonBaseProps {
  contentItem: ContentItem;
  adventureId: string;
  moduleId: string;
  lessonId: string;
  lessonType: LessonType;
  eraId: string;      // Era ID from adventure (e.g., "rise_of_islam", "umayyad")
  eraName: string;    // Era display name (from card_content.era_name)
  onContinue: () => void;
}

interface UseLessonBaseReturn {
  // Computed values
  adventureNumber: number;
  moduleNumber: number;

  // Walkthrough state
  walkthroughEnabled: boolean;

  // Analytics tracking functions
  tracking: {
    trackVideoPlay: (videoDuration?: number) => void;
    trackVideoPause: (position: number, duration: number) => void;
    trackVideoComplete: (videoDuration?: number) => void;
    trackCardExpanded: () => void;
    trackLessonComplete: () => void;
    trackDismiss: () => void;
  };

  // Completion handler (saves walkthrough flag + tracks + calls onContinue)
  handleLessonComplete: () => Promise<void>;
}

/**
 * useLessonBase - Shared hook for all lesson types
 *
 * Handles:
 * - Adventure/module number extraction
 * - Walkthrough enabled check (AsyncStorage)
 * - Analytics tracking setup
 * - Lesson completion with walkthrough save
 *
 * Usage:
 * ```tsx
 * const { adventureNumber, walkthroughEnabled, tracking, handleLessonComplete } = useLessonBase({
 *   contentItem,
 *   adventureId,
 *   moduleId,
 *   lessonId,
 *   lessonType: 'reel',
 *   onContinue,
 * });
 * ```
 */
export function useLessonBase({
  contentItem,
  adventureId,
  moduleId,
  lessonId,
  lessonType,
  eraId,
  eraName,
  onContinue,
}: UseLessonBaseProps): UseLessonBaseReturn {
  // Extract adventure number from adventureId (e.g., "roi_adventure_1" → 1)
  const adventureNumber = parseInt(adventureId.split('_')[2] || '0', 10);
  const moduleNumber = contentItem.order_by || 0;

  // Progress context for saving lesson completion
  const { saveNewProgressData, getProgressByStringIds } = useGamifiedProgress();

  // Walkthrough state
  const [walkthroughEnabled, setWalkthroughEnabled] = useState(false);

  // Get walkthrough key for this lesson type
  const walkthroughKey = WALKTHROUGH_KEY_MAP[lessonType];

  // Check if user has seen walkthrough before
  useEffect(() => {
    const checkWalkthrough = async () => {
      if (!walkthroughKey) {
        // No walkthrough for this lesson type
        setWalkthroughEnabled(false);
        return;
      }

      try {
        const hasSeen = await AsyncStorage.getItem(walkthroughKey);
        if (hasSeen !== 'true') {
          setWalkthroughEnabled(true);
          console.log(`👁️ ${lessonType} walkthrough enabled - first time`);
        } else {
          console.log(`👁️ ${lessonType} walkthrough disabled - already seen`);
        }
      } catch (error) {
        console.error(`❌ Error checking ${lessonType} walkthrough:`, error);
      }
    };

    checkWalkthrough();
  }, [walkthroughKey, lessonType]);

  // Time tracking for dismiss events
  const mountTimeRef = useRef(Date.now());

  // Analytics tracking (era-agnostic)
  const lessonTracking = useLessonTracking({
    adventureId,
    moduleId,
    lessonId,
    lessonType,
    lessonTitle: contentItem.thumbnail_title || 'Unknown',
    screenUrl: `/${eraId}/${adventureId}/${moduleId}/${lessonId}`,
    eraId,
    eraName,
    adventureNumber,
    moduleNumber,
    screen: `Lesson - ${adventureId} ${lessonId}`,
  });

  const trackDismiss = useCallback(() => {
    const timeSpent = Math.round((Date.now() - mountTimeRef.current) / 1000);
    analyticsService.trackLessonDismissed({
      adventure_id: adventureId,
      module_id: moduleId,
      lesson_id: lessonId,
      lesson_type: lessonType,
      time_spent_seconds: timeSpent,
      era_id: eraId,
      era_name: eraName,
    });
  }, [adventureId, moduleId, lessonId, lessonType, eraId, eraName]);

  const tracking = { ...lessonTracking, trackDismiss };

  // Handle lesson completion
  const handleLessonComplete = useCallback(async () => {
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Track lesson completion
    tracking.trackLessonComplete();

    // Save walkthrough flag (if applicable)
    if (walkthroughKey) {
      try {
        await AsyncStorage.setItem(walkthroughKey, 'true');
        console.log(`✅ ${lessonType} walkthrough marked as seen`);
      } catch (error) {
        console.error(`❌ Error saving ${lessonType} walkthrough flag:`, error);
      }
    }

    // SAVE LESSON COMPLETION TO PROGRESS SYSTEM
    try {
      console.log(`💾 Saving lesson completion: ${eraId}:${adventureId}:${moduleId}:${lessonId}`);

      // Read existing module progress from React state (SOURCE OF TRUTH)
      // This avoids race conditions with AsyncStorage reads
      const existingModule = getProgressByStringIds(adventureId, moduleId);

      // Get existing lessons or create empty array
      const existingLessons = existingModule?.lessonsCompleted || [];

      // Add this lesson if not already tracked (prevent duplicates)
      if (!existingLessons.includes(lessonId)) {
        const updatedLessons = [...existingLessons, lessonId];

        // Save progress data with updated lessons
        await saveNewProgressData({
          era_id: eraId,
          adventureId,
          moduleId,
          lessonsCompleted: updatedLessons,
          quizCompleted: existingModule?.quizCompleted || false,
          quizScore: existingModule?.quizScore || 0,
          quizCorrectAnswers: existingModule?.quizCorrectAnswers || 0,
          isCompleted: existingModule?.isCompleted || false,
          completedAt: existingModule?.completedAt || new Date().toISOString(),
        });

        console.log(`✅ Lesson ${lessonId} saved to progress (${updatedLessons.length} total lessons)`);
      } else {
        console.log(`⚠️ Lesson ${lessonId} already completed - skipping save`);
      }
    } catch (error) {
      console.error(`❌ Error saving lesson completion:`, error);
      // Don't block user flow if save fails
    }

    console.log(`🔄 Continue button pressed - ${moduleId} ${lessonId}`);
    onContinue();
  }, [tracking, walkthroughKey, lessonType, moduleId, lessonId, onContinue, saveNewProgressData, getProgressByStringIds, eraId, adventureId]);

  return {
    adventureNumber,
    moduleNumber,
    walkthroughEnabled,
    tracking,
    handleLessonComplete,
  };
}

export default useLessonBase;
