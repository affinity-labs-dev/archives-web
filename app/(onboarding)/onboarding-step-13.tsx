import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Pressable,
  Text,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import { router } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';

import {
  Typography,
  DepthButton,
  colors,
  spacing,
  easings,
} from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { backArrowSvg } from '@/components/onboarding/icons/backArrowSvg';
import { markOnboardingPaywallSeen } from '@/services/PaywallGateService';
import { analyticsService } from '@/services/AnalyticsService';
import AppLogger from '@/services/AppLogger';

const mascotImg = require('@/assets/images/ibu-lay-down.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Aspen Gold backdrop covers ~64% of the screen (matches Figma 4220:8237 where
// yellow ends at y=544 of an 851-tall frame). The remaining bottom section is
// Snow (#FAFAFA). The mascot is sized off screen width and positioned to
// straddle the boundary: ~45% above, ~55% below.
const YELLOW_HEIGHT = SCREEN_HEIGHT * 0.64;
const MASCOT_SIZE = Math.min(SCREEN_WIDTH * 0.72, 264);
const MASCOT_TOP = YELLOW_HEIGHT - MASCOT_SIZE * 0.35;
const MASCOT_LEFT = -(MASCOT_SIZE * 0.25);

/**
 * Screen 15 — Free trial soft paywall (Figma 4220:8237).
 *
 * Two-tone background: Aspen Gold on top, Snow on the bottom. The reclining
 * "ibu-lay-down" mascot is anchored to overlap the yellow/snow boundary and
 * the SEE MY FREE OFFER CTA sits in the lower (white) area.
 *
 * Animation cadence is preserved from the prior version: header (0ms) → title
 * (500ms) → mascot (900ms) → CTA (1200ms). The eyebrow line was removed in the
 * new design.
 *
 * TEMP: CTA routes straight to /(tabs)/today. Replace with RevenueCat
 * paywall presentation when the real offering is wired up.
 */
export default function OnboardingStep15Screen() {
  const { user } = useUser();

  // Mark paywall-seen on MOUNT (not on CTA tap) so a force-quit mid-paywall
  // still counts as "already shown" next sign-in.
  useEffect(() => {
    analyticsService.trackPaywallViewed('onboarding_paywall', 'onboarding');
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    markOnboardingPaywallSeen(user.id).catch((err) => {
      AppLogger.warn('paywall', 'Mark onboarding paywall seen failed', {
        err: String(err),
      });
    });
  }, [user?.id]);

  const handleBack = () => {
    analyticsService.trackOnboardingBackTapped('soft_paywall');
    router.back();
  };

  const handleSeeOffer = () => {
    analyticsService.trackPaywallCtaTapped('see_free_offer');
    router.replace('/(tabs)/today' as never);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Yellow backdrop — fills the top portion only. Snow shows through below. */}
      <View style={styles.yellowBackdrop} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Minimal header — back arrow only */}
        <AnimatedEntrance
          preset={{
            translateY: { from: -20, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 300,
            easing: easings.power2Out,
          }}
        >
          <View style={styles.header}>
            <Pressable onPress={handleBack} hitSlop={16}>
              <SvgXml xml={backArrowSvg} width={18} height={22} />
            </Pressable>
          </View>
        </AnimatedEntrance>

        {/* Hero title — nested Text for inline acaiPrimary span */}
        <AnimatedEntrance
          preset={{
            translateY: { from: 40, to: 0 },
            opacity: { from: 0, to: 1 },
            scale: { from: 0.9, to: 1 },
            duration: 700,
            easing: easings.backOut17,
          }}
          delay={500}
          style={styles.titleWrapper}
        >
          <Text style={styles.heroTitle}>
            {'But we’d love for you to try '}
            <Text style={styles.heroTitleAcai}>Archives Plus</Text>
            {' for 7 days free too!'}
          </Text>
        </AnimatedEntrance>

        <View style={styles.spacer} />

        {/* CTA — anchored to screen bottom */}
        <AnimatedEntrance
          preset={{
            translateY: { from: 60, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 500,
            easing: easings.backOut2,
          }}
          delay={1200}
          style={styles.bottomBar}
        >
          <DepthButton
            surfaceColor="onyx"
            shadowColor="white"
            borderColor="onyx"
            onPress={handleSeeOffer}
          >
            <Typography variant="label.m" color="white">
              SEE MY FREE OFFER
            </Typography>
          </DepthButton>
        </AnimatedEntrance>
      </SafeAreaView>

      {/* Mascot overlay — absolutely positioned to straddle the yellow/snow
          boundary regardless of safe-area insets. */}
      <AnimatedEntrance
        preset={{
          scale: { from: 0.6, to: 1 },
          opacity: { from: 0, to: 1 },
          duration: 700,
          easing: easings.backOut17,
        }}
        delay={900}
        style={styles.mascotWrapper}
      >
        <Image source={mascotImg} style={styles.mascot} contentFit="contain" />
      </AnimatedEntrance>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.snow },
  safe: { flex: 1 },

  yellowBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: YELLOW_HEIGHT,
    backgroundColor: colors.aspenGold,
  },

  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    minHeight: 28,
    justifyContent: 'center',
  },

  titleWrapper: {
    marginTop: SCREEN_HEIGHT * 0.15,
    paddingHorizontal: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: 'Onest-Black',
    fontSize: 30,
    lineHeight: 36,
    color: colors.onyx,
    textAlign: 'center',
  },
  heroTitleAcai: {
    color: colors.acaiPrimary,
  },

  spacer: { flex: 1 },

  mascotWrapper: {
    position: 'absolute',
    left: MASCOT_LEFT,
    right: 0,
    top: MASCOT_TOP,
    alignItems: 'center',
  },
  mascot: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
  },

  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
});
