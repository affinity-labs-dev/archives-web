// Daily Story End Screen — celebration shown after completing Today's
// daily quest. Single composite Rive (`daily_story_celebration.riv`)
// fills the screen with the atmospheric loop + hero ibu baked in;
// headline + black DepthButton CTA sit at the bottom. Designed to
// match the redesigned Figma node 3754:6638 and the entrance timeline
// from the `02 daily story` mock (screen 5 celebration).

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Rive, { Alignment, Fit, RiveRef } from "rive-react-native";

import {
  Typography,
  DepthButton,
  colors,
  spacing,
  easings,
  safeDuration,
} from "@/components/ui";
import { AnimatedEntrance } from "@/components/ui/animations";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Background Rive — Ibu flying-and-landing loop with a transparent
// canvas, so the gradient behind shows through naturally.
const ibuFlyingLandingAnimation = require("../../../assets/rive/ibu_flying_landing_without_bg.riv");
// Hero Rive — Ibu character that sits centered on top of the
// background, scales in then idles with a subtle 1↔1.02 scale yoyo.
// Both Rive files are state-machine-driven; the rive-react-native v9
// runtime needs `stateMachineName` to actually start the SM (the web
// mock plays them imperatively in `onLoad`, RN can't).
const heroIbuAnimation = require("../../../assets/rive/hero_ibu.riv");

// Hero canvas geometry — matches mock CSS (.s5c-rive-hero):
// `width: 320; height: 320; left: 50%; top: 42%` with the box
// centered on that anchor via xPercent/yPercent.
const HERO_SIZE = 320;
const HERO_TOP_RATIO = 0.42;

// "Chime impact" alignment — `daily_story_celebration.riv` has a WAV
// embedded inside its state machine that fires mid-timeline (Rive
// Event node placed N frames into "State Machine 1", not at frame 0).
// We sync the hero's scale-in with that audible beat so the visual
// climax lands together with the chime. Tune this single constant if
// the .riv's chime offset is changed in the editor and every
// downstream animation re-balances itself off it. The mock's original
// 200ms hero-delay is preserved as the visual offset BETWEEN bg and
// hero entrance; the chime delay is added on top.
const CHIME_IMPACT_DELAY_MS = 1500;
const HERO_ENTRANCE_DELAY_MS = CHIME_IMPACT_DELAY_MS;
const HEADLINE_ENTRANCE_DELAY_MS = HERO_ENTRANCE_DELAY_MS + 550;
const CTA_ENTRANCE_DELAY_MS = HEADLINE_ENTRANCE_DELAY_MS + 400;
const HUM_START_MS = CTA_ENTRANCE_DELAY_MS + 400;

interface DailyStoryEndScreenProps {
  visible: boolean;
  questDate: string; // YYYY-MM-DD format
  onContinue: () => void;
}

export default function DailyStoryEndScreen({
  visible,
  questDate,
  onContinue,
}: DailyStoryEndScreenProps) {
  const riveRef = useRef<RiveRef>(null);

  useEffect(() => {
    if (visible && riveRef.current) {
      console.log("🎬 [DailyStoryEnd] Rive animation loaded successfully");
    }
  }, [visible, riveRef.current]);

  // Idle hum — runs after the entrance settles. Mock spec
  // (`enterScreen5Celebration` chained tween, +0.6s after entrance):
  // scale 1 ↔ 1.02 yoyo, 2400ms `sine.inOut`, infinite. Tight
  // amplitude keeps the Rive's own internal motion as the dominant
  // signal. Sits on an INNER Animated.View so it composes
  // multiplicatively with the entrance's scale — the entrance writes
  // the outer transform 0.6 → 1, the hum writes the inner transform
  // 1 ↔ 1.02; effective scale lands at 1.0×1.0..1.02 once entrance
  // settles, no clobbering.
  const heroHumScale = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;
    // Hum starts after CTA settles, mirroring the mock's `+=0.6` breath
    // chained off the entrance timeline. `HUM_START_MS` re-derives off
    // the chime impact delay so trimming the chime offset shifts the
    // hum start in lockstep.
    const t = setTimeout(() => {
      heroHumScale.value = withRepeat(
        withTiming(1.02, {
          duration: safeDuration(2400),
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      );
    }, HUM_START_MS);
    return () => clearTimeout(t);
  }, [visible, heroHumScale]);

  const heroHumStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroHumScale.value }],
  }));

  // Dynamic two-line headline. Today path matches Figma exactly;
  // historical path preserves the legacy "2 Feb's story" affordance
  // for users replaying past quests.
  const today = new Date().toISOString().split("T")[0];
  const isToday = questDate === today;

  const headlineText = (() => {
    if (isToday) {
      return "TODAY'S STORY\nIS COMPLETE!";
    }
    const dateObj = new Date(questDate + "T00:00:00");
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString("en-US", { month: "short" });
    return `${day} ${month.toUpperCase()}'S STORY\nIS COMPLETE!`;
  })();

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onContinue();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onContinue();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      {/* Sky-to-cream gradient — matches the Figma palette
          (#BCE0FF → #DCEFFF → #F4EBDB) and serves as the non-Rive
          fallback if the canvas is still loading. */}
      <LinearGradient
        colors={["#BCE0FF", "#DCEFFF", "#F4EBDB"]}
        locations={[0, 0.55, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          {/* Full-frame Rive — Ibu flying-then-landing loop.
              Mounts immediately (no entrance fade) so the .riv's own
              authored motion is the entrance.

              State-machine-driven; rive-react-native v9 only auto-runs
              state machines when one is named explicitly — without
              `stateMachineName` the canvas stays on frame 0. "State
              Machine 1" is the editor default; if a future export
              uses a different name, update this string in lockstep. */}
          <View style={StyleSheet.absoluteFill}>
            <Rive
              ref={riveRef}
              source={ibuFlyingLandingAnimation}
              autoplay
              stateMachineName="State Machine 1"
              fit={Fit.Cover}
              alignment={Alignment.Center}
              style={styles.rive}
            />
          </View>

          {/* Hero Rive — Ibu character centered on top of the
              background. Mock spec entrance: scale 0.6 → 1, y 20 → 0,
              opacity 0 → 1, 750ms back.out(1.8) (we approximate with
              the closest token, backOut2), delay 200ms. The inner
              Animated.View carries the post-entrance idle hum so the
              two scales compose multiplicatively. */}
          <View style={styles.heroSlot} pointerEvents="none">
            <AnimatedEntrance
              preset={{
                scale: { from: 0.6, to: 1 },
                translateY: { from: 20, to: 0 },
                opacity: { from: 0, to: 1 },
                duration: 750,
                easing: easings.backOut2,
              }}
              delay={HERO_ENTRANCE_DELAY_MS}
            >
              <Animated.View style={heroHumStyle}>
                <Rive
                  source={heroIbuAnimation}
                  autoplay
                  stateMachineName="State Machine 1"
                  fit={Fit.Contain}
                  alignment={Alignment.Center}
                  style={styles.heroRive}
                />
              </Animated.View>
            </AnimatedEntrance>
          </View>

          {/* Close — top-right X. Honors light-impact haptic and
              dismisses via the same onContinue callback. */}
          <Pressable
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={16}
          >
            <Ionicons name="close" size={32} color={colors.onyx} />
          </Pressable>

          {/* Headline — Bounded SemiBold 27px, blue primary, two lines.
              Mock spec: y -18 → 0, opacity 0 → 1, 550ms back.out(1.4).
              Delay rebased off the hero entrance so the headline always
              lands after the hero's chime-synced scale-pop. */}
          <View style={styles.headlineSlot}>
            <AnimatedEntrance
              preset={{
                translateY: { from: -18, to: 0 },
                opacity: { from: 0, to: 1 },
                duration: 550,
                easing: easings.backOut14,
              }}
              delay={HEADLINE_ENTRANCE_DELAY_MS}
            >
              <Typography
                family="bounded"
                weight="600"
                size={27}
                lineHeight={32}
                color="bluePrimary"
                align="center"
              >
                {headlineText}
              </Typography>
            </AnimatedEntrance>
          </View>

          {/* CONTINUE — black DepthButton with white shadow.
              Mock spec: y 30 → 0, opacity 0 → 1, 500ms back.out(1.5).
              Delay rebased off the headline so the cascade stays in
              order regardless of the chime offset. */}
          <View style={styles.ctaSlot}>
            <AnimatedEntrance
              preset={{
                translateY: { from: 30, to: 0 },
                opacity: { from: 0, to: 1 },
                duration: 500,
                easing: easings.backOut15,
              }}
              delay={CTA_ENTRANCE_DELAY_MS}
            >
              <DepthButton
                surfaceColor="onyx"
                shadowColor="white"
                borderColor="onyx"
                onPress={handleContinue}
              >
                <Typography variant="label.m" color="white">
                  CONTINUE
                </Typography>
              </DepthButton>
            </AnimatedEntrance>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  rive: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "transparent",
  },
  closeButton: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.07,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.xs,
  },
  // Hero canvas slot — centers the 320×320 box on (50%, 42%) of the
  // screen, matching the mock's GSAP `xPercent: -50, yPercent: -50`
  // anchoring. RN has no percentage-translate so we offset top/left by
  // half the canvas size.
  heroSlot: {
    position: "absolute",
    width: HERO_SIZE,
    height: HERO_SIZE,
    top: SCREEN_HEIGHT * HERO_TOP_RATIO - HERO_SIZE / 2,
    left: SCREEN_WIDTH / 2 - HERO_SIZE / 2,
  },
  heroRive: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    backgroundColor: "transparent",
  },
  headlineSlot: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: SCREEN_HEIGHT * 0.18,
    paddingHorizontal: spacing.lg,
  },
  ctaSlot: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: SCREEN_HEIGHT * 0.06,
  },
});
