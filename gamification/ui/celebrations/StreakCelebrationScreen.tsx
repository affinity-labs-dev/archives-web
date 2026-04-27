// Streak Celebration Screen — full-screen modal shown after the daily
// quest completes. Redesigned per Figma 3365:8850 with the entrance
// timeline ported 1:1 from `Downloads/02 daily story/index.html`'s
// `enterScreen6` (sunburst → card → pedestal → flame → number countUp →
// label → week card → day stagger → message → CONTINUE).
//
// Visual stack (bottom-up, sibling zIndex inside the modal):
//   1. Acai-tertiary background (#E5D4FF)
//   2. Rotating sunburst SVG (6 wedges, 40s linear infinite)
//   3. White card 358×443 with shadow
//   4. Pedestal (flame-shadow ellipse, beige #D7C5B6)
//   5. Flame Rive (animationName "burning_flame")
//   6. Streak number + DAY STREAK label (Bounded Black)
//   7. Black week card with day labels + indicators
//   8. Motivational message
//   9. CONTINUE DepthButton
//   10. Confetti burst at +1.15s (mock spec, fires once)
//   11. Close button (top-right)

import {
  ConfettiBurst,
  DepthButton,
  Typography,
  colors,
  easings,
  safeDuration,
  type ConfettiBurstHandle,
} from '@/components/ui';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Component-intrinsic sizes (not widths — those are now flex-driven
// via `alignSelf: 'stretch'` + paddingHorizontal). Only the
// fixed-bitmap dimensions of the flame Rive + the pedestal SVG stay
// here, since those are graphic asset sizes, not layout decisions.
const FLAME_SIZE = 140;
const FLAME_HEIGHT = 143;
const PEDESTAL_WIDTH = 103;
const PEDESTAL_HEIGHT = 34;

// Card-relative offsets for the absolute children (flame + pedestal).
// They overflow above the card top so the flame "sits on" the white
// card rather than next to it. RELATIVE TO THE CARD, so device size
// doesn't matter.
const FLAME_TOP_RELATIVE_TO_CARD = -74; // flame extends 74px above card top
const PEDESTAL_TOP_RELATIVE_TO_CARD = 47; // pedestal sits 47px below card top
// Card padding-top has to clear the flame area (flame bottom inside
// card = -74 + 143 = +69px). 100px gives the streak number breathing
// room below the visible flame footprint.
const CARD_PADDING_TOP = 100;
const CARD_PADDING_HORIZONTAL = 16;
const CARD_PADDING_BOTTOM = 32;
// Outer column padding (gap between card and screen edges). Mirrors
// Figma's card left: 18 on a 393 frame; on wider/narrower devices
// the card stretches inside this padding instead of staying 358.
const SCREEN_PADDING_HORIZONTAL = 18;
// Message text inset INSIDE the card content width — adds breathing
// room so the message bbox (and its text wrap) is narrower than the
// week card. Matches Figma's 288 message bbox inside a 358 card
// (35px total padding = 16 card + 19 message = 35) but auto-scales
// with device width.
const MESSAGE_PADDING_HORIZONTAL = 19;
// Bottom CTA inset from the SafeArea bottom edge. The button is
// absolute-positioned (out of flex flow), so we no longer need to
// reserve a `BUTTON_AREA_HEIGHT` in the card's parent — the card has
// its own absolute top anchor.
const BUTTON_BOTTOM_OFFSET = 24;
// Button gutter — wider than the card's gutter (Figma 3365:8893
// anchors a 327-wide CTA on a 393 frame, so 33px from each screen
// edge). Intentional design contrast: narrower button against a
// broader card reads as a clearly delimited primary CTA.
const BUTTON_HORIZONTAL_PADDING = 33;

// Sunburst — 2000×2000 SVG sized so the wedge radius (1000px)
// always exceeds the phone diagonal. Anchored at horizontal screen
// center; vertical center sits roughly under the card to match the
// Figma reference, computed from the screen height so it scales.
const SUNBURST_DIAMETER = 2000;
const SUNBURST_RADIUS = SUNBURST_DIAMETER / 2;
const SUNBURST_CENTER_X = SCREEN_WIDTH / 2;
const SUNBURST_CENTER_Y = SCREEN_HEIGHT * 0.66;

// Animation timeline — ported 1:1 from `enterScreen6` (HTML mock).
// Time origin = 0 at modal mount; values in milliseconds.
const ANIM = {
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

// Asset imports
const streakFlame = require('../../../assets/rive/flamefinal.riv');
const CELEBRATION_SOUND = require('../../../assets/audio/quiz/streak_celebration.wav');

// ─────────────────────────────────────────────────────────
// Sunburst — 6 alternating purple wedges (30° on, 30° off pattern
// from the HTML mock's conic-gradient). Drawn as SVG paths inside a
// 2000×2000 canvas; rotation is driven by an external sharedValue so
// the parent can chain it onto the entrance timeline.
// ─────────────────────────────────────────────────────────

const SUNBURST_FILL = 'rgba(180, 138, 255, 0.45)';

function wedgePath(startDeg: number, endDeg: number): string {
  // Convert to SVG coords: 0deg points up (-y), clockwise positive.
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const x1 = SUNBURST_RADIUS + SUNBURST_RADIUS * Math.cos(toRad(startDeg));
  const y1 = SUNBURST_RADIUS + SUNBURST_RADIUS * Math.sin(toRad(startDeg));
  const x2 = SUNBURST_RADIUS + SUNBURST_RADIUS * Math.cos(toRad(endDeg));
  const y2 = SUNBURST_RADIUS + SUNBURST_RADIUS * Math.sin(toRad(endDeg));
  // 30° wedge < 180° so largeArcFlag = 0; sweepFlag = 1 for clockwise.
  return `M${SUNBURST_RADIUS},${SUNBURST_RADIUS} L${x1},${y1} A${SUNBURST_RADIUS},${SUNBURST_RADIUS} 0 0 1 ${x2},${y2} Z`;
}

// 6 visible wedges centered at 0°, 60°, 120°, 180°, 240°, 300°.
const SUNBURST_WEDGES = [0, 60, 120, 180, 240, 300].map((center) => ({
  d: wedgePath(center - 15, center + 15),
}));

interface SunburstProps {
  opacity: SharedValue<number>;
  rotation: SharedValue<number>;
}

function Sunburst({ opacity, rotation }: SunburstProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sunburst,
        {
          left: SUNBURST_CENTER_X - SUNBURST_RADIUS,
          top: SUNBURST_CENTER_Y - SUNBURST_RADIUS,
        },
        animatedStyle,
      ]}
    >
      <Svg
        width={SUNBURST_DIAMETER}
        height={SUNBURST_DIAMETER}
        viewBox={`0 0 ${SUNBURST_DIAMETER} ${SUNBURST_DIAMETER}`}
      >
        {SUNBURST_WEDGES.map((w, i) => (
          <Path key={i} d={w.d} fill={SUNBURST_FILL} />
        ))}
      </Svg>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────

interface WeekDay {
  day: string;
  completed: boolean;
  missed: boolean;
  isToday: boolean;
}

interface StreakCelebrationScreenProps {
  visible: boolean;
  streakCount: number;
  weekData: WeekDay[]; // 7 days (Mo-Su) with completion status
  onContinue: () => void;
}

const getMotivationalQuote = (streak: number): string => {
  if (streak === 1)
    return 'Great start! The journey of a thousand miles begins with a single step.';
  if (streak < 7) return 'Keep it up! Consistency is the key to mastery.';
  if (streak === 7) return 'One week strong! The scholars of old learned a little every day too.';
  if (streak < 30)
    return 'Great scholars and travelers learned a little every day too. Just like you!';
  if (streak === 30) return 'One month of dedication! You are building an incredible habit.';
  if (streak < 100) return 'Your commitment is inspiring! The path to wisdom is walked daily.';
  return 'Legendary dedication! You are truly embodying the spirit of lifelong learning.';
};

// ─────────────────────────────────────────────────────────
// Day indicator — done (purple + check), missed (grey + dash), or
// pending (translucent white circle). Each indicator owns its own
// shared values so the parent can stagger them per the mock spec.
// ─────────────────────────────────────────────────────────

interface DayIndicatorProps {
  state: 'done' | 'missed' | 'pending';
  isToday: boolean;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
  // For `done` only — the inner check svg has its own stagger group.
  checkScale?: SharedValue<number>;
  checkOpacity?: SharedValue<number>;
}

function DayIndicator({
  state,
  isToday,
  scale,
  opacity,
  checkScale,
  checkOpacity,
}: DayIndicatorProps) {
  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale?.value ?? 1 }],
    opacity: checkOpacity?.value ?? 1,
  }));

  if (state === 'done') {
    return (
      <Animated.View
        style={[
          styles.dayCircle,
          styles.dayCircleDone,
          isToday && styles.dayCircleToday,
          wrapStyle,
        ]}
      >
        <Animated.View style={checkStyle}>
          <Svg width={13} height={13} viewBox="0 0 14 14" fill="none">
            <Path
              d="M3 7.5L6 10.5L11 4.5"
              stroke="#fff"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    );
  }

  if (state === 'missed') {
    // Cross-platform missed indicator — em-dash via <Text> rendered
    // inconsistently on Android (font-metric / includeFontPadding
    // quirks shift the dash off-center). A 10×2 white View centered
    // in the circle is pixel-identical on iOS + Android.
    return (
      <Animated.View style={[styles.dayCircle, styles.dayCircleMissed, wrapStyle]}>
        <View style={styles.missedDash} />
      </Animated.View>
    );
  }

  // pending
  return <Animated.View style={[styles.dayCircle, styles.dayCirclePending, wrapStyle]} />;
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

export default function StreakCelebrationScreen({
  visible,
  streakCount,
  weekData,
  onContinue,
}: StreakCelebrationScreenProps) {
  const riveRef = useRef<RiveRef>(null);
  const hasTrackedRef = useRef(false);
  const confettiRef = useRef<ConfettiBurstHandle>(null);
  // Read safe-area insets imperatively from context (set up at app
  // boot via SafeAreaProvider in `_layout.tsx`). Synchronous from the
  // first render — no async settling pass like SafeAreaView's
  // internal useEffect can introduce, which on Modal contents was
  // causing the parent height to shrink mid-render and the card's
  // `top: '22%'` to recompute to a smaller pixel value, visibly
  // shifting the card.
  const insets = useSafeAreaInsets();

  // countUp displayed value (animates 0 → streakCount over 800ms after
  // a 750ms delay; written from a JS RAF loop so the parent can
  // re-trigger on every visible flip). The mirror ref lets a re-fired
  // useEffect anchor the animation on the *current* displayed value
  // rather than a hardcoded 0 — kills the `0 → 1 → 0 → 1` flicker
  // that showed up under StrictMode dev double-invoke / parent
  // re-renders for low streak counts (most visible at streakCount=1
  // where the only frame transitions are 0 and 1).
  const [displayedNumber, setDisplayedNumber] = useState(0);
  const displayedRef = useRef(0);

  // Entrance shared values — one per element the mock tweens. Defaults
  // match the `gsap.set` initial states in `enterScreen6`.
  const sunburstOpacity = useSharedValue(0);
  const sunburstRotation = useSharedValue(0);
  // Card no longer animates scale — it caused a visible bottom-edge
  // shift downward as 0.94 → 1 expanded the rendered footprint
  // symmetrically around the layout center. The bottom edge moved
  // down ~13 px during the entrance, which read as "card jumping
  // down" against the absolute-positioned ctaSlot beneath. Opacity
  // alone preserves the soft entrance without the layout-edge jitter.
  const cardOpacity = useSharedValue(0);
  // Exit fade — driven by the close X / CONTINUE buttons. We run our
  // own opacity 1→0 animation BEFORE calling the parent's onContinue
  // so the parent's state cascade (orchestrator clearing
  // `currentCelebration`, today tab re-rendering its calendar fetch)
  // doesn't race the Modal's native fade-out and clobber calendar
  // data mid-close. `onContinue` fires from the worklet completion
  // callback once the local fade lands at 0.
  const exitOpacity = useSharedValue(1);
  const pedestalScale = useSharedValue(0.88);
  const pedestalOpacity = useSharedValue(0);
  const flameY = useSharedValue(-40);
  const flameScale = useSharedValue(0.85);
  const flameOpacity = useSharedValue(0);
  const numberScale = useSharedValue(0.88);
  const numberOpacity = useSharedValue(0);
  const labelY = useSharedValue(20);
  const labelOpacity = useSharedValue(0);
  const weekOpacity = useSharedValue(0);
  const weekLabelsOpacity = useSharedValue(0);
  const messageY = useSharedValue(16);
  const messageOpacity = useSharedValue(0);
  const buttonY = useSharedValue(30);
  const buttonOpacity = useSharedValue(0);

  // Per-day shared values — fixed arity (7 days, Mo→Su) so the hook
  // count is stable across every render. The previous
  // `useRef(weekData.map(() => useSharedValue(0)))` form was a
  // Rules-of-Hooks violation: `.map` called `useSharedValue` once per
  // day, making the hook count depend on `weekData.length`. Assembling
  // 7 individual hooks into arrays keeps Reanimated's per-day
  // reactivity (each shared value is its own subscription target) and
  // satisfies React's "same hooks in the same order every render"
  // contract.
  const dayScale0 = useSharedValue(0);
  const dayScale1 = useSharedValue(0);
  const dayScale2 = useSharedValue(0);
  const dayScale3 = useSharedValue(0);
  const dayScale4 = useSharedValue(0);
  const dayScale5 = useSharedValue(0);
  const dayScale6 = useSharedValue(0);
  const dayOpacity0 = useSharedValue(0);
  const dayOpacity1 = useSharedValue(0);
  const dayOpacity2 = useSharedValue(0);
  const dayOpacity3 = useSharedValue(0);
  const dayOpacity4 = useSharedValue(0);
  const dayOpacity5 = useSharedValue(0);
  const dayOpacity6 = useSharedValue(0);
  const checkScale0 = useSharedValue(0.5);
  const checkScale1 = useSharedValue(0.5);
  const checkScale2 = useSharedValue(0.5);
  const checkScale3 = useSharedValue(0.5);
  const checkScale4 = useSharedValue(0.5);
  const checkScale5 = useSharedValue(0.5);
  const checkScale6 = useSharedValue(0.5);
  const checkOpacity0 = useSharedValue(0);
  const checkOpacity1 = useSharedValue(0);
  const checkOpacity2 = useSharedValue(0);
  const checkOpacity3 = useSharedValue(0);
  const checkOpacity4 = useSharedValue(0);
  const checkOpacity5 = useSharedValue(0);
  const checkOpacity6 = useSharedValue(0);
  const dayScales: SharedValue<number>[] = [
    dayScale0,
    dayScale1,
    dayScale2,
    dayScale3,
    dayScale4,
    dayScale5,
    dayScale6,
  ];
  const dayOpacities: SharedValue<number>[] = [
    dayOpacity0,
    dayOpacity1,
    dayOpacity2,
    dayOpacity3,
    dayOpacity4,
    dayOpacity5,
    dayOpacity6,
  ];
  const checkScales: SharedValue<number>[] = [
    checkScale0,
    checkScale1,
    checkScale2,
    checkScale3,
    checkScale4,
    checkScale5,
    checkScale6,
  ];
  const checkOpacities: SharedValue<number>[] = [
    checkOpacity0,
    checkOpacity1,
    checkOpacity2,
    checkOpacity3,
    checkOpacity4,
    checkOpacity5,
    checkOpacity6,
  ];

  // Audio: fire-and-forget per-day chime aligned with the done-day
  // pop-in stagger. Single player per call so Android's ENDED-state
  // bug doesn't bite.
  const playCelebration = useCallback(() => {
    try {
      const player = createAudioPlayer(CELEBRATION_SOUND);
      player.volume = 0.5;
      player.play();
      setTimeout(() => {
        try {
          player.remove();
        } catch (_) {}
      }, 1000);
    } catch (error) {
      console.log('❌ Error playing celebration sound:', error);
    }
  }, []);

  // Master entrance / reset effect. Tied to `visible`: on flip-true
  // resets every shared value to its initial offset and schedules the
  // tweens; on flip-false cancels infinite tweens (sunburst spin) and
  // snaps everything back so re-opens animate fresh.
  useEffect(() => {
    if (!visible) {
      cancelAnimation(sunburstRotation);
      sunburstOpacity.value = 0;
      sunburstRotation.value = 0;
      cardOpacity.value = 0;
      pedestalScale.value = 0.88;
      pedestalOpacity.value = 0;
      flameY.value = -40;
      flameScale.value = 0.85;
      flameOpacity.value = 0;
      numberScale.value = 0.88;
      numberOpacity.value = 0;
      labelY.value = 20;
      labelOpacity.value = 0;
      weekOpacity.value = 0;
      weekLabelsOpacity.value = 0;
      messageY.value = 16;
      messageOpacity.value = 0;
      buttonY.value = 30;
      buttonOpacity.value = 0;
      dayScales.forEach((sv, i) => {
        sv.value = weekData[i]?.completed ? 0.6 : 0.85;
      });
      dayOpacities.forEach((sv) => (sv.value = 0));
      checkScales.forEach((sv) => (sv.value = 0.5));
      checkOpacities.forEach((sv) => (sv.value = 0));
      // Keep the ref in sync with state so the next visible-flip-true
      // anchors the count-up animation on 0 (a fresh entrance).
      setDisplayedNumber(0);
      displayedRef.current = 0;
      // NOTE: exitOpacity is NOT reset here. After a close it sits at
      // 0 — we want it to STAY at 0 while the Modal completes its
      // native fade-out. Resetting to 1 here would cause a flicker
      // where contents momentarily reappear at full opacity right as
      // the Modal starts hiding. The reset to 1 lives in the
      // visible=true branch below so each fresh entrance arms it.
      return;
    }
    // Re-arm the exit fade for this entrance. Belongs here (not in
    // the cleanup branch) because we need it to STAY at 0 after a
    // close until the Modal fully unmounts — otherwise the close
    // flickers as RN's native fade-out fights our local opacity.
    exitOpacity.value = 1;

    // — Sunburst —
    sunburstOpacity.value = withTiming(1, {
      duration: safeDuration(ANIM.sunburstFade.dur),
      easing: easings.power2Out,
    });
    sunburstRotation.value = withDelay(
      safeDuration(ANIM.sunburstSpin.delay),
      withRepeat(
        withTiming(360, {
          duration: safeDuration(ANIM.sunburstSpin.dur),
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );

    // — Card opacity only (scale animation removed — see comment on
    //    cardScale declaration above for why). Same delay + duration
    //    as the original mock so the card's entrance feel is
    //    preserved. —
    cardOpacity.value = withDelay(
      safeDuration(ANIM.card.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.card.dur),
        easing: easings.power2Out,
      })
    );

    // — Pedestal (back.out(1.6)) —
    const pedestalEasing = Easing.bezier(0.175, 0.885, 0.32, 1.16);
    pedestalScale.value = withDelay(
      safeDuration(ANIM.pedestal.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.pedestal.dur),
        easing: pedestalEasing,
      })
    );
    pedestalOpacity.value = withDelay(
      safeDuration(ANIM.pedestal.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.pedestal.dur),
        easing: easings.power2Out,
      })
    );

    // — Flame (elastic.out(1, 0.55)) — snappier elastic settle —
    const flameEasing = Easing.out(Easing.elastic(0.55));
    flameY.value = withDelay(
      safeDuration(ANIM.flame.delay),
      withTiming(0, { duration: safeDuration(ANIM.flame.dur), easing: flameEasing })
    );
    flameScale.value = withDelay(
      safeDuration(ANIM.flame.delay),
      withTiming(1, { duration: safeDuration(ANIM.flame.dur), easing: flameEasing })
    );
    flameOpacity.value = withDelay(
      safeDuration(ANIM.flame.delay),
      withTiming(1, { duration: safeDuration(ANIM.flame.dur), easing: easings.power2Out })
    );

    // — Number (back.out(2)) —
    numberScale.value = withDelay(
      safeDuration(ANIM.number.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.number.dur),
        easing: easings.backOut2,
      })
    );
    numberOpacity.value = withDelay(
      safeDuration(ANIM.number.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.number.dur),
        easing: easings.power2Out,
      })
    );

    // — Label (back.out(1.5)) —
    labelY.value = withDelay(
      safeDuration(ANIM.label.delay),
      withTiming(0, {
        duration: safeDuration(ANIM.label.dur),
        easing: easings.backOut15,
      })
    );
    labelOpacity.value = withDelay(
      safeDuration(ANIM.label.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.label.dur),
        easing: easings.power2Out,
      })
    );

    // — Week card —
    weekOpacity.value = withDelay(
      safeDuration(ANIM.week.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.week.dur),
        easing: easings.power2Out,
      })
    );
    weekLabelsOpacity.value = withDelay(
      safeDuration(ANIM.weekLabels.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.weekLabels.dur),
        easing: easings.power2Out,
      })
    );

    // — Day pop-in stagger —
    // Pending + missed share the `pending` track (40ms stagger,
    // power2.out, 350ms). Done indicators use the `done` track
    // (180ms stagger, back.out(2), 400ms) and their inner checks
    // chain in 120ms later (300ms back.out(2.2)).
    let pendingI = 0;
    let doneI = 0;
    weekData.forEach((day, idx) => {
      const isCompleted = day.completed;
      if (isCompleted) {
        const localDelay = ANIM.done.delay + doneI * ANIM.done.stagger;
        dayScales[idx].value = withDelay(
          safeDuration(localDelay),
          withTiming(1, {
            duration: safeDuration(ANIM.done.dur),
            easing: easings.backOut2,
          })
        );
        dayOpacities[idx].value = withDelay(
          safeDuration(localDelay),
          withTiming(1, {
            duration: safeDuration(ANIM.done.dur),
            easing: easings.power2Out,
          })
        );
        const checkDelay = ANIM.doneCheck.delay + doneI * ANIM.doneCheck.stagger;
        const checkEasing = Easing.bezier(0.175, 0.885, 0.32, 1.22);
        checkScales[idx].value = withDelay(
          safeDuration(checkDelay),
          withTiming(1, {
            duration: safeDuration(ANIM.doneCheck.dur),
            easing: checkEasing,
          })
        );
        checkOpacities[idx].value = withDelay(
          safeDuration(checkDelay),
          withTiming(1, {
            duration: safeDuration(ANIM.doneCheck.dur),
            easing: easings.power2Out,
          })
        );
        doneI++;
      } else {
        const localDelay = ANIM.pending.delay + pendingI * ANIM.pending.stagger;
        dayScales[idx].value = withDelay(
          safeDuration(localDelay),
          withTiming(1, {
            duration: safeDuration(ANIM.pending.dur),
            easing: easings.power2Out,
          })
        );
        dayOpacities[idx].value = withDelay(
          safeDuration(localDelay),
          withTiming(1, {
            duration: safeDuration(ANIM.pending.dur),
            easing: easings.power2Out,
          })
        );
        pendingI++;
      }
    });

    // — Message + Button (back.out(2)) —
    messageY.value = withDelay(
      safeDuration(ANIM.message.delay),
      withTiming(0, {
        duration: safeDuration(ANIM.message.dur),
        easing: easings.power2Out,
      })
    );
    messageOpacity.value = withDelay(
      safeDuration(ANIM.message.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.message.dur),
        easing: easings.power2Out,
      })
    );
    buttonY.value = withDelay(
      safeDuration(ANIM.button.delay),
      withTiming(0, {
        duration: safeDuration(ANIM.button.dur),
        easing: easings.backOut2,
      })
    );
    buttonOpacity.value = withDelay(
      safeDuration(ANIM.button.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.button.dur),
        easing: easings.power2Out,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, weekData]);

  // countUp: animate `displayedNumber` toward streakCount over 800ms
  // after a 750ms delay. RAF loop on the JS thread (text updates
  // don't need 60fps reanimated bridging).
  //
  // Critical invariant: each effect run animates FROM the current
  // displayed value (via `displayedRef`) TO `streakCount`. Hard-coding
  // the start at 0 (the previous behaviour) caused a `0 → 1 → 0 → 1`
  // flicker on re-fires (StrictMode dev double-invoke, parent
  // re-renders) — most visible at streakCount = 1 where only two
  // distinct values render. Anchoring on the current value means a
  // re-fire after completion degenerates to `1 → 1` (no change),
  // a re-fire mid-animation continues smoothly from where it was,
  // and a fresh entrance still animates 0 → N because `displayedRef`
  // was reset to 0 on the previous `!visible` cleanup branch.
  //
  // We also skip redundant React state writes when the floored value
  // equals the previous frame — for low streakCounts most frames
  // produce the same value (e.g. streakCount=1 produces 0 for ~47
  // frames then 1 for the last), so skipping turns the animation
  // into a single dispatch instead of 48.
  const setDisplayed = (n: number) => {
    if (n !== displayedRef.current) {
      displayedRef.current = n;
      setDisplayedNumber(n);
    }
  };
  useEffect(() => {
    if (!visible) {
      setDisplayed(0);
      return;
    }
    if (streakCount <= 0) {
      setDisplayed(0);
      return;
    }
    let raf: number | null = null;
    let startTs: number | null = null;
    const startAtMs = ANIM.countUp.delay;
    const durationMs = safeDuration(ANIM.countUp.dur);
    const mountTs = performance.now();
    // Anchor on the current displayed value, not 0. Survives re-fires
    // without flickering back to 0.
    const startValue = displayedRef.current;
    const tick = (ts: number) => {
      if (ts - mountTs < startAtMs) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (startTs === null) startTs = ts;
      const elapsed = ts - startTs;
      if (durationMs === 0) {
        setDisplayed(streakCount);
        return;
      }
      const progress = Math.min(1, elapsed / durationMs);
      const value = Math.floor(startValue + progress * (streakCount - startValue));
      setDisplayed(value);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setDisplayed(streakCount);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [visible, streakCount]);

  // Confetti burst + celebration chime — single coupled fire after
  // the countUp lands, mirroring the mock's `tl.call(burstConfetti,
  // ...)` in `enterScreen6`. The chime is intentionally collapsed to
  // ONE play here (was previously a per-day stagger that audibly
  // stacked up to 7 chimes on a full-week streak — confusing instead
  // of celebratory). Pairing the audio with the confetti gives a
  // single coherent "celebration moment".
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      confettiRef.current?.fire({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT * 0.4 });
      playCelebration();
    }, ANIM.confetti.delay);
    return () => clearTimeout(t);
  }, [visible, playCelebration]);

  // Single haptic feedback when the CONTINUE button lands.
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, ANIM.button.delay);
    return () => clearTimeout(t);
  }, [visible]);

  // Analytics — once per visible flip-true.
  useEffect(() => {
    if (visible && !hasTrackedRef.current) {
      hasTrackedRef.current = true;
      try {
        analyticsService.trackStreakCelebrationShown({
          streak_count: streakCount,
          is_milestone: [3, 7, 14, 30, 50, 100].includes(streakCount),
          week_data: weekData.map((d) => ({
            day: d.day,
            completed: d.completed,
            missed: d.missed,
            is_today: d.isToday,
          })),
        });
      } catch (error) {
        console.error('❌ [StreakCelebration] Failed to track event:', error);
      }
    }
    if (!visible) hasTrackedRef.current = false;
  }, [visible, streakCount, weekData]);

  // ─── Close handler — runs the local exit fade, then dismisses ───
  // Both the close X (light haptic) and the CONTINUE button (medium
  // haptic) flow through this. The fade lands at opacity 0 in 150ms
  // (`power2.in`), then the worklet completion hops back to JS via
  // `scheduleOnRN` and fires the parent's `onContinue` — guaranteeing
  // the visual close is finished before the orchestrator clears
  // `currentCelebration` and the today tab re-renders. 150ms is the
  // sweet spot: fast enough to feel snappy, slow enough that the
  // parent's state cascade has time to commit before the underlying
  // view repaints.
  const handleClose = useCallback(
    (haptic: Haptics.ImpactFeedbackStyle) => {
      Haptics.impactAsync(haptic);
      exitOpacity.value = withTiming(
        0,
        { duration: safeDuration(150), easing: easings.power2In },
        (finished) => {
          'worklet';
          if (finished) {
            scheduleOnRN(onContinue);
          }
        },
      );
    },
    [exitOpacity, onContinue],
  );

  // ─── Animated styles ───
  const exitAnimatedStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
  }));
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));
  const pedestalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pedestalScale.value }],
    opacity: pedestalOpacity.value,
  }));
  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: flameY.value }, { scale: flameScale.value }],
    opacity: flameOpacity.value,
  }));
  const numberAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberScale.value }],
    opacity: numberOpacity.value,
  }));
  const labelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: labelY.value }],
    opacity: labelOpacity.value,
  }));
  const weekAnimatedStyle = useAnimatedStyle(() => ({
    opacity: weekOpacity.value,
  }));
  const weekLabelsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: weekLabelsOpacity.value,
  }));
  const messageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: messageY.value }],
    opacity: messageOpacity.value,
  }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonY.value }],
    opacity: buttonOpacity.value,
  }));

  return (
    // `transparent={true}` removes the Modal's opaque white default
    // backing. With it on, our local exit fade reveals whatever was
    // underneath (today tab) instead of flashing a white panel
    // before the Modal's native fade-out finishes. The fade-in
    // animationType still works for the open.
    <Modal visible={visible} animationType="fade" transparent={true} statusBarTranslucent>
      <Animated.View style={[styles.container, exitAnimatedStyle]}>
        {/* Sunburst — sits behind everything, below the close button. */}
        <Sunburst opacity={sunburstOpacity} rotation={sunburstRotation} />

        <View
          style={[
            styles.safe,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          {/* Close — top-right X. Routes through handleClose so the
              local exit fade runs before onContinue fires (otherwise
              the parent's calendar re-render races the Modal's native
              fade-out and clobbers data mid-close). */}
          <Pressable
            style={styles.closeButton}
            hitSlop={16}
            onPress={() => handleClose(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Ionicons name="close" size={32} color={colors.onyx} />
          </Pressable>

          {/* Center column — flex: 1 + justifyContent center optically
              centers the card vertically on every device. Replaces the
              previous screen-relative `top: 218` math. */}
          <View style={styles.contentColumn}>
            <Animated.View style={[styles.card, cardAnimatedStyle]}>
              {/* Flame Rive — absolute, peeks 74 px above the card top. */}
              <Animated.View style={[styles.flame, flameAnimatedStyle]} pointerEvents="none">
                <Rive
                  ref={riveRef}
                  source={streakFlame}
                  autoplay
                  animationName="burning_flame"
                  fit={Fit.Contain}
                  alignment={Alignment.Center}
                  style={styles.flameRive}
                />
              </Animated.View>

              {/* Streak number — flex child. paddingTop on the card
                  clears the flame area so the number lands below the
                  visible flame footprint. */}
              <Animated.View style={numberAnimatedStyle}>
                <Typography
                  family="bounded"
                  weight="900"
                  size={90}
                  align="center"
                  extraColor={colors.black}
                  style={styles.numberText}
                >
                  {String(displayedNumber)}
                </Typography>
              </Animated.View>

              {/* DAY STREAK label */}
              <Animated.View style={[styles.labelSlot, labelAnimatedStyle]}>
                <Typography
                  family="bounded"
                  weight="900"
                  size={25}
                  align="center"
                  uppercase
                  extraColor={colors.black}
                  style={styles.labelText}
                >
                  {'Day Streak!'}
                </Typography>
              </Animated.View>

              {/* Week card — alignSelf stretch fills card-minus-padding
                  (= 327px). */}
              <Animated.View style={[styles.weekCard, weekAnimatedStyle]}>
                <Animated.View style={[styles.weekLabelsRow, weekLabelsAnimatedStyle]}>
                  {weekData.map(({ day, completed }) => (
                    <Typography
                      key={day}
                      family="onest"
                      weight="600"
                      size={14}
                      align="center"
                      extraColor={completed ? colors.white : '#F4EBDB'}
                      style={styles.weekLabelText}
                    >
                      {day}
                    </Typography>
                  ))}
                </Animated.View>
                <View style={styles.weekIndicatorsRow}>
                  {weekData.map(({ day, completed, missed, isToday }, idx) => {
                    const state: 'done' | 'missed' | 'pending' = completed
                      ? 'done'
                      : missed
                        ? 'missed'
                        : 'pending';
                    return (
                      <DayIndicator
                        key={day}
                        state={state}
                        isToday={isToday}
                        scale={dayScales[idx]}
                        opacity={dayOpacities[idx]}
                        checkScale={state === 'done' ? checkScales[idx] : undefined}
                        checkOpacity={state === 'done' ? checkOpacities[idx] : undefined}
                      />
                    );
                  })}
                </View>
              </Animated.View>

              {/* Motivational message — flex child, 1–3 lines, card
                  grows to fit. width 288 matches the Figma message bbox. */}
              <Animated.View style={[styles.messageSlot, messageAnimatedStyle]}>
                <Typography
                  family="onest"
                  weight="600"
                  size={16}
                  align="center"
                  extraColor={colors.onyx}
                  style={styles.messageText}
                >
                  {getMotivationalQuote(streakCount)}
                </Typography>
              </Animated.View>
            </Animated.View>
          </View>

          {/* CONTINUE — DepthButton onyx surface + white shadow, matches
              the design-system primary CTA shell used across the
              redesign. Same `handleClose` flow as the X — local fade
              first, then onContinue. */}
          <Animated.View style={[styles.ctaSlot, buttonAnimatedStyle]}>
            <DepthButton
              surfaceColor="onyx"
              shadowColor="white"
              borderColor="onyx"
              onPress={() => handleClose(Haptics.ImpactFeedbackStyle.Medium)}
            >
              <Typography variant="label.m" color="white">
                CONTINUE
              </Typography>
            </DepthButton>
          </Animated.View>
        </View>

        {/* Confetti — fires once at +1.15s; renders above the card so
            particles visibly burst over the flame + number. */}
        <ConfettiBurst
          ref={confettiRef}
          colors={['#E5D4FF', '#C6A8FF', '#F5804C', '#F5A62C', '#FFE36B', '#1E3C88', '#7E3FD8']}
          count={110}
          spread={90}
          startVelocity={42}
          gravity={1.0}
        />
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.acaiTertiary,
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.07,
    right: 24,
    zIndex: 100,
    elevation: 100,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunburst: {
    position: 'absolute',
    width: SUNBURST_DIAMETER,
    height: SUNBURST_DIAMETER,
  },
  // Card-host wrapper — flex:1 fills the SafeArea so the card's
  // percentage `top` anchor (below) computes against the safe-area
  // height. NO MORE flex-centering math — the previous
  // `justifyContent: center` form computed card position as
  // `(parentHeight - cardHeight) / 2`, which re-runs whenever cardHeight
  // changes by even a sub-pixel during the entrance (Reanimated worklet
  // commits, text-metric finalization, etc.) and visibly shifts the
  // card. With the card absolute-positioned at `top: 22%`, its position
  // is anchored to the PARENT's height only — totally independent of
  // anything happening inside the card.
  contentColumn: {
    flex: 1,
  },
  // Card is absolute-positioned at 22% of SafeArea height — that
  // ratio is the Figma anchor (218 / (852 - 47 status bar inset) =
  // 22.2%) and scales proportionally across devices. left/right
  // padding gives the card the design-system gutter without a
  // hardcoded width. Inside the card, content still flows via flex
  // column (paddingTop clears the flame, alignItems centers the
  // children, message text wraps inside its paddingHorizontal inset).
  card: {
    position: 'absolute',
    top: '22%',
    left: SCREEN_PADDING_HORIZONTAL,
    right: SCREEN_PADDING_HORIZONTAL,
    paddingTop: CARD_PADDING_TOP,
    paddingHorizontal: CARD_PADDING_HORIZONTAL,
    paddingBottom: CARD_PADDING_BOTTOM,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  // Flame + pedestal are absolute INSIDE the card — they overflow
  // above the top edge so the flame "sits on" the card. Card has no
  // `overflow: hidden` so this works. Centered via `left: 50%` +
  // negative `marginLeft` (RN's equivalent of CSS
  // `transform: translateX(-50%)` since the parent width is unknown
  // at style-eval time). The +4 shifts horizontally to match Figma's
  // `left: calc(50% + 4px)` anchor.
  pedestal: {
    position: 'absolute',
    top: PEDESTAL_TOP_RELATIVE_TO_CARD,
    left: '50%',
    marginLeft: -PEDESTAL_WIDTH / 2 + 4,
    width: PEDESTAL_WIDTH,
    height: PEDESTAL_HEIGHT,
    zIndex: 2,
  },
  flame: {
    position: 'absolute',
    top: FLAME_TOP_RELATIVE_TO_CARD,
    left: '50%',
    marginLeft: -FLAME_SIZE / 2 + 4,
    width: FLAME_SIZE,
    height: FLAME_HEIGHT,
    zIndex: 3,
  },
  flameRive: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  numberText: {
    letterSpacing: -1,
    lineHeight: 99,
  },
  // Gap from number to label per Figma (216.5 - 192.5 = ~24px after
  // accounting for line-height boxes).
  labelSlot: {
    marginTop: 8,
  },
  labelText: {
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  weekCard: {
    alignSelf: 'stretch', // fills card width minus padding (= 327px)
    marginTop: 18,
    backgroundColor: colors.black,
    borderRadius: 25,
    paddingHorizontal: 21,
    paddingTop: 24,
    paddingBottom: 24,
  },
  weekLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  weekLabelText: {
    width: 26,
  },
  weekIndicatorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  dayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleDone: {
    backgroundColor: '#7E3FD8',
  },
  dayCircleToday: {
    transform: [{ scale: 1.05 }],
    shadowColor: '#7E3FD8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  dayCircleMissed: {
    backgroundColor: '#999999',
  },
  // Pending pill — Figma 3365:8850 renders these as light-purple (the
  // same acai-tertiary used as the page background). The HTML mock
  // had translucent white (rgba(255,255,255,0.16)) which on the black
  // week card appears dim grey, not purple — Figma is the authority
  // for the redesign so we override the mock here.
  dayCirclePending: {
    backgroundColor: colors.acaiTertiary,
  },
  // Cross-platform missed dash — 10×2 white View centered in the circle.
  // Replaces the previous `<Text>—</Text>` which centered inconsistently
  // on Android due to includeFontPadding + lineHeight font-metric quirks.
  missedDash: {
    width: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  // Message slot — alignSelf stretch fills card-content width, then
  // paddingHorizontal narrows the text bbox so the message wraps to a
  // shorter line than the week card above it (matches Figma's 288 in
  // 358 ratio without hardcoding either width).
  messageSlot: {
    marginTop: 24,
    alignSelf: 'stretch',
    paddingHorizontal: MESSAGE_PADDING_HORIZONTAL,
  },
  messageText: {
    lineHeight: 21,
  },
  // CTA absolute-positioned at the SafeArea bottom — pulled out of
  // flex flow so its intrinsic-size measurements (DepthButton shadow
  // ascent, Onest font glyph metrics finalizing post-mount) can't
  // propagate into `contentColumn`'s flex:1 sizing math and shift
  // the card vertically. `contentColumn`'s `paddingBottom:
  // BUTTON_AREA_HEIGHT` reserves the visual real estate so the card
  // centers in the same place as before. left/right padding gives
  // the DepthButton (isFullWidth default) its proper Figma width
  // without a hardcoded `width: 327`.
  ctaSlot: {
    position: 'absolute',
    bottom: BUTTON_BOTTOM_OFFSET,
    left: BUTTON_HORIZONTAL_PADDING,
    right: BUTTON_HORIZONTAL_PADDING,
  },
});
