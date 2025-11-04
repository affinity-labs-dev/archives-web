// OnboardingVideo2Screen - Second video in onboarding flow
// Shows archives_intro.mp4 then continues to welcome screen

import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  StatusBar,
  Dimensions,
  Text,
  Platform,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { useAnalytics } from '@/hooks/useAnalytics'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export default function OnboardingVideo2Screen() {
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoCompleted, setVideoCompleted] = useState(false)
  const router = useRouter()
  const { trackScreenView, trackVideoPlayed } = useAnalytics()

  console.log('🎬 [OnboardingVideo2] Component initializing...')

  // Create video player for second intro video
  const player = useVideoPlayer(require("@/assets/videos/archives_intro.mp4"), player => {
    console.log('🎬 [OnboardingVideo2] Video player initialization callback')

    try {
      player.loop = true // Loop the video
      player.muted = false // Allow audio
      console.log('🎬 [OnboardingVideo2] Player configured - loop: true, muted: false')

      // Try to play immediately
      setTimeout(() => {
        try {
          console.log('🎬 [OnboardingVideo2] Attempting to start playback...')
          player.play()
          console.log('🎬 [OnboardingVideo2] Play command sent')
        } catch (playError) {
          console.error('🎬 [OnboardingVideo2] Error calling play():', playError)
        }
      }, 100) // Small delay to ensure player is ready

    } catch (error) {
      console.error('🎬 [OnboardingVideo2] Error during player setup:', error)
    }
  })

  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('Onboarding Video 2')
  }, [trackScreenView])

  // Handle video loading state and events
  useEffect(() => {
    if (!player) return

    try {
      const statusSubscription = player.addListener('statusChange', (status) => {
        console.log('🎬 [OnboardingVideo2] Video status changed:', status.status)

        if (status.status === 'readyToPlay' && !videoLoaded) {
          console.log('🎬 [OnboardingVideo2] Video ready to play - setting videoLoaded to true')
          trackVideoPlayed('archives_intro.mp4')
          setVideoLoaded(true)

          // Auto-play when ready
          try {
            console.log('🎬 [OnboardingVideo2] Calling player.play() from statusChange')
            player.play()
            console.log('🎬 [OnboardingVideo2] Auto-play started successfully')
          } catch (error) {
            console.error('🎬 [OnboardingVideo2] Auto-play failed:', error)
          }
        } else if (status.status === 'error') {
          console.error('🎬 [OnboardingVideo2] Video player error:', status.error)
        }
      })

      return () => {
        statusSubscription?.remove()
      }
    } catch (error) {
      console.warn('🎬 [OnboardingVideo2] Video listener error:', error)
    }
  }, [player, videoLoaded, videoCompleted, trackVideoPlayed])

  // No auto-continue - manual control only via button

  // Navigate to sign in
  const handleSignIn = () => {
    console.log('🎬 [OnboardingVideo2] Navigating to sign in')
    router.push('/(auth)/archives-auth?mode=signin')
  }

  // Navigate to get started (continue onboarding)
  const handleGetStarted = async () => {
    try {
      // Mark both videos as viewed
      await AsyncStorage.setItem('onboarding_videos_viewed', 'true')

      console.log('🎬 [OnboardingVideo2] Continuing onboarding journey to welcome screen')
      router.replace('/onboarding-welcome')
    } catch (error) {
      console.error('🎬 [OnboardingVideo2] Error saving video completion:', error)
      // Continue anyway to avoid blocking user
      router.replace('/onboarding-welcome')
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
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
        ) : (
          // Loading state
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {/* Gradient Overlay - 20% opacity at top, 90% opacity at bottom */}
        {videoLoaded && (
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.2)', // 20% opacity at top
              'rgba(0,0,0,0.9)'  // 90% opacity at bottom
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradientOverlay}
          />
        )}

        {/* Text Content Overlay */}
        {videoLoaded && (
          <SafeAreaView style={styles.contentOverlay}>
            <View style={styles.textContainer}>
              {/* Welcome to Archives */}
              <Text style={styles.welcomeTitle} selectable={false}>
                Welcome to Archives
              </Text>

              {/* Subtitle */}
              <Text style={styles.subtitleText} selectable={false}>
                Islamic History
              </Text>
              <Text style={styles.subtitleText} selectable={false}>
                5 Minutes At A Time
              </Text>

              {/* Spacer */}
              <View style={styles.spacer} />

              {/* Sign In Button */}
              <TouchableOpacity
                style={styles.signInButton}
                onPress={handleSignIn}
                activeOpacity={0.8}
              >
                <Text style={styles.signInButtonText} selectable={false}>
                  SIGN IN
                </Text>
              </TouchableOpacity>

              {/* Get Started Button */}
              <TouchableOpacity
                style={styles.getStartedButton}
                onPress={handleGetStarted}
                activeOpacity={0.8}
              >
                <Text style={styles.getStartedButtonText} selectable={false}>
                  GET STARTED
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
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
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: screenWidth,
    height: screenHeight,
  },
  contentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 60, // Move text and button up from bottom
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeTitle: {
    fontFamily: 'DM Sans',
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitleText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '600',
    color: '#E6D5B7',
    textAlign: 'center',
    marginBottom: 4,
  },
  spacer: {
    height: 51,
  },
  // Sign In Button (outlined style)
  signInButton: {
    width: 345,
    height: 45,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 26.5,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.persianOrange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  signInButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: "600",
    color: ArchivesTheme.colors.creamWhite,
  },
  // Get Started Button (filled style)
  getStartedButton: {
    width: 345,
    height: 48,
    backgroundColor: ArchivesTheme.colors.persianOrange,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  getStartedButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: "600",
    color: "white",
  },
})