import { Question } from '@/components/shared/types';
import { aiService } from '@/gamification';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { DepthButton, Typography, colors } from '@/components/ui';
import AppLogger from '@/services/AppLogger';
import {
  ExplanationCard,
  PaywallCard,
  type ExplanationItem,
} from './explanation';

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

const MAX_RETRIES = 2;
const TIMEOUT_MS = 15_000;

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
  // Measured at runtime — drives the locked block's minHeight so the
  // absolutely-positioned paywall always fits inside the block (with a
  // small peek of Q2 left visible above it).
  const [paywallHeight, setPaywallHeight] = useState(0);
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

  useEffect(() => {
    if (!visible) return;
    if (hasFetchedRef.current) return;
    if (questions.length === 0) return;
    hasFetchedRef.current = true;
    handleGetExplanations();
  }, [visible, questions.length, handleGetExplanations]);

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

  // ─── Summary tally for subscribers ──────────────────────────────────
  const summary = useMemo(() => {
    const correct = explanations.filter((e) => e.isCorrect).length;
    const review = explanations.length - correct;
    return { correct, review };
  }, [explanations]);

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

    // Subscribed: summary tally + scrollable list of all questions.
    if (isSubscribed) {
      return (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.summaryTextRow}>
              <Typography
                family="onest"
                size="sm"
                weight="700"
                style={{ color: colors.correctSecondary }}
              >
                {summary.correct} correct
              </Typography>
              <Typography
                family="onest"
                size="sm"
                weight="600"
                color="onyx"
                style={styles.summaryDot}
              >
                {' · '}
              </Typography>
              <Typography
                family="onest"
                size="sm"
                weight="700"
                style={{ color: colors.incorrectSecondary }}
              >
                {summary.review} to review
              </Typography>
            </View>
            <View style={styles.summaryPips}>
              {explanations.map((item) => (
                <View
                  key={item.questionNumber}
                  style={[
                    styles.summaryPip,
                    {
                      backgroundColor: item.isCorrect
                        ? colors.correctSecondary
                        : colors.incorrectSecondary,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.isCorrect ? 'checkmark' : 'close'}
                    size={9}
                    color={colors.white}
                  />
                </View>
              ))}
            </View>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {explanations.map((item) => (
              <ExplanationCard key={item.questionNumber} item={item} />
            ))}
          </ScrollView>
        </>
      );
    }

    // Free tier: ONE ScrollView containing Q1 + a relative block that
    // holds Q2, Q3 and the upgrade card together.
    //
    //   ScrollView
    //     ├── Q1 (full)
    //     └── lockedBlock (position: relative)
    //          ├── Q2 (locked teaser, in flow)
    //          ├── Q3 (locked teaser, in flow)
    //          ├── gradient fade (absolute, transparent → lavender)
    //          └── PaywallCard (absolute, bottom: 0 — overlays Q2/Q3)
    //
    // The block's minHeight is set to (paywallHeight + 40) so the
    // absolute paywall always fits inside the block with ~40px of Q2
    // peeking out above it. paywallHeight is measured via onLayout so
    // the layout adapts to copy/Dynamic Type changes.
    return (
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.freeScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {explanations[0] && <ExplanationCard item={explanations[0]} />}

        {explanations.length > 1 && (
          <View
            style={[styles.lockedBlock, { minHeight: paywallHeight + 40 }]}
          >
            {explanations.slice(1).map((item) => (
              <ExplanationCard
                key={item.questionNumber}
                item={item}
                isLockedPeek
              />
            ))}

            {/* Soft fade above the paywall — Q2 (and any of Q3 that's
                visible) melts into the lavender as it approaches the
                paywall's top edge. */}
            <LinearGradient
              colors={[
                'rgba(229,212,255,0)',
                'rgba(229,212,255,0.85)',
                colors.acaiTertiary,
              ]}
              locations={[0, 0.55, 1]}
              pointerEvents="none"
              style={[styles.lockedFade, { bottom: paywallHeight - 1 }]}
            />

            <View
              style={styles.upgradeAbsolute}
              onLayout={(e) => setPaywallHeight(e.nativeEvent.layout.height)}
            >
              <PaywallCard
                questionsCount={questions.length}
                onUpgrade={handleShowPaywall}
              />
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

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
          {/* Floating circular close X — sits inside the top of the sheet
              (above the sticky header). Mirrors the mock's `.ai-close-x`
              (top:152px on a sheet starting at 140px = 12px inset). */}
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.closeFloat}
            accessibilityRole="button"
            accessibilityLabel="Close explanations"
          >
            <Ionicons name="close" size={18} color={colors.onyx} />
          </Pressable>

          {/* Sticky header — title + sub + hairline. Stays pinned at the
              top of the sheet because everything below is either the
              free-tier flex column or the subscriber ScrollView. */}
          <View style={styles.header}>
            <Typography family="onest" size="md" weight="700" color="onyx">
              AI Learning Assistant
            </Typography>
            <Typography
              family="onest"
              size="sm"
              weight="500"
              color="onyx"
              style={styles.headerSub}
            >
              Here&apos;s the &ldquo;why&rdquo; behind your answers
            </Typography>
            <View style={styles.headerHairline} />
          </View>

          <View style={styles.body}>{renderContent()}</View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────

const SHEET_HEIGHT = Dimensions.get('window').height * 0.8;

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  // Translucent veil above the sheet — taps close the modal.
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  // Lavender bottom-sheet — was snow before. Matches the mock's
  // --acai-tertiary (#E5D4FF) so cards read as floating tiles on it.
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: colors.acaiTertiary,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  // Floating close-X — child of the sheet, positioned absolutely so it
  // floats above the sticky header while staying pinned to the sheet's
  // top-right corner. Inset 12px from the top so it doesn't get clipped
  // by the sheet's rounded corners (`overflow: hidden`).
  closeFloat: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: colors.acaiTertiary,
  },
  headerSub: {
    opacity: 0.75,
    marginTop: 2,
    letterSpacing: -0.13,
  },
  headerHairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(26,26,26,0.14)',
    marginTop: 12,
  },
  body: {
    flex: 1,
  },

  // Subscribed: summary strip + scroll list
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  summaryTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summaryDot: {
    opacity: 0.45,
    marginHorizontal: 2,
  },
  summaryPips: {
    flexDirection: 'row',
    gap: 5,
  },
  summaryPip: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },

  // Free tier — single ScrollView. Q1 + lockedBlock both live in this
  // padding box; nothing is fixed to the sheet bottom anymore.
  freeScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  // The Q2 + Q3 + Paywall block. position:relative so the paywall (an
  // absolute child below) anchors against this block's edges instead of
  // the screen. minHeight is patched at runtime to (paywallHeight + 40)
  // so the paywall fits with ~40px of Q2 peek visible above it.
  lockedBlock: {
    position: 'relative',
    marginTop: 8,
  },
  // Lavender fade covers the area just above the paywall — softens the
  // visual seam between the locked Q2/Q3 (visible at top) and the
  // paywall card edge.
  lockedFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 60,
    zIndex: 1,
  },
  // Paywall pinned to the bottom of the lockedBlock. zIndex above the
  // gradient so the card edges stay crisp.
  upgradeAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
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
