// AIQuizExplanation.tsx — AFF-818 redesign
// Bottom-sheet modal that exposes AI-generated quiz explanations.
// Figma:
//   • Subscribed:    3527:6490  (scrollable list, all 3 questions)
//   • Non-subscribed: 3527:6460 (Q1 only + paywall overlay, no scroll)
//
// Modal presentation matches the Settings / Avatar modals (`pageSheet` +
// slide-from-bottom) so it lands as a familiar iOS-native bottom sheet.
// Auto-fetches on `visible=true`, applying a 15s timeout + 2-retry budget
// in both modes (batch for subscribed, Q1-only for free).

import { Question } from '@/components/shared/types';
import { aiService } from '@/gamification';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { SvgXml } from 'react-native-svg';

import { DepthButton, Typography, colors } from '@/components/ui';
import AppLogger from '@/services/AppLogger';
import { starBulletSvg } from './icons/starBulletSvg';

interface AIQuizExplanationProps {
  /** Drives the bottom-sheet visibility. Passing true also kicks off the fetch. */
  visible: boolean;
  /** Called when the user dismisses the sheet (close button or swipe). */
  onClose: () => void;
  questions: Question[];
  userAnswers: number[];
  eraName: string;
  adventureName?: string;
  adventureId: string;
  moduleId: string;
}

interface ExplanationItem {
  questionNumber: number;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  aiExplanation?: string;
  loading: boolean;
  error?: string;
}

const MAX_RETRIES = 2;
const TIMEOUT_MS = 15_000;

// ─── Question card ──────────────────────────────────────────────────────────
// Single Q block: badge + question + "Your answer:" line + bulb + AI text.
// Used for both subscribed (3 stacked) and the Q1 preview for free users.
function ExplanationCard({
  item,
  showDivider,
}: {
  item: ExplanationItem;
  showDivider: boolean;
}) {
  const answerColor = item.isCorrect
    ? colors.correctSecondary
    : colors.incorrectSecondary;

  return (
    <View style={cardStyles.wrap}>
      <View style={cardStyles.badge}>
        <Typography family="onest" size="xs" weight="600" color="onyx">
          Q{item.questionNumber}
        </Typography>
      </View>

      <Typography
        family="onest"
        size="md"
        weight="600"
        color="onyx"
        style={cardStyles.question}
      >
        {item.questionText}
      </Typography>

      <View style={cardStyles.answerRow}>
        <Typography family="onest" size="sm" weight="500" color="onyx">
          Your answer:{' '}
        </Typography>
        <Typography
          family="onest"
          size="sm"
          weight="500"
          style={{ color: answerColor }}
        >
          {item.userAnswer}
        </Typography>
      </View>

      {item.loading ? (
        <View style={cardStyles.loadingBlock}>
          <ActivityIndicator size="small" color={colors.acaiSecondary} />
        </View>
      ) : item.error ? (
        <Typography
          family="onest"
          size="sm"
          weight="500"
          style={cardStyles.errorText}
        >
          {item.error}
        </Typography>
      ) : item.aiExplanation ? (
        <View style={cardStyles.explanationRow}>
          <Ionicons
            name="bulb"
            size={18}
            color={colors.acaiSecondary}
            style={cardStyles.bulbIcon}
          />
          <Typography
            family="onest"
            size="md"
            weight="400"
            color="onyx"
            style={cardStyles.explanationText}
          >
            {item.aiExplanation}
          </Typography>
        </View>
      ) : null}

      {showDivider && <View style={cardStyles.divider} />}
    </View>
  );
}

// ─── Paywall overlay ────────────────────────────────────────────────────────
// Free-tier card matching Figma 3527:6460 — light-blue surface with white
// inner feature panel + UPGRADE CTA + restore link.
function PaywallCard({
  questionsCount,
  onUpgrade,
}: {
  questionsCount: number;
  onUpgrade: () => void;
}) {
  return (
    <View style={paywallStyles.card}>
      <View style={paywallStyles.titleRow}>
        <Ionicons name="lock-closed" size={20} color={colors.onyx} />
        <Typography
          family="onest"
          size="lg"
          weight="600"
          color="onyx"
          style={paywallStyles.title}
        >
          Unlock All Explanations
        </Typography>
      </View>

      <Typography
        family="onest"
        size="sm"
        weight="500"
        color="onyx"
        style={paywallStyles.subtitle}
      >
        You are seeing a preview of Q1. Upgrade to get explanations for all{' '}
        {questionsCount} questions.
      </Typography>

      <View style={paywallStyles.featureBox}>
        {[
          'AI explanations for every question',
          'Understand your mistakes deeply',
          'Personalized study tips',
          'Unlimited quiz attempts',
        ].map((label) => (
          <View key={label} style={paywallStyles.featureRow}>
            <SvgXml
              xml={starBulletSvg}
              width={14}
              height={14}
              style={paywallStyles.featureIcon}
            />
            <Typography
              family="onest"
              size="xs"
              weight="500"
              color="onyx"
              style={paywallStyles.featureText}
            >
              {label}
            </Typography>
          </View>
        ))}
      </View>

      {/* Full-width UPGRADE button — DepthButton's `isFullWidth` default
          stretches to the parent's content box. No outer paddingHorizontal
          wrapper here so it matches the feature box's width edge-to-edge,
          matching Figma 3527:6487. */}
      <DepthButton
        variant="secondary"
        size="large"
        onPress={onUpgrade}
        haptic="medium"
        style={paywallStyles.cta}
      >
        <Typography family="onest" size="lg" weight="700" color="white">
          UPGRADE
        </Typography>
      </DepthButton>

      <TouchableOpacity onPress={onUpgrade} activeOpacity={0.7}>
        <Typography
          family="onest"
          size="xs"
          weight="500"
          color="onyx"
          style={paywallStyles.restore}
        >
          Already subscribed? Restore purchase
        </Typography>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function AIQuizExplanation({
  visible,
  onClose,
  questions,
  userAnswers,
  eraName,
  adventureName,
  adventureId,
  moduleId,
}: AIQuizExplanationProps) {
  const [explanations, setExplanations] = useState<ExplanationItem[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isPaywallPresentedRef = useRef(false);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(false);

  const { isSubscribed } = useRevenueCat();
  const isSubscribedRef = useRef(isSubscribed);
  isSubscribedRef.current = isSubscribed;
  const prevSubscribedRef = useRef(isSubscribed);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, []);

  // Reset fetch guard whenever the modal opens — lets the user re-open the
  // sheet and refetch (e.g. after subscribing on a different screen and
  // returning here). Closing then reopening counts as a fresh session.
  useEffect(() => {
    if (!visible) {
      hasFetchedRef.current = false;
      setLoadingAll(false);
      setTimedOut(false);
      setRetryCount(0);
    }
  }, [visible]);

  // Build the explanation skeleton from quiz data — runs whenever the
  // inputs change (new quiz, new answers).
  useEffect(() => {
    const items: ExplanationItem[] = questions.map((question, index) => {
      const userAnswerIndex = userAnswers[index];
      const correctAnswerIndex = question.answers.findIndex(
        (a) => a.is_correct,
      );
      const isCorrect = userAnswerIndex === correctAnswerIndex;
      return {
        questionNumber: index + 1,
        questionText: question.question_text,
        userAnswer: question.answers[userAnswerIndex]?.text || 'No answer',
        correctAnswer: question.answers[correctAnswerIndex]?.text || 'Unknown',
        isCorrect,
        loading: false,
      };
    });
    setExplanations(items);
  }, [questions, userAnswers]);

  // ─── Fetch logic ─────────────────────────────────────────────────────
  const handleGetExplanations = useCallback(async () => {
    if (!aiService.isAvailable()) {
      AppLogger.warn('ai', 'AI service not available');
      return;
    }
    if (questions.length === 0) return;

    const subscribed = isSubscribedRef.current;
    const fetchMode = subscribed ? 'batch' : 'single';

    setLoadingAll(true);
    setTimedOut(false);

    analyticsService.trackCustomEvent('ai_quiz_explanation_requested', {
      adventure_id: adventureId,
      module_id: moduleId,
      era_name: eraName,
      total_questions: questions.length,
      is_subscriber: subscribed,
      fetch_mode: fetchMode,
    });

    AppLogger.info('ai', 'Requesting AI quiz explanations', {
      totalQuestions: questions.length,
      fetchMode,
    });

    const startTime = Date.now();

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutIdRef.current = setTimeout(
          () => reject(new Error('TIMEOUT')),
          TIMEOUT_MS,
        );
      });

      let apiPromise: Promise<{ explanation: string }[]>;
      if (subscribed) {
        apiPromise = aiService.getBatchedExplanations(questions, userAnswers, {
          eraName,
          adventureName,
          userLevel: 'intermediate',
        });
      } else {
        const q1 = questions[0];
        const q1UserAnswerIndex = userAnswers[0];
        const q1CorrectIndex = q1.answers.findIndex((a) => a.is_correct);
        apiPromise = aiService
          .getQuizExplanation({
            questionText: q1.question_text,
            correctAnswer: q1.answers[q1CorrectIndex]?.text || 'Unknown',
            userAnswer: q1.answers[q1UserAnswerIndex]?.text || 'No answer',
            questionType: q1.question_type,
            eraName,
            adventureName,
            userLevel: 'intermediate',
            isCorrect: q1UserAnswerIndex === q1CorrectIndex,
          })
          .then((r) => [r]);
      }
      apiPromise.catch(() => {});

      const aiExplanations = await Promise.race([apiPromise, timeoutPromise]);

      if (!isMountedRef.current) return;
      const generationTimeMs = Date.now() - startTime;

      setExplanations((prev) =>
        prev.map((item, index) => ({
          ...item,
          aiExplanation: aiExplanations[index]?.explanation,
          loading: false,
        })),
      );

      analyticsService.trackCustomEvent('ai_quiz_explanation_generated', {
        adventure_id: adventureId,
        module_id: moduleId,
        era_name: eraName,
        explanations_count: aiExplanations.length,
        generation_time_ms: generationTimeMs,
        fetch_mode: fetchMode,
        is_subscriber: subscribed,
      });
      AppLogger.info('ai', 'AI explanations generated', {
        count: aiExplanations.length,
        timeMs: generationTimeMs,
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      const isTimeout = error instanceof Error && error.message === 'TIMEOUT';
      if (isTimeout) {
        AppLogger.warn('ai', 'AI explanation request timed out');
        setTimedOut(true);
      } else {
        AppLogger.error('ai', 'Failed to generate AI explanations', {}, error);
        setExplanations((prev) =>
          prev.map((item) => ({
            ...item,
            loading: false,
            error: 'Could not generate explanation. Please try again.',
          })),
        );
      }
    } finally {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (isMountedRef.current) setLoadingAll(false);
    }
  }, [adventureId, moduleId, eraName, adventureName, questions, userAnswers]);

  // Auto-fetch on first open. `hasFetchedRef` guards against React StrictMode
  // double-invocation in dev and ensures we don't re-fetch on prop changes
  // unrelated to opening (subscription mid-session is handled separately
  // below).
  useEffect(() => {
    if (!visible) return;
    if (hasFetchedRef.current) return;
    if (questions.length === 0) return;
    hasFetchedRef.current = true;
    handleGetExplanations();
  }, [visible, questions.length, handleGetExplanations]);

  // Re-fetch when user subscribes mid-session — switches from Q1-only to
  // full batch without requiring the user to close + reopen the sheet.
  useEffect(() => {
    if (
      isSubscribed &&
      !prevSubscribedRef.current &&
      visible &&
      explanations.length > 0 &&
      !loadingAll
    ) {
      AppLogger.info('ai', 'User subscribed mid-session, refetching');
      setRetryCount(0);
      handleGetExplanations();
    }
    prevSubscribedRef.current = isSubscribed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubscribed]);

  const handleRetry = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount((prev) => prev + 1);
      handleGetExplanations();
    } else {
      setExplanations((prev) =>
        prev.map((item) => ({
          ...item,
          loading: false,
          error: 'Could not generate explanation. Please try again later.',
        })),
      );
      setTimedOut(false);
    }
  }, [retryCount, handleGetExplanations]);

  // ─── Paywall ────────────────────────────────────────────────────────
  const handleShowPaywall = useCallback(async () => {
    if (isPaywallPresentedRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    analyticsService.trackSubscribeScreenViewed({
      trigger: 'ai_quiz_explanation',
    });

    try {
      isPaywallPresentedRef.current = true;
      const result = await RevenueCatUI.presentPaywall();
      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
          AppLogger.info(
            'subscription',
            'Premium purchase completed via quiz explanation',
          );
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
          analyticsService.trackSubscribePurchaseCompleted({
            trigger: 'ai_quiz_explanation',
            plan: 'yearly',
          });
          break;
        case PAYWALL_RESULT.RESTORED:
          AppLogger.info(
            'subscription',
            'Subscription restore completed via quiz explanation',
          );
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
          analyticsService.trackSubscribeRestoreSuccess({
            trigger: 'ai_quiz_explanation',
          });
          break;
        case PAYWALL_RESULT.CANCELLED:
          analyticsService.trackSubscribePurchaseCancelled({
            trigger: 'ai_quiz_explanation',
          });
          break;
        case PAYWALL_RESULT.NOT_PRESENTED:
        case PAYWALL_RESULT.ERROR:
          AppLogger.warn('subscription', 'Paywall presentation issue', {
            result,
          });
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          ).catch(() => {});
          break;
      }
    } catch (error) {
      AppLogger.error('subscription', 'Paywall exception', {}, error);
    } finally {
      isPaywallPresentedRef.current = false;
    }
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────
  const renderContent = () => {
    if (loadingAll || timedOut) {
      return (
        <View style={styles.loadingBlock}>
          {timedOut ? (
            <>
              <Ionicons
                name="time-outline"
                size={40}
                color={colors.acaiSecondary}
              />
              <Typography
                family="onest"
                size="md"
                weight="600"
                color="onyx"
                style={styles.timeoutTitle}
              >
                Taking longer than expected
              </Typography>
              <Typography
                family="onest"
                size="sm"
                weight="500"
                color="onyx"
                style={styles.timeoutSubtitle}
              >
                The AI is still working. You can try again
                {retryCount < MAX_RETRIES ? '' : ' later'}.
              </Typography>
              {retryCount < MAX_RETRIES && (
                <View style={styles.retryWrap}>
                  <DepthButton
                    variant="secondary"
                    size="medium"
                    onPress={handleRetry}
                    haptic="light"
                    isFullWidth={false}
                  >
                    <Ionicons name="refresh" size={18} color={colors.white} />
                    <Typography
                      family="onest"
                      size="md"
                      weight="700"
                      color="white"
                      style={styles.retryText}
                    >
                      Try Again
                    </Typography>
                  </DepthButton>
                </View>
              )}
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={colors.acaiSecondary} />
              <Typography
                family="onest"
                size="sm"
                weight="500"
                color="onyx"
                style={styles.loadingText}
              >
                Generating explanations...
              </Typography>
            </>
          )}
        </View>
      );
    }

    // Subscribed: scrollable list of all questions with dividers between.
    if (isSubscribed) {
      return (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {explanations.map((item, index) => (
            <ExplanationCard
              key={item.questionNumber}
              item={item}
              showDivider={index < explanations.length - 1}
            />
          ))}
        </ScrollView>
      );
    }

    // Free: Q1 only + paywall overlay. NOT scrollable — the paywall must
    // block access to Q2/Q3 entirely.
    return (
      <View style={styles.freeWrap}>
        <View style={styles.freeQ1}>
          {explanations[0] && (
            <ExplanationCard item={explanations[0]} showDivider={false} />
          )}
        </View>
        <View style={styles.paywallOverlay}>
          <PaywallCard
            questionsCount={questions.length}
            onUpgrade={handleShowPaywall}
          />
        </View>
      </View>
    );
  };

  // Custom bottom sheet — `transparent` + `slide` animation lets us own
  // the height (80% on both platforms) and the rounded top corners. Native
  // `pageSheet` would lock height to ~90% on iOS and full-screen on Android,
  // and never gives custom corner radii. The backdrop is a Pressable so a
  // tap-outside dismisses without needing a swipe gesture handler.
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.grabHandle} />
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Typography
                family="onest"
                size="md"
                weight="600"
                color="onyx"
              >
                AI Learning Assistant
              </Typography>
              <Typography
                family="onest"
                size="sm"
                weight="500"
                color="onyx"
                style={styles.headerSubtitle}
              >
                Personalized explanations to help you learn
              </Typography>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close explanations"
            >
              <Ionicons name="close" size={24} color={colors.onyx} />
            </Pressable>
          </View>
          <View style={styles.divider} />
          <View style={styles.body}>{renderContent()}</View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────

const SHEET_HEIGHT = Dimensions.get('window').height * 0.8;

const styles = StyleSheet.create({
  // Modal root — full-screen container. `flex: 1` + `justifyContent:
  // 'flex-end'` parks the sheet at the bottom of the viewport regardless
  // of phone size. The backdrop fills above the sheet.
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  // Translucent veil above the sheet — taps close the modal.
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  // The actual bottom sheet. Fixed height = 80% of window so the
  // experience is identical on iOS and Android (pageSheet would have
  // varied across platforms). Rounded corners ONLY on top so the sheet
  // looks anchored to the bottom edge.
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: colors.snow,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  // iOS-style grab handle, drawn manually because we're not using
  // `pageSheet` (which would render one for free). Centered, narrow,
  // visually telegraphs "this can be dismissed by swiping" — even though
  // dismissal here goes through onRequestClose / backdrop tap rather
  // than a real PanResponder.
  grabHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(26,26,26,0.2)',
    marginTop: 8,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerText: {
    flex: 1,
  },
  headerSubtitle: {
    marginTop: 4,
  },
  // Close button styled to match the Settings modal close (see
  // `ArchivesTheme.common.closeButton` and `app/(tabs)/profile.tsx:1159`):
  // 32×32 white circle with a subtle drop shadow + 16px radius. Shared
  // visual language across all bottom modals in the app.
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(26,26,26,0.15)',
    marginHorizontal: 24,
  },
  body: {
    flex: 1,
  },

  // Subscribed: scroll list
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },

  // Free tier
  freeWrap: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  freeQ1: {
    // Q1 visible at top — flexShrink so it doesn't push the paywall off
    // the bottom of the sheet. Effectively gets the upper portion of the
    // available height; the paywall overlay below claims the rest.
    flexShrink: 0,
  },
  paywallOverlay: {
    // The Figma overlays the paywall card on top of where Q2/Q3 would
    // sit. With Q1 above and `marginTop: auto`, the card hugs the bottom
    // of the sheet, leaving Q1 fully visible and creating a hard visual
    // gate below.
    marginTop: 'auto',
    paddingBottom: 8,
  },

  // Loading / timeout
  loadingBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
  },
  timeoutTitle: {
    marginTop: 12,
    textAlign: 'center',
  },
  timeoutSubtitle: {
    marginTop: 4,
    textAlign: 'center',
  },
  retryWrap: {
    marginTop: 16,
  },
  retryText: {
    marginLeft: 6,
  },
});

const cardStyles = StyleSheet.create({
  wrap: {
    paddingBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.snow,
    borderRadius: 12.5,
    paddingHorizontal: 11,
    paddingVertical: 4,
    marginBottom: 12,
  },
  question: {
    marginBottom: 10,
  },
  answerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  explanationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  bulbIcon: {
    marginTop: 2,
  },
  explanationText: {
    flex: 1,
    marginLeft: 12,
    lineHeight: 22,
  },
  errorText: {
    color: colors.incorrectSecondary,
  },
  loadingBlock: {
    paddingVertical: 12,
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(26,26,26,0.18)',
    marginTop: 16,
  },
});

const paywallStyles = StyleSheet.create({
  // Light-blue surface, NO border. Figma's 0.1px border is effectively
  // invisible at native render so we drop it — fewer paint ops on Android,
  // and the card reads cleaner without the dark hairline.
  card: {
    backgroundColor: colors.blueSecondary,
    borderRadius: 17,
    padding: 16,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    flex: 1,
  },
  subtitle: {
    marginBottom: 16,
    lineHeight: 20,
  },
  // Inner white card holds the feature list (Figma 3527:6477 — width 271
  // on a 313 outer card, ~21px side padding).
  featureBox: {
    backgroundColor: colors.snow,
    borderRadius: 17,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    lineHeight: 18,
  },
  // CTA hugs the feature box width edge-to-edge — no outer wrap padding.
  cta: {
    marginBottom: 12,
  },
  restore: {
    textAlign: 'center',
  },
});
