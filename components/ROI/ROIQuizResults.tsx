// ROIQuizResults.tsx - Percentage-based quiz results screen for Rise of Islam
// Shows 3 different screens based on score percentage: <30%, 30-70%, >=70%

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
import { VideoView, useVideoPlayer } from 'expo-video';
import ArchivesTheme from '@/constants/ArchivesTheme';

const { width } = Dimensions.get('window');

interface ROIQuizResultsProps {
  correctAnswers: number;
  totalQuestions: number;
  totalPoints: number;
  onRetake: () => void;
  onContinue: () => void;
  onBack?: () => void;
}

// Video Reward Player - Score-based celebration videos (matching Umayyad Dynasty threshold)
function getRewardVideo(percentage: number) {
  // 70% or above = quiz-reward3
  if (percentage >= 70) {
    return require('@/assets/videos/quiz_reward/quiz-reward3.mp4');
  }
  // Below 70% = quiz-reward1
  return require('@/assets/videos/quiz_reward/quiz-reward1.mp4');
}

interface VideoRewardPlayerProps {
  percentage: number;
}

function VideoRewardPlayer({ percentage }: VideoRewardPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const videoSource = getRewardVideo(percentage);

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    player.muted = false;
    player.play();
  });

  // Track when video is ready
  useEffect(() => {
    if (player.status === 'readyToPlay' || player.status === 'idle') {
      setIsLoaded(true);
    }
  }, [player.status]);

  // Debug logging
  useEffect(() => {
    console.log('🎬 Quiz reward video status:', player.status);
  }, [player.status]);

  return (
    <View style={styles.videoRewardContainer}>
      <VideoView
        player={player}
        style={styles.videoRewardPlayer}
        nativeControls={false}
        contentFit="contain"
        allowsFullscreen={false}
        allowsPictureInPicture={false}
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

export default function ROIQuizResults({
  correctAnswers,
  totalQuestions,
  totalPoints,
  onRetake,
  onContinue,
  onBack,
}: ROIQuizResultsProps) {
  // Calculate percentage
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const messages = getResultMessages(percentage);

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRetake();
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onContinue();
  };

  return (
    <>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}
      <View style={styles.container}>
        {/* Back button for results */}
        {onBack && (
          <SafeAreaView style={styles.backButtonContainer}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Ionicons name="chevron-back" size={24} color={ArchivesTheme.colors.shoeBrown} />
            </TouchableOpacity>
          </SafeAreaView>
        )}

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Video Reward Player */}
            <VideoRewardPlayer percentage={percentage} />

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
                  <View style={styles.xpRow}>
                    <Ionicons name="star" size={18} color={ArchivesTheme.colors.shoeBrown} />
                    <Text style={styles.xpText}>{totalPoints} XP</Text>
                  </View>
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

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              {/* Retake Quiz button */}
              <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                <View style={styles.retakeButtonContent}>
                  <Ionicons name="refresh-circle" size={24} color={ArchivesTheme.colors.mossGreen} />
                  <Text style={styles.retakeButtonText}>Retake Quiz</Text>
                </View>
              </TouchableOpacity>

              {/* Continue button */}
              <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                <View style={styles.continueButtonContent}>
                  <Text style={styles.continueButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
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
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  // Back button
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 20,
    paddingTop: 8,
    paddingLeft: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139,96,64,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Video Reward Player
  videoRewardContainer: {
    alignSelf: 'center',
    width: width * 0.9,
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
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
    padding: 24,
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
    marginBottom: 20,
  },
  statsLeft: {
    alignItems: 'center',
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
    marginBottom: 16,
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
