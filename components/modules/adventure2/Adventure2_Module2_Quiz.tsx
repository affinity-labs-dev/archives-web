// Adventure2_Module2_Quiz.tsx - EXACT replica of SwiftUI Adventure2_Module2_Quiz.swift
// 5-question quiz about Abd al-Malik's monetary reforms

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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { useProgress } from '@/context/ProgressContext'
import { useQuizSounds } from '@/hooks/useQuizSounds'
import { analyticsService } from '@/services/AnalyticsService'
import {
  QuizQuestion,
  MCQOptionButton,
  TrueFalseOptionButton,
  ExplanationPopup,
  VideoRewardPlayer,
  getQuizResultMessages,
} from '../QuizSystem'

const { width } = Dimensions.get('window')

interface Adventure2_Module2_QuizProps {
  onDismiss: () => void
  onBack?: () => void
}

// Quiz Data - Module 2 questions about Abd al-Malik's monetary reforms
const quizQuestions = [
  {
    question: "In what year did Abd al-Malik launch his coin reform?",
    correctAnswer: 2, // C) 696 CE
    explanation: "Abd al-Malik launched his comprehensive coin reform in 696 CE, standardizing currency across the Umayyad Empire and establishing Arabic as the official language of coinage.",
    points: 10,
    type: 'mcq' as const,
    options: ["661 CE", "680 CE", "696 CE", "750 CE"],
    image: require('@/assets/images/quiz-images/Reader.png')
  },
  {
    question: "After the reform, coins still showed the ruler's face.",
    correctAnswer: 1, // B) No
    explanation: "No. After the reform, coins no longer showed the ruler's face. Instead, they featured Arabic inscriptions and Islamic symbols, marking a significant shift from Byzantine and Sasanian traditions.",
    points: 10,
    type: 'mcq' as const,
    options: ["Yes", "No"],
    image: require('@/assets/images/quiz-images/scroll.png')
  },
  {
    question: "The partner metal to the gold dinar was the ____ dirham.",
    correctAnswer: 0, // A) Silver
    explanation: "The silver dirham was the partner currency to the gold dinar, creating a standardized bimetallic monetary system that facilitated trade across the Umayyad Empire.",
    points: 10,
    type: 'mcq' as const,
    options: ["Silver", "Copper", "Bronze", "Iron"],
    image: require('@/assets/images/quiz-images/ship.png')
  },
  {
    question: "Why did having the same weight and Arabic words on every dinar help merchants?",
    correctAnswer: 3, // D) Built trust for fair trade
    explanation: "Standardized weight and Arabic inscriptions built trust among merchants by ensuring consistent value and authenticity across the empire, facilitating long-distance trade and commerce.",
    points: 10,
    type: 'mcq' as const,
    options: ["Let people play games", "Made coins shine brighter", "Showed rulers changed often", "Built trust for fair trade"],
    image: require('@/assets/images/quiz-images/Camel.png')
  },
  {
    question: "Coins written in Arabic let buyers read them anywhere in the empire.",
    correctAnswer: 0, // A) True
    explanation: "True. Arabic inscriptions on coins allowed buyers throughout the empire to read and verify the currency, facilitating trade and commerce across diverse linguistic regions.",
    points: 10,
    type: 'trueFalse' as const,
    image: require('@/assets/images/quiz-images/writer.png')
  }
]

export default function Adventure2_Module2_Quiz({ onDismiss, onBack }: Adventure2_Module2_QuizProps) {
  // EXACT SwiftUI state variables
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0) // @State private var currentQuestionIndex = 0
  const [showResults, setShowResults] = useState(false) // @State private var showResults = false
  const [showExplanation, setShowExplanation] = useState(false) // @State private var showExplanation = false
  const [correctAnswers, setCorrectAnswers] = useState(0) // @State private var correctAnswers = 0
  const [totalPoints, setTotalPoints] = useState(0) // @State private var totalPoints = 0
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([null, null, null, null, null]) // @State private var userAnswers: [Int?] = [nil, nil, nil, nil, nil]
  const [showMinimumScoreAlert, setShowMinimumScoreAlert] = useState(false) // @State private var showMinimumScoreAlert = false
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())

  // Additional state for individual questions
  const [selectedMCQOption, setSelectedMCQOption] = useState<number | null>(null)
  const [selectedTrueFalse, setSelectedTrueFalse] = useState<number | null>(null)

  const { updateModuleProgress } = useProgress()
  const { playTap, playCorrect, playIncorrect } = useQuizSounds()

  // Track when each new question is shown
  useEffect(() => {
    setQuestionStartTime(Date.now())
  }, [currentQuestionIndex])

  // Handle submit - EXACT SwiftUI: handleSubmit()
  const handleSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      playCorrect()
      setCorrectAnswers(prev => prev + 1)
      setTotalPoints(prev => prev + quizQuestions[currentQuestionIndex].points)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      playIncorrect()
    }

    // Track quiz question answer in analytics
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000)
    let userAnswer = ''
    let correctAnswer = ''

    if (currentQuestion.type === 'mcq') {
      userAnswer = currentQuestion.options?.[selectedMCQOption!] || ''
      correctAnswer = currentQuestion.options?.[currentQuestion.correctAnswer] || ''
    } else if (currentQuestion.type === 'trueFalse') {
      userAnswer = selectedTrueFalse === 0 ? 'True' : 'False'
      correctAnswer = currentQuestion.correctAnswer === 0 ? 'True' : 'False'
    }

    analyticsService.trackQuizQuestionAnswered({
      adventure_id: 2,
      module_id: 2,
      question_number: currentQuestionIndex + 1,
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      is_correct: isCorrect,
      time_taken_seconds: timeTaken,
    })

    setShowExplanation(true)
  }

  // Check answer - EXACT SwiftUI: checkAnswer() -> Bool
  const checkAnswer = (questionIndex: number, userAnswer: number | null): boolean => {
    if (userAnswer === null) return false
    
    return userAnswer === quizQuestions[questionIndex].correctAnswer
  }

  // Quiz completion celebration haptic
  const celebrateQuizCompletion = (finalScore: number) => {
    if (finalScore === 5) {
      // Perfect score - escalating celebration
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100)
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200)
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 300)
    } else if (finalScore >= 2) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }

  // Handle explanation continue - EXACT SwiftUI: onContinue in ExplanationView
  const handleExplanationContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (currentQuestionIndex < 4) {
      // Move to next question (0-4 for 5 questions)
      setCurrentQuestionIndex(prev => prev + 1)
      setShowExplanation(false)
      resetCurrentQuestion()
    } else {
      // Quiz completed - check minimum score requirement (need at least 1 out of 5)
      if (correctAnswers >= 1) {
        celebrateQuizCompletion(correctAnswers)
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

  // Handle quiz completion and return to adventure - EXACT SwiftUI: onGoToAdventure
  const handleGoToAdventure = async () => {
    try {
      await updateModuleProgress(2, 2, {
        lessonsCompleted: ['lesson1', 'lesson2'],
        isCompleted: true, // Module completed when quiz passed
        quizCompleted: true,
        quizScore: correctAnswers // Store the number of correct answers for star rating
      })
      
      onDismiss()
    } catch (error) {
      console.error('❌ Failed to save quiz progress:', error)
      // Still dismiss to prevent user being stuck, but log the error
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
              onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              playTap()
              setSelectedMCQOption(index)
            }}
              forceCenter={currentQuestionIndex === 0 || currentQuestionIndex === 1 || currentQuestionIndex === 2} // Q1, Q2, Q3 center aligned
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
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              playTap()
              setSelectedTrueFalse(0)
            }}
          />

          {/* False option */}
          <TrueFalseOptionButton
            isTrue={false}
            isSelected={selectedTrueFalse === 1}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              playTap()
              setSelectedTrueFalse(1)
            }}
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

        {/* Minimum score alert - EXACT SwiftUI: Adventure2Module2MinimumScoreAlertView */}
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

// Quiz Results View - EXACT SwiftUI Adventure2Module2QuizResultsView
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
  const passed = percentage >= 70 // EXACT SwiftUI: private var passed: Bool
  const canAccessAdventure = correctAnswers >= 1 // EXACT SwiftUI: private var canAccessAdventure: Bool - Need at least 1/5

  // Get dynamic messages based on score
  const messages = getQuizResultMessages(correctAnswers, totalQuestions);

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
            <VideoRewardPlayer correctAnswers={correctAnswers} />

            <Text style={styles.resultsTitle}>
              {messages.title}
            </Text>

            <Text style={styles.resultsSubtitle}>
              {messages.subtitle}
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

// Minimum Score Alert - EXACT SwiftUI Adventure2Module2MinimumScoreAlertView
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
    backgroundColor: ArchivesTheme.colors.creamWhite, // EXACT SwiftUI: Color("CreamWhite")
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
    paddingHorizontal: 20, // EXACT iOS: .padding(.horizontal, 20)
    paddingTop: 40, // EXACT iOS: .padding(.top, 40)
    gap: 30, // EXACT iOS: HStack(spacing: 30)
  },

  // Results View - EXACT SwiftUI Adventure2Module2QuizResultsView
  resultsContainer: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingTop: 60, // Increased top padding for better spacing
    paddingHorizontal: 20,
  },
  resultsHeader: {
    alignItems: 'center',
    marginBottom: 30, // EXACT SwiftUI: VStack spacing: 30
  },
  resultsTitle: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 28))
    fontSize: 28,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy, // EXACT SwiftUI: Color("MutedNavy")
    textAlign: 'center',
    marginBottom: 8,
  },
  resultsSubtitle: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 16))
    fontSize: 16,
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    textAlign: 'center', // EXACT SwiftUI: .multilineTextAlignment(.center)
  },

  // Statistics Card - EXACT SwiftUI structure
  statsCard: {
    padding: 24, // EXACT SwiftUI: .padding(24)
    backgroundColor: 'white',
    borderRadius: 16, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 16)
    marginBottom: 30,
    // EXACT SwiftUI shadow: .shadow(radius: 4)
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row', // EXACT SwiftUI: HStack(spacing: 40)
    alignItems: 'center',
    marginBottom: 20, // EXACT SwiftUI: VStack spacing: 20
  },
  statsLeft: {
    alignItems: 'center',
    marginRight: 40,
  },
  percentageText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 42))
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 8, // EXACT SwiftUI: VStack spacing: 8
  },
  finalScoreText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
  },
  statsRight: {
    flex: 1,
    alignItems: 'flex-end', // EXACT SwiftUI: VStack(alignment: .trailing)
  },
  xpRow: {
    flexDirection: 'row', // EXACT SwiftUI: HStack(spacing: 8)
    alignItems: 'center',
    marginBottom: 12, // EXACT SwiftUI: VStack spacing: 12
  },
  xpText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    marginLeft: 8,
  },
  correctText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
  },

  // Progress Bar - EXACT SwiftUI GeometryReader structure
  progressBarContainer: {
    height: 16, // EXACT SwiftUI: .frame(height: 16)
    position: 'relative',
  },
  progressBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.2)', // EXACT SwiftUI: Color.gray.opacity(0.2)
    borderRadius: 8, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 8)
  },
  progressBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 16,
    borderRadius: 8, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 8)
    // Width and color set dynamically
  },

  // Action Buttons - EXACT SwiftUI structure
  actionButtons: {
    marginBottom: 30,
  },
  retakeButton: {
    paddingVertical: 16, // EXACT SwiftUI: .padding(.vertical, 16)
    paddingHorizontal: 24, // EXACT SwiftUI: .padding(.horizontal, 24)
    backgroundColor: 'white',
    borderRadius: 16, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 16)
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.mossGreen, // EXACT SwiftUI: .stroke(Color("MossGreen"), lineWidth: 2)
    marginBottom: 16,
    // EXACT SwiftUI shadow: .shadow(radius: 4)
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  retakeButtonContent: {
    flexDirection: 'row', // EXACT SwiftUI: HStack(spacing: 12)
    alignItems: 'center',
  },
  retakeButtonText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    fontWeight: '600', // .fontWeight(.semibold)
    color: ArchivesTheme.colors.mossGreen, // EXACT SwiftUI: Color("MossGreen")
    marginLeft: 12,
    flex: 1,
  },

  adventureButton: {
    paddingVertical: 16, // EXACT SwiftUI: .padding(.vertical, 16)
    paddingHorizontal: 24, // EXACT SwiftUI: .padding(.horizontal, 24)
    backgroundColor: ArchivesTheme.colors.persianOrange, // EXACT SwiftUI: Color("PersianOrange")
    borderRadius: 16, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 16)
    // EXACT SwiftUI shadow: .shadow(radius: 4)
    shadowColor: 'black',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  adventureButtonContent: {
    flexDirection: 'row', // EXACT SwiftUI: HStack(spacing: 12)
    alignItems: 'center',
  },
  adventureButtonText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    fontWeight: '600', // .fontWeight(.semibold)
    color: 'white',
    marginLeft: 12,
    flex: 1,
  },

  // Locked Adventure - EXACT SwiftUI structure
  lockedContainer: {
    paddingVertical: 16, // EXACT SwiftUI: .padding(.vertical, 16)
    paddingHorizontal: 20, // EXACT SwiftUI: .padding(.horizontal, 20)
    alignItems: 'center',
  },
  lockedHeader: {
    flexDirection: 'row', // EXACT SwiftUI: HStack(spacing: 8)
    alignItems: 'center',
    marginBottom: 8,
  },
  lockedTitle: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 16))
    fontSize: 16,
    fontWeight: '600', // .fontWeight(.semibold)
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    marginLeft: 8,
  },
  lockedMessage: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    color: 'rgba(139,96,64,0.7)', // EXACT SwiftUI: Color("ShoeBrown").opacity(0.7)
    textAlign: 'center', // EXACT SwiftUI: .multilineTextAlignment(.center)
    paddingHorizontal: 24, // EXACT SwiftUI: .padding(.horizontal, 24)
  },

  // Minimum Score Alert - EXACT SwiftUI Adventure2Module2MinimumScoreAlertView
  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', // EXACT SwiftUI: Color.black.opacity(0.4)
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: 16, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 16)
    padding: 24, // EXACT SwiftUI: .padding(24)
    maxWidth: 340, // EXACT SwiftUI: .frame(maxWidth: 340)
    // EXACT SwiftUI shadow: .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  alertHeader: {
    alignItems: 'center',
    marginBottom: 20, // EXACT SwiftUI: VStack spacing: 20
  },
  alertIcon: {
    width: 60, // EXACT SwiftUI: .frame(width: 60, height: 60)
    height: 60,
    borderRadius: 30,
    backgroundColor: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12, // EXACT SwiftUI: VStack spacing: 12
  },
  alertTitle: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy, // EXACT SwiftUI: Color("MutedNavy")
    textAlign: 'center',
  },
  alertMessage: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    textAlign: 'center', // EXACT SwiftUI: .multilineTextAlignment(.center)
    lineHeight: 16, // EXACT SwiftUI: .lineSpacing(2)
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  alertButtons: {
    // EXACT SwiftUI: VStack(spacing: 12)
  },
  alertRetryButton: {
    backgroundColor: ArchivesTheme.colors.mossGreen, // EXACT SwiftUI: Color("MossGreen")
    borderRadius: 10, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 10)
    paddingVertical: 12, // EXACT SwiftUI: minHeight: 44 adjusted for padding
    alignItems: 'center',
    marginBottom: 12,
  },
  alertRetryText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 16))
    fontSize: 16,
    fontWeight: '600', // .fontWeight(.semibold)
    color: 'white',
  },
  alertContinueText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    fontWeight: '500', // .fontWeight(.medium)
    color: 'rgba(139,96,64,0.7)', // EXACT SwiftUI: Color("ShoeBrown").opacity(0.7)
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