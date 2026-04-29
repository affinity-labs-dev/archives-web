import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedEntrance } from '@/components/ui/animations/AnimatedEntrance';
import { Typography } from '@/components/ui/Typography';
import { colors } from '@/components/ui/theme';
import { profileStyles } from './styles';

interface ProfileLearningPreferencesProps {
  shouldAnimate: boolean;
  dailyGoalMinutes: number | null | undefined;
}

export function ProfileLearningPreferences({
  shouldAnimate,
  dailyGoalMinutes,
}: ProfileLearningPreferencesProps) {
  return (
    <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={1550}>
      <View style={profileStyles.sectionContainer}>
        <Typography
          family="onest"
          size={20}
          weight="600"
          color="onyx"
          style={{ marginBottom: 10 }}
        >
          Learning Preferences
        </Typography>

        <View style={profileStyles.preferenceRow}>
          <View style={profileStyles.preferenceLeft}>
            <Ionicons name="time-outline" size={22} color={colors.acaiSecondary} />
            <Typography
              family="onest"
              size={16}
              weight="500"
              color="onyx"
              style={{ marginLeft: 12 }}
            >
              Daily goal
            </Typography>
          </View>
          <Typography family="onest" size={16} weight="600" color="acaiSecondary">
            {dailyGoalMinutes ? `${dailyGoalMinutes} mins` : 'Not set'}
          </Typography>
        </View>
      </View>
    </AnimatedEntrance>
  );
}
