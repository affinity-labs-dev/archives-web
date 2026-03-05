// ScrollableMediaViewLesson.tsx - Reusable Scrollable Media View lesson for all eras
// Supports flexible content blocks (video, image, text) in any order
// Videos auto-play and loop, dynamically rendered from content_blocks array

import ArchivesTheme from "@/constants/ArchivesTheme";
import { useBackgroundMusicV2 } from "@/hooks/useBackgroundMusicV2";
import { useLessonBase } from "@/hooks/useLessonBase";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import RenderHtml from 'react-native-render-html';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ContentBlock, ContentItem } from "@/components/shared/types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
    // Mute video — background music provides audio for this lesson type
    player.muted = true;
    player.showNowPlayingNotification = false;
    // Note: autoplay handled in effect to ensure proper initialization
  });

  useEffect(() => {
    // Delay autoplay to ensure video is ready
    if (autoplay && player) {
      const timer = setTimeout(() => {
        player.play();
        console.log('📺 Video auto-playing');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoplay, player]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (player) {
        try {
          player.pause();
          console.log('📺 Video cleaned up');
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

// EXACT layout constants from Adventure3_Module1_Lesson1.tsx
const LAYOUT_CONSTANTS = {
  contentPaddingTop: 130,
  contentPaddingBottom: 130,
  videoSectionSpacing: 20,
  videoContainerSpacing: 16,
  videoHorizontalPadding: 20,
  videoHeight: 250,
  videoBorderRadius: 12,
  textFontSize: 16,
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

interface ScrollableMediaViewLessonProps {
  contentItem: ContentItem;
  adventureId: string;
  moduleId: string;
  lessonId: string;
  eraId: string;             // Era ID (e.g., "rise_of_islam", "umayyad")
  eraName: string;           // Era display name
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

export default function ScrollableMediaViewLesson({
  contentItem,
  adventureId,
  moduleId,
  lessonId,
  eraId,
  eraName,
  onContinue,
  onDismiss,
  onBack,
}: ScrollableMediaViewLessonProps) {
  const insets = useSafeAreaInsets();
  const { width: contentWidth } = useWindowDimensions();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  // Extract and sort content blocks by order
  const sortedBlocks = (contentItem.content_blocks || []).sort((a, b) => a.order - b.order);

  // Background music hook
  const backgroundMusic = useBackgroundMusicV2(
    contentItem.background_music_url ? { uri: contentItem.background_music_url } : null,
    { volume: 0.5, shouldLoop: true }
  );

  // Shared lesson setup (analytics, completion handler - no walkthrough for scrollable)
  const { handleLessonComplete } = useLessonBase({
    contentItem,
    adventureId,
    moduleId,
    lessonId,
    lessonType: 'scrollable_media',
    eraId,
    eraName,
    onContinue,
  });

  // Render individual block based on type
  const renderBlock = (block: ContentBlock, blockIndex: number) => {
    const key = `${block.type}-${block.order}-${blockIndex}`;

    switch (block.type) {
      case 'video':
        return (
          <View key={key} style={styles.videoSection}>
            <View style={styles.videoContainer}>
              <VideoBlock
                url={block.url || ''}
                autoplay={block.autoplay}
                loop={block.loop !== false}
                style={styles.video}
              />
            </View>
          </View>
        );

      case 'image':
        return (
          <View key={key} style={styles.videoSection}>
            <View style={styles.videoContainer}>
              <Image
                source={{ uri: block.url || '' }}
                style={styles.video}
                contentFit="cover"
              />
            </View>
          </View>
        );

      case 'text':
        return (
          <View key={key} style={styles.textSection}>
            <View style={styles.textContainer}>
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

  // Lesson Completion Logic (handled by useLessonBase)

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={ArchivesTheme.colors.creamWhite} />

      {/* Main scrollable content */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Render all content blocks dynamically */}
          {sortedBlocks.map((block, index) => renderBlock(block, index))}

          {/* Bottom detection marker */}
          <View
            style={styles.bottomMarker}
            onLayout={() => {
              setTimeout(() => {
                setHasScrolledToBottom(true);
              }, LAYOUT_CONSTANTS.videoInitializationDelay);
            }}
          />
        </View>
      </ScrollView>

      {/* Floating continue button */}
      {hasScrolledToBottom && (
        <View style={styles.continueButtonContainer}>
          <TouchableOpacity style={styles.continueButton} onPress={handleLessonComplete}>
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Floating back button */}
      <View style={[styles.backButtonContainer, { paddingTop: insets.top + LAYOUT_CONSTANTS.backButtonPadding.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack || onDismiss}>
          <Ionicons name="chevron-back" size={24} color={ArchivesTheme.colors.shoeBrown} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: LAYOUT_CONSTANTS.contentPaddingTop,
    paddingBottom: LAYOUT_CONSTANTS.contentPaddingBottom,
  },

  // Video/Image sections
  videoSection: {
    marginBottom: LAYOUT_CONSTANTS.videoSectionSpacing,
  },
  videoContainer: {
    alignItems: 'center',
    paddingHorizontal: LAYOUT_CONSTANTS.videoHorizontalPadding,
  },
  video: {
    width: '100%',
    height: LAYOUT_CONSTANTS.videoHeight,
    borderRadius: LAYOUT_CONSTANTS.videoBorderRadius,
  },

  // Text sections
  textSection: {
    marginBottom: LAYOUT_CONSTANTS.videoSectionSpacing,
  },
  textContainer: {
    paddingHorizontal: LAYOUT_CONSTANTS.textHorizontalPadding,
  },
  lessonText: {
    fontFamily: 'DM Sans',
    fontSize: LAYOUT_CONSTANTS.textFontSize,
    color: ArchivesTheme.colors.shoeBrown,
    lineHeight: LAYOUT_CONSTANTS.textLineHeight,
    textAlign: 'left',
  },

  // Bottom marker
  bottomMarker: {
    height: LAYOUT_CONSTANTS.bottomMarkerHeight,
    marginBottom: LAYOUT_CONSTANTS.bottomMarkerBottomPadding,
  },

  // Floating continue button
  continueButtonContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: LAYOUT_CONSTANTS.continueButtonHorizontal,
    paddingBottom: LAYOUT_CONSTANTS.continueButtonBottom,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT_CONSTANTS.continueButtonPadding.horizontal,
    paddingVertical: LAYOUT_CONSTANTS.continueButtonPadding.vertical,
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderRadius: LAYOUT_CONSTANTS.continueButtonRadius,
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  continueButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginRight: 8,
  },

  // Floating back button
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 20,
    paddingLeft: LAYOUT_CONSTANTS.backButtonPadding.left,
  },
  backButton: {
    width: LAYOUT_CONSTANTS.backButtonSize,
    height: LAYOUT_CONSTANTS.backButtonSize,
    borderRadius: LAYOUT_CONSTANTS.backButtonRadius,
    backgroundColor: 'rgba(139,96,64,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
