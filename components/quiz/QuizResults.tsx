// QuizResults.tsx — AFF-818 redesign
// 3 score-tier visual identities (33% / 67% / 100%) matching Figma 3527:6171,
// 3527:6250, 3527:6329. Mascot swap (Rive vs SVG), score-card palette, and
// headline copy all change in lockstep. Entrance timeline mirrors the mock
// in Downloads/03 questions/DEVELOPER_INSTRUCTIONS.md, but every animation
// runs on the Reanimated UI thread for Android performance parity.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Rive, { Alignment, Fit } from 'rive-react-native';
import { SvgXml } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import {
  AnimatedEntrance,
  type EntranceConfig,
} from '@/components/ui/animations';
import {
  ConfettiBurst,
  DepthButton,
  Typography,
  colors,
  easings,
  safeDuration,
  type ColorKey,
  type ConfettiBurstHandle,
} from '@/components/ui';
import { analyticsService } from '@/services/AnalyticsService';
import { useAI } from '@/gamification';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import AppLogger from '@/services/AppLogger';
import AIQuizExplanation from './AIQuizExplanation';
import AIChatModal from '@/gamification/ui/ai/AIChatModal';
import type { Question } from '@/components/shared/types';
import { ibuScreen3Svg } from './icons/ibuScreen3Svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// Tier-3 (high) celebration confetti — palette ported verbatim from the
// HTML mock (Downloads/03 questions/index.html ≈line 2308). Brand-spanning
// 6-color set (gold / acai / pink / blue / deep-blue / white), NOT a
// monochrome gold pile — so the burst reads as a celebration over the
// whole results screen instead of just dressing up the gold card.
const HIGH_TIER_CONFETTI_PALETTE = [
  '#FFDD63', // Aspen Gold
  '#8C60CD', // Acai Secondary (purple)
  '#E84E80', // pink
  '#A2C5FF', // Blue Secondary
  '#1E3C88', // Blue Primary
  '#FFFFFF', // white
];

// ─── Rive sources ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const openMouthRive = require('@/assets/rive/open-mouth.riv');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ibuSkatingRive = require('@/assets/rive/ibu-skating.riv');

// ─── Tier mapping ───────────────────────────────────────────────────────────

type Tier = 'low' | 'medium' | 'high';

interface TierSpec {
  title: string;
  subtitle: string;
  scoreCardBg: ColorKey;
  scoreCardText: ColorKey;
  scoreCardSubText: ColorKey;
  progressTrack: string;
  progressFill: ColorKey;
}

const TIER_SPECS: Record<Tier, TierSpec> = {
  // <34% — Blue Primary card, sad mascot
  low: {
    title: 'NICE EFFORT!',
    subtitle: 'Revisit the lessons & try again',
    scoreCardBg: 'bluePrimary',
    scoreCardText: 'white',
    scoreCardSubText: 'blueSecondary',
    progressTrack: 'rgba(255,255,255,0.3)',
    progressFill: 'white',
  },
  // 34–69% — Acai Primary card, standing/skating mascot
  medium: {
    title: "YOU'VE GOT THIS!",
    subtitle: 'Revisit the lessons & try again',
    scoreCardBg: 'acaiPrimary',
    scoreCardText: 'white',
    scoreCardSubText: 'acaiTertiary',
    progressTrack: 'rgba(229,212,255,0.3)',
    progressFill: 'acaiTertiary',
  },
  // ≥70% — Aspen Gold card, celebrating mascot
  high: {
    title: 'AMAZING JOB!',
    subtitle: "You're getting better every time",
    scoreCardBg: 'aspenGold',
    scoreCardText: 'onyx',
    scoreCardSubText: 'onyx',
    progressTrack: 'rgba(26,26,26,0.18)',
    progressFill: 'onyx',
  },
};

const tierFor = (pct: number): Tier =>
  pct >= 70 ? 'high' : pct >= 34 ? 'medium' : 'low';

// ─── Entrance presets ───────────────────────────────────────────────────────
// Timing values mirror Downloads/03 questions/DEVELOPER_INSTRUCTIONS.md.

const MASCOT_LOW_MED: EntranceConfig = {
  translateY: { from: -20, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 600,
  easing: easings.backOut2,
};

const MASCOT_HIGH: EntranceConfig = {
  translateY: { from: -20, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 700,
  easing: Easing.out(Easing.elastic(1)),
};

const HEADLINE_PRESET: EntranceConfig = {
  translateY: { from: 20, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 550,
  easing: easings.backOut14,
};

const SUBHEAD_PRESET: EntranceConfig = {
  translateY: { from: 12, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 400,
  easing: easings.power2Out,
};

const SCORE_CARD_PRESET: EntranceConfig = {
  translateY: { from: 30, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 500,
  easing: easings.backOut14,
};

const PILL_PRESET: EntranceConfig = {
  translateY: { from: 30, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 450,
  easing: easings.backOut14,
};

const CTA_PRESET: EntranceConfig = {
  translateY: { from: 30, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 450,
  easing: easings.backOut2,
};

// ─── Mascot subcomponent ───────────────────────────────────────────────────
// Tier 1/2 → Rive (GPU-accelerated runtime, built-in idle anims). Tier 3 →
// SvgXml (single-shot rasterization, no idle cost). Both wrapped in a fixed-
// height view with `renderToHardwareTextureAndroid` so the entrance translate
// doesn't re-rasterize the mascot on every Reanimated commit on Android.

function Mascot({ tier }: { tier: Tier }) {
  // Per-tier mascot sizing — each Figma tier has a distinct mascot shape
  // and intended footprint:
  //   • Tier 1 (open-mouth Ibu, crying): centered square figure. Standard
  //     70%-width box keeps it sized like a portrait — extra width here
  //     would just be empty side-padding.
  //   • Tier 2 (skating Ibu): wide pose with outstretched arms + skates.
  //     Full screen width so the wide silhouette reads as intentional.
  //   • Tier 3 (celebrating Ibu + sparkles): rectangular composition with
  //     stars in the upper-right corner. Native SVG viewBox is 358×243
  //     (aspect ≈ 1.47:1), so we render at full width with a proportional
  //     height — the stars stay in their designed positions instead of
  //     getting cropped or squashed.
  const wrapStyle =
    tier === 'high'
      ? styles.mascotWrapHigh
      : tier === 'medium'
        ? styles.mascotWrapWide
        : styles.mascotWrap;

  if (tier === 'high') {
    return (
      <View
        renderToHardwareTextureAndroid
        collapsable={false}
        style={wrapStyle}
      >
        <SvgXml xml={ibuScreen3Svg} width="100%" height="100%" />
      </View>
    );
  }
  const source = tier === 'low' ? openMouthRive : ibuSkatingRive;
  return (
    <View
      renderToHardwareTextureAndroid
      collapsable={false}
      style={wrapStyle}
    >
      <Rive
        source={source}
        autoplay
        fit={Fit.Contain}
        alignment={Alignment.Center}
        style={styles.rive}
      />
    </View>
  );
}

// ─── Animated percentage + progress bar ────────────────────────────────────
// Driven by a single shared value so the digit and the bar fill animate
// together. The text is wrapped in `AnimatedTextInput` + `useAnimatedProps`
// (the canonical Reanimated trick for animating text content without ever
// crossing the JS/UI boundary). Same pattern the streak count-up commit
// (4afaf49) introduced for AFF-818.

function ScoreCard({
  percentage,
  totalPoints,
  correctAnswers,
  totalQuestions,
  spec,
}: {
  percentage: number;
  totalPoints: number;
  correctAnswers: number;
  totalQuestions: number;
  spec: TierSpec;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Count-up + bar fill — start delay matches the score-card entrance
    // landing (850ms entrance delay + ~300ms slack for the card to settle).
    progress.value = withDelay(
      safeDuration(1150),
      withTiming(percentage, {
        duration: safeDuration(900),
        easing: easings.power2Out,
      }),
    );
  }, [percentage, progress]);

  const pctTextProps = useAnimatedProps(() => ({
    text: `${Math.round(progress.value)}%`,
    // RN typing on AnimatedTextInput's animated text prop is loose; cast.
    defaultValue: `${Math.round(progress.value)}%`,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const cardBg = colors[spec.scoreCardBg];
  const textColor = colors[spec.scoreCardText];
  const subTextColor = colors[spec.scoreCardSubText];
  const fillColor = colors[spec.progressFill];

  // Score card layout — 2-row × 2-column grid, matching Figma:
  //   Row 1 (top):    [33%]            [★ 10 XP]
  //   Row 2 (bottom): [Final Score]    [Correct: 1/3]
  //   Row 3:          [── progress bar ──────────]
  //
  // The two columns are flex children with their own `justifyContent:
  // 'space-between'`, so the second-row labels ("Final Score" / "Correct")
  // align on the SAME baseline regardless of how tall the top-row content
  // is. This avoids the alignment drift you'd get from stacking with
  // fixed margins, and keeps the card visually balanced when the XP row
  // wraps to multi-digit values.
  return (
    <View style={[styles.scoreCard, { backgroundColor: cardBg }]}>
      <View style={styles.scoreRow}>
        <View style={styles.scoreColLeft}>
          <AnimatedTextInput
            editable={false}
            pointerEvents="none"
            animatedProps={pctTextProps as any}
            style={[styles.percentageText, { color: textColor }]}
          />
          <Typography
            family="onest"
            size="sm"
            weight="600"
            style={{ color: subTextColor }}
          >
            Final Score
          </Typography>
        </View>

        <View style={styles.scoreColRight}>
          <View style={styles.xpRow}>
            <Ionicons name="star" size={18} color={textColor} />
            <Typography
              family="onest"
              size="lg"
              weight="600"
              style={{ color: textColor, marginLeft: 6 }}
            >
              {totalPoints} XP
            </Typography>
          </View>
          <Typography
            family="onest"
            size="sm"
            weight="600"
            style={{ color: subTextColor }}
          >
            Correct: {correctAnswers}/{totalQuestions}
          </Typography>
        </View>
      </View>

      <View
        style={[styles.progressTrack, { backgroundColor: spec.progressTrack }]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: fillColor },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

// ─── Action pill (Understand your answers / Chat to learn more) ────────────
// Matches the Figma blue-on-blue stacked card: white surface, blueSecondary
// shadow + 1.5px bluePrimary border, lit-bulb / chat-bubble icon on the
// left, chevron on the right. Press feedback is the standard DepthButton
// dip — the pill itself is a self-contained DepthButton with the medium
// size (49px tall, 17px radius) which already matches Figma's `h-[59.25px]`
// shadow card visually.

function ActionPill({
  icon,
  label,
  onPress,
}: {
  icon: 'bulb' | 'chat';
  label: string;
  onPress: () => void;
}) {
  const iconName = icon === 'bulb' ? 'bulb' : 'chatbubble-ellipses';
  return (
    <DepthButton
      variant="tertiary-alt"
      size="medium"
      surfaceColor="white"
      shadowColor="blueSecondary"
      borderColor="bluePrimary"
      onPress={onPress}
      surfaceStyle={styles.pillSurface}
      haptic="light"
    >
      <View style={styles.pillRow}>
        <Ionicons name={iconName} size={22} color={colors.bluePrimary} />
        <Typography
          family="onest"
          size="md"
          weight="600"
          style={styles.pillLabel}
        >
          {label}
        </Typography>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.bluePrimary}
        />
      </View>
    </DepthButton>
  );
}

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

        {/* AI explanations expand inline once user taps "Understand your
            answers". Hidden by default to match Figma's clean results view.
            Sits above the bottom group so it pushes the pills + CTA further
            down rather than overflowing the screen. */}
        {showExplanations && questions.length > 0 && userAnswers.length > 0 && (
          <View style={styles.explanationsWrap}>
            <AIQuizExplanation
              questions={questions}
              userAnswers={userAnswers}
              eraName={eraName}
              adventureName={`Adventure ${adventureNumber}`}
              adventureId={adventureId}
              moduleId={moduleId}
            />
          </View>
        )}

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
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const MASCOT_SIZE = Math.min(SCREEN_WIDTH * 0.9, 500);
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
    // shorter than the screen, and `justifyContent: 'center'` then centers
    // the entire stack (mascot → headline → score card → pills → CTA) as
    // a single block in the available height. When content overflows
    // (e.g. AIQuizExplanation expanded), the scroll behavior resumes
    // because `flexGrow` only sets a minimum, not a cap.
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

  mascotWrap: {
    width: 280,
    height: 280,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tier 2 (skating Ibu) fills the full screen width. We negate the
  // ScrollView's `paddingHorizontal: 20` via `marginHorizontal: -20` so
  // the canvas reaches edge-to-edge despite living inside the padded
  // content container. Height stays equal to MASCOT_SIZE so vertical
  // rhythm with headline / score-card doesn't shift between tiers; the
  // Rive runtime's `Fit.Contain` lets the skater scale to fill the new
  // wider canvas while respecting its native aspect ratio.
  mascotWrapWide: {
    width: SCREEN_WIDTH,
    height: MASCOT_SIZE - 55,
    marginHorizontal: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tier 3 (celebrating Ibu + sparkles SVG). SVG viewBox is 358×243, so
  // we use a full-width canvas with a proportional height so the stars
  // and speed-lines baked into the corners of the artwork keep their
  // intended positions. Without aspect-matching, SvgXml's `width="100%"
  // height="100%"` would distort the celebration composition vertically.
  mascotWrapHigh: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE - 60,
    marginHorizontal: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rive: {
    width: '100%',
    height: '100%',
  },

  headline: {
    marginBottom: 8,
  },
  subhead: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },

  scoreCard: {
    width: SCORE_CARD_WIDTH,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
    borderRadius: 20,
    marginBottom: 22,
  },
  // 2x2 grid: top row = % + XP, bottom row = Final Score + Correct.
  // `alignItems: 'stretch'` makes both columns share the row's height,
  // and each column uses `justifyContent: 'space-between'` so the bottom
  // labels share a baseline.
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scoreColLeft: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  scoreColRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  // Bounded display, 32px black to match Figma's score numeral. We render
  // through TextInput (Reanimated text-prop trick) so the count-up commits
  // on the UI thread — multiline / paddingTop / borders all reset to keep
  // it visually identical to a plain Text node.
  percentageText: {
    fontFamily: 'Bounded-Black',
    fontSize: 32,
    lineHeight: 36,
    padding: 0,
    margin: 0,
    minWidth: 100,
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginBottom: 4,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  progressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Pills + CTA grouped together so they stay contiguous within the
  // centered content stack. No auto-margin trick here: `scrollContent`
  // uses `justifyContent: 'center'` so the entire content block is
  // centered as a unit in the available viewport height.
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
  pillSurface: {
    paddingHorizontal: 18,
  },
  pillRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillLabel: {
    flex: 1,
    color: colors.onyx,
    marginLeft: 12,
  },

  explanationsWrap: {
    width: SCORE_CARD_WIDTH,
    marginTop: 16,
  },

  ctaWrap: {
    width: SCORE_CARD_WIDTH,
    marginTop: 18,
  },
  ctaText: {
    letterSpacing: 0.5,
  },
});
