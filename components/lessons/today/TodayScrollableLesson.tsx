// TodayScrollableLesson.tsx - Today tab Explore lesson with progress bar and voiceover
// Extends ScrollableMediaViewLesson with Today-specific features

import TodayLessonChrome from "@/components/today/TodayLessonChrome";
import { DepthButton, Typography, colors, easings, safeDuration } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import React, { useEffect, useRef } from "react";
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

  // Audio player
  const player = useAudioPlayer(innerVoiceUrl || null);
  const status = useAudioPlayerStatus(player);
  const hasTrackedMediaRef = useRef(false);

  // Sort content blocks by order
  const sortedBlocks = (contentBlocks || []).sort((a, b) => a.order - b.order);

  // Audio setup
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      interruptionModeAndroid: 'duckOthers',
    });
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

    if (status.playing) {
      player.pause();
    } else {
      player.play();
      // Track media played on first play
      if (!hasTrackedMediaRef.current) {
        hasTrackedMediaRef.current = true;
        onMediaPlayed?.();
      }
    }
  };

  // Render individual block based on type
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
        return (
          <View key={key} style={blockStyles.textSection}>
            <RenderHtml
              contentWidth={
                contentWidth - LAYOUT_CONSTANTS.textHorizontalPadding * 2
              }
              source={{ html: block.content || '' }}
              tagsStyles={readingHtmlStyles}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={[]}>
      <View style={{ flex: 1, backgroundColor: colors.snow }}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />

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
              <View style={{ position: "relative" }}>
                <DepthButton
                  variant="secondary"
                  surfaceColor="pinkSecondary"
                  shadowColor="pinkPrimary"
                  onPress={toggleAudio}
                  leftIcon={
                    <Ionicons
                      name={status.playing ? "pause" : "play"}
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
                    {status.playing ? "PAUSE" : "VOICEOVER"}
                  </Typography>
                </DepthButton>
                <VoicePulseRing active={status.playing} />
              </View>
            ) : null
          }
          rightCta={
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
          }
        >
          {/* Body — ScrollView with top padding clearing the floating
              header (insets.top + ~72px header height + 8px breathing
              room) and bottom padding clearing the CTA row. */}
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
    fontWeight: "600" as const,
  },
  h1: {
    color: colors.black,
    fontFamily: "Bounded-Black",
    fontSize: LAYOUT_CONSTANTS.textFontSize,
    lineHeight: LAYOUT_CONSTANTS.textLineHeight,
    fontWeight: "600" as const,
    marginBottom: 16,
  },
  h2: {
    color: colors.black,
    fontFamily: "Onest",
    fontSize: LAYOUT_CONSTANTS.textFontSize,
    lineHeight: LAYOUT_CONSTANTS.textLineHeight,
    letterSpacing: LAYOUT_CONSTANTS.textLetterSpacing,
    fontWeight: "700" as const,
    marginBottom: 12,
  },
  h3: {
    color: colors.black,
    fontFamily: "Onest",
    fontSize: LAYOUT_CONSTANTS.textFontSize,
    lineHeight: LAYOUT_CONSTANTS.textLineHeight,
    letterSpacing: LAYOUT_CONSTANTS.textLetterSpacing,
    fontWeight: "600" as const,
    marginBottom: 10,
  },
  p: {
    color: colors.black,
    fontFamily: "Onest",
    fontSize: LAYOUT_CONSTANTS.textFontSize,
    lineHeight: LAYOUT_CONSTANTS.textLineHeight,
    letterSpacing: LAYOUT_CONSTANTS.textLetterSpacing,
    fontWeight: "600" as const,
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
    fontWeight: "600" as const,
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

