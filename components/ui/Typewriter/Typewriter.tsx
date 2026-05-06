import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { TypographyProps } from '@/components/ui/Typography/Typography.types';

import { useTypewriter } from './useTypewriter';

export interface TypewriterProps {
  text: string;
  speed?: number;
  cursorHideDelay?: number;
  onComplete?: () => void;
  autoStart?: boolean;
  /** Delay before typewriter starts (ms). Use to sync with parent entrance animations. */
  startDelay?: number;
  /** Soft per-character haptic tick. Default `true`. */
  haptics?: boolean;
  variant?: TypographyProps['variant'];
  color?: TypographyProps['color'];
  size?: TypographyProps['size'];
  weight?: TypographyProps['weight'];
  align?: TypographyProps['align'];
  style?: StyleProp<ViewStyle>;
}

/**
 * Typewriter — progressively reveals text with a blinking cursor.
 *
 * Uses Typography under the hood, so all variant / size / color props apply to both
 * the revealed text and the cursor caret.
 */
export function Typewriter({
  text,
  speed,
  cursorHideDelay,
  onComplete,
  autoStart = true,
  startDelay,
  haptics = true,
  variant = 'body.m',
  color,
  size,
  weight,
  align = 'left',
  style,
}: TypewriterProps) {
  const { displayText, showCursor } = useTypewriter({
    text,
    speed,
    cursorHideDelay,
    onComplete,
    autoStart,
    startDelay,
    haptics,
  });

  const cursorOpacity = useSharedValue(0);

  React.useEffect(() => {
    // When cursor is active: blink (opacity 1 ↔ 0 on loop).
    // When cursor hides: fade to 0 but keep the glyph in the text flow so the
    // bubble's layout doesn't shift (removing the `|` glyph from JSX would
    // shrink the last line and trigger a text rewrap — visible as the text
    // jumping from 4 lines to 3 lines after animations complete).
    if (showCursor) {
      cursorOpacity.value = 1;
      cursorOpacity.value = withRepeat(
        withTiming(0, { duration: 500 }),
        -1,
        true,
      );
    } else {
      cursorOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [showCursor, cursorOpacity]);

  const cursorAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  return (
    <View style={[styles.container, style]}>
      <Typography
        variant={variant}
        color={color}
        size={size}
        weight={weight}
        align={align}
      >
        {displayText}
        <Animated.Text style={cursorAnimatedStyle}>|</Animated.Text>
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
  },
});
