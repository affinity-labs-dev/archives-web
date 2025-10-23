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
  // Determine background and border colors
  const getShadowColor = () => {
    if (showResult && isCorrect) return '#959C00';
    if (showResult && isWrong) return '#E2E2E2';
    if (isSelected) return '#4D392E';
    return '#E2E2E2';
  };

  const getBorderColor = () => {
    if (showResult && isCorrect) return '#959C00';
    if (isSelected) return '#4D392E';
    return '#E2E2E2';
  };

  return (
    <TouchableOpacity
      style={styles.roiOptionContainer}
      onPress={onPress}
      disabled={showResult}
      activeOpacity={0.7}
    >
      {/* Shadow layer */}
      <View style={[styles.roiOptionShadow, { backgroundColor: getShadowColor() }]} />

      {/* Main button */}
      <View style={[styles.roiOptionContent, { borderColor: getBorderColor() }]}>
        {/* Letter badge */}
        <View style={styles.roiOptionLetterCircle}>
          <Text style={styles.roiOptionLetter}>{letter}</Text>
        </View>

        {/* Text */}
        <Text style={styles.roiOptionText}>{text}</Text>
      </View>
    </TouchableOpacity>
  );
}

// Bottom Sheet Feedback - ROI Design
interface ROIFeedbackSheetProps {
  isVisible: boolean;
  isCorrect: boolean;
  points: number;
  explanation: string;
  onContinue: () => void;
}

function ROIFeedbackSheet({
  isVisible,
  isCorrect,
  points,
  explanation,
  onContinue,
}: ROIFeedbackSheetProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [isVisible, slideAnim]);

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <View style={styles.roiFeedbackOverlay} />

      {/* Bottom sheet */}
      <Animated.View
        style={[
          styles.roiFeedbackSheet,
          {
            backgroundColor: isCorrect ? '#959C00' : '#C99151',
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header with points badge (correct only) */}
        <View style={styles.roiFeedbackHeader}>
          <Text style={styles.roiFeedbackTitle}>
            {isCorrect ? 'Correct!' : 'Incorrect!'}
          </Text>
          {isCorrect && (
            <View style={styles.roiPointsBadge}>
              <Text style={styles.roiPointsText}>+{points} points</Text>
            </View>
          )}
        </View>

        {/* Explanation */}
        <Text style={styles.roiFeedbackExplanation}>{explanation}</Text>

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.roiContinueButton, { backgroundColor: '#C3C3C3' }]}
          onPress={onContinue}
          activeOpacity={0.9}
        >
          <View style={styles.roiContinueButtonInner}>
            <Text
              style={[
                styles.roiContinueButtonText,
                { color: isCorrect ? '#959C00' : '#C99151' },
              ]}
            >
              CONTINUE
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </>
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
        contentContainerStyle={styles.roiScrollContent}
      >
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
        <View style={styles.roiOptionsContainer}>
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
      </ScrollView>

      {/* Submit button */}
      {!showFeedback && (
        <View style={styles.roiSubmitContainer}>
          <TouchableOpacity
            style={[
              styles.roiSubmitShadow,
              { backgroundColor: selectedAnswer !== null ? '#6E7300' : '#C3C3C3' },
            ]}
          />
          <TouchableOpacity
            style={[
              styles.roiSubmitButton,
              { backgroundColor: selectedAnswer !== null ? '#959C00' : '#C3C3C3' },
            ]}
            onPress={handleSubmit}
            disabled={selectedAnswer === null}
            activeOpacity={0.9}
          >
            <Text style={styles.roiSubmitButtonText}>SUBMIT</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Feedback sheet */}
      <ROIFeedbackSheet
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
  roiScrollContent: {
    paddingBottom: 50,
  },

  // Header
  roiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 20,
  },
  roiBackButton: {
    position: 'absolute',
    left: 16,
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
    paddingHorizontal: 35,
    marginBottom: 25,
    lineHeight: 28,
  },

  // Options
  roiOptionsContainer: {
    paddingHorizontal: 32,
  },
  roiOptionContainer: {
    position: 'relative',
    marginBottom: 14,
    height: 49,
  },
  roiOptionShadow: {
    position: 'absolute',
    width: '100%',
    height: 49,
    borderRadius: 17,
    bottom: 0,
  },
  roiOptionContent: {
    position: 'absolute',
    width: '100%',
    height: 49,
    backgroundColor: '#F7F7F7',
    borderRadius: 17,
    borderWidth: 1.79,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 21,
    top: 0,
  },
  roiOptionLetterCircle: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: '#E6D5B7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  roiOptionLetter: {
    fontFamily: 'DM Sans',
    fontSize: 17.39,
    fontWeight: '500',
    color: 'white',
  },
  roiOptionText: {
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '500',
    color: '#4D392E',
  },

  // Submit button
  roiSubmitContainer: {
    position: 'absolute',
    bottom: 30,
    left: 32,
    right: 32,
    alignItems: 'center',
  },
  roiSubmitShadow: {
    position: 'absolute',
    width: '100%',
    height: 54,
    borderRadius: 17,
    bottom: 0,
  },
  roiSubmitButton: {
    width: '100%',
    height: 51,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roiSubmitButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },

  // Feedback sheet
  roiFeedbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
  },
  roiFeedbackSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 233,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 32,
    paddingTop: 18,
    paddingBottom: 30,
  },
  roiFeedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roiFeedbackTitle: {
    fontFamily: 'DM Sans',
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  roiPointsBadge: {
    backgroundColor: 'white',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roiPointsText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
    color: '#C99151',
  },
  roiFeedbackExplanation: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    lineHeight: 18.21,
    marginBottom: 20,
  },
  roiContinueButton: {
    width: '100%',
    height: 54,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roiContinueButtonInner: {
    width: '100%',
    height: 51,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roiContinueButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '700',
  },
});
