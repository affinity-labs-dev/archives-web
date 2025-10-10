// Adventure2_Module2_Lesson2.tsx - EXACT replica of SwiftUI Adventure2_Module2_Lesson2.swift
// Image and video lesson about market trust and standardized currency

import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Video, ResizeMode } from 'expo-av'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import ArchivesTheme from '@/constants/ArchivesTheme'

const { width: screenWidth } = Dimensions.get('window')

// Standard padding for consistent layout
const CONTENT_PADDING = 20

interface Adventure2_Module2_Lesson2Props {
  onContinue: () => void
  onDismiss: () => void
  onBack?: () => void
}

export default function Adventure2_Module2_Lesson2({ 
  onContinue, 
  onDismiss, 
  onBack 
}: Adventure2_Module2_Lesson2Props) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [animateOnAppear, setAnimateOnAppear] = useState(false)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const videoRef = useRef<Video>(null)

  // EXACT SwiftUI text content
  const imageText = `In the markets of Damascus, merchants weighed gold dinars to be sure they matched the official weight of 4.25 grams. The Arabic writing on each coin let buyers confirm its value without relying only on the seller. From Basra to Tunis, this shared standard made trade smoother and built trust across the empire.`

  const videoText = `Caliph Abd al-Malik's reforms made every dinar and dirham the same weight and marked with Arabic, no matter where they were minted. A coin from Damascus matched one from Damascus or Egypt, so people trusted that their money was fair. This consistency made trade easier and gave distant markets a shared system they could rely on.`


  useEffect(() => {
    // EXACT SwiftUI: withAnimation(.easeOut(duration: 0.8))
    setTimeout(() => {
      setAnimateOnAppear(true)
    }, 100)
  }, [])

  const togglePlayPause = async () => {
    if (!videoRef.current) return
    
    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync()
      } else {
        await videoRef.current.playAsync()
      }
      setIsPlaying(!isPlaying)
    } catch (error) {
      console.log('Video toggle error:', error)
    }
  }

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onContinue()
  }

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
    const paddingToBottom = 20
    
    // Check if scrolled near bottom
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      if (!hasScrolledToBottom) {
        // EXACT SwiftUI: DispatchQueue.main.asyncAfter(deadline: .now() + 0.5)
        setTimeout(() => {
          setHasScrolledToBottom(true)
        }, 500)
      }
    }
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={ArchivesTheme.colors.creamWhite} />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <SafeAreaView edges={['top']} style={styles.safeAreaTop} />
          <View style={styles.contentContainer}>
            {/* Image Section at Top */}
            <View style={styles.imageSection}>
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M2_Img03.jpg" }}
                  style={styles.merchantsImage}
                  resizeMode="cover"
                />
              </View>
              
              {/* Text under image with padding */}
              <View style={styles.textWithPadding}>
                <Text style={styles.contentText}>
                  {imageText}
                </Text>
              </View>
            </View>

            {/* Video Section */}
            <View style={styles.videoSection}>
              <View style={styles.videoContainer}>
                <Video
                  ref={videoRef}
                  style={styles.video}
                  source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv2_M2_Media2_Video1.mp4" }}
                  shouldPlay={isPlaying}
                  isLooping={true}
                  isMuted={false}
                  resizeMode={ResizeMode.COVER}
                  useNativeControls={false}
                />
              </View>
              
              {/* Text under video */}
              <Text style={styles.contentText}>
                {videoText}
              </Text>
            </View>

            {/* Invisible marker to detect when user reaches bottom */}
            <View style={styles.bottomMarker} />
          </View>
        </ScrollView>

        {/* Continue button overlay at bottom - only show after scrolling to bottom */}
        {hasScrolledToBottom && (
          <Animated.View
            style={[
              styles.continueButtonOverlay,
              {
                opacity: animateOnAppear ? 1 : 0,
                transform: [
                  {
                    translateY: animateOnAppear ? 0 : 20,
                  },
                ],
              },
            ]}
          >
            <View style={styles.continueButtonContainer}>
              <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Back button - always visible */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={onBack || onDismiss}>
            <Ionicons name="chevron-back" size={24} color={ArchivesTheme.colors.shoeBrown} />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </>
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
  safeAreaTop: {
    height: ArchivesTheme.spacing.sm, // 8px minimal top spacing
  },
  contentContainer: {
    paddingTop: 70, // Space for back button - moved down slightly
    paddingBottom: 100, // Space for continue button
  },
  imageSection: {
    marginBottom: 32,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: CONTENT_PADDING, // Same 20px padding as text
  },
  merchantsImage: {
    width: '100%',
    height: 220,
    borderRadius: 12, // Matching video component styling
    shadowColor: 'black',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  textWithPadding: {
    paddingHorizontal: CONTENT_PADDING, // 20px padding for text only
  },
  contentText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    color: ArchivesTheme.colors.shoeBrown,
    lineHeight: 26,
    textAlign: 'left',
  },
  videoSection: {
    paddingHorizontal: CONTENT_PADDING, // Same 20px padding as image section
    marginBottom: 32,
  },
  videoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  video: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: 'black',
  },
  bottomMarker: {
    height: 1, // EXACT SwiftUI: .frame(height: 1)
  },
  continueButtonOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  continueButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: CONTENT_PADDING,
    paddingBottom: 40,
    pointerEvents: 'box-none',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ArchivesTheme.colors.mossGreen,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    gap: 8,
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  continueButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
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
})