# Archives Onboarding Animation — Handover Guide

## What This Is
A single HTML file (`index.html`) containing an animated prototype of the Archives onboarding flow — 14 screens inside a phone frame (393x852px). Open in a browser, tap through the full flow, and inspect timing/easing/assets in DevTools.

## Architecture
- All 14 screens are absolutely positioned `<div>` elements inside `.screen-container`
- `goTo(n)` handles crossfade transitions between screens
- `performMascotTransition()` handles persistent mascot/bubble transitions between screens 8↔9↔10
- `enterScreenN()` functions handle per-screen entry animations
- `swipeOutAndGo()` animates option cards out before calling `goTo()`
- GSAP 3.12.5 for all animations, Rive canvas 2.7.0 for character animations

## CRITICAL: Buttons Must Always Be Clickable
This is a recurring issue. When making any changes:
1. **SVG-based screens** (12, 13): visual buttons are baked into the SVG. A transparent overlay `<div>` with `z-index:100` and `onclick` must sit on top as the LAST child of the screen.
2. **HTML buttons**: class must be registered in the `DOMContentLoaded` listener for press animation.
3. **After any SVG replacement**: verify the overlay position still covers the button area.
4. GSAP animations create stacking contexts — overlay z-index must be 100+.

## Key Patterns

### Text Bubbles (Screens 8, 9, 10)
- Persistent mascot and speech bubble stay in place during transitions
- Bubble shrinks `scale:1` → `scale:0.9` (`transformOrigin: top left`) during transition
- New bubble starts at `scale:0.9, opacity:0`, grows to `scale:1, opacity:1`
- Content hidden via `style="opacity:0"` in HTML — revealed only after typewriter callback

### Rive Animations
- Base64-encoded (`RIV_DATA`, `LOADING_RIV_DATA`) — works with `file://` protocol
- **Never set GSAP `x` or `transform` on elements using CSS `translateX(-50%)`** — GSAP overwrites the entire transform, breaking centering

### SVG-Sliced Screens (12, 13)
- Full-frame SVGs sliced into sections via `overflow:hidden` + negative `margin-top`
- Each section animates independently
- Button overlay MUST be last child with `z-index:100`

### Button Press Animation
CSS `@keyframes buttonPress` — translateY(6px) down toward shadow, bounce back. 350ms.
Applied via `.pressing` class toggled in `addPress()`.

## Screen Map
| # | Name | Background | Progress Bar |
|---|------|-----------|-------------|
| 1 | Hero/Splash | #000 | — |
| 2 | Say Hi to Ibu | #E5D4FF | — |
| 3 | Name Input | #FAFAFA | 15% |
| 4 | Welcome Ahmed | #FFDD63 | — |
| 5 | Interest Quiz | #FAFAFA | 24% |
| 6 | Testimonials | #FAFAFA | — |
| 7 | Create Account | #FAFAFA | — |
| 8 | Daily Goal | #FAFAFA | 50% |
| 9 | Notifications | #A2C5FF | — |
| 10 | Age Group | #FAFAFA | 74% |
| 11 | Loading | #FAFAFA | — |
| 12 | Learning Path | #FAFAFA | 90% (in SVG) |
| 13 | Archives Plus | #FFDD63 | — |
| 14 | Custom Paywall | #C8B89A | — |
