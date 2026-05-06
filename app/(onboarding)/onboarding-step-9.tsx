import React, { useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  Typography,
  DepthButton,
  SpeechBubble,
  Typewriter,
  colors,
  spacing,
  easings,
} from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { Mascot } from '@/components/onboarding/Mascot/Mascot';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { toDisplayStep } from '@/constants/OnboardingRoutes';
import { requestPushNotificationPermission } from '@/services/PushNotificationService';
import { analyticsService } from '@/services/AnalyticsService';
import AppLogger from '@/services/AppLogger';

const TYPEWRITER_START_DELAY = 800;

/**
 * Screen 10 — Notification permission.
 *
 * Figma: 3710:5746. Asks the user to enable push reminders so daily-streak
 * prompts can fire. Reuses `requestPushNotificationPermission` from the
 * production service (same entry point as legacy onboarding-question-3) so
 * the Expo permission flow + Affinity device registration + Android channel
 * setup all stay in one place.
 *
 * Sequential phases:
 *   A. Mascot + bubble slide in from left (group)
 *   B. Typewriter reveals "Get a reminder to keep your streak going"
 *   C. After typewriter: quote scales in, attribution slides up, ENABLE
 *      button rises, Maybe later link fades in
 *
 * TODO Phase 2: when step-11 (Loading) exists, route both Enable + Maybe
 * later branches there instead of popping back.
 */
export default function OnboardingStep10Screen() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    analyticsService.trackOnboardingStepViewed('notification_permission');
  }, []);

  const goNext = () => {
    setStep(10);
    router.push('/onboarding-step-10' as never);
  };

  const handleEnable = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      AppLogger.info('notification', 'Onboarding step-10 ENABLE tapped');

      let permissionStatus: 'granted' | 'denied' | 'undetermined' = 'undetermined';
      try {
        const result = await requestPushNotificationPermission();
        if (result.status === 'Granted') permissionStatus = 'granted';
        else if (result.status === 'Denied') permissionStatus = 'denied';
      } catch (permError) {
        AppLogger.warn('notification', 'Permission request error (may be Expo Go)', {
          error: String(permError),
        });
      }

      analyticsService.trackPermissionRequested({
        permission_type: 'push_notifications',
        screen: 'onboarding_step_10',
        result: permissionStatus,
        platform: Platform.OS,
      });

      const event = {
        permission_type: 'push_notifications' as const,
        screen: 'onboarding_step_10',
        result: permissionStatus,
        platform: Platform.OS,
      };
      if (permissionStatus === 'granted') {
        analyticsService.trackPushNotificationsEnabled(event);
      } else {
        analyticsService.trackPushNotificationsDeclined(event);
      }

      goNext();
    } catch (error) {
      AppLogger.error('notification', 'Onboarding step-10 enable error', {}, error);
      goNext();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaybeLater = async () => {
    if (isSubmitting) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    AppLogger.info('notification', 'Onboarding step-10 MAYBE LATER tapped');

    analyticsService.trackPermissionRequested({
      permission_type: 'push_notifications',
      screen: 'onboarding_step_10',
      result: 'undetermined',
      platform: Platform.OS,
    });

    goNext();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <OnboardingHeader currentStep={toDisplayStep(9)} totalSteps={12} screenName="notification_permission" showSkip={false} />

        <View style={styles.body}>
          {/* Phase A — Mascot + bubble slide in as one unit */}
          <AnimatedEntrance preset="slideFromLeft" delay={100}>
            <View style={styles.mascotRow}>
              <Mascot width={110} height={96} autoPlayEntrance={false} />

              <View style={styles.bubbleWrapper}>
                <SpeechBubble
                  borderWidth={1.5}
                  autoPlay={false}
                  tail={{ direction: 'left', offset: 0.4, depth: 10, size: 14 }}
                  padding={spacing.md}
                >
                  {/* Phase B — typewriter starts after slide settles */}
                  <Typewriter
                    text="Get a reminder to keep your streak going"
                    variant="body.m"
                    color="onyx"
                    startDelay={TYPEWRITER_START_DELAY}
                    onComplete={() => setTypewriterDone(true)}
                  />
                </SpeechBubble>
              </View>
            </View>
          </AnimatedEntrance>

          {/* Phase C — quote + attribution after typewriter */}
          {typewriterDone && (
            <>
              <AnimatedEntrance
                preset={{
                  translateY: { from: 30, to: 0 },
                  opacity: { from: 0, to: 1 },
                  scale: { from: 0.95, to: 1 },
                  duration: 800,
                  easing: easings.power2Out,
                }}
                style={styles.quoteWrapper}
              >
                <Typography
                  size={20}
                  weight="600"
                  color="onyx"
                  align="center"
                  lineHeight={26}
                >
                  {'\u201CWhoever travels a path seeking knowledge, Allah makes easy their path to Paradise\u201D'}
                </Typography>
              </AnimatedEntrance>

              <AnimatedEntrance
                preset={{
                  translateY: { from: 20, to: 0 },
                  opacity: { from: 0, to: 1 },
                  duration: 600,
                  easing: easings.power2Out,
                }}
                delay={800}
                style={styles.attributionWrapper}
              >
                <Typography
                  family="bounded"
                  size={28}
                  lineHeight={32}
                  color="onyx"
                  align="center"
                  uppercase
                >
                  {'The Prophet\nMohammed \uFDFA'}
                </Typography>
              </AnimatedEntrance>
            </>
          )}

          <View style={styles.flex} />

          {/* CTA group — mounts after typewriter, staggered entrance */}
          {typewriterDone && (
            <View style={styles.bottomGroup}>
              <AnimatedEntrance
                preset="slideFromBottom"
                delay={1200}
                style={styles.enableWrapper}
              >
                <DepthButton
                  surfaceColor="onyx"
                  shadowColor="white"
                  borderColor="onyx"
                  onPress={handleEnable}
                  isDisabled={isSubmitting}
                >
                  <Typography variant="label.m" color="white">
                    ENABLE NOTIFICATIONS
                  </Typography>
                </DepthButton>
              </AnimatedEntrance>

              <AnimatedEntrance preset="fadeIn" delay={1500}>
                <Pressable onPress={handleMaybeLater} hitSlop={10} disabled={isSubmitting}>
                  <Typography
                    size={18}
                    weight="600"
                    color="onyx"
                    align="center"
                    style={styles.maybeLater}
                  >
                    Maybe later
                  </Typography>
                </Pressable>
              </AnimatedEntrance>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.snow },
  safe: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bubbleWrapper: {
    flex: 1,
    paddingTop: spacing.md,
  },
  quoteWrapper: {
    marginTop: 93,
    paddingHorizontal: spacing.md,
  },
  attributionWrapper: {
    marginTop: 87,
  },
  flex: { flex: 1, minHeight: spacing.xl },
  bottomGroup: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  enableWrapper: {
    width: '100%',
  },
  maybeLater: {
    textDecorationLine: 'underline',
  },
});
