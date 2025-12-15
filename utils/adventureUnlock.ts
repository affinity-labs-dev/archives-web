/**
 * Adventure Unlock Utility
 *
 * Determines which adventures should be locked/unlocked based on user progress.
 *
 * Unlock Rules:
 * - Adventure 1 (order_by: 1): Always OPEN (starting point)
 * - Adventures 2-5 (order_by: 2-5): LOCKED initially, unlock progressively
 * - Adventure 6+ (order_by: 6+): Always OPEN (bonus adventures)
 *
 * Progressive unlock: Complete all modules in Adventure N to unlock Adventure N+1
 */

import type { Adventure } from '@/components/shared/types';

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
