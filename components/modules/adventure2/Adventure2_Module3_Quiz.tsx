// Adventure2_Module3_Quiz.tsx - EXACT replica of SwiftUI Adventure2_Module3_Quiz.swift
// Quiz about the Dome of the Rock construction and significance

import ArchivesTheme from "@/constants/ArchivesTheme";
import { useProgress } from "@/context/ProgressContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ExplanationPopup,
  MCQOptionButton,
  QuizQuestion,
  TrueFalseOptionButton,
} from "../QuizSystem";

interface Adventure2_Module3_QuizProps {
  onDismiss: () => void;
  onBack?: () => void;
}

// Quiz Data - EXACT SwiftUI questions for Dome of the Rock
const quizQuestions = [
  {
    question:
      "Which city did Abd al-Malik choose for his magnificent architectural project?",
    correctAnswer: 1, // B) Jerusalem
    explanation:
      "Abd al-Malik built the Dome of the Rock in Jerusalem, on the sacred site known as the Temple Mount (Haram al-Sharif), making it one of Islam's most important monuments.",
    points: 10,
    type: "mcq" as const,
    options: ["Damascus", "Jerusalem", "Mecca", "Cairo"],
    image: require("@/assets/images/quiz-images/Reader.png"),
  },
  {
    question: "The Dome of the Rock was completed in 691 CE.",
    correctAnswer: 0, // A) True
    explanation:
      "True. The Dome of the Rock was indeed completed in 691 CE during the reign of Umayyad Caliph Abd al-Malik, making it one of the earliest and most stunning examples of Islamic architecture.",
    points: 10,
    type: "truefalse" as const,
    image: require("@/assets/images/quiz-images/engineers.png"),
  },
  {
    question:
      "The Dome of the Rock honors the Prophet Muhammad's miraculous journey to which realm?",
    correctAnswer: 2, // C) Heaven
    explanation:
      "The Dome of the Rock commemorates the Prophet Muhammad's Night Journey (Isra and Mi'raj) and his ascension to heaven from this sacred site in Jerusalem.",
    points: 10,
    type: "mcq" as const,
    options: ["Medina", "Damascus", "Heaven", "Arabia"],
    image: require("@/assets/images/quiz-images/mosque.png"),
  },
  {
    question: "The architectural design of the Dome is circular and balanced.",
    correctAnswer: 0, // A) True
    explanation:
      "True. The Dome of the Rock features a harmonious octagonal design with perfect circular balance, representing Islamic geometric principles and creating architectural unity.",
    points: 10,
    type: "truefalse" as const,
    image: require("@/assets/images/quiz-images/Reader.png"),
  },
  {
    question:
      "The sacred stone inside the Dome holds religious significance for which faiths?",
    correctAnswer: 3, // D) Judaism, Christianity, and Islam
    explanation:
      "The Foundation Stone (Sakhrah) is sacred to all three Abrahamic faiths: Jews consider it the site of the Temple, Christians connect it to biblical history, and Muslims believe it's where the Prophet began his ascension.",
    points: 10,
    type: "mcq" as const,
    options: [
      "Islam only",
      "Judaism only",
      "Christianity only",
      "All three faiths",
    ],
    image: require("@/assets/images/quiz-images/mosque.png"),
  },
];

export default function Adventure2_Module3_Quiz({
  onDismiss,
  onBack,
}: Adventure2_Module3_QuizProps) {
  // EXACT SwiftUI state variables
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // @State private var currentQuestionIndex = 0
  const [showResults, setShowResults] = useState(false); // @State private var showResults = false
  const [showExplanation, setShowExplanation] = useState(false); // @State private var showExplanation = false
  const [correctAnswers, setCorrectAnswers] = useState(0); // @State private var correctAnswers = 0
  const [totalPoints, setTotalPoints] = useState(0); // @State private var totalPoints = 0
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]); // @State private var userAnswers: [Int?] = [nil, nil, nil, nil, nil]
  const [showMinimumScoreAlert, setShowMinimumScoreAlert] = useState(false); // @State private var showMinimumScoreAlert = false

  // Additional state for individual questions
  const [selectedMCQOption, setSelectedMCQOption] = useState<number | null>(
    null
  );
  const [selectedTrueFalse, setSelectedTrueFalse] = useState<number | null>(
    null
  );

  const { updateModuleProgress, completeModule } = useProgress();


  const currentQuestion = quizQuestions[currentQuestionIndex];

  // Render question content based on question type - EXACT SwiftUI pattern
  const renderQuestionContent = () => {
    if (currentQuestion.type === "mcq") {
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
      );
    }

    if (currentQuestion.type === "truefalse") {
      return (
        <View style={styles.trueFalseContainer}>
          <TrueFalseOptionButton
            isTrue={true}
            isSelected={selectedTrueFalse === 0}
            onPress={() => setSelectedTrueFalse(0)}
          />
          <TrueFalseOptionButton
            isTrue={false}
            isSelected={selectedTrueFalse === 1}
            onPress={() => setSelectedTrueFalse(1)}
          />
        </View>
      );
    }

    return null;
  };

  // Handle submit - EXACT SwiftUI: handleSubmit()
  const handleSubmit = () => {
    console.log(
      "🚀 DEBUG: Quiz submit pressed for question",
      currentQuestionIndex + 1
    );

    // Store the user's answer based on question type
    const newUserAnswers = [...userAnswers];
    if (currentQuestion.type === "mcq") {
      newUserAnswers[currentQuestionIndex] = selectedMCQOption;
    } else if (currentQuestion.type === "truefalse") {
      newUserAnswers[currentQuestionIndex] = selectedTrueFalse;
    }
    setUserAnswers(newUserAnswers);

    // Check if answer is correct and update score
    const isCorrect = checkAnswer(
      currentQuestionIndex,
      newUserAnswers[currentQuestionIndex]
    );
    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
      setTotalPoints(
        (prev) => prev + quizQuestions[currentQuestionIndex].points
      );
    }

    setShowExplanation(true);
  };

  // Check answer - EXACT SwiftUI: checkAnswer() -> Bool
  const checkAnswer = (
    questionIndex: number,
    userAnswer: number | null
  ): boolean => {
    if (userAnswer === null) return false;

    // Handle different question types with correct answers from the quiz data
    return userAnswer === quizQuestions[questionIndex].correctAnswer;
  };

  // Check if current question has an answer selected
  const isAnswerSelected = () => {
    if (currentQuestion.type === "mcq") return selectedMCQOption !== null;
    if (currentQuestion.type === "truefalse") return selectedTrueFalse !== null;
    return false;
  };

  // Handle explanation continue - EXACT SwiftUI: onContinue in ExplanationView
  const handleExplanationContinue = () => {
    if (currentQuestionIndex < 4) {
      // Move to next question (0-4 for 5 questions)
      setCurrentQuestionIndex((prev) => prev + 1);
      setShowExplanation(false);
      resetCurrentQuestion();
    } else {
      // Quiz completed - check minimum score requirement (need at least 1 out of 5)
      if (correctAnswers >= 1) {
        setShowResults(true);
        setShowExplanation(false);
      } else {
        // Show minimum score alert - EXACT SwiftUI behavior
        setShowMinimumScoreAlert(true);
        setShowExplanation(false);
      }
    }
  };

  // Reset current question state
  const resetCurrentQuestion = () => {
    setSelectedMCQOption(null);
    setSelectedTrueFalse(null);
  };

  // Reset entire quiz - EXACT SwiftUI: resetQuiz()
  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setShowExplanation(false);
    setCorrectAnswers(0);
    setTotalPoints(0);
    setUserAnswers([null, null, null, null, null]);
    resetCurrentQuestion();
  };

  // Handle quiz completion and return to adventure - EXACT SwiftUI: onGoToAdventure
  const handleGoToAdventure = async () => {
    console.log(
      "🚀 DEBUG: Go to Adventure button pressed in Adventure2_Module3_Quiz"
    );

    try {
      await updateModuleProgress(2, 3, {
        lessonsCompleted: ["lesson1", "lesson2"],
        isCompleted: true, // Module completed when quiz passed
        quizCompleted: true,
        quizScore: correctAnswers // Store the number of correct answers for star rating
      });
      
      // Then complete the module - this triggers adventure unlocking logic
      await completeModule(2, 3)
      
    } catch (error) {
      // Silently handle deprecated completeModule error
    }
    
    onDismiss();
  };

  // Show results screen
  if (showResults) {
    return (
      <QuizResultsView
        correctAnswers={correctAnswers}
        totalQuestions={5}
        totalPoints={totalPoints}
        onRetake={resetQuiz}
        onGoToAdventure={handleGoToAdventure}
        onBack={onDismiss}
      />
    );
  }

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={ArchivesTheme.colors.creamWhite}
      />
      <SafeAreaView style={styles.container}>
        {/* Current question */}
        <QuizQuestion
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={5}
          question={currentQuestion.question}
          image={currentQuestion.image}
          onSubmit={handleSubmit}
          isAnswerSelected={isAnswerSelected()}
          questionType={
            currentQuestion.type === "truefalse" ? "trueFalse" : "mcq"
          }
          onBack={onBack || onDismiss}
        >
          {renderQuestionContent()}
        </QuizQuestion>

        {/* Explanation popup */}
        <ExplanationPopup
          isVisible={showExplanation}
          isCorrect={checkAnswer(
            currentQuestionIndex,
            userAnswers[currentQuestionIndex]
          )}
          points={currentQuestion.points}
          explanation={currentQuestion.explanation}
          onContinue={handleExplanationContinue}
        />

        {/* Minimum score alert - EXACT SwiftUI: Adventure2Module3MinimumScoreAlertView */}
        {showMinimumScoreAlert && (
          <MinimumScoreAlert
            onRetry={() => {
              setShowMinimumScoreAlert(false);
              resetQuiz();
            }}
            onContinueAnyway={() => {
              setShowMinimumScoreAlert(false);
              setShowResults(true);
            }}
          />
        )}
      </SafeAreaView>
    </>
  );
}

// Quiz Results View - EXACT SwiftUI Adventure2Module3QuizResultsView
interface QuizResultsViewProps {
  correctAnswers: number;
  totalQuestions: number;
  totalPoints: number;
  onRetake: () => void;
  onGoToAdventure: () => void;
  onBack?: () => void;
}

function QuizResultsView({
  correctAnswers,
  totalQuestions,
  totalPoints,
  onRetake,
  onGoToAdventure,
  onBack,
}: QuizResultsViewProps) {
  const percentage = Math.round((correctAnswers * 100) / totalQuestions); // EXACT SwiftUI calculation
  const passed = percentage >= 70; // EXACT SwiftUI: private var passed: Bool
  const canAccessAdventure = correctAnswers >= 1; // EXACT SwiftUI: private var canAccessAdventure: Bool - Updated for 5 questions

  return (
    <View style={styles.resultsContainer}>
      {/* Back button for results */}
      {onBack && (
        <SafeAreaView style={styles.resultsBackButtonContainer}>
          <TouchableOpacity style={styles.resultsBackButton} onPress={onBack}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={ArchivesTheme.colors.shoeBrown}
            />
          </TouchableOpacity>
        </SafeAreaView>
      )}

      <ScrollView
        style={styles.resultsScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.resultsContent}>
          {/* Header - EXACT SwiftUI structure */}
          <View style={styles.resultsHeader}>
            <View
              style={[
                styles.resultsIconContainer,
                {
                  backgroundColor: passed
                    ? ArchivesTheme.colors.mossGreen
                    : ArchivesTheme.colors.shoeBrown,
                },
              ]}
            >
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
              {passed
                ? "Excellent work on the Module 3 quiz!"
                : "Review the material and try again"}
            </Text>
          </View>

          {/* Statistics card - EXACT SwiftUI structure */}
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statsLeft}>
                <Text
                  style={[
                    styles.percentageText,
                    {
                      color: passed
                        ? ArchivesTheme.colors.mossGreen
                        : ArchivesTheme.colors.shoeBrown,
                    },
                  ]}
                >
                  {percentage}%
                </Text>
                <Text style={styles.finalScoreText}>Final Score</Text>
              </View>

              <View style={styles.statsRight}>
                <View style={styles.xpRow}>
                  <Ionicons
                    name="star"
                    size={18}
                    color={ArchivesTheme.colors.shoeBrown}
                  />
                  <Text style={styles.xpText}>{totalPoints} XP</Text>
                </View>
                <Text style={styles.correctText}>
                  Correct: {correctAnswers}/{totalQuestions}
                </Text>
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
                    backgroundColor: passed
                      ? ArchivesTheme.colors.mossGreen
                      : ArchivesTheme.colors.shoeBrown,
                  },
                ]}
              />
            </View>
          </View>

          {/* Action buttons - EXACT SwiftUI structure */}
          <View style={styles.actionButtons}>
            {/* Retake Quiz button */}
            <TouchableOpacity style={styles.retakeButton} onPress={onRetake}>
              <View style={styles.retakeButtonContent}>
                <Ionicons
                  name="refresh-circle"
                  size={24}
                  color={ArchivesTheme.colors.mossGreen}
                />
                <Text style={styles.retakeButtonText}>Retake Quiz</Text>
              </View>
            </TouchableOpacity>

            {/* Go to Adventure button or locked message */}
            {canAccessAdventure ? (
              <TouchableOpacity
                style={styles.adventureButton}
                onPress={onGoToAdventure}
              >
                <View style={styles.adventureButtonContent}>
                  <Ionicons name="map" size={24} color="white" />
                  <Text style={styles.adventureButtonText}>
                    Go to Adventure
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.lockedContainer}>
                <View style={styles.lockedHeader}>
                  <Ionicons
                    name="lock-closed"
                    size={24}
                    color={ArchivesTheme.colors.shoeBrown}
                  />
                  <Text style={styles.lockedTitle}>Adventure Locked</Text>
                </View>
                <Text style={styles.lockedMessage}>
                  Answer at least one question correctly to unlock the
                  adventure
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Minimum Score Alert - EXACT SwiftUI Adventure2Module3MinimumScoreAlertView
interface MinimumScoreAlertProps {
  onRetry: () => void;
  onContinueAnyway: () => void;
}

function MinimumScoreAlert({
  onRetry,
  onContinueAnyway,
}: MinimumScoreAlertProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <View style={styles.alertOverlay}>
      <Animated.View
        style={[styles.alertCard, { transform: [{ scale: scaleAnim }] }]}
      >
        {/* Icon and title */}
        <View style={styles.alertHeader}>
          <View style={styles.alertIcon}>
            <Ionicons name="warning" size={24} color="white" />
          </View>
          <Text style={styles.alertTitle}>Minimum Score Required</Text>
        </View>

        {/* Message */}
        <Text style={styles.alertMessage}>
          You need to answer at least one question correctly to complete the
          quiz and unlock the adventure.
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
  );
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20, // EXACT iOS: .padding(.horizontal, 20)
    paddingTop: 40, // EXACT iOS: .padding(.top, 40)
    gap: 30, // EXACT iOS: HStack(spacing: 30)
  },

  // Fill-in-blank Container
  fillBlankContainer: {
    alignItems: "center",
  },
  fillBlankQuestionContainer: {
    paddingHorizontal: 40, // EXACT SwiftUI: .padding(.horizontal, 40)
    marginBottom: 30, // EXACT SwiftUI: VStack spacing: 30
  },
  fillBlankQuestionText: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 20))
    fontSize: 20,
    fontWeight: "600", // .fontWeight(.semibold)
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    textAlign: "center", // EXACT SwiftUI: .multilineTextAlignment(.center)
    lineHeight: 28,
  },
  fillBlankAnswer: {
    // Styling handled inline based on selection state
  },
  fillBlankOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 40, // EXACT iOS: .padding(.horizontal, 40)
    paddingTop: 30, // EXACT iOS: .padding(.top, 30)
  },

  // Results View - EXACT SwiftUI Adventure2Module3QuizResultsView
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
    alignItems: "center",
    marginBottom: 30, // EXACT SwiftUI: VStack spacing: 30
  },
  resultsIconContainer: {
    width: 120, // EXACT SwiftUI: .frame(width: 120, height: 120)
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20, // EXACT SwiftUI: VStack spacing: 20
    // EXACT SwiftUI shadow: .shadow(radius: 8)
    shadowColor: "black",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  resultsTitle: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 28))
    fontSize: 28,
    fontWeight: "bold",
    color: ArchivesTheme.colors.mutedNavy, // EXACT SwiftUI: Color("MutedNavy")
    textAlign: "center",
    marginBottom: 8,
  },
  resultsSubtitle: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 16))
    fontSize: 16,
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    textAlign: "center", // EXACT SwiftUI: .multilineTextAlignment(.center)
  },

  // Statistics Card - EXACT SwiftUI structure
  statsCard: {
    padding: 24, // EXACT SwiftUI: .padding(24)
    backgroundColor: "white",
    borderRadius: 16, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 16)
    marginBottom: 30,
    // EXACT SwiftUI shadow: .shadow(radius: 4)
    shadowColor: "black",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  statsRow: {
    flexDirection: "row", // EXACT SwiftUI: HStack(spacing: 40)
    alignItems: "center",
    marginBottom: 20, // EXACT SwiftUI: VStack spacing: 20
  },
  statsLeft: {
    alignItems: "center",
    marginRight: 40,
  },
  percentageText: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 42))
    fontSize: 42,
    fontWeight: "bold",
    marginBottom: 8, // EXACT SwiftUI: VStack spacing: 8
  },
  finalScoreText: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
  },
  statsRight: {
    flex: 1,
    alignItems: "flex-end", // EXACT SwiftUI: VStack(alignment: .trailing)
  },
  xpRow: {
    flexDirection: "row", // EXACT SwiftUI: HStack(spacing: 8)
    alignItems: "center",
    marginBottom: 12, // EXACT SwiftUI: VStack spacing: 12
  },
  xpText: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    fontWeight: "bold",
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    marginLeft: 8,
  },
  correctText: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
  },

  // Progress Bar - EXACT SwiftUI GeometryReader structure
  progressBarContainer: {
    height: 16, // EXACT SwiftUI: .frame(height: 16)
    position: "relative",
  },
  progressBarBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: "rgba(0,0,0,0.2)", // EXACT SwiftUI: Color.gray.opacity(0.2)
    borderRadius: 8, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 8)
  },
  progressBarFill: {
    position: "absolute",
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
    backgroundColor: "white",
    borderRadius: 16, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 16)
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.mossGreen, // EXACT SwiftUI: .stroke(Color("MossGreen"), lineWidth: 2)
    marginBottom: 16,
    // EXACT SwiftUI shadow: .shadow(radius: 4)
    shadowColor: "black",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  retakeButtonContent: {
    flexDirection: "row", // EXACT SwiftUI: HStack(spacing: 12)
    alignItems: "center",
  },
  retakeButtonText: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    fontWeight: "600", // .fontWeight(.semibold)
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
    shadowColor: "black",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  adventureButtonContent: {
    flexDirection: "row", // EXACT SwiftUI: HStack(spacing: 12)
    alignItems: "center",
  },
  adventureButtonText: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    fontWeight: "600", // .fontWeight(.semibold)
    color: "white",
    marginLeft: 12,
    flex: 1,
  },

  // Locked Adventure - EXACT SwiftUI structure
  lockedContainer: {
    paddingVertical: 16, // EXACT SwiftUI: .padding(.vertical, 16)
    paddingHorizontal: 20, // EXACT SwiftUI: .padding(.horizontal, 20)
    alignItems: "center",
  },
  lockedHeader: {
    flexDirection: "row", // EXACT SwiftUI: HStack(spacing: 8)
    alignItems: "center",
    marginBottom: 8,
  },
  lockedTitle: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 16))
    fontSize: 16,
    fontWeight: "600", // .fontWeight(.semibold)
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    marginLeft: 8,
  },
  lockedMessage: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    color: "rgba(139,96,64,0.7)", // EXACT SwiftUI: Color("ShoeBrown").opacity(0.7)
    textAlign: "center", // EXACT SwiftUI: .multilineTextAlignment(.center)
    paddingHorizontal: 24, // EXACT SwiftUI: .padding(.horizontal, 24)
  },

  // Minimum Score Alert - EXACT SwiftUI Adventure2Module3MinimumScoreAlertView
  alertOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)", // EXACT SwiftUI: Color.black.opacity(0.4)
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  alertCard: {
    backgroundColor: "white",
    borderRadius: 16, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 16)
    padding: 24, // EXACT SwiftUI: .padding(24)
    maxWidth: 340, // EXACT SwiftUI: .frame(maxWidth: 340)
    // EXACT SwiftUI shadow: .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
    shadowColor: "black",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  alertHeader: {
    alignItems: "center",
    marginBottom: 20, // EXACT SwiftUI: VStack spacing: 20
  },
  alertIcon: {
    width: 60, // EXACT SwiftUI: .frame(width: 60, height: 60)
    height: 60,
    borderRadius: 30,
    backgroundColor: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12, // EXACT SwiftUI: VStack spacing: 12
  },
  alertTitle: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    fontWeight: "bold",
    color: ArchivesTheme.colors.mutedNavy, // EXACT SwiftUI: Color("MutedNavy")
    textAlign: "center",
  },
  alertMessage: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    textAlign: "center", // EXACT SwiftUI: .multilineTextAlignment(.center)
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
    alignItems: "center",
    marginBottom: 12,
  },
  alertRetryText: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 16))
    fontSize: 16,
    fontWeight: "600", // .fontWeight(.semibold)
    color: "white",
  },
  alertContinueText: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    fontWeight: "500", // .fontWeight(.medium)
    color: "rgba(139,96,64,0.7)", // EXACT SwiftUI: Color("ShoeBrown").opacity(0.7)
    textAlign: "center",
    paddingVertical: 8,
  },

  // Results back button styles
  resultsBackButtonContainer: {
    position: "absolute",
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
    backgroundColor: "rgba(139,96,64,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
});
