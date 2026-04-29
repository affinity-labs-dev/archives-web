import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AnimatedEntrance } from '@/components/ui/animations/AnimatedEntrance';
import { Typography } from '@/components/ui/Typography';
import { colors } from '@/components/ui/theme';
import { profileStyles } from './styles';

interface ProfileHeaderProps {
  shouldAnimate: boolean;
  onOpenSettings: () => void;
}

export function ProfileHeader({ shouldAnimate, onOpenSettings }: ProfileHeaderProps) {
  return (
    <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={60}>
      <View style={profileStyles.header}>
        <Typography
          family="bounded"
          size={22}
          extraColor={colors.onyx}
          uppercase
        >
          Profile
        </Typography>
        <TouchableOpacity
          style={profileStyles.gearButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenSettings();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="settings-outline" size={24} color={colors.onyx} />
        </TouchableOpacity>
      </View>
    </AnimatedEntrance>
  );
}
