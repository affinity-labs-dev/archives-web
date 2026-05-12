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
import React, { useCallback, useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';

import {
  ANIM,
  BUTTON_BOTTOM_OFFSET,
  BUTTON_HORIZONTAL_PADDING,
  CARD_PADDING_BOTTOM,
  CARD_PADDING_HORIZONTAL,
  CARD_PADDING_TOP,
  CELEBRATION_SOUND,
  DayIndicator,
  FLAME_HEIGHT,
  FLAME_SIZE,
  FLAME_TOP_RELATIVE_TO_CARD,
  MESSAGE_PADDING_HORIZONTAL,
  PEDESTAL_HEIGHT,
  PEDESTAL_TOP_RELATIVE_TO_CARD,
  PEDESTAL_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_PADDING_HORIZONTAL,
  SCREEN_WIDTH,
  STREAK_FLAME,
  Sunburst,
  getMotivationalQuote,
  useCountUp,
  useStreakEntranceAnimation,
  type StreakCelebrationScreenProps,
} from './StreakCelebration';

// AnimatedTextInput: canonical RN pattern for driving text from
// Reanimated worklets. <Text> has no `text` prop (body is children),
// but TextInput does — so animatedProps can update text directly on
// the UI thread without going through React.
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

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

  // All Reanimated state + the entrance/reset useEffect lives in the
  // hook. We get back the bundled animatedStyles (one per element)
  // plus the per-day arrays + the raw shared values that need to be
  // passed to children (Sunburst) or driven imperatively
  // (exitOpacity from the close handler).
  const anim = useStreakEntranceAnimation({ visible, weekData });

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

  // Fire confetti + chime when the count-up lands. The 100ms breath
  // matches the prior `confetti.delay = countUp.delay + countUp.dur +
  // 100` constant — gives the user a beat to register the final digit
  // before the burst overlays it. Routed through the count-up's own
  // onComplete so the timing is exact (not best-effort via setTimeout).
  const handleCountComplete = useCallback(() => {
    setTimeout(() => {
      confettiRef.current?.fire({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT * 0.4 });
      playCelebration();
    }, 100);
  }, [playCelebration]);

  // Count-up driven by Reanimated shared value + AnimatedTextInput.
  // `animatedProps` writes the digit directly into the TextInput's
  // text prop on the UI thread — no React re-render per frame, which
  // was the source of the "1, 2, 3 lag" on Android.
  const { animatedProps: countAnimatedProps } = useCountUp({
    visible,
    streakCount,
    onComplete: handleCountComplete,
  });

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
  const { exitOpacity } = anim;
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

  return (
    // `transparent={true}` removes the Modal's opaque white default
    // backing. With it on, our local exit fade reveals whatever was
    // underneath (today tab) instead of flashing a white panel
    // before the Modal's native fade-out finishes. The fade-in
    // animationType still works for the open.
    <Modal visible={visible} animationType="fade" transparent={true} statusBarTranslucent>
      <Animated.View style={[styles.container, anim.exitAnimatedStyle]}>
        {/* Sunburst — sits behind everything, below the close button. */}
        <Sunburst opacity={anim.sunburstOpacity} rotation={anim.sunburstRotation} />

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
            <Animated.View style={[styles.card, anim.cardAnimatedStyle]}>
              {/* Flame Rive — absolute, peeks 74 px above the card top. */}
              <Animated.View style={[styles.flame, anim.flameAnimatedStyle]} pointerEvents="none">
                <Rive
                  ref={riveRef}
                  source={STREAK_FLAME}
                  autoplay
                  animationName="burning_flame"
                  fit={Fit.Contain}
                  alignment={Alignment.Center}
                  style={styles.flameRive}
                />
              </Animated.View>

              {/* Streak number — flex child. paddingTop on the card
                  clears the flame area so the number lands below the
                  visible flame footprint.

                  AnimatedTextInput drives the digit ticker on the UI
                  thread via animatedProps (zero React re-render per
                  frame). The wrapper Animated.View handles the
                  separate entrance scale/opacity (numberAnimatedStyle).
                  TextInput is styled to look exactly like the previous
                  Typography output: same font, size, weight color,
                  letterSpacing, lineHeight. The flag set below
                  (`editable={false}`, `caretHidden`, etc.) makes it
                  behave as a static label visually. */}
              <Animated.View style={anim.numberAnimatedStyle}>
                <AnimatedTextInput
                  editable={false}
                  caretHidden
                  selectTextOnFocus={false}
                  showSoftInputOnFocus={false}
                  underlineColorAndroid="transparent"
                  allowFontScaling={false}
                  defaultValue="0"
                  animatedProps={countAnimatedProps}
                  style={styles.numberTextInput}
                />
              </Animated.View>

              {/* DAY STREAK label */}
              <Animated.View style={[styles.labelSlot, anim.labelAnimatedStyle]}>
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
              <Animated.View style={[styles.weekCard, anim.weekAnimatedStyle]}>
                <Animated.View style={[styles.weekLabelsRow, anim.weekLabelsAnimatedStyle]}>
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
                  {weekData.map(({ day, completed, missed, shielded, isToday }, idx) => {
                    const state: 'done' | 'missed' | 'shielded' | 'pending' = shielded
                      ? 'shielded'
                      : completed
                        ? 'done'
                        : missed
                          ? 'missed'
                          : 'pending';
                    return (
                      <DayIndicator
                        key={day}
                        state={state}
                        isToday={isToday}
                        scale={anim.dayScales[idx]}
                        opacity={anim.dayOpacities[idx]}
                        checkScale={state === 'done' || state === 'shielded' ? anim.checkScales[idx] : undefined}
                        checkOpacity={state === 'done' || state === 'shielded' ? anim.checkOpacities[idx] : undefined}
                      />
                    );
                  })}
                </View>
              </Animated.View>

              {/* Motivational message — flex child, 1–3 lines, card
                  grows to fit. width 288 matches the Figma message bbox. */}
              <Animated.View style={[styles.messageSlot, anim.messageAnimatedStyle]}>
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
          <Animated.View style={[styles.ctaSlot, anim.buttonAnimatedStyle]}>
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

        {/* Confetti — fires once at +1.65s; renders above the card so
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
// Styles — only the ones owned by this file's JSX. Sub-component
// styles (sunburst, dayCircle*) live in their own files.
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
  // AnimatedTextInput styled to look identical to the previous
  // Typography output (family="bounded" weight="900" size=90 black).
  // Extra resets are needed because TextInput has different defaults
  // than Text on Android: `padding: 0` kills the implicit input chrome
  // padding, `includeFontPadding: false` removes Android's baseline
  // metric pad that would otherwise mis-center the digits, and
  // `textAlignVertical: 'center'` matches `<Text>`'s vertical baseline.
  numberTextInput: {
    fontFamily: 'Bounded-Black',
    fontSize: 90,
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 99,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    // Min width keeps single-digit values from collapsing to zero
    // intrinsic width during the count-up's first few frames (TextInput
    // sizes to content; with no min width "0" → "1" → "2" subtly
    // breathes the surrounding layout). Tuned for 3 digits at 90pt.
    minWidth: 180,
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
  // the card vertically. left/right padding gives the DepthButton
  // (isFullWidth default) its proper Figma width without a hardcoded
  // `width: 327`.
  ctaSlot: {
    position: 'absolute',
    bottom: BUTTON_BOTTOM_OFFSET,
    left: BUTTON_HORIZONTAL_PADDING,
    right: BUTTON_HORIZONTAL_PADDING,
  },
});
