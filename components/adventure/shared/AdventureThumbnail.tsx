// AdventureThumbnail — fills the bento card with a still image OR a paused,
// muted video frame depending on whether the URL is a video file.
//
// Critical perf split: the image and video paths are SEPARATE components.
// Earlier the same component called `useVideoPlayer` unconditionally
// (passing '' when not video), which still allocated a native player
// instance per card. With 5 cards × N adventures rendered up-front, that
// was 25+ idle players hammering the JS thread on mount/unmount during
// scroll. Now non-video cards run a pure expo-image render — zero player
// overhead.
//
// Image source is memoized through ImageKit's `tr=w-{px}` resize parameter
// — we request 2× the displayed pixel width so retina screens get crisp
// images without blowing memory/decode time on full-size source assets.

import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';

interface ImageThumbnailProps {
  thumbnailUrl: string;
  cardWidth: number;
}

const ImageThumbnailComponent: React.FC<ImageThumbnailProps> = ({
  thumbnailUrl,
  cardWidth,
}) => {
  const optimizedUrl = React.useMemo(() => {
    if (!thumbnailUrl || !thumbnailUrl.includes('ik.imagekit.io')) return thumbnailUrl;
    const pixelDensity = 2;
    const roundedWidth = Math.round(cardWidth * pixelDensity);
    const separator = thumbnailUrl.includes('?') ? '&' : '?';
    return `${thumbnailUrl}${separator}tr=w-${roundedWidth}`;
  }, [thumbnailUrl, cardWidth]);

  return (
    <Image
      source={{ uri: optimizedUrl }}
      style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={0}
    />
  );
};

const ImageThumbnail = React.memo(ImageThumbnailComponent);

interface VideoThumbnailProps {
  thumbnailUrl: string;
}

const VideoThumbnailComponent: React.FC<VideoThumbnailProps> = ({ thumbnailUrl }) => {
  const player = useVideoPlayer(thumbnailUrl, (p) => {
    p.pause();
    p.muted = true;
  });

  React.useEffect(() => {
    return () => {
      if (player) {
        try {
          player.pause();
          player.replace('');
        } catch {
          // Silently ignore cleanup errors — happens if player already detached.
        }
      }
    };
  }, [player]);

  return (
    <VideoView
      player={player}
      style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
      nativeControls={false}
      contentFit="cover"
    />
  );
};

const VideoThumbnail = React.memo(VideoThumbnailComponent);

interface AdventureThumbnailProps {
  thumbnailUrl: string;
  isVideo: boolean;
  cardWidth: number;
}

/**
 * Public wrapper — picks the cheap image path or the heavier video path
 * based on `isVideo`. Branch happens BEFORE either child mounts so
 * `useVideoPlayer` is never called for image cards.
 */
export const AdventureThumbnail: React.FC<AdventureThumbnailProps> = ({
  thumbnailUrl,
  isVideo,
  cardWidth,
}) => {
  if (isVideo) {
    return <VideoThumbnail thumbnailUrl={thumbnailUrl} />;
  }
  return <ImageThumbnail thumbnailUrl={thumbnailUrl} cardWidth={cardWidth} />;
};
