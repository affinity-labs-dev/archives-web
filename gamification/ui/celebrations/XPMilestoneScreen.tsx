// XP Milestone Screen — celebration after hitting an XP milestone.
// Layout follows Figma 3215:9594. Animation timeline + blob drift loops
// ported 1:1 from `Downloads/03 questions/index.html` (`enterXpEarned()`
// + `@keyframes xp-drift-{1..3}`). See DEVELOPER_INSTRUCTIONS.md
// "Screen 7 — Earned XP" for the full motion spec we matched.

import {
  ConfettiBurst,
  Typography,
  colors,
  easings,
  safeDuration,
  type ConfettiBurstHandle,
} from '@/components/ui';
import { ADVENTURE_KEYS } from '@/constants/WalkthroughKeys';
import { useGamifiedProgress } from '@/gamification';
import { analyticsService } from '@/services/AnalyticsService';
import Rive, { Alignment, Fit } from 'rive-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BlobsBackground } from './XPMilestone';

// AnimatedTextInput drives a digit ticker on the UI thread without
// React re-renders. <Text> has no `text` prop (its body is children)
// so we use TextInput, styled to look exactly like a Text node.
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ibuCelebratingRive = require('@/assets/rive/ibu-celebrating.riv');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animation timeline — ported 1:1 from `enterXpEarned()` in the HTML
// mock. Time origin = 0 at modal mount; durations in milliseconds.
// (Blob drift periods/keyframes live with the BlobsBackground component
// — they're internal to that layer and not referenced from here.)
const ANIM = {
  ibuDrop: { delay: 200, dur: 800 },
  card: { delay: 900, dur: 550 },
  countUp: { delay: 1200, dur: 900 },
  label: { delay: 1250, dur: 300 },
  sub: { delay: 1600, dur: 400 },
  // Confetti fires after the count-up lands — same `onComplete` hook
  // the GSAP timeline used. delay = countUp.delay + countUp.dur.
  confetti: { delay: 1200 + 900 },
  ibuBreathe: { period: 3500 },
  ibuSway: { period: 11000 },
  // Auto-dismiss + exit fade. ~4.5s gives the user a beat after the
  // confetti before the screen advances; tap-anywhere also dismisses.
  autoDismiss: 4500,
  exitFade: 220,
  // Tap-to-advance only listens after the entrance + count-up land, so
  // a stray tap during the celebration doesn't blow past the moment.
  tapEnableAfter: 2300,
} as const;

interface XPMilestoneScreenProps {
  totalXP?: number;
  milestoneXP?: number; // Which milestone was reached (50, 100, 200, 400, 750)
  eraId?: string;
  onContinue?: () => void;
}

export default function XPMilestoneScreen({
  milestoneXP,
  eraId,
  onContinue,
}: XPMilestoneScreenProps) {
  const { addMilestone } = useGamifiedProgress();

  // Refs guard one-shot side effects — useEffect re-runs on identity
  // changes of addMilestone/onContinue, but we want each event to fire
  // exactly once per mount.
  const hasSavedRef = useRef(false);
  const isClosingRef = useRef(false);
  const tapEnabledRef = useRef(false);
  const confettiRef = useRef<ConfettiBurstHandle>(null);

  // Count-up driven by Reanimated shared value + AnimatedTextInput. The
  // previous implementation used `requestAnimationFrame` to write a
  // React state every frame (~60 setState calls/sec → 60 reconciles
  // /sec → frame budget exhausted on Android). Now: one shared value
  // tweens 0 → target via withTiming, animatedProps writes the rounded
  // integer directly into TextInput.text on the UI thread. React
  // renders the input ONCE on mount; every subsequent count update is
  // a native prop write.
  const target = milestoneXP ?? 0;
  const countValue = useSharedValue(0);

  // Persist milestone reach + analytics — once per mount. Ref-guarded so
  // re-renders from `addMilestone` identity changes don't double-save.
  useEffect(() => {
    if (milestoneXP && !hasSavedRef.current) {
      hasSavedRef.current = true;
      analyticsService.trackCustomEvent('xp_milestone_reached', {
        milestone_xp: milestoneXP,
      });
      console.log(`📊 [Analytics] XP Milestone Reached: ${milestoneXP} XP`);
      addMilestone({ type: 'xp', threshold: milestoneXP, era_id: eraId });
    }
  }, [milestoneXP, eraId, addMilestone]);

  // ─── Shared values: entrance + exit + idle (foreground only) ────
  // Blob drift state lives entirely in <BlobsBackground />.
  const exitOpacity = useSharedValue(1);
  const ibuY = useSharedValue(-30);
  const ibuOpacity = useSharedValue(0);
  const cardY = useSharedValue(40);
  const cardScale = useSharedValue(0.92);
  const cardOpacity = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const subY = useSharedValue(12);
  const subOpacity = useSharedValue(0);
  // Number pop is the only "bounce on milestone" beat — starts at 1,
  // pops 1 → 1.32 → 1 once the count-up lands.
  const numberScale = useSharedValue(1);
  // Ibu idle loops
  const ibuBreatheScale = useSharedValue(1);
  const ibuSwayRot = useSharedValue(0);

  // ─── Master entrance + Ibu idle effect (runs once on mount) ─────
  useEffect(() => {
    const easeIO = easings.power2InOut;

    // Ibu breathe: gentle scale oscillation 1 ↔ 1.025
    ibuBreatheScale.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: ANIM.ibuBreathe.period / 2, easing: easeIO }),
        withTiming(1, { duration: ANIM.ibuBreathe.period / 2, easing: easeIO }),
      ),
      -1,
      false,
    );

    // Ibu sway: ±0.6° rotation, reversing direction each half-period
    ibuSwayRot.value = withRepeat(
      withTiming(0.6, { duration: ANIM.ibuSway.period / 2, easing: easeIO }),
      -1,
      true,
    );

    // ─── Entrance timeline (HTML enterXpEarned 1:1) ────────────────
    // 0.20s — Cheering Ibu drops in with elastic overshoot.
    const elasticEase = Easing.out(Easing.elastic(0.55));
    ibuY.value = withDelay(
      safeDuration(ANIM.ibuDrop.delay),
      withTiming(0, { duration: safeDuration(ANIM.ibuDrop.dur), easing: elasticEase }),
    );
    ibuOpacity.value = withDelay(
      safeDuration(ANIM.ibuDrop.delay),
      withTiming(1, { duration: safeDuration(ANIM.ibuDrop.dur), easing: easings.power2Out }),
    );

    // 0.90s — Black XP card slides up + settles. back.out(1.8) maps to
    // backOut17 (back.out(1.75)) in the design-system token table —
    // visually indistinguishable from 1.8 at 550ms.
    const cardEase = easings.backOut17;
    cardY.value = withDelay(
      safeDuration(ANIM.card.delay),
      withTiming(0, { duration: safeDuration(ANIM.card.dur), easing: cardEase }),
    );
    cardScale.value = withDelay(
      safeDuration(ANIM.card.delay),
      withTiming(1, { duration: safeDuration(ANIM.card.dur), easing: cardEase }),
    );
    cardOpacity.value = withDelay(
      safeDuration(ANIM.card.delay),
      withTiming(1, { duration: safeDuration(ANIM.card.dur), easing: easings.power2Out }),
    );

    // 1.25s — "Earned XP" label fades in alongside the count.
    labelOpacity.value = withDelay(
      safeDuration(ANIM.label.delay),
      withTiming(1, { duration: safeDuration(ANIM.label.dur), easing: easings.power2Out }),
    );

    // 1.60s — Subhead text slides up + fades.
    subY.value = withDelay(
      safeDuration(ANIM.sub.delay),
      withTiming(0, { duration: safeDuration(ANIM.sub.dur), easing: easings.power2Out }),
    );
    subOpacity.value = withDelay(
      safeDuration(ANIM.sub.delay),
      withTiming(1, { duration: safeDuration(ANIM.sub.dur), easing: easings.power2Out }),
    );

    return () => {
      cancelAnimation(ibuBreatheScale);
      cancelAnimation(ibuSwayRot);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Count-up + landing celebration (pop + haptic + confetti) ─────
  // One Reanimated tween drives the digit ticker on the UI thread. The
  // worklet's onComplete callback hops back to JS to fire the landing
  // celebration — exact sync with the count finishing, no drift from
  // a separate setTimeout.
  useEffect(() => {
    if (target <= 0) return;

    // JS-side landing handler (called via scheduleOnRN from the worklet).
    const handleLanded = () => {
      numberScale.value = withSequence(
        withTiming(1.32, { duration: safeDuration(200), easing: easings.backOut2 }),
        withTiming(1, { duration: safeDuration(260), easing: easings.power2InOut }),
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      confettiRef.current?.fire({
        x: SCREEN_WIDTH / 2,
        y: SCREEN_HEIGHT * 0.62,
      });
    };

    cancelAnimation(countValue);
    countValue.value = 0;
    countValue.value = withDelay(
      safeDuration(ANIM.countUp.delay),
      withTiming(
        target,
        { duration: safeDuration(ANIM.countUp.dur), easing: easings.power2Out },
        (finished) => {
          'worklet';
          if (finished) {
            scheduleOnRN(handleLanded);
          }
        },
      ),
    );

    // Tap-anywhere arming runs alongside on a plain timer (independent
    // of the count-up worklet so a reduced-motion run still arms taps
    // at roughly the same wall-clock time).
    const tapT = setTimeout(() => {
      tapEnabledRef.current = true;
    }, ANIM.tapEnableAfter);

    return () => {
      cancelAnimation(countValue);
      clearTimeout(tapT);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // animatedProps writes the rounded count directly into the TextInput's
  // text prop on the UI thread — no React render involved.
  const countAnimatedProps = useAnimatedProps(() => {
    'worklet';
    const v = Math.floor(countValue.value);
    return {
      text: `${v}+`,
      defaultValue: `${v}+`,
    } as object;
  });

  // ─── Close handler — local fade-out then onContinue ──────────────
  // Both the auto-dismiss timer and the tap-anywhere Pressable route
  // through here. The fade lands at opacity 0 in 220ms, then the
  // worklet completion hops back to JS via scheduleOnRN and fires the
  // parent's onContinue — guarantees the visual close finishes before
  // the orchestrator clears `currentCelebration` and the underlying
  // view re-renders.
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (milestoneXP) {
      analyticsService.trackCustomEvent('xp_milestone_dismissed', {
        milestone_xp: milestoneXP,
      });
      console.log(`📊 [Analytics] XP Milestone Dismissed: ${milestoneXP} XP`);

      AsyncStorage.setItem(
        ADVENTURE_KEYS.getXPMilestoneKey(milestoneXP, eraId),
        'true',
      )
        .then(() =>
          console.log(
            `✅ Marked XP milestone screen as seen: ${milestoneXP} XP for era: ${eraId || 'global'}`,
          ),
        )
        .catch((error) => console.error('❌ Error saving XP milestone flag:', error));
    }

    exitOpacity.value = withTiming(
      0,
      { duration: safeDuration(ANIM.exitFade), easing: easings.power2In },
      (finished) => {
        'worklet';
        if (finished && onContinue) {
          scheduleOnRN(onContinue);
        }
      },
    );
  }, [milestoneXP, eraId, onContinue, exitOpacity]);

  // Auto-dismiss timer — `handleClose` is idempotent via isClosingRef
  // so a manual tap before this fires won't cause a double-dismiss.
  useEffect(() => {
    const t = setTimeout(handleClose, ANIM.autoDismiss);
    return () => clearTimeout(t);
  }, [handleClose]);

  const handleTapAnywhere = useCallback(() => {
    if (!tapEnabledRef.current) return;
    handleClose();
  }, [handleClose]);

  // ─── Animated styles ─────────────────────────────────────────────
  const exitStyle = useAnimatedStyle(() => ({ opacity: exitOpacity.value }));
  const ibuStyle = useAnimatedStyle(() => ({
    opacity: ibuOpacity.value,
    transform: [
      { translateY: ibuY.value },
      { rotate: `${ibuSwayRot.value}deg` },
      { scale: ibuBreatheScale.value },
    ],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }, { scale: cardScale.value }],
  }));
  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberScale.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));
  const subStyle = useAnimatedStyle(() => ({
    opacity: subOpacity.value,
    transform: [{ translateY: subY.value }],
  }));

  return (
    <Animated.View style={[styles.container, exitStyle]}>
      {/* Tap-anywhere advance — full-bleed Pressable rendered FIRST so
          it sits at the bottom of the absolute stack. Decorative
          children above use pointerEvents="none" so taps fall through
          to this layer. Only fires after `tapEnabledRef` flips true
          (~2.3s after mount) so a stray tap during the entrance can't
          skip the moment. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleTapAnywhere} />

      {/* Drifting blob bg — extracted into its own component so the
          shared values + idle loops + entrance fade live alongside the
          SVG paths they drive. Mounts and animates independently. */}
      <BlobsBackground />

      {/* Mascot — cheering Ibu with pompoms. Three-axis transform
          (entrance Y, sway rotation, breathe scale) all composed in
          ibuStyle. */}
      <Animated.View style={[styles.ibuWrap, ibuStyle]} pointerEvents="none">
        <Rive
          source={ibuCelebratingRive}
          autoplay
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={styles.ibu}
        />
      </Animated.View>

      {/* Black XP card — 350+ / Earned XP. The number scale animates
          independently for the count-up "pop" without disturbing the
          card's own entrance scale. */}
      <Animated.View style={[styles.cardWrap, cardStyle]} pointerEvents="none">
        <View style={styles.card}>
          {/* AnimatedTextInput drives the digit ticker on the UI thread
              via animatedProps — zero React re-render per frame. The
              wrapper handles the entrance pop scale (numberStyle).
              TextInput is styled to look exactly like the previous
              Typography output (Bounded-Black 77 white). */}
          <Animated.View style={numberStyle}>
            <AnimatedTextInput
              editable={false}
              caretHidden
              selectTextOnFocus={false}
              showSoftInputOnFocus={false}
              underlineColorAndroid="transparent"
              allowFontScaling={false}
              defaultValue="0+"
              animatedProps={countAnimatedProps}
              style={styles.numberTextInput}
            />
          </Animated.View>
          <Animated.View style={labelStyle}>
            <Typography
              family="bounded"
              weight="400"
              size={24}
              align="center"
              extraColor={colors.white}
              style={styles.labelText}
            >
              Earned XP
            </Typography>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Subhead — Onest 16 SemiBold, Figma Frame 3215:9697 */}
      <Animated.View style={[styles.subWrap, subStyle]} pointerEvents="none">
        <Typography
          family="onest"
          weight="600"
          size={16}
          align="center"
          extraColor={colors.black}
          style={styles.subText}
        >
          {'Look at you go! Your knowledge is\ngrowing stronger everyday.'}
        </Typography>
      </Animated.View>

      {/* Confetti — fires once when the count-up lands. Renders above
          everything; pointerEvents internal to the component default
          to none so taps still reach the underlying Pressable. */}
      <ConfettiBurst
        ref={confettiRef}
        colors={['#FFDD63', '#7FB53D', '#E84E80', '#FFFFFF', '#1A1A1A']}
        count={80}
        spread={90}
        startVelocity={45}
        gravity={0.9}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFDF6E',
    overflow: 'hidden',
  },
  ibuWrap: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.1,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ibu: {
    width: SCREEN_WIDTH * 0.78,
    height: '100%',
  },
  // Card center anchored at ~64% of screen height (HTML 543/852).
  // Top-edge offset = center - half_card_height. Card height ≈ 145px
  // (Bounded-Black 77 line-height ~98 + label 24 line-height ~30 +
  // 19+19 padding). 0.638 - 73/SCREEN_HEIGHT lands the top edge close
  // enough that the visual center matches across iPhone heights.
  cardWrap: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.638 - 73,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 26,
    paddingHorizontal: 42,
    paddingVertical: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5.4,
    elevation: 6,
  },
  numberText: {
    letterSpacing: -1,
  },
  // AnimatedTextInput styled to match the previous Typography
  // (family="bounded" weight="900" size=77 white). TextInput-specific
  // resets: `padding: 0` kills implicit input chrome padding,
  // `includeFontPadding: false` removes Android baseline metric pad
  // that mis-centers digits, `textAlignVertical: 'center'` matches
  // <Text>'s baseline. minWidth keeps the count from collapsing during
  // the first few frames as the digit count grows.
  numberTextInput: {
    fontFamily: 'Bounded-Black',
    fontSize: 77,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    minWidth: 200,
  },
  labelText: {
    marginTop: 3,
    letterSpacing: -0.24,
  },
  subWrap: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.79,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
  },
  subText: {
    lineHeight: 22,
    letterSpacing: -0.16,
  },
});
