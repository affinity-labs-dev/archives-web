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
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Path } from "react-native-svg";

import { Typography, colors, easings, safeDuration } from "@/components/ui";

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
  onPress: () => void;
}

interface TodayCardDeckProps {
  cards: [TodayCardData, TodayCardData, TodayCardData];
  initialCenterIdx?: number;
  onCenterChange?: (idx: number) => void;
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
// Card subcomponent
// ──────────────────────────────────────────────────────────

interface CardProps {
  data: TodayCardData;
  isCenter: boolean;
  zIndex: number;
  translateX: SharedValue<number>;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
  onTap: () => void;
}

function Card({
  data,
  isCenter,
  zIndex,
  translateX,
  scale,
  opacity,
  onTap,
}: CardProps) {
  const contentOpacity = useSharedValue(isCenter ? 1 : 0);
  const imageScale = useSharedValue(1);

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
            <TouchableOpacity
              style={styles.pill}
              activeOpacity={0.85}
              onPress={data.onPress}
            >
              <PlayArrowIcon width={10} height={12} color={colors.white} />
              <Typography variant="body.s" weight="600" color="white">
                {data.pillLabel}
              </Typography>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ──────────────────────────────────────────────────────────
// Pagination dot (pill on active, circle on inactive)
// Figma 4158:5569 (colors) + mock `index.html:459-470` (300ms transition)
// ──────────────────────────────────────────────────────────

const DOT_INACTIVE_WIDTH = 6;
const DOT_ACTIVE_WIDTH = 18;
const DOT_HEIGHT = 6;
const DOT_TRANSITION_MS = 300;

function Dot({
  isActive,
  onPress,
}: {
  isActive: boolean;
  onPress: () => void;
}) {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, {
      duration: safeDuration(DOT_TRANSITION_MS),
      easing: Easing.inOut(Easing.ease),
    });
  }, [isActive, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: interpolate(
      progress.value,
      [0, 1],
      [DOT_INACTIVE_WIDTH, DOT_ACTIVE_WIDTH]
    ),
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.concreteGrey, colors.bluePrimary]
    ),
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
    >
      <Animated.View style={[styles.dot, animatedStyle]} />
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────────────────
// Deck (main export)
// ──────────────────────────────────────────────────────────

export default function TodayCardDeck({
  cards,
  initialCenterIdx = 1,
  onCenterChange,
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

      <View style={styles.dotsRow}>
        {cards.map((card, i) => (
          <Dot
            key={card.kind}
            isActive={i === centerIdx}
            onPress={() => goToIdx(i)}
          />
        ))}
      </View>
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
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  dot: {
    height: DOT_HEIGHT,
    borderRadius: 3,
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
    gap: 8,
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
});
