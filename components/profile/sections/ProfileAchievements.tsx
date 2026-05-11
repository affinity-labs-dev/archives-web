import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';

import { AnimatedEntrance } from '@/components/ui/animations/AnimatedEntrance';
import { Typography } from '@/components/ui/Typography';
import { colors } from '@/components/ui/theme';
import { analyticsService } from '@/services/AnalyticsService';

import { getAchievementImage } from '../assetMaps';
import { LiftPressable } from '../shared/LiftPressable';
import type { DisplayAchievement } from '../types';
import { profileStyles } from './styles';

interface ProfileAchievementsProps {
  shouldAnimate: boolean;
  achievements: DisplayAchievement[];
  onOpenAll: () => void;
  onPreviewAchievement: (achievement: DisplayAchievement) => void;
}

function ProfileAchievementsImpl({
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

        <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24 }} contentContainerStyle={[profileStyles.achievementRow, { paddingHorizontal: 24 }]}>
          {achievements.map((achievement) => {
            // Pre-rendered locked + unlocked artwork from the shared
            // assetMaps — same source AchievementsScreen uses for its
            // full grid + preview card. Drops the runtime SVG
            // grayscale filter (GrayscaleImage) and guarantees the
            // preview modal shows the same pixel-perfect artwork as
            // the small tile here.
            const localImage = getAchievementImage(
              achievement.id,
              achievement.unlocked,
            );
            return (
              <View key={achievement.id} style={profileStyles.achievementItem}>
                <LiftPressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    analyticsService.trackProfileAchievementTapped({
                      achievement_id: achievement.id,
                      achievement_name: achievement.name,
                      is_unlocked: !!achievement.unlocked,
                    });
                    // Spread + override `image` so the preview card
                    // upstream renders the local locked/unlocked PNG
                    // instead of the Supabase URL the orchestrator
                    // attached to `achievement.image`.
                    onPreviewAchievement({ ...achievement, image: localImage });
                  }}
                >
                  <View style={profileStyles.achievementIconWrap}>
                    <Image
                      source={localImage}
                      style={profileStyles.achievementImage}
                      resizeMode="contain"
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
            );
          })}
        </Animated.ScrollView>
      </View>
    </AnimatedEntrance>
  );
}

export const ProfileAchievements = React.memo(ProfileAchievementsImpl);
