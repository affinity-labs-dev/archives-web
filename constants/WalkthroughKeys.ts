// AsyncStorage keys for walkthrough hints
// These flags are shared across both Umayyad Dynasty and Rise of Islam eras
// User sees walkthrough only ONCE (first time they open that lesson type)

export const WALKTHROUGH_KEYS = {
  REEL: 'hasSeenReelWalkthrough',
  CAROUSEL: 'hasSeenCarouselWalkthrough',
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
