// Sizes, paddings, animation timeline + asset requires for the streak
// celebration screen. Pure data — no React, no Reanimated bindings.

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export { SCREEN_WIDTH, SCREEN_HEIGHT };

// Component-intrinsic sizes (not widths — those are flex-driven via
// `alignSelf: 'stretch'` + paddingHorizontal). Only the fixed-bitmap
// dimensions of the flame Rive + the pedestal SVG stay here, since
// those are graphic asset sizes, not layout decisions.
export const FLAME_SIZE = 140;
export const FLAME_HEIGHT = 143;
export const PEDESTAL_WIDTH = 103;
export const PEDESTAL_HEIGHT = 34;

// Card-relative offsets for the absolute children (flame + pedestal).
// They overflow above the card top so the flame "sits on" the white
// card rather than next to it. RELATIVE TO THE CARD, so device size
// doesn't matter.
export const FLAME_TOP_RELATIVE_TO_CARD = -74;
export const PEDESTAL_TOP_RELATIVE_TO_CARD = 47;
// Card padding-top has to clear the flame area (flame bottom inside
// card = -74 + 143 = +69px). 100px gives the streak number breathing
// room below the visible flame footprint.
export const CARD_PADDING_TOP = 100;
export const CARD_PADDING_HORIZONTAL = 16;
export const CARD_PADDING_BOTTOM = 32;
// Outer column padding (gap between card and screen edges). Mirrors
// Figma's card left: 18 on a 393 frame; on wider/narrower devices
// the card stretches inside this padding instead of staying 358.
export const SCREEN_PADDING_HORIZONTAL = 18;
// Message text inset INSIDE the card content width — adds breathing
// room so the message bbox (and its text wrap) is narrower than the
// week card. Matches Figma's 288 message bbox inside a 358 card
// (35px total padding = 16 card + 19 message = 35) but auto-scales
// with device width.
export const MESSAGE_PADDING_HORIZONTAL = 19;
// Bottom CTA inset from the SafeArea bottom edge. The button is
// absolute-positioned (out of flex flow), so we no longer need to
// reserve a `BUTTON_AREA_HEIGHT` in the card's parent — the card has
// its own absolute top anchor.
export const BUTTON_BOTTOM_OFFSET = 24;
// Button gutter — wider than the card's gutter (Figma 3365:8893
// anchors a 327-wide CTA on a 393 frame, so 33px from each screen
// edge). Intentional design contrast: narrower button against a
// broader card reads as a clearly delimited primary CTA.
export const BUTTON_HORIZONTAL_PADDING = 33;

// Sunburst — 2000×2000 SVG sized so the wedge radius (1000px) always
// exceeds the phone diagonal. Anchored at horizontal screen center;
// vertical center sits roughly under the card to match the Figma
// reference, computed from the screen height so it scales.
export const SUNBURST_DIAMETER = 2000;
export const SUNBURST_RADIUS = SUNBURST_DIAMETER / 2;
export const SUNBURST_CENTER_X = SCREEN_WIDTH / 2;
export const SUNBURST_CENTER_Y = SCREEN_HEIGHT * 0.66;

// Animation timeline — ported 1:1 from `enterScreen6` (HTML mock).
// Time origin = 0 at modal mount; values in milliseconds.
export const ANIM = {
  sunburstFade: { delay: 0, dur: 500 },
  sunburstSpin: { delay: 400, dur: 40000 },
  card: { delay: 150, dur: 550 },
  pedestal: { delay: 400, dur: 400 },
  flame: { delay: 450, dur: 750 },
  number: { delay: 700, dur: 600 },
  countUp: { delay: 750, dur: 800 },
  label: { delay: 1200, dur: 500 },
  week: { delay: 1350, dur: 400 },
  weekLabels: { delay: 1500, dur: 350 },
  pending: { delay: 1550, dur: 350, stagger: 40 },
  done: { delay: 1700, dur: 400, stagger: 180 },
  doneCheck: { delay: 1820, dur: 300, stagger: 180 },
  message: { delay: 2250, dur: 500 },
  button: { delay: 2500, dur: 500 },
  // Confetti fires AFTER the countUp lands (countUp.delay +
  // countUp.dur = 1550ms) plus a 100ms breath so the user's eye
  // registers the final streak number for a beat before the burst
  // overlays it. Original mock fired this at 1150ms in parallel with
  // the count, but visually that competes with the number animation —
  // sequential reads cleaner.
  confetti: { delay: 750 + 800 + 100 },
} as const;

// Asset imports — kept out of the main component file so the JSX
// stays focused on composition.
export const STREAK_FLAME = require('../../../../assets/rive/flamefinal.riv');
export const CELEBRATION_SOUND = require('../../../../assets/audio/quiz/streak_celebration.wav');
