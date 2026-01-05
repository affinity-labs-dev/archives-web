// PuzzleEngagementContext.tsx
// React context for managing smart puzzle engagement
// Listens to BehaviorTrackerService and shows puzzle prompts at optimal times

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { behaviorTrackerService, ScreenType, ContentAction } from '@/services/BehaviorTrackerService';
import { analyticsService } from '@/services/AnalyticsService';

interface PuzzleEngagementContextType {
  // State
  showPuzzlePrompt: boolean;
  promptReason: 'celebration' | 'idle' | null;

  // Actions
  dismissPrompt: () => void;
  acceptPrompt: () => void;

  // Tracking methods (to be called from screens)
  trackScreenChange: (screen: ScreenType, metadata?: Record<string, any>) => void;
  trackContentAction: (action: ContentAction, metadata?: Record<string, any>) => void;
  trackIdle: (seconds: number) => void;
  trackScrollActivity: (metadata?: Record<string, any>) => void;

  // Manual trigger (for testing)
  manualTrigger: () => void;
}

const PuzzleEngagementContext = createContext<PuzzleEngagementContextType | undefined>(undefined);

export const PuzzleEngagementProvider = ({ children }: { children: ReactNode }) => {
  const [showPuzzlePrompt, setShowPuzzlePrompt] = useState(false);
  const [promptReason, setPromptReason] = useState<'celebration' | 'idle' | null>(null);

  // Initialize behavior tracker on mount
  useEffect(() => {
    behaviorTrackerService.initialize();
    console.log('🎮 [PuzzleEngagement] Context initialized');
  }, []);

  // Subscribe to trigger events from behavior tracker
  useEffect(() => {
    const unsubscribe = behaviorTrackerService.onTrigger((shouldTrigger) => {
      if (shouldTrigger && !showPuzzlePrompt) {
        // Determine reason based on recent events
        const stats = behaviorTrackerService.getSessionStats();
        const reason = stats.completions.adventures > 0 ? 'celebration' : 'idle';

        setPromptReason(reason);
        setShowPuzzlePrompt(true);

        console.log(`🎉 [PuzzleEngagement] Showing prompt (${reason})`);

        // Track analytics
        analyticsService.trackCustomEvent('puzzle_prompt_shown', {
          reason,
          session_duration: stats.sessionDuration,
          completions: stats.completions,
        });
      }
    });

    return unsubscribe;
  }, [showPuzzlePrompt]);

  // Dismiss prompt
  const dismissPrompt = useCallback(() => {
    setShowPuzzlePrompt(false);
    setPromptReason(null);
    behaviorTrackerService.markPuzzleDismissed();

    console.log('❌ [PuzzleEngagement] Prompt dismissed');

    analyticsService.trackCustomEvent('puzzle_prompt_dismissed', {
      reason: promptReason,
    });
  }, [promptReason]);

  // Accept prompt (user clicked to play puzzle)
  const acceptPrompt = useCallback(() => {
    setShowPuzzlePrompt(false);
    behaviorTrackerService.markPuzzleShown();

    console.log('✅ [PuzzleEngagement] Prompt accepted');

    analyticsService.trackCustomEvent('puzzle_prompt_accepted', {
      reason: promptReason,
    });

    // Note: Actual GameHub opening is handled by the component that called acceptPrompt
  }, [promptReason]);

  // Tracking methods (pass-through to service)
  const trackScreenChange = useCallback((screen: ScreenType, metadata?: Record<string, any>) => {
    behaviorTrackerService.trackScreenChange(screen, metadata);
  }, []);

  const trackContentAction = useCallback((action: ContentAction, metadata?: Record<string, any>) => {
    behaviorTrackerService.trackContentAction(action, metadata);
  }, []);

  const trackIdle = useCallback((seconds: number) => {
    behaviorTrackerService.trackIdle(seconds);
  }, []);

  const trackScrollActivity = useCallback((metadata?: Record<string, any>) => {
    behaviorTrackerService.trackScrollActivity(metadata);
  }, []);

  // Manual trigger (for testing)
  const manualTrigger = useCallback(() => {
    console.log('🧪 [PuzzleEngagement] Manual trigger');
    setPromptReason('celebration');
    setShowPuzzlePrompt(true);
  }, []);

  const value: PuzzleEngagementContextType = {
    showPuzzlePrompt,
    promptReason,
    dismissPrompt,
    acceptPrompt,
    trackScreenChange,
    trackContentAction,
    trackIdle,
    trackScrollActivity,
    manualTrigger,
  };

  return (
    <PuzzleEngagementContext.Provider value={value}>
      {children}
    </PuzzleEngagementContext.Provider>
  );
};

// Custom hook to use puzzle engagement context
export const usePuzzleEngagement = () => {
  const context = useContext(PuzzleEngagementContext);
  if (!context) {
    throw new Error('usePuzzleEngagement must be used within PuzzleEngagementProvider');
  }
  return context;
};
