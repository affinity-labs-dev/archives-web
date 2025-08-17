// Adventure2_Module3_Lesson2.tsx - Interior view of Dome of the Rock
// Image lesson about sacred inscriptions with text content only

import React, { useState, useEffect } from 'react'
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
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import ArchivesTheme from '@/constants/ArchivesTheme'

const { width: screenWidth } = Dimensions.get('window')

// Standard padding for consistent layout
const CONTENT_PADDING = 20

interface Adventure2_Module3_Lesson2Props {
  onContinue: () => void
  onDismiss: () => void
  onBack?: () => void
}

export default function Adventure2_Module3_Lesson2({ 
  onContinue, 
  onDismiss, 
  onBack 
}: Adventure2_Module3_Lesson2Props) {
  const [animateOnAppear, setAnimateOnAppear] = useState(false)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)

  // EXACT Adventure2_Module2_Lesson2 text content
  const imageText = `At the heart of the Dome sits a large stone believed to be where the Prophet Muhammad began his night journey to the heavens. The large stone in the Dome of the Rock is sacred to Jews, Christians, and Muslims. Jews believe it's the Foundation Stone where the Temple once stood and where Abraham prepared to sacrifice Isaac. Christians revere it as part of the Temple Mount, central to Jesus' life.`


  console.log('🚀 DEBUG: Adventure2_Module3_Lesson2 rendered')

  useEffect(() => {
    // EXACT Adventure2_Module2_Lesson2: withAnimation(.easeOut(duration: 0.8))
    setTimeout(() => {
      setAnimateOnAppear(true)
    }, 100)
  }, [])


  const handleContinue = () => {
    console.log('🚀 DEBUG: Continue pressed in Adventure2_Module3_Lesson2')
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onContinue()
  }

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
    const paddingToBottom = 20
    
    // Check if scrolled near bottom
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      if (!hasScrolledToBottom) {
        // EXACT Adventure2_Module2_Lesson2: DispatchQueue.main.asyncAfter(deadline: .now() + 0.5)
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
                  source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M3_Img04.jpg" }}
                  style={styles.domeImage}
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
    backgroundColor: ArchivesTheme.colors.creamWhite, // EXACT Adventure2_Module2_Lesson2: Color("CreamWhite")
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
  domeImage: {
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
  bottomMarker: {
    height: 1, // EXACT Adventure2_Module2_Lesson2: .frame(height: 1)
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