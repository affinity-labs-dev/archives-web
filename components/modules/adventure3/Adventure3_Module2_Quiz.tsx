// Adventure3_Module2_Quiz.tsx - EXACT replica of SwiftUI Adventure3_Module2_Quiz.swift
// 5-question quiz about Ṭarīq ibn Ziyād's conquest and establishment of Al-Andalus

import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
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
  ExplanationPopup,
} from '../QuizSystem'

const { width } = Dimensions.get('window')

interface Adventure3_Module2_QuizProps {
  onDismiss: () => void
  onBack?: () => void
}

// Quiz Data - Module 2 questions about Ṭarīq ibn Ziyād's conquest and Al-Andalus
const quizQuestions = [
  {
    question: "In what year did Tariq ibn Ziyad land in Iberia?",
    correctAnswer: 1, // B) 711 CE
    explanation: "Ṭarīq ibn Ziyād landed in Iberia in 711 CE, beginning the Islamic conquest of the peninsula that would establish Al-Andalus.",
    points: 10,
    type: 'mcq' as const,
    options: ["700 CE", "711 CE", "732 CE", "755 CE"],
    image: require('@/assets/images/quiz-images/navigation.png')
  },
  {
    question: "What bold order did Tariq give after landing?",
    correctAnswer: 2, // C) Burn the ships
    explanation: "Ṭarīq famously ordered his ships to be burned after landing, eliminating any possibility of retreat and ensuring his forces were fully committed to the conquest.",
    points: 10,
    type: 'mcq' as const,
    options: ["Split the army", "Hide their supplies", "Burn the ships", "Wait for help"],
    image: require('@/assets/images/quiz-images/Map.png')
  },
  {
    question: "The name 'Gibraltar' comes from the Arabic Jabal Tariq.",
    correctAnswer: 0, // A) True
    explanation: "True. Gibraltar derives its name from 'Jabal Ṭarīq', meaning 'Mountain of Ṭarīq', named after the general who led the conquest and landed at this strategic location.",
    points: 10,
    type: 'trueFalse' as const,
    image: require('@/assets/images/quiz-images/books.png')
  },
  {
    question: "Did Tariq's men plan to sail back to Africa?",
    correctAnswer: 1, // B) No
    explanation: "No. By burning the ships, Ṭarīq ensured that his men could not sail back to Africa. They were committed to either conquering the land or dying in the attempt.",
    points: 10,
    type: 'mcq' as const,
    options: ["Yes", "No"],
    image: require('@/assets/images/quiz-images/Reader.png')
  },
  {
    question: "What does Jabal Tariq mean in English?",
    correctAnswer: 3, // D) Mountain of Ṭarīq
    explanation: "Jabal Ṭarīq means 'Mountain of Ṭarīq' in English, named after the commander who led the conquest and landed at this strategic cliff.",
    points: 10,
    type: 'mcq' as const,
    options: ["Mountain of Eagles", "River of Kings", "City of Dawn", "Mountain of Ṭarīq"],
    image: require('@/assets/images/quiz-images/books.png')
  }
]

export default function Adventure3_Module2_Quiz({ onDismiss, onBack }: Adventure3_Module2_QuizProps) {
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

  const { updateModuleProgress, completeModule } = useProgress()

  console.log('🚀 DEBUG: Adventure3_Module2_Quiz appeared')

  // Initialize quiz state on component mount - ensure perfect start logic
  useEffect(() => {
    console.log('🚀 DEBUG: Initializing Adventure3_Module2_Quiz with clean state')
    // Reset all selections to ensure clean start
    setCurrentQuestionIndex(0)
    setShowResults(false)
    setShowExplanation(false)
    setCorrectAnswers(0)
    setTotalPoints(0)
    setUserAnswers([null, null, null, null, null])
    setShowMinimumScoreAlert(false)
    setSelectedMCQOption(null)
    setSelectedTrueFalse(null)
  }, []) // Run only on mount

  // Handle submit
  const handleSubmit = () => {
    console.log('🚀 DEBUG: Quiz submit pressed for question', currentQuestionIndex + 1)
    
    // Store the user's answer based on question type
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

  // Check answer
  const checkAnswer = (questionIndex: number, userAnswer: number | null): boolean => {
    if (userAnswer === null) return false
    
    return userAnswer === quizQuestions[questionIndex].correctAnswer
  }

  // Handle explanation continue
  const handleExplanationContinue = () => {
    if (currentQuestionIndex < 4) {
      // Move to next question (0-4 for 5 questions)
      setCurrentQuestionIndex(prev => prev + 1)
      setShowExplanation(false)
      resetCurrentQuestion()
    } else {
      // Quiz completed - check minimum score requirement (need at least 1 out of 5)
      if (correctAnswers >= 1) {
        setShowResults(true)
        setShowExplanation(false)
      } else {
        // Show minimum score alert
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

  // Reset entire quiz
  const resetQuiz = () => {
    setCurrentQuestionIndex(0)
    setShowResults(false)
    setShowExplanation(false)
    setCorrectAnswers(0)
    setTotalPoints(0)
    setUserAnswers([null, null, null, null, null])
    resetCurrentQuestion()
  }

  // Handle quiz completion and return to adventure
  const handleGoToAdventure = async () => {
    console.log('🚀 DEBUG: Go to Adventure button pressed in Adventure3_Module2_Quiz')
    console.log('🚀 DEBUG: Setting adv3_mod2 completion to true')
    
    try {
      // First update module progress with quiz score
      await updateModuleProgress(3, 2, {
        lessonsCompleted: ['lesson1', 'lesson2'],
        quizCompleted: true,
        quizScore: correctAnswers // Store the number of correct answers for star rating
      })
      
      // Then complete the module - this triggers adventure unlocking logic
      await completeModule(3, 2)
      
      console.log('🚀 DEBUG: Module completed successfully')
      console.log('🚀 DEBUG: Calling onDismiss to return to Era')
    } catch (error) {
      console.error('🚨 Error completing module:', error)
    }
    
    onDismiss()
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
      // Use left alignment for questions with longer options
      // Question 2: What bold order did Tariq give after landing?
      // Question 5: What does Jabal Tariq mean in English?
      const shouldLeftAlign = currentQuestionIndex === 1 || currentQuestionIndex === 4
      
      return (
        <View style={styles.mcqContainer}>
          {currentQuestion.options?.map((option, index) => (
            <MCQOptionButton
              key={index}
              letter={String.fromCharCode(65 + index)} // A, B, C, D
              text={option}
              isSelected={selectedMCQOption === index}
              onPress={() => setSelectedMCQOption(index)}
              forceCenter={!shouldLeftAlign}
            />
          ))}
        </View>
      )
    } else if (currentQuestion.type === 'trueFalse') {
      return (
        <View style={styles.trueFalseContainer}>
          {/* True option */}
          <TrueFalseOptionButton
            isTrue={true}
            isSelected={selectedTrueFalse === 0}
            onPress={() => setSelectedTrueFalse(0)}
          />
          
          {/* False option */}
          <TrueFalseOptionButton
            isTrue={false}
            isSelected={selectedTrueFalse === 1}
            onPress={() => setSelectedTrueFalse(1)}
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
      onGoToAdventure={handleGoToAdventure}
      onBack={onDismiss}
    />
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={ArchivesTheme.colors.creamWhite} />
      <SafeAreaView style={styles.container}>
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

        {/* Minimum score alert */}
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

// Quiz Results View - same as Module 1 but for Module 2
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
  const passed = percentage >= 70
  const canAccessAdventure = correctAnswers >= 1 // Need at least 1/5

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
          {/* Header */}
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

          {/* Statistics card */}
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

            {/* Progress bar */}
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

          {/* Action buttons */}
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
                  Answer at least one question correctly to unlock the adventure
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// Minimum Score Alert
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
          You need to answer at least one question correctly to complete the quiz and unlock the adventure.
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

  // MCQ Container
  mcqContainer: {
    // MCQ options handled by QuizSystem component
  },

  // True/False Container
  trueFalseContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    gap: 30,
  },

  // Results View - same styles as Module1Quiz
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

  // Statistics Card
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

  // Progress Bar
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

  // Action Buttons
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

  // Locked Adventure
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

  // Minimum Score Alert
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
    // Vertical button layout
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