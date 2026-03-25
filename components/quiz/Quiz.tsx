// Quiz.tsx - Universal Quiz Component for all eras
// Accepts dynamic quiz data from adventures.content_list
// Clean, modern design with bottom sheet feedback

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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGamifiedProgress, useGamificationOrchestrator, checkXPMilestone } from '@/gamification';
import { useQuizTracking } from '@/hooks/useQuizTracking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { useQuizSounds } from '@/hooks/useQuizSounds';
import type { ContentItem } from '@/components/shared/types';
import QuizResults from './QuizResults';
import { ADVENTURE_KEYS } from '@/constants/WalkthroughKeys';
import XPMilestoneScreen from '@/gamification/ui/celebrations/XPMilestoneScreen';
import { Modal } from 'react-native';
import { analyticsService } from '@/services/AnalyticsService';
import AppLogger from '@/services/AppLogger';

// Used by era quizzes and Today screen (isToday=true, adventureId="daily_quest")
interface QuizProps {
  contentItem: ContentItem;  // Quiz data from adventures.content_list
  adventureId: string;       // Database adventure readable_id (e.g., "roi_adventure_1") | "daily_quest" for Today
  moduleId: string;          // Database content_list.id (media_id)
  eraId: string;             // Era ID from adventure (e.g., "rise_of_islam", "umayyad")
  eraName: string;           // Era display name (from card_content.era_name)
  onContinue: () => void;    // Called when quiz is completed
  onDismiss: () => void;     // Called to close quiz
  onBack?: () => void;       // Optional back button
  // Adventure data for orchestrator (adventure complete celebration)
  adventureData?: {
    title: string;
    subtitle?: string;
    description?: string;
    backgroundImage?: string;
    totalModules: number;
    completedModules: number;  // BEFORE this quiz
    totalBadges?: number;
  };
  // Today mode - skips gamification saving, calls onQuizResults with score
  isToday?: boolean;         // true when called from Today screen
  onQuizResults?: (score: number, correctAnswers: number, totalQuestions: number) => Promise<void>;
  // Today mode UI - floating header with back button and progress
  progress?: number;           // Today progress percentage (0-100)
  showTodayHeader?: boolean;   // Show floating back button and progress bar
  // Callback to close parent modal before opening AI chat (fixes modal-on-modal issue)
  onChatToLearn?: (hiddenMessage: string) => void;
}

// MCQ Option Button Design
interface MCQOptionButtonProps {
  letter: string;
  text: string;
  isSelected: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
  showResult?: boolean;
  onPress: () => void;
}

function MCQOptionButton({
  letter,
  text,
  isSelected,
  isCorrect,
  isWrong,
  showResult,
  onPress,
}: MCQOptionButtonProps) {
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

// True/False Option Button - Umayyad Dynasty Design
interface ROITrueFalseOptionButtonProps {
  isTrue: boolean;
  isSelected: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
  showResult?: boolean;
  onPress: () => void;
}

function ROITrueFalseOptionButton({
  isTrue,
  isSelected,
  isCorrect,
  isWrong,
  showResult,
  onPress,
}: ROITrueFalseOptionButtonProps) {
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
      style={styles.trueFalseContainer}
      onPress={onPress}
      disabled={showResult}
      activeOpacity={0.7}
    >
      {/* Shadow layer - 3D depth effect */}
      <View style={[styles.trueFalseShadow, { backgroundColor: getShadowColor() }]} />

      {/* Border layer - 4px stroke */}
      <View style={[styles.trueFalseBorder, { borderColor: getBorderColor() }]} />

      {/* Content layer - white background with 2px overlay */}
      <View style={[styles.trueFalseContent, { borderColor: getContentBorderColor() }]}>
        {/* Icon circle */}
        <View style={styles.trueFalseIconCircle}>
          <Ionicons
            name={isTrue ? "checkmark" : "close"}
            size={24}
            color="white"
          />
        </View>

        {/* Text */}
        <Text style={styles.trueFalseText}>{isTrue ? "True" : "False"}</Text>
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
  bottomInset: number;
}

function ROIFeedbackSheet({
  isVisible,
  isCorrect,
  points,
  explanation,
  bottomInset,
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
            backgroundColor: isCorrect ? ArchivesTheme.colors.mossGreen : ArchivesTheme.colors.persianOrange,
            transform: [{ translateY: slideAnim }],
            paddingBottom: 80 + bottomInset, // Content space + safe area
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

export default function Quiz({
  contentItem,
  adventureId,
  moduleId,
  eraId,
  eraName,
  onContinue,
  onDismiss,
  onBack,
  adventureData,
  isToday = false,
  onQuizResults,
  progress,
  showTodayHeader = false,
  onChatToLearn,
}: QuizProps) {
  const { saveNewProgressData, getProgressByStringIds } = useGamifiedProgress();
  const { reportQuizComplete } = useGamificationOrchestrator();
  const insets = useSafeAreaInsets();
  const { playTap, playCorrect, playIncorrect } = useQuizSounds();

  // Extract adventure number from adventureId (e.g., "roi_adventure_1" → 1)
  const adventureNumber = parseInt(adventureId.split('_')[2] || '0', 10);
  const moduleNumber = contentItem.order_by || 0;

  // Extract quiz data from contentItem (must be before hooks that use questions)
  const questions = contentItem.questions || [];
  const quizTitle = contentItem.thumbnail_title || 'Quiz';

  // Analytics tracking
  const {
    trackQuestionAnswered,
    trackQuizComplete,
  } = useQuizTracking({
    adventureId,
    moduleId,
    totalQuestions: questions.length,
    quizId: contentItem.id || moduleId,
    quizTitle: contentItem.thumbnail_title || "Unknown",
    screenUrl: `/${eraId}/${adventureId}/${moduleId}/quiz`,
    eraId,
    eraName,
    adventureNumber,
    moduleNumber,
    screen: `Quiz - ${adventureId} Module ${moduleNumber}`,
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [randomImageIndex, setRandomImageIndex] = useState(Math.floor(Math.random() * QUIZ_IMAGE_KEYS.length));
  const [showResults, setShowResults] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [userAnswers, setUserAnswers] = useState<number[]>([]); // Track all user answers for AI explanations

  // Mid-quiz milestone detection
  const [initialXP, setInitialXP] = useState(0);
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneData, setMilestoneData] = useState<{milestoneXP: number; totalXP: number} | null>(null);

  // Load initial XP when quiz starts (ERA-SPECIFIC)
  useEffect(() => {
    const loadInitialXP = async () => {
      try {
        // Load era-specific XP from new_user_progress
        const progressData = await AsyncStorage.getItem('new_user_progress');
        if (progressData) {
          const allProgress = JSON.parse(progressData);
          // Filter by current era and sum up XP
          const eraXP = allProgress
            .filter((p: any) => p.era_id === eraId)
            .reduce((sum: number, p: any) => sum + ((p.quizCorrectAnswers || 0) * 10), 0);
          setInitialXP(eraXP);
          AppLogger.info('quiz', 'Quiz started', { eraXP, eraId });
        } else {
          setInitialXP(0);
          AppLogger.info('quiz', 'Quiz started with no progress data', { eraId });
        }
      } catch (error) {
        AppLogger.error('quiz', 'Failed to load era XP', { eraId }, error);
        setInitialXP(0);
      }
    };

    loadInitialXP();
  }, [eraId]);

  // Early return if no questions
  if (questions.length === 0) {
    AppLogger.error('quiz', 'No questions found in contentItem');
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
      playTap();
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === correctAnswerIndex;
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);

    // Save user's answer for AI explanations
    setUserAnswers(prev => [...prev, selectedAnswer]);

    // Track answer submission
    trackQuestionAnswered(
      currentQuestionIndex,
      isCorrect,
      timeTaken
    );

    if (isCorrect) {
      const newCorrectAnswers = correctAnswers + 1;
      setScore(score + pointsPerQuestion);
      setCorrectAnswers(newCorrectAnswers);

      // Calculate real-time XP
      const oldXP = initialXP + (correctAnswers * 10); // Before this answer
      const newXP = initialXP + (newCorrectAnswers * 10); // After this answer

      AppLogger.info('quiz', 'Correct answer', { oldXP, newXP, eraId });

      // Check if we crossed a milestone (SKIP for Today mode - no XP awarded for Today quizzes)
      if (!isToday) {
        const milestone = checkXPMilestone(oldXP, newXP);

        if (milestone) {
          AppLogger.info('quiz', 'Mid-quiz XP milestone crossed', { milestone, eraId });

          // Check if user already saw this milestone (ERA-SPECIFIC)
          const milestoneKey = ADVENTURE_KEYS.getXPMilestoneKey(milestone, eraId);
          const hasSeenMilestone = await AsyncStorage.getItem(milestoneKey);

          if (hasSeenMilestone !== 'true') {
            // Show milestone modal (pauses quiz)
            setMilestoneData({ milestoneXP: milestone, totalXP: newXP });
            setShowMilestone(true);

            // Play correct sound + haptics for celebration
            playCorrect();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            return; // Don't show feedback yet - milestone takes priority
          }
        }
      }

      // Normal correct answer flow (if no milestone)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playCorrect();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playIncorrect();
    }

    setShowFeedback(true);
  };

  // Handle continue to next question
  const handleContinueToNext = () => {
    if (questionNumber < totalQuestions) {
      // Not last question - clear UI and move to next
      setShowFeedback(false);
      setSelectedAnswer(null);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setRandomImageIndex(Math.floor(Math.random() * QUIZ_IMAGE_KEYS.length));
      setQuestionStartTime(Date.now()); // Reset timer for next question
    } else {
      // Last question - show results screen
      setShowFeedback(false);
      setShowResults(true);
    }
  };

  // Handle quiz completion from results screen
  const handleQuizCompletion = async () => {
    AppLogger.info('quiz', 'Quiz completion initiated', { eraName, adventureId, moduleId });

    // Percentage-based star calculation (database-agnostic)
    // 0-49% = 1★, 50-99% = 2★, 100% = 3★ (perfect score only)
    const percentage = (correctAnswers / totalQuestions) * 100;
    const quizScore = percentage === 100 ? 3 : percentage >= 50 ? 2 : 1;

    // Track quiz completion (score = star rating, correctAnswers = correct count)
    trackQuizComplete(quizScore, correctAnswers);

    // TODAY MODE - Skip gamification saving, call custom callback
    if (isToday) {
      AppLogger.info('quiz', 'Today mode - skipping gamification save');
      if (onQuizResults) {
        await onQuizResults(quizScore, correctAnswers, totalQuestions);
      }
      onContinue();
      return;
    }

    // ADVENTURE/MODULE MODE - Normal gamification flow
    // Load progress from React state (SOURCE OF TRUTH - avoids AsyncStorage race conditions)
    const newModulesData = await AsyncStorage.getItem('new_user_progress');
    const newModules = newModulesData ? JSON.parse(newModulesData) : [];

    // Calculate era-specific XP (only modules in current era)
    const oldEraXP = newModules
      .filter((m: any) => m.era_id === eraId)
      .reduce((sum: number, m: any) => sum + ((m.quizCorrectAnswers || 0) * 10), 0);
    AppLogger.info('quiz', 'Calculating era XP', { oldEraXP, eraId });

    // ✅ Check if adventure was already complete BEFORE this quiz completion
    // This prevents celebration from showing when user retakes quizzes or completes modules in already-finished adventures
    const adventureModulesBeforeQuiz = newModules.filter((m: any) =>
      m.adventureId === adventureId && m.quizCompleted === true
    );
    const wasAlreadyComplete = adventureModulesBeforeQuiz.length >= (adventureData?.totalModules || 5);
    AppLogger.info('quiz', 'Adventure completion status before quiz', { adventureId, wasAlreadyComplete });

    // Get existing module from React state (SOURCE OF TRUTH)
    // This avoids race conditions with AsyncStorage reads
    const existingModule = getProgressByStringIds(adventureId, moduleId);
    const existingLessons = existingModule?.lessonsCompleted || [];

    // Always save progress (no minimum check for new system)
    const moduleData = {
      adventureId,     // Database readable_id (e.g., "roi_adventure_1")
      moduleId,        // Database content_list.id (media_id)
      quizScore,       // Score = correct answers + 1 (for stars)
      quizCorrectAnswers: correctAnswers, // Actual correct answers (for XP calculation)
      isCompleted: true,
      quizCompleted: true,
      completedAt: new Date().toISOString(),
      era_id: eraId,    // Era-agnostic: use prop instead of hardcoded value
      lessonsCompleted: existingLessons // Preserve lessons already completed, backfill will handle if empty
    };

    AppLogger.info('quiz', 'Saving quiz completion', { adventureId, moduleId });
    await saveNewProgressData(moduleData);

    // Track module completed event (critical for funnel analysis, era-agnostic)
    analyticsService.trackCustomEvent('module_completed', {
      adventure_id: adventureId,
      module_id: moduleId,
      quiz_score: quizScore,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
      $current_url: `/${eraId}/${adventureId}/${moduleId}/quiz`,
    });
    AppLogger.info('quiz', 'Module completion event tracked');

    // Load updated progress to calculate era-specific XP (AFTER saving)
    const updatedNewModulesData = await AsyncStorage.getItem('new_user_progress');
    const updatedNewModules = updatedNewModulesData ? JSON.parse(updatedNewModulesData) : [];

    // Calculate era-specific XP after quiz
    const newEraXP = updatedNewModules
      .filter((m: any) => m.era_id === eraId)
      .reduce((sum: number, m: any) => sum + ((m.quizCorrectAnswers || 0) * 10), 0);
    AppLogger.info('quiz', 'Updated era XP after quiz', { newEraXP, eraId });

    // Calculate FRESH adventure completion from AsyncStorage (not stale props)
    const adventureModulesInProgress = updatedNewModules.filter((m: any) =>
      m.adventureId === adventureId && m.quizCompleted === true
    );
    const actualCompletedModules = adventureModulesInProgress.length;
    const actualTotalModules = adventureData?.totalModules || 5; // Default to 5 modules per adventure

    AppLogger.info('quiz', 'Fresh adventure completion data', { completedModules: actualCompletedModules, totalModules: actualTotalModules });

    // Calculate total badges from FRESH data (quizScore 3 = perfect quiz = badge)
    const totalBadges = adventureModulesInProgress.filter(
      (m: any) => m.quizScore === 3
    ).length;

    // Report quiz completion to orchestrator - it handles milestone checks and celebrations
    await reportQuizComplete({
      eraId,
      adventureId,
      moduleId,
      oldEraXP,
      newEraXP,
      // Use FRESH data from AsyncStorage (not stale props)
      adventureModulesCompleted: actualCompletedModules,
      adventureTotalModules: actualTotalModules,
      wasAlreadyComplete, // ✅ Prevents celebration repeat on already-complete adventures
      adventureData: adventureData ? {
        title: adventureData.title,
        subtitle: adventureData.subtitle,
        description: adventureData.description,
        backgroundImage: adventureData.backgroundImage,
        totalBadges,  // ✅ Use FRESH calculated value (not stale prop)
      } : undefined,
    });
    AppLogger.info('quiz', 'Reported to orchestrator', { oldEraXP, newEraXP });

    AppLogger.info('quiz', 'Quiz completed', { correctAnswers, totalQuestions });
    onContinue();
  };

  const isCorrect = selectedAnswer === correctAnswerIndex;

  // Show results screen if quiz is complete
  if (showResults) {
    return (
      <QuizResults
        correctAnswers={correctAnswers}
        totalQuestions={totalQuestions}
        totalPoints={score}
        onContinue={handleQuizCompletion}
        onBack={onBack}
        adventureId={adventureId}
        moduleId={moduleId}
        eraId={eraId}
        eraName={eraName}
        adventureNumber={adventureNumber}
        moduleNumber={moduleNumber}
        questions={questions}
        userAnswers={userAnswers}
        isToday={isToday}
        moduleTitle={contentItem.thumbnail_title || undefined}
        onChatToLearn={onChatToLearn}
      />
    );
  }

  return (
    <SafeAreaView style={styles.roiContainer} edges={showTodayHeader ? [] : ['top']}>
      {showTodayHeader ? (
        // Today mode - transparent status bar for fullscreen
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />
      ) : (
        // Adventure mode - normal status bar
        Platform.OS === 'android' && (
          <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
        )
      )}

      {/* Today mode - Fixed Header with Progress Bar */}
      {showTodayHeader && progress !== undefined && (
        <View
          style={{
            backgroundColor: ArchivesTheme.colors.creamWhite,
            paddingTop: insets.top + 8,
            paddingBottom: 12,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={ArchivesTheme.common.today.watchBackButton}
            onPress={onBack || onDismiss}
          >
            <Ionicons name="chevron-back" size={24} color={ArchivesTheme.colors.shoeBrown} />
          </TouchableOpacity>

          {/* Progress Bar */}
          <View style={{ flex: 1 }}>
            <View style={ArchivesTheme.common.today.watchProgressContainer}>
              <Text style={[ArchivesTheme.common.today.watchProgressLabel, { color: ArchivesTheme.colors.shoeBrown }]}>
                Progress today
              </Text>
              <Text style={[ArchivesTheme.common.today.watchProgressPercentage, { color: ArchivesTheme.colors.shoeBrown }]}>
                {progress}%
              </Text>
            </View>
            <View style={[ArchivesTheme.common.today.watchProgressBar, { backgroundColor: ArchivesTheme.colors.shoeBrown + "30" }]}>
              <View
                style={[
                  ArchivesTheme.common.today.watchProgressFill,
                  { width: `${progress}%`, backgroundColor: ArchivesTheme.colors.persianOrange },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.roiScrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questionContent}>
          {/* Header */}
          <View style={styles.roiHeader}>
          {!showTodayHeader && onBack && (
            <TouchableOpacity style={styles.roiBackButton} onPress={onBack}>
              <Ionicons name="chevron-back" size={24} color="#4D392E" />
            </TouchableOpacity>
          )}
          <View style={styles.roiTitleContainer}>
            {/* Hide quiz title for Today screen, show for regular modules */}
            {!isToday && <Text style={styles.roiQuizTitle}>{quizTitle}</Text>}
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

        {/* Answer options - Conditional rendering based on question type */}
        {currentQuestion.question_type === 'trueFalse' ? (
          // True/False layout - Horizontal buttons
          <View style={styles.trueFalseOptionsGroup}>
            {options.map((option, index) => {
              const isTrue = option.toLowerCase().includes('true');
              return (
                <ROITrueFalseOptionButton
                  key={index}
                  isTrue={isTrue}
                  isSelected={selectedAnswer === index}
                  isCorrect={showFeedback && index === correctAnswerIndex}
                  isWrong={showFeedback && selectedAnswer === index && !isCorrect}
                  showResult={showFeedback}
                  onPress={() => handleAnswerSelect(index)}
                />
              );
            })}
          </View>
        ) : (
          // MCQ layout - Vertical stack
          <View style={styles.questionOptionsGroup}>
            {options.map((option, index) => {
              const letter = String.fromCharCode(65 + index); // A, B, C, D
              return (
                <MCQOptionButton
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
        )}

          {/* Spacer for submit button */}
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Submit button - Always visible, stays on top with z-index */}
      <View style={[styles.submitButtonContainer, { bottom: Math.max(50, insets.bottom + 30) }]}>
        {/* Shadow layer - 3D depth effect */}
        <View
          style={[
            styles.submitButtonShadow,
            { backgroundColor: showFeedback ? 'rgba(0,0,0,0.3)' : (selectedAnswer !== null ? ArchivesTheme.colors.mossGreenShadow : 'rgba(0,0,0,0.3)') },
          ]}
        />
        {/* Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: showFeedback ? 'white' : (selectedAnswer !== null ? ArchivesTheme.colors.mossGreen : 'gray') },
          ]}
          onPress={showFeedback ? handleContinueToNext : handleSubmit}
          disabled={!showFeedback && selectedAnswer === null}
          activeOpacity={1}
        >
          <Text style={[
            styles.submitButtonText,
            showFeedback && {
              color: isCorrect
                ? ArchivesTheme.colors.mossGreen      // Green text for correct
                : ArchivesTheme.colors.persianOrange  // Orange text for incorrect
            }
          ]}>
            {showFeedback ? "CONTINUE" : "SUBMIT"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Feedback bottom sheet */}
      <ROIFeedbackSheet
        isVisible={showFeedback}
        isCorrect={isCorrect}
        points={pointsPerQuestion}
        explanation={currentQuestion.explanation || 'Good job!'}
        bottomInset={insets.bottom}
      />

      {/* Mid-Quiz Milestone Modal (ERA-SPECIFIC) */}
      {showMilestone && milestoneData && (
        <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
          <XPMilestoneScreen
            milestoneXP={milestoneData.milestoneXP}
            totalXP={milestoneData.totalXP}
            eraId={eraId}
            onContinue={() => {
              // Video finished, close modal and show feedback
              AppLogger.info('quiz', 'Milestone video finished, resuming quiz');
              setShowMilestone(false);
              setMilestoneData(null);
              setShowFeedback(true);
            }}
          />
        </Modal>
      )}
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
    fontSize: 18,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
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
    fontSize: 18,
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
    fontSize: 18,
    color: ArchivesTheme.colors.shoeBrown,
    lineHeight: 22,
    flexWrap: 'wrap',
  },

  // True/False Options - Umayyad Dynasty Design
  trueFalseOptionsGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20, // Space between True and False buttons
    paddingHorizontal: 0,
  },
  trueFalseContainer: {
    position: 'relative',
  },
  trueFalseShadow: {
    position: 'absolute',
    width: 132, // EXACT: Vertical button 132x120px
    height: 120,
    borderRadius: 20,
    top: 7, // EXACT: 3D depth effect
  },
  trueFalseBorder: {
    position: 'absolute',
    width: 130, // EXACT: Border layer
    height: 120,
    borderRadius: 20,
    borderWidth: 4,
  },
  trueFalseContent: {
    width: 130, // EXACT: Content layer
    height: 120,
    backgroundColor: '#F7F7F7', // Slightly off-white for True/False
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  trueFalseIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(77, 57, 46, 0.4)', // ShoeBrown with 40% opacity (matches MCQ circle)
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  trueFalseText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '500',
    color: ArchivesTheme.colors.shoeBrown,
  },

  // Submit button - Umayyad Dynasty Design
  submitButtonContainer: {
    position: 'absolute',
    // bottom: dynamic - set inline with useSafeAreaInsets
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 10, // Keep button on top of feedback sheet
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

  // Feedback Bottom Sheet - ROI Design
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
    height: 260,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 32,
    paddingTop: 18,
    // paddingBottom: dynamic - set inline with useSafeAreaInsets (80 + insets.bottom)
    zIndex: 5, // Keep sheet behind button
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
    color: ArchivesTheme.colors.persianOrange,
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
