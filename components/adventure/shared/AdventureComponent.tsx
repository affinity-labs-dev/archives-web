import { colors } from '@/components/ui/theme';
import { AnimatedEntrance } from '@/components/ui/animations';
import StarsReplayBadge from '@/components/icons/StarsReplayBadge';
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
import type { Adventure, ContentItem } from '@/components/shared/types';

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
            fill={colors.bluePrimary}
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
      tintColor={colors.bluePrimary}
    />
  );
};


// Thumbnail component to handle video player hook properly
interface ThumbnailProps {
  thumbnailUrl: string;
  isVideo: boolean;
  cardWidth: number;
}

const Thumbnail: React.FC<ThumbnailProps> = React.memo(function Thumbnail({ thumbnailUrl, isVideo, cardWidth }) {
  // Memoize optimized URL to prevent expo-image from re-triggering load on re-render
  const optimizedUrl = React.useMemo(() => {
    if (!thumbnailUrl || isVideo) return thumbnailUrl;

    // Only optimize ImageKit URLs (ik.imagekit.io)
    if (!thumbnailUrl.includes('ik.imagekit.io')) return thumbnailUrl;

    // Request 2x for retina displays
    const pixelDensity = 2;
    const roundedWidth = Math.round(cardWidth * pixelDensity);

    // Check if URL already has query parameters
    const hasQueryParams = thumbnailUrl.includes('?');
    const separator = hasQueryParams ? '&' : '?';

    // Append ImageKit resize parameter
    return `${thumbnailUrl}${separator}tr=w-${roundedWidth}`;
  }, [thumbnailUrl, isVideo, cardWidth]);

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
      source={{ uri: optimizedUrl }}
      style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={0}
    />
  );
});

// User progress type for Era 2+
interface UserProgress {
  adventureId: string;
  moduleId: string;
  quizScore: number;
  isCompleted: boolean;
  quizCompleted: boolean;
  completedAt: string;
  era_id: string;
}

// TypeScript interfaces
interface AdventureComponentProps {
  adventure: Adventure;
  userProgress: UserProgress[];
  onCardPress?: (contentItem: ContentItem, adventureId: string) => void;
  onTitlePress?: (adventure: Adventure) => void;
  isLocked?: boolean;
  isVisible?: boolean;
}

const AdventureComponent: React.FC<AdventureComponentProps> = React.memo(function AdventureComponent({ adventure, userProgress, onCardPress, onTitlePress, isLocked = false, isVisible = true }) {
  // Sort by order_by and take first 5 items
  const sortedContent = [...(adventure.content_list || [])]
    .sort((a, b) => a.order_by - b.order_by)
    .slice(0, 5);

  // Responsive card positions based on screen width
  const { width: screenWidth } = Dimensions.get('window');
  const containerPadding = screenWidth * 0.034; // ~13px on 375px screen
  const gap = screenWidth * 0.021; // ~8px gap between columns
  const cardWidth = (screenWidth - containerPadding * 2 - gap) / 2;

  // Layout: Row-based bento grid matching Figma
  // Row 1: Two tall cards (1, 2) side by side
  // Row 2: One full-width short card (3)
  // Row 3: Two short cards (4, 5) side by side
  const fullWidth = screenWidth - containerPadding * 2;
  const tallHeight = cardWidth * 1.2;
  const shortHeight = cardWidth * 0.55;
  const rowGap = gap;

  const cardPositions = [
    // Card 1 — tall left
    { left: containerPadding, top: 0, width: cardWidth, height: tallHeight },
    // Card 2 — tall right
    { left: containerPadding + cardWidth + gap, top: 0, width: cardWidth, height: tallHeight },
    // Card 3 — full-width
    { left: containerPadding, top: tallHeight + rowGap, width: fullWidth, height: shortHeight },
    // Card 4 — short left
    { left: containerPadding, top: tallHeight + shortHeight + rowGap * 2, width: cardWidth, height: shortHeight },
    // Card 5 — short right
    { left: containerPadding + cardWidth + gap, top: tallHeight + shortHeight + rowGap * 2, width: cardWidth, height: shortHeight },
  ];

  // Container height = all rows + gaps
  const containerHeight = tallHeight + shortHeight + shortHeight + rowGap * 2;

  const renderCard = (item: ContentItem, index: number) => {
    const cardStyle = cardPositions[index];
    const isLarge = index === 0 || index === 1; // Cards 1 and 2 are tall
    const isWide = index === 2; // Card 3 is full-width

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
        <AnimatedEntrance preset="fadeIn" delay={200 + index * 100} duration={500} autoPlay={isVisible} style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={isLocked ? 1 : 0.9}
          disabled={isLocked}
          onPress={() => {
            if (!isLocked) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onCardPress?.(item, adventure.readable_id);
            }
          }}
        >
          <Thumbnail
            thumbnailUrl={item.thumbnail_url || item.media_url?.[0] || ''}
            isVideo={!!isVideoThumbnail}
            cardWidth={cardStyle.width}
          />

          {/* Number Badge - top right */}
          <View style={styles.numberBadge}>
            <Text style={styles.numberText}>{item.order_by}</Text>
          </View>

          {/* Solid overlay for image visibility */}
          <View style={styles.cardOverlay} />

          {/* Completed state */}
          {isCompleted ? (
            isLarge ? (
              // TALL CARDS (1, 2) — single centered column
              <View style={styles.completedColumn}>
                <StarsReplayBadge starCount={starCount} size={65} />
                <Text style={styles.completedTitleCenter} numberOfLines={3}>{item.thumbnail_title}</Text>
              </View>
            ) : (
              // WIDE/SHORT CARDS (3, 4, 5) — two columns: stars left, title right
              <View style={styles.completedTwoCol}>
                <View style={styles.completedLeftCol}>
                  <StarsReplayBadge starCount={starCount} size={55} />
                </View>
                <View style={styles.completedRightCol}>
                  <Text style={styles.completedTitleLeft} numberOfLines={3}>{item.thumbnail_title}</Text>
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
                <Text style={(isLarge || isWide) ? styles.cardTitleLarge : styles.cardTitle}>{item.thumbnail_title}</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
        </AnimatedEntrance>
      </View>
    );
  };

  return (
    <View style={styles.adventureContainer}>
      {/* ERA Badge */}
      <AnimatedEntrance preset="fadeIn" duration={500} autoPlay={isVisible}>
        <View style={styles.eraBadge}>
          <Text style={styles.eraText}>{adventure.card_content?.era_name || adventure.era_id}</Text>
          <Text style={styles.adventureText}>ADVENTURE {adventure.order_by}</Text>
        </View>
      </AnimatedEntrance>

      {/* Main Title */}
      <AnimatedEntrance preset="slideFromBottom" duration={600} autoPlay={isVisible}>
        <View style={styles.titleSection}>
          <TouchableOpacity
            onPress={() => {
              if (onTitlePress && !isLocked) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onTitlePress(adventure);
              }
            }}
            activeOpacity={isLocked ? 1 : 0.7}
            disabled={isLocked}
          >
            <Text style={styles.mainTitle}>{adventure.adventure_title}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => {
              if (onTitlePress && !isLocked) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onTitlePress(adventure);
              }
            }}
            activeOpacity={isLocked ? 1 : 0.7}
            disabled={isLocked}
          >
            <AdventureIcon iconUrl={adventure.icon_url} />
          </TouchableOpacity>
        </View>
      </AnimatedEntrance>

      {/* Timeline */}
      <AnimatedEntrance preset="fadeIn" delay={100} duration={500} autoPlay={isVisible}>
        <Text style={styles.dateRange}>{adventure.timeline}</Text>
      </AnimatedEntrance>

      {/* Bento Grid - Responsive 5 cards layout */}
      <View style={[styles.bentoGridContainer, { height: containerHeight }]}>
        {sortedContent.map((item, index) => renderCard(item, index))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  adventureContainer: {
    marginBottom: 24,
    position: 'relative', // Enable absolute positioning for lock overlay
  },

  // ERA Badge
  eraBadge: {
    flexDirection: 'row',
    marginLeft: 14,
    height: 14,
    marginBottom: 20,
    gap: 8,
  },
  eraText: {
    color: colors.onyx,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.96,
    fontFamily: 'Onest-Bold',
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  adventureText: {
    color: colors.bluePrimary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.96,
    fontFamily: 'Onest-SemiBold',
    lineHeight: 14,
  },

  // Title Section
  titleSection: {
    marginLeft: 14,
    marginRight: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mainTitle: {
    width: 242,
    fontSize: 24,
    color: colors.onyx,
    fontFamily: 'Bounded-Black',
    textTransform: 'uppercase',
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
    color: colors.bluePrimary,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 18,
    fontFamily: 'Onest-Medium',
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
    width: 31,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: colors.onyx,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Onest-Bold',
    fontWeight: '700',
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
  cardTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Onest-SemiBold',
    lineHeight: 15,
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardTitleLarge: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Onest-SemiBold',
    lineHeight: 15,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Tall cards (1, 2) — single centered column
  completedColumn: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    zIndex: 3,
    paddingHorizontal: 10,
  },
  completedTitleCenter: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Onest-SemiBold',
    lineHeight: 15,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Wide/Short cards (3, 4, 5) — two columns
  completedTwoCol: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 3,
    padding: 10,
  },
  completedLeftCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  completedRightCol: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  completedTitleLeft: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Onest-SemiBold',
    lineHeight: 15,
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default AdventureComponent;
