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
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
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
import { analyticsService } from '@/services/AnalyticsService';
import AppLogger from '@/services/AppLogger';
import {
  DepthButton,
  ScrollFade,
  Typography,
  colors,
  easings,
  safeDuration,
} from '@/components/ui';

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
}

// ──────────────────────────────────────────────────────────
// QuizOptionButton — universal MCQ + True/False option per figma
// 3379:5273-5284 (default + selected) / 5107-5118 (correct) / 5142-5154
// (incorrect). Layered shadow + surface like a DepthButton, with
// per-state colors and tap/submit animations ported from the mock
// (`Downloads/02 daily story/index.html:2640-2697`).
// ──────────────────────────────────────────────────────────

// Width is the only geometry constant we control — height (49), radius
// (17) and shadow offset (6) all come from DepthButton's `size="medium"`
// spec, which already matches the figma values 1:1.
const OPTION_WIDTH = 300;

interface QuizOptionButtonProps {
  text: string;
  isSelected: boolean;
  /** Reveal phase only — this option IS the canonical correct answer. */
  isCorrect?: boolean;
  /** Reveal phase only — this option WAS the user's wrong selection. */
  isWrong?: boolean;
  /** Reveal phase only — true when the user picked the correct answer. */
  isUserCorrect?: boolean;
  /** Submit has been pressed; option is no longer interactive. */
  showResult?: boolean;
  onPress: () => void;
}

function QuizOptionButton({
  text,
  isSelected,
  isCorrect,
  isWrong,
  isUserCorrect,
  showResult,
  onPress,
}: QuizOptionButtonProps) {
  // Visual state machine — extends the OptionCard pattern (default +
  // selected use blue; correct + incorrect add the green/red reveal
  // states for the quiz). All four states pipe through `DepthButton`
  // with surface/shadow/border color overrides per figma 3379:5273-5280
  // (default + selected) / 5107-5114 (correct) / 5142-5149 (incorrect).
  const state: "default" | "selected" | "correct" | "incorrect" =
    showResult && isCorrect
      ? "correct"
      : showResult && isWrong
      ? "incorrect"
      : isSelected
      ? "selected"
      : "default";

  // Color tokens forwarded to DepthButton's surface/shadow/border slots.
  // The `tertiary` variant has no built-in border, so we layer one in via
  // the override; `tertiary-alt` already comes with a 2px border. We use
  // `tertiary-alt` for every state so the 1.5px outline reads consistently
  // across default/correct/incorrect, and switch to `tertiary` only for
  // selected (matches OptionCard).
  const variant: "tertiary" | "tertiary-alt" =
    state === "selected" ? "tertiary" : "tertiary-alt";
  const surfaceToken: "white" | "blueSecondary" | "correctTertiary" | "incorrectTertiary" =
    state === "correct"
      ? "correctTertiary"
      : state === "incorrect"
      ? "incorrectTertiary"
      : state === "selected"
      ? "blueSecondary"
      : "white";
  const shadowToken: "blueSecondary" | "bluePrimary" | "correctSecondary" | "incorrectPrimary" =
    state === "correct"
      ? "correctSecondary"
      : state === "incorrect"
      ? "incorrectPrimary"
      : state === "selected"
      ? "bluePrimary"
      : "blueSecondary";
  const borderToken: "bluePrimary" | "snow" | "correctSecondary" | "incorrectSecondary" =
    state === "correct"
      ? "correctSecondary"
      : state === "incorrect"
      ? "incorrectSecondary"
      : state === "selected"
      ? "snow"
      : "bluePrimary";

  // Per-option Reanimated transforms. Three independent shared values:
  //   - scale: pop on select, bounce on correct submit
  //   - translateX: shake on incorrect submit
  //   - translateY: lift during the celebratory bounce
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Pop animation when transitioning to selected — mock
  // `index.html:2647-2650`. Scale 1→1.04 (100ms power2.out) →
  // 1 (250ms elastic.out(1, 0.4)).
  const wasSelectedRef = useRef(isSelected);
  useEffect(() => {
    const wasSelected = wasSelectedRef.current;
    wasSelectedRef.current = isSelected;
    if (!wasSelected && isSelected) {
      scale.value = withSequence(
        withTiming(1.04, {
          duration: safeDuration(100),
          easing: easings.power2Out,
        }),
        withTiming(1, {
          duration: safeDuration(250),
          easing: Easing.out(Easing.elastic(1)),
        }),
      );
    }
  }, [isSelected, scale]);

  // Reveal animations — only fire on the showResult false→true edge so
  // re-renders don't replay the bounce/shake.
  const wasShowingResultRef = useRef(false);
  useEffect(() => {
    const wasShowing = wasShowingResultRef.current;
    wasShowingResultRef.current = !!showResult;
    if (wasShowing || !showResult) return;

    if (isCorrect && isUserCorrect) {
      // User picked correctly — celebratory bounce.
      // Mock `index.html:2668-2670`:
      //   scale 1.08 + y -6 (180ms power2.out) → 1 + 0 (450ms elastic.out(1, 0.45))
      scale.value = withSequence(
        withTiming(1.08, {
          duration: safeDuration(180),
          easing: easings.power2Out,
        }),
        withTiming(1, {
          duration: safeDuration(450),
          easing: Easing.out(Easing.elastic(1)),
        }),
      );
      translateY.value = withSequence(
        withTiming(-6, {
          duration: safeDuration(180),
          easing: easings.power2Out,
        }),
        withTiming(0, {
          duration: safeDuration(450),
          easing: Easing.out(Easing.elastic(1)),
        }),
      );
    } else if (isCorrect && !isUserCorrect) {
      // User picked wrong; this is the right answer — yoyo bounce drawing
      // the eye 350ms after the shake starts (mock 2695-2697).
      scale.value = withDelay(
        safeDuration(350),
        withRepeat(
          withTiming(1.04, {
            duration: safeDuration(250),
            easing: easings.power2Out,
          }),
          2,
          true,
        ),
      );
    } else if (isWrong) {
      // User picked wrong — shake (mock 2687-2693). Six-step x sequence.
      translateX.value = withSequence(
        withTiming(-10, {
          duration: safeDuration(60),
          easing: easings.power2Out,
        }),
        withTiming(10, {
          duration: safeDuration(80),
          easing: easings.power2InOut,
        }),
        withTiming(-8, {
          duration: safeDuration(80),
          easing: easings.power2InOut,
        }),
        withTiming(6, {
          duration: safeDuration(80),
          easing: easings.power2InOut,
        }),
        withTiming(-4, {
          duration: safeDuration(80),
          easing: easings.power2InOut,
        }),
        withTiming(0, {
          duration: safeDuration(100),
          easing: easings.power2Out,
        }),
      );
    }
  }, [showResult, isCorrect, isWrong, isUserCorrect, scale, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.optionWrap, animatedStyle]}>
      <DepthButton
        variant={variant}
        size="medium"
        surfaceColor={surfaceToken}
        shadowColor={shadowToken}
        borderColor={borderToken}
        onPress={onPress}
        isDisabled={showResult}
      >
        <Typography
          family="onest"
          weight={state === "default" ? "500" : "600"}
          extraColor={colors.black}
          style={styles.optionText}
        >
          {text}
        </Typography>
      </DepthButton>
    </Animated.View>
  );
}

// ──────────────────────────────────────────────────────────
// QuizFeedbackSheet — figma 3379:5130 (correct) / 5165 (incorrect).
// Backdrop fade + back-out slide-up + staggered content entrance per
// mock `index.html:2699-2717`. CONTINUE button is a DepthButton with
// the matching color pair (correct: green, incorrect: red).
// ──────────────────────────────────────────────────────────

const FEEDBACK_SHEET_HEIGHT = 200;
const FEEDBACK_OPEN_MS = 500;
const FEEDBACK_CLOSE_MS = 320;
const FEEDBACK_STAGGER_DELAY_MS = 220;
const FEEDBACK_STAGGER_GAP_MS = 60;
const FEEDBACK_ITEM_DURATION_MS = 320;

interface QuizFeedbackSheetProps {
  visible: boolean;
  isCorrect: boolean;
  points: number;
  explanation: string;
  bottomInset: number;
  onContinue: () => void;
}

function QuizFeedbackSheet({
  visible,
  isCorrect,
  points,
  explanation,
  bottomInset,
  onContinue,
}: QuizFeedbackSheetProps) {
  const sheetTranslateY = useSharedValue(FEEDBACK_SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const titleY = useSharedValue(10);
  const titleOpacity = useSharedValue(0);
  const xpY = useSharedValue(10);
  const xpOpacity = useSharedValue(0);
  const expY = useSharedValue(10);
  const expOpacity = useSharedValue(0);
  const btnY = useSharedValue(10);
  const btnOpacity = useSharedValue(0);

  // Open animation — fires on visible flip true. Close is driven by the
  // CONTINUE tap below (animation completion calls onContinue).
  useEffect(() => {
    if (!visible) return;

    // Reset all elements to their starting offsets so re-opens animate
    // fresh (the user might dismiss + re-trigger feedback for the next
    // question without unmounting the sheet).
    sheetTranslateY.value = FEEDBACK_SHEET_HEIGHT;
    titleY.value = 10;
    titleOpacity.value = 0;
    xpY.value = 10;
    xpOpacity.value = 0;
    expY.value = 10;
    expOpacity.value = 0;
    btnY.value = 10;
    btnOpacity.value = 0;

    // Backdrop fades to 0.3 alongside the sheet.
    backdropOpacity.value = withTiming(0.3, {
      duration: safeDuration(FEEDBACK_OPEN_MS),
      easing: easings.backOut14,
    });
    // Sheet slides up — back.out(1.2) per mock.
    sheetTranslateY.value = withTiming(0, {
      duration: safeDuration(FEEDBACK_OPEN_MS),
      easing: easings.backOut14,
    });

    // Stagger inner contents: title → xp → exp → btn at 60ms gaps,
    // 320ms `back.out(1.6)` each, 220ms after sheet starts.
    const innerEasing = easings.backOut14;
    const animate = (
      yShared: typeof titleY,
      oShared: typeof titleOpacity,
      delayMs: number,
    ) => {
      yShared.value = withDelay(
        safeDuration(delayMs),
        withTiming(0, {
          duration: safeDuration(FEEDBACK_ITEM_DURATION_MS),
          easing: innerEasing,
        }),
      );
      oShared.value = withDelay(
        safeDuration(delayMs),
        withTiming(1, {
          duration: safeDuration(FEEDBACK_ITEM_DURATION_MS),
          easing: innerEasing,
        }),
      );
    };
    animate(titleY, titleOpacity, FEEDBACK_STAGGER_DELAY_MS + FEEDBACK_STAGGER_GAP_MS * 0);
    animate(xpY, xpOpacity, FEEDBACK_STAGGER_DELAY_MS + FEEDBACK_STAGGER_GAP_MS * 1);
    animate(expY, expOpacity, FEEDBACK_STAGGER_DELAY_MS + FEEDBACK_STAGGER_GAP_MS * 2);
    animate(btnY, btnOpacity, FEEDBACK_STAGGER_DELAY_MS + FEEDBACK_STAGGER_GAP_MS * 3);
  }, [
    visible,
    sheetTranslateY,
    backdropOpacity,
    titleY,
    titleOpacity,
    xpY,
    xpOpacity,
    expY,
    expOpacity,
    btnY,
    btnOpacity,
  ]);

  // Tap-handler runs the close animation, then notifies the parent.
  // Parent will then unmount the sheet via its showFeedback toggle.
  const handleTapContinue = () => {
    backdropOpacity.value = withTiming(0, {
      duration: safeDuration(FEEDBACK_CLOSE_MS),
      easing: easings.power2In,
    });
    sheetTranslateY.value = withTiming(
      FEEDBACK_SHEET_HEIGHT,
      {
        duration: safeDuration(FEEDBACK_CLOSE_MS),
        easing: easings.power2In,
      },
      // Worklet completion callback runs on the UI thread — `scheduleOnRN`
      // (the worklets-package replacement for the deprecated
      // `runOnJS`) hops back to the JS thread to invoke the parent's
      // onContinue. Using a plain `require()` here would call CommonJS
      // from the UI runtime and crash Hermes (SIGABRT in the
      // `AnimationFrameBatchinator::flush` path), so the import has to
      // be hoisted to the module scope.
      (finished) => {
        "worklet";
        if (finished) {
          scheduleOnRN(onContinue);
        }
      },
    );
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const xpStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
    transform: [{ translateY: xpY.value }],
  }));
  const expStyle = useAnimatedStyle(() => ({
    opacity: expOpacity.value,
    transform: [{ translateY: expY.value }],
  }));
  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnY.value }],
  }));

  if (!visible) return null;

  const sheetBg = isCorrect ? colors.correctTertiary : colors.incorrectTertiary;
  const titleColor = isCorrect ? colors.correctPrimary : colors.incorrectPrimary;
  const xpColor = colors.correctSecondary;
  const explanationColor = isCorrect ? colors.correctPrimary : colors.incorrectPrimary;
  const ctaSurface = isCorrect ? "correctSecondary" : "incorrectSecondary";
  const ctaShadow = isCorrect ? "correctPrimary" : "incorrectPrimary";

  return (
    <>
      <Animated.View
        style={[styles.feedbackBackdrop, backdropStyle]}
        pointerEvents={visible ? "auto" : "none"}
      />
      <Animated.View
        style={[
          styles.feedbackSheet,
          {
            backgroundColor: sheetBg,
            paddingBottom: bottomInset + 24,
          },
          sheetStyle,
        ]}
      >
        <View style={styles.feedbackHeader}>
          <View style={styles.feedbackTitleRow}>
            <Animated.View style={[styles.feedbackIconWrap, titleStyle]}>
              <Ionicons
                name={isCorrect ? "checkmark-circle" : "close-circle"}
                size={28}
                color={titleColor}
              />
            </Animated.View>
            <Animated.View style={titleStyle}>
              <Typography
                family="onest"
                weight="900"
                size={24}
                extraColor={titleColor}
                style={styles.feedbackTitle}
              >
                {isCorrect ? "CORRECT!" : "INCORRECT!"}
              </Typography>
            </Animated.View>
          </View>
          {isCorrect && (
            <Animated.View style={xpStyle}>
              <Typography
                family="onest"
                weight="700"
                size={14}
                extraColor={xpColor}
                style={styles.feedbackXp}
              >
                {`+${points} XP`}
              </Typography>
            </Animated.View>
          )}
        </View>

        <Animated.View style={expStyle}>
          <Typography
            family="onest"
            weight="500"
            size={14}
            extraColor={explanationColor}
            style={styles.feedbackExplanation}
          >
            {explanation}
          </Typography>
        </Animated.View>

        <Animated.View style={[styles.feedbackContinue, btnStyle]}>
          <DepthButton
            variant="secondary"
            surfaceColor={ctaSurface}
            shadowColor={ctaShadow}
            onPress={handleTapContinue}
          >
            <Typography
              family="onest"
              weight="700"
              size={18}
              extraColor={colors.white}
              style={styles.feedbackContinueLabel}
            >
              CONTINUE
            </Typography>
          </DepthButton>
        </Animated.View>
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
      />
    );
  }

  return (
    <SafeAreaView style={styles.quizContainer} edges={isToday ? [] : ['top']}>
      {isToday ? (
        // Today mode — chrome (TodayLessonChrome) provides the floating
        // back button + progress bar; status bar stays light/transparent.
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />
      ) : (
        // Adventure mode — own status bar over the snow body.
        Platform.OS === 'android' && (
          <StatusBar barStyle="dark-content" backgroundColor={colors.snow} />
        )
      )}

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
                <TouchableOpacity style={styles.adventureBackButton} onPress={onBack}>
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
              The only difference is the option count (2 vs 4). */}
          <View style={styles.optionsGroup}>
            {options.map((option, index) => (
              <QuizOptionButton
                key={index}
                text={option}
                isSelected={selectedAnswer === index}
                isCorrect={showFeedback && index === correctAnswerIndex}
                isWrong={showFeedback && selectedAnswer === index && !isCorrect}
                isUserCorrect={isCorrect}
                showResult={showFeedback}
                onPress={() => handleAnswerSelect(index)}
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
      {!showFeedback && (
        <View
          style={[
            styles.submitContainer,
            { paddingBottom: insets.bottom + 16 },
          ]}
          pointerEvents={selectedAnswer === null ? 'none' : 'auto'}
        >
          {/* Soft fade-out overlay — masks the hard horizontal edge
              where the ScrollView's last visible option meets the
              submit slot. Shared design-system primitive used by both
              this screen and the onboarding personalize phases. */}
          <ScrollFade color={colors.snow} />
          <View style={{ opacity: selectedAnswer === null ? 0.4 : 1 }}>
            <DepthButton
              variant="secondary"
              surfaceColor="correctSecondary"
              shadowColor="correctPrimary"
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
        </View>
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

  // Option button wrapper — fixes a 300px width frame so DepthButton's
  // `isFullWidth` (default true) stretches the surface to match figma
  // 3379:5273-5280. The wrapper also hosts the per-option Reanimated
  // transforms (scale pop / shake / bounce) so they don't fight the
  // DepthButton's internal layout.
  optionWrap: {
    width: OPTION_WIDTH,
  },
  optionText: {
    textAlign: 'center',
    letterSpacing: -0.18,
    paddingHorizontal: 12,
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

  // Feedback sheet — figma 3379:5130 (correct) + 5165 (incorrect).
  // Backdrop sits above the body but below the sheet (zIndex
  // calibrated so the SUBMIT button is hidden when sheet is open).
  feedbackBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 10,
  },
  feedbackSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 20,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feedbackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackTitle: {
    letterSpacing: -0.24,
  },
  feedbackXp: {
    letterSpacing: -0.14,
  },
  feedbackExplanation: {
    letterSpacing: -0.14,
    lineHeight: 18,
    marginBottom: 16,
  },
  feedbackContinue: {
    marginTop: 4,
  },
  feedbackContinueLabel: {
    letterSpacing: -0.18,
  },
});
