// Reusable Era Progress Header Component
// Displays era name, timeline, and adventure progress dots
// Used by BentoGridScreen and other era-based screens

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import ArchivesTheme from '@/constants/ArchivesTheme';
import StreakBadge from '@/components/gamification/StreakBadge';
import LevelBadge from '@/components/gamification/LevelBadge';
import LevelUpAnimation from '@/components/gamification/LevelUpAnimation';
import { useDailyStreak } from '@/hooks/useDailyStreak';
import { useLevel } from '@/hooks/useLevel';

interface EraProgressHeaderProps {
  title: string;           // e.g., "Exploring Rise of Islam"
  subtitle: string;        // e.g., "610-632 CE" (timeline)
  currentStep: number;     // Number of completed adventures
  totalSteps: number;      // Total number of adventures in era
}

const EraProgressHeader: React.FC<EraProgressHeaderProps> = ({
  title,
  subtitle,
  currentStep,
  totalSteps,
}) => {
  const { streak, refresh: refreshStreak } = useDailyStreak();
  const { currentLevel, didLevelUp, refresh: refreshLevel } = useLevel();

  const handleRefresh = () => {
    refreshStreak();
    refreshLevel();
  };

  // Responsive padding to match bento grid
  const { width: screenWidth } = Dimensions.get('window');
  const containerPadding = screenWidth * 0.034; // ~13px on 375px screen

  // Calculate dynamic dot positions based on totalSteps
  // Spread dots evenly across the progress bar width (192px)
  const progressBarWidth = 192;
  const dotRadius = 4;

  const getDotPositions = () => {
    if (totalSteps <= 1) {
      return [progressBarWidth / 2]; // Single dot in center
    }

    const positions: number[] = [];
    const spacing = (progressBarWidth - dotRadius * 2) / (totalSteps - 1);

    for (let i = 0; i < totalSteps; i++) {
      positions.push(dotRadius + (spacing * i));
    }

    return positions;
  };

  const dotPositions = getDotPositions();

  return (
    <View style={[styles.progressWrapper, { paddingLeft: containerPadding, paddingRight: containerPadding }]}>
      {/* Level Up Animation */}
      <LevelUpAnimation visible={didLevelUp} level={currentLevel} onDismiss={() => {}} />

      {/* Gamification Badges */}
      <View style={styles.badgesContainer}>
        <StreakBadge streak={streak} compact onRefresh={handleRefresh} />
        <LevelBadge level={currentLevel} compact />
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressTextContainer}>
          <Text style={styles.progressTitle}>{title}</Text>
          <View style={styles.progressSubtitleRow}>
            <Text style={styles.progressSubtitle}>{subtitle}</Text>
            {/* Dynamic Progress Bar */}
            <View style={styles.progressBarContainer}>
              <Svg width={progressBarWidth} height={8} viewBox={`0 0 ${progressBarWidth} 8`}>
                {/* Background line */}
                <Path
                  d={`M${dotRadius} 4L${progressBarWidth - dotRadius} 4`}
                  stroke="#D7C5B6"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                {/* Dynamic dots based on totalSteps */}
                {dotPositions.map((cx, index) => (
                  <Circle
                    key={index}
                    cx={cx}
                    cy={4}
                    r={dotRadius}
                    fill={currentStep > index ? "white" : "#D7C5B6"}
                  />
                ))}
              </Svg>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  progressWrapper: {
    marginBottom: 40,
    paddingTop: 77, // Status bar space when sticky
    backgroundColor: ArchivesTheme.colors.creamWhite,
    // paddingLeft and paddingRight applied inline to match bento grid
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'flex-end',
  },
  progressCard: {
    height: 53,
    backgroundColor: ArchivesTheme.colors.persianOrange,
    borderRadius: 11,
    paddingLeft: 24,
    paddingRight: 24,
    justifyContent: 'center',
  },
  progressTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  progressTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'DM Sans',
  },
  progressSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  progressSubtitle: {
    color: ArchivesTheme.colors.creamWhite,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'DM Sans',
    letterSpacing: 0.14,
    marginRight: 12,
  },
  progressBarContainer: {
    width: 192,
    height: 8,
  },
});

export default EraProgressHeader;
