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
    type: 'trueFalse' as const,
    options: ["True", "False"],
    image: require('@/assets/images/lesson-content/map.png')
  },
  {
    question: "Did every member of the Umayyad family lose power after 750 CE?",
    correctAnswer: 1, // B) False
    explanation: "No, while the Umayyads fell in the East, some family members escaped west and later established rule in Cordoba, Spain, continuing their dynasty there.",
    points: 10,
    type: 'trueFalse' as const,
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
  const percentage = Math.round((correctAnswers * 100) / totalQuestions)
  const passed = percentage >= 40
  const canAccessAdventure = correctAnswers >= 2

  return (
    <View style={styles.resultsContainer}>
      {/* Back button for results */}
      {onBack && (
        <SafeAreaView style={styles.resultsBackButtonContainer}>
          <TouchableOpacity style={styles.resultsBackButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color={ArchivesTheme.colors.shoeBrown} />
          </TouchableOpacity>
        </SafeAreaView>
      )}

      <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.resultsContent}>
          {/* Header - EXACT SwiftUI structure */}
          <View style={styles.resultsHeader}>
            <View style={[
              styles.resultsIconContainer,
              { backgroundColor: passed ? ArchivesTheme.colors.mossGreen : ArchivesTheme.colors.shoeBrown }
            ]}>
              <Ionicons
                name={passed ? "trophy" : "refresh"}
                size={50}
                color="white"
              />
            </View>

            <Text style={styles.resultsTitle}>
              {passed ? "Quiz Completed!" : "Keep Learning!"}
            </Text>

            <Text style={styles.resultsSubtitle}>
              {passed ? "Excellent work on the Module 3 quiz!" : "Review the material and try again"}
            </Text>
          </View>

          {/* Statistics card - EXACT SwiftUI structure */}
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statsLeft}>
                <Text style={[
                  styles.percentageText,
                  { color: passed ? ArchivesTheme.colors.mossGreen : ArchivesTheme.colors.shoeBrown }
                ]}>
                  {percentage}%
                </Text>
                <Text style={styles.finalScoreText}>Final Score</Text>
              </View>

              <View style={styles.statsRight}>
                <View style={styles.xpRow}>
                  <Ionicons name="star" size={18} color={ArchivesTheme.colors.shoeBrown} />
                  <Text style={styles.xpText}>{totalPoints} XP</Text>
                </View>
                <Text style={styles.correctText}>Correct: {correctAnswers}/{totalQuestions}</Text>
              </View>
            </View>

            {/* Progress bar - EXACT SwiftUI GeometryReader equivalent */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground} />
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: passed ? ArchivesTheme.colors.mossGreen : ArchivesTheme.colors.shoeBrown
                  }
                ]}
              />
            </View>
          </View>

          {/* Action buttons - EXACT SwiftUI structure */}
          <View style={styles.actionButtons}>
            {/* Retake Quiz button */}
            <TouchableOpacity style={styles.retakeButton} onPress={onRetake}>
              <View style={styles.retakeButtonContent}>
                <Ionicons name="refresh-circle" size={24} color={ArchivesTheme.colors.mossGreen} />
                <Text style={styles.retakeButtonText}>Retake Quiz</Text>
              </View>
            </TouchableOpacity>

            {/* Go to Adventure button or locked message */}
            {canAccessAdventure ? (
              <TouchableOpacity style={styles.adventureButton} onPress={onGoToAdventure}>
                <View style={styles.adventureButtonContent}>
                  <Ionicons name="map" size={24} color="white" />
                  <Text style={styles.adventureButtonText}>Go to Adventure</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.lockedContainer}>
                <View style={styles.lockedHeader}>
                  <Ionicons name="lock-closed" size={24} color={ArchivesTheme.colors.shoeBrown} />
                  <Text style={styles.lockedTitle}>Adventure Locked</Text>
                </View>
                <Text style={styles.lockedMessage}>
                  Answer at least 2 questions correctly to unlock the adventure
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
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

  // Progress context integration - NEW ATOMIC SYSTEM
  const { atomicProgressUpdate, canRetakeModule } = useProgress()

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
            onPress={() => {
              Haptics.selectionAsync()
              setSelectedMCQOption(index)
            }}
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
          onPress={() => {
              Haptics.selectionAsync()
              setSelectedTrueFalse(0)
            }}
        />
        <TrueFalseOptionButton
          isTrue={false}
          isSelected={selectedTrueFalse === 1} // False = 1 for these questions
          onPress={() => {
              Haptics.selectionAsync()
              setSelectedTrueFalse(1)
            }}
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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

  // Handle quiz completion - NEW ATOMIC SYSTEM
  const handleQuizCompletion = async () => {
    console.log('🚀 Quiz completion: Adventure 5 Module 3')

    try {
      const isRetake = canRetakeModule(5, 3)

      // Use atomic progress update
      await atomicProgressUpdate(5, 3, {
        type: isRetake ? 'QUIZ_RETAKEN' : 'QUIZ_COMPLETED',
        quizScore: correctAnswers,
        quizCorrectAnswers: correctAnswers
      })

      console.log('✅ Quiz progress saved successfully')
      onDismiss()
    } catch (error) {
      console.error('❌ Failed to save quiz progress:', error)
      // Still dismiss to prevent user being stuck
      onDismiss()
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

  // Results View - EXACT SwiftUI Adventure5Module3QuizResultsView
  resultsContainer: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  resultsHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resultsIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: 'black',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  resultsTitle: {
    fontFamily: 'DM Sans',
    fontSize: 28,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginBottom: 8,
  },
  resultsSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
  },

  // Statistics Card - EXACT SwiftUI structure
  statsCard: {
    padding: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 30,
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsLeft: {
    alignItems: 'center',
    marginRight: 40,
  },
  percentageText: {
    fontFamily: 'DM Sans',
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  finalScoreText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
  },
  statsRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  xpText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
    marginLeft: 8,
  },
  correctText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
  },

  // Progress Bar - EXACT SwiftUI GeometryReader structure
  progressBarContainer: {
    height: 16,
    position: 'relative',
  },
  progressBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
  },
  progressBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 16,
    borderRadius: 8,
  },

  // Action Buttons - EXACT SwiftUI structure
  actionButtons: {
    marginBottom: 30,
  },
  retakeButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.mossGreen,
    marginBottom: 16,
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  retakeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retakeButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '600',
    color: ArchivesTheme.colors.mossGreen,
    marginLeft: 12,
    flex: 1,
  },

  adventureButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: ArchivesTheme.colors.persianOrange,
    borderRadius: 16,
    shadowColor: 'black',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  adventureButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adventureButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 12,
    flex: 1,
  },

  // Locked Adventure - EXACT SwiftUI structure
  lockedContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockedTitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.shoeBrown,
    marginLeft: 8,
  },
  lockedMessage: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: 'rgba(139,96,64,0.7)',
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  resultsBackButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 20,
    paddingTop: 8,
    paddingLeft: 16,
  },
  resultsBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139,96,64,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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