import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { Easing } from 'react-native-reanimated';

import { AnimatedEntrance } from '@/components/ui/animations/AnimatedEntrance';
import { Typography } from '@/components/ui/Typography';
import { colors, easings } from '@/components/ui/theme';
import { getAvatarImage } from '../assetMaps';
import { profileStyles } from './styles';

interface ProfileAvatarSectionProps {
  shouldAnimate: boolean;
  currentAvatar: any;
  displayName: string;
  joinedYear: number;
  /** AnimatedStyle from useAvatarBreathe — applied to the inner image. */
  avatarAnimatedStyle: any;
  onOpenAvatarPicker: () => void;
}

function ProfileAvatarSectionImpl({
  shouldAnimate,
  currentAvatar,
  displayName,
  joinedYear,
  avatarAnimatedStyle,
  onOpenAvatarPicker,
}: ProfileAvatarSectionProps) {
  return (
    <View style={profileStyles.avatarSection}>
      <AnimatedEntrance
        preset={{
          scale: { from: 0.7, to: 1 },
          opacity: { from: 0, to: 1 },
          duration: 700,
          easing: easings.backOut17,
        }}
        delay={180}
      >
        <TouchableOpacity
          style={profileStyles.avatarRing}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenAvatarPicker();
          }}
          activeOpacity={0.85}
        >
          <AnimatedEntrance
            autoPlay={shouldAnimate}
            preset={{
              scale: { from: 0.6, to: 1 },
              opacity: { from: 0, to: 1 },
              duration: 600,
              easing: Easing.out(Easing.elastic(1.2)),
            }}
            delay={240}
          >
            <Animated.View style={avatarAnimatedStyle}>
              <Image
                source={getAvatarImage(currentAvatar?.image_url || '')}
                style={profileStyles.avatarImage}
              />
            </Animated.View>
          </AnimatedEntrance>
          <View style={profileStyles.editBadge}>
            <MaterialIcons name="edit" size={16} color={colors.white} />
          </View>
        </TouchableOpacity>
      </AnimatedEntrance>

      <AnimatedEntrance autoPlay={shouldAnimate} preset="fadeScale" delay={520}>
        <View style={profileStyles.identityBlock}>
          <Typography
            family="onest"
            size={24}
            weight="600"
            color="onyx"
            align="center"
            style={{ marginBottom: 8 }}
          >
            {displayName}
          </Typography>

          {currentAvatar && (
            <View style={profileStyles.identityPills}>
              <Typography family="onest" size={16} weight="500" color="bluePrimary">
                {currentAvatar.display_text || ''}
              </Typography>
              <View style={profileStyles.identityDot} />
              <Typography family="onest" size={16} weight="500" color="bluePrimary">
                {currentAvatar.subtitle || ''}
              </Typography>
            </View>
          )}

          <Typography family="onest" size={14} weight="500" color="onyx" align="center">
            {`Joined ${joinedYear}`}
          </Typography>
        </View>
      </AnimatedEntrance>
    </View>
  );
}

export const ProfileAvatarSection = React.memo(ProfileAvatarSectionImpl);
