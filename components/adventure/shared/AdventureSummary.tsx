// AdventureSummary.tsx - Adventure completion modal for all eras
// Shows when user completes all modules in an adventure OR reaches 50 XP milestone

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { analyticsService } from '@/services/AnalyticsService';
import ArchivesTheme from '@/constants/ArchivesTheme';
import type { Adventure } from '@/components/shared/types';

const { width } = Dimensions.get('window');

// Enum for summary mode
export enum SummaryMode {
  ADVENTURE_COMPLETE = 'adventure_complete',
  STREAK_MILESTONE = 'streak_milestone',
}

// Video Reward Player - Score-based celebration videos
// Based on working auth screen implementation with proper error handling
function getRewardVideo(totalStars: number) {
  // Assuming max 3 stars per module, adjust thresholds based on adventure
  // High: 80%+ stars, Medium: 50-79% stars, Low: <50% stars
  const maxPossibleStars = 15; // 5 modules × 3 stars each
  const percentage = (totalStars / maxPossibleStars) * 100;

  if (percentage >= 80) {
    return require('@/assets/videos/quiz_reward/quiz-reward3.mp4');
  } else if (percentage >= 50) {
    return require('@/assets/videos/quiz_reward/quiz-reward2.mp4');
  } else {
    return require('@/assets/videos/quiz_reward/quiz-reward1.mp4');
  }
}

interface VideoRewardPlayerProps {
  totalStars: number;
}

function VideoRewardPlayer({ totalStars }: VideoRewardPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const videoSource = getRewardVideo(totalStars);

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
    console.log('🎬 Adventure reward video status:', player.status);
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
      />
    </View>
  );
}

interface AdventureSummaryProps {
  isVisible: boolean;
  mode: SummaryMode;
  // Adventure completion mode props
  adventure?: Adventure | null;
  totalModules?: number;
  totalStars?: number;
  // Streak milestone mode props
  milestoneXP?: number; // 50, 100, 150, etc.
  // Shared props
  totalXP: number;
  onContinue: () => void;
}

export default function AdventureSummary({
  isVisible,
  mode,
  adventure,
  totalModules,
  totalXP,
  totalStars,
  milestoneXP,
  onContinue,
}: AdventureSummaryProps) {
  const [hasTrackedView, setHasTrackedView] = useState(false);

  // Track modal view when it becomes visible
  useEffect(() => {
    if (isVisible && !hasTrackedView) {
      if (mode === SummaryMode.ADVENTURE_COMPLETE) {
        analyticsService.trackCustomEvent('adventure_summary_viewed', {
          adventure_id: adventure?.readable_id,
          adventure_title: adventure?.adventure_title,
          total_xp: totalXP,
          total_modules: totalModules,
          total_stars: totalStars,
        });
        console.log(`📊 [Analytics] Adventure Summary Viewed: ${adventure?.readable_id}`);
      } else {
        analyticsService.trackCustomEvent('streak_milestone_viewed', {
          milestone_xp: milestoneXP,
          total_xp: totalXP,
        });
        console.log(`📊 [Analytics] Streak Milestone Viewed: ${milestoneXP} XP`);
      }
      setHasTrackedView(true);
    }

    // Reset tracking flag when modal closes
    if (!isVisible) {
      setHasTrackedView(false);
    }
  }, [isVisible, mode, adventure, totalXP, totalModules, totalStars, milestoneXP, hasTrackedView]);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Track modal dismiss
    if (mode === SummaryMode.ADVENTURE_COMPLETE) {
      analyticsService.trackCustomEvent('adventure_summary_dismissed', {
        adventure_id: adventure?.readable_id,
        adventure_title: adventure?.adventure_title,
      });
      console.log(`📊 [Analytics] Adventure Summary Dismissed: ${adventure?.readable_id}`);
    } else {
      analyticsService.trackCustomEvent('streak_milestone_dismissed', {
        milestone_xp: milestoneXP,
      });
      console.log(`📊 [Analytics] Streak Milestone Dismissed: ${milestoneXP} XP`);
    }

    onContinue();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleContinue}
    >
      <SafeAreaView style={styles.container}>
        {/* Background gradient */}
        <LinearGradient
          colors={['#F4EBDB', '#E6D5B7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        />

        {mode === SummaryMode.ADVENTURE_COMPLETE ? (
          <AdventureCompleteView
            adventure={adventure!}
            totalModules={totalModules!}
            totalXP={totalXP}
            totalStars={totalStars!}
            onContinue={handleContinue}
          />
        ) : (
          <StreakMilestoneView
            milestoneXP={milestoneXP!}
            totalXP={totalXP}
            onContinue={handleContinue}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// Adventure Complete View - Original UI
function AdventureCompleteView({
  adventure,
  totalModules,
  totalXP,
  totalStars,
  onContinue,
}: {
  adventure: Adventure;
  totalModules: number;
  totalXP: number;
  totalStars: number;
  onContinue: () => void;
}) {
  return (
    <View style={styles.content}>
      {/* Video Reward Player */}
      <VideoRewardPlayer totalStars={totalStars} />

      {/* Title */}
      <Text style={styles.title}>Adventure Complete!</Text>

      {/* Adventure Name */}
      <Text style={styles.adventureName}>{adventure.adventure_title}</Text>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {/* Modules Completed */}
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Image
              source={require('@/assets/images/icons/modules-icon.png')}
              style={styles.moduleIcon}
            />
          </View>
          <Text style={styles.statValue}>{totalModules}</Text>
          <Text style={styles.statLabel}>Modules</Text>
        </View>

        {/* XP Earned */}
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={styles.xpIcon}>✨</Text>
          </View>
          <Text style={styles.statValue}>+{totalXP}</Text>
          <Text style={styles.statLabel}>XP Earned</Text>
        </View>

        {/* Stars Earned */}
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={styles.starIcon}>⭐</Text>
          </View>
          <Text style={styles.statValue}>{totalStars}</Text>
          <Text style={styles.statLabel}>Stars</Text>
        </View>
      </View>

      {/* Encouragement Message */}
      <Text style={styles.message}>
        Great work! You've completed this adventure. Keep going to unlock more historical discoveries!
      </Text>

      {/* Continue Button */}
      <TouchableOpacity
        style={styles.continueButtonWrapper}
        onPress={onContinue}
        activeOpacity={0.9}
      >
        <View style={styles.continueShadow} />
        <LinearGradient
          colors={['#C99151', '#A67842']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.continueButton}
        >
          <Text style={styles.continueButtonText}>CONTINUE</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// Streak Milestone View - 50 XP Celebration with Golden Badge
function StreakMilestoneView({
  milestoneXP,
  totalXP,
  onContinue,
}: {
  milestoneXP: number;
  totalXP: number;
  onContinue: () => void;
}) {
  return (
    <View style={styles.content}>
      {/* Confetti emoji celebration (placeholder for now) */}
      <Text style={styles.confettiEmoji}>🎉</Text>

      {/* Golden Badge with XP */}
      <View style={styles.goldenBadge}>
        <LinearGradient
          colors={['#FFD700', '#FFA500', '#FF8C00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.goldenBadgeGradient}
        >
          <Text style={styles.badgeXPText}>{milestoneXP}</Text>
          <Text style={styles.badgeXPLabel}>XP</Text>
        </LinearGradient>
      </View>

      {/* Title */}
      <Text style={styles.title}>Milestone Reached!</Text>

      {/* Subtitle */}
      <Text style={styles.adventureName}>You've earned {milestoneXP} XP!</Text>

      {/* Total XP Display */}
      <View style={[styles.statCard, { marginTop: 40, marginBottom: 32 }]}>
        <View style={styles.statIconContainer}>
          <Text style={styles.xpIcon}>✨</Text>
        </View>
        <Text style={styles.statValue}>{totalXP}</Text>
        <Text style={styles.statLabel}>Total XP</Text>
      </View>

      {/* Encouragement Message */}
      <Text style={styles.message}>
        Amazing progress! Keep learning to unlock more milestones and discover the history of Islam!
      </Text>

      {/* Continue Button */}
      <TouchableOpacity
        style={styles.continueButtonWrapper}
        onPress={onContinue}
        activeOpacity={0.9}
      >
        <View style={styles.continueShadow} />
        <LinearGradient
          colors={['#FFD700', '#FFA500']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.continueButton}
        >
          <Text style={styles.continueButtonText}>CONTINUE</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4EBDB',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // Video Reward Player
  videoRewardContainer: {
    alignSelf: 'center',
    width: width * 1.1, // 110% screen width (slight overflow)
    aspectRatio: 16 / 9, // 16:9 aspect ratio for videos
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20, // Top spacing
    marginBottom: 24, // Bottom spacing to title
    backgroundColor: 'transparent', // Transparent background
  },
  videoRewardPlayer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },

  // Title
  title: {
    fontFamily: 'Cormorant-Bold',
    fontSize: 36,
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginBottom: 12,
  },

  // Adventure Name
  adventureName: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '600',
    color: ArchivesTheme.colors.persianOrange,
    textAlign: 'center',
    marginBottom: 40,
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },

  // Stat Card
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  statIconContainer: {
    marginBottom: 12,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  xpIcon: {
    fontSize: 40,
  },
  starIcon: {
    fontSize: 40,
  },
  statValue: {
    fontFamily: 'DM Sans',
    fontSize: 28,
    fontWeight: '700',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '500',
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
  },

  // Message
  message: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '500',
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },

  // Continue Button
  continueButtonWrapper: {
    width: '100%',
    position: 'relative',
  },
  continueShadow: {
    position: 'absolute',
    width: '100%',
    height: 56,
    backgroundColor: '#6E4E29',
    borderRadius: 17,
    bottom: 0,
  },
  continueButton: {
    width: '100%',
    height: 56,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },

  // Streak Milestone Styles
  confettiEmoji: {
    fontSize: 80,
    textAlign: 'center',
    marginBottom: 24,
  },
  goldenBadge: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 32,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  goldenBadgeGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFD700',
  },
  badgeXPText: {
    fontFamily: 'Cormorant-Bold',
    fontSize: 56,
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  badgeXPLabel: {
    fontFamily: 'DM Sans',
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginTop: -8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
