// AdventureBentoCard — single bento-grid card representing one lesson/module
// inside an adventure. Renders thumbnail + dark overlay + number badge +
// title (uncompleted) OR stars + title (completed). Tap fires `onPress`
// unless `isLocked`.
//
// React.memo + stable per-card props (positioning, content, progress) means
// only the cards whose progress actually changed re-render — the rest of
// the bento grid stays untouched when one lesson completes.

import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

import StarsReplayBadge from '@/components/icons/StarsReplayBadge';
import { Typography } from '@/components/ui';
import { colors } from '@/components/ui/theme';
import type { ContentItem } from '@/components/shared/types';

import { AdventureThumbnail } from './AdventureThumbnail';

export interface AdventureBentoCardLayout {
  left: number;
  top: number;
  width: number;
  height: number;
  isLarge: boolean; // tall cards 1+2
  isWide: boolean;  // full-width card 3
}

interface AdventureBentoCardProps {
  item: ContentItem;
  adventureId: string;
  layout: AdventureBentoCardLayout;
  isCompleted: boolean;
  starCount: number;
  isLocked: boolean;
  onPress: (item: ContentItem, adventureId: string) => void;
}

const AdventureBentoCardComponent: React.FC<AdventureBentoCardProps> = ({
  item,
  adventureId,
  layout,
  isCompleted,
  starCount,
  isLocked,
  onPress,
}) => {
  const { left, top, width, height, isLarge, isWide } = layout;

  const isVideoContent = item.content_type === 'reel';
  const isVideoThumbnail = !!item.thumbnail_url?.match(/\.(mp4|mov|m4v|webm)$/i);
  const thumbnailUrl = item.thumbnail_url || item.media_url?.[0] || '';

  const handlePress = useCallback(() => {
    if (isLocked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(item, adventureId);
  }, [isLocked, onPress, item, adventureId]);

  return (
    <View style={[styles.cardWrapper, { left, top, width, height }]}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={isLocked ? 1 : 0.9}
        disabled={isLocked}
        onPress={handlePress}
      >
        <AdventureThumbnail
          thumbnailUrl={thumbnailUrl}
          isVideo={isVideoThumbnail}
          cardWidth={width}
        />

        {/* Number badge — top right */}
        <View style={styles.numberBadge}>
          <Typography family="onest" weight="700" size={16} color="white" align="center">
            {item.order_by}
          </Typography>
        </View>

        {/* Dark overlay for text legibility on top of imagery */}
        <View style={styles.cardOverlay} />

        {isCompleted ? (
          isLarge ? (
            <View style={styles.completedColumn}>
              <StarsReplayBadge starCount={starCount} size={65} />
              <Typography
                family="onest"
                weight="600"
                size={15}
                lineHeight={15}
                color="white"
                align="center"
                numberOfLines={3}
                style={styles.titleShadow}
              >
                {item.thumbnail_title}
              </Typography>
            </View>
          ) : (
            <View style={styles.completedTwoCol}>
              <View style={styles.completedLeftCol}>
                <StarsReplayBadge starCount={starCount} size={55} />
              </View>
              <View style={styles.completedRightCol}>
                <Typography
                  family="onest"
                  weight="600"
                  size={15}
                  lineHeight={15}
                  color="white"
                  align="left"
                  numberOfLines={3}
                  style={styles.titleShadow}
                >
                  {item.thumbnail_title}
                </Typography>
              </View>
            </View>
          )
        ) : (
          <>
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
            <View style={styles.titleContainer}>
              <Typography
                family="onest"
                weight="600"
                size={15}
                lineHeight={15}
                color="white"
                align={isLarge || isWide ? 'center' : 'left'}
                style={styles.titleShadow}
              >
                {item.thumbnail_title}
              </Typography>
            </View>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

export const AdventureBentoCard = React.memo(AdventureBentoCardComponent);

const styles = StyleSheet.create({
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
  playIconTopLeft: {
    position: 'absolute',
    top: 2,
    left: 0,
    zIndex: 3,
  },
  titleContainer: {
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
  titleShadow: {
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
  // Wide / short cards (3, 4, 5) — two columns
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
});
