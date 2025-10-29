// Adventure3_Module3_Lesson2.tsx - EXACT replica of SwiftUI Adventure3_Module3_Lesson2.swift  
// Dual video lesson about aftermath and continuing cultural exchange

import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import * as Haptics from 'expo-haptics'
import ArchivesTheme from '@/constants/ArchivesTheme'

interface Adventure3_Module3_Lesson2Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

export default function Adventure3_Module3_Lesson2({
  onContinue,
  onDismiss,
  onBack,
}: Adventure3_Module3_Lesson2Props) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const video1Ref = useRef<Video>(null)
  const video2Ref = useRef<Video>(null)

  // EXACT text content as specified
  const text1 = `After the Battle of Tours, the Umayyads remained in al-Andalus, while the Franks held their ground in the north. Though no formal borders existed, a clear frontier had emerged - one shaped by culture, faith, and memory.`
  
  const text2 = `Though military expansion halted, contact didn't. Merchants, scholars, and stories still crossed the divide. But the age of rapid conquest was over, and a new phase of regional power had begun.`
  
  const text3 = `The retreat from Tours marked the end of Umayyad expansion into Gaul. Though they still controlled al-Andalus, their ambitions in Europe's north faded. For the Franks, it was a proud defense. For the Muslims, it was a lesson in limits. The battle didn't erase cultural exchange - but it did draw a line, one that shaped borders and ideas for centuries to come.`

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
          {/* Section 1: A Divided Frontier */}
          <View style={styles.videoSection}>
            {/* Section Title */}
            <View style={styles.textContainer}>
              <Text style={styles.sectionTitle}>A Divided Frontier</Text>
            </View>
            
            {/* Text 1 */}
            <View style={styles.textContainer}>
              <Text style={styles.lessonText}>
                {text1}
              </Text>
            </View>
            
            {/* Image 1 */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv3_M3_Img01.jpg" }}
                style={styles.video}
                resizeMode="cover"
              />
            </View>
            
          </View>

          {/* Section 2: An End to Expansion - Not Exchange */}
          <View style={styles.videoSection}>
            {/* Section Title */}
            <View style={styles.textContainer}>
              <Text style={styles.sectionTitle}>An End to Expansion - Not Exchange</Text>
            </View>
            
            {/* Text 2 - "Though military expansion halted..." */}
            <View style={styles.textContainer}>
              <Text style={styles.lessonText}>
                {text2}
              </Text>
            </View>
            
            {/* Video 1 - after "Though..." paragraph */}
            <View style={styles.videoContainer}>
              <Video
                ref={video1Ref}
                source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv3_M3_Media2_Video1.mp4" }}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isLooping={true}
                isMuted={false}
              />
            </View>
            
            {/* Text 3 - final text after video */}
            <View style={styles.textContainer}>
              <Text style={styles.finalText}>
                {text3}
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
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onContinue();
            }}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Back Button - always visible */}
      <SafeAreaView style={styles.backButtonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const callback = onBack || onDismiss;
            callback();
          }}
        >
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
    marginBottom: 16, // Reduced from 30 to 16 to minimize gaps
  },

  videoContainer: {
    alignItems: 'center',
    paddingHorizontal: 20, // EXACT SwiftUI: .padding(.horizontal, 20)
    marginBottom: 8, // Reduced from 16 to 8 to minimize gaps after videos
  },

  // Separate image container style to prevent margin stacking
  imageContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4, // Much smaller margin for images to eliminate large gaps
  },

  video: {
    width: '100%',
    height: 250, // EXACT SwiftUI: .frame(height: 250)
    borderRadius: 12, // EXACT SwiftUI: .cornerRadius(12)
  },

  // Text containers
  textContainer: {
    paddingHorizontal: 20, // EXACT SwiftUI: .padding(.horizontal, 20)
    marginBottom: 8, // Reduced from 20 to 8 to eliminate excessive spacing
  },

  lessonText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    lineHeight: 24, // EXACT SwiftUI: .lineSpacing(6)
    textAlign: 'left', // EXACT SwiftUI: .multilineTextAlignment(.leading)
  },

  // Section titles
  sectionTitle: {
    fontFamily: 'DM Sans',
    fontSize: 22,
    fontWeight: '700', // Bold for section headers
    color: ArchivesTheme.colors.mutedNavy,
    lineHeight: 28,
    textAlign: 'left',
    marginBottom: 8, // Reduced from 16 to 8
  },

  // Final text (quote-style)
  finalText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    color: ArchivesTheme.colors.shoeBrown,
    lineHeight: 24,
    textAlign: 'left',
    marginTop: 20, // Extra spacing after video
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