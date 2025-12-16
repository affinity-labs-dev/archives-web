/**
 * Adventure Unlock Utility
 *
 * Determines which adventures should be locked/unlocked based on user progress.
 * Also provides predictive preloading status based on completion percentage.
 *
 * Unlock Rules:
 * - Adventure 1 (order_by: 1): Always OPEN (starting point)
 * - Adventures 2-5 (order_by: 2-5): LOCKED initially, unlock progressively
 * - Adventure 6+ (order_by: 6+): Always OPEN (bonus adventures)
 *
 * Progressive unlock: Complete all modules in Adventure N to unlock Adventure N+1
 *
 * Preload Strategy (based on previous adventure progress):
 * - 0-59% complete → No preloading of next adventure
 * - 60-79% complete (3/5 modules) → Light preload (images only)
 * - 80%+ complete (4/5 modules) → Full preload (images + videos)
 * - 100% complete → Already unlocked, full preload
 */

import type { Adventure, ContentItem } from '@/components/shared/types';
import type { PreloadIntensity, ContentUrls, PreloadConfig } from '@/services/AdaptivePreloadService';

// User progress type (matches BentoGridScreen)
interface UserProgress {
  adventureId: string;
  moduleId: string;
  quizScore: number;
  quizCorrectAnswers?: number;
  isCompleted: boolean;
  quizCompleted: boolean;
  completedAt: string;
  era_id: string | number;
}

/**
 * Check if an adventure is complete (all modules finished)
 * An adventure is complete when ALL its content_list items have isCompleted && quizCompleted
 */
export function isAdventureComplete(
  adventure: Adventure,
  userProgress: UserProgress[]
): boolean {
  const modules = adventure.content_list || [];

  // No modules = not completable
  if (modules.length === 0) return false;

  // Take only displayed modules (first 5, matching BentoGridScreen logic)
  const displayedModules = [...modules]
    .sort((a, b) => a.order_by - b.order_by)
    .slice(0, 5);

  // Check if all displayed modules are completed
  const completedCount = displayedModules.filter(module => {
    const progress = userProgress.find(
      p => p.adventureId === adventure.readable_id && p.moduleId === module.id
    );
    return progress?.isCompleted && progress?.quizCompleted;
  }).length;

  return completedCount === displayedModules.length && displayedModules.length > 0;
}

/**
 * Check if an adventure should be unlocked
 *
 * @param adventure - The adventure to check
 * @param allAdventures - All adventures in the era (to find previous adventure)
 * @param userProgress - User's progress data
 * @returns true if unlocked, false if locked
 */
export function isAdventureUnlocked(
  adventure: Adventure,
  allAdventures: Adventure[],
  userProgress: UserProgress[]
): boolean {
  const orderBy = adventure.order_by;

  // Adventure 1: Always OPEN
  if (orderBy === 1) {
    return true;
  }

  // Adventure 6+: Always OPEN (bonus adventures)
  if (orderBy >= 6) {
    return true;
  }

  // Adventures 2-5: Check if previous adventure is complete
  const previousOrderBy = orderBy - 1;
  const previousAdventure = allAdventures.find(a => a.order_by === previousOrderBy);

  if (!previousAdventure) {
    // No previous adventure found - unlock by default
    console.log(`⚠️ No previous adventure found for order_by ${orderBy}, unlocking by default`);
    return true;
  }

  // Check if previous adventure is complete
  const isPreviousComplete = isAdventureComplete(previousAdventure, userProgress);

  console.log(`🔒 Adventure ${orderBy} unlock check:`, {
    previousAdventure: previousAdventure.readable_id,
    previousComplete: isPreviousComplete,
    result: isPreviousComplete ? 'UNLOCKED' : 'LOCKED'
  });

  return isPreviousComplete;
}

/**
 * Get unlock status for all adventures in an era
 * Returns a map of readable_id -> isUnlocked
 */
export function getAdventureUnlockStatus(
  adventures: Adventure[],
  userProgress: UserProgress[]
): Record<string, boolean> {
  const status: Record<string, boolean> = {};

  // Sort adventures by order_by to process in sequence
  const sortedAdventures = [...adventures].sort((a, b) => a.order_by - b.order_by);

  sortedAdventures.forEach(adventure => {
    status[adventure.readable_id] = isAdventureUnlocked(adventure, adventures, userProgress);
  });

  return status;
}

/**
 * Get the next locked adventure that will unlock when current is completed
 * Useful for showing "Complete to unlock Adventure X" messages
 */
export function getNextLockedAdventure(
  currentAdventure: Adventure,
  allAdventures: Adventure[],
  userProgress: UserProgress[]
): Adventure | null {
  const nextOrderBy = currentAdventure.order_by + 1;

  // Only adventures 2-5 can be "unlocked by completing previous"
  if (nextOrderBy < 2 || nextOrderBy > 5) {
    return null;
  }

  const nextAdventure = allAdventures.find(a => a.order_by === nextOrderBy);

  if (nextAdventure && !isAdventureUnlocked(nextAdventure, allAdventures, userProgress)) {
    return nextAdventure;
  }

  return null;
}

// ============================================================================
// Preload Status Types & Functions
// ============================================================================

export interface AdventurePreloadStatus {
  isUnlocked: boolean;
  progressPercent: number;
  preloadIntensity: PreloadIntensity;
  shouldPreload: boolean;
}

/**
 * Calculate completion percentage for an adventure
 * Returns 0-100 based on how many modules are completed
 */
export function getAdventureProgress(
  adventure: Adventure,
  userProgress: UserProgress[]
): number {
  const modules = adventure.content_list || [];

  if (modules.length === 0) return 0;

  // Take only displayed modules (first 5, matching BentoGridScreen logic)
  const displayedModules = [...modules]
    .sort((a, b) => a.order_by - b.order_by)
    .slice(0, 5);

  if (displayedModules.length === 0) return 0;

  // Count completed modules
  const completedCount = displayedModules.filter(module => {
    const progress = userProgress.find(
      p => p.adventureId === adventure.readable_id && p.moduleId === module.id
    );
    return progress?.isCompleted && progress?.quizCompleted;
  }).length;

  return Math.round((completedCount / displayedModules.length) * 100);
}

/**
 * Determine preload intensity based on previous adventure progress
 *
 * Thresholds:
 * - 60%+ (3/5 modules) → 'light' (images only)
 * - 80%+ (4/5 modules) → 'full' (images + videos)
 * - Already unlocked → 'full'
 */
export function getPreloadIntensity(
  previousProgress: number,
  isUnlocked: boolean
): PreloadIntensity {
  // Already unlocked = full preload
  if (isUnlocked) {
    return 'full';
  }

  // 80%+ = user is almost done, preload everything
  if (previousProgress >= 80) {
    return 'full';
  }

  // 60%+ = start light preloading (images only)
  if (previousProgress >= 60) {
    return 'light';
  }

  // Not enough progress yet
  return 'none';
}

/**
 * Get preload status for a single adventure
 * Considers unlock status and previous adventure's progress
 */
export function getAdventurePreloadStatus(
  adventure: Adventure,
  allAdventures: Adventure[],
  userProgress: UserProgress[]
): AdventurePreloadStatus {
  const isUnlocked = isAdventureUnlocked(adventure, allAdventures, userProgress);

  // If unlocked, always full preload
  if (isUnlocked) {
    return {
      isUnlocked: true,
      progressPercent: 100,
      preloadIntensity: 'full',
      shouldPreload: true,
    };
  }

  // Find previous adventure to check its progress
  const previousAdventure = allAdventures.find(a => a.order_by === adventure.order_by - 1);

  if (!previousAdventure) {
    return {
      isUnlocked: false,
      progressPercent: 0,
      preloadIntensity: 'none',
      shouldPreload: false,
    };
  }

  // Get previous adventure's progress percentage
  const previousProgress = getAdventureProgress(previousAdventure, userProgress);
  const intensity = getPreloadIntensity(previousProgress, false);

  return {
    isUnlocked: false,
    progressPercent: previousProgress,
    preloadIntensity: intensity,
    shouldPreload: intensity !== 'none',
  };
}

/**
 * Get preload status for all adventures in an era
 * Returns a map of readable_id -> AdventurePreloadStatus
 */
export function getAllAdventurePreloadStatus(
  adventures: Adventure[],
  userProgress: UserProgress[],
  config?: PreloadConfig
): Record<string, AdventurePreloadStatus> {
  const status: Record<string, AdventurePreloadStatus> = {};

  // Sort adventures by order_by to process in sequence
  const sortedAdventures = [...adventures].sort((a, b) => a.order_by - b.order_by);

  sortedAdventures.forEach((adventure, index) => {
    const adventureStatus = getAdventurePreloadStatus(adventure, adventures, userProgress);

    // Apply config limits if provided
    if (config) {
      // First adventure (unlocked) always preloads
      if (index === 0) {
        status[adventure.readable_id] = adventureStatus;
        return;
      }

      // Check if we should preload next adventure based on config
      if (!adventureStatus.isUnlocked) {
        const shouldPreloadNext = config.preloadNextAdventure;
        const shouldPreloadLocked = config.preloadFirstLocked;

        // Find if this is the first locked adventure
        const isFirstLocked = !sortedAdventures
          .slice(0, index)
          .some(a => !isAdventureUnlocked(a, adventures, userProgress) === false);

        if (!shouldPreloadNext && !adventureStatus.isUnlocked) {
          adventureStatus.preloadIntensity = 'none';
          adventureStatus.shouldPreload = false;
        }

        if (!shouldPreloadLocked && isFirstLocked) {
          // Keep light preload if close to unlocking
          if (adventureStatus.progressPercent < 60) {
            adventureStatus.preloadIntensity = 'none';
            adventureStatus.shouldPreload = false;
          }
        }
      }
    }

    status[adventure.readable_id] = adventureStatus;
  });

  return status;
}

/**
 * Extract all preloadable content URLs from an adventure
 */
export function extractAdventureContentUrls(adventure: Adventure): ContentUrls {
  const images: string[] = [];
  const videos: string[] = [];

  const modules = (adventure.content_list || []).slice(0, 5);

  for (const module of modules) {
    // Extract thumbnail/cover image
    if (module.thumbnail_url) {
      images.push(module.thumbnail_url);
    }

    // Extract media URLs based on content type
    if (module.media_url && Array.isArray(module.media_url)) {
      const contentType = module.content_type?.toLowerCase() || '';

      if (contentType === 'reel' || contentType === 'video_carousel') {
        // Video content
        videos.push(...module.media_url.filter(Boolean));
      } else if (contentType === 'image_carousel' || contentType === 'static_image') {
        // Image content
        images.push(...module.media_url.filter(Boolean));
      }
    }
  }

  return {
    images: [...new Set(images)], // Dedupe
    videos: [...new Set(videos)], // Dedupe
  };
}
