// FloatingAIButton.tsx - Draggable floating AI button (Batuta - AI Assistant)
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const IbnIcon = require('@/assets/images/ai-images/Ibn.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MARGIN = 20;
const BUTTON_SIZE = 60;

const INITIAL_X = SCREEN_WIDTH - BUTTON_SIZE - MARGIN;
const INITIAL_Y = SCREEN_HEIGHT - BUTTON_SIZE - MARGIN - 100;

interface FloatingAIButtonProps {
  onPress: () => void;
}

export default function FloatingAIButton({ onPress }: FloatingAIButtonProps) {
  const translateX = useSharedValue(INITIAL_X);
  const translateY = useSharedValue(INITIAL_Y);
  const scale = useSharedValue(1);

  // Store the starting position when drag begins
  const startX = useSharedValue(INITIAL_X);
  const startY = useSharedValue(INITIAL_Y);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    Haptics.impactAsync(style);
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      console.log('🔵 [FloatingAIButton] Pan gesture started');
      // Capture current position when drag starts
      startX.value = translateX.value;
      startY.value = translateY.value;
      console.log('📍 [FloatingAIButton] Start position:', { x: startX.value, y: startY.value });
      runOnJS(triggerHaptic)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((event) => {
      // Update position during drag
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
      console.log('🔄 [FloatingAIButton] Dragging:', {
        x: translateX.value,
        y: translateY.value,
        translationX: event.translationX,
        translationY: event.translationY
      });
    })
    .onEnd((event) => {
      console.log('🔴 [FloatingAIButton] Pan gesture ended');
      // Calculate final position
      let finalX = startX.value + event.translationX;
      let finalY = startY.value + event.translationY;
      console.log('📍 [FloatingAIButton] Final position before clamp:', { x: finalX, y: finalY });

      // Clamp within bounds
      finalX = Math.max(MARGIN, Math.min(SCREEN_WIDTH - BUTTON_SIZE - MARGIN, finalX));
      finalY = Math.max(MARGIN, Math.min(SCREEN_HEIGHT - BUTTON_SIZE - MARGIN - 100, finalY));

      // Snap to left or right edge
      const snappedX = finalX > SCREEN_WIDTH / 2
        ? SCREEN_WIDTH - BUTTON_SIZE - MARGIN
        : MARGIN;

      console.log('📍 [FloatingAIButton] Snapping to:', { x: snappedX, y: finalY });

      // Animate to final snapped position
      translateX.value = withSpring(snappedX, { damping: 15, stiffness: 150 });
      translateY.value = withSpring(finalY, { damping: 15, stiffness: 150 });

      runOnJS(triggerHaptic)(Haptics.ImpactFeedbackStyle.Medium);
    });

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      console.log('👆 [FloatingAIButton] Tap gesture began');
      scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
    })
    .onEnd(() => {
      console.log('✅ [FloatingAIButton] Tap gesture ended - triggering onPress');
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      runOnJS(triggerHaptic)(Haptics.ImpactFeedbackStyle.Medium);
      runOnJS(onPress)();
    })
    .onFinalize(() => {
      console.log('🏁 [FloatingAIButton] Tap gesture finalized');
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    });

  // Combine gestures - tap and pan can work together
  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <Animated.View style={styles.button}>
          <Image
            source={IbnIcon}
            style={styles.icon}
            contentFit="contain"
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    zIndex: 9999,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
});
