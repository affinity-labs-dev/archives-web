// ROIQuiz.tsx - Universal Rise of Islam Quiz Component
// Accepts dynamic quiz data from adventures.content_list
// Clean, modern design matching ROI theme with bottom sheet feedback

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useProgress } from '@/context/ProgressContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ArchivesTheme from '@/constants/ArchivesTheme';
import type { ContentItem } from './types';

interface ROIQuizProps {
  contentItem: ContentItem;  // Quiz data from adventures.content_list
  adventureId: string;       // Database adventure readable_id (e.g., "roi_adventure_1")
  moduleId: string;          // Database content_list.id (media_id)
  onContinue: () => void;    // Called when quiz is completed
  onDismiss: () => void;     // Called to close quiz
  onBack?: () => void;       // Optional back button
  onMilestoneReached?: (milestoneXP: number, totalXP: number) => void; // 50 XP milestone callback
}

// MCQ Option Button - ROI Design
interface ROIMCQOptionButtonProps {
  letter: string;
  text: string;
  isSelected: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
  showResult?: boolean;
  onPress: () => void;
}

function ROIMCQOptionButton({
  letter,
  text,
  isSelected,
  isCorrect,
  isWrong,
  showResult,
  onPress,
}: ROIMCQOptionButtonProps) {
  // Determine colors based on state - match Umayyad design
  const getShadowColor = () => {
    if (showResult && isCorrect) return ArchivesTheme.colors.mossGreen;
    if (showResult && isWrong) return ArchivesTheme.colors.concreteGrey;
    if (isSelected) return ArchivesTheme.colors.shoeBrown;
    return ArchivesTheme.colors.concreteGrey;
  };

  const getBorderColor = () => {
    if (showResult && isCorrect) return ArchivesTheme.colors.mossGreen;
    if (isSelected) return ArchivesTheme.colors.shoeBrown;
    return 'rgba(128,128,128,0.3)';
  };

  const getContentBorderColor = () => {
    if (showResult && isCorrect) return ArchivesTheme.colors.mossGreen;
    if (isSelected) return ArchivesTheme.colors.shoeBrown;
    return 'rgba(128,128,128,0.2)';
  };

  return (
    <TouchableOpacity
      style={styles.mcqOptionContainer}
      onPress={onPress}
      disabled={showResult}
      activeOpacity={0.7}
    >
      {/* Shadow layer - 3D depth effect */}
      <View style={[styles.mcqOptionShadow, { backgroundColor: getShadowColor() }]} />

      {/* Border layer - 4px stroke */}
      <View style={[styles.mcqOptionBorder, { borderColor: getBorderColor() }]} />

      {/* Content layer - white background with 2px overlay */}
      <View style={[styles.mcqOptionContent, { borderColor: getContentBorderColor() }]}>
        {/* Letter badge */}
        <View style={styles.mcqOptionLetterContainer}>
          <View style={styles.mcqOptionLetterCircle}>
            <Text style={styles.mcqOptionLetter}>{letter}</Text>
          </View>
        </View>

        {/* Text */}
        <View style={styles.mcqOptionTextContainer}>
          <Text style={styles.mcqOptionText}>{text}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Explanation Popup - Umayyad Dynasty Design (Centered Card)
interface ExplanationPopupProps {
  isVisible: boolean;
  isCorrect: boolean;
  points: number;
  explanation: string;
  onContinue: () => void;
}

function ExplanationPopup({
  isVisible,
  isCorrect,
  points,
  explanation,
  onContinue,
}: ExplanationPopupProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isVisible) {
      // EXACT SwiftUI: .transition(.asymmetric(insertion: .scale(scale: 0.8).combined(with: .opacity)))
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0.8);
    }
  }, [isVisible, scaleAnim]);

  if (!isVisible) return null;

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
  );
}

// Quiz images mapping - randomly selected for each question
const QUIZ_IMAGES: { [key: string]: any } = {
  'Bilingual': require('@/assets/images/quiz-images/Bilingual.png'),
  'Camel': require('@/assets/images/quiz-images/Camel.png'),
  'Map': require('@/assets/images/quiz-images/Map.png'),
  'Reader': require('@/assets/images/quiz-images/Reader.png'),
  'books': require('@/assets/images/quiz-images/books.png'),
  'engineers': require('@/assets/images/quiz-images/engineers.png'),
  'explorer': require('@/assets/images/quiz-images/explorer.png'),
  'navigation': require('@/assets/images/quiz-images/navigation.png'),
  'scroll': require('@/assets/images/quiz-images/scroll.png'),
  'ship': require('@/assets/images/quiz-images/ship.png'),
  'token': require('@/assets/images/quiz-images/token.png'),
  'writer': require('@/assets/images/quiz-images/writer.png'),
  'mosque': require('@/assets/images/quiz-images/mosque.png'),
};

const QUIZ_IMAGE_KEYS = Object.keys(QUIZ_IMAGES);

export default function ROIQuiz({
  contentItem,
  adventureId,
  moduleId,
  onContinue,
  onDismiss,
  onBack,
  onMilestoneReached,
}: ROIQuizProps) {
  const { saveNewProgressData, calculateTotalXP, checkIfCrossed50XPBoundary } = useProgress();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [randomImageIndex, setRandomImageIndex] = useState(Math.floor(Math.random() * QUIZ_IMAGE_KEYS.length));

  // Extract quiz data from contentItem
  const questions = contentItem.questions || [];
  const quizTitle = contentItem.thumbnail_title || 'Quiz';

  if (questions.length === 0) {
    console.error('❌ No questions found in contentItem');
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;
  const totalQuestions = questions.length;

  // Convert question data to options array and find correct answer index
  const options = currentQuestion.answers.map(a => a.text);
  const correctAnswerIndex = currentQuestion.answers.findIndex(a => a.is_correct);
  const pointsPerQuestion = 10; // Standard points per question

  // Handle answer selection
  const handleAnswerSelect = (answerIndex: number) => {
    if (!showFeedback) {
      setSelectedAnswer(answerIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Handle submit
  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === correctAnswerIndex;

    if (isCorrect) {
      setScore(score + pointsPerQuestion);
      setCorrectAnswers(correctAnswers + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setShowFeedback(true);
  };

  // Handle continue to next question
  const handleContinueToNext = async () => {
    setShowFeedback(false);
    setSelectedAnswer(null);

    if (questionNumber < totalQuestions) {
      // Move to next question and randomize image
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setRandomImageIndex(Math.floor(Math.random() * QUIZ_IMAGE_KEYS.length));
    } else {
      // Quiz complete - correctAnswers already includes the last answer from handleSubmit
      const finalCorrect = correctAnswers;

      // New progress system scoring: quizScore = correctAnswers + 1
      // 0 correct = 1 star, 1 correct = 2 stars, 2 correct = 3 stars
      const quizScore = finalCorrect + 1;

      // Load Era 2 progress to calculate old XP (BEFORE saving)
      const newModulesData = await AsyncStorage.getItem('new_user_progress');
      const newModules = newModulesData ? JSON.parse(newModulesData) : [];

      const oldXP = calculateTotalXP([], newModules); // Only Era 2 XP
      console.log(`📊 Old XP (Era 2 before quiz): ${oldXP}`);

      // Always save progress (no minimum check for new system)
      const moduleData = {
        adventureId,     // Database readable_id (e.g., "roi_adventure_1")
        moduleId,        // Database content_list.id (media_id)
        quizScore,       // Score = correct answers + 1 (for stars)
        quizCorrectAnswers: finalCorrect, // Actual correct answers (for XP calculation)
        isCompleted: true,
        quizCompleted: true,
        completedAt: new Date().toISOString(),
        era_id: 2
      };

      console.log('💾 [NEW] Saving quiz completion:', moduleData);
      await saveNewProgressData(moduleData);

      // Load updated Era 2 progress to calculate new XP (AFTER saving)
      const updatedNewModulesData = await AsyncStorage.getItem('new_user_progress');
      const updatedNewModules = updatedNewModulesData ? JSON.parse(updatedNewModulesData) : [];

      const newXP = calculateTotalXP([], updatedNewModules); // Only Era 2 XP
      console.log(`📊 New XP (Era 2 after quiz): ${newXP}`);

      // Check if user crossed 50 XP boundary (50, 100, 150, etc.) - Era 2 only
      const milestone = checkIfCrossed50XPBoundary(oldXP, newXP);

      if (milestone && onMilestoneReached) {
        console.log(`🎉 50 XP Milestone reached: ${milestone}`);
        onMilestoneReached(milestone, newXP);
        return; // Don't call onContinue - let milestone modal handle it
      }

      // Haptic feedback for quiz completion
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      console.log(`✅ Quiz completed - Correct: ${finalCorrect}/${totalQuestions}, Score: ${quizScore}`);
      onContinue();
    }
  };

  const isCorrect = selectedAnswer === correctAnswerIndex;

  return (
    <SafeAreaView style={styles.roiContainer} edges={['top']}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}

      <ScrollView
        style={styles.roiScrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questionContent}>
          {/* Header */}
          <View style={styles.roiHeader}>
          {onBack && (
            <TouchableOpacity style={styles.roiBackButton} onPress={onBack}>
              <Ionicons name="chevron-back" size={24} color="#4D392E" />
            </TouchableOpacity>
          )}
          <View style={styles.roiTitleContainer}>
            <Text style={styles.roiQuizTitle}>{quizTitle}</Text>
            <Text style={styles.roiQuestionCounter}>
              Question {questionNumber} of {totalQuestions}
            </Text>
          </View>
        </View>

        {/* Question Image - Randomly selected from quiz images */}
        <View style={styles.roiImageSection}>
          <View style={styles.roiImageBackground} />
          <Image
            source={QUIZ_IMAGES[QUIZ_IMAGE_KEYS[randomImageIndex]]}
            style={styles.roiQuestionImage}
            contentFit="contain"
            transition={300}
          />
        </View>

        {/* Question */}
        <Text style={styles.roiQuestionText}>{currentQuestion.question_text}</Text>

        {/* Answer options */}
        <View style={styles.questionOptionsGroup}>
          {options.map((option, index) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, D
            return (
              <ROIMCQOptionButton
                key={index}
                letter={letter}
                text={option}
                isSelected={selectedAnswer === index}
                isCorrect={showFeedback && index === correctAnswerIndex}
                isWrong={showFeedback && selectedAnswer === index && !isCorrect}
                showResult={showFeedback}
                onPress={() => handleAnswerSelect(index)}
              />
            );
          })}
        </View>

          {/* Spacer for submit button */}
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Submit button */}
      {!showFeedback && (
        <View style={styles.submitButtonContainer}>
          {/* Shadow layer - 3D depth effect */}
          <View
            style={[
              styles.submitButtonShadow,
              { backgroundColor: selectedAnswer !== null ? ArchivesTheme.colors.mossGreenShadow : 'rgba(0,0,0,0.3)' },
            ]}
          />
          {/* Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: selectedAnswer !== null ? ArchivesTheme.colors.mossGreen : 'gray' },
            ]}
            onPress={handleSubmit}
            disabled={selectedAnswer === null}
            activeOpacity={1}
          >
            <Text style={styles.submitButtonText}>SUBMIT</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Explanation popup */}
      <ExplanationPopup
        isVisible={showFeedback}
        isCorrect={isCorrect}
        points={pointsPerQuestion}
        explanation={currentQuestion.explanation || 'Good job!'}
        onContinue={handleContinueToNext}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  roiContainer: {
    flex: 1,
    backgroundColor: '#F4EBDB',
  },
  roiScrollView: {
    flex: 1,
  },
  questionContent: {
    // Main content container - EXACT iOS measurements
    paddingHorizontal: 20, // Standard horizontal padding
    paddingTop: 5,         // Reduced padding for better spacing
    paddingBottom: 15,     // Minimal bottom padding
  },

  // Header
  roiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    marginBottom: 20,
  },
  roiBackButton: {
    position: 'absolute',
    left: 0, // Now 0 since questionContent has paddingHorizontal: 20
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(77, 57, 46, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  roiTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  roiQuizTitle: {
    fontFamily: 'DM Sans',
    fontSize: 22,
    fontWeight: '600',
    color: '#4D392E',
  },
  roiQuestionCounter: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '400',
    color: '#4D392E',
    marginTop: 2,
  },

  // Image section
  roiImageSection: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  roiImageBackground: {
    position: 'absolute',
    width: 232.5,
    height: 120.42,
    backgroundColor: 'white',
    borderRadius: 19,
    top: 40,
  },
  roiQuestionImage: {
    width: 176.09,
    height: 176.09,
    transform: [{ rotate: '-1deg' }],
  },

  // Question
  roiQuestionText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '600',
    color: '#4D392E',
    textAlign: 'center',
    paddingHorizontal: 0, // Removed - handled by questionContent container
    marginBottom: 25,
    lineHeight: 28,
  },

  // Options - Umayyad Dynasty Design
  questionOptionsGroup: {
    alignItems: 'center', // Center 320px buttons
    paddingHorizontal: 0,
  },
  mcqOptionContainer: {
    position: 'relative',
    marginBottom: 18, // EXACT iOS: VStack(spacing: 18)
  },
  mcqOptionShadow: {
    position: 'absolute',
    width: 322, // EXACT SwiftUI: .frame(width: 322, height: 50)
    height: 50,
    borderRadius: 16,
    top: 7, // EXACT SwiftUI: .offset(y: 7) - 3D depth effect
  },
  mcqOptionBorder: {
    position: 'absolute',
    width: 320, // EXACT SwiftUI: .frame(width: 320, height: 50)
    height: 50,
    borderRadius: 16,
    borderWidth: 4, // EXACT SwiftUI: lineWidth: 4
  },
  mcqOptionContent: {
    width: 320, // EXACT SwiftUI: .frame(width: 320, height: 50)
    height: 50,
    backgroundColor: 'white',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2, // EXACT SwiftUI: overlay stroke
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
    justifyContent: 'center',
  },
  mcqOptionText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 16))
    fontSize: 16,
    color: ArchivesTheme.colors.shoeBrown,
    lineHeight: 22,
    flexWrap: 'wrap',
  },

  // Submit button - Umayyad Dynasty Design
  submitButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  submitButtonShadow: {
    position: 'absolute',
    width: 320, // EXACT SwiftUI: .frame(width: 320, height: 50)
    height: 50,
    borderRadius: 16,
    top: 7, // EXACT SwiftUI: .offset(y: 7) - 3D depth effect
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

  // Explanation Popup - Umayyad Dynasty Design
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
});
