// Adventure4_Module3_Lesson1.tsx - EXACT replica of Adventure3_Module3_Lesson2 format
// Scroll-based lesson about Advanced Islamic Architecture and Innovation

import ArchivesTheme from '@/constants/ArchivesTheme'
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import React, { useEffect, useState } from 'react'
import {
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface Adventure4_Module3_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

export default function Adventure4_Module3_Lesson1({
  onContinue,
  onDismiss,
  onBack,
}: Adventure4_Module3_Lesson1Props) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)

  // Background music hook - AWS CloudFront
  const backgroundMusic = useBackgroundMusic(
    { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv4_M3_L2.mp3" },
    {
      volume: 0.5,
      shouldLoop: true,
    }
  )

  // Content for Advanced Islamic Architecture and Innovation
  const text1 = `The earliest Qur’ans were written in Kufic script - bold, angular letters without vowels. Every stroke had to be perfect, guiding readers through rhythm and shape alone.`

  const text2 = `To mark a new chapter or surah, scribes added gold-leaf bands. These shimmering lines made the divine words shine - literally - on the page.`

  const text3 = `At first, Qur’anic script had no dots or vowels. Later scribes added red diacritical marks to help readers pronounce every verse precisely.`

  const text4 = `Floral borders wrapped each page in beauty. No pictures - only patterns, echoing gardens of paradise and the sacred rhythm of the words within.`

  // Enhanced debug logging for background music
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎵 [${timestamp}] Adventure4_Module3_Lesson1 - Background music state:`, {
      isLoaded: backgroundMusic.isLoaded,
      isPlaying: backgroundMusic.isPlaying,
      isLoading: backgroundMusic.isLoading || false,
    });

    if (!backgroundMusic.isLoaded && !(backgroundMusic.isLoading)) {
      console.log('🎵 Audio not loading - AWS CloudFront source should be available');
      console.log('🎵 AWS CloudFront Audio URL: https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv4_M3_L2.mp3');
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying]);

  // Cleanup background music when component unmounts
  useEffect(() => {
    return () => {
      console.log('🎵 Component unmounting - cleaning up all audio');

      if (backgroundMusic.stop) {
        console.log('🎵 Stopping background music on component unmount');
        backgroundMusic.stop();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={ArchivesTheme.colors.creamWhite} />

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Section 1: The Birth of Qurʾanic Script */}
          <View style={styles.section}>
            {/* Section Title */}
            <View style={styles.textContainer}>
              <Text style={styles.sectionTitle}>The Birth of Qurʾanic Script</Text>
            </View>

            {/* Image 1 - Architectural Innovation */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M3_Img01.png" }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>

            {/* Text 1 */}
            <View style={styles.textContainer}>
              <Text style={styles.lessonText}>
                {text1}
              </Text>
            </View>
          </View>

          {/* Section 2: Gold Lines of Revelation */}
          <View style={styles.section}>
            {/* Section Title */}
            <View style={styles.textContainer}>
              <Text style={styles.sectionTitle}>Gold Lines of Revelation</Text>
            </View>

            {/* Image 2 - Great Mosque */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M3_Img02.jpg" }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>

            {/* Text 2 */}
            <View style={styles.textContainer}>
              <Text style={styles.lessonText}>
                {text2}
              </Text>
            </View>
          </View>

          {/* Section 3: The Addition of Dots and Vowels */}
          <View style={styles.section}>
            {/* Section Title */}
            <View style={styles.textContainer}>
              <Text style={styles.sectionTitle}>The Addition of Dots and Vowels</Text>
            </View>

            {/* Image 3 - The Addition of Dots and Vowels */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M3_Img03.jpg" }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>

            {/* Text 3 */}
            <View style={styles.textContainer}>
              <Text style={styles.lessonText}>
                {text3}
              </Text>
            </View>
          </View>

          {/* Section 4: Gardens on the Page */}
          <View style={styles.section}>
            {/* Section Title */}
            <View style={styles.textContainer}>
              <Text style={styles.sectionTitle}>Gardens on the Page</Text>
            </View>

            {/* Image 4 - Gardens on the Page */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M3_Img04.png" }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>

            {/* Text 4 - Final text */}
            <View style={styles.textContainer}>
              <Text style={styles.finalText}>
                {text4}
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
        <TouchableOpacity style={styles.backButton} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (backgroundMusic.isPlaying) {
            console.log('🎵 Stopping background music on back button');
            backgroundMusic.stop();
          }

          (onBack || onDismiss)();
        }}>
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

  // Sections
  section: {
    marginBottom: 16, // Reduced from 30 to 16 to minimize gaps
  },

  imageContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4, // Much smaller margin for images to eliminate large gaps
  },

  image: {
    width: '100%',
    height: 320, // Increased from 250 to 320 for longer image display
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
    marginTop: 20, // Extra spacing after image
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