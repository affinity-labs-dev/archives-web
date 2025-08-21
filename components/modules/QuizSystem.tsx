// QuizSystem.tsx - EXACT replica of SwiftUI quiz components
// Comprehensive quiz system with MCQ, True/False, Fill-in-blank question types

import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import ArchivesTheme from '@/constants/ArchivesTheme'

const { width, height } = Dimensions.get('window')

// EXACT iOS SwiftUI Layout Specifications
// Based on Adventure1_Module1_Quiz.swift source measurements
const iOSLayout = {
  // Header section spacing
  quizTitleTopPadding: 20,           // .padding(.top, 20)
  questionCounterTopPadding: 2,      // .padding(.top, 2)
  
  // Image and question section
  imageQuestionSectionTopPadding: 35,  // .padding(.top, 35)
  imageQuestionSpacing: 10,            // VStack(spacing: 10) - Very tight spacing
  questionTextHorizontalPadding: 20,   // .padding(.horizontal, 20)
  
  // Image exact measurements
  imageBackgroundWidth: 220,           // .frame(width: 220, height: 110)
  imageBackgroundHeight: 110,
  imageBackgroundOffsetY: 40,          // .offset(y: 40)
  imageWidth: 180,                     // .frame(width: 180, height: 180)  
  imageHeight: 180,
  imageOffsetY: -20,                   // .offset(y: -20)
  
  // Answer options spacing
  mcqOptionSpacing: 18,                // VStack(spacing: 18)
  mcqHorizontalPadding: 20,            // .padding(.horizontal, 20)
  mcqTopPadding: 15,                   // .padding(.top, 15)
  mcqBottomPadding: 80,                // .padding(.bottom, 80)
  
  trueFalseSpacing: 30,                // HStack(spacing: 30)
  trueFalseHorizontalPadding: 20,      // .padding(.horizontal, 20)
  trueFalseTopPadding: 40,             // .padding(.top, 40)
  
  fillBlankHorizontalPadding: 40,      // .padding(.horizontal, 40)
  fillBlankTopPadding: 30,             // .padding(.top, 30)
  
  // Submit button padding
  submitButtonMCQBottomPadding: 30,        // .padding(.bottom, 30)
  submitButtonTrueFalseBottomPadding: 50,  // .padding(.bottom, 50)
  submitButtonFillBlankBottomPadding: 50,  // .padding(.bottom, 50)
}

// Quiz Data Types - EXACT SwiftUI structure
export interface QuizQuestion {
  question: string
  correctAnswer: number
  explanation: string
  points: number
  type: 'mcq' | 'trueFalse' | 'fillInBlank'
  options?: string[] // For MCQ and Fill-in-blank
  image?: any // Image asset for question
}

// MCQ Option Button - EXACT SwiftUI Adventure1Module1MCQOptionButton
interface MCQOptionButtonProps {
  letter: string
  text: string
  isSelected: boolean
  onPress: () => void
  forceCenter?: boolean // Optional prop to force center alignment
}

// Utility function to determine text alignment based on word count
function getTextAlignment(text: string): 'center' | 'left' {
  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length
  return wordCount <= 2 ? 'center' : 'left'
}

export function MCQOptionButton({ letter, text, isSelected, onPress, forceCenter = false }: MCQOptionButtonProps) {
  const textAlignment = forceCenter ? 'center' : 'left'
  
  return (
    <TouchableOpacity style={styles.mcqOptionContainer} onPress={onPress}>
      {/* Shadow background - EXACT SwiftUI shadow styling */}
      <View 
        style={[
          styles.mcqOptionShadow, 
          { backgroundColor: isSelected ? ArchivesTheme.colors.shoeBrown : ArchivesTheme.colors.concreteGrey }
        ]} 
      />
      
      {/* Border - EXACT SwiftUI stroke */}
      <View 
        style={[
          styles.mcqOptionBorder,
          { borderColor: isSelected ? ArchivesTheme.colors.shoeBrown : 'rgba(128,128,128,0.3)' }
        ]} 
      />
      
      {/* Content - EXACT SwiftUI ZStack structure */}
      <View style={[
        styles.mcqOptionContent,
        { borderColor: isSelected ? ArchivesTheme.colors.shoeBrown : 'rgba(128,128,128,0.2)' }
      ]}>
        {/* Letter circle - Left side */}
        <View style={styles.mcqOptionLetterContainer}>
          <View style={styles.mcqOptionLetterCircle}>
            <Text style={styles.mcqOptionLetter}>{letter}</Text>
          </View>
        </View>
        
        {/* Text content - Conditional alignment */}
        {textAlignment === 'center' ? (
          // True center: absolute positioning across full button width
          <View style={styles.mcqOptionTextCentered}>
            <Text style={styles.mcqOptionTextTrueCentered}>{text}</Text>
          </View>
        ) : (
          // Left alignment: flex layout with proper left positioning
          <View style={styles.mcqOptionTextContainer}>
            <Text style={[styles.mcqOptionText, { textAlign: 'left' }]}>{text}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// True/False Option Button - EXACT SwiftUI Adventure1Module1TrueFalseOptionButton
interface TrueFalseOptionButtonProps {
  isTrue: boolean
  isSelected: boolean
  onPress: () => void
}

export function TrueFalseOptionButton({ isTrue, isSelected, onPress }: TrueFalseOptionButtonProps) {
  return (
    <TouchableOpacity style={styles.trueFalseContainer} onPress={onPress}>
      {/* Shadow background - EXACT SwiftUI shadow styling */}
      <View 
        style={[
          styles.trueFalseShadow, 
          { backgroundColor: isSelected ? ArchivesTheme.colors.shoeBrown : ArchivesTheme.colors.concreteGrey }
        ]} 
      />
      
      {/* Border - EXACT SwiftUI stroke */}
      <View 
        style={[
          styles.trueFalseBorder,
          { borderColor: isSelected ? ArchivesTheme.colors.shoeBrown : 'rgba(128,128,128,0.3)' }
        ]} 
      />
      
      {/* Content - EXACT SwiftUI VStack structure */}
      <View style={[
        styles.trueFalseContent,
        { borderColor: isSelected ? ArchivesTheme.colors.shoeBrown : 'rgba(128,128,128,0.2)' }
      ]}>
        {/* Icon circle */}
        <View style={styles.trueFalseIconCircle}>
          <Ionicons 
            name={isTrue ? "checkmark" : "close"} 
            size={24} 
            color="white"
          />
        </View>
        
        {/* Text */}
        <Text style={styles.trueFalseText}>{isTrue ? "True" : "False"}</Text>
      </View>
    </TouchableOpacity>
  )
}

// Fill-in-Blank Option Button - EXACT SwiftUI drag-drop functionality
interface FillBlankOptionProps {
  text: string
  isUsed: boolean
  onPress: () => void
}

export function FillBlankOption({ text, isUsed, onPress }: FillBlankOptionProps) {
  if (isUsed) {
    // EXACT SwiftUI: Dashed stroke placeholder when used
    return (
      <View style={styles.fillBlankPlaceholder}>
        {/* Dashed border - EXACT SwiftUI: .stroke(Color.gray.opacity(0.5), style: StrokeStyle(lineWidth: 2, dash: [5, 5])) */}
      </View>
    )
  }

  return (
    <TouchableOpacity style={styles.fillBlankContainer} onPress={onPress}>
      {/* Shadow background - EXACT SwiftUI shadow styling */}
      <View style={styles.fillBlankShadow} />
      
      {/* Border - EXACT SwiftUI stroke */}
      <View style={styles.fillBlankBorder} />
      
      {/* Content - EXACT SwiftUI structure */}
      <View style={styles.fillBlankContent}>
        <Text style={styles.fillBlankText}>{text}</Text>
      </View>
    </TouchableOpacity>
  )
}

// Quiz Question Container - Generic container for all question types
interface QuizQuestionProps {
  questionNumber: number
  totalQuestions: number
  question: string
  image?: any
  children: React.ReactNode
  onSubmit: () => void
  isAnswerSelected: boolean
  questionType?: 'mcq' | 'trueFalse' | 'fillInBlank' // Add question type for different spacing
  onBack?: () => void // Optional back button handler
}

export function QuizQuestion({
  questionNumber,
  totalQuestions,
  question,
  image,
  children,
  onSubmit,
  isAnswerSelected,
  questionType = 'mcq',
  onBack,
}: QuizQuestionProps) {
  
  // Get appropriate spacing based on question type
  const getAnswerSectionStyle = () => {
    const baseStyle = styles.answerSection
    
    switch (questionType) {
      case 'trueFalse':
        return [baseStyle, styles.answerSectionTrueFalse]
      case 'fillInBlank':
        return [baseStyle, styles.answerSectionFillBlank]
      default:
        return baseStyle
    }
  }
  
  const getSubmitButtonPadding = () => {
    switch (questionType) {
      case 'trueFalse':
        return iOSLayout.submitButtonTrueFalseBottomPadding
      case 'fillInBlank':
        return iOSLayout.submitButtonFillBlankBottomPadding
      default:
        return iOSLayout.submitButtonMCQBottomPadding
    }
  }
  return (
    <View style={styles.questionContainer}>
      <ScrollView 
        style={styles.questionScroll} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questionContent}>
          {/* Header - EXACT SwiftUI structure with back button */}
          <View style={styles.questionHeader}>
            {onBack && (
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Ionicons name="chevron-back" size={24} color={ArchivesTheme.colors.shoeBrown} />
              </TouchableOpacity>
            )}
            <View style={styles.questionTitleContainer}>
              <Text style={styles.quizTitle}>Module 1 Quiz</Text>
              <Text style={styles.questionCounter}>Question {questionNumber} of {totalQuestions}</Text>
            </View>
          </View>

          {/* Image and Question - EXACT SwiftUI structure */}
          <View style={styles.questionImageSection}>
            {/* Image with background - EXACT SwiftUI ZStack */}
            <View style={styles.imageContainer}>
              <View style={styles.imageBackground} />
              {image && (
                <Image 
                  source={image} 
                  style={styles.questionImage}
                  resizeMode="contain"
                />
              )}
            </View>

            {/* Question text */}
            <Text style={styles.questionText}>{question}</Text>
          </View>

          {/* Grouped Question-Options Container */}
          <View style={styles.questionOptionsGroup}>
            {/* Answer options */}
            <View style={getAnswerSectionStyle()}>
              {children}
            </View>
          </View>

          {/* Padding for submit button space */}
          <View style={styles.submitButtonSpace} />
        </View>
      </ScrollView>

      {/* Submit button - Fixed at bottom */}
      <View style={[styles.submitButtonContainer, { paddingBottom: getSubmitButtonPadding() }]}>
        {/* Shadow - EXACT SwiftUI shadow styling */}
        <View 
          style={[
            styles.submitButtonShadow,
            { backgroundColor: isAnswerSelected ? ArchivesTheme.colors.mossGreenShadow : 'rgba(0,0,0,0.3)' }
          ]} 
        />
        
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: isAnswerSelected ? ArchivesTheme.colors.mossGreen : 'gray' }
          ]}
          onPress={onSubmit}
          disabled={!isAnswerSelected}
          activeOpacity={1}
        >
          <Text style={styles.submitButtonText}>SUBMIT</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// Explanation Popup - EXACT SwiftUI Adventure1Module1ExplanationView
interface ExplanationPopupProps {
  isVisible: boolean
  isCorrect: boolean
  points: number
  explanation: string
  onContinue: () => void
}

export function ExplanationPopup({ 
  isVisible, 
  isCorrect, 
  points, 
  explanation, 
  onContinue 
}: ExplanationPopupProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    if (isVisible) {
      // EXACT SwiftUI: .transition(.asymmetric(insertion: .scale(scale: 0.8).combined(with: .opacity)))
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start()
    }
  }, [isVisible, scaleAnim])

  if (!isVisible) return null

  return (
    <View style={styles.explanationOverlay}>
      <Animated.View 
        style={[
          styles.explanationCard,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        {/* Success/Failure indicator - EXACT SwiftUI structure */}
        <View style={styles.explanationHeader}>
          <View style={[
            styles.explanationIcon,
            { backgroundColor: isCorrect ? ArchivesTheme.colors.mossGreen : ArchivesTheme.colors.shoeBrown }
          ]}>
            <Ionicons 
              name={isCorrect ? "checkmark" : "close"} 
              size={18} 
              color="white"
            />
          </View>
          
          <View style={styles.explanationHeaderText}>
            <Text style={styles.explanationResult}>
              {isCorrect ? "Correct!" : "Incorrect"}
            </Text>
            {isCorrect && (
              <Text style={styles.explanationPoints}>+{points} points</Text>
            )}
          </View>
        </View>

        {/* Divider - EXACT SwiftUI */}
        <View style={styles.explanationDivider} />

        {/* Explanation section - EXACT SwiftUI structure */}
        <View style={styles.explanationSection}>
          <View style={styles.explanationTitleRow}>
            <Ionicons name="bulb" size={12} color={ArchivesTheme.colors.shoeBrown} />
            <Text style={styles.explanationTitle}>Explanation</Text>
          </View>
          
          <View style={styles.explanationTextContainer}>
            <Text style={styles.explanationText}>{explanation}</Text>
          </View>
        </View>

        {/* Continue button - EXACT SwiftUI conditional styling */}
        <TouchableOpacity
          style={[
            styles.explanationContinueButton,
            { backgroundColor: isCorrect ? ArchivesTheme.colors.mossGreen : ArchivesTheme.colors.shoeBrown }
          ]}
          onPress={onContinue}
        >
          <Text style={styles.explanationContinueText}>
            {isCorrect ? "CONTINUE" : "NEXT QUESTION"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  // Quiz Question Container - EXACT SwiftUI structure
  questionContainer: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite, // EXACT SwiftUI: Color("CreamWhite")
  },
  questionScroll: {
    flex: 1,
  },
  questionContent: {
    // Main content container - EXACT iOS measurements
    paddingHorizontal: 20, // Standard horizontal padding
    paddingTop: 5, // Reduced padding for better spacing after SafeAreaView fix
    paddingBottom: 15, // Minimal bottom padding
  },

  // Question Header - EXACT SwiftUI structure with back button support
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0, // No margin - spacing handled by individual elements
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139,96,64,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  questionTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  quizTitle: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 20))
    fontSize: 20,
    fontWeight: '600', // .fontWeight(.semibold)
    color: ArchivesTheme.colors.mutedNavy, // EXACT SwiftUI: Color("MutedNavy")
  },
  questionCounter: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    marginTop: iOSLayout.questionCounterTopPadding, // EXACT iOS: .padding(.top, 2)
  },

  // Question Image Section - EXACT SwiftUI structure
  questionImageSection: {
    alignItems: 'center',
    marginTop: iOSLayout.imageQuestionSectionTopPadding, // EXACT iOS: .padding(.top, 35)
    marginBottom: 0, // No bottom margin - spacing handled within VStack
  },
  imageContainer: {
    position: 'relative',
    marginBottom: iOSLayout.imageQuestionSpacing, // EXACT iOS: VStack(spacing: 30)
  },
  imageBackground: {
    position: 'absolute',
    width: iOSLayout.imageBackgroundWidth, // EXACT iOS: .frame(width: 220, height: 110)
    height: iOSLayout.imageBackgroundHeight,
    backgroundColor: 'white',
    borderRadius: 15, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 15)
    top: iOSLayout.imageBackgroundOffsetY, // EXACT iOS: .offset(y: 40)
    alignSelf: 'center',
    // EXACT SwiftUI shadow: .shadow(radius: 2)
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  questionImage: {
    width: iOSLayout.imageWidth, // EXACT iOS: .frame(width: 180, height: 180)
    height: iOSLayout.imageHeight,
    top: iOSLayout.imageOffsetY, // EXACT iOS: .offset(y: -20)
  },
  questionText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 20))
    fontSize: 20, // EXACT iOS font size
    fontWeight: '600', // .fontWeight(.semibold)
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    textAlign: 'center', // EXACT SwiftUI: .multilineTextAlignment(.center)
    marginBottom: 0, // No margin - spacing handled by answer section
    lineHeight: 28, // Standard line height for readability
    paddingHorizontal: iOSLayout.questionTextHorizontalPadding, // EXACT iOS: .padding(.horizontal, 20)
  },

  // Grouped Question-Options Container - Centers the entire options section
  questionOptionsGroup: {
    alignItems: 'center', // Center the answer options on screen
    paddingHorizontal: 0, // Remove horizontal padding - centering handles positioning
  },

  // Answer Section - EXACT SwiftUI structure  
  answerSection: {
    paddingHorizontal: 0, // Remove horizontal padding - handled by group container
    paddingTop: iOSLayout.mcqTopPadding, // EXACT iOS: .padding(.top, 15) 
    paddingBottom: iOSLayout.mcqBottomPadding, // EXACT iOS: .padding(.bottom, 80)
  },
  
  // True/False Answer Section - EXACT iOS spacing
  answerSectionTrueFalse: {
    paddingHorizontal: 0, // Remove horizontal padding - handled by group container
    paddingTop: iOSLayout.trueFalseTopPadding, // EXACT iOS: .padding(.top, 40)
    paddingBottom: 0, // No bottom padding - handled by submit button
  },
  
  // Fill-in-blank Answer Section - EXACT iOS spacing
  answerSectionFillBlank: {
    paddingHorizontal: 0, // Remove horizontal padding - handled by group container
    paddingTop: iOSLayout.fillBlankTopPadding, // EXACT iOS: .padding(.top, 30)
    paddingBottom: 0, // No bottom padding - handled by submit button
  },

  // Submit Button Space - No longer needed, spacing handled by answerSection padding
  submitButtonSpace: {
    height: 0, // No additional space needed
  },

  // Submit Button - EXACT SwiftUI structure
  submitButtonContainer: {
    alignItems: 'center',
    paddingBottom: 0, // Dynamic padding set by getSubmitButtonPadding()
    backgroundColor: ArchivesTheme.colors.creamWhite, // Ensure button has background
  },
  submitButtonShadow: {
    position: 'absolute',
    width: 320, // EXACT SwiftUI: .frame(width: 320, height: 50)
    height: 50,
    borderRadius: 16,
    top: 7, // EXACT SwiftUI: .offset(y: 7)
  },
  submitButton: {
    width: 320, // EXACT SwiftUI: .frame(width: 320, height: 50)
    height: 50,
    borderRadius: 16, // EXACT SwiftUI: .cornerRadius(16)
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 22))
    fontSize: 22,
    color: 'white',
    fontWeight: 'bold',
  },

  // MCQ Option Button - EXACT SwiftUI Adventure1Module1MCQOptionButton
  mcqOptionContainer: {
    position: 'relative',
    marginBottom: iOSLayout.mcqOptionSpacing, // EXACT iOS: VStack(spacing: 18)
  },
  mcqOptionShadow: {
    position: 'absolute',
    width: 322, // EXACT SwiftUI: .frame(width: 322, height: 50) - Original height restored
    height: 50,
    borderRadius: 16,
    top: 7, // EXACT SwiftUI: .offset(y: 7)
  },
  mcqOptionBorder: {
    position: 'absolute',
    width: 320, // EXACT SwiftUI: .frame(width: 320, height: 50) - Original height restored
    height: 50,
    borderRadius: 16,
    borderWidth: 4, // EXACT SwiftUI: lineWidth: 4
  },
  mcqOptionContent: {
    width: 320, // EXACT SwiftUI: .frame(width: 320, height: 50) - Original height restored
    height: 50,
    backgroundColor: 'white',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2, // EXACT SwiftUI: overlay stroke
    // borderColor set dynamically based on selection state
  },
  mcqOptionLetterContainer: {
    paddingLeft: 20,
  },
  mcqOptionLetterCircle: {
    width: 30, // EXACT SwiftUI: .frame(width: 30, height: 30)
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(139,96,64,0.4)', // EXACT SwiftUI: Color("ShoeBrown").opacity(0.4)
    alignItems: 'center',
    justifyContent: 'center',
  },
  mcqOptionLetter: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 16))
    fontSize: 16,
    color: 'white',
  },
  mcqOptionTextContainer: {
    flex: 1,
    paddingLeft: 20, // Space after circle
    paddingRight: 20,
    paddingVertical: 8, // Vertical padding for better text spacing
    justifyContent: 'center', // Center content vertically for better alignment
  },
  mcqOptionText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 16))
    fontSize: 16,
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    lineHeight: 22, // Better line height for multiline text
    flexWrap: 'wrap', // Allow text wrapping
    // textAlign now set dynamically based on word count - removed fixed 'left' alignment
  },

  // True center alignment container - absolute positioning for perfect centering
  mcqOptionTextCentered: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20, // Maintain padding for text boundaries
  },

  // True center text style - centered across full button width
  mcqOptionTextTrueCentered: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: ArchivesTheme.colors.shoeBrown,
    lineHeight: 22,
    textAlign: 'center',
    width: '100%', // Use full available width for perfect centering
  },

  // True/False Option Button - EXACT SwiftUI Adventure1Module1TrueFalseOptionButton
  trueFalseContainer: {
    position: 'relative',
  },
  trueFalseShadow: {
    position: 'absolute',
    width: 132, // EXACT SwiftUI: .frame(width: 132, height: 120)
    height: 120,
    borderRadius: 20,
    top: 7, // EXACT SwiftUI: .offset(y: 7)
  },
  trueFalseBorder: {
    position: 'absolute',
    width: 130, // EXACT SwiftUI: .frame(width: 130, height: 120)
    height: 120,
    borderRadius: 20,
    borderWidth: 4, // EXACT SwiftUI: lineWidth: 4
  },
  trueFalseContent: {
    width: 130, // EXACT SwiftUI: .frame(width: 130, height: 120)
    height: 120,
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2, // EXACT SwiftUI: overlay stroke
    // borderColor set dynamically based on selection state
  },
  trueFalseIconCircle: {
    width: 50, // EXACT SwiftUI: .frame(width: 50, height: 50)
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(139,96,64,0.4)', // EXACT SwiftUI: Color("ShoeBrown").opacity(0.4)
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12, // EXACT SwiftUI: VStack spacing: 12
  },
  trueFalseText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 16))
    fontSize: 16,
    fontWeight: '500', // .fontWeight(.medium)
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
  },

  // Fill-in-Blank Option - EXACT SwiftUI structure
  fillBlankContainer: {
    position: 'relative',
  },
  fillBlankShadow: {
    position: 'absolute',
    width: 150, // EXACT SwiftUI: .frame(width: 150, height: 50)
    height: 50,
    backgroundColor: ArchivesTheme.colors.concreteGrey, // EXACT SwiftUI: Color("ConcreteGrey")
    borderRadius: 16,
    top: 7, // EXACT SwiftUI: .offset(y: 7)
  },
  fillBlankBorder: {
    position: 'absolute',
    width: 150, // EXACT SwiftUI: .frame(width: 150, height: 50)
    height: 50,
    borderRadius: 16,
    borderWidth: 4, // EXACT SwiftUI: lineWidth: 4
    borderColor: 'rgba(128,128,128,0.3)', // EXACT SwiftUI: Color.gray.opacity(0.3)
  },
  fillBlankContent: {
    width: 150, // EXACT SwiftUI: .frame(width: 150, height: 50)
    height: 50,
    backgroundColor: 'white',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2, // EXACT SwiftUI: overlay stroke
    borderColor: 'rgba(128,128,128,0.2)',
  },
  fillBlankText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 16))
    fontSize: 16,
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
  },
  fillBlankPlaceholder: {
    width: 150, // EXACT SwiftUI: .frame(width: 150, height: 50)
    height: 50,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.5)', // EXACT SwiftUI: Color.gray.opacity(0.5)
    borderStyle: 'dashed', // EXACT SwiftUI: StrokeStyle(lineWidth: 2, dash: [5, 5])
  },

  // Explanation Popup - EXACT SwiftUI Adventure1Module1ExplanationView
  explanationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', // EXACT SwiftUI: Color.black.opacity(0.4)
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  explanationCard: {
    backgroundColor: 'white',
    borderRadius: 14, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 14)
    padding: 16, // EXACT SwiftUI: .padding(16)
    maxWidth: 380, // EXACT SwiftUI: .frame(maxWidth: 380)
    // EXACT SwiftUI shadow: .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  // Explanation Header - EXACT SwiftUI structure
  explanationHeader: {
    flexDirection: 'row', // HStack
    alignItems: 'center',
    marginBottom: 16,
  },
  explanationIcon: {
    width: 45, // EXACT SwiftUI: .frame(width: 45, height: 45)
    height: 45,
    borderRadius: 22.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12, // HStack spacing: 12
  },
  explanationHeaderText: {
    flex: 1,
    flexDirection: 'row', // HStack
    alignItems: 'center',
  },
  explanationResult: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy, // EXACT SwiftUI: Color("MutedNavy")
    marginRight: 8, // HStack spacing: 8
  },
  explanationPoints: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 12))
    fontSize: 12,
    fontWeight: '600', // .fontWeight(.semibold)
    color: ArchivesTheme.colors.mossGreen, // EXACT SwiftUI: Color("MossGreen")
  },

  // Explanation Divider - EXACT SwiftUI
  explanationDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.2)', // EXACT SwiftUI: Color.gray.opacity(0.2)
    marginHorizontal: 4, // EXACT SwiftUI: .padding(.horizontal, 4)
    marginBottom: 16,
  },

  // Explanation Section - EXACT SwiftUI structure
  explanationSection: {
    marginBottom: 16,
  },
  explanationTitleRow: {
    flexDirection: 'row', // HStack
    alignItems: 'center',
    marginBottom: 8,
  },
  explanationTitle: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    fontWeight: '600', // .fontWeight(.semibold)
    color: ArchivesTheme.colors.mutedNavy, // EXACT SwiftUI: Color("MutedNavy")
    marginLeft: 4, // HStack spacing: 4
  },
  explanationTextContainer: {
    paddingHorizontal: 16, // EXACT SwiftUI: .padding(.horizontal, 16)
    paddingVertical: 12, // EXACT SwiftUI: .padding(.vertical, 12)
    backgroundColor: 'rgba(243,242,237,0.6)', // EXACT SwiftUI: Color("CreamWhite").opacity(0.6)
    borderRadius: 8, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 8)
  },
  explanationText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    lineHeight: 16, // EXACT SwiftUI: .lineSpacing(2)
    textAlign: 'left', // EXACT SwiftUI: .multilineTextAlignment(.leading)
  },

  // Continue Button - EXACT SwiftUI conditional styling
  explanationContinueButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, // EXACT SwiftUI: minHeight: 44 adjusted for padding
    borderRadius: 10, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 10)
  },
  explanationContinueText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 16))
    fontSize: 16,
    fontWeight: '600', // .fontWeight(.semibold)
    color: 'white',
  },
})