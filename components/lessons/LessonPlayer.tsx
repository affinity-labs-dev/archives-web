// LessonPlayer.tsx - Unified lesson orchestrator for all content types
// Automatically selects the correct renderer based on content_type
// Handles shared analytics, progress tracking, and completion logic

import React from 'react';
import type { ContentItem } from '@/components/shared/types';

// Import all lesson renderers
import ReelLesson from './ReelLesson';
import VideoCarouselLesson from './VideoCarouselLesson';
import ImageCarouselLesson from './ImageCarouselLesson';
import ScrollableMediaViewLesson from './ScrollableMediaViewLesson';

// Context interface for progress tracking & analytics
export interface LessonContext {
  eraId: string;        // "rise_of_islam", "umayyad", "abbasid"
  adventureId: string;  // "roi_adventure_1", "adv_2"
  moduleId: string;     // "media_1", "media_2"
  lessonId: string;     // "lesson1", "lesson2"
}

export interface LessonPlayerProps {
  // Content from Supabase (has content_type, media_url, questions, etc.)
  contentItem: ContentItem;

  // Context for progress tracking & analytics
  adventureId: string;
  moduleId: string;
  lessonId: string;

  // Callbacks
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

/**
 * LessonPlayer - Unified entry point for all lesson types
 *
 * Usage:
 * ```tsx
 * <LessonPlayer
 *   contentItem={selectedLesson.contentItem}
 *   adventureId={selectedLesson.adventureId}
 *   moduleId={selectedLesson.moduleId}
 *   lessonId={selectedLesson.lessonId}
 *   onContinue={handleLessonContinue}
 *   onDismiss={handleLessonDismiss}
 * />
 * ```
 *
 * Supported content_type values:
 * - "reel" → ReelLesson (video + reading card)
 * - "video_carousel" → VideoCarouselLesson (swipeable video gallery)
 * - "image_carousel" → ImageCarouselLesson (image gallery with music)
 * - "scrollable_media_view" → ScrollableMediaViewLesson (mixed content blocks)
 */
export default function LessonPlayer({
  contentItem,
  adventureId,
  moduleId,
  lessonId,
  onContinue,
  onDismiss,
  onBack,
}: LessonPlayerProps) {
  // Common props passed to all lesson renderers
  const commonProps = {
    contentItem,
    adventureId,
    moduleId,
    lessonId,
    onContinue,
    onDismiss,
    onBack,
  };

  // Render the appropriate lesson component based on content_type
  switch (contentItem.content_type) {
    case 'reel':
      return <ReelLesson {...commonProps} />;

    case 'video_carousel':
      return <VideoCarouselLesson {...commonProps} />;

    case 'image_carousel':
      return <ImageCarouselLesson {...commonProps} />;

    case 'scrollable_media_view':
      return <ScrollableMediaViewLesson {...commonProps} />;

    default:
      // Fallback for unknown content types - log warning and show reel
      console.warn(`⚠️ [LessonPlayer] Unknown content_type: "${contentItem.content_type}", falling back to reel`);
      return <ReelLesson {...commonProps} />;
  }
}

// Re-export individual lessons for direct usage if needed
export { ReelLesson, VideoCarouselLesson, ImageCarouselLesson, ScrollableMediaViewLesson };
