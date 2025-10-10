import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import ArchivesTheme from '@/constants/ArchivesTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  color: string;
  startX: number;
  delay: number;
  duration: number;
  rotation: number;
  size: number;
}

interface ConfettiEffectProps {
  visible: boolean;
  onComplete?: () => void;
}

// Generate random confetti pieces
const generateConfetti = (count: number): ConfettiPiece[] => {
  const colors = [
    ArchivesTheme.colors.persianOrange,
    ArchivesTheme.colors.mossGreen,
    ArchivesTheme.colors.shoeBrown,
    '#FFD700', // Gold
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: colors[Math.floor(Math.random() * colors.length)],
    startX: Math.random() * SCREEN_WIDTH,
    delay: Math.random() * 200,
    duration: 2000 + Math.random() * 1000,
    rotation: Math.random() * 360,
    size: 8 + Math.random() * 8,
  }));
};

function AnimatedConfettiPiece({ piece, visible }: { piece: ConfettiPiece; visible: boolean }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Fall down with random horizontal drift
      translateY.value = withDelay(
        piece.delay,
        withTiming(SCREEN_HEIGHT + 100, {
          duration: piece.duration,
          easing: Easing.linear,
        })
      );

      // Horizontal drift
      translateX.value = withDelay(
        piece.delay,
        withRepeat(
          withSequence(
            withTiming(30, { duration: 500 }),
            withTiming(-30, { duration: 500 })
          ),
          -1,
          true
        )
      );

      // Rotation
      rotate.value = withDelay(
        piece.delay,
        withRepeat(
          withTiming(piece.rotation + 360, {
            duration: 1000,
            easing: Easing.linear,
          }),
          -1
        )
      );

      // Fade in then fade out near bottom
      opacity.value = withDelay(
        piece.delay,
        withSequence(
          withTiming(1, { duration: 300 }),
          withDelay(piece.duration - 600, withTiming(0, { duration: 300 }))
        )
      );
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          backgroundColor: piece.color,
          width: piece.size,
          height: piece.size,
          left: piece.startX,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function ConfettiEffect({ visible, onComplete }: ConfettiEffectProps) {
  const [confettiPieces] = React.useState(() => generateConfetti(50));

  useEffect(() => {
    if (visible) {
      // Celebration haptic
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 100);

      // Auto-complete after animation duration
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {confettiPieces.map((piece) => (
        <AnimatedConfettiPiece key={piece.id} piece={piece} visible={visible} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    zIndex: 9998, // Below notifications but above everything else
  },
  confettiPiece: {
    position: 'absolute',
    borderRadius: 4,
  },
});
