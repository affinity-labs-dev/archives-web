# Gamification Restructure Plan

This document outlines the migration plan to unify all gamification + AI features into a single `gamification/` folder.

## Files to Migrate

### From hooks/
| File                    | Lines | Purpose                    |
|-------------------------|-------|----------------------------|
| useAIRecommendations.ts | ~190  | AI-powered recommendations |
| useQuizSounds.ts        | ~66   | Quiz sound effects         |
| useQuizTracking.ts      | ~200  | Quiz analytics tracking    |

### From types/
| File        | Lines | Purpose                   |
|-------------|-------|---------------------------|
| games.ts    | ~160  | Game type definitions     |
| progress.ts | ~80   | Progress type definitions |

---

## Updated Complete Structure

```
gamification/
│
├── index.ts                        # Public exports
│
├── engines/                        # THE BRAINS
│   ├── GamificationEngine.tsx      # All gamification logic (~2,200 lines)
│   │                               # MERGES: GamificationOrchestrator, useAchievements,
│   │                               # RewardsContext, useDailyStreak, useLevel,
│   │                               # PuzzleEngagementContext
│   │
│   └── AIEngine.tsx                # All AI logic (~1,500 lines)
│                                   # MERGES: AIContext, useAIRecommendations
│
├── services/                       # Specialized services (FROM services/)
│   ├── AIService.ts                # Gemini API calls
│   ├── AIContextService.ts         # Lesson content for AI
│   ├── AIStorageService.ts         # Message persistence
│   ├── GameGeneratorService.ts     # AI game generation
│   └── BehaviorTrackerService.ts   # User behavior tracking
│
├── hooks/                          # Specialized hooks (FROM hooks/)
│   ├── useQuizSounds.ts            # Quiz sound effects
│   ├── useQuizTracking.ts          # Quiz analytics
│   ├── useCelebrationVideoPlayer.ts # Video player for celebrations
│   ├── useGameDragDrop.ts          # Game drag-drop logic
│   ├── useGameTimer.ts             # Game timer logic
│   ├── useSnapToGrid.ts            # Grid snapping for games
│   └── useJigsawLogic.ts           # Jigsaw-specific logic
│
├── types/                          # Type definitions (FROM types/)
│   ├── games.ts                    # Game types
│   └── gamification.ts             # Combined types (progress + gamification)
│
└── ui/
    ├── celebrations/               # Celebration screens
    │   ├── XPMilestoneScreen.tsx
    │   ├── AdventureCompleteScreen.tsx
    │   ├── AchievementUnlockAnimation.tsx
    │   ├── LevelUpAnimation.tsx
    │   ├── AvatarUnlockAnimation.tsx
    │   └── AvatarUnlockNotification.tsx
    │
    ├── displays/                   # Badges, modals
    │   ├── AchievementDetailModal.tsx
    │   ├── LevelBadge.tsx
    │   └── StreakBadge.tsx
    │
    ├── games/                      # Game UI
    │   ├── GameHub.tsx
    │   ├── GameContainer.tsx
    │   ├── GameModeSelector.tsx
    │   ├── GameResults.tsx
    │   ├── GameTimer.tsx
    │   ├── PuzzlePrompt.tsx
    │   ├── PuzzlePromptWrapper.tsx
    │   ├── JigsawGame.tsx
    │   ├── JigsawBoard.tsx
    │   ├── JigsawPiece.tsx
    │   ├── PuzzlePieceShape.tsx
    │   └── PuzzleEdgeMap.ts
    │
    ├── ai/                         # AI UI
    │   ├── AIChatModal.tsx
    │   ├── FloatingAIButton.tsx
    │   ├── AIRecommendationCard.tsx
    │   └── AIAssistant.tsx
    │
    └── GamificationDebug.tsx
```

---

## Complete Migration Map

| From | To | Action |
|------|-----|--------|
| **MERGE INTO GamificationEngine.tsx** |||
| components/gamification/GamificationOrchestrator.ts | engines/ | Merge |
| hooks/useAchievements.ts | engines/ | Merge |
| context/RewardsContext.tsx | engines/ | Merge |
| context/PuzzleEngagementContext.tsx | engines/ | Merge |
| hooks/useDailyStreak.ts | engines/ | Merge |
| hooks/useLevel.ts | engines/ | Merge |
| **MERGE INTO AIEngine.tsx** |||
| context/AIContext.tsx | engines/ | Merge |
| hooks/useAIRecommendations.ts | engines/ | Merge |
| **MOVE services/** |||
| services/AIService.ts | gamification/services/ | Move |
| services/AIContextService.ts | gamification/services/ | Move |
| services/AIStorageService.ts | gamification/services/ | Move |
| services/GameGeneratorService.ts | gamification/services/ | Move |
| services/BehaviorTrackerService.ts | gamification/services/ | Move |
| **MOVE hooks/** |||
| hooks/useQuizSounds.ts | gamification/hooks/ | Move |
| hooks/useQuizTracking.ts | gamification/hooks/ | Move |
| hooks/useCelebrationVideoPlayer.ts | gamification/hooks/ | Move |
| hooks/useGameDragDrop.ts | gamification/hooks/ | Move |
| hooks/useGameTimer.ts | gamification/hooks/ | Move |
| hooks/useSnapToGrid.ts | gamification/hooks/ | Move |
| components/gamification/games/Jigsaw/useJigsawLogic.ts | gamification/hooks/ | Move |
| **MOVE types/** |||
| types/games.ts | gamification/types/ | Move |
| types/progress.ts | gamification/types/ | Copy (still needed elsewhere) |
| **MOVE UI** |||
| components/gamification/*.tsx | gamification/ui/ | Reorganize |
| components/gamification/shared/* | gamification/ui/games/ | Move |
| components/gamification/games/Jigsaw/*.tsx | gamification/ui/games/ | Move |
| components/AvatarUnlockAnimation.tsx | gamification/ui/celebrations/ | Move |
| components/AvatarUnlockNotification.tsx | gamification/ui/celebrations/ | Move |
| components/ai/*.tsx | gamification/ui/ai/ | Move |

---

## Summary

| Category | Files | Lines |
|----------|-------|-------|
| **Engines** | 2 | ~3,700 |
| **Services** | 5 | ~2,800 |
| **Hooks** | 7 | ~1,100 |
| **Types** | 2 | ~240 |
| **UI** | 22 | ~5,600 |
| **Total** | **38 files** | **~13,440 lines** |

---

## How It Works

### App Provider Hierarchy
```tsx
<GamificationProvider>
  <AIProvider>
    <App />
  </AIProvider>
</GamificationProvider>
```

### Usage
```tsx
// Access all gamification features with ONE hook
const {
  xp, level, streak, achievements, rewards,
  trackQuizComplete, showCelebration, unlockAvatar
} = useGamification();

// Access all AI features with ONE hook
const {
  sendMessage, messages, recommendations
} = useAI();
```

---

## Related Files

- `gamification-restructure.json` - Programmatic migration data
- `GAMIFICATION-RESTRUCTURE.md` - This documentation
