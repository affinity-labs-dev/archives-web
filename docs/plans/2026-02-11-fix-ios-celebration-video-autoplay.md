# Fix iOS Celebration Video Auto-Play After expo-av Audio

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix celebration videos (quiz reward, XP milestone, adventure complete) silently failing to auto-play on iOS after the streak celebration screen uses expo-av Audio.

**Architecture:** Move `player.play()` out of the `useVideoPlayer` initialization callback (unreliable on iOS after audio session changes) into a `statusChange` event listener that fires `play()` when the player reaches `readyToPlay`. This proven pattern already exists in `components/lessons/VideoPlayer.tsx:110-119`.

**Tech Stack:** expo-video ^3.0.12, expo-av ~16.0.8, Expo SDK 54, React Native 0.81.5

---

## Root Cause

On iOS, the `AVAudioSession` is a shared singleton. When `StreakCelebrationScreen` plays sounds via `expo-av` (`Audio.Sound.createAsync`), it configures the audio session. After sounds are unloaded (`unloadAsync`), the session may be left in a state where `expo-video`'s `AVPlayer` silently ignores `play()` calls made during player initialization (in the `useVideoPlayer` callback). Android does not have this shared audio session architecture, so it works fine.

## Why This Fix Works

The `useVideoPlayer` callback runs synchronously during player construction — before the player has loaded the asset or verified the audio session. By deferring `play()` to the `statusChange` event (when status = `readyToPlay`), we guarantee the player has fully initialized its `AVPlayer`, loaded the asset, and configured the audio session before attempting playback.

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `hooks/useCelebrationVideoPlayer.ts` | Modify | Add auto-play via `statusChange` event listener |
| `components/quiz/QuizResults.tsx` | Modify | Remove `player.play()` from callback |
| `gamification/ui/celebrations/XPMilestoneScreen.tsx` | Modify | Remove `player.play()` from callback |
| `gamification/ui/celebrations/AdventureCompleteScreen.tsx` | Modify | Remove `player.play()` from callback |

---

### Task 1: Add auto-play to useCelebrationVideoPlayer hook

**Files:**
- Modify: `hooks/useCelebrationVideoPlayer.ts`

**Step 1: Write the updated hook**

Replace the entire file with:

```ts
// useCelebrationVideoPlayer.ts - Celebration video player with sound effects control
// Wrapper around useVideoPlayer that respects Sound Effects preference
// Used for: Adventure Complete, XP Milestone, Quiz Reward videos
//
// iOS FIX: Auto-plays via statusChange event listener instead of initialization callback.
// Calling play() in the useVideoPlayer callback is unreliable on iOS after expo-av Audio
// has modified the AVAudioSession (e.g., StreakCelebrationScreen sounds).

import { useVideoPlayer, VideoSource } from 'expo-video';
import { useEffect, useRef } from 'react';
import { usePreferences } from '@/context/PreferencesContext';

type VideoPlayerCallback = (player: ReturnType<typeof useVideoPlayer>) => void;

export function useCelebrationVideoPlayer(
  source: VideoSource,
  callback?: VideoPlayerCallback
) {
  const { soundEffectsEnabled } = usePreferences();
  const hasStartedRef = useRef(false);
  const player = useVideoPlayer(source, callback);

  // Auto-play when player is ready (deferred from callback for iOS reliability)
  useEffect(() => {
    if (!player) return;
    hasStartedRef.current = false;

    // Check if already ready (fast local assets may resolve before effect runs)
    if (player.status === 'readyToPlay' && !hasStartedRef.current) {
      hasStartedRef.current = true;
      player.play();
      console.log('▶️ [CelebrationVideo] Auto-play: already ready on mount');
    }

    // Listen for status changes (primary auto-play mechanism)
    const subscription = player.addListener('statusChange', ({ status }: { status: string }) => {
      if (status === 'readyToPlay' && !hasStartedRef.current) {
        hasStartedRef.current = true;
        player.play();
        console.log('▶️ [CelebrationVideo] Auto-play: readyToPlay event fired');
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [player]);

  // Update volume based on Sound Effects preference
  useEffect(() => {
    if (!player) return;

    try {
      if (soundEffectsEnabled) {
        player.volume = 1.0;
        console.log('🔊 [CelebrationVideo] Sound enabled');
      } else {
        player.volume = 0;
        console.log('🔇 [CelebrationVideo] Sound muted');
      }
    } catch (error) {
      console.error('❌ [CelebrationVideo] Error setting volume:', error);
    }
  }, [player, soundEffectsEnabled]);

  return player;
}
```

**Key design decisions:**
- `hasStartedRef` prevents double-play (callback may succeed + event fires = two `play()` calls). Calling `play()` twice is harmless but the ref keeps logs clean.
- Immediate `player.status` check handles cached local assets that resolve before the event listener registers.
- `statusChange` event listener is the primary mechanism — proven pattern from `components/lessons/VideoPlayer.tsx:110-119`.

**Step 2: Run lint**

Run: `cd /Users/sunny/Downloads/IOS/Archives_Expo && npm run lint`
Expected: No new errors in `hooks/useCelebrationVideoPlayer.ts`

---

### Task 2: Remove play() from QuizResults callback

**Files:**
- Modify: `components/quiz/QuizResults.tsx` (lines 73-76)

**Step 1: Update the VideoRewardPlayer callback**

Find (line 73-76):
```tsx
  const player = useCelebrationVideoPlayer(videoSource, (player) => {
    player.loop = false;
    player.play();
  });
```

Replace with:
```tsx
  const player = useCelebrationVideoPlayer(videoSource, (player) => {
    player.loop = false;
  });
```

The `play()` is now handled by the hook's `statusChange` listener. The callback still sets `loop = false` (configuration, not playback initiation).

**Step 2: Run lint**

Run: `cd /Users/sunny/Downloads/IOS/Archives_Expo && npm run lint`
Expected: No new errors in `components/quiz/QuizResults.tsx`

---

### Task 3: Remove play() from XPMilestoneScreen callback

**Files:**
- Modify: `gamification/ui/celebrations/XPMilestoneScreen.tsx` (lines 38-41)

**Step 1: Update the callback**

Find (line 38-41):
```tsx
  const player = useCelebrationVideoPlayer(videoSource, (player) => {
    player.loop = false; // Play once only
    player.play();
  });
```

Replace with:
```tsx
  const player = useCelebrationVideoPlayer(videoSource, (player) => {
    player.loop = false; // Play once only
  });
```

**Note:** This component also has its own `statusChange` listener (line 129) for detecting video END (idle status on Android). That listener handles a different concern (auto-dismiss) and does NOT conflict with the hook's auto-play listener. Both listeners coexist on the same event emitter.

**Step 2: Run lint**

Run: `cd /Users/sunny/Downloads/IOS/Archives_Expo && npm run lint`
Expected: No new errors

---

### Task 4: Remove play() from AdventureCompleteScreen callback

**Files:**
- Modify: `gamification/ui/celebrations/AdventureCompleteScreen.tsx` (lines 181-184)

**Step 1: Update the callback**

Find (line 181-184):
```tsx
  const player = useCelebrationVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.play();
  });
```

Replace with:
```tsx
  const player = useCelebrationVideoPlayer(videoSource, (player) => {
    player.loop = true;
  });
```

**Step 2: Run lint**

Run: `cd /Users/sunny/Downloads/IOS/Archives_Expo && npm run lint`
Expected: No new errors

---

### Task 5: Final lint + verification

**Step 1: Run full lint**

Run: `cd /Users/sunny/Downloads/IOS/Archives_Expo && npm run lint`
Expected: PASS (no errors)

**Step 2: Verify all 4 files changed**

Run: `git diff --stat`
Expected output:
```
 hooks/useCelebrationVideoPlayer.ts                      | modified
 components/quiz/QuizResults.tsx                          | modified
 gamification/ui/celebrations/XPMilestoneScreen.tsx       | modified
 gamification/ui/celebrations/AdventureCompleteScreen.tsx | modified
 4 files changed
```

**Step 3: Verify no accidental changes**

Run: `git diff` and review each file — confirm only `play()` was removed from callbacks and the hook has the new auto-play effect.

---

### Task 6: Manual iOS testing checklist

Test on **iOS simulator or device** (the bug is iOS-only):

1. **Module 1 quiz** — Complete quiz, verify quiz reward video plays on QuizResults screen
2. **Streak screen** — After pressing Continue, verify streak celebration appears (Rive animation — separate bug, not this fix)
3. **XP Milestone** — If XP threshold crossed (50 XP), verify xp1.mp4 plays
4. **Module 2 quiz** — Complete second module quiz, verify quiz reward video plays again (THIS was the broken case)
5. **Adventure Complete** — If all modules done, verify advend.mp4 plays and loops
6. **Android regression** — Run same flow on Android emulator, verify nothing broke

**Console logs to watch for:**
```
▶️ [CelebrationVideo] Auto-play: readyToPlay event fired   ← New (confirms fix working)
▶️ [CelebrationVideo] Auto-play: already ready on mount     ← New (fast asset case)
🎬 Quiz reward video status: readyToPlay                    ← Existing (confirms player loaded)
```

---

### Task 7: Commit

**Step 1: Stage and commit**

```bash
git add hooks/useCelebrationVideoPlayer.ts components/quiz/QuizResults.tsx gamification/ui/celebrations/XPMilestoneScreen.tsx gamification/ui/celebrations/AdventureCompleteScreen.tsx
git commit -m "$(cat <<'EOF'
fix(ios): celebration videos not auto-playing after streak screen

Move player.play() from useVideoPlayer initialization callback to
statusChange event listener in useCelebrationVideoPlayer hook.

On iOS, the AVAudioSession left by expo-av Audio (streak celebration
sounds) causes expo-video's play() to silently fail when called during
player construction. Deferring play() to the readyToPlay status event
ensures the AVPlayer is fully initialized before playback starts.
EOF
)"
```
