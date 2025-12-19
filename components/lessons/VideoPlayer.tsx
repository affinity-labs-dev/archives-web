// VideoPlayer.tsx - Full-screen video player for lessons
// EXACT replica of SwiftUI Module1VideoPlayerView
// Migrated to expo-video (modern API)

import { useEvent } from 'expo'
import * as Haptics from 'expo-haptics'
import { useVideoPlayer, VideoView } from 'expo-video'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Dimensions,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native'

const { width, height } = Dimensions.get('window')

interface VideoPlayerProps {
  videoSource: any // Video file require() source
  onPlaybackStatusUpdate?: (status: any) => void // Updated for expo-video
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

  // Helper to detect HLS format from URL
  const isHLSUrl = (url: string): boolean => {
    return url.includes('.m3u8') || url.includes('/hls/') || url.includes('format=m3u8');
  };

  // PERFORMANCE: Optimize videoSource with useMemo + HLS detection for Android
  const optimizedVideoSource = useMemo(() => {
    // Remote URL object - add contentType for Android HLS compatibility
    if (typeof videoSource === 'object' && videoSource !== null && 'uri' in videoSource) {
      const uri = videoSource.uri || '';
      const isHLS = isHLSUrl(uri);

      // Debug logging for Android
      if (Platform.OS === 'android') {
        console.log('🎬 [Android] VideoPlayer source:', {
          uri: uri.substring(0, 80) + '...',
          detectedFormat: isHLS ? 'HLS' : 'Progressive',
          contentType: isHLS ? 'hls' : undefined,
        });
      }

      return {
        ...videoSource,
        // Only set contentType for HLS on Android - helps ExoPlayer identify format
        ...(isHLS && { contentType: 'hls' }),
      };
    }

    // Local asset from require() - pass directly (NO assetId wrapper)
    if (typeof videoSource === 'number') {
      console.log('🎬 VideoPlayer: Local asset (require)');
      return videoSource;
    }

    // String URI - wrap in object with HLS detection
    if (typeof videoSource === 'string') {
      const isHLS = isHLSUrl(videoSource);

      if (Platform.OS === 'android') {
        console.log('🎬 [Android] VideoPlayer string source:', {
          uri: videoSource.substring(0, 80) + '...',
          detectedFormat: isHLS ? 'HLS' : 'Progressive',
        });
      }

      return {
        uri: videoSource,
        ...(isHLS && { contentType: 'hls' }),
      };
    }

    return videoSource;
  }, [videoSource])

  // Create video player with expo-video API and optimized source
  const player = useVideoPlayer(optimizedVideoSource, player => {
    // ANDROID OOM FIX: Limit buffer to reduce memory usage
    // ExoPlayer pre-parses all HLS variants which can cause OOM on lower-end devices
    player.bufferOptions = {
      preferredForwardBufferDuration: 10,  // Only buffer 10 seconds ahead
    };
    player.loop = shouldLoop
    if (autoPlay) {
      player.play()
    }
  })

  // Use proper expo-video event handling for playing state
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  })

  // Clean implementation: Use expo-video's proper progress tracking
  useEffect(() => {
    if (!onPlaybackStatusUpdate) return

    // Set up progress updates when video is ready
    // PERFORMANCE FIX: Reduced from 60fps (16ms) to 10fps (100ms) - 6x less memory/CPU usage
    const interval = setInterval(() => {
      if (player.status === 'readyToPlay') {
        const currentTime = player.currentTime
        const duration = player.duration

        if (duration > 0) {
          onPlaybackStatusUpdate({
            isLoaded: true,
            isPlaying: player.playing,
            positionMillis: currentTime * 1000,
            durationMillis: duration * 1000,
            status: 'readyToPlay'
          })
        }
      }
    }, 100) // 10fps is plenty for progress bars, saves 6x memory

    return () => clearInterval(interval)
  }, [player, onPlaybackStatusUpdate])

  // Cleanup video player on unmount
  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch (error) {
        // Silently handle cleanup errors
      }
    };
  }, [player])

  // Handle basic player status changes with enhanced Android debugging
  useEffect(() => {
    const statusSubscription = player.addListener('statusChange', (status, oldStatus, error) => {
      // Enhanced logging for debugging
      console.log(`🎬 [${Platform.OS}] Player status: ${oldStatus} → ${status}`);

      if (error) {
        // Detailed error logging for Android debugging
        const videoUrl = typeof videoSource === 'object' && videoSource?.uri
          ? videoSource.uri
          : typeof videoSource === 'string'
            ? videoSource
            : 'local asset';

        console.error(`🎬 [${Platform.OS}] ERROR: Video playback failed`);
        console.error('🎬 Error details:', {
          message: error.message || error,
          videoUrl: videoUrl.substring(0, 100) + '...',
          platform: Platform.OS,
          osVersion: Platform.Version,
        });

        // Android-specific error hints
        if (Platform.OS === 'android') {
          console.error('🎬 [Android] Possible causes:');
          console.error('   - HLS format not detected (check contentType)');
          console.error('   - ExoPlayer codec issue');
          console.error('   - Network/CORS issue with video URL');
        }
        return
      }

      if (status === 'readyToPlay' && !isVideoLoaded) {
        console.log(`🎬 [${Platform.OS}] Video loaded and ready to play ✅`);
        setIsVideoLoaded(true)
      }

      if (status === 'error') {
        console.error(`🎬 [${Platform.OS}] Player entered error state`);
      }
    })

    return () => statusSubscription?.remove()
  }, [player, isVideoLoaded, videoSource])

  // Handle tap to play/pause - Direct player control
  const handleVideoTap = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      if (isPlaying) {
        player.pause()
      } else {
        player.play()
      }
    } catch (error) {
      console.error('🎬 ERROR: Failed to toggle playback:', error)
    }
  }

  return (
    <TouchableWithoutFeedback onPress={handleVideoTap}>
      <View style={styles.container}>
        <VideoView
          player={player}
          style={styles.video}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          nativeControls={false} // EXACT SwiftUI: .showsPlaybackControls = false
          contentFit="cover" // EXACT SwiftUI: .videoGravity = .resizeAspectFill
        />
      </View>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height,
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
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 5, // Higher zIndex to ensure it captures touches above video
  },
})
