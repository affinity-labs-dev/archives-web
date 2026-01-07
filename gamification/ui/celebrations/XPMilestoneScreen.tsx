// XP Milestone Screen - Celebration screen for reaching XP milestones
// Matches the design with video background, XP card, and decorative quiz images
// FULLY RESPONSIVE - All values use percentages based on screen dimensions

import ArchivesTheme from '@/constants/ArchivesTheme';
import { ADVENTURE_KEYS } from '@/constants/WalkthroughKeys';
import { useGamifiedProgress } from '@/gamification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { VideoView } from 'expo-video';
import { useCelebrationVideoPlayer } from '@/hooks/useCelebrationVideoPlayer';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface XPMilestoneScreenProps {
  totalXP?: number;
  milestoneXP?: number; // Which milestone was reached (50, 100, 200, 400, 750)
  eraId?: string;       // Era ID for era-specific milestone tracking
  onContinue?: () => void;
}

export default function XPMilestoneScreen({ milestoneXP, eraId, onContinue }: XPMilestoneScreenProps) {
  const { addMilestone } = useGamifiedProgress();

  // Ref to prevent duplicate saves (useEffect runs once per mount, not on addMilestone changes)
  const hasSavedRef = useRef(false);

  // State to track if video has ended (prevents double dismissal)
  const [videoEnded, setVideoEnded] = useState(false);

  // Video player setup - plays once, then auto-dismisses
  const videoSource = require('@/assets/videos/xp1.mp4');
  const player = useCelebrationVideoPlayer(videoSource, (player) => {
    player.loop = false; // Play once only
    player.play();
  });

  // Track milestone reached on mount and persist to Supabase
  // Using ref to prevent infinite loop (addMilestone updates state, which would re-trigger this effect)
  useEffect(() => {
    if (milestoneXP && !hasSavedRef.current) {
      hasSavedRef.current = true;

      analyticsService.trackCustomEvent('xp_milestone_reached', {
        milestone_xp: milestoneXP,
      });
      console.log(`📊 [Analytics] XP Milestone Reached: ${milestoneXP} XP`);

      // Persist milestone to GamifiedProgress (syncs to Supabase)
      addMilestone({
        type: 'xp',
        threshold: milestoneXP,
        era_id: eraId,
      });
    }
  }, [milestoneXP, eraId, addMilestone]);

  // Handle close button
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Track milestone skipped
    if (milestoneXP) {
      analyticsService.trackCustomEvent('xp_milestone_skipped', {
        milestone_xp: milestoneXP,
      });
      console.log(`📊 [Analytics] XP Milestone Skipped: ${milestoneXP} XP`);

      // Save flag to mark this XP milestone as seen (ERA-SPECIFIC)
      AsyncStorage.setItem(ADVENTURE_KEYS.getXPMilestoneKey(milestoneXP, eraId), 'true')
        .then(() => console.log(`✅ Marked XP milestone screen as seen: ${milestoneXP} XP for era: ${eraId || 'global'}`))
        .catch((error) => console.error('❌ Error saving XP milestone flag:', error));
    }

    // Dismiss screen
    if (onContinue) {
      onContinue();
    }
  };

  // Handle video end - dismiss screen
  const handleVideoEnd = useCallback(() => {
    if (videoEnded) return; // Prevent double dismissal
    setVideoEnded(true);

    console.log('🎬 [XPMilestoneScreen] Video finished, auto-dismissing...');

    // Track milestone dismissed
    if (milestoneXP) {
      analyticsService.trackCustomEvent('xp_milestone_dismissed', {
        milestone_xp: milestoneXP,
      });
      console.log(`📊 [Analytics] XP Milestone Dismissed: ${milestoneXP} XP`);
    }

    // Save flag to mark this XP milestone as seen (ERA-SPECIFIC)
    if (milestoneXP) {
      AsyncStorage.setItem(ADVENTURE_KEYS.getXPMilestoneKey(milestoneXP, eraId), 'true')
        .then(() => console.log(`✅ Marked XP milestone screen as seen: ${milestoneXP} XP for era: ${eraId || 'global'}`))
        .catch((error) => console.error('❌ Error saving XP milestone flag:', error));
    }

    // Dismiss screen after short delay for smooth transition
    setTimeout(() => {
      if (onContinue) {
        onContinue();
      }
    }, 300);
  }, [videoEnded, milestoneXP, eraId, onContinue]);

  // Listen for video end - Auto-dismiss screen when video finishes
  useEffect(() => {
    if (!player) return;

    const playbackSubscription = player.addListener('playToEnd', handleVideoEnd);

    return () => playbackSubscription?.remove();
  }, [player, handleVideoEnd]);

  return (
    <View style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleClose}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
      </TouchableOpacity>

      {/* Video Background - Top 60% */}
      <View style={styles.videoContainer}>
        <VideoView
          player={player}
          style={styles.video}
          nativeControls={false}
          contentFit="contain"
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />
      </View>

      {/* XP Card - Overlapping video bottom */}
      <View style={styles.xpCardContainer}>
        <View style={styles.xpCard}>
          <Text style={styles.xpNumber}>{milestoneXP}+</Text>
          <Text style={styles.xpLabel}>Earned XP</Text>
        </View>

        {/* Encouragement Message */}
        <Text style={styles.message}>
          Look at you go! Your knowledge is{'\n'}growing stronger everyday.
        </Text>
      </View>

      {/* Bottom Decorative Images */}
      <View style={styles.bottomImagesContainer}>
        <Image
          source={require('@/assets/images/quiz-images/books.png')}
          style={styles.bottomImageLeft}
          contentFit="contain"
        />
        <Image
          source={require('@/assets/images/quiz-images/ship.png')}
          style={styles.bottomImage}
          contentFit="contain"
        />
        <Image
          source={require('@/assets/images/quiz-images/Map.png')}
          style={styles.bottomImageRight}
          contentFit="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  // Close Button
  closeButton: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.05,
    right: SCREEN_WIDTH * 0.05,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // Video Section
  videoContainer: {
    width: SCREEN_WIDTH * 1.35, // 135% of screen width for larger video
    height: SCREEN_WIDTH * 1.35 * 0.5625, // 16:9 aspect ratio maintained
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center', // Center the container horizontally
    marginTop: SCREEN_HEIGHT * 0.22, // 22% margin from top
  },
  video: {
    width: '100%',
    height: '100%',
  },

  // XP Card Section
  xpCardContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.05, // 5% margin moves card down for breathing room
  },
  xpCard: {
    backgroundColor: 'white',
    borderRadius: SCREEN_WIDTH * 0.05, // 5% of screen width
    width: SCREEN_WIDTH * 0.81, // 81% → ~316px on standard screen
    height: SCREEN_HEIGHT * 0.085, // 8.5% → ~72px on standard screen
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.03, // 3% of screen width
    gap: SCREEN_WIDTH * 0.02, // 2% of screen width
    // Drop shadow: X=0, Y=0, Blur=10.81, Spread=0, Color=#000000 30%
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: SCREEN_WIDTH * 0.0277, // 2.77% → ~10.81px on standard screen
    elevation: 3,
  },
  xpNumber: {
    fontFamily: 'DM Sans',
    fontSize: SCREEN_WIDTH * 0.128, // 12.8% → ~50px on standard screen
    fontWeight: '600',
    color: ArchivesTheme.colors.persianOrange,
  },
  xpLabel: {
    fontFamily: 'DM Sans',
    fontSize: SCREEN_WIDTH * 0.072, // 7.2% → ~28px on standard screen
    fontWeight: '600',
    color: ArchivesTheme.colors.persianOrange,
  },

  // Message
  message: {
    fontFamily: 'DM Sans',
    fontSize: SCREEN_WIDTH * 0.04, // 4% of screen width
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    lineHeight: SCREEN_WIDTH * 0.06, // 6% of screen width
    marginTop: SCREEN_HEIGHT * 0.02, // 2% of screen height
    paddingHorizontal: SCREEN_WIDTH * 0.1, // 10% of screen width
  },

  // Bottom Decorative Images
  bottomImagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Spreads images edge-to-edge
    alignItems: 'flex-end',
    paddingHorizontal: 0, // No padding - images pushed to edges
    marginBottom: SCREEN_HEIGHT * -0.02, // -2% push images down (partial overflow)
  },
  bottomImage: {
    width: SCREEN_WIDTH * 0.36, // 36% of screen width (30% * 1.2)
    height: SCREEN_WIDTH * 0.36, // Keep aspect ratio square
  },
  bottomImageLeft: {
    width: SCREEN_WIDTH * 0.36, // 36% of screen width (30% * 1.2)
    height: SCREEN_WIDTH * 0.36, // Keep aspect ratio square
    transform: [{ rotate: '-14deg' }], // Rotate left image -14 degrees (counter-clockwise)
    marginLeft: SCREEN_WIDTH * -0.08, // -8% moves left image even further left
    marginBottom: SCREEN_HEIGHT * 0.01, // 1% moves left image up slightly
  },
  bottomImageRight: {
    width: SCREEN_WIDTH * 0.36, // 36% of screen width (30% * 1.2)
    height: SCREEN_WIDTH * 0.36, // Keep aspect ratio square
    transform: [{ rotate: '-7.35deg' }, { scaleX: -1 }], // Rotate -7.35 degrees, mirror horizontally
    marginRight: SCREEN_WIDTH * -0.08, // -8% moves right image further right
    marginBottom: SCREEN_HEIGHT * 0.00, // 1% moves right image up slightly
  },
});
