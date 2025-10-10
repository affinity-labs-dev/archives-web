import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import ArchivesTheme from '@/constants/ArchivesTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AVATAR_SIZE = 200;

interface AvatarUnlockAnimationProps {
  visible: boolean;
  avatarImage: any; // require() image source
  avatarName: string;
  onComplete: () => void;
}

export default function AvatarUnlockAnimation({
  visible,
  avatarImage,
  avatarName,
  onComplete,
}: AvatarUnlockAnimationProps) {
  // Animation values
  const opacity = useSharedValue(0.3); // Start greyed out
  const shinePosition = useSharedValue(-AVATAR_SIZE); // Shine starts off-screen left
  const crackOpacity = useSharedValue(0);
  const crackScale = useSharedValue(0);
  const avatarScale = useSharedValue(0.8);
  const backgroundOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Haptic feedback on start
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Fade in background
      backgroundOpacity.value = withTiming(1, { duration: 300 });

      // Scale up avatar
      avatarScale.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });

      // Sequence: Shine → Crack → Opacity removal
      setTimeout(() => {
        // 1. Shine effect sweeps across
        shinePosition.value = withTiming(AVATAR_SIZE * 2, {
          duration: 800,
          easing: Easing.inOut(Easing.ease),
        });

        // Haptic for shine
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 400);

      setTimeout(() => {
        // 2. Crack appears
        crackOpacity.value = withTiming(1, { duration: 200 });
        crackScale.value = withSequence(
          withTiming(1.2, { duration: 150, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 150, easing: Easing.in(Easing.cubic) })
        );

        // Haptic for crack
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 1200);

      setTimeout(() => {
        // 3. Remove opacity to reveal colorful avatar
        opacity.value = withTiming(1, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        });

        // Haptic for reveal
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 1600);

      setTimeout(() => {
        // 4. Fade out crack
        crackOpacity.value = withTiming(0, { duration: 400 });
      }, 2200);

      setTimeout(() => {
        // 5. Complete animation
        backgroundOpacity.value = withTiming(0, {
          duration: 400,
          easing: Easing.in(Easing.ease),
        });

        // Call onComplete after fade out
        setTimeout(() => {
          runOnJS(onComplete)();
        }, 400);
      }, 2800);
    }
  }, [visible]);

  // Animated styles
  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const avatarContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const avatarStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shinePosition.value }],
  }));

  const crackStyle = useAnimatedStyle(() => ({
    opacity: crackOpacity.value,
    transform: [{ scale: crackScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.container, backgroundStyle]}>
        <Animated.View style={[styles.avatarContainer, avatarContainerStyle]}>
          {/* Avatar with opacity effect */}
          <Animated.View style={[styles.avatar, avatarStyle]}>
            <Image source={avatarImage} style={styles.avatarImage} />
          </Animated.View>

          {/* Shine effect */}
          <Animated.View style={[styles.shineContainer, shineStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shine}
            />
          </Animated.View>

          {/* Crack overlay */}
          <Animated.View style={[styles.crackContainer, crackStyle]}>
            {/* Vertical cracks */}
            <View style={[styles.crack, styles.crackVertical1]} />
            <View style={[styles.crack, styles.crackVertical2]} />
            <View style={[styles.crack, styles.crackVertical3]} />
            {/* Horizontal cracks */}
            <View style={[styles.crack, styles.crackHorizontal1]} />
            <View style={[styles.crack, styles.crackHorizontal2]} />
            {/* Diagonal cracks */}
            <View style={[styles.crack, styles.crackDiagonal1]} />
            <View style={[styles.crack, styles.crackDiagonal2]} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    position: 'relative',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR_SIZE / 2,
  },
  shineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: AVATAR_SIZE / 2,
    height: AVATAR_SIZE,
  },
  shine: {
    width: '100%',
    height: '100%',
  },
  crackContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crack: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  // Vertical cracks
  crackVertical1: {
    width: 2,
    height: AVATAR_SIZE * 0.6,
    left: AVATAR_SIZE * 0.3,
    top: AVATAR_SIZE * 0.2,
  },
  crackVertical2: {
    width: 2,
    height: AVATAR_SIZE * 0.7,
    left: AVATAR_SIZE * 0.5,
    top: AVATAR_SIZE * 0.15,
  },
  crackVertical3: {
    width: 2,
    height: AVATAR_SIZE * 0.5,
    left: AVATAR_SIZE * 0.7,
    top: AVATAR_SIZE * 0.25,
  },
  // Horizontal cracks
  crackHorizontal1: {
    width: AVATAR_SIZE * 0.6,
    height: 2,
    left: AVATAR_SIZE * 0.2,
    top: AVATAR_SIZE * 0.4,
  },
  crackHorizontal2: {
    width: AVATAR_SIZE * 0.5,
    height: 2,
    left: AVATAR_SIZE * 0.3,
    top: AVATAR_SIZE * 0.6,
  },
  // Diagonal cracks
  crackDiagonal1: {
    width: AVATAR_SIZE * 0.7,
    height: 2,
    left: AVATAR_SIZE * 0.15,
    top: AVATAR_SIZE * 0.3,
    transform: [{ rotate: '45deg' }],
  },
  crackDiagonal2: {
    width: AVATAR_SIZE * 0.6,
    height: 2,
    left: AVATAR_SIZE * 0.25,
    top: AVATAR_SIZE * 0.5,
    transform: [{ rotate: '-45deg' }],
  },
});
