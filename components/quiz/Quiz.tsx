// Quiz.tsx - Universal Quiz Component for all eras
// Accepts dynamic quiz data from adventures.content_list
// Clean, modern design with bottom sheet feedback

import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
import QuizOptionButton from './QuizOptionButton';
import QuizFeedbackSheet from './QuizFeedbackSheet';
import { QUIZ_IMAGES, QUIZ_IMAGE_KEYS } from './quizImages';
import { ADVENTURE_KEYS } from '@/constants/WalkthroughKeys';
import XPMilestoneScreen from '@/gamification/ui/celebrations/XPMilestoneScreen';
import { analyticsService } from '@/services/AnalyticsService';
import AppLogger from '@/services/AppLogger';
import {
  ConfettiBurst,
  DepthButton,
  ScrollFade,
  Typography,
  colors,
  durations,
  type ConfettiBurstHandle,
} from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';

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
  /**
   * Optional — fires when the per-question feedback sheet opens or
   * closes. Today mode uses this to make the surrounding chrome's
   * floating header transparent while feedback is visible, so Quiz's
   * existing dim backdrop bleeds through behind the back button +
   * progress bar (otherwise the chrome header masks the dim and the
   * top of the screen looks unaffected by the feedback overlay).
   */
  onFeedbackChange?: (state: { visible: boolean; isCorrect: boolean }) => void;
  /**
   * Optional — fires when the post-quiz results screen opens or
   * closes. Today mode uses this to hide the chrome's progress bar
   * once the user reaches the results view (the "Progress today"
   * label no longer makes sense over a results summary; the back
   * button stays for navigation).
   */
  onResultsChange?: (visible: boolean) => void;
}

// QuizOptionButton, QuizFeedbackSheet, and QUIZ_IMAGES live in their
// own files now (./QuizOptionButton.tsx, ./QuizFeedbackSheet.tsx,
// ./quizImages.ts). This file is the orchestrator only — state +
// handlers + layout that wires them together.


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
  onFeedbackChange,
  onResultsChange,
}: QuizProps) {
  const { saveNewProgressData, getProgressByStringIds } = useGamifiedProgress();
  const { reportQuizComplete } = useGamificationOrchestrator();
  const liveInsets = useSafeAreaInsets();
  // Stable insets — caches first non-zero values from
  // `useSafeAreaInsets()` so the quiz body's `paddingTop: insets.top +
  // 55` doesn't reflow if SafeAreaProvider context re-fires on Android
  // Modal entrance. Without caching, the entrance animation would
  // commit the wrong paddingTop for a frame, then jump to the right
  // value as the provider settled.
  const cachedInsetsRef = useRef(liveInsets);
  if (
    cachedInsetsRef.current.top === 0 &&
    cachedInsetsRef.current.bottom === 0 &&
    (liveInsets.top > 0 || liveInsets.bottom > 0)
  ) {
    cachedInsetsRef.current = liveInsets;
  }
  const insets = cachedInsetsRef.current;
  const { playTap, playCorrect, playIncorrect } = useQuizSounds();

  // StatusBar config — imperative one-shot on mount. The previous JSX
  // <StatusBar> at the top of the render tree re-applied on every
  // commit; on Android each commit re-fires window flags through the
  // bridge → window manager re-layout → chrome + parent tab bar
  // jitter on every quiz state change.
  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      if (isToday) {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
      } else {
        StatusBar.setBackgroundColor(colors.snow);
      }
    }
  }, [isToday]);

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

  const quizStartTimeRef = useRef(Date.now());

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [randomImageIndex, setRandomImageIndex] = useState(Math.floor(Math.random() * QUIZ_IMAGE_KEYS.length));
  const [showResults, setShowResults] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [userAnswers, setUserAnswers] = useState<number[]>([]); // Track all user answers for AI explanations
  // Exit-cascade gate for the option list — flipped true between
  // questions so the current options slide off-left (mirrors
  // OptionList.tsx's `exitSignal`). Reset to false alongside the
  // question-index bump so the new options enter fresh from the right.
  const [optionsExiting, setOptionsExiting] = useState(false);

  // Mid-quiz milestone detection
  const [initialXP, setInitialXP] = useState(0);
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneData, setMilestoneData] = useState<{milestoneXP: number; totalXP: number} | null>(null);

  // Confetti ref + per-option view refs. Used on a correct submit to
  // anchor the puff at the selected option's screen-space center
  // (mock `index.html:2671-2679`). Refs are populated via `registerView`
  // callbacks on each `QuizOptionButton`.
  const confettiRef = useRef<ConfettiBurstHandle>(null);
  const optionViewRefs = useRef<(View | null)[]>([]);

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

  // Notify parent (today.tsx's chrome wrapper) when the per-question
  // feedback sheet opens or closes. The wrapper makes the chrome
  // header transparent during feedback so Quiz's dim backdrop covers
  // the floating progress + back-button area too. Adventure mode
  // passes no callback, making this a no-op there. Hook sits above
  // the `questions.length === 0` early return so it's called
  // unconditionally on every render.
  useEffect(() => {
    const list = contentItem.questions || [];
    if (list.length === 0) return;
    const correctIdx = list[currentQuestionIndex]?.answers.findIndex(
      (a) => a.is_correct,
    );
    const isCorrect = selectedAnswer === correctIdx;
    onFeedbackChange?.({ visible: showFeedback, isCorrect });
  }, [
    showFeedback,
    selectedAnswer,
    contentItem,
    currentQuestionIndex,
    onFeedbackChange,
  ]);

  // Notify parent when the post-quiz results screen mounts/unmounts so
  // the today chrome can hide its progress bar (back button stays).
  // Adventure mode passes no callback → no-op.
  useEffect(() => {
    onResultsChange?.(showResults);
  }, [showResults, onResultsChange]);

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

      // Confetti puff anchored at the selected option's center.
      // Spec ported from `Downloads/02 daily story/index.html:2669-2677`:
      //   particleCount: 45, spread: 55, startVelocity: 28, ticks: 140
      //   colors: ['#5B980C', '#D6FFB8', '#234200', '#aad86a', '#7bc23b']
      // Render-side overrides (gravity, duration) are configured on the
      // <ConfettiBurst> element below — see that block for why.
      // measureInWindow returns screen-space coords that match the
      // overlay's StyleSheet.absoluteFill positioning. Guard on `w > 0`
      // because measureInWindow can resolve to (0,0,0,0) on Android if
      // the view was detached between submit and the async callback —
      // emitting from (0,0) would be worse than no burst.
      const optionView = optionViewRefs.current[selectedAnswer];
      optionView?.measureInWindow((x, y, w, h) => {
        if (w === 0 && h === 0) return;
        confettiRef.current?.fire({ x: x + w / 2, y: y + h / 2 });
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playIncorrect();
    }

    setShowFeedback(true);
  };

  // Handle continue to next question
  const handleContinueToNext = () => {
    if (questionNumber < totalQuestions) {
      // Not last question — fire the option exit cascade first, then
      // advance the question index after the cascade completes. The
      // SUBMIT slot is gated on `!optionsExiting` so it stays hidden
      // during the cascade and animates back in via slideFromBottom
      // once the new question's options have entered.
      setShowFeedback(false);
      setOptionsExiting(true);
      // Total cascade time = base exit duration + per-card stagger.
      // Matches OptionList's exit math (350ms + 40ms × index).
      const exitTotalMs =
        durations.cardExit +
        durations.cardExitInterval * Math.max(0, options.length - 1);
      setTimeout(() => {
        setSelectedAnswer(null);
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setRandomImageIndex(Math.floor(Math.random() * QUIZ_IMAGE_KEYS.length));
        setQuestionStartTime(Date.now()); // Reset timer for next question
        setOptionsExiting(false);
      }, exitTotalMs);
    } else {
      // Last question — show results screen.
      // Fire `onResultsChange` synchronously (alongside setShowResults)
      // so React 18 batches BOTH state updates into a single commit.
      // Without this, the parent (today.tsx) only finds out about the
      // results view AFTER Quiz has already returned <QuizResults />,
      // and there's a one-frame gap where the chrome still renders its
      // progress bar above the results screen. The useEffect below is
      // the safety net for any other state path that flips showResults.
      setShowFeedback(false);
      setShowResults(true);
      onResultsChange?.(true);
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
        adventureId={adventureId}
        moduleId={moduleId}
        eraId={eraId}
        eraName={eraName}
        adventureNumber={adventureNumber}
        moduleNumber={moduleNumber}
        questions={questions}
        userAnswers={userAnswers}
        moduleTitle={contentItem.thumbnail_title || undefined}
      />
    );
  }

  return (
    <SafeAreaView style={styles.quizContainer} edges={isToday ? [] : ['top']}>
      {/* StatusBar config moved to the mount-time useEffect below.
          JSX <StatusBar> here re-applied props on every render — and on
          Android each commit re-fires window flags through the bridge,
          causing window manager re-layout. Inside Today's modal that
          translates directly into the chrome + parent tab bar shaking
          for a frame on every quiz re-render (state changes during
          countdown, feedback transitions, results, etc.). The
          imperative one-shot in the useEffect fires once and stays put. */}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: isToday ? insets.top + 55 : 0,
          paddingBottom: 16,
        }}
      >
        <View style={styles.questionContent}>
          {/* Adventure-mode header — quiz title + back button (kept for
              the existing brown brand). Today mode uses the chrome's
              back button and skips this block. */}
          {!isToday && (
            <View style={styles.adventureHeader}>
              {onBack && (
                <TouchableOpacity style={styles.adventureBackButton} onPress={() => {
                  if (!showResults) {
                    analyticsService.trackQuizAbandoned({
                      adventure_id: adventureId,
                      module_id: moduleId,
                      questions_answered: currentQuestionIndex,
                      total_questions: questions.length,
                      time_spent_seconds: Math.round((Date.now() - quizStartTimeRef.current) / 1000),
                      era_id: eraId,
                      era_name: eraName,
                    });
                  }
                  onBack();
                }}>
                  <Ionicons name="chevron-back" size={24} color="#4D392E" />
                </TouchableOpacity>
              )}
              <View style={styles.adventureTitleContainer}>
                <Text style={styles.adventureQuizTitle}>{quizTitle}</Text>
              </View>
            </View>
          )}

          {/* Question counter — figma 3379:5267 (Onest Medium 14, black,
              center, letter-spacing -0.14). Single-line caption above
              the image. */}
          <Typography
            family="onest"
            weight="500"
            size={14}
            extraColor={colors.black}
            style={styles.questionCounter}
          >
            {`Question ${questionNumber} of ${totalQuestions}`}
          </Typography>

          {/* Question image — preserved from previous design. Random per
              question, slight rotation, transparent background. */}
          <View style={styles.imageSection}>
            <Image
              source={QUIZ_IMAGES[QUIZ_IMAGE_KEYS[randomImageIndex]]}
              style={styles.questionImage}
              contentFit="contain"
              transition={300}
            />
          </View>

          {/* Question text — figma 3379:5285 (Onest SemiBold 18, black,
              center, letter-spacing -0.18). */}
          <Typography
            family="onest"
            weight="600"
            size={18}
            align="center"
            extraColor={colors.black}
            style={styles.questionText}
          >
            {currentQuestion.question_text}
          </Typography>

          {/* Answer options — same `QuizOptionButton` for MCQ and T/F.
              The only difference is the option count (2 vs 4).
              `key` is per-question so React drops + remounts on every
              advance, replaying the entrance stagger from the right
              (mirrors OptionList's animateIn/exitSignal pattern). */}
          <View style={styles.optionsGroup}>
            {options.map((option, index) => (
              <QuizOptionButton
                key={`q${currentQuestionIndex}-${index}`}
                text={option}
                isSelected={selectedAnswer === index}
                isCorrect={showFeedback && index === correctAnswerIndex}
                isWrong={showFeedback && selectedAnswer === index && !isCorrect}
                isUserCorrect={isCorrect}
                showResult={showFeedback}
                onPress={() => handleAnswerSelect(index)}
                registerView={(view) => {
                  optionViewRefs.current[index] = view;
                }}
                animationIndex={index}
                animateIn
                exitSignal={optionsExiting}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* SUBMIT — flows as a regular flex child below the ScrollView
          (`flex: 0` slot, fixed natural height) so the option list can
          never overflow underneath it. Previously this was
          `position: absolute` with manual bottom-padding math on the
          ScrollView, which broke on shorter devices. The slot's
          paddingBottom honors the safe-area inset for home-indicator
          spacing, paddingTop adds breathing room above the button. */}
      {/* SUBMIT slot — gated on `!optionsExiting` so it stays hidden
          during the inter-question exit cascade. When the new question
          mounts, AnimatedEntrance fires the slideFromBottom (y 60 → 0,
          opacity 0 → 1, 600ms back.out(2)) preset — the same shape used
          by the CONTINUE button on onboarding-step-5. The 900ms delay
          lets the option entrance stagger settle before the SUBMIT
          rises into view, matching the mock spec ordering. The
          per-question `key` causes the entrance to replay on each new
          question rather than only on first mount. */}
      {!showFeedback && !optionsExiting && (
        <AnimatedEntrance
          key={`submit-q${currentQuestionIndex}`}
          preset="slideFromBottom"
          delay={900}
        >
          <View
            style={[
              styles.submitContainer,
              { paddingBottom: insets.bottom + 16 },
            ]}
          >
            {/* Soft fade-out overlay — masks the hard horizontal edge
                where the ScrollView's last visible option meets the
                submit slot. Shared design-system primitive used by both
                this screen and the onboarding personalize phases. */}
            <ScrollFade color={colors.snow} />
            {/* Disabled state goes through DepthButton's `isDisabled` prop
                — that path uses a veil overlay on top of the surface +
                shadow stack, preserving 3D depth and rendering correctly
                on both iOS and Android. The previous wrapper-View opacity
                approach (`<View opacity:0.4>`) re-introduced the Android
                alpha-multiplication bug: surface + shadow strip both got
                50% alpha, shadow bled through the surface, and the green
                Submit looked desaturated/broken. Pointer events are
                already gated inside DepthButton when `isDisabled`. */}
            <DepthButton
              variant="secondary"
              surfaceColor="correctSecondary"
              shadowColor="correctPrimary"
              isDisabled={selectedAnswer === null}
              onPress={handleSubmit}
            >
              <Typography
                family="onest"
                weight="700"
                size={18}
                extraColor={colors.white}
                style={styles.submitLabel}
              >
                SUBMIT
              </Typography>
            </DepthButton>
          </View>
        </AnimatedEntrance>
      )}

      {/* Feedback bottom sheet — replaces both the old Submit-as-Continue
          button and the legacy ROIFeedbackSheet. Owns its own slide-up
          animation + content stagger; CONTINUE tap runs close animation,
          then calls back to advance to the next question. */}
      <QuizFeedbackSheet
        visible={showFeedback}
        isCorrect={isCorrect}
        points={pointsPerQuestion}
        explanation={currentQuestion.explanation || 'Good job!'}
        bottomInset={insets.bottom}
        onContinue={handleContinueToNext}
      />

      {/* Confetti overlay — mounts at the very top of the tree so its
          particles render above the option grid AND the feedback sheet's
          backdrop. `pointerEvents="none"` (set inside the component) means
          taps still reach CONTINUE.
          Palette ported from `Downloads/02 daily story/index.html:2669-2677`.
          The tunings below depart from the mock's literal numeric spec
          (particleCount/spread/velocity) on purpose — direct user
          feedback was "bắn thẳng, mạnh, nhanh, cao hơn giống pháo hoa"
          (shoot upward, fast, hard, and high — like fireworks). The
          mock's canvas-confetti params (28 velocity, 55 spread) are
          tuned for a small green "puff"; the user wants a fireworks
          burst, so the physics here are tuned for that feel instead.

          Tuned aggressively for the "dopamine spike" target — the
          burst exists to reward correct answers and amplify the
          excitement of getting one right, so it leans hard on three
          dials known to drive that response: high impulse (initial
          shoot velocity), tight time window (snap-fast, brain reads
          as a single "BANG" not a "fountain"), and high density
          (more motion cues per frame).

          Reference: MagicUI fireworks demo
          (https://magicui.design/docs/components/confetti) — uses
          ticks=60 (~1s) for a snappy short-lived burst. Adapted to
          the analytic physics in ConfettiBurst.tsx:

          • `startVelocity={70}` — RN port multiplies ×8 → 560 px/s
            upward initial. Peak height analytic
            ≈ velocity² / (2·gravity·1000) ≈ 522 px above origin.
            Particles travel high enough to nearly clear the screen
            before fading — visual energy maximised.

          • `gravity={0.3}` — light pull. Peak time
            t_peak = velocity / (gravity·1000) = 560/300 ≈ 1.87 ×
            lifespan, so particles are still strongly RISING when
            they fade out. Brain registers "shooting up off-screen",
            which reads as more energetic than seeing them peak +
            settle.

          • `spread={40}` — tight ±20° cone from vertical. Wider
            spreads (75°+) feel like fountains; tight cone reads as
            a directional rocket — unified motion, easier for the
            brain to grok as "explosive launch".

          • `count={75}` — denser still. Above ~80 mid-tier Android
            drops frames on the per-particle opacity blend; 75 is
            the safe ceiling that still feels lush.

          • `duration={900}` — short and snappy. ≈ 54 ticks at 60fps,
            slightly under MagicUI's ticks=60. Pulled in from 1300
            because: (1) particles' visible peak hits well before
            duration ends regardless (they fade faster than they
            settle, no benefit to the long tail), and (2) shorter
            burst window = sharper "BANG" reading, more dopamine. */}
      <ConfettiBurst
        ref={confettiRef}
        colors={['#5B980C', '#D6FFB8', '#234200', '#AAD86A', '#7BC23B']}
        count={75}
        spread={40}
        startVelocity={70}
        gravity={0.3}
        duration={900}
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
  // Snow body — matches figma 3379:5265 / 5106 / 5141 (`bg-[#fafafa]`).
  quizContainer: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  scroll: {
    flex: 1,
  },
  questionContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },

  // Adventure-mode header (back button + quiz title) — kept for the
  // existing brown brand. Today mode skips this entirely (chrome owns it).
  adventureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    marginBottom: 12,
  },
  adventureBackButton: {
    position: 'absolute',
    left: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(77, 57, 46, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  adventureTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  adventureQuizTitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
  },

  // "Question N of M" — figma 3379:5267.
  questionCounter: {
    textAlign: 'center',
    letterSpacing: -0.14,
    marginTop: 8,
    marginBottom: 16,
  },

  // Image block — kept transparent + slight rotation per existing
  // pattern (figma shows the ImageBackground from 3379:5119/5155 as a
  // light-grey card behind the image; we omit that to match the default
  // 5265 state which has no card backdrop).
  imageSection: {
    alignItems: 'center',
    marginBottom: 20,
    height: 180,
    justifyContent: 'center',
  },
  questionImage: {
    width: 175,
    height: 175,
    transform: [{ rotate: '-1deg' }],
  },

  // Question text — figma 3379:5285 (Onest SemiBold 18 black, center,
  // letter-spacing -0.18).
  questionText: {
    letterSpacing: -0.18,
    marginBottom: 28,
  },

  // Options column — both MCQ and T/F use this layout. The pill widths
  // are fixed (300px) per figma; horizontal centering via alignItems.
  optionsGroup: {
    alignItems: 'center',
    gap: 20,
  },

  // SUBMIT button slot — sits as a regular flex child below the
  // ScrollView so the option list can never overflow under it on
  // short devices. paddingBottom is set inline with the safe-area
  // inset so the button clears the home indicator. Inner opacity
  // fade (0.4 ↔ 1) follows whether an option is selected, per the
  // mock's `q-submit-wrap.muted` semantics (`index.html:796`).
  submitContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  submitLabel: {
    letterSpacing: -0.18,
  },
});
