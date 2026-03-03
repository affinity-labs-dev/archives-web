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
import { analyticsService } from '@/services/AnalyticsService'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export default function OnboardingVideoScreen() {
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoCompleted, setVideoCompleted] = useState(false)
  const [screenStartTime] = useState(Date.now())
  const [exitAction, setExitAction] = useState<'back_button' | 'continued' | 'app_closed'>('app_closed')
  const router = useRouter()
  const { trackScreenView, trackVideoPlayed } = useAnalytics()

  // Create video player for intro video
  const player = useVideoPlayer(require("@/assets/videos/Intro_archives.mp4"), player => {
    try {
      player.loop = false // Don't loop the intro video
      player.muted = false // Allow audio for intro

      // Try to play immediately
      setTimeout(() => {
        try {
          player.play()
        } catch (playError) {
          console.error('🎬 Error calling play():', playError)
        }
      }, 100) // Small delay to ensure player is ready

    } catch (error) {
      console.error('🎬 Error during player setup:', error)
    }
  })

  // Track screen view and onboarding start when component mounts
  useEffect(() => {
    trackScreenView('Onboarding Video')

    // Store onboarding start time for completion tracking
    const storeStartTime = async () => {
      try {
        const startTime = Date.now().toString()
        await AsyncStorage.setItem('onboarding_start_time', startTime)
      } catch (error) {
        console.error('Error storing start time:', error)
      }
    }

    storeStartTime()

    // Track screen exit on unmount
    return () => {
      const duration_seconds = Math.floor((Date.now() - screenStartTime) / 1000)
      analyticsService.trackOnboardingScreenExited({
        screen: 'onboarding_video',
        exit_action: exitAction,
        duration_seconds,
      })
    }
  }, [trackScreenView, screenStartTime, exitAction])

  // Handle video loading state and events
  useEffect(() => {
    if (!player) return

    try {
      const statusSubscription = player.addListener('statusChange', (status) => {
        try {
          if (status.status === 'readyToPlay' && !videoLoaded) {
            trackVideoPlayed('Intro_archives.mp4')
            setVideoLoaded(true)

            // Auto-play when ready
            try {
              player.play()
            } catch (error) {
              console.error('Auto-play failed:', error)
            }
          } else if (status.status === 'error') {
            console.error('Video player error:', status.error)
          }
        } catch (err) {
          console.warn('🎬 [OnboardingVideo] statusChange error:', err)
        }
      })

      // Listen for video completion - playToEnd is the official expo-video v3 event
      const playbackSubscription = player.addListener('playToEnd', () => {
        if (!videoCompleted) {
          setVideoCompleted(true)
          // Auto-continue when video completes
          setTimeout(() => {
            handleContinue()
          }, 1000) // 1 second delay for smooth transition
        }
      })

      return () => {
        statusSubscription?.remove()
        playbackSubscription?.remove()
      }
    } catch (error) {
      console.warn('Video listener error:', error)
    }
  }, [player, videoLoaded, videoCompleted, trackVideoPlayed])

  // Fallback timer - auto-continue after reasonable video length (e.g., 30 seconds)
  useEffect(() => {
    if (videoLoaded && !videoCompleted) {
      const fallbackTimer = setTimeout(() => {
        if (!videoCompleted) {
          setVideoCompleted(true)
          handleContinue()
        }
      }, 35000) // 35 seconds fallback timer

      return () => {
        clearTimeout(fallbackTimer)
      }
    }
  }, [videoLoaded, videoCompleted])

  // Continue to second video (archives_intro.mp4)
  const handleContinue = async () => {
    try {
      setExitAction('continued')
      router.replace('/onboarding-video-2')
    } catch (error) {
      console.error('Error navigating:', error)
      // Continue anyway to avoid blocking user
      setExitAction('continued')
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
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? 10 : 0 }]}>
        {/* Full Screen Video */}
        {videoLoaded ? (
          <VideoView
            player={player}
            style={styles.fullScreenVideo}
            contentFit="cover"
            nativeControls={false}
            fullscreenOptions={{ enable: false }}
            allowsPictureInPicture={false}
            allowsVideoFrameAnalysis={false}
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