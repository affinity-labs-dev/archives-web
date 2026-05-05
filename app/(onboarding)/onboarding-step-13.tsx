import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Pressable, Text } from 'react-native';
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

const mascotImg = require('@/assets/images/ibu-teacher.png');

/**
 * Screen 15 — Free trial soft paywall.
 *
 * Figma: 3282:7420. Aspen Gold background, minimal header (back only, no
 * progress/skip since onboarding is effectively complete), eyebrow +
 * multi-line hero title with "Archives Plus" highlighted in acaiPrimary,
 * teacher mascot centered, and a SEE MY FREE OFFER CTA anchored to the
 * bottom — same position/size as step-14 GET STARTED so the flow doesn't
 * shift between screens.
 *
 * TEMP: CTA routes straight to /(tabs)/today. Replace with RevenueCat
 * paywall presentation when the real offering is wired up.
 */
export default function OnboardingStep15Screen() {
  const { user } = useUser();

  // Mark paywall-seen on MOUNT (not on CTA tap) so a force-quit mid-paywall
  // still counts as "already shown" next sign-in. Fail-safe behavior: if
  // `user?.id` isn't ready yet the effect re-runs when it is.
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

        <View style={styles.content}>
          {/* Eyebrow */}
          <AnimatedEntrance preset="fadeIn" delay={300}>
            <Typography size={20} weight="600" color="onyx" align="center">
              Archives is free to use
            </Typography>
          </AnimatedEntrance>

          {/* Hero title — nested Text for inline color span */}
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

          {/* Mascot */}
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

        {/* CTA — outside content flex so it anchors to screen bottom,
            matching step-14 GET STARTED positioning. */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.aspenGold },
  safe: { flex: 1 },

  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    minHeight: 28,
    justifyContent: 'center',
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    alignItems: 'center',
  },

  titleWrapper: {
    marginTop: spacing.xs,
    width: '100%',
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

  mascotWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  mascot: {
    width: 280,
    height: 280,
  },

  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
});
