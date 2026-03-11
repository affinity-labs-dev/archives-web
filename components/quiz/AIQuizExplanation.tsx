// AIQuizExplanation.tsx - AI-powered quiz explanation component
// Premium users: batch-fetches all explanations in a single API call
// Free users: fetches Q1 only, shows faded preview + paywall overlay for Q2-Q5
// Includes 15s timeout with retry CTA (max 2 retries)

import { Question } from '@/components/shared/types';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { aiService } from '@/gamification';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import AppLogger from '@/services/AppLogger';

interface AIQuizExplanationProps {
  questions: Question[];
  userAnswers: number[]; // Array of user's answer indices
  eraName: string;
  adventureName?: string;
  adventureId: string;
  moduleId: string;
  onClose?: () => void;
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

// ─── Small reusable card ────────────────────────────────────────────────────

function ExplanationCard({ item }: { item: ExplanationItem }) {
  return (
    <View style={styles.explanationCard}>
      <View style={styles.questionBadge}>
        <Text style={styles.questionBadgeText}>Q{item.questionNumber}</Text>
      </View>

      <Text style={styles.questionText}>{item.questionText}</Text>

      <View style={styles.answersContainer}>
        <View style={styles.answerRow}>
          <Ionicons
            name={item.isCorrect ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={item.isCorrect ? '#27AE60' : '#E74C3C'}
          />
          <Text style={styles.answerLabel}>Your answer:</Text>
          <Text style={[styles.userAnswerText, item.isCorrect && styles.correctAnswerText]}>
            {item.userAnswer}
          </Text>
        </View>
        {!item.isCorrect && (
          <View style={styles.answerRow}>
            <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
            <Text style={styles.answerLabel}>Correct:</Text>
            <Text style={styles.correctAnswerText}>{item.correctAnswer}</Text>
          </View>
        )}
      </View>

      {item.loading ? (
        <View style={styles.explanationLoading}>
          <ActivityIndicator size="small" color={ArchivesTheme.colors.persianOrange} />
        </View>
      ) : item.error ? (
        <Text style={styles.errorText}>{item.error}</Text>
      ) : item.aiExplanation ? (
        <View style={styles.aiExplanationContainer}>
          <Ionicons name="bulb-outline" size={16} color={ArchivesTheme.colors.persianOrange} />
          <Text style={styles.aiExplanationText}>
            {item.aiExplanation}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const MAX_RETRIES = 2;
const TIMEOUT_MS = 15_000;

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AIQuizExplanation({
  questions,
  userAnswers,
  eraName,
  adventureName,
  adventureId,
  moduleId,
  onClose,
}: AIQuizExplanationProps) {
  const [explanations, setExplanations] = useState<ExplanationItem[]>([]);
  const [showExplanations, setShowExplanations] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const paywallAnim = useRef(new Animated.Value(0)).current;
  const isPaywallPresentedRef = useRef(false);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isMountedRef = useRef(true);

  // Subscription check for paywall
  const { isSubscribed } = useRevenueCat();
  const isSubscribedRef = useRef(isSubscribed);
  isSubscribedRef.current = isSubscribed;
  const prevSubscribedRef = useRef(isSubscribed);

  // Cleanup: Dismiss paywall on unmount, clear pending timeout
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (isPaywallPresentedRef.current) {
        AppLogger.info('ai', 'AIQuizExplanation unmounting');
        try {
          // Note: RevenueCat doesn't have a direct dismiss method for imperative API
          // The paywall auto-dismisses when user taps X or completes purchase
          // This ref just tracks state for debugging
          isPaywallPresentedRef.current = false;
        } catch (error) {
          AppLogger.error('ai', 'AIQuizExplanation cleanup error', {}, error);
        }
      }
    };
  }, []);

  // Prepare explanation items on mount
  useEffect(() => {
    const items: ExplanationItem[] = questions.map((question, index) => {
      const userAnswerIndex = userAnswers[index];
      const correctAnswerIndex = question.answers.findIndex((a) => a.is_correct);
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

  // Re-fetch all explanations when user subscribes mid-session
  useEffect(() => {
    if (isSubscribed && !prevSubscribedRef.current && showExplanations && explanations.length > 0 && !loadingAll) {
      AppLogger.info('ai', 'User subscribed mid-session, fetching all explanations');
      setRetryCount(0);
      handleGetExplanations();
    }
    prevSubscribedRef.current = isSubscribed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubscribed]);

  // Present paywall using imperative API (Android-safe)
  const handleShowPaywall = async () => {
    // Prevent multiple simultaneous presentations
    if (isPaywallPresentedRef.current) {
      if (__DEV__) console.log('⚠️ [AIQuizExplanation] Paywall already presented, skipping');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Track paywall view with standardized event
    analyticsService.trackSubscribeScreenViewed({
      trigger: 'ai_quiz_explanation',
    });

    try {
      isPaywallPresentedRef.current = true;
      const result = await RevenueCatUI.presentPaywall();

      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
          AppLogger.info('subscription', 'Premium purchase completed via quiz explanation');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          analyticsService.trackSubscribePurchaseCompleted({
            trigger: 'ai_quiz_explanation',
            plan: 'yearly',
          });
          break;

        case PAYWALL_RESULT.RESTORED:
          AppLogger.info('subscription', 'Subscription restore completed via quiz explanation');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          analyticsService.trackSubscribeRestoreSuccess({
            trigger: 'ai_quiz_explanation',
          });
          break;

        case PAYWALL_RESULT.CANCELLED:
          if (__DEV__) console.log('🚫 [AIQuizExplanation] Paywall cancelled');
          analyticsService.trackSubscribePurchaseCancelled({
            trigger: 'ai_quiz_explanation',
          });
          break;

        case PAYWALL_RESULT.NOT_PRESENTED:
        case PAYWALL_RESULT.ERROR:
          AppLogger.warn('subscription', 'Paywall presentation issue', { result });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          analyticsService.trackSubscribePurchaseFailed({
            trigger: 'ai_quiz_explanation',
            error_code: result,
          });
          break;
      }
    } catch (error) {
      AppLogger.error('subscription', 'Error presenting paywall', {}, error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      analyticsService.trackSubscribePurchaseFailed({
        trigger: 'ai_quiz_explanation',
        error_code: error instanceof Error ? error.message : 'unknown',
      });
    } finally {
      isPaywallPresentedRef.current = false;
    }
  };

  // Generate AI explanations (subscription-aware + timeout)
  // Reads isSubscribedRef.current to avoid stale closure issues
  const handleGetExplanations = async () => {
    if (!aiService.isAvailable()) {
      alert('AI explanations are not available. Please contact support.');
      return;
    }

    const subscribed = isSubscribedRef.current;
    const fetchMode = subscribed ? 'batch' : 'single';

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowExplanations(true);
    setLoadingAll(true);
    setTimedOut(false);

    // Track AI explanation request
    analyticsService.trackCustomEvent('ai_quiz_explanation_requested', {
      adventure_id: adventureId,
      module_id: moduleId,
      era_name: eraName,
      total_questions: questions.length,
      correct_questions: explanations.filter((e) => e.isCorrect).length,
      incorrect_questions: explanations.filter((e) => !e.isCorrect).length,
      is_subscriber: subscribed,
      fetch_mode: fetchMode,
    });

    AppLogger.info('ai', 'Requesting AI quiz explanations', {
      totalQuestions: questions.length,
      fetchMode,
    });

    // Animate in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Animate paywall in slightly after content fades in (free users only)
    if (!subscribed) {
      setTimeout(() => {
        Animated.spring(paywallAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 9,
        }).start();
      }, 400);
    }

    const startTime = Date.now();

    try {
      // Wrap API call with 15s timeout.
      // Note: getBatchedExplanations() may internally fall back to sequential
      // calls if batch parsing fails, which could take 4-5s. The 15s timeout covers both paths.
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutIdRef.current = setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS);
      });

      let apiPromise: Promise<{ explanation: string }[]>;

      if (subscribed) {
        // Premium: batch all questions in one call
        apiPromise = aiService.getBatchedExplanations(questions, userAnswers, {
          eraName,
          adventureName,
          userLevel: 'intermediate',
        });
      } else {
        // Free: only fetch Q1 (Q2-Q5 are behind the paywall, no need to call the API for them)
        const q1 = questions[0];
        const q1UserAnswerIndex = userAnswers[0];
        const q1CorrectIndex = q1.answers.findIndex((a) => a.is_correct);
        apiPromise = aiService.getQuizExplanation({
          questionText: q1.question_text,
          correctAnswer: q1.answers[q1CorrectIndex]?.text || 'Unknown',
          userAnswer: q1.answers[q1UserAnswerIndex]?.text || 'No answer',
          questionType: q1.question_type,
          eraName,
          adventureName,
          userLevel: 'intermediate',
          isCorrect: q1UserAnswerIndex === q1CorrectIndex,
        }).then((r) => [r]);
      }

      // Prevent unhandled rejection if the losing promise rejects after timeout wins
      apiPromise.catch(() => {});

      const aiExplanations = await Promise.race([apiPromise, timeoutPromise]);

      if (!isMountedRef.current) return;

      const generationTimeMs = Date.now() - startTime;

      // Update explanations with AI responses
      setExplanations((prev) =>
        prev.map((item, index) => ({
          ...item,
          aiExplanation: aiExplanations[index]?.explanation,
          loading: false,
        }))
      );

      // Track successful generation with timing
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
        fetchMode,
      });
    } catch (error) {
      if (!isMountedRef.current) return;

      const isTimeout = error instanceof Error && error.message === 'TIMEOUT';

      if (isTimeout) {
        AppLogger.warn('ai', 'AI explanation request timed out', { retryCount });
        setTimedOut(true);

        analyticsService.trackCustomEvent('ai_quiz_explanation_error', {
          adventure_id: adventureId,
          module_id: moduleId,
          era_name: eraName,
          error: 'timeout',
          retry_count: retryCount,
        });
      } else {
        AppLogger.error('ai', 'Failed to generate AI explanations', {}, error);

        analyticsService.trackCustomEvent('ai_quiz_explanation_error', {
          adventure_id: adventureId,
          module_id: moduleId,
          era_name: eraName,
          error: String(error),
        });

        setExplanations((prev) =>
          prev.map((item) => ({
            ...item,
            loading: false,
            error: 'Could not generate explanation. Please try again.',
          }))
        );
      }
    } finally {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (isMountedRef.current) setLoadingAll(false);
    }
  };

  // Retry handler for timeout
  const handleRetryExplanations = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount((prev) => prev + 1);
      handleGetExplanations();
    } else {
      // Max retries reached — show fallback
      setExplanations((prev) =>
        prev.map((item) => ({
          ...item,
          loading: false,
          error: 'Could not generate explanation. Please try again later.',
        }))
      );
      setTimedOut(false);
    }
  };

  return (
    <View style={styles.container}>
      {!showExplanations ? (
        // Initial prompt button
        <TouchableOpacity
          style={styles.promptCard}
          onPress={handleGetExplanations}
          activeOpacity={0.8}
        >
          <View style={styles.promptContent}>
            <View style={styles.aiIconContainer}>
              <Ionicons name="bulb" size={28} color={ArchivesTheme.colors.persianOrange} />
            </View>
            <View style={styles.promptTextContainer}>
              <Text style={styles.promptTitle}>Get AI-powered explanations</Text>
              <Text style={styles.promptSubtitle}>
                Understand all {questions.length} questions with personalized insights
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={ArchivesTheme.colors.shoeBrown} />
          </View>
        </TouchableOpacity>
      ) : (
        // Explanations list
        <Animated.View style={[styles.explanationsContainer, { opacity: fadeAnim }]}>
          <View style={styles.explanationsHeader}>
            <Text style={styles.explanationsTitle}>AI Learning Assistant</Text>
            <Text style={styles.explanationsSubtitle}>
              Personalized explanations to help you learn
            </Text>
          </View>

          {loadingAll || timedOut ? (
            <View style={styles.loadingContainer}>
              {timedOut ? (
                <>
                  <Ionicons name="time-outline" size={40} color={ArchivesTheme.colors.shoeBrown} />
                  <Text style={styles.timeoutTitle}>Taking longer than expected</Text>
                  <Text style={styles.timeoutSubtitle}>
                    The AI is still working. You can try again{retryCount < MAX_RETRIES ? '' : ' later'}.
                  </Text>
                  {retryCount < MAX_RETRIES && (
                    <TouchableOpacity style={styles.retryButton} onPress={handleRetryExplanations}>
                      <Ionicons name="refresh" size={18} color="white" />
                      <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
                  <Text style={styles.loadingText}>Generating explanations...</Text>
                </>
              )}
            </View>
          ) : isSubscribed ? (
            // ── 🔓 PREMIUM: show all explanations normally ────────────────
            <ScrollView style={styles.explanationsList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {explanations.map((item) => (
                <ExplanationCard key={item.questionNumber} item={item} />
              ))}
            </ScrollView>
          ) : (
            // ── 🔒 FREE: show Q1 partially faded + paywall ───────────────
            <View style={styles.paywallWrapper}>

              {/* Q1 card — clipped to ~3 lines height */}
              <View style={styles.previewClip} pointerEvents="none">
                {explanations[0] && <ExplanationCard item={explanations[0]} />}
              </View>

              {/* Fade gradient over the preview */}
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.92)', '#ffffff']}
                style={styles.previewFade}
                pointerEvents="none"
              />

              {/* Paywall card */}
              <Animated.View
                style={[
                  styles.paywallCard,
                  {
                    opacity: paywallAnim,
                    transform: [
                      {
                        translateY: paywallAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Lock badge */}
                <View style={styles.lockBadge}>
                  <MaterialIcons name="lock" size={24} color={ArchivesTheme.colors.persianOrange} />
                </View>

                <Text style={styles.paywallTitle}>Unlock All Explanations</Text>
                <Text style={styles.paywallSubtitle}>
                  You are seeing a preview of Q1. Upgrade to get personalized insights for all {questions.length} questions.
                </Text>

                {/* Feature rows */}
                <View style={styles.featureBox}>
                  {[
                    '✦  AI explanations for every question',
                    '✦  Understand your mistakes deeply',
                    '✦  Personalized study tips',
                    '✦  Unlimited quiz attempts',
                  ].map((f) => (
                    <Text key={f} style={styles.featureRow}>{f}</Text>
                  ))}
                </View>

                {/* CTA */}
                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={handleShowPaywall}
                  activeOpacity={0.85}
                >
                  <View style={styles.ctaContent}>
                    <Text style={styles.ctaText}>Upgrade to Premium</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleShowPaywall}
                  activeOpacity={0.7}
                >
                  <Text style={styles.restoreText}>Already subscribed? Restore purchase</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },

  // Prompt Card
  promptCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.persianOrange,
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  promptContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(201, 145, 81, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  promptTextContainer: {
    flex: 1,
  },
  promptTitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 4,
  },
  promptSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
  },

  // Explanations Wrapper
  explanationsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  explanationsHeader: {
    marginBottom: 16,
  },
  explanationsTitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 4,
  },
  explanationsSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
  },

  // Loading
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
    marginTop: 12,
  },

  // Premium: full list
  explanationsList: {
    maxHeight: 400,
  },

  // ── Paywall layout ──────────────────────────────────────────────────────

  paywallWrapper: {
    position: 'relative',
  },

  // Clips the preview content to ~3 lines of Q1
  previewClip: {
    maxHeight: 220,   // ← tweak this to show more/less of Q1
    overflow: 'hidden',
  },

  // Ghost card (Q2) shown dimly so user knows there's more
  ghostCard: {
    opacity: 0.25,
    marginTop: 4,
  },

  // Gradient fade over the preview
  previewFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },

  // Paywall card sits below the fade
  paywallCard: {
    backgroundColor: ArchivesTheme.colors.creamWhite ?? '#FDFCF9',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201,145,81,0.2)',
    shadowColor: 'black',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  lockBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(201,145,81,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  paywallTitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '700',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginBottom: 8,
  },
  paywallSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  featureBox: {
    alignSelf: 'stretch',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
    gap: 6,
  },
  featureRow: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy,
    lineHeight: 20,
  },
  ctaButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  ctaContent: {
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: ArchivesTheme.colors.persianOrange,
  },
  ctaText: {
    fontFamily: 'DM Sans',
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  restoreText: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: ArchivesTheme.colors.shoeBrown,
  },

  // Explanation Card (shared between premium + preview)
  explanationCard: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  questionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  questionBadgeText: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  questionText: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 12,
  },
  answersContainer: {
    marginBottom: 12,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  answerLabel: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: ArchivesTheme.colors.shoeBrown,
    marginLeft: 6,
    marginRight: 4,
  },
  userAnswerText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: '#E74C3C',
    flex: 1,
  },
  correctAnswerText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: '#27AE60',
    flex: 1,
    fontWeight: '500',
  },
  aiExplanationContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  aiExplanationText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.mutedNavy,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  explanationLoading: {
    padding: 12,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: '#E74C3C',
    textAlign: 'center',
  },
  // Timeout state
  timeoutTitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginTop: 12,
    textAlign: 'center',
  },
  timeoutSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    gap: 6,
  },
  retryButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});
