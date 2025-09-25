// Adventure5_Module2_Quiz.tsx - Quiz about Abbasid Revolutionary Methods and Propaganda
// 5-question quiz testing understanding of Abbasid rebellion tactics, symbols, and messaging

import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { useProgress } from '@/context/ProgressContext'
import {
  QuizQuestion,
  MCQOptionButton,
  TrueFalseOptionButton,
  ExplanationPopup,
} from '../QuizSystem'

interface Adventure5_Module2_QuizProps {
  onDismiss: () => void
  onBack?: () => void
}

// Quiz Data - Abbasid Revolutionary Methods and Propaganda
const quizQuestions = [
  {
    question: "What color banner became the main symbol of the Abbasid revolt?",
    correctAnswer: 3, // D) Black
    explanation: "The Abbasids used black banners as their revolutionary symbol, contrasting with the Umayyads' white banners to show they represented change and opposition to the existing order.",
    points: 10,
    type: 'mcq' as const,
    options: ["Green", "White", "Red", "Black"],
    image: require('@/assets/images/quiz-images/Reader.png')
  },
  {
    question: "The Abbasids said they were descendants of which clan?",
    correctAnswer: 2, // C) Hashimite
    explanation: "The Abbasids claimed descent from the Hashimite clan, the same clan as Prophet Muhammad, which gave them crucial religious legitimacy in their rebellion against the Umayyads.",
    points: 10,
    type: 'mcq' as const,
    options: ["Umayyad", "Ghassanid", "Hashimite", "Lakhmid"],
    image: require('@/assets/images/quiz-images/Map.png')
  },
  {
    question: "'Revenge for Husayn' was one of the Abbasid slogans.",
    correctAnswer: 1, // True
    explanation: "True. 'Revenge for Husayn' was a powerful Abbasid slogan that appealed to those who mourned the death of Husayn, grandson of Prophet Muhammad, and blamed the Umayyads for his martyrdom.",
    points: 10,
    type: 'trueFalse' as const,
    image: require('@/assets/images/quiz-images/books.png')
  },
  {
    question: "The Abbasids relied only on big battles, not on words and ideas, to win support.",
    correctAnswer: 0, // False
    explanation: "False. The Abbasids strategically used propaganda, pamphlets, slogans, and emotional appeals to build widespread support before any major battles. Their revolution succeeded through ideas as much as warfare.",
    points: 10,
    type: 'trueFalse' as const,
    image: require('@/assets/images/quiz-images/Reader.png')
  },
  {
    question: "How did Abbasid supporters quietly spread their message before open fighting began?",
    correctAnswer: 0, // A) Handing out pamphlets and meeting in secret
    explanation: "Abbasid supporters used pamphlets and secret meetings to spread their revolutionary message safely before beginning open rebellion. This grassroots approach built widespread support across the empire.",
    points: 10,
    type: 'mcq' as const,
    options: ["Handing out pamphlets", "Building tall towers", "Changing banner colors", "Starting trade wars"],
    image: require('@/assets/images/quiz-images/books.png')
  }
]

export default function Adventure5_Module2_Quiz({ onDismiss, onBack }: Adventure5_Module2_QuizProps) {
  // EXACT SwiftUI state variables
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([null, null, null, null, null])
  const [showMinimumScoreAlert, setShowMinimumScoreAlert] = useState(false)

  // Additional state for individual questions
  const [selectedMCQOption, setSelectedMCQOption] = useState<number | null>(null)
  const [selectedTrueFalse, setSelectedTrueFalse] = useState<number | null>(null)

  const { atomicProgressUpdate, canRetakeModule } = useProgress()

  // Handle submit - EXACT SwiftUI: handleSubmit()
  const handleSubmit = () => {
    const newUserAnswers = [...userAnswers]
    const currentQuestion = quizQuestions[currentQuestionIndex]

    if (currentQuestion.type === 'mcq') {
      newUserAnswers[currentQuestionIndex] = selectedMCQOption
    } else if (currentQuestion.type === 'trueFalse') {
      newUserAnswers[currentQuestionIndex] = selectedTrueFalse
    }

    setUserAnswers(newUserAnswers)

    // Check if answer is correct and update score
    const isCorrect = checkAnswer(currentQuestionIndex, newUserAnswers[currentQuestionIndex])
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1)
      setTotalPoints(prev => prev + quizQuestions[currentQuestionIndex].points)
    }

    setShowExplanation(true)
  }

  // Check answer - EXACT SwiftUI: checkAnswer() -> Bool
  const checkAnswer = (questionIndex: number, userAnswer: number | null): boolean => {
    if (userAnswer === null) return false
    return userAnswer === quizQuestions[questionIndex].correctAnswer
  }

  // Handle explanation continue - EXACT SwiftUI: onContinue in ExplanationView
  const handleExplanationContinue = () => {
    if (currentQuestionIndex < 4) {
      // Move to next question (0-4 for 5 questions)
      setCurrentQuestionIndex(prev => prev + 1)
      setShowExplanation(false)
      resetCurrentQuestion()
    } else {
      // Quiz completed - check minimum score requirement (need at least 2 out of 5 - 40%)
      if (correctAnswers >= 2) {
        setShowResults(true)
        setShowExplanation(false)
      } else {
        // Show minimum score alert - EXACT SwiftUI behavior
        setShowMinimumScoreAlert(true)
        setShowExplanation(false)
      }
    }
  }

  // Reset current question state
  const resetCurrentQuestion = () => {
    setSelectedMCQOption(null)
    setSelectedTrueFalse(null)
  }

  // Reset entire quiz - EXACT SwiftUI: resetQuiz()
  const resetQuiz = () => {
    setCurrentQuestionIndex(0)
    setShowResults(false)
    setShowExplanation(false)
    setCorrectAnswers(0)
    setTotalPoints(0)
    setUserAnswers([null, null, null, null, null])
    resetCurrentQuestion()
  }

  // Handle quiz completion - NEW ATOMIC SYSTEM
  const handleQuizCompletion = async () => {
    console.log('🚀 Quiz completion: Adventure 5 Module 2')

    try {
      const isRetake = canRetakeModule(5, 2)

      // Use atomic progress update
      await atomicProgressUpdate(5, 2, {
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

  // Get current question
  const currentQuestion = quizQuestions[currentQuestionIndex]

  // Check if current question has an answer selected
  const isAnswerSelected = () => {
    if (currentQuestion.type === 'mcq') {
      return selectedMCQOption !== null
    } else if (currentQuestion.type === 'trueFalse') {
      return selectedTrueFalse !== null
    }
    return false
  }

  // Render question content based on type
  const renderQuestionContent = () => {
    if (currentQuestion.type === 'mcq') {
      return (
        <View style={styles.mcqContainer}>
          {currentQuestion.options?.map((option, index) => (
            <MCQOptionButton
              key={index}
              letter={String.fromCharCode(65 + index)} // A, B, C, D
              text={option}
              isSelected={selectedMCQOption === index}
              onPress={() => setSelectedMCQOption(index)}
            />
          ))}
        </View>
      )
    } else if (currentQuestion.type === 'trueFalse') {
      return (
        <View style={styles.trueFalseContainer}>
          <TrueFalseOptionButton
            isTrue={true}
            isSelected={selectedTrueFalse === 1}
            onPress={() => setSelectedTrueFalse(1)}
          />
          <TrueFalseOptionButton
            isTrue={false}
            isSelected={selectedTrueFalse === 0}
            onPress={() => setSelectedTrueFalse(0)}
          />
        </View>
      )
    }
    return null
  }

  // Show results screen
  if (showResults) {
    return <QuizResultsView
      correctAnswers={correctAnswers}
      totalQuestions={5}
      totalPoints={totalPoints}
      onRetake={resetQuiz}
      onGoToAdventure={handleQuizCompletion}
      onBack={onDismiss}
    />
  }

  return (
    <>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
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
          questionType={currentQuestion.type}
          onBack={onBack || onDismiss}
          quizTitle="Module 2 Quiz"
        >
          {renderQuestionContent()}
        </QuizQuestion>

        {/* Explanation popup */}
        <ExplanationPopup
          isVisible={showExplanation}
          isCorrect={checkAnswer(currentQuestionIndex, userAnswers[currentQuestionIndex])}
          points={currentQuestion.points}
          explanation={currentQuestion.explanation}
          onContinue={handleExplanationContinue}
        />

        {/* Minimum score alert - EXACT SwiftUI: Adventure5Module2MinimumScoreAlertView */}
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

// Quiz Results View - EXACT SwiftUI Adventure5Module2QuizResultsView
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
              {passed ? "Excellent work on the Module 2 quiz!" : "Review the material and try again"}
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

// Minimum Score Alert - EXACT SwiftUI Adventure5Module2MinimumScoreAlertView
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  containerAndroid: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
    paddingTop: 20,
  },

  // MCQ Container
  mcqContainer: {
    // MCQ options handled by QuizSystem component
  },

  // True/False Container - EXACT SwiftUI: HStack(spacing: 30)
  trueFalseContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    gap: 30,
  },

  // Results View - EXACT SwiftUI Adventure5Module2QuizResultsView
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

  // Minimum Score Alert - EXACT SwiftUI Adventure5Module2MinimumScoreAlertView
  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    maxWidth: 340,
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  alertHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  alertIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ArchivesTheme.colors.shoeBrown,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
  },
  alertMessage: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  alertButtons: {
    // EXACT SwiftUI: VStack(spacing: 12)
  },
  alertRetryButton: {
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  alertRetryText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  alertContinueText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(139,96,64,0.7)',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Results back button styles
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
});