import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

import { AnimatedEntrance } from '@/components/ui/animations';
import {
  ConfettiBurst,
  DepthButton,
  Typography,
  colors,
  safeDuration,
  type ConfettiBurstHandle,
} from '@/components/ui';
import { analyticsService } from '@/services/AnalyticsService';
import { useAI } from '@/gamification';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import AppLogger from '@/services/AppLogger';
import AIQuizExplanation from './AIQuizExplanation';
import AIChatModal from '@/gamification/ui/ai/AIChatModal';
import type { Question } from '@/components/shared/types';
import {
  ActionPill,
  HIGH_TIER_CONFETTI_PALETTE,
  Mascot,
  ScoreCard,
  TIER_SPECS,
  tierFor,
} from './results';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Reward audio — one-shot celebration sound keyed to the score band.
// Thresholds (≥70 / 34-69 / <34) are deliberately INDEPENDENT of the
// existing visual `tierFor()` thresholds so design can re-balance the
// audio bands without touching the mascot/headline tier mapping.
//
// `require` of static assets is resolved at bundle time; the returned
// numeric module id is what `useAudioPlayer` accepts as a `source`.
function getRewardAudio(percentage: number) {
  if (percentage >= 70) {
    return require('@/assets/audio/quiz_reward/quiz-reward3.mp3');
  }
  if (percentage >= 34) {
    return require('@/assets/audio/quiz_reward/quiz-reward2.mp3');
  }
  return require('@/assets/audio/quiz_reward/quiz-reward1.mp3');
}

// ─── Public types ──────────────────────────────────────────────────────────

interface QuizResultsProps {
  correctAnswers: number;
  totalQuestions: number;
  totalPoints: number;
  // Allow Promise return — Quiz.tsx's `handleQuizCompletion` is async
  // (saveNewProgressData + orchestrator celebrations in adventure mode,
  // saveQuestCompletion → Supabase in today mode). Previous `() => void`
  // signature was misleading and let `handleContinue` skip the await.
  onContinue: () => void | Promise<void>;
  onBack?: () => void;
  adventureId: string;
  moduleId: string;
  eraId: string;
  eraName: string;
  adventureNumber: number;
  moduleNumber: number;
  questions?: Question[];
  userAnswers?: number[];
  isToday?: boolean;
  moduleTitle?: string;
}

// ─── Main component ────────────────────────────────────────────────────────

export default function QuizResults({
  correctAnswers,
  totalQuestions,
  totalPoints,
  onContinue,
  onBack,
  adventureId,
  moduleId,
  eraId,
  eraName,
  adventureNumber,
  moduleNumber,
  questions = [],
  userAnswers = [],
  isToday = false,
  moduleTitle,
}: QuizResultsProps) {
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const tier = tierFor(percentage);
  const spec = TIER_SPECS[tier];

  // Reward audio — picked by score band, played once on mount. Memoized
  // so the score-band asset id is captured at first render; even if
  // `percentage` were to change (it doesn't — props are stable for the
  // lifetime of QuizResults), the player wouldn't re-instantiate
  // mid-celebration. `useAudioPlayer` auto-disposes on unmount.
  const rewardAudioSource = useMemo(() => getRewardAudio(percentage), [percentage]);
  const rewardPlayer = useAudioPlayer(rewardAudioSource);
  const hasPlayedRewardRef = useRef(false);

  useEffect(() => {
    if (hasPlayedRewardRef.current) return;
    hasPlayedRewardRef.current = true;
    // Match the audio mode used by TodayScrollableLesson's voiceover —
    // mix with other audio (don't duck the user's music) and play even
    // when the iOS silent switch is on so a muted phone still hears the
    // celebration. `setAudioModeAsync` is global, so this also smooths
    // the handoff if QuizResults is mounted right after a lesson screen
    // that set a different mode.
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      interruptionModeAndroid: 'duckOthers',
    });
    // Delay reward sound by 300ms — the mascot's `dropFromAbove` /
    // `elasticHeroDrop` entrance starts at 100ms and lands ~250-300ms
    // later. Firing the cheer audio synchronously with mount felt
    // pre-emptive (sound played before the mascot was even visible);
    // 300ms aligns the audible peak with the mascot fully on-screen.
    const timer = setTimeout(() => {
      try {
        rewardPlayer.play();
      } catch (error) {
        AppLogger.warn('quiz', 'Reward audio play failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [rewardPlayer]);

  const {
    openChatToLearn,
    messages: aiMessages,
    currentContext,
  } = useAI();
  const { isSubscribed } = useRevenueCat();

  const isPaywallPresentedRef = useRef(false);
  const [openChat, setOpenChat] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);

  // Continue-button processing state. The `Ref` is the source of truth for
  // re-entry blocking (synchronous, beats React's render delay on rapid
  // taps), the `state` is the visual mirror that drives DepthButton's
  // `isDisabled` veil. We need BOTH:
  //   - State-only: a fast double-tap can fire `handleContinue` twice in
  //     the same JS tick before React commits the disabled state.
  //   - Ref-only: the button stays visually tappable (no veil) while
  //     `await onContinue()` runs — looks broken to the user.
  const isProcessingContinueRef = useRef(false);
  const [isProcessingContinue, setIsProcessingContinue] = useState(false);

  // Tier-3 confetti — timing + origin matched to the HTML mock:
  //   • Fires AFTER the count-up finishes (mock fires at `celebAt =
  //     countDone + 0.05s`, ≈2100ms after entrance start). This lets the
  //     user's eye lock onto "100%" before the celebration explodes —
  //     firing during the count-up steals attention from the number.
  //   • Origin = score-card center, not the mascot zone above. Mock fires
  //     from `(0.5, 0.574)` of the canvas — that's the center of the gold
  //     card. Particles burst UP from there, arc, then fall back across
  //     the card. Firing from above (mascot zone) would have particles
  //     flying off the top of the screen, missing the card entirely.
  const confettiRef = useRef<ConfettiBurstHandle>(null);
  const hasFiredConfettiRef = useRef(false);
  useEffect(() => {
    if (tier !== 'high') return;
    if (hasFiredConfettiRef.current) return;
    const timer = setTimeout(() => {
      if (hasFiredConfettiRef.current) return;
      hasFiredConfettiRef.current = true;
      confettiRef.current?.fire({
        x: SCREEN_WIDTH / 2,
        // y = 0.7 puts the origin near the action pills / lower third of
        // the screen. Combined with a wide 120° spread + high velocity,
        // particles burst UP from there and have ~70% of the screen
        // height to travel before gravity pulls them back — they end up
        // covering the headline + score card on the way up AND on the
        // way down. Firing higher (e.g. 0.55 = card center) clipped the
        // top half of the trajectory off the screen too quickly.
        y: SCREEN_HEIGHT * 0.7,
      });
    }, safeDuration(2100));
    return () => clearTimeout(timer);
  }, [tier]);

  // ─── Analytics: results viewed (fire once) ────────────────────────────
  const hasTrackedResultsRef = useRef(false);
  useEffect(() => {
    if (hasTrackedResultsRef.current) return;
    hasTrackedResultsRef.current = true;
    const performanceTier =
      tier === 'high' ? 'high' : tier === 'medium' ? 'medium' : 'low';
    analyticsService.trackQuizResultsViewed({
      adventure_id: adventureId,
      module_id: moduleId,
      quiz_id: moduleId,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      percentage,
      total_points: totalPoints,
      performance_tier: performanceTier,
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
    });
    AppLogger.info('quiz', 'Quiz results viewed', { percentage, tier });
  }, [
    tier,
    adventureId,
    moduleId,
    correctAnswers,
    totalQuestions,
    percentage,
    totalPoints,
    eraId,
    eraName,
    adventureNumber,
    moduleNumber,
  ]);

  // ─── Chat-to-Learn handler (kept identical to legacy behavior) ────────
  const buildChatMessage = useCallback(() => {
    const incorrectList = questions
      .map((q, i) => {
        const userAnswerIdx = userAnswers[i];
        const correctIdx = q.answers.findIndex((a) => a.is_correct);
        if (userAnswerIdx === undefined || userAnswerIdx === null) return null;
        if (userAnswerIdx === correctIdx) return null;
        return `- Q: "${q.question_text}" | You answered: "${q.answers[userAnswerIdx]?.text}" | Correct: "${q.answers[correctIdx]?.text}"`;
      })
      .filter(Boolean)
      .join('\n');

    const title = moduleTitle || `Module ${moduleNumber}`;
    return incorrectList
      ? `I just finished the quiz on "${title}" in ${eraName}. I got ${correctAnswers}/${totalQuestions} correct (${percentage}%). Here are the questions I got wrong:\n${incorrectList}\n\nHelp me understand these topics better with real historical context.`
      : `I just finished the quiz on "${title}" in ${eraName} and got all ${totalQuestions} questions correct (${percentage}%)! Can you share some deeper historical details about this topic that I might not have learned in the lessons?`;
  }, [
    questions,
    userAnswers,
    moduleTitle,
    moduleNumber,
    eraName,
    correctAnswers,
    totalQuestions,
    percentage,
  ]);

  const openChatWithContext = useCallback(() => {
    openChatToLearn(buildChatMessage());
    setOpenChat(true);
  }, [buildChatMessage, openChatToLearn]);

  const handleChatToLearn = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    analyticsService.trackCustomEvent('quiz_results_chat_to_learn_clicked', {
      adventure_id: adventureId,
      module_id: moduleId,
      previous_score: correctAnswers,
      era_id: eraId,
      era_name: eraName,
      percentage,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      is_subscriber: isSubscribed,
    });
    AppLogger.info('quiz', 'Chat to Learn clicked', {
      is_subscriber: isSubscribed,
    });

    if (isSubscribed) {
      openChatWithContext();
      return;
    }
    if (isPaywallPresentedRef.current) return;

    try {
      isPaywallPresentedRef.current = true;
      analyticsService.trackCustomEvent('chat_to_learn_paywall_shown', {
        adventure_id: adventureId,
        module_id: moduleId,
        era_id: eraId,
        era_name: eraName,
        trigger: 'chat_to_learn',
      });
      const result = await RevenueCatUI.presentPaywall();

      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED: {
          AppLogger.info(
            'subscription',
            `Chat to Learn paywall ${result === PAYWALL_RESULT.PURCHASED ? 'purchase' : 'restore'} completed`,
          );
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
          if (result === PAYWALL_RESULT.PURCHASED) {
            analyticsService.trackSubscribePurchaseCompleted({
              trigger: 'chat_to_learn',
            });
          }
          openChatWithContext();
          break;
        }
        case PAYWALL_RESULT.CANCELLED:
          analyticsService.trackSubscribePurchaseCancelled({
            trigger: 'chat_to_learn',
          });
          break;
        case PAYWALL_RESULT.NOT_PRESENTED:
          AppLogger.warn('subscription', 'Chat to Learn paywall not presented');
          break;
        case PAYWALL_RESULT.ERROR:
          AppLogger.error('subscription', 'Chat to Learn paywall error');
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          ).catch(() => {});
          break;
      }
    } catch (error) {
      AppLogger.error(
        'subscription',
        'Chat to Learn paywall exception',
        {},
        error,
      );
    } finally {
      isPaywallPresentedRef.current = false;
    }
  }, [
    adventureId,
    moduleId,
    correctAnswers,
    totalQuestions,
    eraId,
    eraName,
    percentage,
    isSubscribed,
    openChatWithContext,
  ]);

  const handleContinue = useCallback(async () => {
    // Synchronous re-entry guard. A burst of taps can land in the same
    // JS tick — `setIsProcessingContinue(true)` won't have flushed to
    // DepthButton's `isDisabled` yet, so the second tap would still fire
    // `onPress` (and Quiz.tsx's `handleQuizCompletion` would run twice:
    // duplicate `saveNewProgressData`, duplicate `module_completed`
    // analytics, duplicate orchestrator celebrations). The ref blocks
    // that tick-window before React commits.
    if (isProcessingContinueRef.current) return;
    isProcessingContinueRef.current = true;
    setIsProcessingContinue(true);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    analyticsService.trackCustomEvent('quiz_results_continue_clicked', {
      adventure_id: adventureId,
      module_id: moduleId,
      era_id: eraId,
      era_name: eraName,
      adventure_number: adventureNumber,
      module_number: moduleNumber,
      percentage,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      total_points: totalPoints,
    });
    AppLogger.info('quiz', 'Quiz results continue clicked');

    try {
      // Await even if the parent is sync — `onContinue` is typed
      // `() => void | Promise<void>`, so `await` on a void return
      // resolves on the next microtask without changing semantics.
      // For the async case (today/adventure mode), this keeps the
      // button disabled until save + orchestrator celebrations finish.
      await onContinue();
      // Intentionally NOT resetting `isProcessingContinue` on success.
      // The parent has already navigated away (modal dismissed, lesson
      // unmounted) — toggling the veil off here causes a brief flicker
      // during the unmount frame. Component lifecycle handles cleanup.
    } catch (error) {
      // Parent threw → re-enable the button so user can retry. Today
      // mode catches its own Supabase error internally, so this branch
      // mostly fires for adventure-mode `saveNewProgressData` failures.
      AppLogger.error('quiz', 'Quiz results continue failed', {}, error);
      isProcessingContinueRef.current = false;
      setIsProcessingContinue(false);
    }
  }, [
    adventureId,
    moduleId,
    eraId,
    eraName,
    adventureNumber,
    moduleNumber,
    percentage,
    correctAnswers,
    totalQuestions,
    totalPoints,
    onContinue,
  ]);

  const handleToggleExplanations = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setShowExplanations((prev) => !prev);
  }, []);

  // ─── StatusBar imperative one-shot ────────────────────────────────────
  // The previous JSX `<StatusBar>` at the top of the render tree re-applied
  // its props on every commit. On Android, each commit re-fires window
  // flags through the bridge → WindowManager re-layout → the entire
  // SafeAreaView + child stack shifts by a frame on every state change
  // (showExplanations toggle, openChat toggle, AnimatedEntrance progress,
  // etc.) — visible to the user as the screen "jumping up and down."
  // Same root cause + fix that Quiz.tsx applied (see Quiz.tsx:128). Fires
  // once on mount; deps include `isToday` so a remount with different
  // mode picks up the right config.
  useEffect(() => {
    if (isToday) return; // Today chrome owns the status bar
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(colors.snow);
    }
  }, [isToday]);

  // Mascot entrance preset varies by tier — high tier uses elastic overshoot
  // for a more celebratory feel, low/medium use a gentler back.out(2) drop.
  const mascotPreset = useMemo(
    () => (tier === 'high' ? 'elasticHeroDrop' : 'dropFromAbove'),
    [tier],
  );

  return (
    <SafeAreaView style={styles.container} edges={isToday ? [] : ['top']}>
      {/* StatusBar config moved to the mount-time useEffect above. JSX
          <StatusBar> here re-applied on every render — same Android
          window-flag re-fire bug Quiz.tsx already worked around. */}

      <AIChatModal
        visible={openChat}
        onClose={() => setOpenChat(false)}
        initialMessages={aiMessages}
        context={currentContext}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Optional back button — only when caller passes onBack and not in
            Today mode (Today's chrome already provides one). */}
        {onBack && !isToday && (
          <Pressable style={styles.backButton} onPress={onBack} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.onyx} />
          </Pressable>
        )}

        {/* 1. Mascot — 100ms delay */}
        <AnimatedEntrance preset={mascotPreset} delay={100}>
          <Mascot tier={tier} />
        </AnimatedEntrance>

        {/* 2. Headline — 450ms delay */}
        <AnimatedEntrance preset="riseSoft" delay={450}>
          <Typography
            variant="display.large"
            family="bounded"
            color="onyx"
            align="center"
            style={styles.headline}
          >
            {spec.title}
          </Typography>
        </AnimatedEntrance>

        {/* 3. Subhead — 700ms delay */}
        <AnimatedEntrance preset="riseSubtle" delay={700}>
          <Typography
            family="onest"
            size="lg"
            weight="600"
            color="black"
            align="center"
            style={styles.subhead}
          >
            {spec.subtitle}
          </Typography>
        </AnimatedEntrance>

        {/* 4. Score card — 850ms delay (count-up starts at 1150ms) */}
        <AnimatedEntrance preset="riseCard" delay={850}>
          <ScoreCard
            percentage={percentage}
            totalPoints={totalPoints}
            correctAnswers={correctAnswers}
            totalQuestions={totalQuestions}
            spec={spec}
          />
        </AnimatedEntrance>

        {/* Bottom-anchored group — pills + CTA. `marginTop: 'auto'` consumes
            the leftover ScrollView height so this stack hugs the bottom of
            the viewport on tall phones (matching Figma's CTA at y≈752 on
            an 874px canvas). On short phones the content scrolls naturally. */}
        <View style={styles.bottomGroup}>
          {/* 5/6. Action pills — 1900ms + 80ms stagger */}
          <View style={styles.pillStack}>
            <AnimatedEntrance preset="riseListItem" delay={1900}>
              <ActionPill
                icon="bulb"
                label="Understand your answers"
                onPress={handleToggleExplanations}
              />
            </AnimatedEntrance>

            <AnimatedEntrance preset="riseListItem" delay={1980}>
              <View style={styles.pillSpacer}>
                <ActionPill
                  icon="chat"
                  label="Chat to learn more"
                  onPress={handleChatToLearn}
                />
              </View>
            </AnimatedEntrance>
          </View>

          {/* 7. Continue CTA — 2150ms delay */}
          <AnimatedEntrance preset="riseCta" delay={2150}>
            <View style={styles.ctaWrap}>
              <DepthButton
                variant="secondary"
                size="large"
                onPress={handleContinue}
                haptic="medium"
                isDisabled={isProcessingContinue}
              >
                <Typography
                  family="onest"
                  size="lg"
                  weight="700"
                  color="white"
                  style={styles.ctaText}
                >
                  CONTINUE
                </Typography>
              </DepthButton>
            </View>
          </AnimatedEntrance>
        </View>
      </ScrollView>

      <ConfettiBurst
        ref={confettiRef}
        colors={HIGH_TIER_CONFETTI_PALETTE}
        count={120}
        spread={120}
        startVelocity={70}
        duration={2200}
        gravity={1.0}
      />

      {/* AI explanations bottom-sheet — always mounted (the component
          handles its own Modal visibility), driven by `showExplanations`
          which the "Understand your answers" pill toggles. Living at the
          SafeAreaView root keeps it above the ScrollView + ConfettiBurst
          z-stack so the pageSheet renders cleanly even if confetti is
          mid-flight when the user taps the pill. */}
      <AIQuizExplanation
        visible={showExplanations}
        onClose={() => setShowExplanations(false)}
        questions={questions}
        userAnswers={userAnswers}
        eraName={eraName}
        adventureName={`Adventure ${adventureNumber}`}
        adventureId={adventureId}
        moduleId={moduleId}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
// Only layout/orchestration styles live here now — sub-component styles
// (mascot box, score card, pills) moved into the `./results/` modules.

const SCORE_CARD_WIDTH = SCREEN_WIDTH - 40;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    // `flexGrow: 1` makes inner content fill the ScrollView viewport when
    // shorter than the screen, and `justifyContent: 'center'` centers the
    // entire stack as a single block. When content overflows (e.g.
    // AIQuizExplanation expanded), scroll behavior resumes because
    // `flexGrow` only sets a minimum, not a cap.
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headline: {
    marginBottom: 8,
  },
  subhead: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  bottomGroup: {
    width: SCORE_CARD_WIDTH,
    paddingTop: 8,
  },
  pillStack: {
    width: SCORE_CARD_WIDTH,
  },
  pillSpacer: {
    marginTop: 12,
  },
  ctaWrap: {
    width: SCORE_CARD_WIDTH,
    marginTop: 18,
  },
  ctaText: {
    letterSpacing: 0.5,
  },
});
