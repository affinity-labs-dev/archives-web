import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';

import { AnimatedEntrance } from '@/components/ui/animations/AnimatedEntrance';
import { Typography } from '@/components/ui/Typography';
import { colors } from '@/components/ui/theme';
import { GrayscaleImage } from '@/gamification/ui/achievement/GrayscaleImage';

import { LiftPressable } from '../shared/LiftPressable';
import { MonthPill } from '../shared/MonthPill';
import { getBadgeImage } from '../assetMaps';
import type { BadgePreview, MonthlyBadge } from '../types';
import { profileStyles } from './styles';

interface ProfileMonthlyBadgesProps {
  shouldAnimate: boolean;
  badges: MonthlyBadge[];
  selectedMonth: number | null;
  onSelectMonth: (month: number) => void;
  onOpenAll: () => void;
  onPreviewBadge: (preview: BadgePreview) => void;
}

function ProfileMonthlyBadgesImpl({
  shouldAnimate,
  badges,
  selectedMonth,
  onSelectMonth,
  onOpenAll,
  onPreviewBadge,
}: ProfileMonthlyBadgesProps) {
  return (
    <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={1250}>
      <View style={profileStyles.sectionContainer}>
        <TouchableOpacity
          style={profileStyles.sectionHeader}
          onPress={onOpenAll}
          activeOpacity={0.7}
        >
          <Typography family="onest" size={20} weight="600" color="onyx">
            Monthly Badges
          </Typography>
          <Ionicons name="chevron-forward" size={22} color={colors.concreteGrey} />
        </TouchableOpacity>

        <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24 }} contentContainerStyle={[profileStyles.badgeRow, { paddingHorizontal: 24 }]}>
          {badges.map((badge) => (
            <View key={badge.id} style={profileStyles.badgeItem}>
              <LiftPressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onPreviewBadge({
                    month: badge.month,
                    label: badge.display_text,
                    earned: badge.earned,
                    image: getBadgeImage(badge.imagePath),
                  });
                }}
              >
                <GrayscaleImage
                  source={getBadgeImage(badge.imagePath)}
                  style={profileStyles.badgeImage}
                  width={92}
                  height={92}
                  resizeMode="contain"
                  grayscale={!badge.earned}
                />
              </LiftPressable>
              <MonthPill
                label={badge.display_text}
                earned={badge.earned}
                onPress={() => onSelectMonth(badge.month)}
              />
            </View>
          ))}
        </Animated.ScrollView>
      </View>
    </AnimatedEntrance>
  );
}

export const ProfileMonthlyBadges = React.memo(ProfileMonthlyBadgesImpl);
