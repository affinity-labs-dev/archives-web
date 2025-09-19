// Adventure4_Module3_Lesson1.tsx - EXACT replica of Adventure3_Module3_Lesson2 format
// Scroll-based lesson about Advanced Islamic Architecture and Innovation

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic'

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
  const text1 = `Under the Umayyads, Islamic architecture reached new heights of sophistication. Master builders combined Byzantine engineering with Arabian aesthetic principles, creating structures that were both functional and breathtakingly beautiful.`

  const text2 = `The Great Mosque of Damascus became the architectural crown jewel of the empire. Its soaring minarets and gleaming golden mosaics set the standard for Islamic religious architecture across the known world.`

  const text3 = `Advanced water management systems, including complex aqueducts and fountain networks, transformed arid landscapes into gardens of paradise. These innovations made urban life possible in previously uninhabitable regions.`

  const text4 = `The fusion of artistic traditions from conquered territories created a distinctive Umayyad style. Persian carpets, Byzantine mosaics, and Arabian geometric patterns merged into a unified aesthetic that defined an empire.`

  // Enhanced debug logging for background music
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎵 [${timestamp}] Adventure4_Module3_Lesson1 - Background music state:`, {
      isLoaded: backgroundMusic.isLoaded,
      isPlaying: backgroundMusic.isPlaying,
      isLoading: backgroundMusic.isLoading || false,
      platform: Platform.OS
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
          {/* Section 1: Architectural Innovation */}
          <View style={styles.section}>
            {/* Section Title */}
            <View style={styles.textContainer}>
              <Text style={styles.sectionTitle}>Architectural Innovation</Text>
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

          {/* Section 2: The Great Mosque Legacy */}
          <View style={styles.section}>
            {/* Section Title */}
            <View style={styles.textContainer}>
              <Text style={styles.sectionTitle}>The Great Mosque Legacy</Text>
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

          {/* Section 3: Engineering Marvels */}
          <View style={styles.section}>
            {/* Section Title */}
            <View style={styles.textContainer}>
              <Text style={styles.sectionTitle}>Engineering Marvels</Text>
            </View>

            {/* Image 3 - Engineering systems */}
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

          {/* Section 4: Cultural Fusion */}
          <View style={styles.section}>
            {/* Section Title */}
            <View style={styles.textContainer}>
              <Text style={styles.sectionTitle}>Cultural Fusion</Text>
            </View>

            {/* Image 4 - Cultural fusion */}
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
          <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Back Button - always visible */}
      <SafeAreaView style={styles.backButtonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
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
    fontStyle: 'italic', // Emphasize the quote-like nature
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