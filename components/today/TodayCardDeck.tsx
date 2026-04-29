import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Path, SvgXml } from "react-native-svg";

import {
  PaginationDots,
  Typography,
  colors,
  easings,
  safeDuration,
} from "@/components/ui";

import {
  completedStarSvg,
  incompleteStarSvg,
  rewatchIconSvg,
} from "./icons/todayIcons";

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface TodayCardData {
  kind: "watch" | "explore" | "questions";
  kicker: string;
  title: string;
  minutes: string;
  pillLabel: string;
  imageSource?: ImageSource | number;
  /**
   * When true, the card swaps its right-side pill for the green
   * Rewatch / Restart-my-day variant (mock `index.html:1196,1893-1908`).
   * Per-card so each section's pill flips independently as the user
   * progresses through watch → explore → questions.
   */
  completed?: boolean;
  /**
   * Quiz correct-answer count (0..3) once the quiz has been submitted; null
   * before then. Drives the gold-star row that appears at the top of the
   * centered card. Same value is forwarded to all three cards so the row
   * follows whichever is currently centered.
   */
  quizCorrectAnswers?: number | null;
  onPress: () => void;
}

interface TodayCardDeckProps {
  cards: [TodayCardData, TodayCardData, TodayCardData];
  initialCenterIdx?: number;
  onCenterChange?: (idx: number) => void;
  /**
   * Forwarded to each Card so the completed-pill entrance animation only
   * plays for genuine user-action flips. While `true` (Supabase fetch in
   * flight, day switch, etc.) the pill snaps to whatever `completed` says
   * without animating — prevents a Watch→Rewatch flash on screen mount
   * for already-completed days.
   */
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
}

// ──────────────────────────────────────────────────────────
// Animation + layout constants (ported from
// `Downloads/02 daily story/index.html:2102-2200` and Figma 3365:9298)
// ──────────────────────────────────────────────────────────

const CARD_WIDTH = 252;
const CARD_HEIGHT = 402;
const CARD_RADIUS = 32;

const SLOT_OFFSET_X = 60;
const CENTER_SCALE = 1;
const SIDE_SCALE = 0.96;

const WRAP_FADE_DURATION_MS = 220;
const WRAP_FADE_DELAY_MS = 60;
const CONTENT_FADE_MS = 180;
const HUM_DURATION_MS = 2600;
const HUM_SCALE = 1.02;

// Day-switch crossfade — mock `index.html:1980-2056` `renderDayCards()`:
//   image: dual-layer crossfade, outgoing fades 1→0 over 500ms power2.inOut
//   title: fade out 200ms power2.out → swap text → fade in 300ms power2.out
const IMAGE_CROSSFADE_MS = 500;
const TITLE_FADE_OUT_MS = 200;
const TITLE_FADE_IN_MS = 300;

// Slide uses a spring instead of a fixed-duration ease — feels snappier than
// the mock's `power3.out` 600ms timing, no perceptible "decay tail" at the end.
const SLIDE_SPRING = {
  damping: 22,
  stiffness: 220,
  mass: 0.9,
  overshootClamping: false,
  restDisplacementThreshold: 0.5,
  restSpeedThreshold: 2,
};

const SWIPE_THRESHOLD = 40;

const N = 3;

// Slot mapping matches `gsap.utils.wrap(-1, 2, i - centerIdx)` for N=3:
// returns -1 (left), 0 (center), or 1 (right).
const slotOf = (cardIdx: number, centerIdx: number): -1 | 0 | 1 => {
  const s = (((cardIdx - centerIdx + 1) % N) + N) % N;
  return (s - 1) as -1 | 0 | 1;
};

const slotTarget = (slot: -1 | 0 | 1) => ({
  x: slot * SLOT_OFFSET_X,
  scale: slot === 0 ? CENTER_SCALE : SIDE_SCALE,
});

// ──────────────────────────────────────────────────────────
// Play-arrow icon (inline SVG — avoids Figma MCP asset expiry)
// ──────────────────────────────────────────────────────────

const PlayArrowIcon = ({
  width = 12,
  height = 14,
  color = colors.white,
}: {
  width?: number;
  height?: number;
  color?: string;
}) => (
  <Svg width={width} height={height} viewBox="0 0 12 14" fill="none">
    <Path d="M0 0 L12 7 L0 14 Z" fill={color} />
  </Svg>
);

// ──────────────────────────────────────────────────────────
// Star row — viewBox + drop shadow live in the SVG XML files
// (`assets/svg/today/{completed,incomplete}_star.svg`). The XML strings
// are imported above; rendering is delegated to `<SvgXml>` so we don't
// duplicate the path / filter markup here.
// Star entrance — mock `index.html:1898-1901`:
//   gsap.from(stars, { scale: 0, opacity: 0, ease: 'back.out(2)',
//                      duration: 0.5, stagger: 0.08 })
// `back.out(N)` ≡ `Easing.out(Easing.back(N))` in Reanimated, no spring
// approximation — keeps the overshoot identical to the mock.
const STAR_ENTRANCE_MS = 500;
const STAR_STAGGER_MS = 80;

interface StarProps {
  filled: boolean;
  visible: boolean;
  delayMs: number;
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
}

function StarSlot({
  filled,
  visible,
  delayMs,
  width,
  height,
  style,
}: StarProps) {
  // Always start collapsed (scale 0, opacity 0) and let the effect drive
  // the entrance. The parent gates StarSlot mount on `showStars`, so a fresh
  // mount here means we genuinely want the back.out(2) pop to play.
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Entrance — mock `index.html:1898-1901`:
      //   gsap.from(stars, { scale: 0, opacity: 0,
      //                      ease: 'back.out(2)', duration: 0.5,
      //                      stagger: 0.08 })
      opacity.value = withDelay(
        safeDuration(delayMs),
        withTiming(1, {
          duration: safeDuration(STAR_ENTRANCE_MS),
          easing: easings.power2Out,
        })
      );
      scale.value = withDelay(
        safeDuration(delayMs),
        withTiming(1, {
          duration: safeDuration(STAR_ENTRANCE_MS),
          easing: Easing.out(Easing.back(2)),
        })
      );
    } else {
      // Exit — quick fade for the rare case where `visible` flips back
      // (e.g. carousel slide between a completed and non-completed day).
      opacity.value = withTiming(0, { duration: safeDuration(180) });
      scale.value = withTiming(0, { duration: safeDuration(180) });
    }
  }, [visible, delayMs, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  // Asset choice is the only thing that varies — fills (gold/grey).
  // Drop shadow is applied via RN native shadow style below (not via
  // SVG filter), because Android's react-native-svg clips the SVG
  // filter region inconsistently — the middle star's top ~1/3 was
  // disappearing on Android Z Fold 6 due to that clip. Native RN
  // shadow renders the same on both platforms.
  const xml = filled ? completedStarSvg : incompleteStarSvg;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        // Explicit width/height so Yoga has hard dimensions for the
        // wrapper. Without these, the wrapper would size to SvgXml's
        // intrinsic content — which Android react-native-svg doesn't
        // advertise reliably, causing 0×0 layout boxes that get clipped
        // by ancestor `overflow: hidden`.
        { width, height, overflow: 'visible' },
        // Native drop shadow replaces the SVG `<g filter>` we stripped
        // out of `completedStarSvg` / `incompleteStarSvg`. Values match
        // the original Figma filter (feOffset dx 1.12 dy 4.47, blur
        // stdDeviation 1.12, opacity 0.6) — slightly scaled with star
        // size below.
        starShadowStyle(width),
        animatedStyle,
      ]}
    >
      <SvgXml xml={xml} width={width} height={height} />
    </Animated.View>
  );
}

// Star drop-shadow constants — match the SVG filter that was stripped
// (feOffset 1.12 dy 4.47 + Gaussian blur 1.12 at the original 37px
// reference width). Scales with star size so the visual weight stays
// proportional across STAR_LEFT/MID/RIGHT.
const STAR_SHADOW_REFERENCE_WIDTH = 37;
const STAR_SHADOW_OFFSET_X = 1.11756;
const STAR_SHADOW_OFFSET_Y = 4.47023;
const STAR_SHADOW_BLUR = 1.11756;
const STAR_SHADOW_OPACITY = 0.6;

function starShadowStyle(width: number) {
  const scale = width / STAR_SHADOW_REFERENCE_WIDTH;
  return {
    shadowColor: '#000',
    shadowOffset: {
      width: STAR_SHADOW_OFFSET_X * scale,
      height: STAR_SHADOW_OFFSET_Y * scale,
    },
    shadowOpacity: STAR_SHADOW_OPACITY,
    shadowRadius: STAR_SHADOW_BLUR * scale,
    // Android's elevation tracks vertical offset roughly — the original
    // SVG shadow has dy 4.47, so elevation 4 reads close on Android.
    elevation: 4,
  };
}

// Star-row layout — pixel positions copied verbatim from the mock CSS
// `index.html:391-393` (and the figma node 3977:10165/10166/10167).
// Card is 252px wide; left/top values are absolute inside that bounds.
const STAR_LEFT = { left: 110.96, top: 30.4, w: 35.7, h: 36.7 };
const STAR_MID = { left: 146.66, top: 17.24, w: 51.0, h: 52.4 };
const STAR_RIGHT = { left: 197.67, top: 30.4, w: 35.7, h: 36.7 };

// ──────────────────────────────────────────────────────────
// Card subcomponent
// ──────────────────────────────────────────────────────────

interface CardProps {
  data: TodayCardData;
  isCenter: boolean;
  zIndex: number;
  translateX: SharedValue<number>;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
  // Suppresses the Watch↔Rewatch crossfade while progress is being fetched
  // or refetched (day switch, app cold-start). Cards still render the
  // correct pill state — they just snap instead of tween.
  isLoading: boolean;
  onTap: () => void;
}

function Card({
  data,
  isCenter,
  zIndex,
  translateX,
  scale,
  opacity,
  isLoading,
  onTap,
}: CardProps) {
  const contentOpacity = useSharedValue(isCenter ? 1 : 0);
  const imageScale = useSharedValue(1);

  // Per-card completion state — drives the pill swap (green Rewatch /
  // Restart-my-day) and exposes the quiz correct-answer count to the star
  // row. Stars only render on the WATCH card (figma 3977:10158); they
  // stay mounted whenever watch is completed and toggle visibility via the
  // wrapper's opacity (NOT mount/unmount) so a fresh back-out entrance
  // doesn't replay every time the user swipes watch in/out of center.
  //
  // `stableCompleted` is the value the UI actually renders against — it
  // mirrors the prop, but ONLY updates while we're not loading. While a
  // fetch is in flight, the prop can flap (synchronous reset to false
  // followed by an async response back to true) but `stableCompleted`
  // sits still, so the pill never flashes Restart→Watch→Restart on a
  // same-quest refetch. Starts `null` on initial mount so neither pill is
  // shown until the first load actually settles.
  const completed = !!data.completed;
  const [stableCompleted, setStableCompleted] = useState<boolean | null>(
    null,
  );
  useEffect(() => {
    if (isLoading) return;
    setStableCompleted(completed);
  }, [completed, isLoading]);
  const stableCompletedBool = stableCompleted === true;
  const quizCorrectAnswers = data.quizCorrectAnswers;
  const renderStars =
    data.kind === "watch" &&
    stableCompletedBool &&
    quizCorrectAnswers != null;
  const completedLabel =
    data.kind === "watch" ? "Rewatch" : "Restart my day";

  // Star-row visibility — opacity-only, runs on UI thread, doesn't fight
  // the slide spring or the card hum. The inner StarSlots only animate
  // their own scale once on mount (the completion-flip entrance).
  const starsRowOpacity = useSharedValue(isCenter ? 1 : 0);
  useEffect(() => {
    starsRowOpacity.value = withTiming(isCenter ? 1 : 0, {
      duration: safeDuration(180),
      easing: easings.power2Out,
    });
  }, [isCenter, starsRowOpacity]);
  const starsRowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: starsRowOpacity.value,
  }));

  // Completed-pill entrance — mock `index.html:1903-1907`:
  //   gsap.from(rewatch, { opacity: 0, y: 4, ease: 'back.out(1.4)',
  //                        duration: 0.35 })
  //
  // Initial values are all 0 (neither pill visible) until `stableCompleted`
  // settles for the first time. This avoids the cold-start flash where a
  // pre-completed day would briefly render the default pill before the
  // Supabase response snaps it to the green pill.
  const completedPillOpacity = useSharedValue(0);
  const completedPillTranslateY = useSharedValue(4);
  const defaultPillOpacity = useSharedValue(0);

  // First-stable-set tracker. When the Card has never seen a non-loading
  // value before, the next `stableCompleted` update is treated as a snap
  // (no animation) — that's either the very first load completing, or a
  // day-switch settling. Both should appear instantly with the right pill.
  // Reset to true whenever loading kicks back in so subsequent settles
  // also snap rather than animate from the previous day's state.
  const shouldSnapNextRef = useRef(true);
  useEffect(() => {
    if (isLoading) shouldSnapNextRef.current = true;
  }, [isLoading]);

  useEffect(() => {
    if (stableCompleted === null) {
      // Still waiting for the first stable load. Pills stay at 0/0/0.
      return;
    }

    const target = stableCompleted;

    if (shouldSnapNextRef.current) {
      // First settle (cold start) or post-load settle (day switch) —
      // snap to the right pill without playing the back-out crossfade.
      shouldSnapNextRef.current = false;
      completedPillOpacity.value = target ? 1 : 0;
      completedPillTranslateY.value = target ? 0 : 4;
      defaultPillOpacity.value = target ? 0 : 1;
      return;
    }

    // Genuine in-session flip (user finished a section / quiz) → animate.
    if (target) {
      // Default pill fades out first (200ms), completed pill rises after a
      // tiny gap with the back-out overshoot.
      defaultPillOpacity.value = withTiming(0, {
        duration: safeDuration(200),
        easing: easings.power2Out,
      });
      completedPillOpacity.value = withDelay(
        safeDuration(120),
        withTiming(1, {
          duration: safeDuration(350),
          easing: Easing.out(Easing.back(1.4)),
        })
      );
      completedPillTranslateY.value = withDelay(
        safeDuration(120),
        withTiming(0, {
          duration: safeDuration(350),
          easing: Easing.out(Easing.back(1.4)),
        })
      );
    } else {
      // Reverse: completed pill drops out, default pill fades back in.
      completedPillOpacity.value = withTiming(0, {
        duration: safeDuration(180),
      });
      completedPillTranslateY.value = withTiming(4, {
        duration: safeDuration(180),
      });
      defaultPillOpacity.value = withDelay(
        safeDuration(120),
        withTiming(1, {
          duration: safeDuration(220),
          easing: easings.power2Out,
        })
      );
    }
  }, [
    stableCompleted,
    completedPillOpacity,
    completedPillTranslateY,
    defaultPillOpacity,
  ]);

  const completedPillStyle = useAnimatedStyle(() => ({
    opacity: completedPillOpacity.value,
    transform: [{ translateY: completedPillTranslateY.value }],
  }));
  const defaultPillStyle = useAnimatedStyle(() => ({
    opacity: defaultPillOpacity.value,
  }));

  // Day-switch crossfade state — track current vs. outgoing image and title.
  // When parent changes `data.imageSource` / `data.title`, we keep the OLD
  // value rendered as a fading overlay while the new value mounts beneath.
  const [currentImage, setCurrentImage] = useState(data.imageSource);
  const [outgoingImage, setOutgoingImage] = useState<
    TodayCardData["imageSource"] | null
  >(null);
  const outgoingImageOpacity = useSharedValue(0);

  const [currentTitle, setCurrentTitle] = useState(data.title);
  const titleOpacity = useSharedValue(1);

  const [currentMinutes, setCurrentMinutes] = useState(data.minutes);
  const minutesOpacity = useSharedValue(1);

  // Cleanup timers so unmount during a fade doesn't leave dangling setStates
  const imageCrossfadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const titleSwapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const titleFadeInTimerRef = useRef<NodeJS.Timeout | null>(null);
  const minutesSwapTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (imageCrossfadeTimerRef.current) clearTimeout(imageCrossfadeTimerRef.current);
      if (titleSwapTimerRef.current) clearTimeout(titleSwapTimerRef.current);
      if (titleFadeInTimerRef.current) clearTimeout(titleFadeInTimerRef.current);
      if (minutesSwapTimerRef.current) clearTimeout(minutesSwapTimerRef.current);
    };
  }, []);

  // Content fade — mock uses CSS `opacity 0.3s ease` but in RN `power3.out`
  // reads snappier (decelerates harder, no perceived lag tail).
  useEffect(() => {
    contentOpacity.value = withTiming(isCenter ? 1 : 0, {
      duration: safeDuration(CONTENT_FADE_MS),
      easing: easings.power3Out,
    });
  }, [isCenter, contentOpacity]);

  // Image crossfade — mock `index.html:2013-2034`. Outgoing layer fades 1→0
  // via Reanimated tween; setTimeout schedules the cleanup of the outgoing
  // layer on the JS thread, so we don't pass JS state setters through a
  // worklet completion callback (which was causing Hermes crashes).
  useEffect(() => {
    if (data.imageSource === currentImage) return;
    setOutgoingImage(currentImage);
    setCurrentImage(data.imageSource);
    outgoingImageOpacity.value = 1;
    outgoingImageOpacity.value = withTiming(0, {
      duration: safeDuration(IMAGE_CROSSFADE_MS),
      easing: easings.power2InOut,
    });
    if (imageCrossfadeTimerRef.current) {
      clearTimeout(imageCrossfadeTimerRef.current);
    }
    imageCrossfadeTimerRef.current = setTimeout(() => {
      setOutgoingImage(null);
      imageCrossfadeTimerRef.current = null;
    }, safeDuration(IMAGE_CROSSFADE_MS));
  }, [data.imageSource, currentImage, outgoingImageOpacity]);

  // Title fade-swap — mock `index.html:2037-2048`. Out 200ms, swap, in 300ms.
  // Driven by setTimeout chain on JS thread (avoids worklet-callback crash).
  useEffect(() => {
    if (data.title === currentTitle) return;
    const nextTitle = data.title;
    titleOpacity.value = withTiming(0, {
      duration: safeDuration(TITLE_FADE_OUT_MS),
      easing: easings.power2Out,
    });
    if (titleSwapTimerRef.current) clearTimeout(titleSwapTimerRef.current);
    if (titleFadeInTimerRef.current) clearTimeout(titleFadeInTimerRef.current);
    titleSwapTimerRef.current = setTimeout(() => {
      setCurrentTitle(nextTitle);
      titleOpacity.value = withTiming(1, {
        duration: safeDuration(TITLE_FADE_IN_MS),
        easing: easings.power2Out,
      });
      titleSwapTimerRef.current = null;
    }, safeDuration(TITLE_FADE_OUT_MS));
  }, [data.title, currentTitle, titleOpacity]);

  // Minutes fade-swap — same timing as title (200ms out → swap → 300ms in).
  //
  // Debounced to avoid the day-switch oscillation: today.tsx's loadProgress
  // effect synchronously resets watchCompleted/exploreCompleted/questCompleted
  // to false, then async-fetches Supabase and sets them back. That fires
  // `data.minutes` twice in quick succession (e.g. "DONE" → "1 MIN" → "DONE")
  // which would animate the wrong intermediate value. The 350ms debounce
  // collapses that into a single net animation: if the value returns to the
  // already-displayed value within the window, we cancel the pending swap and
  // the user sees no change at all. If it settles on a new value, we animate
  // once to the latest target.
  useEffect(() => {
    // Cancel any pending swap on every effect run; we'll re-schedule below
    // if needed. This is what makes the second change (Supabase response)
    // collapse the first change's pending animation.
    if (minutesSwapTimerRef.current) {
      clearTimeout(minutesSwapTimerRef.current);
      minutesSwapTimerRef.current = null;
    }

    if (data.minutes === currentMinutes) {
      // Latest target equals what's already on screen — make sure opacity is
      // restored in case a previous fade-out was in flight.
      minutesOpacity.value = withTiming(1, {
        duration: safeDuration(120),
        easing: easings.power2Out,
      });
      return;
    }

    const nextMinutes = data.minutes;
    const DEBOUNCE_MS = 350;

    minutesSwapTimerRef.current = setTimeout(() => {
      // Animate fade-out → swap → fade-in
      minutesOpacity.value = withTiming(0, {
        duration: safeDuration(TITLE_FADE_OUT_MS),
        easing: easings.power2Out,
      });
      minutesSwapTimerRef.current = setTimeout(() => {
        setCurrentMinutes(nextMinutes);
        minutesOpacity.value = withTiming(1, {
          duration: safeDuration(TITLE_FADE_IN_MS),
          easing: easings.power2Out,
        });
        minutesSwapTimerRef.current = null;
      }, safeDuration(TITLE_FADE_OUT_MS));
    }, DEBOUNCE_MS);
  }, [data.minutes, currentMinutes, minutesOpacity]);

  // Center card's image "hum" — scale 1 ↔ 1.02 over 2.6s sine.inOut yoyo
  // (mock `startCenterCardHum()` at `index.html:1934-1938`, scales `.card-bg` not the card)
  useEffect(() => {
    if (isCenter) {
      imageScale.value = withRepeat(
        withTiming(HUM_SCALE, {
          duration: safeDuration(HUM_DURATION_MS),
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true
      );
    } else {
      imageScale.value = withTiming(1, { duration: safeDuration(200) });
    }
  }, [isCenter, imageScale]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
  }));

  const outgoingImageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: outgoingImageOpacity.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const minutesAnimatedStyle = useAnimatedStyle(() => ({
    opacity: minutesOpacity.value,
  }));

  return (
    <Animated.View
      style={[styles.cardWrap, { zIndex }, cardStyle]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onTap}
        style={styles.cardTouchable}
      >
        <Animated.View style={[styles.imageLayer, imageAnimatedStyle]}>
          {currentImage != null ? (
            <Image
              source={currentImage}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: "#222" }]}
            />
          )}
          {outgoingImage != null && (
            <Animated.View
              style={[StyleSheet.absoluteFill, outgoingImageAnimatedStyle]}
              pointerEvents="none"
            >
              <Image
                source={outgoingImage}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            </Animated.View>
          )}
        </Animated.View>

        {/* Mock gradient: `linear-gradient(31deg, rgba(0,0,0,0.98) 15.9%, rgba(0,0,0,0) 93.2%)` */}
        <LinearGradient
          colors={["rgba(0,0,0,0.98)", "rgba(0,0,0,0)"]}
          locations={[0.159, 0.932]}
          start={{ x: 0.25, y: 1 }}
          end={{ x: 0.75, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Star row — top-right of the centered card when the day is complete.
            Positions are absolute pixel offsets from the card's top-left so
            the layout matches Figma 3977:10165/10166/10167 verbatim. */}
        {renderStars && (
          <Animated.View
            style={[StyleSheet.absoluteFill, starsRowAnimatedStyle]}
            pointerEvents="none"
          >
            <StarSlot
              filled={(quizCorrectAnswers ?? 0) >= 1}
              visible={true}
              delayMs={0}
              width={STAR_LEFT.w}
              height={STAR_LEFT.h}
              style={{
                position: "absolute",
                left: STAR_LEFT.left,
                top: STAR_LEFT.top,
              }}
            />
            <StarSlot
              filled={(quizCorrectAnswers ?? 0) >= 2}
              visible={true}
              delayMs={STAR_STAGGER_MS}
              width={STAR_MID.w}
              height={STAR_MID.h}
              style={{
                position: "absolute",
                left: STAR_MID.left,
                top: STAR_MID.top,
              }}
            />
            <StarSlot
              filled={(quizCorrectAnswers ?? 0) >= 3}
              visible={true}
              delayMs={STAR_STAGGER_MS * 2}
              width={STAR_RIGHT.w}
              height={STAR_RIGHT.h}
              style={{
                position: "absolute",
                left: STAR_RIGHT.left,
                top: STAR_RIGHT.top,
              }}
            />
          </Animated.View>
        )}

        <Animated.View
          style={[styles.content, contentStyle]}
          pointerEvents={isCenter ? "box-none" : "none"}
        >
          <Typography
            variant="heading.l"
            color="white"
            numberOfLines={1}
            style={styles.kicker}
          >
            {data.kicker}
          </Typography>
          <Animated.View style={titleAnimatedStyle}>
            <Typography
              variant="body.m"
              color="white"
              weight="700"
              numberOfLines={3}
              style={styles.title}
            >
              {currentTitle}
            </Typography>
          </Animated.View>

          <View style={styles.bottomRow}>
            <Animated.View style={minutesAnimatedStyle}>
              <Typography variant="body.s" weight="600" color="white">
                {currentMinutes}
              </Typography>
            </Animated.View>

            {/* Pill stack — sized by an invisible sizer (the completed
                label, which is always the wider of the two on every card),
                so `bottomRow`'s gap to the minutes text is reserved before
                the user finishes the day. Both visible pills are absolute
                overlays anchored to the right edge so the crossfade doesn't
                shift the layout. */}
            <View style={styles.pillStack}>
              <View style={[styles.pill, styles.pillSizer]} aria-hidden>
                <SvgXml xml={rewatchIconSvg} width={14} height={16} />
                <Typography
                  variant="body.s"
                  weight="600"
                  color="white"
                >
                  {completedLabel}
                </Typography>
              </View>

              <Animated.View
                style={[styles.pillOverlay, defaultPillStyle]}
                pointerEvents={stableCompletedBool ? "none" : "auto"}
              >
                <TouchableOpacity
                  style={styles.pill}
                  activeOpacity={0.85}
                  onPress={data.onPress}
                  disabled={stableCompletedBool}
                >
                  <PlayArrowIcon
                    width={10}
                    height={12}
                    color={colors.white}
                  />
                  <Typography
                    variant="body.s"
                    weight="600"
                    color="white"
                  >
                    {data.pillLabel}
                  </Typography>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={[styles.pillOverlay, completedPillStyle]}
                pointerEvents={stableCompletedBool ? "auto" : "none"}
              >
                <TouchableOpacity
                  style={[styles.pill, styles.completedPill]}
                  activeOpacity={0.85}
                  onPress={data.onPress}
                  disabled={!stableCompletedBool}
                >
                  <SvgXml xml={rewatchIconSvg} width={14} height={16} />
                  <Typography
                    variant="body.s"
                    weight="600"
                    color="white"
                  >
                    {completedLabel}
                  </Typography>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// (Pagination dots have moved to a shared design-system primitive:
// `components/ui/PaginationDots`. Used by both the home-screen card
// deck and the in-modal video/image carousel.)

// ──────────────────────────────────────────────────────────
// Deck (main export)
// ──────────────────────────────────────────────────────────

export default function TodayCardDeck({
  cards,
  initialCenterIdx = 1,
  onCenterChange,
  isLoading = false,
  style,
}: TodayCardDeckProps) {
  const [centerIdx, setCenterIdx] = useState(initialCenterIdx);
  const centerIdxRef = useRef(centerIdx);

  // Shared values — one per card index, initialized to slots for initialCenterIdx.
  // Declared in triplicate (hooks can't be called in loops) then grouped as arrays.
  const x0 = useSharedValue(
    slotTarget(slotOf(0, initialCenterIdx)).x
  );
  const x1 = useSharedValue(
    slotTarget(slotOf(1, initialCenterIdx)).x
  );
  const x2 = useSharedValue(
    slotTarget(slotOf(2, initialCenterIdx)).x
  );
  const sc0 = useSharedValue(
    slotTarget(slotOf(0, initialCenterIdx)).scale
  );
  const sc1 = useSharedValue(
    slotTarget(slotOf(1, initialCenterIdx)).scale
  );
  const sc2 = useSharedValue(
    slotTarget(slotOf(2, initialCenterIdx)).scale
  );
  const op0 = useSharedValue(1);
  const op1 = useSharedValue(1);
  const op2 = useSharedValue(1);

  const xs = [x0, x1, x2];
  const scs = [sc0, sc1, sc2];
  const ops = [op0, op1, op2];

  const slide = (nextCenterIdx: number, wrapIdx: number | null) => {
    // Update React state FIRST so zIndex / isCenter reflect the target layout
    // when the next frame paints. The shared-value writes that follow happen
    // in the same JS task; React batches the re-render, and Reanimated
    // schedules tweens on the UI thread — both commit on the same paint.
    centerIdxRef.current = nextCenterIdx;
    setCenterIdx(nextCenterIdx);
    onCenterChange?.(nextCenterIdx);

    for (let i = 0; i < N; i++) {
      const slot = slotOf(i, nextCenterIdx);
      const target = slotTarget(slot);

      if (i === wrapIdx) {
        // CRITICAL ORDER: hide FIRST, then teleport x/scale. Otherwise the UI
        // thread can paint one frame at the new x with the previous (=1)
        // opacity — that's the flicker.
        ops[i].value = 0;
        xs[i].value = target.x;
        scs[i].value = target.scale;
        ops[i].value = withDelay(
          safeDuration(WRAP_FADE_DELAY_MS),
          withTiming(1, {
            duration: safeDuration(WRAP_FADE_DURATION_MS),
            easing: easings.power2Out,
          })
        );
      } else {
        xs[i].value = withSpring(target.x, SLIDE_SPRING);
        scs[i].value = withSpring(target.scale, SLIDE_SPRING);
        // Don't re-tween opacity if it's already 1 — defensive write only
        // when an earlier wrap left it mid-tween. Cheap idempotent assignment.
        ops[i].value = 1;
      }
    }
  };

  const goNext = () => {
    const current = centerIdxRef.current;
    const wrapIdx = (current - 1 + N) % N;
    const next = (current + 1) % N;
    slide(next, wrapIdx);
  };

  const goPrev = () => {
    const current = centerIdxRef.current;
    const wrapIdx = (current + 1) % N;
    const prev = (current - 1 + N) % N;
    slide(prev, wrapIdx);
  };

  const goToIdx = (targetIdx: number) => {
    if (targetIdx === centerIdxRef.current) return;
    // Step one at a time so wrap-teleport stays correct (matches mock:2221-2231)
    const forward = ((targetIdx - centerIdxRef.current + N) % N) <= N / 2;
    const steps = forward
      ? (targetIdx - centerIdxRef.current + N) % N
      : (centerIdxRef.current - targetIdx + N) % N;
    for (let s = 0; s < steps; s++) {
      if (forward) goNext();
      else goPrev();
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        if (event.translationX < 0) scheduleOnRN(goNext);
        else scheduleOnRN(goPrev);
      }
    });

  return (
    <View style={[styles.container, style]}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.deck}>
          {cards.map((card, i) => {
            const slot = slotOf(i, centerIdx);
            const isCenter = slot === 0;
            return (
              <Card
                key={card.kind}
                data={card}
                isCenter={isCenter}
                zIndex={isCenter ? 3 : 1}
                translateX={xs[i]}
                scale={scs[i]}
                opacity={ops[i]}
                isLoading={isLoading}
                onTap={() => {
                  if (isCenter) {
                    card.onPress();
                  } else {
                    goToIdx(i);
                  }
                }}
              />
            );
          })}
        </View>
      </GestureDetector>

      <PaginationDots
        count={cards.length}
        activeIndex={centerIdx}
        onSelect={goToIdx}
        style={styles.dotsRow}
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  deck: {
    height: CARD_HEIGHT + 20,
    alignItems: "center",
    justifyContent: "center",
  },
  // The dots row is rendered by PaginationDots; this style only
  // adds the deck-specific top margin (the row's flex layout is owned
  // by the shared component).
  dotsRow: {
    marginTop: 16,
  },
  cardWrap: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 17,
    elevation: 12,
    backgroundColor: "#222",
  },
  cardTouchable: {
    flex: 1,
  },
  imageLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  kicker: {
    marginBottom: 4,
  },
  title: {
    marginBottom: 14,
  },
  bottomRow: {
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  pill: {
    height: 33,
    paddingHorizontal: 16,
    borderRadius: 33,
    backgroundColor: colors.pinkSecondary, // #C63D78
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  // Pill stack — relative parent. The sizer drives the layout width
  // (always uses the wider "completed" label so the row's right edge
  // doesn't shift when the user finishes the day); both visible pills
  // are absolute overlays anchored to the right edge.
  pillStack: {
    position: "relative",
  },
  pillSizer: {
    opacity: 0,
  },
  pillOverlay: {
    position: "absolute",
    right: 0,
    top: 0,
  },
  completedPill: {
    backgroundColor: colors.correctSecondary, // #5B980C — Figma 3977:10162
  },
});
