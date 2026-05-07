// Daily-story guided walkthrough — STEPS array.
// 10-step coach-mark tour layered over the Today tab + lesson modal.
// Ported 1:1 from Downloads/06 guided walkthrough/index.html STEPS (line 3262-3320).
// Copy is English (warm-tutor tone) — keep ≤12 words per copy line for clean
// typewriter pacing and bubble placement.

// Surface = which React tree the step's overlay renders into.
//   'home'  — TodayScreen home layer (header + calendar + deck + START MY DAY)
//   'modal' — the lesson Modal contents (video / reading / quiz)
// Two overlays mount, one per surface; the active step's surface decides which
// one is visible. Splitting by surface (vs. one global overlay) is required by
// React Native: the Modal opens its own native window and absolute children of
// the home tree don't reach into it.
export type WalkthroughSurface = 'home' | 'modal';

// Step modes — control mask click-through + Next button visibility.
//   passive     — mask swallows taps; only Skip / Next on the bubble work.
//                 Used for explanation-only steps.
//   action      — mask passes taps through to the spotlight target; Next is
//                 hidden; pulse ring draws attention. Advance fires when the
//                 user completes the action (taps target / opens sheet / etc).
//   interactive — mask passes taps through; Next IS visible. Used when the
//                 user should explore (swipe carousel/deck) before continuing.
export type WalkthroughMode = 'passive' | 'action' | 'interactive';

// Bubble placement preference. Engine flips to opposite side if preferred
// overflows the frame, falls back to 'center' as last resort. See placeBubble()
// in mock index.html line 3380.
export type WalkthroughPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

// Advance trigger — what causes the engine to move to the next step.
//   'next'                 — user taps the Next button (passive/interactive).
//   'screenEntered:<name>' — modal slot transitions to <name> ('video' | 'reading' | 'quiz').
//                            Dispatched from a useEffect watching slotAModal/slotBModal.
//   'event:<name>'         — custom dispatch from a child component
//                            (read-sheet-open, read-sheet-close, voice-toggled, voice-stopped).
export type WalkthroughAdvance =
  | 'next'
  | `screenEntered:${'video' | 'reading' | 'quiz'}`
  | `event:${string}`;

// showOn — optional gate that keeps the bubble hidden until the named event
// fires. Used for the post-action prompts (after closing the read sheet, after
// pausing voice-over) so the bubble doesn't appear while the user is still
// engaged with the prior interaction.
export type WalkthroughShowOn = `event:${string}`;

// Target identifier registered via useWalkthroughTarget(). Engine looks up the
// ref in the provider registry and calls measure() on it. null = no target,
// bubble centres in the frame (used for passive screen-intro steps).
export type WalkthroughTargetId =
  // home surface
  | 'streak'
  | 'week'
  | 'deck'
  | 'start'
  // modal surface
  | 's2-dots'
  | 's2-read'
  | 's2-continue'
  | 's3-voice'
  | 's3-continue';

export type WalkthroughStep = {
  id: string;
  surface: WalkthroughSurface;
  // Primary spotlight target. null → bubble centres, no spotlight cutout.
  target: WalkthroughTargetId | null;
  // Optional secondary target — only used by step 1 (streak + week dual-spot).
  // Engine unions the two rects for bubble anchoring.
  secondary?: WalkthroughTargetId;
  mode: WalkthroughMode;
  placement: WalkthroughPlacement;
  // Action-mode steps with pulseTarget=true render the 1.5s pulse ring on top
  // of the target. Affordance signal — "tap me".
  pulseTarget?: boolean;
  advanceOn: WalkthroughAdvance;
  // If set, the bubble + spotlight stay hidden until this event fires. The
  // overlay layer fully fades out so the user sees a clean screen for the
  // intermediate interaction (e.g. reading the open sheet).
  showOn?: WalkthroughShowOn;
  copy: string;
};

export const STEPS: readonly WalkthroughStep[] = [
  {
    id: 'streak',
    surface: 'home',
    target: 'streak',
    secondary: 'week',
    mode: 'passive',
    placement: 'bottom',
    advanceOn: 'next',
    copy: "Your streak — open the app daily to keep it alive. Premium subscribers can tap past days to revisit them.",
  },
  {
    id: 'deck',
    surface: 'home',
    target: 'deck',
    mode: 'interactive',
    placement: 'top',
    advanceOn: 'next',
    copy: "You always start with Watch. Swipe to see Explore and Questions.",
  },
  {
    id: 'start',
    surface: 'home',
    target: 'start',
    mode: 'action',
    placement: 'top',
    pulseTarget: true,
    advanceOn: 'screenEntered:video',
    copy: "Tap START MY DAY — today's story is waiting.",
  },
  {
    id: 'swipe',
    surface: 'modal',
    target: 's2-dots',
    mode: 'interactive',
    placement: 'bottom',
    advanceOn: 'next',
    copy: "Swipe through the images to see the story.",
  },
  {
    id: 'read',
    surface: 'modal',
    target: 's2-read',
    mode: 'action',
    placement: 'top',
    pulseTarget: true,
    advanceOn: 'event:read-sheet-open',
    copy: "Tap READ to see the caption.",
  },
  {
    id: 'continue-s2',
    surface: 'modal',
    target: 's2-continue',
    mode: 'action',
    placement: 'top',
    pulseTarget: true,
    showOn: 'event:read-sheet-close',
    advanceOn: 'screenEntered:reading',
    copy: "Now tap CONTINUE to keep reading.",
  },
  {
    id: 'explore-page',
    surface: 'modal',
    target: null,
    mode: 'passive',
    placement: 'center',
    advanceOn: 'next',
    copy: "This is the Explore page — images and text to help you learn more about today's topic.",
  },
  {
    id: 'voice',
    surface: 'modal',
    target: 's3-voice',
    mode: 'action',
    placement: 'top',
    pulseTarget: true,
    advanceOn: 'event:voice-toggled',
    copy: "Prefer listening? Tap the speaker for the voiceover.",
  },
  {
    id: 'continue-s3',
    surface: 'modal',
    target: 's3-continue',
    mode: 'action',
    placement: 'top',
    pulseTarget: true,
    showOn: 'event:voice-stopped',
    advanceOn: 'screenEntered:quiz',
    copy: "Now tap CONTINUE to answer questions.",
  },
  {
    id: 'quiz',
    surface: 'modal',
    target: null,
    mode: 'passive',
    placement: 'center',
    advanceOn: 'next',
    copy: "Answer three questions to test your knowledge.",
  },
] as const;

export const TOTAL_STEPS = STEPS.length;
