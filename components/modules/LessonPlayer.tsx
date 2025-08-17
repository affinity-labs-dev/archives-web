// LessonPlayer.tsx - EXACT replica of SwiftUI Module1VideoPlayerView
// Full-screen video player with exact controls and behavior matching SwiftUI

import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import * as Haptics from 'expo-haptics'

const { width, height } = Dimensions.get('window')

interface LessonPlayerProps {
  videoSource: any // Video file require() source
  isPlaying: boolean
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void
  onTogglePlayback?: () => void
  autoPlay?: boolean
  shouldLoop?: boolean
}

export default function LessonPlayer({
  videoSource,
  isPlaying,
  onPlaybackStatusUpdate,
  onTogglePlayback,
  autoPlay = true,
  shouldLoop = true,
}: LessonPlayerProps) {
  const videoRef = useRef<Video>(null)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)

  // Auto-play when component mounts - EXACT SwiftUI: player.play() in onAppear
  useEffect(() => {
    if (autoPlay && isVideoLoaded) {
      videoRef.current?.playAsync()
    }
  }, [autoPlay, isVideoLoaded])

  // Handle play/pause state changes
  useEffect(() => {
    if (!isVideoLoaded) return

    if (isPlaying) {
      videoRef.current?.playAsync()
    } else {
      videoRef.current?.pauseAsync()
    }
  }, [isPlaying, isVideoLoaded])

  // Handle video load
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (!isVideoLoaded) {
        setIsVideoLoaded(true)
        console.log('🎬 DEBUG: Video loaded successfully')
      }
      
      // Handle looping - EXACT SwiftUI: seek to zero and replay
      if (shouldLoop && status.didJustFinish && !status.isLooping) {
        videoRef.current?.replayAsync()
      }
    } else if (status.error) {
      console.error('🎬 ERROR: Video playback failed:', status.error)
    }

    onPlaybackStatusUpdate?.(status)
  }

  // Handle tap to play/pause - EXACT SwiftUI: .onTapGesture { togglePlayPause() }
  const handleVideoTap = () => {
    console.log('🎬 DEBUG: Video tapped - current playing state:', isPlaying)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onTogglePlayback?.()
  }

  return (
    <TouchableWithoutFeedback onPress={handleVideoTap}>
      <View style={styles.container}>
        <Video
          ref={videoRef}
          source={videoSource}
          style={styles.video}
          resizeMode={ResizeMode.COVER} // EXACT SwiftUI: .videoGravity = .resizeAspectFill
          shouldPlay={false} // Controlled manually to match SwiftUI behavior
          isLooping={shouldLoop}
          isMuted={false} // Allow audio like SwiftUI
          useNativeControls={false} // EXACT SwiftUI: .showsPlaybackControls = false
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          progressUpdateIntervalMillis={50}
        />
        
        {/* Overlay for touch handling - invisible but captures touches */}
        <View style={styles.touchOverlay} />
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
  },
})