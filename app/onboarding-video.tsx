// OnboardingVideoScreen - First screen with intro video
// Shows Intro_archives.mp4 with skip and continue options

import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { useAnalytics } from '@/hooks/useAnalytics'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export default function OnboardingVideoScreen() {
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoCompleted, setVideoCompleted] = useState(false)
  const router = useRouter()
  const { trackScreenView, trackVideoPlayed } = useAnalytics()

  console.log('🎬 [OnboardingVideo] Component initializing...')

  // Create video player for intro video
  const player = useVideoPlayer(require("@/assets/videos/Intro_archives.mp4"), player => {
    console.log('🎬 [OnboardingVideo] Video player initialization callback')

    try {
      player.loop = false // Don't loop the intro video
      player.muted = false // Allow audio for intro
      console.log('🎬 [OnboardingVideo] Player configured - loop: false, muted: false')

      // Try to play immediately
      setTimeout(() => {
        try {
          console.log('🎬 [OnboardingVideo] Attempting to start playback...')
          player.play()
          console.log('🎬 [OnboardingVideo] Play command sent')
        } catch (playError) {
          console.error('🎬 [OnboardingVideo] Error calling play():', playError)
        }
      }, 100) // Small delay to ensure player is ready

    } catch (error) {
      console.error('🎬 [OnboardingVideo] Error during player setup:', error)
    }
  })

  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('Onboarding Video')
  }, [trackScreenView])

  // Handle video loading state and events
  useEffect(() => {
    if (!player) return

    try {
      const statusSubscription = player.addListener('statusChange', (status) => {
        console.log('🎬 [OnboardingVideo] Video status changed:', status.status)
        console.log('🎬 [OnboardingVideo] Full status object:', status)

        if (status.status === 'readyToPlay' && !videoLoaded) {
          console.log('🎬 [OnboardingVideo] Video ready to play - setting videoLoaded to true')
          trackVideoPlayed('Intro_archives.mp4')
          setVideoLoaded(true)

          // Auto-play when ready
          try {
            console.log('🎬 [OnboardingVideo] Calling player.play() from statusChange')
            player.play()
            console.log('🎬 [OnboardingVideo] Auto-play started successfully')
          } catch (error) {
            console.error('🎬 [OnboardingVideo] Auto-play failed:', error)
          }
        } else if (status.status === 'error') {
          console.error('🎬 [OnboardingVideo] Video player error:', status.error)
        } else if (status.status === 'loading') {
          console.log('🎬 [OnboardingVideo] Video is loading...')
        } else if (status.status === 'idle') {
          console.log('🎬 [OnboardingVideo] Video player is idle')
        }
      })

      // Listen for video completion
      const playbackSubscription = player.addListener('playToEnd', () => {
        console.log('🎬 [OnboardingVideo] Video reached end, auto-continuing')
        if (!videoCompleted) {
          setVideoCompleted(true)
          // Auto-continue when video completes
          setTimeout(() => {
            handleContinue()
          }, 1000) // 1 second delay for smooth transition
        }
      })

      // Backup listener for playback status (for progress tracking)
      const statusSubscription2 = player.addListener('playbackStatusChange', (status) => {
        console.log('🎬 [OnboardingVideo] Playback status:', {
          isLoaded: status.isLoaded,
          positionMillis: status.positionMillis,
          durationMillis: status.durationMillis,
          progress: status.durationMillis ? (status.positionMillis / status.durationMillis) : 0
        })

        // Fallback completion check
        if (status.isLoaded && status.positionMillis && status.durationMillis) {
          const progress = status.positionMillis / status.durationMillis
          if (progress >= 0.95 && !videoCompleted) {
            console.log('🎬 [OnboardingVideo] Video 95% complete via status listener, auto-continuing')
            setVideoCompleted(true)
            setTimeout(() => {
              handleContinue()
            }, 1000)
          }
        }
      })

      return () => {
        statusSubscription?.remove()
        playbackSubscription?.remove()
        statusSubscription2?.remove()
      }
    } catch (error) {
      console.warn('🎬 [OnboardingVideo] Video listener error:', error)
    }
  }, [player, videoLoaded, videoCompleted, trackVideoPlayed])

  // Fallback timer - auto-continue after reasonable video length (e.g., 30 seconds)
  useEffect(() => {
    if (videoLoaded && !videoCompleted) {
      console.log('🎬 [OnboardingVideo] Setting up fallback timer for auto-continue')

      const fallbackTimer = setTimeout(() => {
        if (!videoCompleted) {
          console.log('🎬 [OnboardingVideo] Fallback timer triggered - auto-continuing')
          setVideoCompleted(true)
          handleContinue()
        }
      }, 35000) // 35 seconds fallback timer

      return () => {
        console.log('🎬 [OnboardingVideo] Clearing fallback timer')
        clearTimeout(fallbackTimer)
      }
    }
  }, [videoLoaded, videoCompleted])

  // Continue to second video (archives_intro.mp4)
  const handleContinue = async () => {
    try {
      console.log('🎬 [OnboardingVideo] Continuing to second video')
      router.replace('/onboarding-video-2')
    } catch (error) {
      console.error('🎬 [OnboardingVideo] Error navigating:', error)
      // Continue anyway to avoid blocking user
      router.replace('/onboarding-video-2')
    }
  }

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="black"
        translucent
      />
      <View style={styles.container}>
        {/* Full Screen Video */}
        {videoLoaded ? (
          <VideoView
            player={player}
            style={styles.fullScreenVideo}
            contentFit="cover"
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
        ) : (
          // Loading state with Archives branding
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  fullScreenVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: screenWidth,
    height: screenHeight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    ...ArchivesTheme.typography.bodyLarge,
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
})