/**
 * useAdventurePreloader.ts
 *
 * React hook for adaptive content preloading based on adventure unlock status
 * and user progress. Integrates with AdaptivePreloadService and adventure unlock system.
 *
 * Features:
 * - Predictive preloading (starts when user is 60%+ through previous adventure)
 * - Device-aware limits (low/medium/high tier devices)
 * - Network-aware (aggressive on WiFi, conservative on cellular)
 * - Automatic cleanup on unmount
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Adventure } from '@/components/shared/types';
import AdaptivePreloadService, {
  getPreloadConfig,
  preloadAdventureContent,
  releaseVideoPreloads,
  setupNetworkListener,
  getPreloadStats,
  PreloadConfig,
} from '@/services/AdaptivePreloadService';
import {
  getAllAdventurePreloadStatus,
  extractAdventureContentUrls,
  AdventurePreloadStatus,
} from '@/utils/adventureUnlock';

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

interface PreloaderState {
  isLoading: boolean;
  config: PreloadConfig | null;
  preloadStatus: Record<string, AdventurePreloadStatus>;
  stats: {
    preloadedImages: number;
    preloadedVideos: number;
    activeVideoPlayers: number;
  };
}

interface UseAdventurePreloaderResult {
  state: PreloaderState;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage adventure content preloading
 *
 * @param adventures - List of adventures to manage preloading for
 * @param userProgress - User's progress data
 * @param enabled - Whether preloading is enabled (default: true)
 */
export function useAdventurePreloader(
  adventures: Adventure[],
  userProgress: UserProgress[],
  enabled: boolean = true
): UseAdventurePreloaderResult {
  const [state, setState] = useState<PreloaderState>({
    isLoading: false,
    config: null,
    preloadStatus: {},
    stats: { preloadedImages: 0, preloadedVideos: 0, activeVideoPlayers: 0 },
  });

  // Track which adventures we've already preloaded to avoid duplicates
  const preloadedAdventuresRef = useRef<Set<string>>(new Set());

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Stable signature for the parts of `userProgress` that actually drive
  // preloading decisions (which modules are completed). Without this, the
  // outer `userProgress` array reference changes on every quiz tick or
  // store update, which would re-fire the heavy `runPreloading` effect
  // even when the completion set hasn't changed. Sorting + joining the
  // completed module ids gives a string that's `===`-equal across
  // reference-only changes, so the effect re-runs only on real progress.
  const completionFingerprint = useMemo(() => {
    const ids: string[] = [];
    for (const p of userProgress) {
      if (p.isCompleted && p.quizCompleted) ids.push(`${p.adventureId}|${p.moduleId}`);
    }
    return ids.sort().join(',');
  }, [userProgress]);

  // Latest userProgress in a ref so `runPreloading` can read it without
  // listing the array as a dep (which would defeat the fingerprint).
  const userProgressRef = useRef(userProgress);
  userProgressRef.current = userProgress;

  /**
   * Main preloading logic
   */
  const runPreloading = useCallback(async () => {
    if (!enabled || adventures.length === 0) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Get device/network-aware config
      const config = await getPreloadConfig();

      if (!isMountedRef.current) return;

      // Calculate preload status for all adventures. Read userProgress from
      // the ref so we always see the latest snapshot without listing the
      // raw array as a dep (which would defeat `completionFingerprint`).
      const preloadStatus = getAllAdventurePreloadStatus(adventures, userProgressRef.current, config);

      setState(prev => ({ ...prev, config, preloadStatus }));

      // Sort adventures by order_by for sequential processing
      const sortedAdventures = [...adventures].sort((a, b) => a.order_by - b.order_by);

      // Log adventure unlock status
      const unlockedAdventures = sortedAdventures.filter(a => preloadStatus[a.readable_id]?.isUnlocked);
      const lockedAdventures = sortedAdventures.filter(a => !preloadStatus[a.readable_id]?.isUnlocked);
      console.log(`🔓 [Preloader] Unlocked adventures: ${unlockedAdventures.map(a => a.readable_id).join(', ') || 'none'}`);
      console.log(`🔒 [Preloader] Locked adventures: ${lockedAdventures.map(a => a.readable_id).join(', ') || 'none'}`);

      // Track what we preload for summary
      const preloadedSummary: string[] = [];

      // Process each adventure that needs preloading
      for (const adventure of sortedAdventures) {
        if (!isMountedRef.current) break;

        const status = preloadStatus[adventure.readable_id];

        // Skip if no preloading needed or already preloaded
        if (!status?.shouldPreload) continue;
        if (preloadedAdventuresRef.current.has(adventure.readable_id)) continue;

        // Extract content URLs
        const contentUrls = extractAdventureContentUrls(adventure);

        // Skip if no content to preload
        if (contentUrls.images.length === 0 && contentUrls.videos.length === 0) {
          continue;
        }

        console.log(`🚀 [Preloader] Preloading "${adventure.adventure_title}" (${adventure.readable_id}):`);
        console.log(`   📸 Images (${contentUrls.images.length}): ${contentUrls.images.slice(0, 3).map(url => url.split('/').pop()).join(', ')}${contentUrls.images.length > 3 ? '...' : ''}`);
        console.log(`   🎬 Videos (${contentUrls.videos.length}): ${contentUrls.videos.slice(0, 2).map(url => url.split('/').pop()).join(', ')}${contentUrls.videos.length > 2 ? '...' : ''}`);

        // Preload content based on intensity
        await preloadAdventureContent(contentUrls, status.preloadIntensity, config);

        // Mark as preloaded
        preloadedAdventuresRef.current.add(adventure.readable_id);
        preloadedSummary.push(`${adventure.adventure_title} (${contentUrls.images.length} imgs, ${contentUrls.videos.length} vids)`);

        // Update stats
        if (isMountedRef.current) {
          const stats = getPreloadStats();
          setState(prev => ({ ...prev, stats }));
        }
      }

      // Log completion summary
      if (preloadedSummary.length > 0) {
        const finalStats = getPreloadStats();
        console.log(`✅ [Preloader] Complete! Preloaded ${preloadedSummary.length} adventure(s): ${preloadedSummary.join(', ')}`);
        console.log(`📦 [Preloader] Total cached: ${finalStats.preloadedImages} images, ${finalStats.preloadedVideos} videos, ${finalStats.activeVideoPlayers} video players`);
      } else {
        console.log(`⏭️ [Preloader] No new adventures to preload (already cached or not needed)`);
      }
    } catch (error) {
      console.error('❌ [Preloader] Error:', error);
    } finally {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
    // `completionFingerprint` replaces `userProgress` here so the callback
    // identity only changes when the set of completed modules changes —
    // not on every Zustand snapshot tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adventures, completionFingerprint, enabled]);

  /**
   * Force refresh preloading (e.g., after progress update)
   */
  const refresh = useCallback(async () => {
    // Clear preloaded tracking to allow re-preloading with new progress
    preloadedAdventuresRef.current.clear();
    await runPreloading();
  }, [runPreloading]);

  // Run preloading when dependencies change
  useEffect(() => {
    runPreloading();
  }, [runPreloading]);

  // Setup network listener to refresh config on network change
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = setupNetworkListener();
    return () => {
      unsubscribe();
    };
  }, [enabled]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Release video players to free memory
      releaseVideoPreloads();
      console.log('🧹 [Preloader] Cleanup complete');
    };
  }, []);

  return { state, refresh };
}

/**
 * Simplified hook for preloading a single adventure's content
 * Useful for module-level preloading within an adventure
 */
export function useSingleAdventurePreloader(
  adventure: Adventure | null,
  enabled: boolean = true
): { isLoading: boolean } {
  const [isLoading, setIsLoading] = useState(false);
  const hasPreloadedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !adventure || hasPreloadedRef.current) {
      return;
    }

    const preload = async () => {
      setIsLoading(true);
      try {
        const config = await getPreloadConfig();
        const contentUrls = extractAdventureContentUrls(adventure);

        if (contentUrls.images.length > 0 || contentUrls.videos.length > 0) {
          await preloadAdventureContent(contentUrls, 'full', config);
          hasPreloadedRef.current = true;
        }
      } catch (error) {
        console.error('❌ [SinglePreloader] Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    preload();
  }, [adventure, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseVideoPreloads();
    };
  }, []);

  return { isLoading };
}

export default useAdventurePreloader;
