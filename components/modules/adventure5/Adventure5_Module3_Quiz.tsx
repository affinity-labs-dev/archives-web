// Adventure5_Module3_Quiz.tsx - EXACT replica following QuizSystem.md documentation
// 5-question quiz about Abbasid Revolution and Baghdad foundation with MCQ, True/False + explanations and results

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
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { useProgress } from '@/context/ProgressContext'
import {
  QuizQuestion,
  MCQOptionButton,
  TrueFalseOptionButton,
  FillBlankOption,
  ExplanationPopup,
} from '../QuizSystem'

const { width } = Dimensions.get('window')

interface Adventure5_Module3_QuizProps {
  onDismiss: () => void
  onBack?: () => void
}

// Quiz Data - Adventure 5 Module 3: Abbasid Revolution and New Order
const quizQuestions = [
  {
    question: "In what year did the Abbasids defeat the Umayyads and seize power?",
    correctAnswer: 2, // C) 750 CE
    explanation: "The Abbasids overthrew the Umayyads in 750 CE, marking the beginning of their caliphate and the end of Umayyad rule in the East.",
    points: 10,
    type: 'mcq' as const,
    options: ["661 CE", "711 CE", "750 CE", "800 CE"],
    image: require('@/assets/images/quiz-images/Reader.png')
  },
  {
    question: "Baghdad, the new Abbasid capital, was built beside which river?",
    correctAnswer: 1, // B) Tigris
    explanation: "Baghdad was strategically built beside the Tigris River, providing water access, trade routes, and defensive advantages for the new capital.",
    points: 10,
    type: 'mcq' as const,
    options: ["Nile", "Tigris", "Euphrates", "Jordan"],
    image: require('@/assets/images/lesson-content/Reader.png')
  },
  {
    question: "Baghdad was planned as a perfect circle.",
    correctAnswer: 0, // A) True
    explanation: "Yes, Baghdad was designed as the 'Round City' - a perfect circle that symbolized unity, perfection, and the cosmic order of the new Abbasid empire.",
    points: 10,
    type: 'mcq' as const,
    options: ["True", "False"],
    image: require('@/assets/images/lesson-content/map.png')
  },
  {
    question: "Did every member of the Umayyad family lose power after 750 CE?",
    correctAnswer: 1, // B) False
    explanation: "No, while the Umayyads fell in the East, some family members escaped west and later established rule in Cordoba, Spain, continuing their dynasty there.",
    points: 10,
    type: 'mcq' as const,
    options: ["True", "False"],
    image: require('@/assets/images/quiz-images/writer.png')
  },
  {
    question: "Which caliph led the planning of Baghdad's 'Round City'?",
    correctAnswer: 0, // A) al-Mansur
    explanation: "Caliph al-Mansur was the visionary leader who planned and built Baghdad as the Round City, creating a capital that would symbolize Abbasid power and order.",
    points: 10,
    type: 'mcq' as const,
    options: ["al-Mansur", "Harun al-Rashid", "al-Mahdi", "al-Muʿtasim"],
    image: require('@/assets/images/quiz-images/mosque.png')
  }
]

// Quiz Results View - EXACT SwiftUI Adventure5Module3QuizResultsView
interface QuizResultsViewProps {
  correctAnswers: number
  totalQuestions: number
  totalPoints: number
  onRetake: () => void
  onGoToAdventure: () => void
  onBack?: () => void
}

function QuizResultsView({
  correctAnswers,
  totalQuestions,
  totalPoints,
  onRetake,
  onGoToAdventure,
  onBack
}: QuizResultsViewProps) {
  const percentage = Math.round((correctAnswers * 100) / totalQuestions) // EXACT SwiftUI calculation
  const passed = percentage >= 40 // EXACT SwiftUI: private var passed: Bool (40% passing score)
  const canAccessAdventure = correctAnswers >= 2 // EXACT SwiftUI: private var canAccessAdventure: Bool (need 2/5 correct)

  return (
    <>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor={ArchivesTheme.colors.creamWhite} />
      )}
      <SafeAreaView style={Platform.OS === 'android' ? styles.containerAndroid : styles.container}>
        <View style={styles.resultsContainer}>
          <ScrollView contentContainerStyle={styles.resultsScrollContent} showsVerticalScrollIndicator={false}>
            {/* Results Header */}
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {passed ? 'Excellent Work!' : 'Keep Learning!'}
              </Text>
              <Text style={styles.resultsScore}>
                {correctAnswers}/{totalQuestions} ({percentage}%)
              </Text>
              <Text style={styles.resultsMessage}>
                {passed
                  ? "You've mastered the Abbasid Revolution and Baghdad's founding. Ready for the next adventure!"
                  : "Review the lessons about the 750 CE revolution and Baghdad's Round City design, then try again."
                }
              </Text>
            </View>

            {/* Results Buttons */}
            <View style={styles.resultsButtonContainer}>
              {canAccessAdventure ? (
                <TouchableOpacity style={styles.resultsButton} onPress={onGoToAdventure}>
                  <Text style={styles.resultsButtonText}>Continue Adventure</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.resultsButton} onPress={onRetake}>
                    <Text style={styles.resultsButtonText}>Try Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resultsButtonSecondary} onPress={onBack}>
                    <Text style={styles.resultsButtonSecondaryText}>Back to Lessons</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  )
}

// Minimum Score Alert - EXACT SwiftUI Adventure5Module3MinimumScoreAlertView
interface MinimumScoreAlertProps {
  onRetry: () => void
  onContinueAnyway: () => void
}

function MinimumScoreAlert({ onRetry, onContinueAnyway }: MinimumScoreAlertProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start()
  }, [scaleAnim])

  return (
    <View style={styles.alertOverlay}>
      <Animated.View style={[styles.alertCard, { transform: [{ scale: scaleAnim }] }]}>
        {/* Icon and title */}
        <View style={styles.alertHeader}>
          <View style={styles.alertIcon}>
            <Ionicons name="warning" size={24} color="white" />
          </View>
          <Text style={styles.alertTitle}>Minimum Score Required</Text>
        </View>

        {/* Message */}
        <Text style={styles.alertMessage}>
          You need to answer at least 2 questions correctly to complete the quiz and unlock the adventure.
        </Text>

        {/* Buttons */}
        <View style={styles.alertButtons}>
          <TouchableOpacity style={styles.alertRetryButton} onPress={onRetry}>
            <Text style={styles.alertRetryText}>TRY AGAIN</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onContinueAnyway}>
            <Text style={styles.alertContinueText}>Continue to Results</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  )
}

export default function Adventure5_Module3_Quiz({ onDismiss, onBack }: Adventure5_Module3_QuizProps) {
  // EXACT SwiftUI state variables
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0) // @State private var currentQuestionIndex = 0
  const [showResults, setShowResults] = useState(false) // @State private var showResults = false
  const [showExplanation, setShowExplanation] = useState(false) // @State private var showExplanation = false
  const [correctAnswers, setCorrectAnswers] = useState(0) // @State private var correctAnswers = 0
  const [totalPoints, setTotalPoints] = useState(0) // @State private var totalPoints = 0
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([null, null, null, null, null]) // @State private var userAnswers: [Int?] = [nil, nil, nil, nil, nil]
  const [showMinimumScoreAlert, setShowMinimumScoreAlert] = useState(false) // @State private var showMinimumScoreAlert = false

  // Additional state for individual questions
  const [selectedMCQOption, setSelectedMCQOption] = useState<number | null>(null)
  const [selectedTrueFalse, setSelectedTrueFalse] = useState<number | null>(null)
  const [selectedFillBlank, setSelectedFillBlank] = useState<string | null>(null)

  // Progress context integration
  const { completeQuiz } = useProgress()

  // Get current question
  const currentQuestion = quizQuestions[currentQuestionIndex]

  // Check if answer selected based on question type
  const isAnswerSelected = () => {
    if (currentQuestion.type === 'mcq') {
      return selectedMCQOption !== null
    } else if (currentQuestion.type === 'trueFalse') {
      return selectedTrueFalse !== null
    } else if (currentQuestion.type === 'fillInBlank') {
      return selectedFillBlank !== null
    }
    return false
  }

  // Check if current answer is correct
  const checkAnswer = (questionIndex: number, answer: number | null) => {
    if (answer === null) return false
    return answer === quizQuestions[questionIndex].correctAnswer
  }

  // Render MCQ options
  const renderMCQOptions = () => {
    return (
      <View style={styles.mcqOptionsContainer}>
        {currentQuestion.options?.map((option, index) => (
          <MCQOptionButton
            key={index}
            letter={String.fromCharCode(65 + index)} // A, B, C, D
            text={option}
            isSelected={selectedMCQOption === index}
            onPress={() => setSelectedMCQOption(index)}
            forceCenter={currentQuestionIndex === 2 || currentQuestionIndex === 3} // Questions 3 & 4 - True/False center align
          />
        ))}
      </View>
    )
  }

  // Render True/False options (for questions that use True/False format)
  const renderTrueFalseOptions = () => {
    return (
      <View style={styles.trueFalseOptionsContainer}>
        <TrueFalseOptionButton
          isTrue={true}
          isSelected={selectedTrueFalse === 0} // True = 0 for these questions
          onPress={() => setSelectedTrueFalse(0)}
        />
        <TrueFalseOptionButton
          isTrue={false}
          isSelected={selectedTrueFalse === 1} // False = 1 for these questions
          onPress={() => setSelectedTrueFalse(1)}
        />
      </View>
    )
  }

  // Render question content based on type
  const renderQuestionContent = () => {
    if (currentQuestion.type === 'mcq') {
      // Questions 3 & 4 are True/False format but stored as MCQ
      if (currentQuestionIndex === 2 || currentQuestionIndex === 3) {
        return renderTrueFalseOptions()
      }
      return renderMCQOptions()
    } else if (currentQuestion.type === 'trueFalse') {
      return renderTrueFalseOptions()
    }
    return null
  }

  // Handle answer submission
  const handleSubmit = () => {
    let selectedAnswer: number | null = null

    if (currentQuestion.type === 'mcq') {
      selectedAnswer = selectedMCQOption
    } else if (currentQuestion.type === 'trueFalse') {
      selectedAnswer = selectedTrueFalse
    }

    if (selectedAnswer !== null) {
      // Store user answer
      const newUserAnswers = [...userAnswers]
      newUserAnswers[currentQuestionIndex] = selectedAnswer
      setUserAnswers(newUserAnswers)

      // Check if correct
      if (selectedAnswer === currentQuestion.correctAnswer) {
        setCorrectAnswers(correctAnswers + 1)
        setTotalPoints(totalPoints + currentQuestion.points)
      }

      // Show explanation
      setShowExplanation(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
  }

  // Handle explanation continue
  const handleExplanationContinue = () => {
    setShowExplanation(false)

    // Reset selection states
    setSelectedMCQOption(null)
    setSelectedTrueFalse(null)
    setSelectedFillBlank(null)

    if (currentQuestionIndex < quizQuestions.length - 1) {
      // Next question
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Quiz complete
      setShowResults(true)
    }
  }

  // Calculate results
  const calculateResults = () => {
    const totalQuestions = quizQuestions.length
    const percentage = Math.round((correctAnswers / totalQuestions) * 100)
    const passed = percentage >= 40 // 40% minimum passing score

    return { totalQuestions, percentage, passed }
  }

  // Handle quiz completion
  const handleQuizCompletion = () => {
    const { percentage, passed } = calculateResults()

    if (passed) {
      // Mark quiz as completed in progress context
      completeQuiz(5, 3, correctAnswers, quizQuestions.length)
      onDismiss() // Close quiz
    } else {
      // Show minimum score alert
      setShowMinimumScoreAlert(true)
    }
  }

  // Reset quiz for retry
  const resetQuiz = () => {
    setCurrentQuestionIndex(0)
    setShowResults(false)
    setShowExplanation(false)
    setCorrectAnswers(0)
    setTotalPoints(0)
    setUserAnswers([null, null, null, null, null])
    setShowMinimumScoreAlert(false)
    setSelectedMCQOption(null)
    setSelectedTrueFalse(null)
    setSelectedFillBlank(null)
  }


  // Show results screen
  if (showResults) {
    return <QuizResultsView
      correctAnswers={correctAnswers}
      totalQuestions={5}
      totalPoints={totalPoints}
      onRetake={resetQuiz}
      onGoToAdventure={handleQuizCompletion}
      onBack={onBack || onDismiss}
    />
  }

  return (
    <>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor={ArchivesTheme.colors.creamWhite} />
      )}
      <SafeAreaView style={Platform.OS === 'android' ? styles.containerAndroid : styles.container}>
        {/* Current question */}
        <QuizQuestion
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={5}
          question={currentQuestion.question}
          image={currentQuestion.image}
          onSubmit={handleSubmit}
          isAnswerSelected={isAnswerSelected()}
          questionType="mcq"
          onBack={onBack || onDismiss}
          quizTitle="Module 3 Quiz"
        >
          {renderQuestionContent()}
        </QuizQuestion>

        {/* Explanation popup */}
        <ExplanationPopup
          isVisible={showExplanation}
          isCorrect={checkAnswer(currentQuestionIndex, selectedMCQOption || selectedTrueFalse)}
          points={currentQuestion.points}
          explanation={currentQuestion.explanation}
          onContinue={handleExplanationContinue}
        />

        {/* Minimum score alert - EXACT SwiftUI: Adventure5Module3MinimumScoreAlertView */}
        {showMinimumScoreAlert && (
          <MinimumScoreAlert
            onRetry={() => {
              setShowMinimumScoreAlert(false)
              resetQuiz()
            }}
            onContinueAnyway={() => {
              setShowMinimumScoreAlert(false)
              setShowResults(true)
            }}
          />
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  containerAndroid: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
    paddingTop: 0,
  },

  // MCQ Options - EXACT SwiftUI styling
  mcqOptionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 80,
  },

  // True/False Options - EXACT SwiftUI styling
  trueFalseOptionsContainer: {
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 80,
    gap: 30,
  },

  // Results View - EXACT SwiftUI styling
  resultsContainer: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  resultsScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },

  resultsHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },

  resultsImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
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
    fontSize: 24,
    fontWeight: '600',
    color: ArchivesTheme.colors.persianOrange,
    fontFamily: 'DM Sans',
    textAlign: 'center',
    marginBottom: 20,
  },

  resultsMessage: {
    fontSize: 18,
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 25,
  },

  resultsButtonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 25,
  },

  resultsButton: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  resultsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.creamWhite,
    fontFamily: 'DM Sans',
  },

  resultsButtonSecondary: {
    backgroundColor: 'transparent',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.mutedNavy,
    minWidth: 200,
    alignItems: 'center',
  },

  resultsButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
  },

  // Minimum Score Alert - EXACT SwiftUI styling
  minimumScoreOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  minimumScoreAlert: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 350,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.persianOrange,
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
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

  minimumScoreButtonContainer: {
    gap: 15,
  },

  minimumScoreButton: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },

  minimumScoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.creamWhite,
    fontFamily: 'DM Sans',
  },

  minimumScoreButtonSecondary: {
    backgroundColor: 'transparent',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ArchivesTheme.colors.mutedNavy,
    alignItems: 'center',
  },

  minimumScoreButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
  },

  // MinimumScoreAlert styles - EXACT SwiftUI Adventure5Module3MinimumScoreAlertView
  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertCard: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  alertHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ArchivesTheme.colors.persianOrange,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 14,
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  alertButtons: {
    gap: 12,
  },
  alertRetryButton: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertRetryText: {
    fontSize: 14,
    fontWeight: '600',
    color: ArchivesTheme.colors.creamWhite,
    fontFamily: 'DM Sans',
    letterSpacing: 0.5,
  },
  alertContinueText: {
    fontSize: 14,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
    textAlign: 'center',
    paddingVertical: 8,
  },
})