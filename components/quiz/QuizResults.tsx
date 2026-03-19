// QuizResults.tsx - Percentage-based quiz results screen for all eras
// Shows 3 different screens based on score percentage: <34%, 34-70%, >=70%

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { VideoView } from 'expo-video';
import { useCelebrationVideoPlayer } from '@/hooks/useCelebrationVideoPlayer';
import { analyticsService } from '@/services/AnalyticsService';
import { useGamifiedProgress, useAI } from '@/gamification';
import ArchivesTheme from '@/constants/ArchivesTheme';
import AppLogger from '@/services/AppLogger';
import AIQuizExplanation from './AIQuizExplanation';
import type { Question } from '@/components/shared/types';

const { width } = Dimensions.get('window');

// Handles results for era quizzes and Today screen (isToday=true hides XP display)
interface QuizResultsProps {
  correctAnswers: number;
  totalQuestions: number;
  totalPoints: number;
  onContinue: () => void;
  onBack?: () => void;
  // Context for analytics
  adventureId: string;
  moduleId: string;
  eraId: string;
  eraName: string;
  adventureNumber: number;
  moduleNumber: number;
  // AI Explanation data
  questions?: Question[];
  userAnswers?: number[];
  // Today mode - hide XP display
  isToday?: boolean;  // true when called from Today screen
  // Module title for Chat to Learn
  moduleTitle?: string;
}

// Video Reward Player - Score-based celebration videos (3-tier system)
function getRewardVideo(percentage: number) {
  // 70% or above = quiz-reward3
  if (percentage >= 70) {
    return require('@/assets/videos/quiz_reward/quiz-reward3.mp4');
  }
  // 34-69% = quiz-reward2
  if (percentage >= 34) {
    return require('@/assets/videos/quiz_reward/quiz-reward2.mp4');
  }
  // Below 34% = quiz-reward1
  return require('@/assets/videos/quiz_reward/quiz-reward1.mp4');
}

interface VideoRewardPlayerProps {
  percentage: number;
}

function VideoRewardPlayer({ percentage }: VideoRewardPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const videoSource = getRewardVideo(percentage);

  const player = useCelebrationVideoPlayer(videoSource, (player) => {
    player.loop = false;
  });

  // Track when video is ready
  useEffect(() => {
    if (player.status === 'readyToPlay' || player.status === 'idle') {
      setIsLoaded(true);
    }
  }, [player.status]);

  // Debug logging
  useEffect(() => {
    if (__DEV__) console.log('🎬 Quiz reward video status:', player.status);
  }, [player.status]);

  return (
    <View style={styles.videoRewardContainer}>
      <VideoView
        player={player}
        style={styles.videoRewardPlayer}
        nativeControls={false}
        contentFit="contain"
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
        surfaceType="textureView"
      />
    </View>
  );
}

// Get dynamic messages based on percentage (matching Umayyad Dynasty)
function getResultMessages(percentage: number): {
  title: string;
  subtitle: string;
  themeColor: string;
} {
  // Above 70% = Brilliant Effort!
  if (percentage >= 70) {
    return {
      title: 'Brilliant Effort!',
      subtitle: "You're getting better every time",
      themeColor: ArchivesTheme.colors.mutedNavy,
    };
  }
  // Below 70% = You've Got This!
  return {
    title: "You've Got This!",
    subtitle: 'Revisit the lessons & try again',
    themeColor: ArchivesTheme.colors.mutedNavy,
  };
}

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
  // Calculate percentage
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const messages = getResultMessages(percentage);

  // Access progress context for XP calculations
  const { calculateTotalXP, moduleProgress } = useGamifiedProgress();
  const { openChatToLearn } = useAI();
  const [newUserProgress, setNewUserProgress] = useState<any[]>([]);

  // Load new user progress data for XP calculations
  useEffect(() => {
    const loadNewProgress = async () => {
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const data = await AsyncStorage.getItem('new_user_progress');
        if (data) {
          setNewUserProgress(JSON.parse(data));
        }
      } catch (error) {
        AppLogger.error('quiz', 'Failed to load new user progress', {}, error);
      }
    };
    loadNewProgress();
  }, []);

  // Calculate total XP after quiz - hook function uses internal state
  const totalXP = calculateTotalXP();

  // Determine performance tier based on percentage
  const getPerformanceTier = (pct: number): 'high' | 'medium' | 'low' => {
    if (pct >= 70) return 'high';
    if (pct >= 34) return 'medium';
    return 'low';
  };

  // Track quiz results viewed when component mounts
  React.useEffect(() => {
    // Only track once totalXP is calculated
    if (totalXP > 0 || newUserProgress.length > 0 || moduleProgress.length > 0) {
      analyticsService.trackQuizResultsViewed({
        adventure_id: adventureId,
        module_id: moduleId,
        quiz_id: moduleId, // Using moduleId as quiz_id since they're the same in ROI
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        percentage,
        total_points: totalPoints,
        performance_tier: getPerformanceTier(percentage),
        era_id: eraId,
        era_name: eraName,
        adventure_number: adventureNumber,
        module_number: moduleNumber,
      });
      AppLogger.info('quiz', 'Quiz results viewed', { percentage });
    }
  }, [totalXP, newUserProgress, moduleProgress]);

  const handleChatToLearn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Build hidden message with quiz context for AI
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
    const hiddenMessage = incorrectList
      ? `I just finished the quiz on "${title}" in ${eraName}. I got ${correctAnswers}/${totalQuestions} correct (${percentage}%). Here are the questions I got wrong:\n${incorrectList}\n\nHelp me understand these topics better with real historical context.`
      : `I just finished the quiz on "${title}" in ${eraName} and got all ${totalQuestions} questions correct (${percentage}%)! Can you share some deeper historical details about this topic that I might not have learned in the lessons?`;

    // Track chat to learn click
    analyticsService.trackCustomEvent('quiz_results_chat_to_learn_clicked', {
      adventure_id: adventureId,
      module_id: moduleId,
      era_id: eraId,
      era_name: eraName,
      percentage,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
    });
    AppLogger.info('quiz', 'Chat to Learn clicked');

    // Open existing AI chat with hidden context message
    openChatToLearn(hiddenMessage);
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Track continue button click with full context
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
      total_xp_after: totalXP,
    });
    AppLogger.info('quiz', 'Quiz results continue clicked');

    onContinue();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Video Reward Player with overlaid back button */}
            <View style={styles.videoWrapper}>
              <VideoRewardPlayer percentage={percentage} />

              {/* Back button overlaid on video */}
              {onBack && (
                <TouchableOpacity style={styles.backButtonOverlay} onPress={onBack}>
                  <Ionicons name="chevron-back" size={24} color={ArchivesTheme.colors.shoeBrown} />
                </TouchableOpacity>
              )}
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: messages.themeColor }]}>
              {messages.title}
            </Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              {messages.subtitle}
            </Text>

            {/* Statistics card */}
            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statsLeft}>
                  <Text style={[
                    styles.percentageText,
                    { color: messages.themeColor }
                  ]}>
                    {percentage}%
                  </Text>
                  <Text style={styles.finalScoreText}>Final Score</Text>
                </View>

                <View style={styles.statsRight}>
                  {!isToday && (
                    <View style={styles.xpRow}>
                      <Ionicons name="star" size={18} color={ArchivesTheme.colors.shoeBrown} />
                      <Text style={styles.xpText}>{totalPoints} XP</Text>
                    </View>
                  )}
                  <Text style={styles.correctText}>Correct: {correctAnswers}/{totalQuestions}</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground} />
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${percentage}%`,
                      backgroundColor: messages.themeColor
                    }
                  ]}
                />
              </View>
            </View>

            {/* AI Quiz Explanation (only if questions data available) */}
            {questions.length > 0 && userAnswers.length > 0 && (
              <AIQuizExplanation
                questions={questions}
                userAnswers={userAnswers}
                eraName={eraName}
                adventureName={`Adventure ${adventureNumber}`}
                adventureId={adventureId}
                moduleId={moduleId}
              />
            )}

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              {/* Continue button */}
              <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                <View style={styles.continueButtonContent}>
                  <Text style={styles.continueButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </View>
              </TouchableOpacity>

              {/* Chat to Learn button */}
              <TouchableOpacity style={styles.retakeButton} onPress={handleChatToLearn}>
                <View style={styles.retakeButtonContent}>
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={24}
                    color={ArchivesTheme.colors.mossGreen}
                  />
                  <Text style={styles.retakeButtonText}>Chat to Learn</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 10,
    paddingHorizontal: 20,
  },

  // Video wrapper with overlaid back button
  videoWrapper: {
    position: 'relative',
    marginBottom: 32,
  },
  backButtonOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  // Video Reward Player
  videoRewardContainer: {
    alignSelf: 'center',
    width: width * 0.9,
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  videoRewardPlayer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },

  // Title and Subtitle
  title: {
    fontFamily: 'DM Sans',
    fontSize: 28,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 32,
  },

  // Statistics Card
  statsCard: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 30,
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsLeft: {
    alignItems: 'flex-start',
    marginLeft: 4,
    marginRight: 40,
  },
  percentageText: {
    fontFamily: 'DM Sans',
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  finalScoreText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
  },
  statsRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  xpText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
    marginLeft: 8,
  },
  correctText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
  },

  // Progress Bar
  progressBarContainer: {
    height: 16,
    position: 'relative',
  },
  progressBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
  },
  progressBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 16,
    borderRadius: 8,
  },

  // Action Buttons
  actionButtons: {
    marginBottom: 30,
  },
  retakeButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.mossGreen,
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  retakeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retakeButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '600',
    color: ArchivesTheme.colors.mossGreen,
    marginLeft: 12,
    flex: 1,
  },

  continueButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: ArchivesTheme.colors.persianOrange,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: 'black',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  continueButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 12,
    flex: 1,
  },
});
