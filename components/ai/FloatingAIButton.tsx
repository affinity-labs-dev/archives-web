// FloatingAIButton.tsx - Draggable floating AI button
import React, { useRef } from 'react';
import { StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { PanGestureHandler, TapGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ArchivesTheme from '@/constants/ArchivesTheme';

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
            <Ionicons name="chatbubble-ellipses" size={28} color="white" />
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
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: ArchivesTheme.colors.persianOrange,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
