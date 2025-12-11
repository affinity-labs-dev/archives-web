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
import { useAuth } from '@clerk/clerk-expo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { analyticsService } from '@/services/AnalyticsService'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export default function OnboardingVideo2Screen() {
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoCompleted, setVideoCompleted] = useState(false)
  const [screenStartTime] = useState(Date.now())
  const [exitAction, setExitAction] = useState<'back_button' | 'continued' | 'app_closed'>('app_closed')
  const router = useRouter()
  const { isSignedIn, signOut } = useAuth()
  const { trackScreenView, trackVideoPlayed } = useAnalytics()

  // Create video player for second intro video
  const player = useVideoPlayer(require("@/assets/videos/archives_intro.mp4"), player => {
    try {
      player.loop = true
      player.muted = false

      // Try to play immediately
      setTimeout(() => {
        try {
          player.play()
        } catch (playError) {
          console.error('Video play error:', playError)
        }
      }, 100)

    } catch (error) {
      console.error('Video player setup error:', error)
    }
  })

  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('Onboarding Video 2')

    // Track screen exit on unmount
    return () => {
      const duration_seconds = Math.floor((Date.now() - screenStartTime) / 1000)
      analyticsService.trackOnboardingScreenExited({
        screen: 'onboarding_video_2',
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
        if (status.status === 'readyToPlay' && !videoLoaded) {
          trackVideoPlayed('archives_intro.mp4')
          setVideoLoaded(true)

          // Auto-play when ready
          try {
            player.play()
          } catch (error) {
            // Auto-play failed silently
          }
        }
      })

      return () => {
        statusSubscription?.remove()
      }
    } catch (error) {
      // Video listener setup failed
    }
  }, [player, videoLoaded, videoCompleted, trackVideoPlayed])

  // No auto-continue - manual control only via button

  // Navigate to sign in
  const handleSignIn = () => {
    setExitAction('continued')
    router.push('/(auth)/archives-auth?mode=signin')
  }

  // Navigate to get started (continue onboarding)
  const handleGetStarted = async () => {
    try {
      // Sign out if user has a stale session (e.g., reinstalled app but Keychain persisted)
      // This ensures users go through proper auth flow after onboarding
      if (isSignedIn) {
        await signOut()
      }

      // Mark both videos as viewed
      await AsyncStorage.setItem('onboarding_videos_viewed', 'true')

      setExitAction('continued')
      router.replace('/onboarding-welcome')
    } catch (error) {
      // Continue anyway to avoid blocking user
      setExitAction('continued')
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