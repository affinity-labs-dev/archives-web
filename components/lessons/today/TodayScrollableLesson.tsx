// TodayScrollableLesson.tsx - Today tab Explore lesson with progress bar and voiceover
// Extends ScrollableMediaViewLesson with Today-specific features

import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import React, { useEffect, useRef } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import RenderHtml from 'react-native-render-html';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { ContentBlock } from "@/components/shared/types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Theme styles
const themeStyles = ArchivesTheme.common.today;

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

const LAYOUT_CONSTANTS = {
  contentPaddingTop: 130,
  contentPaddingBottom: 130,
  videoSectionSpacing: 20,
  videoContainerSpacing: 16,
  videoHorizontalPadding: 20,
  videoHeight: 250,
  videoBorderRadius: 12,
  textFontSize: 18,
  textLineHeight: 24,
  textHorizontalPadding: 20,
  continueButtonBottom: 50,
  continueButtonHorizontal: 24,
  continueButtonPadding: { horizontal: 20, vertical: 16 },
  continueButtonRadius: 20,
  backButtonSize: 40,
  backButtonRadius: 20,
  backButtonPadding: { top: 8, left: 16 },
  bottomMarkerHeight: 1,
  bottomMarkerBottomPadding: 40,
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
          <View key={key} style={themeStyles.scrollableMediaSection}>
            <View style={themeStyles.scrollableMediaContainer}>
              <VideoBlock
                url={block.url || ''}
                autoplay={block.autoplay}
                loop={block.loop !== false}
                style={themeStyles.scrollableMedia}
              />
            </View>
          </View>
        );

      case 'image':
        return (
          <View key={key} style={themeStyles.scrollableMediaSection}>
            <View style={themeStyles.scrollableMediaContainer}>
              <Image
                source={{ uri: block.url || '' }}
                style={themeStyles.scrollableMedia}
                contentFit="cover"
              />
            </View>
          </View>
        );

      case 'text':
        return (
          <View key={key} style={themeStyles.scrollableTextSection}>
            <View style={themeStyles.scrollableTextContainer}>
              <RenderHtml
                contentWidth={contentWidth - (LAYOUT_CONSTANTS.textHorizontalPadding * 2)}
                source={{ html: block.content || '' }}
                tagsStyles={{
                  body: {
                    color: ArchivesTheme.colors.shoeBrown,
                    fontFamily: 'DM Sans',
                    fontSize: LAYOUT_CONSTANTS.textFontSize,
                    lineHeight: LAYOUT_CONSTANTS.textLineHeight
                  },
                  h1: {
                    color: ArchivesTheme.colors.shoeBrown,
                    fontFamily: 'DM Sans',
                    fontSize: 24,
                    fontWeight: '700',
                    marginBottom: 12
                  },
                  h2: {
                    color: ArchivesTheme.colors.mutedNavy,
                    fontFamily: 'DM Sans',
                    fontSize: 18,
                    fontWeight: '600',
                    marginBottom: 10
                  },
                  h3: {
                    color: ArchivesTheme.colors.shoeBrown,
                    fontFamily: 'DM Sans',
                    fontSize: 18,
                    fontWeight: '600',
                    lineHeight: LAYOUT_CONSTANTS.textLineHeight,
                    marginBottom: 8
                  },
                  p: {
                    color: ArchivesTheme.colors.shoeBrown,
                    fontFamily: 'DM Sans',
                    fontSize: LAYOUT_CONSTANTS.textFontSize,
                    lineHeight: LAYOUT_CONSTANTS.textLineHeight,
                    marginBottom: 12
                  },
                  strong: { fontWeight: '600', color: ArchivesTheme.colors.shoeBrown },
                  em: { fontStyle: 'italic', color: ArchivesTheme.colors.shoeBrown },
                  ul: { marginBottom: 12 },
                  li: {
                    color: ArchivesTheme.colors.shoeBrown,
                    fontFamily: 'DM Sans',
                    fontSize: LAYOUT_CONSTANTS.textFontSize,
                    lineHeight: LAYOUT_CONSTANTS.textLineHeight,
                    marginBottom: 6
                  },
                  blockquote: {
                    borderLeftWidth: 3,
                    borderLeftColor: ArchivesTheme.colors.persianOrange,
                    paddingLeft: 12,
                    marginBottom: 12,
                    fontStyle: 'italic'
                  },
                  hr: {
                    borderBottomWidth: 1,
                    borderBottomColor: ArchivesTheme.colors.shoeBrown + '33',
                    marginVertical: 16
                  },
                }}
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={[]}>
      <View style={{ flex: 1, backgroundColor: ArchivesTheme.colors.creamWhite }}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />

        {/* Fixed Header - Progress Bar */}
        <View
          style={{
            backgroundColor: ArchivesTheme.colors.creamWhite,
            paddingTop: insets.top + 8,
            paddingBottom: 12,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* Back Button */}
          <TouchableOpacity style={themeStyles.watchBackButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color={ArchivesTheme.colors.shoeBrown} />
          </TouchableOpacity>

          {/* Progress Bar */}
          <View style={{ flex: 1 }}>
            <View style={themeStyles.watchProgressContainer}>
              <Text style={[themeStyles.watchProgressLabel, { color: ArchivesTheme.colors.shoeBrown }]}>
                Progress today
              </Text>
              <Text style={[themeStyles.watchProgressPercentage, { color: ArchivesTheme.colors.shoeBrown }]}>
                {progress}%
              </Text>
            </View>
            <View style={[themeStyles.watchProgressBar, { backgroundColor: ArchivesTheme.colors.shoeBrown + "30" }]}>
              <View
                style={[
                  themeStyles.watchProgressFill,
                  { width: `${progress}%`, backgroundColor: ArchivesTheme.colors.persianOrange },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Main scrollable content */}
        <ScrollView style={{ flex: 1 }}>
          <View style={[themeStyles.scrollableContent, { paddingTop: 20 }]}>
            {/* Render all content blocks dynamically */}
            {sortedBlocks.map((block, index) => renderBlock(block, index))}
          </View>
        </ScrollView>

        {/* Floating button container - Voiceover + Continue */}
        <View style={[themeStyles.watchFloatingButtonContainer, { bottom: 0 }]}>
          <View style={themeStyles.watchButtonRow}>
            {/* Voiceover button (replaces Read button) */}
            {innerVoiceUrl && (
              <TouchableOpacity style={themeStyles.watchReadButton} onPress={toggleAudio}>
                <Ionicons name={status.playing ? "pause" : "play"} size={20} color="white" />
                <Text style={themeStyles.watchReadButtonText}>
                  {status.playing ? "Pause" : "Voiceover"}
                </Text>
              </TouchableOpacity>
            )}
            {/* Continue button */}
            <TouchableOpacity style={themeStyles.watchContinueButton} onPress={onContinue}>
              <Text style={themeStyles.watchContinueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

