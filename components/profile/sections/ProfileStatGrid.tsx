import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { StaggerGroup } from '@/components/ui/animations/StaggerGroup';
import { Typography } from '@/components/ui/Typography';
import { colors, easings } from '@/components/ui/theme';
import { StatTile } from '../shared/StatTile';
import { profileStyles } from './styles';

interface ProfileStatGridProps {
  shouldAnimate: boolean;
  longestStreak: number;
  streak: number;
  lessonsCompleted: number;
  totalXP: number;
  minutesLearned: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function ProfileStatGrid({
  shouldAnimate,
  longestStreak,
  streak,
  lessonsCompleted,
  totalXP,
  minutesLearned,
  isExpanded,
  onToggleExpanded,
}: ProfileStatGridProps) {
  return (
    <View style={profileStyles.statSection}>
      <StaggerGroup
        autoPlay={shouldAnimate}
        preset={{
          translateY: { from: 20, to: 0 },
          scale: { from: 0.94, to: 1 },
          opacity: { from: 0, to: 1 },
          duration: 500,
          easing: easings.backOut14,
        }}
        baseDelay={820}
        staggerInterval={80}
      >
        <View style={profileStyles.statRow}>
          <StatTile
            value={longestStreak}
            label="Longest streak"
            colorScheme="blueDark"
            position="left"
            animate={shouldAnimate}
            countUpDelay={shouldAnimate ? 1050 : 0}
          />
          <StatTile
            value={streak}
            label="Current streak"
            colorScheme="blueLight"
            position="right"
            animate={shouldAnimate}
            countUpDelay={shouldAnimate ? 1050 : 0}
          />
        </View>

        <View style={profileStyles.statRow}>
          <StatTile
            value={lessonsCompleted}
            label="Videos watched"
            colorScheme="acaiLight"
            position="left"
            animate={shouldAnimate}
            countUpDelay={shouldAnimate ? 1130 : 0}
          />
          {/* TOP 2% — static label, doesn't go through StatTile because
              the value is text rather than a count-up integer. */}
          <View
            style={[
              profileStyles.staticRightTile,
              { backgroundColor: colors.acaiSecondary },
            ]}
          >
            <View style={profileStyles.staticTileContent}>
              <Typography
                family="bounded"
                size={18}
                weight="900"
                color="snow"
                style={{ lineHeight: 22 }}
              >
                TOP 2%
              </Typography>
            </View>
            <Typography
              family="onest"
              size={12}
              weight="bold"
              color="snow"
              style={{ opacity: 0.85 }}
            >
              {'World’s learners'}
            </Typography>
          </View>
        </View>
      </StaggerGroup>

      {isExpanded && (
        <StaggerGroup
          autoPlay
          preset={{
            translateY: { from: 14, to: 0 },
            scale: { from: 0.96, to: 1 },
            opacity: { from: 0, to: 1 },
            duration: 350,
            easing: easings.backOut14,
          }}
          baseDelay={0}
          staggerInterval={60}
        >
          <View style={profileStyles.statRow}>
            <StatTile
              value={minutesLearned}
              label="Minutes learned"
              colorScheme="acaiDark"
              position="left"
              animate
              countUpDelay={200}
            />
            <StatTile
              value={totalXP}
              label="Total XP"
              colorScheme="acaiLight"
              position="right"
              animate
              countUpDelay={200}
            />
          </View>

          <View style={profileStyles.statRowFull}>
            <StatTile
              value={lessonsCompleted}
              label="Lessons completed"
              colorScheme="acaiLight"
              position="full"
              animate
              countUpDelay={260}
            />
          </View>
        </StaggerGroup>
      )}

      <TouchableOpacity
        style={profileStyles.seeMoreToggle}
        onPress={onToggleExpanded}
        activeOpacity={0.6}
      >
        <Typography family="onest" size={14} weight="600" color="acaiSecondary">
          {isExpanded ? 'Show less' : 'See more'}
        </Typography>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.acaiSecondary}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>
    </View>
  );
}
