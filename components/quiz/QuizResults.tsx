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
  CTA_PRESET,
  HEADLINE_PRESET,
  HIGH_TIER_CONFETTI_PALETTE,
  MASCOT_HIGH,
  MASCOT_LOW_MED,
  Mascot,
  PILL_PRESET,
  SCORE_CARD_PRESET,
  SUBHEAD_PRESET,
  ScoreCard,
  TIER_SPECS,
  tierFor,
} from './results';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Public types ──────────────────────────────────────────────────────────

interface QuizResultsProps {
  correctAnswers: number;
  totalQuestions: number;
  totalPoints: number;
  onContinue: () => void;
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

  const {
    openChatToLearn,
    messages: aiMessages,
    currentContext,
  } = useAI();
  const { isSubscribed } = useRevenueCat();

  const isPaywallPresentedRef = useRef(false);
  const [openChat, setOpenChat] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);

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

  const handleContinue = useCallback(() => {
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
    onContinue();
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

  // Mascot entrance preset varies by tier — high tier uses elastic overshoot.
  const mascotPreset = useMemo(
    () => (tier === 'high' ? MASCOT_HIGH : MASCOT_LOW_MED),
    [tier],
  );

  return (
    <SafeAreaView style={styles.container} edges={isToday ? [] : ['top']}>
      {Platform.OS === 'android' && !isToday && (
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.snow}
        />
      )}

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
        <AnimatedEntrance preset={HEADLINE_PRESET} delay={450}>
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
        <AnimatedEntrance preset={SUBHEAD_PRESET} delay={700}>
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
        <AnimatedEntrance preset={SCORE_CARD_PRESET} delay={850}>
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
            <AnimatedEntrance preset={PILL_PRESET} delay={1900}>
              <ActionPill
                icon="bulb"
                label="Understand your answers"
                onPress={handleToggleExplanations}
              />
            </AnimatedEntrance>

            <AnimatedEntrance preset={PILL_PRESET} delay={1980}>
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
          <AnimatedEntrance preset={CTA_PRESET} delay={2150}>
            <View style={styles.ctaWrap}>
              <DepthButton
                variant="secondary"
                size="large"
                onPress={handleContinue}
                haptic="medium"
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
