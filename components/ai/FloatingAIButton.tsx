// FloatingAIButton.tsx - Draggable floating AI button (Batuta - AI Assistant)
import React, { useRef } from 'react';
import { StyleSheet, Animated, Dimensions } from 'react-native';
import { PanGestureHandler, TapGestureHandler, State } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

// Ibn Battuta avatar image
const IbnIcon = require('@/assets/images/ai-images/Ibn.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MARGIN = 20;
const BUTTON_SIZE = 60;

interface FloatingAIButtonProps {
  onPress: () => void;
}

export default function FloatingAIButton({ onPress }: FloatingAIButtonProps) {
  const translateX = useRef(new Animated.Value(SCREEN_WIDTH - BUTTON_SIZE - MARGIN)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT - BUTTON_SIZE - MARGIN - 100)).current;
  const lastOffset = useRef({ x: SCREEN_WIDTH - BUTTON_SIZE - MARGIN, y: SCREEN_HEIGHT - BUTTON_SIZE - MARGIN - 100 });
  const scale = useRef(new Animated.Value(1)).current;

  const handlePanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handlePanStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.BEGAN) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (nativeEvent.state === State.END) {
      let finalX = lastOffset.current.x + nativeEvent.translationX;
      let finalY = lastOffset.current.y + nativeEvent.translationY;

      finalX = Math.max(MARGIN, Math.min(SCREEN_WIDTH - BUTTON_SIZE - MARGIN, finalX));
      finalY = Math.max(MARGIN, Math.min(SCREEN_HEIGHT - BUTTON_SIZE - MARGIN - 100, finalY));

      const snappedX = finalX > SCREEN_WIDTH / 2 ? SCREEN_WIDTH - BUTTON_SIZE - MARGIN : MARGIN;

      Animated.spring(translateX, { toValue: snappedX, useNativeDriver: true, tension: 100, friction: 10 }).start();
      Animated.spring(translateY, { toValue: finalY, useNativeDriver: true, tension: 100, friction: 10 }).start();

      lastOffset.current = { x: snappedX, y: finalY };
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleTapStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.BEGAN) {
      Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, tension: 300 }).start();
    }

    if (nativeEvent.state === State.END) {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300 }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }

    if (nativeEvent.state === State.CANCELLED || nativeEvent.state === State.FAILED) {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300 }).start();
    }
  };

  return (
    <PanGestureHandler onGestureEvent={handlePanGestureEvent} onHandlerStateChange={handlePanStateChange}>
      <Animated.View style={[styles.container, { transform: [{ translateX }, { translateY }, { scale }] }]}>
        <TapGestureHandler onHandlerStateChange={handleTapStateChange}>
          <Animated.View style={styles.button}>
            <Image
              source={IbnIcon}
              style={styles.icon}
              contentFit="contain"
            />
          </Animated.View>
        </TapGestureHandler>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
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
