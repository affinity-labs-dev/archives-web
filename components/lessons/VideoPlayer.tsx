// VideoPlayer.tsx - Full-screen video player for lessons
// EXACT replica of SwiftUI Module1VideoPlayerView
// Migrated to expo-video (modern API)

import { useEvent } from 'expo'
import * as Haptics from 'expo-haptics'
import { useVideoPlayer, VideoView, VideoSource } from 'expo-video'
import React, { useEffect, useMemo, useState, useRef } from 'react'
import {
  Dimensions,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native'

const { width, height } = Dimensions.get('window')

interface VideoPlayerProps {
  videoSource: any
  onPlaybackStatusUpdate?: (status: any) => void
  autoPlay?: boolean
  shouldLoop?: boolean
}

export default function VideoPlayer({
  videoSource,
  onPlaybackStatusUpdate,
  autoPlay = true,
  shouldLoop = true,
}: VideoPlayerProps) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)

  // Track if we've already logged the source (prevent spam)
  const hasLoggedSource = useRef(false)

  // Guard against stale statusChange events after player cleanup
  const isReleasedRef = useRef(false)

  // PERFORMANCE: Optimize videoSource with useMemo
  const optimizedVideoSource: VideoSource = useMemo(() => {
    // Remote URL object
    if (typeof videoSource === 'object' && videoSource !== null && 'uri' in videoSource) {
      const uri = videoSource.uri || '';

      // Auto-detect HLS for Android compatibility
      const isHLS = uri.includes('.m3u8') || uri.includes('/hls/') || uri.includes('format=m3u8');

      const source = {
        ...videoSource,
        contentType: isHLS ? 'hls' : 'progressive',
      };

      // Log only once
      if (!hasLoggedSource.current && Platform.OS === 'android') {
        console.log('🎬 [Android] VideoPlayer source:', {
          uri: uri.substring(0, 80) + '...',
          contentType: source.contentType,
          detectedFormat: isHLS ? 'HLS' : 'Progressive',
        });
        hasLoggedSource.current = true;
      }

      return source;
    }

    // Local asset from require()
    if (typeof videoSource === 'number') {
      return videoSource;
    }

    // String URI
    if (typeof videoSource === 'string') {
      const isHLS = videoSource.includes('.m3u8') || videoSource.includes('/hls/') || videoSource.includes('format=m3u8');
      return {
        uri: videoSource,
        contentType: isHLS ? 'hls' : 'progressive',
      };
    }

    return videoSource;
  }, [videoSource])

  // Create video player
  const player = useVideoPlayer(optimizedVideoSource, player => {
    player.loop = shouldLoop;

    console.log('🎬 [' + Platform.OS + '] Player created, autoPlay:', autoPlay);

    if (autoPlay) {
      player.play();
    }
  })

  // Use proper expo-video event handling
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  })

  // Reset released flag when player changes; mark as released on cleanup
  useEffect(() => {
    isReleasedRef.current = false;
    return () => {
      isReleasedRef.current = true;
    };
  }, [player]);

  // ✅ FIXED: Correct event listener signature (receives single payload object)
  useEffect(() => {
    if (isReleasedRef.current) return;

    const statusSubscription = player.addListener('statusChange', (payload) => {
      if (isReleasedRef.current) return;

      try {
        const { status, oldStatus, error } = payload;

        console.log(`🎬 [${Platform.OS}] Status: ${oldStatus} → ${status}`);

        if (error) {
          console.error('🎬 ERROR - Full error object:', JSON.stringify(error, null, 2));
          console.error('🎬 ERROR - Video URL:', typeof videoSource === 'object' ? videoSource?.uri : videoSource);
        }

        if (status === 'readyToPlay') {
          console.log('🎬 Video ready to play!');
          if (!isVideoLoaded) {
            setIsVideoLoaded(true);
          }
          if (autoPlay && !player.playing) {
            console.log('🎬 [Android] Forcing play after readyToPlay');
            player.play();
          }
        }

        if (status === 'error') {
          console.error('🎬 Player entered error state');
          console.error('🎬 Video URL that failed:', typeof videoSource === 'object' ? videoSource?.uri : videoSource);
        }
      } catch (err) {
        console.warn('🎬 statusChange handler error (player likely released):', err);
      }
    });

    return () => statusSubscription?.remove();
  }, [player, isVideoLoaded, autoPlay, videoSource]);

  // Progress updates
  useEffect(() => {
    if (!onPlaybackStatusUpdate) return;

    const interval = setInterval(() => {
      if (player.status === 'readyToPlay') {
        const currentTime = player.currentTime;
        const duration = player.duration;

        if (duration > 0) {
          onPlaybackStatusUpdate({
            isLoaded: true,
            isPlaying: player.playing,
            positionMillis: currentTime * 1000,
            durationMillis: duration * 1000,
            status: 'readyToPlay'
          });
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [player, onPlaybackStatusUpdate]);

  // Cleanup
  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch (error) {
        // Silently handle cleanup errors
      }
    };
  }, [player]);

  // Handle tap to play/pause
  const handleVideoTap = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.error('🎬 ERROR: Failed to toggle playback:', error);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handleVideoTap}>
      <View style={styles.container}>
        <VideoView
          player={player}
          style={styles.video}
          fullscreenOptions={{ enable: false }}
          allowsPictureInPicture={false}
          nativeControls={false}
          contentFit="cover"
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: 'black',
    position: 'relative',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'black',
  },
});
