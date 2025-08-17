// Adventure3_Module2_Lesson2.tsx - Rise of Al-Andalus
// EXACT replica of Adventure3_Module1_Lesson1 structure
// Alternating images and text about Gibraltar and military strategy

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
import ArchivesTheme from '@/constants/ArchivesTheme'

interface Adventure3_Module2_Lesson2Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

export default function Adventure3_Module2_Lesson2({
  onContinue,
  onDismiss,
  onBack,
}: Adventure3_Module2_Lesson2Props) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)

  // EXACT Adventure3_Module1_Lesson1 text content structure
  const text1 = `Gibraltar's name derives from 'Jabal Ṭarīq' - the Mountain of Ṭarīq. This imposing cliff became both a strategic military position and a symbolic gateway between Africa and Europe.`
  
  const text2 = `The Umayyad conquest succeeded through strategic alliances with local populations. Ṭarīq's forces formed partnerships with various Iberian groups who were dissatisfied with Visigothic rule.`

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={ArchivesTheme.colors.creamWhite} />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Image 1 Section */}
          <View style={styles.imageSection}>
            {/* Image 1 - Gibraltar */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv3_M2_Img04.jpg" }}
                style={styles.lessonImage}
                resizeMode="cover"
              />
            </View>
            
            {/* Text 1 under Image 1 */}
            <View style={styles.textContainer}>
              <Text style={styles.lessonText}>
                {text1}
              </Text>
            </View>
          </View>

          {/* Image 2 Section */}
          <View style={styles.imageSection}>
            {/* Image 2 - Military Strategy */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv3_M2_Img05.jpg" }}
                style={styles.lessonImage}
                resizeMode="cover"
              />
            </View>
            
            {/* Text 2 under Image 2 */}
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
    backgroundColor: ArchivesTheme.colors.creamWhite, // EXACT Adventure3_Module1_Lesson1: Color("CreamWhite")
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingTop: 130, // Padding for back button
    paddingBottom: 130, // Padding for continue button
  },

  // Image sections
  imageSection: {
    marginBottom: 30, // EXACT Adventure3_Module1_Lesson1: VStack(spacing: 30)
  },

  imageContainer: {
    alignItems: 'center',
    paddingHorizontal: 20, // EXACT Adventure3_Module1_Lesson1: .padding(.horizontal, 20)
    marginBottom: 16, // EXACT Adventure3_Module1_Lesson1: spacing: 16
  },

  lessonImage: {
    width: '100%',
    height: 250, // EXACT Adventure3_Module1_Lesson1: .frame(height: 250)
    borderRadius: 12, // EXACT Adventure3_Module1_Lesson1: .cornerRadius(12)
  },

  // Text containers
  textContainer: {
    paddingHorizontal: 20, // EXACT Adventure3_Module1_Lesson1: .padding(.horizontal, 20)
  },

  lessonText: {
    fontFamily: 'DM Sans', // EXACT Adventure3_Module1_Lesson1: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    color: ArchivesTheme.colors.shoeBrown, // EXACT Adventure3_Module1_Lesson1: Color("ShoeBrown")
    lineHeight: 24, // EXACT Adventure3_Module1_Lesson1: .lineSpacing(6)
    textAlign: 'left', // EXACT Adventure3_Module1_Lesson1: .multilineTextAlignment(.leading)
  },

  // Bottom marker
  bottomMarker: {
    height: 1,
    marginBottom: 40, // EXACT Adventure3_Module1_Lesson1: .padding(.bottom, 40)
  },

  // Continue button overlay
  continueButtonContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 24, // EXACT Adventure3_Module1_Lesson1: .padding(.horizontal, 24)
    paddingBottom: 50, // EXACT Adventure3_Module1_Lesson1: .padding(.bottom, 50)
  },

  continueButton: {
    flexDirection: 'row', // EXACT Adventure3_Module1_Lesson1: HStack(spacing: 8)
    alignItems: 'center',
    paddingHorizontal: 20, // EXACT Adventure3_Module1_Lesson1: .padding(.horizontal, 20)
    paddingVertical: 16, // EXACT Adventure3_Module1_Lesson1: .padding(.vertical, 16)
    backgroundColor: ArchivesTheme.colors.mossGreen, // EXACT Adventure3_Module1_Lesson1: Color("MossGreen")
    borderRadius: 20, // EXACT Adventure3_Module1_Lesson1: .cornerRadius(20)
    // EXACT Adventure3_Module1_Lesson1 shadow
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  continueButtonText: {
    fontFamily: 'DM Sans', // EXACT Adventure3_Module1_Lesson1: .font(.custom("DM Sans", size: 16))
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