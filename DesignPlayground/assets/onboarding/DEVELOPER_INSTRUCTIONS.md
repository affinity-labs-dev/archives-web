# Archives Onboarding — React Native Developer Instructions

## How to Use This Document

Open `index.html` in a browser to see the interactive prototype. This document specifies every animation value, interaction behavior, and navigation rule so you can recreate the flow in React Native.

**Recommended RN libraries:**
- `react-native-reanimated` — all animations (replaces GSAP)
- `rive-react-native` — Rive character animations (screens 2, 7, 11)
- Easing curves map: `power2.out` → `Easing.out(Easing.quad)`, `back.out(n)` → `Easing.bezier(0.175, 0.885, 0.32, 1.275)`, `elastic.out` → custom spring config

---

## Global Animation Patterns

### Screen Transitions (Crossfade)
| Property | Value |
|----------|-------|
| Type | Opacity crossfade (new screen fades in over old) |
| Duration | 400ms |
| Easing | power2.inOut (`Easing.inOut(Easing.quad)`) |

### Button Press Feedback
Every tappable button has a press-down animation:
```
0%   → translateY(0)
40%  → translateY(6px)    // press into shadow
70%  → translateY(-2px)   // slight overshoot
100% → translateY(0)      // settle
```
- Duration: 350ms
- Curve: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- Trigger: on press down (not on release)

### Typewriter Effect
Used on screens 2, 3, 5, 8, 9, 10:
- Speed: 40ms per character
- Blinking cursor `|` shown during typing, hidden 800ms after completion
- Content below the bubble (options, buttons, inputs) stays hidden until typewriter completes

### Speech Bubble Animation
All speech bubbles share this entrance:
| Property | From | To | Duration | Easing |
|----------|------|----|----------|--------|
| scale | 0.9 | 1 | 400ms | back.out(2) |
| opacity | 0 | 1 | 400ms | back.out(2) |
| rotation | -5deg | 0 | 400ms | back.out(2) |
| transformOrigin | top left | top left | — | — |

### Mascot (Ibu Face) Entrance
Used on screens 3, 5, 8, 9, 10:
| Property | From | To | Duration | Easing |
|----------|------|----|----------|--------|
| x | -120px | 0 | 600ms | back.out(2) |
| opacity | 0 | 1 | 600ms | back.out(2) |
| rotation | -8deg | 0 | 600ms | back.out(2) |

### Option Card Entrance (Screens 5, 8, 10)
Cards slide in from the right with stagger:
| Property | From | To | Duration | Easing |
|----------|------|----|----------|--------|
| x | 400px | 0 | 550ms | back.out(1.4) |
| opacity | 0 | 1 | 550ms | back.out(1.4) |
| rotation | 3deg | 0 | 550ms | back.out(1.4) |
| stagger | — | — | 80ms per card | — |

### Option Card Exit (swipeOutAndGo)
When continuing from screens 5, 8, 10:
| Property | To | Duration | Easing |
|----------|----|----------|--------|
| x | -500px | 350ms | power3.in |
| opacity | 0 | 350ms | power3.in |
| rotation | -8deg | 350ms | power3.in |
| stagger | 40ms per card | — | — |

### Progress Bar
| Screen | Fill % |
|--------|--------|
| 3 (Name) | 15% |
| 5 (Interest) | 24% |
| 8 (Goal) | 50% |
| 10 (Age) | 74% |

Bar animates from `(current% - 10%)` to `current%` over 600ms with `power2.out` easing.

---

## Persistent Mascot System (Screens 8 ↔ 9 ↔ 10)

When navigating between these three consecutive screens, the mascot head and speech bubble persist — they don't exit and re-enter. Instead:

1. **Speech bubble shrinks:** scale 1 → 0.9, opacity 1 → 0 (300ms, power2.inOut, origin: top left)
2. **Old screen content fades out** (250ms)
3. **Background crossfades** to new screen color
4. **New speech bubble grows:** scale 0.9 → 1, opacity 0 → 1 (400ms, back.out(2))
5. **Typewriter starts** in the new bubble
6. **New content appears** only after typewriter completes

The mascot head stays completely still throughout.

---

## Screen-by-Screen Specifications

### Screen 1: Hero / Splash
**Background:** Video (`archives_intro.mp4`) playing on loop, muted, with Ken Burns zoom (scale 1→1.18 + rotation 0→0.5deg over 10s continuous)
**Gradient overlay:** Linear gradient from black (bottom 10%) to transparent (top)

| Element | Animation | Duration | Easing | Delay |
|---------|-----------|----------|--------|-------|
| Badge | — | — | — | — |
| "LEARN ISLAMIC" | y: 50→0, opacity: 0→1 | 800ms | power3.out | 300ms |
| "HISTORY" | y: 60→0, opacity: 0→1, scale: 0.95→1 | 900ms | back.out(1.4) | 500ms |
| Subtitle | y: 25→0, opacity: 0→1 | 700ms | power2.out | 800ms |
| Button | y: 40→0, opacity: 0→1 | 600ms | back.out(2) | 1100ms |
| Button idle glow | boxShadow pulse | 1200ms | sine.inOut (yoyo, infinite) | 2000ms |

**Navigation:** "LET'S START" button → Screen 2

---

### Screen 2: Say Hi to Ibu
**Background:** #E5D4FF

| Element | Animation | Duration | Easing | Delay |
|---------|-----------|----------|--------|-------|
| "SAY HI TO" | y: -100→0, opacity: 0→1, rotationX: -15→0 | 700ms | back.out(1.7) | 0 |
| "IBU" | y: -120→0, opacity: 0→1, scale: 0.7→1 | 800ms | elastic.out(1, 0.6) | 200ms |
| Rive character | scale: 0.85→1, opacity: 0→1 | 800ms | elastic.out(1, 0.5) | 300ms |
| Speech bubble | Standard bubble entrance | 400ms | back.out(2) | 300ms |
| Typewriter | "Hi! I'm Ibu - your guide through Islamic History" | 40ms/char | — | 700ms |
| CONTINUE button | y: 30→0, opacity: 0→1 (after typewriter) | 500ms | back.out(1.5) | — |
| "I already have an account" | opacity: 0→1 (after typewriter) | 400ms | — | +300ms |

**Rive file:** `ibu jumping.riv` (base64 embedded as `RIV_DATA`)
**Navigation:** CONTINUE → Screen 3 | "I already have an account" → Screen 7

---

### Screen 3: Name Input
**Background:** #FAFAFA | **Progress bar:** 15% | **No back button**

| Element | Animation | Duration | Easing | Delay |
|---------|-----------|----------|--------|-------|
| Mascot | Standard mascot entrance | 600ms | back.out(2) | 0 |
| Speech bubble | Standard bubble entrance | 400ms | back.out(2) | 300ms |
| Typewriter | "What's your name?" | 40ms/char | — | 700ms |
| Input field | y: 20→0, opacity: 0→1 (after typewriter) | 400ms | — | — |
| Button | y: 20→0, opacity: 0→1 (after typewriter) | 400ms | back.out(1.5) | +300ms |
| Auto-fill demo | Types "Ahmed" at 100ms/char | — | — | +600ms |

**Navigation:** CONTINUE → Screen 4

---

### Screen 4: Welcome Ahmed
**Background:** #FFDD63 | **No back button** | **Auto-advances after 3500ms**

Three text layers animate up in sequence (accordion style):
| Layer | Animation | Duration | Easing | Relative Delay |
|-------|-----------|----------|--------|----------------|
| Front (white) | y: 200→0, opacity: 0→1 | 600ms | back.out(1.4) | 0 |
| Mid (blue) | y: 200→0, opacity: 0→1 | 600ms | back.out(1.4) | -250ms overlap |
| Back (purple) | y: 200→0, opacity: 0→1 | 600ms | back.out(1.4) | -250ms overlap |

**Navigation:** Auto-advance to Screen 5 after 3500ms

---

### Screen 5: Interest Quiz (Multi-Select)
**Background:** #FAFAFA | **Progress bar:** 24%

| Element | Animation | Duration | Easing | Delay |
|---------|-----------|----------|--------|-------|
| Mascot | Standard mascot entrance | 600ms | back.out(2) | 0 |
| Speech bubble | Standard bubble entrance | 400ms | back.out(2) | 300ms |
| Typewriter | "Why are you interested in Islamic history?" | 40ms/char | — | 700ms |
| "Pick as many as you like" | opacity: 0→1 (after typewriter) | 300ms | — | — |
| Option cards (×5) | Standard card entrance with 80ms stagger | 550ms | back.out(1.4) | — |
| CONTINUE button | y: 30→0, opacity: 0→1 (after typewriter) | 500ms | back.out(1.5) | +600ms |

**Options:** "Just for fun", "Connect with heritage", "Teach my children", "Spend time productively", "Other"
**Selection behavior:** Toggle — multiple can be selected. Selected state: blue background (#A2C5FF), dark shadow
**Navigation:** CONTINUE → swipeOutAndGo → Screen 6 | Skip → Screen 6

---

### Screen 6: Social Proof / Testimonials
**Background:** #FAFAFA

| Element | Animation | Duration | Easing | Delay |
|---------|-----------|----------|--------|-------|
| Header area | y: -20→0, opacity: 0→1 | 500ms | power2.out | 0 |
| Reviews scroll area | y: 30→0, opacity: 0→1 | 500ms | power2.out | 200ms |
| Button area | y: 50→0, opacity: 0→1 | 500ms | back.out(1.5) | 400ms |

**UX:** Reviews area is scrollable. Header shows "JOIN OVER 50,000 LEARNERS TODAY" with app rating and download count.
**Navigation:** CONTINUE → Screen 7

---

### Screen 7: Create Account
**Background:** #FAFAFA

| Element | Animation | Duration | Easing | Delay |
|---------|-----------|----------|--------|-------|
| Title "LET'S CREATE AN ACCOUNT" | y: 25→0, opacity: 0→1 | 500ms | back.out(1.5) | 0 |
| Subtitle | y: 20→0, opacity: 0→1 | 500ms | back.out(1.5) | 150ms |
| Rive character | scale: 0.8→1, opacity: 0→1 | 600ms | back.out(1.5) | 300ms |
| Log In / Sign Up row | y: 30→0, opacity: 0→1 | 500ms | back.out(1.5) | 500ms |
| Divider line | scaleX: 0→1 | 400ms | power2.out | 550ms |
| Apple button | x: -30→0, opacity: 0→1 | 400ms | power2.out | 600ms |
| Google button | x: 30→0, opacity: 0→1 | 400ms | power2.out | 700ms |
| Email button | x: -30→0, opacity: 0→1 | 400ms | power2.out | 800ms |

**Buttons:** First button says "Log In" (not Sign Up). Social buttons alternate entry from left/right.
**Rive file:** Same `ibu jumping.riv`
**Navigation:** Any auth button → Screen 8

---

### Screen 8: Daily Learning Goal (Single-Select)
**Background:** #FAFAFA | **Progress bar:** 50%

| Element | Animation | Duration | Easing | Delay |
|---------|-----------|----------|--------|-------|
| Mascot | Standard mascot entrance (skipped if coming from screen 9) | 600ms | back.out(2) | 0 |
| Speech bubble | Standard bubble entrance | 400ms | back.out(2) | 300ms |
| Typewriter | "What's your daily learning goal?" | 40ms/char | — | 700ms |
| Subtitle "This helps us personalize your plan." | opacity: 0→1 (after typewriter) | 300ms | — | — |
| Option cards (×4) | Standard card entrance with 80ms stagger | 550ms | back.out(1.4) | — |
| CONTINUE button | y: 30→0, opacity: 0→1 (after typewriter) | 500ms | back.out(1.5) | +500ms |

**Options:** "5 min / day - Casual", "10 min / day - Regular", "15 min / day - Serious", "20 min / day - Intense"
**Selection behavior:** Single-select — selecting one deselects the previous (with scale 0.97→1 animation)
**Navigation:** CONTINUE → swipeOutAndGo → Screen 9 | Skip → Screen 9
**Persistent mascot:** YES — mascot stays for transition to screen 9

---

### Screen 9: Notification Permission
**Background:** #A2C5FF | **No progress bar** | **No skip**

| Element | Animation | Duration | Easing | Delay |
|---------|-----------|----------|--------|-------|
| Mascot | Standard mascot entrance (skipped if from screen 8) | 600ms | back.out(2) | 0 |
| Speech bubble | Standard bubble entrance | 400ms | back.out(2) | 300ms |
| Typewriter | "Get a reminder to meet your learning goal" | 40ms/char | — | 700ms |
| Quote (after typewriter) | y: 30→0, opacity: 0→1, scale: 0.95→1 | 800ms | power2.out | 0 |
| Prophet attribution (after typewriter) | y: 20→0, opacity: 0→1 | 600ms | power2.out | +800ms |
| ENABLE button (after typewriter) | y: 20→0, opacity: 0→1 | 500ms | back.out(1.5) | +1200ms |
| "Maybe later" (after typewriter) | opacity: 0→1 | 300ms | — | +1500ms |

**Quote:** "Whoever travels a path seeking knowledge, Allah makes easy their path to Paradise"
**Attribution:** "THE PROPHET MOHAMMED ﷺ"
**UX:** Content is completely hidden until typewriter finishes — no flash.
**Navigation:** ENABLE NOTIFICATIONS → Screen 10 | "Maybe later" → Screen 10
**Persistent mascot:** YES — mascot stays for transitions from screen 8 and to screen 10

---

### Screen 10: Age Group (Single-Select)
**Background:** #FAFAFA | **Progress bar:** 74%

| Element | Animation | Duration | Easing | Delay |
|---------|-----------|----------|--------|-------|
| Mascot | Standard mascot entrance (skipped if from screen 9) | 600ms | back.out(2) | 0 |
| Speech bubble | Standard bubble entrance | 400ms | back.out(2) | 300ms |
| Typewriter | "What is your age group?" | 40ms/char | — | 700ms |
| Subtitle "This helps us tailor your experience." | opacity: 0→1 (after typewriter) | 300ms | — | — |
| Option cards (×5) | Standard card entrance with 80ms stagger | 550ms | back.out(1.4) | — |
| CONTINUE button | y: 30→0, opacity: 0→1 (after typewriter) | 500ms | back.out(1.5) | +600ms |

**Options:** "13-17", "18-24", "25-34", "35-44", "45+"
**Selection behavior:** Single-select
**Navigation:** CONTINUE → swipeOutAndGo → Screen 11 | Skip → Screen 11
**Persistent mascot:** YES — mascot stays for transition from screen 9

---

### Screen 11: Loading (Auto-Advance)
**Background:** #FAFAFA | **No top bar, no back button**

| Phase | Element | Animation | Duration | Easing | Timing |
|-------|---------|-----------|----------|--------|--------|
| 1 | Rive book animation | opacity: 0→1 | 800ms | power2.out | 0ms |
| 1 | Loading text | opacity: 0→1, y: 15→0 | 500ms | — | 400ms |
| 2 | Text cycling (×3) | Fade out (opacity→0, y→-10) then fade in (opacity→1, y: 10→0) | 250ms out + 350ms in | — | Every 1200ms |
| 3 | Rive fade out | opacity: 1→0 | 500ms | power2.in | 5400ms |
| 3 | Final text | opacity: 0→1, scale: 0.9→1 | 700ms | back.out(1.5) | 5400ms |
| 4 | Auto-advance | — | — | — | 7600ms total |

**Loading messages:** "Analyzing your interests..." → "Building your learning path..." → "Personalizing your experience..."
**Final text:** "Your learning path is ready!" (Bounded font, 30px, bold)
**Rive file:** `reruled_loading_screen.riv` (base64 embedded as `LOADING_RIV_DATA`)
**Navigation:** Auto-advance to Screen 12

---

### Screen 12: Personalized Learning Path
**Background:** #FAFAFA

Staggered section entrance — each section uses a different animation direction:

| Section | Content | Animation | Duration | Easing | Delay |
|---------|---------|-----------|----------|--------|-------|
| 0 | Top bar (back, progress, skip) | y: -20→0, fade in | 300ms | power2.out | 0 |
| 1 | Mascot + speech bubble | scale: 0.7→1, y: 30→0, fade in | 600ms | back.out(1.7) | 150ms |
| 2 | Stat pills (3 Eras, <5 min) | x: -200→0, fade in | 450ms | back.out(1.4) | 400ms |
| 3 | Week 1 card | x: -300→0, fade in | 500ms | back.out(1.4) | 550ms |
| 4 | Week 2 card | x: +300→0, fade in | 500ms | back.out(1.4) | 700ms |
| 5 | Week 3 card | x: -300→0, fade in | 500ms | back.out(1.4) | 850ms |
| 6 | GET STARTED button | y: 60→0, fade in | 500ms | back.out(2) | 1000ms |

**UX:** Week cards alternate entry direction (left, right, left) for visual rhythm.
**Navigation:** GET STARTED → Screen 13

---

### Screen 13: Archives Plus Offer
**Background:** #FFDD63

| Section | Content | Animation | Duration | Easing | Delay |
|---------|---------|-----------|----------|--------|-------|
| 0 | Back arrow | fade in | 300ms | power2.out | 0 |
| 1 | Ibu character | scale: 0.5→1, fade in | 700ms | elastic.out(1, 0.6) | 100ms |
| 2 | "Archives is free to use" | y: 20→0, fade in | 500ms | power2.out | 400ms |
| 3 | "But we'd love for you to try Archives Plus for 7 days free too!" | y: 20→0, fade in | 500ms | power2.out | 600ms |
| 4 | SEE MY FREE OFFER button | y: 50→0, fade in | 500ms | back.out(2) | 850ms |

**Navigation:** Back → Screen 12 | SEE MY FREE OFFER → Screen 14

---

### Screen 14: Custom Paywall
**Background:** #C8B89A

| Element | Animation | Duration | Easing | Delay |
|---------|-----------|----------|--------|-------|
| Title "Custom Paywall" | y: 40→0, opacity: 0→1, scale: 0.9→1 | 700ms | back.out(1.7) | 0 |
| Button | y: 30→0, opacity: 0→1 | 500ms | back.out(1.5) | 400ms |

**Navigation:** Back → Screen 13

---

## Ibu Character Idle Animations (CSS Keyframes)

These run continuously when Ibu's SVG face is visible (screens 3, 5, 8, 9, 10):

| Animation | Target | Duration | Description |
|-----------|--------|----------|-------------|
| breathe | Body | 3.5s loop | scaleY 1→1.018, scaleX 1→1.006, translateY 0→-0.4px |
| blink | Pupils | 2.8s loop | scaleY 1→0.05→1 (quick blink at 91-94%) |
| halfBlink | Pupil wraps | 6s loop (3s delay) | Similar to blink but at different timing |
| leftEarWiggle | Left ear | 3.5s loop | rotate 0→4→-2→2→0 deg |
| rightEarWiggle | Right ear | 4s loop (0.5s delay) | rotate 0→-3→2→-1.5→0 deg |
| leftBrowRaise | Left eyebrow | 6s loop | translateY 0→-1.5px, rotate 0→-2deg |
| rightBrowRaise | Right eyebrow | 7s loop (2s delay) | translateY 0→-1.2px, rotate 0→2deg |
| noseTwitch | Nose | 8s loop (2s delay) | translateX 0→0.4→-0.3→0.2px |
| sway | Body | 11s loop | rotate 0→0.3→0→-0.3→0 deg |

---

## Accessibility

All animations respect `prefers-reduced-motion: reduce`:
- GSAP durations become 0ms (via `safeDur()` wrapper)
- CSS keyframe durations become 0.01ms
- Button press animation is skipped entirely

---

## Asset Inventory

| Asset | Used On | Type |
|-------|---------|------|
| `archives_intro.mp4` | Screen 1 | Background video |
| `ibu jumping.riv` | Screens 2, 7 | Rive animation (embedded as base64) |
| `reruled_loading_screen.riv` | Screen 11 | Rive animation (embedded as base64) |
| `ibu-face.svg` | Screens 3, 5, 8, 9, 10 | Static SVG mascot |
| `badge.svg` | Screen 1 | Badge overlay |
| `welcome-layer-back.svg` | Screen 4 | Purple text layer |
| `welcome-layer-mid.svg` | Screen 4 | Blue text layer |
| `welcome-layer-front.svg` | Screen 4 | White text layer |
| `testimonials-screen.svg` | Screen 6 | Header area |
| `reviews-container.svg` | Screen 6 | Scrollable reviews |
| `learning-path-screen.svg` | Screen 12 | Full learning path |
| `s13-ibu.svg` | Screen 13 | Ibu character |
| `s13-free-text.svg` | Screen 13 | "Archives is free" text |
| `s13-plus-text.svg` | Screen 13 | "Archives Plus" CTA text |
| `Bounded-Variable.ttf` | Headers | Variable weight font |
| Google Fonts: Onest | Body text | 100-900 weight |
