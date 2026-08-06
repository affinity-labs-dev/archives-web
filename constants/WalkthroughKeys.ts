// AsyncStorage keys for walkthrough hints
// These flags are shared across both Umayyad Dynasty and Rise of Islam eras
// User sees walkthrough only ONCE (first time they open that lesson type)

export const WALKTHROUGH_KEYS = {
  REEL: 'hasSeenReelWalkthrough',
  CAROUSEL: 'hasSeenCarouselWalkthrough',
  PULL_TO_REFRESH: 'hasSeenPullToRefreshHint',
  // Daily-story guided tour. Two-key pattern: PENDING is set by the
  // sign-up paths (onboarding-step-7 OAuth + onboarding-auth email signup)
  // and consumed (deleted) the first time the Today tab reads it. SEEN is
  // written when the tour finishes or is skipped, and gates auto-start so
  // the tour never replays after completion. Returning sign-in users never
  // touch PENDING, so they never see the tour. Bump the SEEN suffix when
  // STEPS array changes to re-show the new tour to existing users.
  DAILY_STORY_TOUR_PENDING: 'pendingDailyStoryTour',
  DAILY_STORY_TOUR_SEEN: 'hasSeenDailyStoryTour_v1',
} as const;

// AsyncStorage keys for adventure completion screens and XP milestones
// Tracks whether user has seen celebration screens
// - Adventure complete: Once per adventure (e.g., hasSeenAdventureComplete_roi-adventure-1)
// - XP milestone: Once per milestone (e.g., hasSeenXPMilestone_50, hasSeenXPMilestone_100)

export const ADVENTURE_KEYS = {
  getAdventureCompleteKey: (adventureId: string) => `hasSeenAdventureComplete_${adventureId}`,
  // Era-specific milestone keys: each era has its own milestone progression
  getXPMilestoneKey: (milestoneXP: number, eraId?: string) =>
    eraId ? `hasSeenXPMilestone_${eraId}_${milestoneXP}` : `hasSeenXPMilestone_${milestoneXP}`,
} as const;
