import ArchivesTheme from '@/constants/ArchivesTheme';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import React from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Svg, { G, Mask, Path, Rect } from 'react-native-svg';
import type { Adventure, ContentItem } from './types';

// SVG Icon Components - Original correct version
const PlayArrowIcon = () => (
  <Svg width={42} height={42} viewBox="0 0 42 42" fill="none">
    <Mask id="mask0_466_4365" maskUnits="userSpaceOnUse" x={0} y={0} width={42} height={42}>
      <Rect width={42} height={42} fill="#D9D9D9" />
    </Mask>
    <G mask="url(#mask0_466_4365)">
      <Path
        d="M14 30.0559V11.9434C14 11.4475 14.175 11.0319 14.525 10.6965C14.875 10.3611 15.2833 10.1934 15.75 10.1934C15.8958 10.1934 16.049 10.2152 16.2094 10.259C16.3698 10.3027 16.5229 10.3684 16.6688 10.4559L30.9312 19.5121C31.1938 19.6871 31.3906 19.9059 31.5219 20.1684C31.6531 20.4309 31.7188 20.7079 31.7188 20.9996C31.7188 21.2913 31.6531 21.5684 31.5219 21.8309C31.3906 22.0934 31.1938 22.3121 30.9312 22.4871L16.6688 31.5434C16.5229 31.6309 16.3698 31.6965 16.2094 31.7402C16.049 31.784 15.8958 31.8059 15.75 31.8059C15.2833 31.8059 14.875 31.6382 14.525 31.3027C14.175 30.9673 14 30.5517 14 30.0559ZM17.5 26.8621L26.6875 20.9996L17.5 15.1371V26.8621Z"
        fill="white"
      />
    </G>
  </Svg>
);

// Adventure Icon - Loads from icon_url
const AdventureIcon = ({ iconUrl }: { iconUrl: string | null }) => {
  if (!iconUrl) {
    // Fallback SVG if no icon_url
    return (
      <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
        <Mask id="mask0_466_4368" maskUnits="userSpaceOnUse" x={0} y={0} width={32} height={32}>
          <Rect width={32} height={32} fill="#D9D9D9" />
        </Mask>
        <G mask="url(#mask0_466_4368)">
          <Path
            d="M8.04368 25.7777V19.7333H6.26602C5.95113 19.7333 5.68724 19.6264 5.47435 19.4127C5.26146 19.1991 5.15502 18.9343 5.15502 18.6183C5.15502 18.3023 5.26146 18.0388 5.47435 17.8277C5.68724 17.6166 5.95113 17.511 6.26602 17.511H8.11035C8.27346 15.711 8.97168 14.2018 10.205 12.9833C11.4383 11.7649 12.9995 11.0371 14.8883 10.8V5.111C14.8883 4.79633 14.9948 4.53245 15.2077 4.31933C15.4206 4.10645 15.6845 4 15.9993 4H22.8437C23.1586 4 23.4225 4.10645 23.6354 4.31933C23.8485 4.53245 23.955 4.79633 23.955 5.111V7.911C23.955 8.22589 23.8485 8.48978 23.6354 8.70267C23.4225 8.91578 23.1586 9.02233 22.8437 9.02233H17.1104V10.8C18.9992 11.0371 20.5604 11.7649 21.7937 12.9833C23.027 14.2018 23.7252 15.711 23.8883 17.511H25.7327C26.0476 17.511 26.3115 17.6179 26.5243 17.8317C26.7372 18.0454 26.8437 18.3102 26.8437 18.626C26.8437 18.942 26.7372 19.2056 26.5243 19.4167C26.3115 19.6278 26.0476 19.7333 25.7327 19.7333H23.955V25.7777H28.2217C28.5364 25.7777 28.8002 25.8846 29.0133 26.0983C29.2262 26.3121 29.3327 26.5769 29.3327 26.8927C29.3327 27.2087 29.2262 27.4722 29.0133 27.6833C28.8002 27.8944 28.5364 28 28.2217 28H3.77702C3.46235 28 3.19846 27.8931 2.98535 27.6793C2.77246 27.4658 2.66602 27.201 2.66602 26.885C2.66602 26.569 2.77246 26.3054 2.98535 26.0943C3.19846 25.8832 3.46235 25.7777 3.77702 25.7777H8.04368ZM10.266 25.7777H14.8883V19.7333H10.266V25.7777ZM17.1104 25.7777H21.7327V19.7333H17.1104V25.7777ZM10.3993 17.511H21.5993C21.4216 16.1703 20.8105 15.0722 19.766 14.2167C18.7216 13.3611 17.466 12.9333 15.9993 12.9333C14.5327 12.9333 13.2771 13.3611 12.2327 14.2167C11.1882 15.0722 10.5771 16.1703 10.3993 17.511Z"
            fill="#C99151"
          />
        </G>
      </Svg>
    );
  }

  return (
    <Image
      source={{ uri: iconUrl }}
      style={{ width: 32, height: 32 }}
      contentFit="contain"
    />
  );
};

// Star Badge Component - Ionicons style matching Era 1 (Umayyad Dynasty)
const StarBadge = ({ starCount, isLarge }: { starCount: number; isLarge: boolean }) => {
  // Calculate star sizes relative to card type (Era 1 pattern)
  // Middle star is ~18% larger than side stars for emphasis
  const baseSize = 22;                          // Side stars - same size for all cards
  const middleSize = baseSize * 1.18;           // Middle star (18% larger)
  const middleOffset = -(middleSize / 2);       // Dynamic centering offset

  return (
    <View style={styles.starBadge}>
      <FontAwesome
        name="star"
        size={baseSize}
        color={starCount >= 1 ? "#DFB723" : "#A9A9A9"}
        style={styles.leftStar}
      />
      <FontAwesome
        name="star"
        size={middleSize}
        color={starCount >= 2 ? "#DFB723" : "#A9A9A9"}
        style={[styles.middleStar, { marginLeft: middleOffset }]}
      />
      <FontAwesome
        name="star"
        size={baseSize}
        color={starCount >= 3 ? "#DFB723" : "#A9A9A9"}
        style={styles.rightStar}
      />
    </View>
  );
};

// Thumbnail component to handle video player hook properly
interface ThumbnailProps {
  thumbnailUrl: string;
  isVideo: boolean;
}

const Thumbnail: React.FC<ThumbnailProps> = ({ thumbnailUrl, isVideo }) => {
  const player = useVideoPlayer(isVideo ? thumbnailUrl : '', (player) => {
    if (isVideo) {
      player.pause();
      player.muted = true; // Mute thumbnails
    }
  });

  React.useEffect(() => {
    // Cleanup: release player when component unmounts
    return () => {
      if (isVideo && player) {
        try {
          player.pause();
          player.replace(''); // Clear source to free resources
        } catch (error) {
          // Silently ignore cleanup errors
        }
      }
    };
  }, [isVideo, player]);

  if (isVideo) {
    return (
      <VideoView
        player={player}
        style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
        nativeControls={false}
        contentFit="cover"
      />
    );
  }

  return (
    <Image
      source={{ uri: thumbnailUrl }}
      style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
      contentFit="cover"
    />
  );
};

// User progress type for Era 2+
interface UserProgress {
  adventureId: string;
  moduleId: string;
  quizScore: number;
  isCompleted: boolean;
  quizCompleted: boolean;
  completedAt: string;
  era_id: number;
}

// TypeScript interfaces
interface ROIAdventureComponentProps {
  adventure: Adventure;
  userProgress: UserProgress[];
  onCardPress?: (contentItem: ContentItem) => void;
  onTitlePress?: () => void;
}

const ROIAdventureComponent: React.FC<ROIAdventureComponentProps> = ({ adventure, userProgress, onCardPress, onTitlePress }) => {
  // Sort by order_by and take first 5 items
  const sortedContent = [...(adventure.content_list || [])]
    .sort((a, b) => a.order_by - b.order_by)
    .slice(0, 5);

  // Responsive card positions based on screen width
  const { width: screenWidth } = Dimensions.get('window');
  const containerPadding = screenWidth * 0.034; // ~13px on 375px screen
  const gap = screenWidth * 0.021; // ~8px gap between columns
  const cardWidth = (screenWidth - containerPadding * 2 - gap) / 2;

  const cardPositions = [
    // Card 1 - Large left
    {
      left: containerPadding,
      top: cardWidth * 0.36,
      width: cardWidth,
      height: cardWidth * 1.15
    },
    // Card 2 - Small left bottom
    {
      left: containerPadding,
      top: cardWidth * 1.54,
      width: cardWidth,
      height: cardWidth * 0.55
    },
    // Card 3 - Small right top
    {
      left: containerPadding + cardWidth + gap,
      top: 0,
      width: cardWidth,
      height: cardWidth * 0.55
    },
    // Card 4 - Small right middle
    {
      left: containerPadding + cardWidth + gap,
      top: cardWidth * 0.58,
      width: cardWidth,
      height: cardWidth * 0.55
    },
    // Card 5 - Large right bottom
    {
      left: containerPadding + cardWidth + gap,
      top: cardWidth * 1.16,
      width: cardWidth,
      height: cardWidth * 1.15
    },
  ];

  // Calculate container height based on card dimensions
  const containerHeight = cardWidth * 2.08;

  const renderCard = (item: ContentItem, index: number) => {
    const cardStyle = cardPositions[index];
    const isLarge = index === 0 || index === 4; // Cards 1 and 5 are large

    // Determine if this content type should show play button when uncompleted
    // Only show play button for reel content
    const isVideoContent = item.content_type === 'reel';

    // Check if thumbnail is a video file
    const isVideoThumbnail = item.thumbnail_url?.match(/\.(mp4|mov|m4v|webm)$/i);

    // Find progress for this card (moduleId matches content_list.id)
    const cardProgress = userProgress.find(
      (progress) => progress.moduleId === item.id && progress.adventureId === adventure.readable_id
    );
    const isCompleted = cardProgress?.isCompleted && cardProgress?.quizCompleted;
    const starCount = cardProgress?.quizScore || 0;

    return (
      <View key={item.id} style={[styles.cardWrapper, cardStyle]}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onCardPress?.(item);
          }}
        >
          <Thumbnail
            thumbnailUrl={item.thumbnail_url || item.media_url?.[0] || ''}
            isVideo={!!isVideoThumbnail}
          />

          {/* Number Badge - top right (under overlay) */}
          <View style={styles.numberBadge}>
            <Text style={styles.numberText}>{item.order_by}</Text>
          </View>

          {/* Solid overlay for image visibility */}
          <View style={styles.cardOverlay} />

          {/* Conditional Layout based on completion and card size */}
          {isCompleted ? (
            isLarge ? (
              // LARGE CARD - Centered replay + stars above + title below
              <>
                <View style={styles.replayButtonContainer}>
                  {starCount > 0 && (
                    <View style={styles.starBadgePosition}>
                      <StarBadge starCount={starCount} isLarge={isLarge} />
                    </View>
                  )}
                  <View style={styles.replayButton}>
                    <FontAwesome name="undo" size={34} color="white" />
                  </View>
                </View>
                <View style={styles.cardTitleContainerCompleted}>
                  <Text style={styles.cardTitleLarge}>{item.thumbnail_title}</Text>
                </View>
              </>
            ) : (
              // SMALL CARD - Horizontal layout: replay+stars LEFT, title RIGHT
              <View style={styles.smallCardCompletedContainer}>
                {/* Left side: Replay button with stars above */}
                <View style={styles.smallCardLeftSide}>
                  {starCount > 0 && (
                    <View style={styles.smallCardStarsPosition}>
                      <StarBadge starCount={starCount} isLarge={isLarge} />
                    </View>
                  )}
                  <View style={styles.smallReplayButton}>
                    <FontAwesome name="undo" size={34} color="white" />
                  </View>
                </View>

                {/* Right side: Title text */}
                <View style={styles.smallCardRightSide}>
                  <Text style={styles.cardTitle}>{item.thumbnail_title}</Text>
                </View>
              </View>
            )
          ) : (
            <>
              {/* Uncompleted cards: Show play button ONLY for video content */}
              {isVideoContent && (
                <View style={styles.playIconTopLeft}>
                  <Svg width={42} height={42} viewBox="0 0 42 42" fill="none">
                    <Path
                      d="M14 30.0559V11.9434C14 11.4475 14.175 11.0319 14.525 10.6965C14.875 10.3611 15.2833 10.1934 15.75 10.1934C15.8958 10.1934 16.049 10.2152 16.2094 10.259C16.3698 10.3027 16.5229 10.3684 16.6688 10.4559L30.9312 19.5121C31.1938 19.6871 31.3906 19.9059 31.5219 20.1684C31.6531 20.4309 31.7188 20.7079 31.7188 20.9996C31.7188 21.2913 31.6531 21.5684 31.5219 21.8309C31.3906 22.0934 31.1938 22.3121 30.9312 22.4871L16.6688 31.5434C16.5229 31.6309 16.3698 31.6965 16.2094 31.7402C16.049 31.784 15.8958 31.8059 15.75 31.8059C15.2833 31.8059 14.875 31.6382 14.525 31.3027C14.175 30.9673 14 30.5517 14 30.0559ZM17.5 26.8621L26.6875 20.9996L17.5 15.1371V26.8621Z"
                      fill="white"
                    />
                  </Svg>
                </View>
              )}

              {/* Card Title CENTERED for all uncompleted */}
              <View style={styles.cardTitleContainerCentered}>
                <Text style={isLarge ? styles.cardTitleLarge : styles.cardTitle}>{item.thumbnail_title}</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.adventureContainer}>
      {/* ERA Badge */}
      <View style={styles.eraBadge}>
        <Text style={styles.eraText}>ERA {adventure.era_id}  </Text>
        <Text style={styles.adventureText}>ADVENTURE {adventure.order_by}</Text>
      </View>

      {/* Main Title */}
      <View style={styles.titleSection}>
        <TouchableOpacity
          onPress={() => {
            if (onTitlePress) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTitlePress();
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.mainTitle}>{adventure.adventure_title}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => {
            if (onTitlePress) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTitlePress();
            }
          }}
          activeOpacity={0.7}
        >
          <AdventureIcon iconUrl={adventure.icon_url} />
        </TouchableOpacity>
      </View>

      {/* Timeline */}
      <Text style={styles.dateRange}>{adventure.timeline}</Text>

      {/* Bento Grid - Responsive 5 cards layout */}
      <View style={[styles.bentoGridContainer, { height: containerHeight }]}>
        {sortedContent.map((item, index) => renderCard(item, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  adventureContainer: {
    marginBottom: 24,
  },

  // ERA Badge
  eraBadge: {
    flexDirection: 'row',
    marginLeft: 14,
    height: 14,
    marginBottom: 20,
  },
  eraText: {
    color: '#C99151',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1.5,
    fontFamily: 'DM Sans',
    lineHeight: 12,
  },
  adventureText: {
    color: 'rgba(0, 0, 0, 0.20)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1.5,
    fontFamily: 'DM Sans',
    lineHeight: 12,
  },

  // Title Section
  titleSection: {
    marginLeft: 14,
    marginRight: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  mainTitle: {
    width: 242,
    fontSize: 24,
    fontWeight: '700',
    color: ArchivesTheme?.colors?.mutedNavy,
    fontFamily: 'Cormorant-Bold',
  },
  shareButton: {
    width: 32,
    height: 32,
    marginTop: 24,
  },

  // Timeline
  dateRange: {
    marginTop: '2%',
    marginLeft: 14,
    color: '#D7C5B6',
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 18,
    fontFamily: 'DM Sans',
    marginBottom: 13,
  },

  // Bento Grid - Responsive layout (height set dynamically)
  bentoGridContainer: {
    position: 'relative',
    marginBottom: 50,
  },

  // Card wrapper
  cardWrapper: {
    position: 'absolute',
  },
  card: {
    flex: 1,
    borderRadius: 10.28,
    overflow: 'hidden',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 2,
  },

  // Card Elements
  replayButtonContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 50,
    height: 50,
    marginLeft: -25,
    marginTop: -25,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  replayButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconTopLeft: {
    position: 'absolute',
    top: 2,
    left: 0,
    zIndex: 3,
  },
  numberBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#B8AA92',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  numberText: {
    color: '#F4EBDB',
    fontSize: 10,
    fontFamily: 'DMSans-SemiBold',
    textAlign: 'center',
  },
  cardTitleContainerCentered: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    zIndex: 3,
  },
  cardTitleContainerCompleted: {
    position: 'absolute',
    top: '65%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 14,
    zIndex: 3,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'DM Sans',
    lineHeight: 11.76,
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardTitleLarge: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'DM Sans',
    lineHeight: 11.76,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Star Badge - EXACT screenshot positioning (tight arc around button)
  starBadgePosition: {
    position: 'absolute',
    top: 10, // Positioned below button
    left: 0,
    right: 0,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  starBadge: {
    width: 70,
    height: 25,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBadgeBackground: {
    display: 'none',
  },
  leftStar: {
    position: 'absolute',
    left: '0%',              // Relative positioning (0% from left - absolute edge)
    top: -22.5,              // Moved up 35px from 50% (12.5px)
    transform: [{ rotate: '-60deg' }], // Dramatic arc angle
    borderRadius: 50,        // Era 1 glow effect
  },
  middleStar: {
    position: 'absolute',
    left: '50%',             // Centered horizontally
    // marginLeft calculated dynamically in component
    top: -35,                // Moved up 35px from 0%
    borderRadius: 50,        // Era 1 glow effect
  },
  rightStar: {
    position: 'absolute',
    right: '2%',             // Adjusted inward to balance visual spacing with rotation
    top: -22.5,              // Moved up 35px from 50% (12.5px)
    transform: [{ rotate: '60deg' }],  // Dramatic arc angle
    borderRadius: 50,        // Era 1 glow effect
  },

  // Small Card Completed Layout (Horizontal)
  smallCardCompletedContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 12,
    paddingTop: 25,
    zIndex: 3,
  },
  smallCardLeftSide: {
    position: 'relative',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  smallCardStarsPosition: {
    position: 'absolute',
    top: 10,
    left: -10,
    right: -10,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  smallReplayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallCardRightSide: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingBottom: 12,
    paddingRight: 7,
  },
});

export default ROIAdventureComponent;
