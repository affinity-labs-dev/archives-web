# Plan: Unified LessonPlayer Architecture

## The Problem (Why This Matters)

Right now we have **4 separate lesson files**:

```
ReelLesson.tsx              (500+ lines)
VideoCarouselLesson.tsx     (400+ lines)
ImageCarouselLesson.tsx     (400+ lines)
ScrollableMediaViewLesson.tsx (300+ lines)
```

**Each file has the SAME code repeated:**
- Progress tracking (mark lesson complete)
- Analytics (track lesson_started, lesson_completed)
- Completion callbacks (what happens when done)
- Quiz integration (show quiz after lesson)
- Error handling
- Loading states

**Problem:** If you fix a bug in ReelLesson, you must fix it in 3 other files too!

---

## The Solution: One Player, Multiple Renderers

Instead of 4 big files, we create:

```
LessonPlayer.tsx (ONE file handles ALL shared logic)
    │
    ├── progress tracking ✓
    ├── analytics ✓
    ├── completion ✓
    ├── quiz integration ✓
    │
    └── Based on content_type, shows:
        ├── "reel"                 → ReelRenderer (just the video + reading card UI)
        ├── "video_carousel"       → VideoCarouselRenderer (just the carousel UI)
        ├── "image_carousel"       → ImageCarouselRenderer (just the gallery UI)
        └── "scrollable_media_view"→ ScrollableRenderer (just the mixed content UI)
```

**Renderers are SMALL** - they only handle the visual part, not the logic.

---

## How It Works With Your JSON

Your JSON has `content_type` field:

```json
{
  "id": "media_1",
  "content_type": "reel",        ← LessonPlayer reads this
  "media_url": ["..."],
  "bottom_content": {...},
  "questions": [...]
}
```

**Before (current code):**
```typescript
// Adventure component must know which lesson type to use
if (content.content_type === 'reel') {
  return <ReelLesson content={content} onComplete={...} />
} else if (content.content_type === 'video_carousel') {
  return <VideoCarouselLesson content={content} onComplete={...} />
}
// ... repeat for each type
```

**After (with LessonPlayer):**
```typescript
// Adventure component just does ONE thing:
return <LessonPlayer content={content} onComplete={handleComplete} />

// LessonPlayer figures out the rest automatically!
```

---

## New Folder Structure

```
components/lessons/
├── LessonPlayer.tsx           ← Main component (handles all shared logic)
├── LessonConstants.ts         ← Shared constants
│
├── renderers/                 ← Small UI-only components
│   ├── ReelRenderer.tsx       ← Just video + reading card visuals
│   ├── VideoCarouselRenderer.tsx
│   ├── ImageCarouselRenderer.tsx
│   └── ScrollableRenderer.tsx
│
└── index.ts                   ← Exports LessonPlayer
```

---

## Benefits Summary

| Before | After |
|--------|-------|
| Fix bug in 4 files | Fix bug in 1 file |
| 1600+ lines of duplicated logic | ~400 lines shared in LessonPlayer |
| Adventure must know lesson types | Adventure just uses `<LessonPlayer />` |
| Adding new lesson type = copy 500 lines | Adding new type = add small renderer |

---

## Implementation Steps

### Phase 1: Complete Current Refactoring (In Progress)
1. ✅ Create new folder structure
2. ✅ Copy and rename all ROI components
3. ✅ Update all component names (ROI → Generic)
4. ⬜ Update `hooks/useAdventures.ts` imports
5. ⬜ Update `app/(tabs)` files to use new imports
6. ⬜ Run `npm run lint`
7. ⬜ Delete old `components/ROI/` folder

### Phase 2: Create Unified LessonPlayer
1. ⬜ Create `components/lessons/LessonPlayer.tsx` with shared logic
2. ⬜ Extract UI into `renderers/ReelRenderer.tsx`
3. ⬜ Extract UI into `renderers/VideoCarouselRenderer.tsx`
4. ⬜ Extract UI into `renderers/ImageCarouselRenderer.tsx`
5. ⬜ Extract UI into `renderers/ScrollableRenderer.tsx`
6. ⬜ Update adventure components to use `<LessonPlayer />`
7. ⬜ Delete old lesson files

### Phase 3: Commit All Changes
- Single commit with full refactoring

---

## Files to Modify

**New files to create:**
- `components/lessons/LessonPlayer.tsx`
- `components/lessons/renderers/ReelRenderer.tsx`
- `components/lessons/renderers/VideoCarouselRenderer.tsx`
- `components/lessons/renderers/ImageCarouselRenderer.tsx`
- `components/lessons/renderers/ScrollableRenderer.tsx`

**Files to update:**
- `hooks/useAdventures.ts` - Fix imports
- `app/(tabs)/index.tsx` - Use new BentoGridScreen
- `app/(tabs)/roi-bento.tsx` - Rename or delete
- `app/(tabs)/profile.tsx` - Update imports
- `components/adventure/shared/AdventureComponent.tsx` - Use LessonPlayer

**Files to delete:**
- `components/ROI/` folder (after migration)
- Old separate lesson files (after LessonPlayer works)
