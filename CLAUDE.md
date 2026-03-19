# Archives Web App

## What This Is
A browser-based version of the Archives app (currently Expo/React Native only). Plain HTML/CSS/JS with ES modules. No build step, no frameworks. Reads from Supabase, renders one era's content (Prophets) in the browser - watch videos, read stories, take quizzes.

## How to Run
```
cd archives-web-app
python -m http.server 8080
```
Open http://localhost:8080

## Supabase Connection
- **URL**: `https://kcgihainlnntshupiztu.supabase.co`
- **Anon key**: In `js/api.js` (public read-only via RLS)
- **Table**: `content` (not `adventures`) with `era_id=eq.prophets`
- **Eras table**: `eras` with string IDs like `prophets`, `prophets_2`, etc.

## File Structure
```
index.html                    # Shell + Google Fonts + hls.js CDN
css/styles.css                # All styles (Cormorant Garamond + DM Sans, amber/dark theme)
js/
  app.js                      # Route registration + router start
  router.js                   # Hash-based routing with param extraction + cleanup
  api.js                      # Supabase REST fetch + session cache (Map)
  state.js                    # localStorage progress + star ratings per module
  views/
    adventures.js             # Era overview - 2-col grid of adventure cards with bg images
    adventure-detail.js       # Hero + Netflix-style horizontal carousel of module tiles
    lesson.js                 # Reel player (HLS video + reading text) or scrollable view
    quiz.js                   # 3-question quiz with sounds + 3-star score screen
  components/
    header.js                 # Sticky back nav + title (frosted glass)
    reel-player.js            # HLS video (9:16) + reading panel (side-by-side on tablet+)
    scrollable-view.js        # Mixed text/image blocks
    quiz-card.js              # Single question with A/B/C/D letter badges + sound effects
    sounds.js                 # Web Audio API - correct chime, wrong buzz, star arpeggio
```

## Routes
| Hash | View | Description |
|------|------|-------------|
| `#/` | adventures.js | Grid of all prophets adventures |
| `#/adventure/:readableId` | adventure-detail.js | Hero + horizontal module carousel |
| `#/lesson/:readableId/:moduleIndex` | lesson.js | Video or scrollable content |
| `#/quiz/:readableId/:moduleIndex` | quiz.js | 3 questions + star-rated score |

## Data Shape (from Supabase `content` table)
- `readable_id`: e.g. `prophets_1`
- `era_id`: string `prophets`
- `adventure_title`, `adventure_description`, `timeline`, `icon_url`
- `card_content`: `{ background_image, adventure_story, estimated_time, era_name }`
- `content_list[]`: array of modules, each with:
  - `id`, `order_by`, `content_type` (reel / scrollable_media_view)
  - `media_url[]` (HLS .m3u8 URLs)
  - `thumbnail_url`, `thumbnail_title`
  - `bottom_content.reading_text` (HTML for reels)
  - `content_blocks[]` (for scrollable: `{ type, content/url, order }`)
  - `questions[]` (MCQ with answers, explanations)

## Image Dimensions (important - don't crop)
- **Modules 1 & 5** thumbnails: 928x1232 (portrait ~3:4)
- **Modules 2-4** thumbnails: 1456x816 (landscape ~16:9)
- **Adventure background images**: landscape
- The module carousel uses fixed height with `aspect-ratio` on imgs so widths vary naturally

## localStorage Format
Key: `archives_progress`
```json
{
  "prophets_1": {
    "media_1": 3,
    "media_2": 2
  }
}
```
Values are star counts (0-3). Best score is preserved on retry.

## Design System
- **Typography**: Cormorant Garamond (display/headings), DM Sans (UI/body)
- **Colors**: Amber #D4A04A (primary), Cream #F0EAE0 (text), Dark #0C0B09 (bg)
- **Spacing**: `--page-px` CSS variable scales with viewport (16/32/48/64px)
- **Breakpoints**: 540, 700, 900, 1024, 1200, 1400, 1800px
- **Effects**: Film grain overlay, frosted glass header, staggered entrance animations, spring easing

## What's Done (Phase 1-4 complete)
- [x] Full routing system with hash-based navigation
- [x] Supabase data fetching with session cache
- [x] Adventures list - full-width 2-col grid with cinematic cards
- [x] Adventure detail - full-bleed hero + horizontal scroll carousel
- [x] Reel player - HLS video with side-by-side reading panel
- [x] Scrollable view - text/image blocks
- [x] Quiz - letter-badged answers, correct/wrong sound effects
- [x] 3-star scoring system with animated score screen
- [x] Stars displayed on module tiles after completion
- [x] localStorage progress persistence
- [x] Responsive design (mobile, iPad, desktop)

## What's Left (Phase 5-6)
- [ ] Image carousel component (for carousel-type modules if any exist)
- [ ] Loading skeleton states (shimmer placeholders instead of spinner)
- [ ] Error retry buttons
- [ ] Transition animations between views (currently instant swap)
- [ ] Scroll position restoration when navigating back
- [ ] Test all adventures beyond prophets_1 (some may have different module structures)
- [ ] Deploy to GitHub Pages
- [ ] Consider: service worker for offline, share buttons, keyboard navigation
