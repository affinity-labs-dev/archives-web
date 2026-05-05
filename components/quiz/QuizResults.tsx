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

  // Confetti — three-burst staggered sequence ported from the HTML mock
  // (`Downloads/03 questions/index.html:2326-2395`, function
  // `fireCardConfetti`). Mock spec:
  //
  //     0ms    main burst    — wide spread, high velocity, dense (90)
  //     120ms  fountain L+R  — angled outward from screen edges
  //     350ms  aftershock    — slow drift particles
  //
  // Why three bursts instead of one big one: a single burst flashes on
  // screen for ~1s and then it's done. The staggered triple-fire keeps
  // visual energy alive for ~2.5s — main burst grabs attention, fountains
  // refresh the burst with secondary motion right as the main burst
  // peaks, and the slow-drift aftershock sustains the "celebration is
  // still happening" feel through the headline reveal. Brain reads it
  // as one continuous celebration moment instead of one quick pop.
  //
  // Gating: full 3-burst sequence ONLY for percentage === 100 (matches
  // mock's `if (is100)` gate). Tier-high non-perfect scores (70-99%)
  // still fire the single main burst — keeps the existing reward for
  // strong-but-imperfect scores, just without the perfect-score crescendo.
  const mainBurstRef = useRef<ConfettiBurstHandle>(null);
  const leftFountainRef = useRef<ConfettiBurstHandle>(null);
  const rightFountainRef = useRef<ConfettiBurstHandle>(null);
  const aftershockRef = useRef<ConfettiBurstHandle>(null);
  const hasFiredConfettiRef = useRef(false);
  // Holds a cleanup closure for the chained fountain/aftershock timers
  // so we can clear them if the component unmounts mid-celebration
  // (e.g. user taps Continue before the aftershock fires).
  const cleanupTimersRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (tier !== 'high') return;
    if (hasFiredConfettiRef.current) return;

    // Origin Y = 70% of screen height — keeps origin near the score
    // card / action pill zone so the upward burst covers the headline
    // + card on the rise and falls back over the same area. Firing from
    // higher (e.g. 0.55 = card center) clipped the top half of the
    // trajectory off the screen too quickly.
    const cardCenterY = SCREEN_HEIGHT * 0.7;
    const isPerfect = percentage === 100;

    const mainTimer = setTimeout(() => {
      if (hasFiredConfettiRef.current) return;
      hasFiredConfettiRef.current = true;

      // Burst 1 — main center burst (always fires for tier high).
      mainBurstRef.current?.fire({
        x: SCREEN_WIDTH / 2,
        y: cardCenterY,
      });

      // 70-99% scores stop here — single main burst is the reward.
      if (!isPerfect) return;

      // Burst 2 — left + right fountains, 120ms after main. The two
      // fountains fire SIMULTANEOUSLY (single setTimeout with both
      // .fire() calls); their staggered ARRIVAL timing is the offset
      // from burst 1, not relative to each other.
      const fountainTimer = setTimeout(() => {
        leftFountainRef.current?.fire({
          x: SCREEN_WIDTH * 0.18,
          y: cardCenterY + SCREEN_HEIGHT * 0.02,
        });
        rightFountainRef.current?.fire({
          x: SCREEN_WIDTH * 0.82,
          y: cardCenterY + SCREEN_HEIGHT * 0.02,
        });
      }, 120);

      // Burst 3 — aftershock 350ms after main. Smaller, slower, drifts
      // down rather than shooting up — gives the celebration a soft
      // "settle" beat instead of a hard cut.
      const aftershockTimer = setTimeout(() => {
        aftershockRef.current?.fire({
          x: SCREEN_WIDTH / 2,
          y: cardCenterY - SCREEN_HEIGHT * 0.02,
        });
      }, 350);

      // Cleanup chained timers on unmount mid-celebration (e.g. user
      // taps Continue before the aftershock fires).
      cleanupTimersRef.current = () => {
        clearTimeout(fountainTimer);
        clearTimeout(aftershockTimer);
      };
    }, safeDuration(2100));

    return () => {
      clearTimeout(mainTimer);
      cleanupTimersRef.current?.();
    };
  }, [tier, percentage]);

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

      {/* Four ConfettiBurst instances — each is a separate component
          because ConfettiBurst's params (count/spread/velocity/etc.)
          are PROPS, not arguments to fire(). To get four bursts with
          different physics (matching the mock's main / fountain / fountain
          / aftershock spec), we instantiate four pre-mounted instances
          and trigger them via separate refs. Each instance's particle
          worklets short-circuit when isFiring=0 so idle cost is ~0.

          ─── Physics tuning — "boom boom boom" ──────────────────────
          User feedback: "nhanh và mạnh hơn, dứt khoát hơn" — fast,
          hard, decisive. Each burst is now a sharp impulse with a
          short visible window (~1100-1200ms) instead of the previous
          longer-tailed ~2000ms shape. Brain reads the staggered fire
          (0 / 120 / 350ms) as three distinct CRACKS rather than a
          single sustained haze.

          Velocity bumped 70 → 90 (RN port ×8 = 720 px/s upward, peak
          height analytic 720²/600 ≈ 864 px — particles travel nearly
          a full screen height before fading). At gravity 0.3, t_peak
          = 720/300 = 2.4 × lifespan, so particles never visibly fall.

          Durations CUT roughly in half: main 2000→1100, fountains
          1800→1000, aftershock 2200→1200. Per-fade math:
          fadeStart=0.7-0.85 of duration (hardcoded in ConfettiBurst),
          so 1100ms means particles stay fully opaque ~770ms then
          fade in 330ms — punchy spike, no lingering "haze" tail. */}

      {/* Burst 1 — main center burst. Densest (75 particles, Android-safe
          ceiling) + tight 40° cone + high velocity = a vertical CRACK
          straight up the screen. */}
      <ConfettiBurst
        ref={mainBurstRef}
        colors={HIGH_TIER_CONFETTI_PALETTE}
        count={75}
        spread={40}
        startVelocity={90}
        gravity={0.3}
        duration={1100}
      />

      {/* Burst 2a — left fountain. Off-center origin (x=0.18) gives the
          directional "fountain" feel without needing angle support.
          Slightly higher velocity (95) so they shoot HIGHER than the
          main burst — delayed entry needs to claim attention against
          the still-visible main spike. Shorter duration (1000ms) so
          they fade just before the aftershock arrives — gives each
          burst its own clean visual slot. */}
      <ConfettiBurst
        ref={leftFountainRef}
        colors={HIGH_TIER_CONFETTI_PALETTE}
        count={60}
        spread={40}
        startVelocity={95}
        gravity={0.3}
        duration={1000}
      />

      {/* Burst 2b — right fountain. Mirror of 2a (origin x=0.82). */}
      <ConfettiBurst
        ref={rightFountainRef}
        colors={HIGH_TIER_CONFETTI_PALETTE}
        count={60}
        spread={40}
        startVelocity={95}
        gravity={0.3}
        duration={1000}
      />

      {/* Burst 3 — aftershock. Slightly wider spread (60°) + lower
          velocity (75) = a softer "second wind" beat that diffuses
          where the first two bursts left vertical trails. Duration
          1200ms keeps the celebration's exit punchy — total visible
          window from main fire to aftershock fade ≈ 1.55s, ~40%
          tighter than before. */}
      <ConfettiBurst
        ref={aftershockRef}
        colors={HIGH_TIER_CONFETTI_PALETTE}
        count={40}
        spread={60}
        startVelocity={75}
        gravity={0.3}
        duration={1200}
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
