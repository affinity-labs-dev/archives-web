// Adventure4_Module1_Quiz.tsx - EXACT replica of SwiftUI Adventure4_Module1_Quiz.swift
// 5-question quiz with MCQ + True/False + explanations and results

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
import { useQuizSounds } from '@/hooks/useQuizSounds'
import {
  QuizQuestion,
  MCQOptionButton,
  TrueFalseOptionButton,
  FillBlankOption,
  ExplanationPopup,
  VideoRewardPlayer,
  getQuizResultMessages,
} from '../QuizSystem'

const { width } = Dimensions.get('window')

interface Adventure4_Module1_QuizProps {
  onDismiss: () => void
  onBack?: () => void
}

// Quiz Data - Module 1: Great Mosque of Damascus Mosaics
const quizQuestions = [
  {
    question: "Artists from which former empire made the mosque's sparkling mosaics?",
    correctAnswer: 3, // D) Byzantium
    explanation: "The Umayyads invited expert Byzantine mosaic artists to create the beautiful decorative mosaics in the Great Mosque of Damascus, showing their appreciation for skill regardless of origin.",
    points: 10,
    type: 'mcq' as const,
    options: ["Persia", "India", "Egypt", "Byzantium"],
    image: require('@/assets/images/quiz-images/mosque.png')
  },
  {
    question: "What do the mosaics mainly show?",
    correctAnswer: 0, // A) Imaginary gardens and palaces
    explanation: "The Damascus mosque mosaics depict peaceful imaginary landscapes with trees, palaces, and flowing water - dreamlike paradise scenes rather than battles or portraits.",
    points: 10,
    type: 'mcq' as const,
    options: ["Gardens and palaces", "Big battles", "Rulers' faces", "Maps of Damascus"],
    image: require('@/assets/images/quiz-images/Reader.png')
  },
  {
    question: "The mosaics were meant to give worshippers a calm, paradise-like feeling.",
    correctAnswer: 0, // A) True
    explanation: "Yes, the dreamlike mosaic scenes of gardens and flowing water were designed to remind worshippers of paradise, creating a calm and sacred atmosphere inside the mosque.",
    points: 10,
    type: 'truefalse' as const,
    options: ["True", "False"],
    image: require('@/assets/images/quiz-images/writer.png')
  },
  {
    question: "Did the mosaics include pictures of people?",
    correctAnswer: 1, // B) No
    explanation: "No, the mosaics did not show people or battles. Instead, they featured peaceful landscapes with trees, palaces, and water to create a serene, paradise-like environment.",
    points: 10,
    type: 'truefalse' as const,
    options: ["Yes", "No"],
    image: require('@/assets/images/quiz-images/Bilingual.png')
  },
  {
    question: "Why did the Umayyads invite Byzantine artists to work in Damascus?",
    correctAnswer: 2, // C) They valued skill even from rivals
    explanation: "The Umayyads valued artistic skill and expertise above political differences, inviting talented Byzantine artists to create beautiful mosaics even though Byzantium was a former rival empire.",
    points: 10,
    type: 'mcq' as const,
    options: ["Workers were busy", "Treaty requirement", "Valued their skill", "Convert the Byzantines"],
    image: require('@/assets/images/quiz-images/Map.png')
  }
]

export default function Adventure4_Module1_Quiz({ onDismiss, onBack }: Adventure4_Module1_QuizProps) {
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
  const [fillBlankOptions, setFillBlankOptions] = useState([
    { text: "Damascus", isUsed: false },
    { text: "Gardens", isUsed: false },
    { text: "Byzantine", isUsed: false },
    { text: "Paradise", isUsed: false }
  ])

  const { atomicProgressUpdate, canRetakeModule } = useProgress()
  const { playTap, playCorrect, playIncorrect } = useQuizSounds()


  // Handle submit - EXACT SwiftUI: handleSubmit()
  const handleSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Store the user's answer based on question type
    const newUserAnswers = [...userAnswers]

    if (quizQuestions[currentQuestionIndex].type === 'mcq') {
      newUserAnswers[currentQuestionIndex] = selectedMCQOption
    } else if (quizQuestions[currentQuestionIndex].type === 'truefalse') {
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


    setShowExplanation(true)
  }

  // Check answer - EXACT SwiftUI: checkAnswer() -> Bool
  const checkAnswer = (questionIndex: number, userAnswer: number | null): boolean => {
    if (userAnswer === null) return false

    // Check based on question type
    return userAnswer === quizQuestions[questionIndex].correctAnswer
  }

  // Celebrate quiz completion with haptic feedback pattern based on score
  const celebrateQuizCompletion = (finalScore: number) => {
    if (finalScore === 5) {
      // Perfect score - escalating celebration
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 300);
      playCorrect()
    } else if (finalScore >= 2) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playCorrect()
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

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
    setSelectedFillBlank(null)
    setFillBlankOptions(prev => prev.map(opt => ({ ...opt, isUsed: false })))
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
    console.log('🚀 Quiz completion: Adventure 4 Module 1')

    try {
      const isRetake = canRetakeModule(4, 1)

      // Use atomic progress update
      await atomicProgressUpdate(4, 1, {
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

  // Fill-in-blank option selection
  const handleFillBlankSelection = (selectedText: string) => {
    if (selectedFillBlank) {
      // Reset previous selection
      setFillBlankOptions(prev => prev.map(opt =>
        opt.text === selectedFillBlank ? { ...opt, isUsed: false } : opt
      ))
    }

    setSelectedFillBlank(selectedText)
    setFillBlankOptions(prev => prev.map(opt =>
      opt.text === selectedText ? { ...opt, isUsed: true } : opt
    ))
  }

  // Get current question
  const currentQuestion = quizQuestions[currentQuestionIndex]

  // Check if current question has an answer selected
  const isAnswerSelected = () => {
    if (currentQuestion.type === 'mcq') {
      return selectedMCQOption !== null
    } else if (currentQuestion.type === 'truefalse') {
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
              forceCenter={currentQuestionIndex !== 4} // Left align for question 5 (index 4)
            />
          ))}
        </View>
      )
    } else if (currentQuestion.type === 'truefalse') {
      return (
        <View style={styles.trueFalseContainer}>
          <TrueFalseOptionButton
            text="True"
            isSelected={selectedTrueFalse === 0}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              playTap()
              setSelectedTrueFalse(0)
            }}
            isTrue={true}
          />
          <TrueFalseOptionButton
            text="False"
            isSelected={selectedTrueFalse === 1}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              playTap()
              setSelectedTrueFalse(1)
            }}
            isTrue={false}
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
      onBack={onBack || onDismiss}
    />
  }

  return (
    <>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}
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
          quizTitle="Module 1 Quiz"
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

        {/* Minimum score alert - EXACT SwiftUI: Adventure4Module1MinimumScoreAlertView */}
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

// Quiz Results View - EXACT SwiftUI Adventure4Module1QuizResultsView
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
  const canAccessAdventure = correctAnswers >= 1 // EXACT SwiftUI: private var canAccessAdventure: Bool - Updated for 5 questions

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

// Minimum Score Alert - EXACT SwiftUI Adventure4Module1MinimumScoreAlertView
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

  // Fill-in-blank Container
  fillBlankContainer: {
    alignItems: 'center',
  },
  fillBlankQuestionContainer: {
    paddingHorizontal: 40, // EXACT SwiftUI: .padding(.horizontal, 40)
    marginBottom: 30, // EXACT SwiftUI: VStack spacing: 30
  },
  fillBlankQuestionText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 20))
    fontSize: 20,
    fontWeight: '600', // .fontWeight(.semibold)
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    textAlign: 'center', // EXACT SwiftUI: .multilineTextAlignment(.center)
    lineHeight: 28,
  },
  fillBlankAnswer: {
    // Styling handled inline based on selection state
  },
  fillBlankOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 40, // EXACT iOS: .padding(.horizontal, 40)
    paddingTop: 30, // EXACT iOS: .padding(.top, 30)
  },

  // Results View - EXACT SwiftUI Adventure4Module1QuizResultsView
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

  // Minimum Score Alert - EXACT SwiftUI Adventure4Module1MinimumScoreAlertView
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