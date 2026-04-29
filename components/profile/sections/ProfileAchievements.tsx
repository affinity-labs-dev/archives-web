import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AnimatedEntrance } from '@/components/ui/animations/AnimatedEntrance';
import { Typography } from '@/components/ui/Typography';
import { colors } from '@/components/ui/theme';
import { GrayscaleImage } from '@/gamification/ui/achievement/GrayscaleImage';
import CamelImage from '@/assets/images/quiz-images/Camel.png';

import { LiftPressable } from '../shared/LiftPressable';
import type { DisplayAchievement } from '../types';
import { profileStyles } from './styles';

interface ProfileAchievementsProps {
  shouldAnimate: boolean;
  achievements: DisplayAchievement[];
  onOpenAll: () => void;
  onPreviewAchievement: (achievement: DisplayAchievement) => void;
}

export function ProfileAchievements({
  shouldAnimate,
  achievements,
  onOpenAll,
  onPreviewAchievement,
}: ProfileAchievementsProps) {
  return (
    <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={1400}>
      <View style={profileStyles.sectionContainer}>
        <TouchableOpacity
          style={profileStyles.sectionHeader}
          onPress={onOpenAll}
          activeOpacity={0.7}
        >
          <Typography family="onest" size={20} weight="600" color="onyx">
            Achievements
          </Typography>
          <Ionicons name="chevron-forward" size={22} color={colors.concreteGrey} />
        </TouchableOpacity>

        <View style={profileStyles.achievementRow}>
          {achievements.map((achievement) => (
            <View key={achievement.id} style={profileStyles.achievementItem}>
              <LiftPressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onPreviewAchievement(achievement);
                }}
              >
                <View style={profileStyles.achievementIconWrap}>
                  <GrayscaleImage
                    source={achievement.image || CamelImage}
                    style={profileStyles.achievementImage}
                    width={92}
                    height={92}
                    resizeMode="contain"
                    grayscale={!achievement.unlocked}
                  />
                </View>
              </LiftPressable>
              <Typography
                family="onest"
                size={12}
                weight="600"
                color={achievement.unlocked ? 'onyx' : 'concreteGrey'}
                align="center"
                style={{ marginTop: 6 }}
              >
                {achievement.name}
              </Typography>
            </View>
          ))}
        </View>
      </View>
    </AnimatedEntrance>
  );
}
