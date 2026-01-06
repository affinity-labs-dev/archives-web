// Reusable Era Progress Header Component
// Displays era name, progress bar with percentage, streak days, and XP
// Progress calculated based on quiz correct answers

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Defs, Filter, FeGaussianBlur, FeFlood, FeComposite, FeMerge, FeMergeNode, Path } from 'react-native-svg';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { useDailyStreak } from '@/gamification';

// Streak icon (flame)
const StreakIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960" fill="#FFFFFF">
    <Path d="M240-400q0 52 21 98.5t60 81.5q-1-5-1-9v-9q0-32 12-60t35-51l113-111 113 111q23 23 35 51t12 60v9q0 4-1 9 39-35 60-81.5t21-98.5q0-50-18.5-94.5T648-574q-20 13-42 19.5t-45 6.5q-62 0-107.5-41T401-690q-39 33-69 68.5t-50.5 72Q261-513 250.5-475T240-400Zm240 52-57 56q-11 11-17 25t-6 29q0 32 23.5 55t56.5 23q33 0 56.5-23t23.5-55q0-16-6-29.5T537-292l-57-56Zm0-492v132q0 34 23.5 57t57.5 23q18 0 33.5-7.5T622-658l18-22q74 42 117 117t43 163q0 134-93 227T480-80q-134 0-227-93t-93-227q0-129 86.5-245T480-840Z" />
  </Svg>
);

// XP icon (medal/star)
const XPIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960" fill="#FFFFFF">
    <Path d="m387-412 35-114-92-74h114l36-112 36 112h114l-93 74 35 114-92-71-93 71ZM240-40v-309q-38-42-59-96t-21-115q0-134 93-227t227-93q134 0 227 93t93 227q0 61-21 115t-59 96v309l-240-80-240 80Zm240-280q100 0 170-70t70-170q0-100-70-170t-170-70q-100 0-170 70t-70 170q0 100 70 170t170 70ZM320-159l160-41 160 41v-124q-35 20-75.5 31.5T480-240q-44 0-84.5-11.5T320-283v124Zm160-62Z" />
  </Svg>
);

interface EraProgressHeaderProps {
  title: string;              // e.g., "Rise of Islam"
  subtitle?: string;          // e.g., "610-632 CE" (timeline) - optional, not shown in new design
  correctAnswers: number;     // Total correct quiz answers across all modules
  totalQuestions: number;     // Total possible quiz questions (modules × 5)
  totalXP?: number;           // Total XP earned (optional, placeholder for now)
}

const EraProgressHeader: React.FC<EraProgressHeaderProps> = ({
  title,
  correctAnswers,
  totalQuestions,
  totalXP = 0,
}) => {
  const { streak } = useDailyStreak();

  // Responsive padding to match bento grid
  const { width: screenWidth } = Dimensions.get('window');
  const containerPadding = screenWidth * 0.034; // ~13px on 375px screen

  // Calculate progress percentage
  const progressPercentage = totalQuestions > 0
    ? Math.round((correctAnswers / totalQuestions) * 100)
    : 0;

  // Responsive progress bar dimensions
  // Card width = screen - (2 * containerPadding)
  // Left content width = card width - statsBox(84) - paddingLeft(16) - paddingRight(8) - gap(16)
  const statsBoxWidth = 84;
  const cardPaddingLeft = 16;
  const cardPaddingRight = 8;
  const gap = 32;
  const progressBarWidth = screenWidth - (2 * containerPadding) - statsBoxWidth - cardPaddingLeft - cardPaddingRight - gap;
  const progressBarHeight = 4;
  const filledWidth = totalQuestions > 0
    ? (correctAnswers / totalQuestions) * progressBarWidth
    : 0;

  return (
    <View style={[styles.progressWrapper, { paddingLeft: containerPadding, paddingRight: containerPadding }]}>
      <View style={styles.progressCard}>
        {/* Left side: Era name + progress bar */}
        <View style={styles.leftContent}>
          {/* Title row: Era name on left, percentage on right */}
          <View style={[styles.titleRow, { width: progressBarWidth }]}>
            <Text style={styles.eraTitle}>{title}</Text>
            <Text style={styles.percentageText}>{progressPercentage}%</Text>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressBarContainer, { width: progressBarWidth }]}>
                <Svg width={progressBarWidth} height={progressBarHeight + 4} viewBox={`0 0 ${progressBarWidth} ${progressBarHeight + 4}`}>
              <Defs>
                <Filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <FeGaussianBlur stdDeviation="2" result="blur" />
                  <FeFlood floodColor="white" floodOpacity="0.6" result="color" />
                  <FeComposite in="color" in2="blur" operator="in" result="shadow" />
                  <FeMerge>
                    <FeMergeNode in="shadow" />
                    <FeMergeNode in="SourceGraphic" />
                  </FeMerge>
                </Filter>
              </Defs>
              {/* Background track */}
              <Rect
                x={0}
                y={2}
                width={progressBarWidth}
                height={progressBarHeight}
                rx={2}
                fill={ArchivesTheme.colors.shoeBrown}
              />
              {/* Filled portion with glow */}
              {filledWidth > 0 && (
                <Rect
                  x={0}
                  y={1}
                  width={filledWidth}
                  height={progressBarHeight + 2}
                  rx={2}
                  fill="white"
                  filter="url(#glow)"
                />
              )}
            </Svg>
          </View>
        </View>

        {/* Right side: Stats box (streak + XP) */}
        <View style={styles.statsBox}>
          {/* Streak row */}
          <View style={styles.statRow}>
            <View style={styles.iconWrapper}>
              <StreakIcon size={16} />
            </View>
            <Text style={styles.statValue}>{streak} </Text>
            <Text style={styles.statLabel}>days</Text>
          </View>
          {/* XP row */}
          <View style={styles.statRow}>
            <View style={styles.iconWrapper}>
              <XPIcon size={16} />
            </View>
            <Text style={styles.statValue}>{totalXP || correctAnswers * 10} </Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  progressWrapper: {
    marginBottom: 16,
    paddingTop: 77, // Status bar space when sticky
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  progressCard: {
    height: 63,
    backgroundColor: ArchivesTheme.colors.persianOrange,
    borderRadius: 14,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eraTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'DM Sans',
  },
  percentageText: {
    color: ArchivesTheme.colors.shoeBrown,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'DM Sans',
    letterSpacing: 0.18,
  },
  progressBarContainer: {
    height: 8,
  },
  statsBox: {
    width: 84,
    height: 48,
    backgroundColor: ArchivesTheme.colors.shoeBrown,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 16,
    height: 16,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'DM Sans',
    letterSpacing: 0.14,
  },
  statLabel: {
    color: '#C3C3C3',
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'DM Sans',
  },
});

export default EraProgressHeader;
