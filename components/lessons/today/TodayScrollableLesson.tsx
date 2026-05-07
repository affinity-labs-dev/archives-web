// TodayScrollableLesson.tsx - Today tab Explore lesson with progress bar and voiceover
// Extends ScrollableMediaViewLesson with Today-specific features

import TodayLessonChrome from "@/components/today/TodayLessonChrome";
import { DepthButton, Typography, colors, easings, safeDuration } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import RenderHtml from 'react-native-render-html';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { ContentBlock } from "@/components/shared/types";
import { useWalkthroughTarget } from "@/hooks/today/useWalkthroughTarget";
import { useWalkthroughDispatch } from "@/hooks/today/useWalkthroughDispatch";

// Voiceover pulse ring — sonar-style outline that expands + fades while
// the audio is playing. Ports `index.html:2483-2507` from the mock:
//   gsap.set(ring, { scale: 1, opacity: 0.6 });
//   gsap.to(ring, { scale: 1.35, opacity: 0, duration: 1.3,
//                   ease: 'power2.out', repeat: -1 });
// Single shared value 0→1 drives both transforms via interpolation, then
// `withRepeat(..., -1, false)` restarts each cycle at the starting state
// (no yoyo — matches the mock's discrete restart, not a smooth reverse).
const PULSE_RING_DURATION_MS = 1300;
const PULSE_RING_COLOR = "#E84E80";

interface VoicePulseRingProps {
  active: boolean;
  borderRadius?: number;
}

function VoicePulseRing({
  active,
  borderRadius = 26.5,
}: VoicePulseRingProps) {
  // 0 = resting (scale 1, opacity 0.6), 1 = end of pulse (scale 1.35, opacity 0)
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = 0;
      progress.value = withRepeat(
        withTiming(1, {
          duration: safeDuration(PULSE_RING_DURATION_MS),
          easing: easings.power2Out,
        }),
        -1,
        false,
      );
    } else {
      cancelAnimation(progress);
      progress.value = withTiming(0, { duration: safeDuration(180) });
    }
  }, [active, progress]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.35 }],
    // Resting opacity is 0.6; while active, fades to 0 each cycle.
    // While inactive, snap-tweens to 0 so the ring is invisible.
    opacity: active ? 0.6 * (1 - progress.value) : 0,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      // Force the ring onto a stable Android hardware-texture layer so
      // the per-frame scale + opacity tweens don't flip the View
      // between hardware and software-layer compositing strategies on
      // each frame. The flip-flopping was the source of the layout
      // invalidation cascade up through the chrome → ScrollView body
      // jitter (visible scroll position bobbing while the audio plays).
      // iOS ignores this prop — its compositor handles layer caching
      // automatically and was never affected.
      renderToHardwareTextureAndroid={active}
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius,
          borderWidth: 2,
          borderColor: PULSE_RING_COLOR,
        },
        ringStyle,
      ]}
    />
  );
}

// VideoBlock component using expo-video hooks
interface VideoBlockProps {
  url: string;
  autoplay?: boolean;
  loop?: boolean;
  style?: any;
}

function VideoBlock({ url, autoplay = false, loop = true, style }: VideoBlockProps) {
  const player = useVideoPlayer({ uri: url }, (player) => {
    player.loop = loop;
  });

  useEffect(() => {
    if (autoplay && player) {
      const timer = setTimeout(() => {
        player.play();
        if (__DEV__) {
          console.log('📺 Video auto-playing');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoplay, player]);

  useEffect(() => {
    return () => {
      if (player) {
        try {
          player.pause();
          if (__DEV__) {
            console.log('📺 Video cleaned up');
          }
        } catch (error) {
          // Silently handle cleanup errors
        }
      }
    };
  }, [player]);

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

// Layout constants — figma 3365:9116 reference values:
//   text padding horizontal = 23 (figma image left:23, body left:23-28)
//   text font = Onest 16, lineHeight 24, letterSpacing -0.16
//   image: 240px tall, ~12px radius
const LAYOUT_CONSTANTS = {
  textTitleSize: 20,
  textFontSize: 16,
  textLineHeight: 24,
  textLetterSpacing: -0.16,
  textHorizontalPadding: 23,
  imageHeight: 240,
  imageBorderRadius: 12,
  videoInitializationDelay: 500,
};

interface TodayScrollableLessonProps {
  contentBlocks: ContentBlock[];
  progress: number;
  innerVoiceUrl?: string;
  onMediaPlayed?: () => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function TodayScrollableLesson({
  contentBlocks,
  progress,
  innerVoiceUrl,
  onMediaPlayed,
  onContinue,
  onBack,
}: TodayScrollableLessonProps) {
  const insets = useSafeAreaInsets();
  const { width: contentWidth } = useWindowDimensions();

  // Walkthrough: target refs (steps 8-9) + event dispatcher.
  // - voiceRef: leftCta voice toggle wrapper — step 8 'voice' action.
  // - continueRef: rightCta CONTINUE wrapper — step 9 'continue-s3' action.
  // The dispatcher fires 'voice-toggled' (first play) and 'voice-stopped'
  // (pause). Step 8 advances on 'voice-toggled'; step 9's showOn waits for
  // 'voice-stopped' before its bubble appears.
  const voiceRef = useWalkthroughTarget("s3-voice");
  const continueRef = useWalkthroughTarget("s3-continue");
  const dispatchWalkthrough = useWalkthroughDispatch();

  // Audio player
  const player = useAudioPlayer(innerVoiceUrl || null);
  const status = useAudioPlayerStatus(player);
  const hasTrackedMediaRef = useRef(false);

  // Derive a stable boolean from `status`. `useAudioPlayerStatus`
  // returns a fresh status object reference on every audio tick (~60+
  // updates/sec while the audio is playing). Reading `.playing` off
  // `status` directly forces the entire component to re-render on
  // every tick — and because the leftCta JSX (DepthButton + pulse ring)
  // and the body ScrollView are both inline in this component, EACH
  // tick re-evaluated the lesson body. On Android that meant the
  // ScrollView's child measurements were re-run mid-scroll, producing
  // the visible "jitter" the user reported while VoiceOver played.
  // Pulling the boolean out as a primitive lets `useMemo` below cache
  // the heavy bits across ticks (boolean equality is reference-stable).
  const isPlaying = !!status?.playing;

  // Sort content blocks by order. Memoized: the previous version called
  // `.sort()` inline which (a) mutated the prop array and (b) returned
  // a fresh sorted-array reference per render → ScrollView's child
  // identity churn → measurement re-runs on every audio status tick.
  const sortedBlocks = useMemo(
    () => [...(contentBlocks || [])].sort((a, b) => a.order - b.order),
    [contentBlocks],
  );

  // Audio setup
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      interruptionModeAndroid: 'duckOthers',
    });
  }, []);

  // StatusBar config — imperative one-shot on mount (was previously a
  // JSX <StatusBar> rendered on every commit, which on Android fires the
  // window flags through the bridge again on each parent re-render →
  // window manager re-layout → visible jitter on the chrome + parent
  // tab bar). Imperative call fires once and stays put.
  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (player) {
        try {
          player.pause();
        } catch (error) {
          // Silently handle cleanup errors (player may already be released)
        }
      }
    };
  }, [player]);

  // Toggle audio playback
  const toggleAudio = () => {
    if (!innerVoiceUrl || !player) return;

    if (isPlaying) {
      player.pause();
      // Walkthrough advance hook — un-gates step 9 ('continue-s3'), which
      // has showOn: 'event:voice-stopped'. The bubble + spotlight on the
      // CONTINUE button stay hidden until the user pauses the voiceover.
      dispatchWalkthrough("voice-stopped");
    } else {
      player.play();
      // Walkthrough advance hook — fires on every play (mock fires only on
      // the first play; we mirror that with the existing `hasTrackedMediaRef`
      // gate below to keep the engine's advance idempotent across replays).
      dispatchWalkthrough("voice-toggled");
      // Track media played on first play
      if (!hasTrackedMediaRef.current) {
        hasTrackedMediaRef.current = true;
        onMediaPlayed?.();
      }
    }
  };

  // Memoized lesson body — re-renders ONLY when the blocks or layout
  // dimensions actually change. Critically, this skips re-render on
  // every audio-status tick (which happens 60+ times/sec while the
  // VoiceOver plays), eliminating the cascade of measurement re-runs
  // that was bobbing the ScrollView's scroll position on Android.
  const lessonBody = useMemo(() => {
    const renderBlock = (block: ContentBlock, blockIndex: number) => {
      const key = `${block.type}-${block.order}-${blockIndex}`;

      switch (block.type) {
        case 'video':
          return (
            <View key={key} style={blockStyles.mediaSection}>
              <VideoBlock
                url={block.url || ''}
                autoplay={block.autoplay}
                loop={block.loop !== false}
                style={blockStyles.media}
              />
            </View>
          );

        case 'image':
          return (
            <View key={key} style={blockStyles.mediaSection}>
              <Image
                source={{ uri: block.url || '' }}
                style={blockStyles.media}
                contentFit="cover"
              />
            </View>
          );

        case 'text':
          if (__DEV__) {
            // One-shot log so we can confirm what HTML tags Supabase
            // actually emits. If headings come through as `<p class="…">`
            // instead of `<h1>`, the tagsStyles never match and font
            // never applies — this surfaces that immediately.
            console.log('📝 reading HTML →', block.content?.slice(0, 200));
          }
          return (
            <View key={key} style={blockStyles.textSection}>
              <RenderHtml
                contentWidth={
                  contentWidth - LAYOUT_CONSTANTS.textHorizontalPadding * 2
                }
                source={{ html: block.content || '' }}
                tagsStyles={readingHtmlStyles}
                renderers={headingRenderers}
              />
            </View>
          );

        default:
          return null;
      }
    };

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 80,
          paddingBottom: insets.bottom + 90,
          paddingHorizontal: LAYOUT_CONSTANTS.textHorizontalPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        {sortedBlocks.map((block, index) => renderBlock(block, index))}
      </ScrollView>
    );
  }, [sortedBlocks, contentWidth, insets.top, insets.bottom]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={[]}>
      <View style={{ flex: 1, backgroundColor: colors.snow }}>
        {/* StatusBar config moved to the useEffect on mount above. JSX
            <StatusBar> here re-applies on every render, causing Android
            window flag re-commits + visible chrome jitter. */}

        <TodayLessonChrome
          progress={progress}
          onBack={onBack}
          // Snow header on a snow body — back icon + progress tones use the
          // same blue palette as the home-screen progress bar (figma 3365:9257-9260).
          headerBackground={colors.snow}
          backIconColor={colors.bluePrimary}
          progressLabelColor={colors.bluePrimary}
          progressFillColor={colors.bluePrimary}
          progressTrackColor={colors.blueSecondary}
          leftCta={
            innerVoiceUrl ? (
              // `position: 'relative'` anchors the absolute pulse ring
              // overlay to the same bounds as the DepthButton.
              <View ref={voiceRef} collapsable={false} style={{ position: "relative" }}>
                <DepthButton
                  variant="secondary"
                  surfaceColor="pinkSecondary"
                  shadowColor="pinkPrimary"
                  onPress={toggleAudio}
                  leftIcon={
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={18}
                      color={colors.white}
                    />
                  }
                >
                  <Typography
                    family="onest"
                    size={18}
                    weight="700"
                    extraColor={colors.white}
                    style={{ letterSpacing: -0.18 }}
                  >
                    {isPlaying ? "PAUSE" : "VOICEOVER"}
                  </Typography>
                </DepthButton>
                <VoicePulseRing active={isPlaying} />
              </View>
            ) : null
          }
          rightCta={
            <View ref={continueRef} collapsable={false}>
              <DepthButton variant="secondary" onPress={onContinue}>
                <Typography
                  family="onest"
                  size={18}
                  weight="700"
                  extraColor={colors.white}
                  style={{ letterSpacing: -0.18 }}
                >
                  CONTINUE
                </Typography>
              </DepthButton>
            </View>
          }
        >
          {/* Body — memoized ScrollView that doesn't re-render on
              audio-status ticks. See `lessonBody` useMemo above. */}
          {lessonBody}
        </TodayLessonChrome>
      </View>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────
// Block-level styles + RenderHtml tag styles (figma 3365:9116)
// ──────────────────────────────────────────────────────────

const blockStyles = StyleSheet.create({
  mediaSection: {
    marginVertical: 12,
  },
  // 240px tall media frame, ~12px corners — figma 3365:9119.
  media: {
    width: "100%",
    height: LAYOUT_CONSTANTS.imageHeight,
    borderRadius: LAYOUT_CONSTANTS.imageBorderRadius,
  },
  textSection: {
    marginBottom: 4,
  },
});

// Reading HTML — Onest body / Bounded h1 per figma 3365:9118 + 3365:9271.
// Bounded only ships in Black weight; the SemiBold-tagged style still
// renders crisp at the 16px size and matches the headline visual hierarchy.
const readingHtmlStyles = {
  body: {
    color: colors.black,
    fontFamily: "Onest",
    fontSize: LAYOUT_CONSTANTS.textFontSize,
    lineHeight: LAYOUT_CONSTANTS.textLineHeight,
    letterSpacing: LAYOUT_CONSTANTS.textLetterSpacing,
    fontWeight: "300" as const,
  },
  p: {
    color: colors.black,
    fontFamily: "Onest",
    fontSize: LAYOUT_CONSTANTS.textFontSize,
    lineHeight: LAYOUT_CONSTANTS.textLineHeight,
    letterSpacing: LAYOUT_CONSTANTS.textLetterSpacing,
    fontWeight: "300" as const,
    marginBottom: 16,
  },
  strong: { fontWeight: "700" as const, color: colors.black },
  em: { fontStyle: "italic" as const, color: colors.black },
  ul: { marginBottom: 12 },
  li: {
    color: colors.black,
    fontFamily: "Onest",
    fontSize: LAYOUT_CONSTANTS.textFontSize,
    lineHeight: LAYOUT_CONSTANTS.textLineHeight,
    letterSpacing: LAYOUT_CONSTANTS.textLetterSpacing,
    fontWeight: "300" as const,
    marginBottom: 6,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.bluePrimary,
    paddingLeft: 12,
    marginBottom: 12,
    fontStyle: "italic" as const,
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.15)",
    marginVertical: 16,
  },
};

// Custom heading renderers — bypass RenderHtml's CSS resolver entirely so
// the font cannot be lost to weight-matching fallback. Each renderer pulls
// the raw text out of the TNode children and emits a plain RN <Text> with
// only `fontFamily` set (no fontWeight). The Black face already IS bold.
//
// Why this is necessary: RenderHtml normalizes `tagsStyles` through a CSS
// engine that resolves fontFamily + fontWeight together at the native
// layer. With a single-weight custom font like Bounded-Black, any explicit
// non-normal weight breaks the PS-name lookup and silently falls back.
// `renderers` skips that entire pipeline.
const extractText = (tnode: any): string => {
  if (!tnode) return '';
  if (tnode.type === 'text') return tnode.data || '';
  if (Array.isArray(tnode.children)) {
    return tnode.children.map(extractText).join('');
  }
  return '';
};

// Headings render through the design-system Typography component.
// Typography resolves `family + weight` via `fontFamilyMap` to a single
// registered PS name (Bounded-Black), which keeps native font lookup
// intact — the path that `tagsStyles` was bypassing.
const Heading = ({
  tnode,
  marginBottom,
}: {
  tnode: any;
  marginBottom: number;
}) => (
  <Typography
    family="bounded"
    size={LAYOUT_CONSTANTS.textTitleSize}
    lineHeight={LAYOUT_CONSTANTS.textLineHeight}
    extraColor={colors.black}
    letterSpacing={LAYOUT_CONSTANTS.textLetterSpacing}
    style={{ marginBottom }}
  >
    {extractText(tnode)}
  </Typography>
);

const headingRenderers = {
  h1: ({ tnode }: any) => <Heading tnode={tnode} marginBottom={16} />,
  h2: ({ tnode }: any) => <Heading tnode={tnode} marginBottom={12} />,
  h3: ({ tnode }: any) => <Heading tnode={tnode} marginBottom={10} />,
};

