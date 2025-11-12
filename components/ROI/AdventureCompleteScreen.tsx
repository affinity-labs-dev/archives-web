// Adventure Complete Screen - Celebration screen for completing an adventure
// Figma design: https://www.figma.com/design/rQCyFdW0CFzpUoegFfew7u/Archives_Raw_File?node-id=693-1885
// Features:
// - Blurred background image (25% height) with title overlay (respects Supabase newlines)
// - Badge "ADVENTURE COMPLETED!" with description text
// - Character illustration
// - Stats card (Badges, Total XP, Modules as "X/Y" format) with Persian Orange text
// - Moss green "START NEXT ADVENTURE" button
// FULLY RESPONSIVE - All values use percentages based on screen dimensions

import ArchivesTheme from '@/constants/ArchivesTheme';
import { ADVENTURE_KEYS } from '@/constants/WalkthroughKeys';
import { useProgress } from '@/context/ProgressContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsService } from '@/services/AnalyticsService';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useState, useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Adventure } from './types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AdventureCompleteScreenProps {
  // Option 1: Pass Adventure object (data extracted automatically)
  adventure?: Adventure;

  // Option 2: Pass individual props (overrides adventure object)
  adventureSubtitle?: string; // Small title (e.g., "The New Capital")
  adventureTitle?: string; // Large title (e.g., "Damascus")
  adventureDescription?: string; // Description after badge
  backgroundVideo?: string; // Background video URL (preferred)
  backgroundImage?: string; // Background image URL (fallback)

  // Stats
  totalBadges?: number;
  totalXP?: number;
  completedModules?: number; // Number of completed modules
  totalModules?: number; // Total number of modules
  onContinue: () => void;
}

export default function AdventureCompleteScreen({
  adventure,
  adventureSubtitle: propSubtitle,
  adventureTitle: propTitle,
  adventureDescription: propDescription,
  backgroundImage: propBackgroundImage,
  totalBadges = 3,
  totalXP = 0,
  completedModules = 5,
  totalModules = 5,
  onContinue,
}: AdventureCompleteScreenProps) {
  // Get progress functions
  const { getROIAdventureStats } = useProgress();

  // State for calculated stats
  const [calculatedStats, setCalculatedStats] = useState({ xp: 0, completedModules: 0 });
  const [hasTrackedCompletion, setHasTrackedCompletion] = useState(false);

  // Calculate stats from adventure progress data
  useEffect(() => {
    const loadStats = async () => {
      if (adventure?.readable_id) {
        const stats = await getROIAdventureStats(adventure.readable_id);
        setCalculatedStats(stats);
        console.log(`📊 [AdventureCompleteScreen] Loaded stats for ${adventure.readable_id}:`, stats);
      }
    };
    loadStats();
  }, [adventure?.readable_id, getROIAdventureStats]);

  // Calculate total modules from adventure content_list
  const totalModulesCount = totalModules || adventure?.content_list?.length || 5;

  // Use calculated stats (with fallback to props for backwards compatibility)
  const displayXP = totalXP || calculatedStats.xp;
  const displayCompletedModules = completedModules || calculatedStats.completedModules;

  // Track adventure completion once when stats are ready
  useEffect(() => {
    // Only track once, and only when we have valid data
    if (
      !hasTrackedCompletion &&
      adventure?.readable_id &&
      (totalXP > 0 || calculatedStats.xp > 0) // Ensure we have loaded stats
    ) {
      analyticsService.trackCustomEvent('adventure_completed', {
        adventure_id: adventure.readable_id,
        adventure_title: adventure.adventure_title,
        total_xp: displayXP,
        completed_modules: displayCompletedModules,
        total_modules: totalModulesCount,
        screen_url: `/roi/${adventure.readable_id}/complete`,
      });
      console.log(`📊 [Analytics] Adventure Completed: ${adventure.readable_id} (XP: ${displayXP}, Modules: ${displayCompletedModules}/${totalModulesCount})`);
      setHasTrackedCompletion(true);
    }
  }, [adventure?.readable_id, adventure?.adventure_title, calculatedStats, totalXP, hasTrackedCompletion, displayXP, displayCompletedModules, totalModulesCount]);

  // Set up video player for character animation
  const videoSource = require('@/assets/videos/advend.mp4');
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.play();
  });

  // Cleanup video player on unmount
  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch (error) {
        // Silently handle cleanup errors
      }
    };
  }, [player]);

  // Extract data from adventure object or use provided props
  const fullTitle = propTitle || adventure?.adventure_title || 'Complete';
  const description = propDescription || adventure?.adventure_description;
  const bgImage = propBackgroundImage || adventure?.card_content?.background_image || '';

  // Split title on newline character if present in Supabase adventure_title
  // Line 1: 35px, Line 2: 40px
  const titleLines = fullTitle.split('\n');
  const hasMultipleLines = titleLines.length > 1;
  const titleLine1 = hasMultipleLines ? titleLines[0] : '';
  const titleLine2 = hasMultipleLines ? titleLines[1] : fullTitle;

  const handleContinue = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Track continue button click
    if (adventure?.readable_id) {
      analyticsService.trackCustomEvent('adventure_complete_continue', {
        adventure_id: adventure.readable_id,
        adventure_title: adventure.adventure_title,
        screen_url: `/roi/${adventure.readable_id}/complete`,
      });
      console.log(`📊 [Analytics] Adventure Complete Continue: ${adventure.readable_id}`);
    }

    // Save flag to mark this adventure complete screen as seen
    if (adventure?.readable_id) {
      try {
        const adventureCompleteKey = ADVENTURE_KEYS.getAdventureCompleteKey(adventure.readable_id);
        await AsyncStorage.setItem(adventureCompleteKey, 'true');
        console.log(`✅ Marked adventure complete screen as seen: ${adventure.readable_id}`);
      } catch (error) {
        console.error('❌ Error saving adventure complete flag:', error);
      }
    }

    onContinue();
  };

  return (
    <View style={styles.container}>
      {/* Top Image Section with Two-Line Title */}
      <View style={styles.topImageSection}>
        <Image
          source={{ uri: bgImage }}
          style={styles.backgroundImage}
          contentFit="cover"
          blurRadius={3}
          placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
        />

        {/* Gradient overlay for text readability */}
        <LinearGradient
          colors={['rgba(244,235,219,0)', 'rgba(244,235,219,0)', 'rgba(244,235,219,0.8)', 'rgba(244,235,219,1)']}
          locations={[0, 0.5, 0.85, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientOverlay}
        />

        {/* Title over image */}
        <View style={styles.titleContainer}>
          {hasMultipleLines && titleLine1 ? (
            <>
              <Text style={styles.titleLine1} numberOfLines={1}>{titleLine1}</Text>
              <Text style={styles.titleLine2} numberOfLines={1}>{titleLine2}</Text>
            </>
          ) : (
            <Text style={styles.titleLine2} numberOfLines={1}>{titleLine2}</Text>
          )}
        </View>
      </View>

      {/* Content Section - Solid Background */}
      <View style={styles.contentSection}>
        {/* Badge - "ADVENTURE COMPLETED!" */}
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ADVENTURE COMPLETED!</Text>
          </View>
        </View>

        {/* Description Text */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>{description}</Text>
        </View>

        {/* Character Section */}
        <View style={styles.characterSection}>
          <VideoView
            player={player}
            style={styles.characterImage}
            nativeControls={false}
            contentFit="cover"
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          {/* Badges Column */}
          <View style={styles.statColumn}>
            <Text style={styles.statValue}>{totalBadges}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>

          {/* Total XP Column */}
          <View style={styles.statColumn}>
            <Text style={styles.statValue}>{displayXP}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>

          {/* Modules Column */}
          <View style={styles.statColumn}>
            <Text style={styles.statValue}>{displayCompletedModules}/{totalModulesCount}</Text>
            <Text style={styles.statLabel}>Modules</Text>
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>START NEXT ADVENTURE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  // Top Image Section - 25% of screen height
  topImageSection: {
    height: SCREEN_HEIGHT * 0.25, // 25% of screen height
    width: SCREEN_WIDTH,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.08, // Increased from 0.05 to prevent truncation
    marginTop: SCREEN_HEIGHT * 0.16, // Move text down by 16% of screen height
  },
  titleLine1: {
    fontFamily: 'Cormorant-Bold',
    fontSize: SCREEN_WIDTH * 0.09, // 9% → ~35px on standard screen
    fontWeight: '700',
    color: ArchivesTheme.colors.mutedNavy, // #41425E - Muted Navy
    textAlign: 'center',
    lineHeight: SCREEN_WIDTH * 0.09, // 35px line height
  },
  titleLine2: {
    fontFamily: 'Cormorant-Bold',
    fontSize: SCREEN_WIDTH * 0.103, // 10.3% → ~40px on standard screen
    fontWeight: '700',
    color: ArchivesTheme.colors.mutedNavy, // #41425E - Muted Navy
    textAlign: 'center',
    lineHeight: SCREEN_WIDTH * 0.103, // 40px line height
  },

  // Content Section - Rest of screen with solid background
  contentSection: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
    alignItems: 'center',
    paddingTop: SCREEN_HEIGHT * 0.03, // 3% top padding
    paddingBottom: SCREEN_HEIGHT * 0.05, // 5% bottom padding
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% left/right padding
    justifyContent: 'flex-start',
    gap: SCREEN_HEIGHT * 0.02, // 2% consistent spacing between elements
  },

  // Badge Section
  badgeContainer: {
    alignItems: 'center',
  },
  badge: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    borderRadius: SCREEN_WIDTH * 0.042, // 4.2% → ~16.5px on standard screen
    paddingHorizontal: SCREEN_WIDTH * 0.031, // 3.1% → ~12px
    paddingVertical: SCREEN_HEIGHT * 0.0024, // 0.24% → ~2px (minimal vertical padding)
    height: SCREEN_HEIGHT * 0.035, // 3.5% → ~29px fixed height
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: 'DM Sans',
    fontSize: SCREEN_WIDTH * 0.036, // 3.6% → ~14px on standard screen
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },

  // Description Section
  descriptionContainer: {
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% horizontal padding
  },
  descriptionText: {
    fontFamily: 'DM Sans',
    fontSize: SCREEN_WIDTH * 0.046, // 4.6% → ~18px on standard screen
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy, // #41425E
    textAlign: 'center',
    lineHeight: SCREEN_WIDTH * 0.059, // Line height for readability
    letterSpacing: -0.18,
  },

  // Character Section
  characterSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterImage: {
    width: SCREEN_WIDTH * 0.75, // 75% of screen width (increased from 64%)
    height: SCREEN_WIDTH * 0.55, // Reduced height - crops top/bottom of video
  },

  // Stats Card
  statsCard: {
    backgroundColor: 'white',
    borderRadius: SCREEN_WIDTH * 0.051, // 5.1% → ~20px on standard screen
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.persianOrange,
    width: SCREEN_WIDTH * 0.835, // 83.5% → ~327px on standard screen
    height: SCREEN_HEIGHT * 0.127, // 12.7% → ~105px on standard screen
    paddingVertical: SCREEN_HEIGHT * 0.015, // Vertical padding
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SCREEN_HEIGHT * 0.008, // 0.8% spacing between value and label
  },
  statValue: {
    fontFamily: 'DM Sans',
    fontSize: SCREEN_WIDTH * 0.115, // 11.5% → ~45px on standard screen
    fontWeight: '600',
    color: ArchivesTheme.colors.persianOrange, // Changed to Persian Orange
  },
  statLabel: {
    fontFamily: 'DM Sans',
    fontSize: SCREEN_WIDTH * 0.041, // 4.1% → ~16px on standard screen
    fontWeight: '500',
    color: ArchivesTheme.colors.persianOrange, // Changed to Persian Orange
  },

  // Continue Button
  continueButton: {
    backgroundColor: '#959C00', // Moss green
    borderRadius: SCREEN_WIDTH * 0.068, // 6.8% → ~26.5px on standard screen (fully rounded)
    width: SCREEN_WIDTH * 0.835, // 83.5% → ~327px on standard screen
    height: SCREEN_HEIGHT * 0.054, // 5.4% → ~44.59px on standard screen
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto', // Push button to bottom
    marginBottom: SCREEN_HEIGHT * 0.03, // 3% spacing from bottom (moves button up)
    // Moss green shadow
    shadowColor: '#6E7300',
    shadowOffset: { width: 0, height: 4.179 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  continueButtonText: {
    fontFamily: 'DM Sans',
    fontSize: SCREEN_WIDTH * 0.046, // 4.6% → ~18px on standard screen
    fontWeight: '700',
    color: 'white',
    letterSpacing: -0.18,
  },
});
