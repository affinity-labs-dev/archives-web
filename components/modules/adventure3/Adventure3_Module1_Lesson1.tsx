// Adventure3_Module1_Lesson1.tsx - EXACT replica of SwiftUI Adventure3_Module1_Lesson1.swift  
// Dual video lesson about Umayyad desert journey and Kairouan foundation

import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import ArchivesTheme from '@/constants/ArchivesTheme'

interface Adventure3_Module1_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

export default function Adventure3_Module1_Lesson1({
  onContinue,
  onDismiss,
  onBack,
}: Adventure3_Module1_Lesson1Props) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const video1Ref = useRef<Video>(null)
  const video2Ref = useRef<Video>(null)

  // EXACT SwiftUI text content
  const text1 = `The Umayyads traveled for months through the deserts and hills of North Africa. They faced both resistance and new alliances, pushing forward into unfamiliar terrain with a vision of empire that stretched west.`
  
  const text2 = `In 670 CE, the Umayyads founded Kairouan - the first major Arab city in North Africa. From here, Islam spread not just by conquest, but through trade, scholarship, and diplomacy. A new chapter for the region had begun.`

  // Setup video players on component mount  
  useEffect(() => {
    setupVideoPlayers()
    return () => {
      cleanupVideoPlayers()
    }
  }, [])

  const setupVideoPlayers = () => {
    // Auto-play both videos after brief delay
    setTimeout(() => {
      if (video1Ref.current) {
        video1Ref.current.playAsync()
      }
      if (video2Ref.current) {
        video2Ref.current.playAsync()
      }
    }, 500)
  }

  const cleanupVideoPlayers = () => {
    if (video1Ref.current) {
      video1Ref.current.pauseAsync()
    }
    if (video2Ref.current) {
      video2Ref.current.pauseAsync()
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={ArchivesTheme.colors.creamWhite} />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Video 1 Section */}
          <View style={styles.videoSection}>
            {/* Video 1 Player */}
            <View style={styles.videoContainer}>
              <Video
                ref={video1Ref}
                source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv3_M1_Media1_Video1.mp4" }}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isLooping={true}
                isMuted={false}
              />
            </View>
            
            {/* Text 1 under Video 1 */}
            <View style={styles.textContainer}>
              <Text style={styles.lessonText}>
                {text1}
              </Text>
            </View>
          </View>

          {/* Video 2 Section */}
          <View style={styles.videoSection}>
            {/* Video 2 Player */}
            <View style={styles.videoContainer}>
              <Video
                ref={video2Ref}
                source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv3_M1_Media1_Video2.mp4" }}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isLooping={true}
                isMuted={false}
              />
            </View>
            
            {/* Text 2 under Video 2 */}
            <View style={styles.textContainer}>
              <Text style={styles.lessonText}>
                {text2}
              </Text>
            </View>
          </View>

          {/* Invisible marker to detect when user reaches bottom */}
          <View
            style={styles.bottomMarker}
            onLayout={() => {
              setTimeout(() => {
                setHasScrolledToBottom(true)
              }, 500)
            }}
          />
        </View>
      </ScrollView>

      {/* Continue button overlay - only show after scrolling */}
      {hasScrolledToBottom && (
        <View style={styles.continueButtonContainer}>
          <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Back Button - always visible */}
      <SafeAreaView style={styles.backButtonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack || onDismiss}>
          <Ionicons name="chevron-back" size={24} color={ArchivesTheme.colors.shoeBrown} />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite, // EXACT SwiftUI: Color("CreamWhite")
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingTop: 130, // Padding for back button
    paddingBottom: 130, // Padding for continue button
  },

  // Video sections
  videoSection: {
    marginBottom: 30, // EXACT SwiftUI: VStack(spacing: 30)
  },

  videoContainer: {
    alignItems: 'center',
    paddingHorizontal: 20, // EXACT SwiftUI: .padding(.horizontal, 20)
    marginBottom: 16, // EXACT SwiftUI: spacing: 16
  },

  video: {
    width: '100%',
    height: 250, // EXACT SwiftUI: .frame(height: 250)
    borderRadius: 12, // EXACT SwiftUI: .cornerRadius(12)
  },

  // Text containers
  textContainer: {
    paddingHorizontal: 20, // EXACT SwiftUI: .padding(.horizontal, 20)
  },

  lessonText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    lineHeight: 24, // EXACT SwiftUI: .lineSpacing(6)
    textAlign: 'left', // EXACT SwiftUI: .multilineTextAlignment(.leading)
  },

  // Bottom marker
  bottomMarker: {
    height: 1,
    marginBottom: 40, // EXACT SwiftUI: .padding(.bottom, 40)
  },

  // Continue button overlay
  continueButtonContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 24, // EXACT SwiftUI: .padding(.horizontal, 24)
    paddingBottom: 50, // EXACT SwiftUI: .padding(.bottom, 50)
  },

  continueButton: {
    flexDirection: 'row', // EXACT SwiftUI: HStack(spacing: 8)
    alignItems: 'center',
    paddingHorizontal: 20, // EXACT SwiftUI: .padding(.horizontal, 20)
    paddingVertical: 16, // EXACT SwiftUI: .padding(.vertical, 16)
    backgroundColor: ArchivesTheme.colors.mossGreen, // EXACT SwiftUI: Color("MossGreen")
    borderRadius: 20, // EXACT SwiftUI: .cornerRadius(20)
    // EXACT SwiftUI shadow
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  continueButtonText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 16))
    fontSize: 16,
    fontWeight: '600', // .fontWeight(.semibold)
    color: 'white',
    marginRight: 8, // spacing: 8
  },

  // Back Button
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 20,
    paddingTop: 8,
    paddingLeft: 16,
  },
  
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139,96,64,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});