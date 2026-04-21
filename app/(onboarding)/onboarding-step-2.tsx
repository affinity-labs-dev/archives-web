import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Rive, { Alignment, Fit } from 'rive-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  Typography,
  DepthButton,
  SpeechBubble,
  Typewriter,
  colors,
  easings,
  spacing,
} from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ibuJumpingRive = require('@/assets/rive/ibu-jumping.riv');
const TYPEWRITER_TEXT = "Hi! I'm Ibu — your guide through Islamic History";

export default function SayHiToIbuScreen() {
  const [typewriterDone, setTypewriterDone] = useState(false);

  // IBU bounce animation — phase 1: drop down, phase 2: scale-up pop, phase 3: settle back to 1
  const ibuTranslateY = useSharedValue(-120);
  const ibuScale = useSharedValue(0.95);
  const ibuOpacity = useSharedValue(0);

  useEffect(() => {
    // Phase 1 — Drop down + fade in + scale up to 1.1 (simultaneous, 500ms)
    ibuTranslateY.value = withDelay(200, withTiming(0, { duration: 500, easing: easings.power3Out }));
    ibuOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    ibuScale.value = withDelay(
      200,
      withSequence(
        withTiming(1.05, { duration: 500, easing: easings.power3Out }),
        // Phase 2 — Smooth settle from 1.1 back down to 1 (no elastic wobble)
        withTiming(1, { duration: 300, easing: easings.power2Out }),
      ),
    );
  }, [ibuTranslateY, ibuScale, ibuOpacity]);

  const ibuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ibuOpacity.value,
    transform: [
      { translateY: ibuTranslateY.value },
      { scale: ibuScale.value },
    ],
  }));

  const goNext = () => {
    router.push('/onboarding-step-3' as never);
  };
  const goToLogin = () => {
    // TODO Phase 2 Screen 7: wire to create-account / sign-in
    router.push('/(auth)/archives-auth' as never);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Title block — "SAY HI TO" on one line, "IBU" much larger below */}
        <View style={styles.titleWrapper}>
          <AnimatedEntrance
            preset={{
              translateY: { from: -100, to: 0 },
              opacity: { from: 0, to: 1 },
              duration: 700,
              easing: easings.backOut17,
            }}
            delay={0}
          >
            <Typography
              family="bounded"
              size={55}
              lineHeight={60}
              color="acaiDeep"
              align="center"
              letterSpacing={-2.2}
              uppercase
            >
              SAY HI TO
            </Typography>
          </AnimatedEntrance>

          <Animated.View style={ibuAnimatedStyle}>
            <Typography
              family="bounded"
              size={140}
              lineHeight={140}
              color="acaiDeep"
              align="center"
              letterSpacing={6}
              uppercase
            >
              IBU
            </Typography>
          </Animated.View>
        </View>

        {/* Bubble + mascot */}
        <View style={styles.middle}>
          <View style={styles.bubbleWrapper}>
            <AnimatedEntrance preset="bubblePop" delay={300}>
              <SpeechBubble
                borderWidth={1}
                autoPlay={false}
                fullWidth
                tail={{ direction: 'bottom', offset: 0.5, depth: 12, size: 20 }}
                padding={spacing.md}
              >
                <Typewriter
                  text={TYPEWRITER_TEXT}
                  variant="body.m"
                  color="onyx"
                  align="center"
                  startDelay={1100}
                  onComplete={() => setTypewriterDone(true)}
                />
              </SpeechBubble>
            </AnimatedEntrance>
          </View>

          <View style={styles.mascotWrapper}>
            <AnimatedEntrance
              preset={{
                scale: { from: 0.85, to: 1 },
                opacity: { from: 0, to: 1 },
                duration: 800,
                easing: Easing.out(Easing.elastic(0.6)),
              }}
              delay={300}
            >
              <Rive
                source={ibuJumpingRive}
                autoplay
                fit={Fit.Contain}
                alignment={Alignment.TopCenter}
                style={styles.rive}
              />
            </AnimatedEntrance>
          </View>
        </View>

        {/* Bottom CTA + account link — gated on typewriter completion */}
        <View style={styles.bottom}>
          {typewriterDone && (
            <>
              <AnimatedEntrance
                preset={{
                  translateY: { from: 30, to: 0 },
                  opacity: { from: 0, to: 1 },
                  duration: 500,
                  easing: easings.backOut15,
                }}
                delay={0}
                style={styles.buttonWrapper}
              >
                <DepthButton variant="primary" onPress={goNext}>
                  <Typography variant="label.m" color="white">
                    CONTINUE
                  </Typography>
                </DepthButton>
              </AnimatedEntrance>

              <AnimatedEntrance preset="fadeIn" delay={300} duration={400}>
                <Pressable onPress={goToLogin} hitSlop={10}>
                  <Typography
                    size={16}
                    weight="600"
                    color="onyx"
                    align="center"
                    style={styles.accountLink}
                  >
                    I already have an account
                  </Typography>
                </Pressable>
              </AnimatedEntrance>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.acaiTertiary,
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.lg, // 24 → matches Figma's 33px inner but with SafeArea adjustments
  },

  // Title
  titleWrapper: {
    alignItems: 'center',
    paddingTop: spacing.md,
    marginBottom: 65,
  },

  // Middle block — bubble + mascot
  middle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch', // Allow full-width bubble
    gap: spacing.xs,
  },
  bubbleWrapper: {
    width: '100%',
    maxWidth: 271,
    alignSelf: 'center',
  },
  mascotWrapper: {
    alignItems: 'center',
  },
  rive: {
    width: 300,
    height: 280,
    backgroundColor: 'transparent',
  },

  // Bottom — fixed height so layout doesn't jump when button mounts
  bottom: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    minHeight: 100,
  },
  buttonWrapper: {
    width: '100%',
  },
  accountLink: {
    textDecorationLine: 'underline',
  },
});
