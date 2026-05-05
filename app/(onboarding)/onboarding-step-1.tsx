import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { Typography, DepthButton, colors, easings, spacing } from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';

/**
 * Screen 1 — Hero / Splash
 *
 * Layout: a single bottom-clustered content group floating on top of a
 * Ken Burns video background with dark gradient overlay. Badge icon sits
 * right above the title stack; subtitle + CTA follow.
 *
 * Figma reference: node 3282:7339
 */
export default function HeroScreen() {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  // Ken Burns: scale 1→1.18 and rotate 0→0.5° over 10s, loops forever.
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    rotate.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [scale, rotate]);

  const videoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const player = useVideoPlayer(
    require('@/assets/videos/archives_intro.mp4'),
    (p) => {
      p.loop = true;
      p.muted = true;
      p.play();
    },
  );

  const goNext = () => router.push('/onboarding-step-2' as never);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background video with Ken Burns */}
      <Animated.View style={[StyleSheet.absoluteFill, videoStyle]}>
        <VideoView
          style={StyleSheet.absoluteFill}
          player={player}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />
      </Animated.View>

      {/* Gradient overlay — darker at bottom for readability */}
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Empty header spacer (top safe area only) */}
        <View style={styles.spacer} />

        {/* Bottom cluster: badge → title → subtitle → CTA */}
        <View style={styles.bottomGroup}>
          {/* Top-1 badge */}
          <AnimatedEntrance preset="fadeIn" delay={200} duration={600}>
            <Image
              source={require('@/assets/images/top-1-icon.png')}
              style={styles.badge}
              contentFit="contain"
            />
          </AnimatedEntrance>

          {/* Title stack with tight line-height */}
          <View style={styles.titleStack}>
            <AnimatedEntrance
              preset={{
                translateY: { from: 50, to: 0 },
                opacity: { from: 0, to: 1 },
                duration: 800,
                easing: easings.power3Out,
              }}
              delay={300}
            >
              <Typography
                family="bounded"
                size={30}
                lineHeight={30}
                color="white"
                align="center"
                uppercase
              >
                LEARN ISLAMIC
              </Typography>
            </AnimatedEntrance>

            <AnimatedEntrance
              preset={{
                translateY: { from: 60, to: 0 },
                opacity: { from: 0, to: 1 },
                scale: { from: 0.95, to: 1 },
                duration: 900,
                easing: easings.backOut14,
              }}
              delay={500}
            >
              <Typography
                family="bounded"
                size={54}
                lineHeight={56}
                color="white"
                align="center"
                uppercase
              >
                HISTORY
              </Typography>
            </AnimatedEntrance>
          </View>

          {/* Subtitle */}
          <View style={styles.subtitleWrapper}>
            <AnimatedEntrance
              preset={{
                translateY: { from: 25, to: 0 },
                opacity: { from: 0, to: 1 },
                duration: 700,
                easing: easings.power2Out,
              }}
              delay={800}
            >
              <Typography
                size={16}
                weight="500"
                extraColor="#CECECE"
                align="center"
                lineHeight={22}
              >
                Join more than 50,000 explorers, start learning and connecting with your heritage
              </Typography>
            </AnimatedEntrance>
          </View>

          {/* CTA: light-blue surface on top, dark-blue shadow beneath, dark text */}
          <AnimatedEntrance
            preset={{
              translateY: { from: 40, to: 0 },
              opacity: { from: 0, to: 1 },
              duration: 600,
              easing: easings.backOut2,
            }}
            delay={1100}
            style={styles.ctaWrapper}
          >
            <DepthButton variant="tertiary-alt" onPress={goNext}>
              <Typography variant="label.m" color="onyx">
                LET&apos;S START
              </Typography>
            </DepthButton>
          </AnimatedEntrance>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.lg,
  },
  spacer: {
    flex: 1,
  },
  bottomGroup: {
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  badge: {
    width: 210,
    height: 97,
  },
  titleStack: {
    alignItems: 'center',
    gap: 2,
  },
  subtitleWrapper: {
    marginTop: spacing.xs,
  },
  ctaWrapper: {
    width: '100%',
    marginTop: spacing.xxxl,
  },
});
