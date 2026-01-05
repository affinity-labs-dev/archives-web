import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import ArchivesTheme from '@/constants/ArchivesTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NOTIFICATION_WIDTH = SCREEN_WIDTH - 40;

interface AvatarUnlockNotificationProps {
  visible: boolean;
  avatarImage: any; // require() image source
  avatarName: string;
  onComplete: () => void;
}

export default function AvatarUnlockNotification({
  visible,
  avatarImage,
  avatarName,
  onComplete,
}: AvatarUnlockNotificationProps) {
  // Animation values
  const translateY = useSharedValue(-200); // Start off-screen top
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Slide in from top with bounce
      translateY.value = withSpring(20, {
        damping: 15,
        stiffness: 100,
      });

      // Fade in
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });

      // Scale up
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 150,
      });

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        // Slide up and fade out
        translateY.value = withTiming(-200, {
          duration: 400,
          easing: Easing.in(Easing.ease),
        });
        opacity.value = withTiming(0, {
          duration: 400,
        });

        // Call onComplete after animation
        setTimeout(() => {
          runOnJS(onComplete)();
        }, 400);
      }, 3000);
    }
  }, [visible]);

  // Animated style
  const notificationStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, notificationStyle]}>
      <LinearGradient
        colors={[ArchivesTheme.colors.shoeBrown, '#3D2E24']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Avatar image */}
          <View style={styles.avatarContainer}>
            <Image source={avatarImage} style={styles.avatar} />
            <View style={styles.avatarBorder} />
          </View>

          {/* Text content */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>🎉 Avatar Unlocked!</Text>
            <Text style={styles.avatarName}>{avatarName}</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  gradient: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.persianOrange,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    marginRight: 16,
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: ArchivesTheme.colors.mossGreen,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'DM Sans Bold',
    fontSize: 16,
    color: ArchivesTheme.colors.creamWhite,
    marginBottom: 4,
  },
  avatarName: {
    fontFamily: 'Cormorant-Bold',
    fontSize: 20,
    color: ArchivesTheme.colors.persianOrange,
  },
});
