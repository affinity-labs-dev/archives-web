// VideoPlayer.tsx - Full-screen video player for lessons
// EXACT replica of SwiftUI Module1VideoPlayerView
// Migrated to expo-video (modern API)

import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useEvent } from 'expo'
import * as Haptics from 'expo-haptics'

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

  // PERFORMANCE: Optimize videoSource with useMemo (no caching to avoid bugs)
  const optimizedVideoSource = useMemo(() => {
    // Remote URL object - pass as-is (NO caching)
    if (typeof videoSource === 'object' && videoSource !== null && 'uri' in videoSource) {
      return videoSource;
    }
    // Local asset from require() - pass directly (NO assetId wrapper)
    if (typeof videoSource === 'number') {
      return videoSource;
    }
    // String URI - wrap in object (NO caching)
    if (typeof videoSource === 'string') {
      return { uri: videoSource };
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

  // Handle basic player status changes
  useEffect(() => {
    const statusSubscription = player.addListener('statusChange', (status, oldStatus, error) => {
      if (error) {
        console.error('🎬 ERROR: Video playback failed:', error)
        return
      }

      if (status === 'readyToPlay' && !isVideoLoaded) {
        setIsVideoLoaded(true)
      }
    })

    return () => statusSubscription?.remove()
  }, [player, isVideoLoaded])

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
