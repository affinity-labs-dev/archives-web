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
├── hooks/                          # Game-specific hooks only
│   ├── useGameDragDrop.ts          # Game drag-drop logic ✅
│   ├── useGameTimer.ts             # Game timer logic ✅
│   ├── useSnapToGrid.ts            # Grid snapping for games ✅
│   └── useJigsawLogic.ts           # Jigsaw-specific logic ✅
│
# NOTE: These stay in hooks/ (not gamification/):
#   - useQuizSounds.ts
#   - useQuizTracking.ts
#   - useCelebrationVideoPlayer.ts
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
| hooks/useGameDragDrop.ts | gamification/hooks/ | ✅ Moved |
| hooks/useGameTimer.ts | gamification/hooks/ | ✅ Already there |
| hooks/useSnapToGrid.ts | gamification/hooks/ | ✅ Moved |
| components/gamification/games/Jigsaw/useJigsawLogic.ts | gamification/hooks/ | ✅ Already there |
| **KEEP IN hooks/ (not moving)** |||
| hooks/useQuizSounds.ts | hooks/ | ⏸️ Keep in place |
| hooks/useQuizTracking.ts | hooks/ | ⏸️ Keep in place |
| hooks/useCelebrationVideoPlayer.ts | hooks/ | ⏸️ Keep in place |
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

## Programmatic Migration Data (JSON)

```json
{
  "name": "gamification",
  "description": "Unified gamification + AI system",
  "targetPath": "gamification/",
  "totalFiles": 38,
  "totalLines": 13440,
  "structure": {
    "index.ts": {
      "action": "create",
      "description": "Public exports for all gamification APIs"
    },
    "engines": {
      "description": "Core logic brains - 2 files that manage everything",
      "files": {
        "GamificationEngine.tsx": {
          "action": "merge",
          "description": "All gamification logic - XP, achievements, rewards, streaks, levels",
          "estimatedLines": 2200,
          "mergeFrom": [
            {
              "source": "components/gamification/GamificationOrchestrator.ts",
              "lines": 658,
              "purpose": "XP and quiz tracking"
            },
            {
              "source": "hooks/useAchievements.ts",
              "lines": 615,
              "purpose": "Achievement system with provider"
            },
            {
              "source": "context/RewardsContext.tsx",
              "lines": 532,
              "purpose": "Avatar and badge unlocks"
            },
            {
              "source": "context/PuzzleEngagementContext.tsx",
              "lines": 142,
              "purpose": "Game engagement tracking"
            },
            {
              "source": "hooks/useDailyStreak.ts",
              "lines": 120,
              "purpose": "Daily streak tracking"
            },
            {
              "source": "hooks/useLevel.ts",
              "lines": 102,
              "purpose": "Level calculation from XP"
            }
          ],
          "exports": [
            "GamificationProvider",
            "useGamification",
            "GamificationEngine"
          ]
        },
        "AIEngine.tsx": {
          "action": "merge",
          "description": "All AI logic - chat state, recommendations, progress summary",
          "estimatedLines": 1500,
          "mergeFrom": [
            {
              "source": "context/AIContext.tsx",
              "lines": 348,
              "purpose": "AI chat state management"
            },
            {
              "source": "hooks/useAIRecommendations.ts",
              "lines": 190,
              "purpose": "AI-powered recommendations"
            }
          ],
          "exports": [
            "AIProvider",
            "useAI",
            "AIEngine"
          ]
        }
      }
    },
    "services": {
      "description": "Specialized services for API calls and data processing",
      "files": {
        "AIService.ts": {
          "action": "move",
          "source": "services/AIService.ts",
          "lines": 913,
          "purpose": "Gemini API calls"
        },
        "AIContextService.ts": {
          "action": "move",
          "source": "services/AIContextService.ts",
          "lines": 312,
          "purpose": "Lesson content for AI context"
        },
        "AIStorageService.ts": {
          "action": "move",
          "source": "services/AIStorageService.ts",
          "lines": 400,
          "purpose": "Message persistence"
        },
        "GameGeneratorService.ts": {
          "action": "move",
          "source": "services/GameGeneratorService.ts",
          "lines": 750,
          "purpose": "AI game generation"
        },
        "BehaviorTrackerService.ts": {
          "action": "move",
          "source": "services/BehaviorTrackerService.ts",
          "lines": 570,
          "purpose": "User behavior tracking"
        }
      }
    },
    "hooks": {
      "description": "Specialized hooks for specific gamification features",
      "files": {
        "useQuizSounds.ts": {
          "action": "move",
          "source": "hooks/useQuizSounds.ts",
          "lines": 66,
          "purpose": "Quiz sound effects"
        },
        "useQuizTracking.ts": {
          "action": "move",
          "source": "hooks/useQuizTracking.ts",
          "lines": 200,
          "purpose": "Quiz analytics tracking"
        },
        "useCelebrationVideoPlayer.ts": {
          "action": "move",
          "source": "hooks/useCelebrationVideoPlayer.ts",
          "lines": 36,
          "purpose": "Video player for celebrations"
        },
        "useGameDragDrop.ts": {
          "action": "move",
          "source": "hooks/useGameDragDrop.ts",
          "lines": 222,
          "purpose": "Game drag-drop logic"
        },
        "useGameTimer.ts": {
          "action": "move",
          "source": "hooks/useGameTimer.ts",
          "lines": 142,
          "purpose": "Game timer logic"
        },
        "useSnapToGrid.ts": {
          "action": "move",
          "source": "hooks/useSnapToGrid.ts",
          "lines": 159,
          "purpose": "Grid snapping for puzzle games"
        },
        "useJigsawLogic.ts": {
          "action": "move",
          "source": "components/gamification/games/Jigsaw/useJigsawLogic.ts",
          "lines": 430,
          "purpose": "Jigsaw puzzle game logic"
        }
      }
    },
    "types": {
      "description": "Type definitions for gamification system",
      "files": {
        "games.ts": {
          "action": "move",
          "source": "types/games.ts",
          "lines": 160,
          "purpose": "Game type definitions"
        },
        "gamification.ts": {
          "action": "create",
          "lines": 80,
          "purpose": "Combined gamification types",
          "includesFrom": [
            "types/progress.ts"
          ]
        }
      }
    },
    "ui": {
      "description": "All UI components organized by purpose",
      "celebrations": {
        "description": "Celebration screens and animations",
        "files": {
          "XPMilestoneScreen.tsx": {
            "action": "move",
            "source": "components/gamification/XPMilestoneScreen.tsx",
            "lines": 268
          },
          "AdventureCompleteScreen.tsx": {
            "action": "move",
            "source": "components/gamification/AdventureCompleteScreen.tsx",
            "lines": 538
          },
          "AchievementUnlockAnimation.tsx": {
            "action": "move",
            "source": "components/gamification/AchievementUnlockAnimation.tsx",
            "lines": 258
          },
          "LevelUpAnimation.tsx": {
            "action": "move",
            "source": "components/gamification/LevelUpAnimation.tsx",
            "lines": 175
          },
          "AvatarUnlockAnimation.tsx": {
            "action": "move",
            "source": "components/AvatarUnlockAnimation.tsx",
            "lines": 240
          },
          "AvatarUnlockNotification.tsx": {
            "action": "move",
            "source": "components/AvatarUnlockNotification.tsx",
            "lines": 120
          }
        }
      },
      "displays": {
        "description": "Badges, modals, and static display components",
        "files": {
          "AchievementDetailModal.tsx": {
            "action": "move",
            "source": "components/gamification/AchievementDetailModal.tsx",
            "lines": 362
          },
          "LevelBadge.tsx": {
            "action": "move",
            "source": "components/gamification/LevelBadge.tsx",
            "lines": 97
          },
          "StreakBadge.tsx": {
            "action": "move",
            "source": "components/gamification/StreakBadge.tsx",
            "lines": 202
          }
        }
      },
      "games": {
        "description": "Game hub and all game UI components",
        "files": {
          "GameHub.tsx": {
            "action": "move",
            "source": "components/gamification/GameHub.tsx",
            "lines": 523
          },
          "GameContainer.tsx": {
            "action": "move",
            "source": "components/gamification/shared/GameContainer.tsx",
            "lines": 153
          },
          "GameModeSelector.tsx": {
            "action": "move",
            "source": "components/gamification/shared/GameModeSelector.tsx",
            "lines": 189
          },
          "GameResults.tsx": {
            "action": "move",
            "source": "components/gamification/shared/GameResults.tsx",
            "lines": 345
          },
          "GameTimer.tsx": {
            "action": "move",
            "source": "components/gamification/shared/GameTimer.tsx",
            "lines": 79
          },
          "PuzzlePrompt.tsx": {
            "action": "move",
            "source": "components/gamification/PuzzlePrompt.tsx",
            "lines": 213
          },
          "PuzzlePromptWrapper.tsx": {
            "action": "move",
            "source": "components/gamification/PuzzlePromptWrapper.tsx",
            "lines": 48
          },
          "JigsawGame.tsx": {
            "action": "move",
            "source": "components/gamification/games/Jigsaw/JigsawGame.tsx",
            "lines": 363
          },
          "JigsawBoard.tsx": {
            "action": "move",
            "source": "components/gamification/games/Jigsaw/JigsawBoard.tsx",
            "lines": 83
          },
          "JigsawPiece.tsx": {
            "action": "move",
            "source": "components/gamification/games/Jigsaw/JigsawPiece.tsx",
            "lines": 368
          },
          "PuzzlePieceShape.tsx": {
            "action": "move",
            "source": "components/gamification/games/Jigsaw/PuzzlePieceShape.tsx",
            "lines": 120
          },
          "PuzzleEdgeMap.ts": {
            "action": "move",
            "source": "components/gamification/games/Jigsaw/PuzzleEdgeMap.ts",
            "lines": 144
          }
        }
      },
      "ai": {
        "description": "AI chat and recommendation UI",
        "files": {
          "AIChatModal.tsx": {
            "action": "move",
            "source": "components/ai/AIChatModal.tsx",
            "lines": 1531
          },
          "FloatingAIButton.tsx": {
            "action": "move",
            "source": "components/ai/FloatingAIButton.tsx",
            "lines": 146
          },
          "AIRecommendationCard.tsx": {
            "action": "move",
            "source": "components/ai/AIRecommendationCard.tsx",
            "lines": 128
          },
          "AIAssistant.tsx": {
            "action": "move",
            "source": "components/ai/AIAssistant.tsx",
            "lines": 49
          }
        }
      },
      "debug": {
        "description": "Debug and development tools",
        "files": {
          "GamificationDebug.tsx": {
            "action": "move",
            "source": "components/gamification/GamificationDebug.tsx",
            "lines": 351
          }
        }
      }
    }
  },
  "foldersToDelete": [
    "components/gamification/",
    "components/ai/",
    "components/gamification/shared/",
    "components/gamification/games/"
  ],
  "filesToDeleteFromOriginalLocations": [
    "hooks/useAchievements.ts",
    "hooks/useDailyStreak.ts",
    "hooks/useLevel.ts",
    "hooks/useCelebrationVideoPlayer.ts",
    "hooks/useGameDragDrop.ts",
    "hooks/useGameTimer.ts",
    "hooks/useSnapToGrid.ts",
    "hooks/useQuizSounds.ts",
    "hooks/useQuizTracking.ts",
    "hooks/useAIRecommendations.ts",
    "context/RewardsContext.tsx",
    "context/PuzzleEngagementContext.tsx",
    "context/AIContext.tsx",
    "services/AIService.ts",
    "services/AIContextService.ts",
    "services/AIStorageService.ts",
    "services/GameGeneratorService.ts",
    "services/BehaviorTrackerService.ts",
    "types/games.ts",
    "components/AvatarUnlockAnimation.tsx",
    "components/AvatarUnlockNotification.tsx"
  ],
  "importsToUpdate": {
    "description": "Files that import from moved locations will need path updates",
    "patterns": [
      {
        "old": "@/components/gamification/",
        "new": "@/gamification/ui/"
      },
      {
        "old": "@/components/ai/",
        "new": "@/gamification/ui/ai/"
      },
      {
        "old": "@/hooks/useAchievements",
        "new": "@/gamification/engines/GamificationEngine"
      },
      {
        "old": "@/hooks/useDailyStreak",
        "new": "@/gamification/engines/GamificationEngine"
      },
      {
        "old": "@/hooks/useLevel",
        "new": "@/gamification/engines/GamificationEngine"
      },
      {
        "old": "@/context/RewardsContext",
        "new": "@/gamification/engines/GamificationEngine"
      },
      {
        "old": "@/context/AIContext",
        "new": "@/gamification/engines/AIEngine"
      },
      {
        "old": "@/services/AIService",
        "new": "@/gamification/services/AIService"
      },
      {
        "old": "@/services/GameGeneratorService",
        "new": "@/gamification/services/GameGeneratorService"
      },
      {
        "old": "@/types/games",
        "new": "@/gamification/types/games"
      }
    ]
  },
  "providerChanges": {
    "description": "Changes needed in app/_layout.tsx",
    "remove": [
      "RewardsProvider",
      "AchievementsProvider",
      "AIProvider"
    ],
    "add": [
      "GamificationProvider",
      "AIProvider (from gamification/engines/AIEngine)"
    ],
    "newHierarchy": [
      "GamificationProvider",
      "AIProvider",
      "...rest of providers"
    ]
  }
}
```

---

## Related Files

- `gamification-restructure.json` - Programmatic migration data (same as above)
- `GAMIFICATION-RESTRUCTURE.md` - This documentation
