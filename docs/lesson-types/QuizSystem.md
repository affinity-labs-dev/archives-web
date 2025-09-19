# Quiz System Implementation Guide

## 📖 Overview
The Quiz System provides a comprehensive, unified quiz engine supporting multiple question formats including Multiple Choice Questions (MCQ), True/False, and Fill-in-the-blank questions with explanations, results tracking, and progress integration.

## 🎯 Best Implementation Reference
**File**: `Adventure1_Module1_Quiz.tsx` (quiz implementation) + `QuizSystem.tsx` (reusable components)

## ✨ Key Features
- ✅ Unified quiz system handling all question types in one component
- ✅ Multiple question formats: MCQ, True/False, Fill-in-blank
- ✅ Comprehensive answer explanations for educational value
- ✅ Results tracking with percentage scoring
- ✅ 40% minimum passing score requirement
- ✅ Progress context integration for completion tracking
- ✅ Exact SwiftUI design replication with pixel-perfect measurements
- ✅ Haptic feedback for enhanced user interactions
- ✅ Cross-platform gesture handling and animations

## 🛠️ Technical Implementation

### Core Dependencies
```typescript
import React, { useState, useRef, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { useProgress } from '@/context/ProgressContext';
import {
  QuizQuestion,
  MCQOptionButton,
  TrueFalseOptionButton,
  FillBlankOption,
  ExplanationPopup,
} from '../QuizSystem';
```

### Component Interface
```typescript
interface QuizProps {
  onDismiss: () => void;
  onBack?: () => void;
}
```

## 📝 Quiz Data Structure

### Question Interface
```typescript
export interface QuizQuestion {
  question: string;
  correctAnswer: number;
  explanation: string;
  points: number;
  type: 'mcq' | 'trueFalse' | 'fillInBlank';
  options?: string[]; // For MCQ and Fill-in-blank
  image?: any; // Image asset for question
}
```

### Quiz Questions Array
```typescript
const quizQuestions: QuizQuestion[] = [
  {
    question: "Which city did Muʿawiya designate as the new capital?",
    correctAnswer: 2, // Index of correct answer in options array
    explanation: "Muʿawiya designated Damascus as the new capital in 661 CE...",
    points: 10,
    type: 'mcq' as const,
    options: ["Medina", "Baghdad", "Damascus", "Cairo"],
    image: require('@/assets/images/quiz-images/Reader.png')
  },
  {
    question: "The Barada River was essential for Damascus's prosperity.",
    correctAnswer: 1, // 0 = False, 1 = True
    explanation: "The Barada River provided water for agriculture...",
    points: 10,
    type: 'trueFalse' as const,
    image: require('@/assets/images/quiz-images/Map.png')
  },
  {
    question: "Complete: Damascus stood at the ______ of ancient trade routes.",
    correctAnswer: 0, // Index of correct answer in options
    explanation: "Damascus was strategically located at crossroads...",
    points: 10,
    type: 'fillInBlank' as const,
    options: ["crossroads", "beginning", "end", "center"],
    image: require('@/assets/images/quiz-images/books.png')
  }
];
```

## 🎯 Essential State Management

```typescript
// Core quiz state - EXACT SwiftUI state variables
const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
const [showResults, setShowResults] = useState(false);
const [showExplanation, setShowExplanation] = useState(false);
const [correctAnswers, setCorrectAnswers] = useState(0);
const [totalPoints, setTotalPoints] = useState(0);
const [userAnswers, setUserAnswers] = useState<(number | null)[]>(
  new Array(quizQuestions.length).fill(null)
);
const [showMinimumScoreAlert, setShowMinimumScoreAlert] = useState(false);

// Question-specific states
const [selectedMCQOption, setSelectedMCQOption] = useState<number | null>(null);
const [selectedTrueFalse, setSelectedTrueFalse] = useState<number | null>(null);
const [selectedFillBlank, setSelectedFillBlank] = useState<string | null>(null);

// Progress context integration
const { completeQuiz } = useProgress();
```

## 🔘 Quiz Component System

### MCQ Option Button
```typescript
export function MCQOptionButton({
  letter,
  text,
  isSelected,
  onPress,
  forceCenter = false
}: MCQOptionButtonProps) {
  const textAlignment = forceCenter ? 'center' : getTextAlignment(text);

  return (
    <TouchableOpacity style={styles.mcqOptionContainer} onPress={onPress}>
      {/* Shadow background - EXACT SwiftUI shadow styling */}
      <View
        style={[
          styles.mcqOptionShadow,
          { backgroundColor: isSelected ? ArchivesTheme.colors.shoeBrown : ArchivesTheme.colors.concreteGrey }
        ]}
      />

      {/* Content with letter circle and text */}
      <View style={styles.mcqOptionContent}>
        <View style={styles.mcqOptionLetterContainer}>
          <View style={styles.mcqOptionLetterCircle}>
            <Text style={styles.mcqOptionLetter}>{letter}</Text>
          </View>
        </View>

        <View style={textAlignment === 'center' ? styles.mcqOptionTextCentered : styles.mcqOptionTextContainer}>
          <Text style={textAlignment === 'center' ? styles.mcqOptionTextTrueCentered : styles.mcqOptionText}>
            {text}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
```

### True/False Option Button
```typescript
export function TrueFalseOptionButton({
  isTrue,
  isSelected,
  onPress
}: TrueFalseOptionButtonProps) {
  return (
    <TouchableOpacity style={styles.trueFalseContainer} onPress={onPress}>
      <View style={[
        styles.trueFalseShadow,
        { backgroundColor: isSelected ? ArchivesTheme.colors.shoeBrown : ArchivesTheme.colors.concreteGrey }
      ]} />

      <View style={styles.trueFalseContent}>
        {/* Icon circle */}
        <View style={styles.trueFalseIconCircle}>
          <Ionicons
            name={isTrue ? "checkmark" : "close"}
            size={24}
            color="white"
          />
        </View>

        {/* Text */}
        <Text style={styles.trueFalseText}>
          {isTrue ? 'True' : 'False'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
```

#### Correct True/False Implementation Pattern
```typescript
// ✅ CORRECT: Use explicit True/False buttons with isTrue prop
const renderTrueFalseOptions = () => (
  <View style={styles.trueFalseOptionsContainer}>
    <TrueFalseOptionButton
      isTrue={true}  // Shows "True" text
      isSelected={selectedTrueFalse === 1}
      onPress={() => setSelectedTrueFalse(1)}
    />
    <TrueFalseOptionButton
      isTrue={false} // Shows "False" text
      isSelected={selectedTrueFalse === 0}
      onPress={() => setSelectedTrueFalse(0)}
    />
  </View>
);

// ❌ INCORRECT: Do not map over options array
// This causes "False False" display bug
const renderTrueFalseOptionsWrong = () => (
  currentQuestion.options?.map((option, index) => (
    <TrueFalseOptionButton
      key={index}
      text={option}  // ❌ text prop doesn't exist
      isSelected={selectedTrueFalse === index}
      onPress={() => setSelectedTrueFalse(index)}
    />
  ))
);
```

### Fill-in-the-Blank Options
```typescript
export function FillBlankOption({
  text,
  isSelected,
  onPress
}: FillBlankOptionProps) {
  return (
    <TouchableOpacity style={styles.fillBlankContainer} onPress={onPress}>
      <View style={[
        styles.fillBlankShadow,
        { backgroundColor: isSelected ? ArchivesTheme.colors.shoeBrown : ArchivesTheme.colors.concreteGrey }
      ]} />

      <View style={styles.fillBlankContent}>
        <Text style={[
          styles.fillBlankText,
          { color: isSelected ? ArchivesTheme.colors.creamWhite : ArchivesTheme.colors.mutedNavy }
        ]}>
          {text}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
```

## 🎨 Quiz Layout Structure

```typescript
return (
  <SafeAreaView style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor={ArchivesTheme.colors.creamWhite} />

    {!showResults ? (
      // Quiz Questions View
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onDismiss} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Quiz</Text>
            <View style={styles.headerButton} />
          </View>

          {/* Question Counter */}
          <View style={styles.questionCounter}>
            <Text style={styles.questionCounterText}>
              Question {currentQuestionIndex + 1} of {quizQuestions.length}
            </Text>
          </View>

          {/* Question Image */}
          <View style={styles.questionImageContainer}>
            <View style={styles.questionImageBackground}>
              <Image
                source={currentQuestion.image}
                style={styles.questionImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Question Text */}
          <View style={styles.questionTextContainer}>
            <Text style={styles.questionText}>
              {currentQuestion.question}
            </Text>
          </View>

          {/* Answer Options - Dynamic based on question type */}
          {currentQuestion.type === 'mcq' && renderMCQOptions()}
          {currentQuestion.type === 'trueFalse' && renderTrueFalseOptions()}
          {currentQuestion.type === 'fillInBlank' && renderFillBlankOptions()}

          {/* Submit Button */}
          <View style={styles.submitButtonContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                hasSelectedAnswer() && styles.submitButtonEnabled
              ]}
              onPress={handleSubmitAnswer}
              disabled={!hasSelectedAnswer()}
            >
              <Text style={[
                styles.submitButtonText,
                hasSelectedAnswer() && styles.submitButtonTextEnabled
              ]}>
                {currentQuestionIndex === quizQuestions.length - 1 ? 'Finish Quiz' : 'Next Question'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    ) : (
      // Results View
      <View style={styles.resultsContainer}>
        {renderResultsView()}
      </View>
    )}

    {/* Explanation Popup */}
    {showExplanation && (
      <ExplanationPopup
        explanation={currentQuestion.explanation}
        isCorrect={isAnswerCorrect()}
        onContinue={handleExplanationContinue}
      />
    )}
  </SafeAreaView>
);
```

## 🎯 Quiz Logic Implementation

### Answer Submission
```typescript
const handleSubmitAnswer = () => {
  const currentQuestion = quizQuestions[currentQuestionIndex];
  let selectedAnswer: number | null = null;

  // Get selected answer based on question type
  switch (currentQuestion.type) {
    case 'mcq':
      selectedAnswer = selectedMCQOption;
      break;
    case 'trueFalse':
      selectedAnswer = selectedTrueFalse;
      break;
    case 'fillInBlank':
      if (selectedFillBlank && currentQuestion.options) {
        selectedAnswer = currentQuestion.options.indexOf(selectedFillBlank);
      }
      break;
  }

  if (selectedAnswer !== null) {
    // Store user answer
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIndex] = selectedAnswer;
    setUserAnswers(newUserAnswers);

    // Check if correct
    if (selectedAnswer === currentQuestion.correctAnswer) {
      setCorrectAnswers(correctAnswers + 1);
      setTotalPoints(totalPoints + currentQuestion.points);
    }

    // Show explanation
    setShowExplanation(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};
```

### Results Calculation
```typescript
const calculateResults = () => {
  const totalQuestions = quizQuestions.length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const passed = percentage >= 40; // 40% minimum passing score

  return { totalQuestions, percentage, passed };
};
```

### Progress Integration
```typescript
const handleQuizComplete = () => {
  const { percentage, passed } = calculateResults();

  if (passed) {
    // Mark quiz as completed in progress context
    completeQuiz(adventureId, moduleId, percentage);
    onDismiss(); // Close quiz
  } else {
    // Show minimum score alert
    setShowMinimumScoreAlert(true);
  }
};
```

## 📐 SwiftUI Layout Constants

```typescript
// EXACT iOS SwiftUI Layout Specifications - Pixel Perfect Measurements
const iOSLayout = {
  // Header section spacing (EXACT SwiftUI measurements)
  quizTitleTopPadding: 20,        // Header title top spacing
  questionCounterTopPadding: 2,    // Counter below title spacing
  headerHeight: 70,                // Total header height including padding
  headerButtonSize: 24,            // Close/back button icon size
  headerHorizontalPadding: 20,     // Left/right header padding

  // Image and question section
  imageQuestionSectionTopPadding: 35,  // Section top margin from header
  imageQuestionSpacing: 10,            // Gap between image and question text
  questionTextHorizontalPadding: 20,   // Question text side margins
  questionTextTopPadding: 25,          // Question text additional top spacing
  questionTextBottomPadding: 30,       // Question text bottom spacing before options

  // Image measurements (EXACT SwiftUI frame values)
  imageBackgroundWidth: 220,       // Background container width
  imageBackgroundHeight: 110,      // Background container height
  imageWidth: 180,                 // Actual image display width
  imageHeight: 180,                // Actual image display height
  imageOffsetY: -35,               // Image vertical offset from background center
  imageCornerRadius: 15,           // Background container corner radius
  imageShadowRadius: 8,            // Shadow blur radius
  imageShadowOpacity: 0.1,         // Shadow opacity
  imageShadowOffsetY: 4,           // Shadow vertical offset

  // MCQ Answer options spacing (EXACT SwiftUI VStack spacing)
  mcqOptionSpacing: 18,            // Vertical gap between MCQ options
  mcqHorizontalPadding: 20,        // Left/right margins for MCQ options
  mcqOptionHeight: 52,             // Individual MCQ option button height
  mcqOptionCornerRadius: 26,       // MCQ option corner radius (height/2)
  mcqLetterCircleSize: 32,         // Letter circle diameter (A, B, C, D)
  mcqLetterSize: 16,               // Letter text size
  mcqOptionTextSize: 16,           // Option text size
  mcqShadowOffset: 4,              // Shadow offset for depth effect

  // True/False options spacing
  trueFalseSpacing: 30,            // Vertical gap between True/False buttons
  trueFalseHorizontalPadding: 40,  // Side margins for True/False section
  trueFalseButtonHeight: 60,       // Individual True/False button height
  trueFalseButtonCornerRadius: 30, // True/False button corner radius
  trueFalseTextSize: 18,           // TRUE/FALSE text size
  trueFalseShadowOffset: 4,        // Shadow offset for depth

  // Fill-in-the-blank options
  fillBlankHorizontalPadding: 40,  // Side margins for fill-blank options
  fillBlankVerticalSpacing: 15,    // Gap between fill-blank options
  fillBlankButtonHeight: 48,       // Fill-blank option button height
  fillBlankCornerRadius: 24,       // Fill-blank corner radius
  fillBlankTextSize: 16,           // Fill-blank option text size
  fillBlankShadowOffset: 3,        // Shadow offset

  // Submit button specifications
  submitButtonBottomPadding: 30,   // Bottom margin from screen edge
  submitButtonHeight: 50,          // Submit button height
  submitButtonCornerRadius: 25,    // Submit button corner radius
  submitButtonHorizontalPadding: 32, // Submit button internal padding
  submitButtonTextSize: 16,        // Submit button text size
  submitButtonMinWidth: 200,       // Minimum button width

  // Results view measurements
  resultsImageSize: 150,           // Results celebration image size
  resultsImageTopPadding: 40,      // Top spacing for results image
  resultsTextSpacing: 20,          // Vertical spacing between result elements
  resultsScoreTextSize: 24,        // Score percentage text size
  resultsMessageTextSize: 18,      // Pass/fail message text size
  resultsButtonSpacing: 25,        // Gap between result buttons

  // Explanation popup dimensions
  explanationPopupCornerRadius: 20,    // Popup corner radius
  explanationPopupPadding: 20,         // Internal popup padding
  explanationPopupMargin: 20,          // Screen edge margins
  explanationTitleSize: 20,            // "Correct!" / "Incorrect" title size
  explanationTextSize: 16,             // Explanation content text size
  explanationButtonHeight: 45,         // Continue button height
  explanationButtonCornerRadius: 22,   // Continue button corner radius

  // Animation timing (SwiftUI spring animations)
  springTension: 100,              // Spring animation tension
  springFriction: 8,               // Spring animation friction
  fadeAnimationDuration: 0.3,      // Fade in/out duration
  slideAnimationDuration: 0.4,     // Slide transition duration
};
```

## 🎨 Styling Guidelines

### Core Styles - EXACT SwiftUI Replication
```typescript
const styles = StyleSheet.create({
  // Main container - EXACT SwiftUI background
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  // ScrollView container for question content
  scrollView: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  // Main content wrapper
  content: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  // Header section - EXACT SwiftUI header layout
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: iOSLayout.headerHorizontalPadding,
    paddingTop: iOSLayout.quizTitleTopPadding,
    paddingBottom: 10,
    height: iOSLayout.headerHeight,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    textAlign: 'center',
  },

  // Question counter - EXACT SwiftUI positioning
  questionCounter: {
    alignItems: 'center',
    paddingTop: iOSLayout.questionCounterTopPadding,
    paddingBottom: 15,
  },

  questionCounterText: {
    fontSize: 14,
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    opacity: 0.8,
  },

  // Question image section - EXACT SwiftUI measurements
  questionImageContainer: {
    alignItems: 'center',
    paddingTop: iOSLayout.imageQuestionSectionTopPadding,
    paddingBottom: iOSLayout.imageQuestionSpacing,
  },

  questionImageBackground: {
    width: iOSLayout.imageBackgroundWidth,
    height: iOSLayout.imageBackgroundHeight,
    backgroundColor: ArchivesTheme.colors.surface,
    borderRadius: iOSLayout.imageCornerRadius,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: { width: 0, height: iOSLayout.imageShadowOffsetY },
    shadowOpacity: iOSLayout.imageShadowOpacity,
    shadowRadius: iOSLayout.imageShadowRadius,
    elevation: 8,
  },

  questionImage: {
    width: iOSLayout.imageWidth,
    height: iOSLayout.imageHeight,
    transform: [{ translateY: iOSLayout.imageOffsetY }],
  },

  // Question text section - EXACT SwiftUI text layout
  questionTextContainer: {
    paddingHorizontal: iOSLayout.questionTextHorizontalPadding,
    paddingTop: iOSLayout.questionTextTopPadding,
    paddingBottom: iOSLayout.questionTextBottomPadding,
    alignItems: 'center',
  },

  questionText: {
    fontSize: 18,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    textAlign: 'center',
    lineHeight: 26,
  },

  // MCQ Option styles - EXACT SwiftUI button design
  mcqOptionsContainer: {
    paddingHorizontal: iOSLayout.mcqHorizontalPadding,
  },

  mcqOptionContainer: {
    position: 'relative',
    marginBottom: iOSLayout.mcqOptionSpacing,
  },

  mcqOptionShadow: {
    position: 'absolute',
    width: '100%',
    height: iOSLayout.mcqOptionHeight,
    borderRadius: iOSLayout.mcqOptionCornerRadius,
    top: iOSLayout.mcqShadowOffset,
    left: iOSLayout.mcqShadowOffset,
    backgroundColor: ArchivesTheme.colors.concreteGrey,
  },

  mcqOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ArchivesTheme.colors.surface,
    height: iOSLayout.mcqOptionHeight,
    borderRadius: iOSLayout.mcqOptionCornerRadius,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: ArchivesTheme.colors.concreteGrey,
  },

  mcqOptionSelected: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    borderColor: ArchivesTheme.colors.shoeBrown,
  },

  mcqOptionLetterContainer: {
    marginRight: 16,
  },

  mcqOptionLetterCircle: {
    width: iOSLayout.mcqLetterCircleSize,
    height: iOSLayout.mcqLetterCircleSize,
    borderRadius: iOSLayout.mcqLetterCircleSize / 2,
    backgroundColor: ArchivesTheme.colors.mutedNavy,
    justifyContent: 'center',
    alignItems: 'center',
  },

  mcqOptionLetterSelected: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  mcqOptionLetter: {
    fontSize: iOSLayout.mcqLetterSize,
    fontWeight: '600',
    color: ArchivesTheme.colors.creamWhite,
    fontFamily: 'DM Sans',
  },

  mcqOptionLetterSelectedText: {
    color: ArchivesTheme.colors.mutedNavy,
  },

  mcqOptionTextContainer: {
    flex: 1,
  },

  mcqOptionTextCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  mcqOptionText: {
    fontSize: iOSLayout.mcqOptionTextSize,
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    fontWeight: '500',
    lineHeight: 22,
  },

  mcqOptionTextSelected: {
    color: ArchivesTheme.colors.creamWhite,
  },

  mcqOptionTextTrueCentered: {
    fontSize: iOSLayout.mcqOptionTextSize,
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    fontWeight: '500',
    textAlign: 'center',
  },

  // True/False Option styles - EXACT SwiftUI True/False design
  trueFalseContainer: {
    position: 'relative',
    marginBottom: iOSLayout.trueFalseSpacing,
    paddingHorizontal: iOSLayout.trueFalseHorizontalPadding,
  },

  trueFalseShadow: {
    position: 'absolute',
    width: '100%',
    height: iOSLayout.trueFalseButtonHeight,
    borderRadius: iOSLayout.trueFalseButtonCornerRadius,
    top: iOSLayout.trueFalseShadowOffset,
    left: iOSLayout.trueFalseShadowOffset,
    backgroundColor: ArchivesTheme.colors.concreteGrey,
  },

  trueFalseContent: {
    backgroundColor: ArchivesTheme.colors.surface,
    height: iOSLayout.trueFalseButtonHeight,
    borderRadius: iOSLayout.trueFalseButtonCornerRadius,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ArchivesTheme.colors.concreteGrey,
  },

  trueFalseSelected: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    borderColor: ArchivesTheme.colors.shoeBrown,
  },

  trueFalseText: {
    fontSize: iOSLayout.trueFalseTextSize,
    fontWeight: '700',
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    letterSpacing: 1,
  },

  trueFalseTextSelected: {
    color: ArchivesTheme.colors.creamWhite,
  },

  // Fill-in-the-blank styles - EXACT SwiftUI fill-blank design
  fillBlankContainer: {
    position: 'relative',
    marginBottom: iOSLayout.fillBlankVerticalSpacing,
    paddingHorizontal: iOSLayout.fillBlankHorizontalPadding,
  },

  fillBlankShadow: {
    position: 'absolute',
    width: '100%',
    height: iOSLayout.fillBlankButtonHeight,
    borderRadius: iOSLayout.fillBlankCornerRadius,
    top: iOSLayout.fillBlankShadowOffset,
    left: iOSLayout.fillBlankShadowOffset,
    backgroundColor: ArchivesTheme.colors.concreteGrey,
  },

  fillBlankContent: {
    backgroundColor: ArchivesTheme.colors.surface,
    height: iOSLayout.fillBlankButtonHeight,
    borderRadius: iOSLayout.fillBlankCornerRadius,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: ArchivesTheme.colors.concreteGrey,
  },

  fillBlankSelected: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    borderColor: ArchivesTheme.colors.shoeBrown,
  },

  fillBlankText: {
    fontSize: iOSLayout.fillBlankTextSize,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    textAlign: 'center',
  },

  fillBlankTextSelected: {
    color: ArchivesTheme.colors.creamWhite,
  },

  // Submit button - EXACT SwiftUI submit button design
  submitButtonContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: iOSLayout.submitButtonBottomPadding,
    paddingHorizontal: 40,
  },

  submitButton: {
    backgroundColor: ArchivesTheme.colors.concreteGrey,
    height: iOSLayout.submitButtonHeight,
    borderRadius: iOSLayout.submitButtonCornerRadius,
    paddingHorizontal: iOSLayout.submitButtonHorizontalPadding,
    minWidth: iOSLayout.submitButtonMinWidth,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  submitButtonEnabled: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
  },

  submitButtonText: {
    fontSize: iOSLayout.submitButtonTextSize,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
  },

  submitButtonTextEnabled: {
    color: ArchivesTheme.colors.creamWhite,
  },

  // Results view styles - EXACT SwiftUI results layout
  resultsContainer: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  resultsImage: {
    width: iOSLayout.resultsImageSize,
    height: iOSLayout.resultsImageSize,
    marginBottom: iOSLayout.resultsTextSpacing,
  },

  resultsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    textAlign: 'center',
    marginBottom: 10,
  },

  resultsScore: {
    fontSize: iOSLayout.resultsScoreTextSize,
    fontWeight: '600',
    color: ArchivesTheme.colors.persianOrange,
    fontFamily: 'DM Sans',
    textAlign: 'center',
    marginBottom: iOSLayout.resultsTextSpacing,
  },

  resultsMessage: {
    fontSize: iOSLayout.resultsMessageTextSize,
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: iOSLayout.resultsButtonSpacing,
  },

  resultsButtonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: iOSLayout.resultsButtonSpacing,
  },

  // Explanation popup styles - EXACT SwiftUI popup design
  explanationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: iOSLayout.explanationPopupMargin,
  },

  explanationPopup: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    borderRadius: iOSLayout.explanationPopupCornerRadius,
    padding: iOSLayout.explanationPopupPadding,
    width: '100%',
    maxWidth: 350,
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },

  explanationTitle: {
    fontSize: iOSLayout.explanationTitleSize,
    fontWeight: '700',
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    textAlign: 'center',
    marginBottom: 15,
  },

  explanationTitleCorrect: {
    color: ArchivesTheme.colors.mossGreen,
  },

  explanationTitleIncorrect: {
    color: ArchivesTheme.colors.persianOrange,
  },

  explanationText: {
    fontSize: iOSLayout.explanationTextSize,
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 25,
  },

  explanationButton: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    height: iOSLayout.explanationButtonHeight,
    borderRadius: iOSLayout.explanationButtonCornerRadius,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  explanationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.creamWhite,
    fontFamily: 'DM Sans',
  },

  // Minimum score alert styles
  minimumScoreAlert: {
    backgroundColor: ArchivesTheme.colors.surface,
    borderRadius: 15,
    padding: 20,
    margin: 20,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.persianOrange,
  },

  minimumScoreAlertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    textAlign: 'center',
    marginBottom: 10,
  },

  minimumScoreAlertText: {
    fontSize: 16,
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
});
```

## 🚀 Implementation Checklist - Pixel Perfect SwiftUI Quiz System

### Phase 1: Project Setup & Dependencies
- [ ] Import all core React Native components (View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, StatusBar, Animated, Dimensions, Platform)
- [ ] Import SafeAreaView from react-native-safe-area-context for proper screen boundaries
- [ ] Import Ionicons from @expo/vector-icons for close/back buttons
- [ ] Import expo-haptics for tactile feedback on interactions
- [ ] Import ArchivesTheme for consistent design system colors and typography
- [ ] Import useProgress hook from ProgressContext for completion tracking
- [ ] Import all QuizSystem components (QuizQuestion, MCQOptionButton, TrueFalseOptionButton, FillBlankOption, ExplanationPopup)
- [ ] Set up TypeScript interfaces for QuizProps and QuizQuestion data structure
- [ ] Configure platform-specific dimensions (screen vs window for Android/iOS)

### Phase 2: Quiz Data Structure & State Management
- [ ] Define QuizQuestion interface with type, correctAnswer, explanation, points, options, and image properties
- [ ] Structure quiz questions array with proper MCQ, True/False, and Fill-in-blank questions
- [ ] Set up currentQuestionIndex state for tracking progress through quiz
- [ ] Initialize showResults boolean state for results screen display
- [ ] Configure showExplanation state for explanation popup visibility
- [ ] Set up correctAnswers counter for score calculation
- [ ] Initialize totalPoints accumulator for detailed scoring
- [ ] Create userAnswers array to store all user selections
- [ ] Configure showMinimumScoreAlert state for pass/fail notification
- [ ] Set up question-specific selection states (selectedMCQOption, selectedTrueFalse, selectedFillBlank)
- [ ] Initialize progress context with completeQuiz method integration

### Phase 3: SwiftUI Layout Constants Implementation
- [ ] Define EXACT header section measurements (quizTitleTopPadding: 20, questionCounterTopPadding: 2, headerHeight: 70)
- [ ] Configure precise image section constants (imageBackgroundWidth: 220, imageBackgroundHeight: 110, imageWidth: 180, imageHeight: 180)
- [ ] Set up image positioning (imageOffsetY: -35, imageCornerRadius: 15, imageShadowRadius: 8, imageShadowOpacity: 0.1)
- [ ] Define MCQ option specifications (mcqOptionSpacing: 18, mcqOptionHeight: 52, mcqOptionCornerRadius: 26, mcqLetterCircleSize: 32)
- [ ] Configure True/False button measurements (trueFalseSpacing: 30, trueFalseButtonHeight: 60, trueFalseButtonCornerRadius: 30)
- [ ] Set up Fill-blank option constants (fillBlankVerticalSpacing: 15, fillBlankButtonHeight: 48, fillBlankCornerRadius: 24)
- [ ] Define submit button specifications (submitButtonHeight: 50, submitButtonCornerRadius: 25, submitButtonMinWidth: 200)
- [ ] Configure results view measurements (resultsImageSize: 150, resultsImageTopPadding: 40, resultsTextSpacing: 20)
- [ ] Set up explanation popup dimensions (explanationPopupCornerRadius: 20, explanationPopupPadding: 20, explanationPopupMargin: 20)
- [ ] Define animation timing constants (springTension: 100, springFriction: 8, fadeAnimationDuration: 0.3)

### Phase 4: Question Type Components Implementation
- [ ] Implement MCQOptionButton with letter circle, text content, and selection states
- [ ] Add shadow background with EXACT offset positioning (top: 4, left: 4)
- [ ] Configure letter circle with proper size (32x32) and centered text
- [ ] Set up text alignment logic for centered vs left-aligned options
- [ ] Apply selection styling with background color changes (surface → persianOrange)
- [ ] Implement TrueFalseOptionButton with large text and selection feedback
- [ ] Configure True/False shadow effects with proper offset (4px offset)
- [ ] Set up bold, uppercase text styling (fontSize: 18, fontWeight: '700', letterSpacing: 1)
- [ ] Apply selection state changes for background and text colors
- [ ] Implement FillBlankOption with centered text and selection highlighting
- [ ] Configure fill-blank shadow positioning (3px offset)
- [ ] Set up text centering and proper padding (horizontal: 20px)
- [ ] Apply selection state with color transitions
- [ ] Test all button interactions with proper haptic feedback

### Phase 5: Question Rendering Logic
- [ ] Implement dynamic question type rendering based on currentQuestion.type
- [ ] Create renderMCQOptions() function with proper option mapping
- [ ] Set up letter assignment (A, B, C, D) for MCQ options
- [ ] Configure MCQ selection handling with selectedMCQOption state
- [ ] Implement renderTrueFalseOptions() with True/False button pair
- [ ] Set up True/False selection logic (0 = False, 1 = True)
- [ ] Configure True/False selection state management
- [ ] Implement renderFillBlankOptions() with option grid layout
- [ ] Set up fill-blank option selection with string matching
- [ ] Configure fill-blank selection state updates
- [ ] Add hasSelectedAnswer() validation function for submit button enabling
- [ ] Test question type switching and state persistence

### Phase 6: Answer Submission & Validation System
- [ ] Implement handleSubmitAnswer() with question type switching
- [ ] Add answer extraction logic for each question type (MCQ index, True/False boolean, Fill-blank string matching)
- [ ] Configure userAnswers array updates with proper indexing
- [ ] Implement correctness validation against currentQuestion.correctAnswer
- [ ] Set up score tracking with correctAnswers increment and totalPoints accumulation
- [ ] Configure explanation popup display with setShowExplanation(true)
- [ ] Add haptic feedback for answer submission (Haptics.ImpactFeedbackStyle.Medium)
- [ ] Implement question progression logic for next question or quiz completion
- [ ] Set up state resets for next question (clear selected options)
- [ ] Configure final question handling with results display
- [ ] Test answer validation accuracy for all question types
- [ ] Verify score calculation with various answer combinations

### Phase 7: Explanation Popup System
- [ ] Implement ExplanationPopup component with overlay background
- [ ] Configure popup positioning with center alignment and proper margins (20px)
- [ ] Set up explanation title with correct/incorrect styling
- [ ] Apply different colors for correct (mossGreen) vs incorrect (persianOrange) titles
- [ ] Configure explanation text with proper typography (fontSize: 16, lineHeight: 24)
- [ ] Implement Continue button with proper styling and haptic feedback
- [ ] Set up handleExplanationContinue() function for quiz progression
- [ ] Configure popup animations with fade in/out effects
- [ ] Add background tap handling for popup dismissal prevention
- [ ] Configure explanation popup shadow effects (shadowRadius: 16, elevation: 16)
- [ ] Test explanation display for all question types
- [ ] Verify smooth transitions between explanation and next question

### Phase 8: Results Calculation & Display
- [ ] Implement calculateResults() function with percentage calculation
- [ ] Set up pass/fail logic with 40% minimum threshold
- [ ] Configure results display with celebration image and score
- [ ] Implement results layout with proper spacing (resultsTextSpacing: 20)
- [ ] Set up results title with dynamic pass/fail messaging
- [ ] Configure score display with prominent typography (fontSize: 24, fontWeight: '600')
- [ ] Add results message with encouragement or improvement guidance
- [ ] Implement Continue/Retry buttons with proper spacing (resultsButtonSpacing: 25)
- [ ] Set up results image with proper sizing (150x150) and positioning
- [ ] Configure results button actions (quiz completion vs retry)
- [ ] Add results screen animations with smooth transitions
- [ ] Test score calculation accuracy with various scenarios

### Phase 9: Progress Context Integration
- [ ] Configure completeQuiz method integration from useProgress hook
- [ ] Set up quiz completion with adventureId and moduleId parameters
- [ ] Implement score percentage passing to progress system
- [ ] Configure automatic module completion when quiz passes (≥40%)
- [ ] Set up minimum score alert for failed attempts
- [ ] Implement quiz retry logic without progress updates on failure
- [ ] Configure progress persistence to AsyncStorage via ProgressContext
- [ ] Set up background sync integration for cross-device progress
- [ ] Add quiz completion tracking in adventure progress
- [ ] Configure module unlocking logic when quiz completes
- [ ] Test progress updates with various score scenarios
- [ ] Verify progress persistence across app sessions

### Phase 10: UI Layout & Navigation Structure
- [ ] Implement main container with SafeAreaView and proper background
- [ ] Configure StatusBar with dark content and creamWhite background
- [ ] Set up header section with close button, title, and optional back button
- [ ] Configure question counter with proper positioning and typography
- [ ] Implement question image container with background and shadow effects
- [ ] Set up question text section with proper padding and alignment
- [ ] Configure answer options section with dynamic type rendering
- [ ] Implement submit button section with proper spacing and enabling logic
- [ ] Set up conditional rendering between quiz questions and results
- [ ] Configure ScrollView for question content with proper scrolling behavior
- [ ] Add proper keyboard handling for fill-blank interactions
- [ ] Test layout responsiveness across different screen sizes

### Phase 11: Animation & Visual Effects
- [ ] Implement spring animations for quiz transitions (tension: 100, friction: 8)
- [ ] Configure fade animations for explanation popup (duration: 0.3)
- [ ] Set up slide animations for question transitions (duration: 0.4)
- [ ] Add button press animations with scale effects
- [ ] Configure shadow effects for all interactive elements
- [ ] Implement hover states for touchable components
- [ ] Set up selection animations with smooth color transitions
- [ ] Configure results celebration animations
- [ ] Add loading states for quiz initialization
- [ ] Implement smooth scrolling for question content
- [ ] Test animation performance on both iOS and Android
- [ ] Verify animation timing matches SwiftUI reference implementation

### Phase 12: Cross-Platform Optimization
- [ ] Configure platform-specific dimensions (screen vs window)
- [ ] Set up iOS-specific haptic feedback with proper impact styles
- [ ] Configure Android elevation for shadow effects
- [ ] Implement platform-specific font rendering adjustments
- [ ] Set up iOS-specific gesture handling optimizations
- [ ] Configure Android-specific touch feedback
- [ ] Test quiz functionality on iOS simulators
- [ ] Verify quiz behavior on Android emulators
- [ ] Test on physical devices for performance validation
- [ ] Configure platform-specific animation optimizations
- [ ] Verify image loading performance across platforms
- [ ] Test memory management during quiz sessions

### Phase 13: Error Handling & Edge Cases
- [ ] Implement quiz data validation with proper error handling
- [ ] Configure fallback states for missing quiz images
- [ ] Set up error boundaries for quiz component crashes
- [ ] Implement timeout handling for quiz interactions
- [ ] Configure network error handling for progress sync
- [ ] Set up graceful degradation for missing answer options
- [ ] Implement quiz state recovery from interruptions
- [ ] Configure proper cleanup on component unmount
- [ ] Add validation for quiz completion requirements
- [ ] Set up error reporting for debugging quiz issues
- [ ] Test quiz behavior with invalid data scenarios
- [ ] Verify quiz recovery from background/foreground transitions

### Phase 14: Performance & Memory Optimization
- [ ] Implement image preloading for quiz question images
- [ ] Configure efficient re-rendering with React.memo where appropriate
- [ ] Set up proper state management to minimize unnecessary updates
- [ ] Optimize answer selection handlers with useCallback
- [ ] Configure efficient quiz data structures
- [ ] Implement memory cleanup for animation references
- [ ] Set up efficient scroll handling with proper throttling
- [ ] Configure image optimization for different screen densities
- [ ] Optimize quiz transitions for smooth user experience
- [ ] Implement efficient state persistence strategies
- [ ] Test quiz performance with extended sessions
- [ ] Profile memory usage during quiz interactions

### Phase 15: Testing & Quality Assurance
- [ ] Test all MCQ questions with various option configurations
- [ ] Verify True/False question logic with different statements
- [ ] Test Fill-in-blank questions with all answer combinations
- [ ] Validate quiz scoring with edge cases (0%, 40%, 100%)
- [ ] Test quiz completion with minimum passing score
- [ ] Verify quiz failure handling and retry functionality
- [ ] Test explanation popups for all question types
- [ ] Validate progress integration with various completion scenarios
- [ ] Test quiz interruption and recovery scenarios
- [ ] Verify layout consistency across different screen sizes
- [ ] Test accessibility features and screen reader compatibility
- [ ] Validate quiz data persistence across app sessions
- [ ] Test background sync integration with quiz completion
- [ ] Verify haptic feedback on all supported devices
- [ ] Conduct full quiz flow testing from start to completion

## 📚 Usage Examples

The quiz system is perfect for:
- **Educational assessment** with mixed question formats
- **Knowledge reinforcement** after lesson content
- **Progress tracking** with completion requirements
- **Interactive learning** with immediate explanations
- **Any educational content** requiring comprehension testing

## 🔧 Question Type Guidelines

### Multiple Choice Questions (MCQ)
- Use for complex topics with multiple possible answers
- Include 3-4 options with clear distinctions
- Provide comprehensive explanations

### True/False Questions
- Use for factual statements
- Ensure statements are clearly true or false
- Avoid ambiguous wording

### Fill-in-the-blank Questions
- Use for vocabulary and key terms
- Provide 3-4 plausible options
- Focus on important concepts from lessons

## ⚠️ Important Notes

- **Minimum Score**: 40% required to pass quiz and complete module
- **Question Images**: Always include relevant images for visual context
- **Explanations**: Provide educational explanations for all answers
- **Progress Integration**: Quiz completion automatically updates progress
- **SwiftUI Accuracy**: Measurements replicate exact iOS layout specifications

## 💡 Best Practices - Educational Quiz Excellence

### Content Design Principles
- **Question Variety**: Balance MCQ (40%), True/False (30%), Fill-blank (30%) across quiz for comprehensive assessment
- **Question Clarity**: Write unambiguous questions with single correct interpretations
- **Educational Value**: Provide detailed explanations that enhance learning beyond simple correctness validation
- **Visual Support**: Use contextually relevant images that support question comprehension
- **Difficulty Progression**: Order questions from easier to harder for optimal learning curve
- **Cultural Sensitivity**: Ensure historical content is accurate and culturally appropriate

### Technical Implementation Standards
- **Performance**: Maintain 60fps during all quiz interactions and transitions
- **Accessibility**: Support screen readers with proper semantic markup and ARIA labels
- **Cross-Platform**: Test quiz functionality on both iOS and Android with identical behavior
- **Memory Management**: Properly cleanup animation references and image resources
- **Error Resilience**: Implement graceful fallbacks for network issues and data corruption
- **State Persistence**: Ensure quiz progress survives app backgrounding and memory pressure

### User Experience Guidelines
- **Haptic Feedback**: Provide tactile feedback for all interactive elements (selection, submission, transitions)
- **Visual Feedback**: Use clear selection states and smooth animations for user confidence
- **Progress Transparency**: Display clear question counters and completion indicators
- **Immediate Gratification**: Show explanations immediately after answer submission
- **Error Prevention**: Disable submit until answer selected, prevent accidental submissions
- **Accessibility**: Support dynamic text sizing and high contrast modes

### Educational Effectiveness
- **Formative Assessment**: Use quiz results to guide future learning recommendations
- **Spaced Repetition**: Track incorrect answers for future review opportunities
- **Knowledge Transfer**: Design questions that test understanding, not just memorization
- **Contextual Learning**: Connect quiz content to previous lessons and historical context
- **Achievement Recognition**: Celebrate learning milestones with appropriate feedback
- **Growth Mindset**: Frame incorrect answers as learning opportunities, not failures

## 🔄 Advanced Quiz System Extensions

### Adaptive Difficulty System
```typescript
// Dynamic difficulty adjustment based on user performance
interface AdaptiveQuizConfig {
  baseQuestions: QuizQuestion[];
  bonusQuestions: QuizQuestion[];
  difficultyThreshold: number; // Performance trigger for bonus content
  adaptiveScoring: boolean;
}

const handleAdaptiveDifficulty = (currentScore: number, questionsAnswered: number) => {
  const currentPercentage = (currentScore / questionsAnswered) * 100;

  if (currentPercentage >= 80 && questionsAnswered >= 2) {
    // Unlock bonus challenge questions
    return [...baseQuestions, ...bonusQuestions];
  }

  return baseQuestions;
};
```

### Real-time Analytics Integration
```typescript
// Quiz performance analytics with PostHog
const trackQuizInteraction = (action: string, questionData: any) => {
  posthog.capture('quiz_interaction', {
    action,
    questionType: questionData.type,
    questionIndex: currentQuestionIndex,
    timeTaken: Date.now() - questionStartTime,
    adventureId,
    moduleId,
    userId: user?.id
  });
};

// Track detailed learning patterns
const trackAnswerPattern = (isCorrect: boolean, attempts: number) => {
  posthog.capture('quiz_answer_submitted', {
    correct: isCorrect,
    attempts,
    questionDifficulty: currentQuestion.difficulty,
    timeSpent: answerTime,
    helpUsed: explanationViewed
  });
};
```

### Accessibility Enhancements
```typescript
// Screen reader support and voice navigation
const accessibilityProps = {
  accessible: true,
  accessibilityRole: 'button',
  accessibilityLabel: `Option ${letter}: ${text}`,
  accessibilityHint: 'Double tap to select this answer',
  accessibilityState: {
    selected: isSelected,
    disabled: !isEnabled
  }
};

// High contrast mode support
const useHighContrastColors = () => {
  const { isHighContrast } = useAccessibilityInfo();

  return {
    selectedColor: isHighContrast ? '#000000' : ArchivesTheme.colors.persianOrange,
    textColor: isHighContrast ? '#FFFFFF' : ArchivesTheme.colors.mutedNavy,
    borderWidth: isHighContrast ? 3 : 1
  };
};
```

### Progressive Web App Features
```typescript
// Offline quiz functionality with service workers
const useOfflineQuiz = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cachedQuizData, setCachedQuizData] = useState(null);

  useEffect(() => {
    // Cache quiz data for offline access
    const cacheQuizData = async () => {
      const cache = await caches.open('quiz-cache-v1');
      await cache.addAll(['/quiz-images', '/quiz-audio']);
    };

    cacheQuizData();
  }, []);

  return { isOffline, cachedQuizData };
};
```

---

## 📊 Quiz System Performance Benchmarks

### Target Performance Metrics
- **Question Load Time**: < 100ms for image and content rendering
- **Answer Selection Response**: < 16ms (60fps) for visual feedback
- **Explanation Popup Animation**: 300ms smooth transition
- **Results Calculation**: < 50ms for score computation
- **Progress Sync**: < 500ms background update to cloud storage
- **Memory Usage**: < 50MB peak during quiz session
- **Battery Impact**: < 2% per 10-minute quiz session

### Quality Assurance Standards
- **Zero Crashes**: 99.9% stability during quiz sessions
- **Data Persistence**: 100% score preservation during app lifecycle
- **Cross-Platform Parity**: Identical behavior on iOS/Android/Web
- **Accessibility Compliance**: WCAG 2.1 AA standard adherence
- **Performance Consistency**: Stable framerate across all device tiers

---

*Reference Implementation: `Adventure1_Module1_Quiz.tsx` + `QuizSystem.tsx`*
*Component Dependencies: QuizSystem components, ProgressContext, ArchivesTheme, PostHog Analytics*
*Quiz Format: 3 questions minimum, 40% pass threshold, adaptive difficulty, cross-platform*
*Performance Target: 60fps interactions, <100ms load times, offline-capable*