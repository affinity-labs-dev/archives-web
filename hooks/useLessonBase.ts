// useLessonBase.ts - Shared logic for all lesson types
// Extracts common setup code to reduce duplication across lesson components

import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { WALKTHROUGH_KEYS } from '@/constants/WalkthroughKeys';
import { useLessonTracking } from '@/hooks/useLessonTracking';
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
    trackVideoPlay: () => void;
    trackVideoPause: () => void;
    trackVideoComplete: (duration: number) => void;
    trackCardExpanded: () => void;
    trackLessonComplete: () => void;
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

  // Analytics tracking (era-agnostic)
  const tracking = useLessonTracking({
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

    console.log(`🔄 Continue button pressed - ${moduleId} ${lessonId}`);
    onContinue();
  }, [tracking, walkthroughKey, lessonType, moduleId, lessonId, onContinue]);

  return {
    adventureNumber,
    moduleNumber,
    walkthroughEnabled,
    tracking,
    handleLessonComplete,
  };
}

export default useLessonBase;
