import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

import {
  Typography,
  DepthButton,
  OptionList,
  ScrollFade,
  spacing,
} from '@/components/ui';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { AnimatedEntrance } from '@/components/ui/animations';
import {
  useOnboardingStore,
  type DailyGoalMinutes,
} from '@/stores/onboardingStore';

const DAILY_GOAL_OPTIONS: { id: string; label: string; minutes: DailyGoalMinutes }[] = [
  { id: '5', label: '5 min / day • Casual', minutes: 5 },
  { id: '10', label: '10 min / day • Regular', minutes: 10 },
  { id: '15', label: '15 min / day • Serious', minutes: 15 },
  { id: '20', label: '20 min / day • Intense', minutes: 20 },
];

const CONTINUE_DELAY_AFTER_TYPEWRITER = 900;

/**
 * Phase 11 body (daily goal single-select) — body-only, no mascot/bubble.
 *
 * Mascot + SpeechBubble + Typewriter live in the parent orchestrator so they
 * stay mounted across 11 ↔ 12 transitions. This component only owns the
 * subtitle, OptionList, and CONTINUE button — all gated on `typewriterDone`.
 *
 * `exitSignal` is forwarded to OptionList so it can run its left-slide
 * cascade when the orchestrator is transitioning out of this phase.
 */
export function DailyGoalPhase({
  typewriterDone,
  exitSignal,
  onNext,
}: {
  typewriterDone: boolean;
  exitSignal: boolean;
  onNext: () => void;
}) {
  const dailyGoalMinutes = useOnboardingStore((s) => s.dailyGoalMinutes);
  const setDailyGoal = useOnboardingStore((s) => s.setDailyGoal);

  const canContinue = dailyGoalMinutes !== null;

  const handleContinue = () => {
    if (!canContinue) return;
    onNext();
  };

  const handleChange = (val: string | string[] | null) => {
    if (typeof val === 'string') {
      const match = DAILY_GOAL_OPTIONS.find((o) => o.id === val);
      setDailyGoal(match ? match.minutes : null);
    } else {
      setDailyGoal(null);
    }
  };

  const selectedId = dailyGoalMinutes !== null ? String(dailyGoalMinutes) : null;

  return (
    <View style={styles.container}>
      {typewriterDone && (
        <View style={styles.optionsSection}>
          <AnimatedEntrance preset="slideFromRight">
            <Typography size="md" weight="600" color="onyx">
              This helps us personalize your plan.
            </Typography>
          </AnimatedEntrance>

          <ScrollView
            style={styles.optionsScroll}
            contentContainerStyle={styles.optionsScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <OptionList
              options={DAILY_GOAL_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
              selectionMode="single"
              value={selectedId}
              onChange={handleChange}
              exitSignal={exitSignal}
              animateIn
            />
          </ScrollView>
        </View>
      )}

      {typewriterDone && (
        <AnimatedEntrance preset="slideFromBottom" delay={CONTINUE_DELAY_AFTER_TYPEWRITER}>
          <View style={styles.bottom}>
            {/* Soft fade-out — masks the hard horizontal edge where
                the option list's last visible row meets the CONTINUE
                slot. Same pattern used by the quiz screen. */}
            <ScrollFade color={ArchivesTheme.colors.creamWhite} />
            <DepthButton
              surfaceColor="onyx"
              shadowColor="white"
              borderColor="onyx"
              onPress={handleContinue}
              isDisabled={!canContinue}
            >
              <Typography variant="label.m" color="white">
                CONTINUE
              </Typography>
            </DepthButton>
          </View>
        </AnimatedEntrance>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  optionsSection: {
    flex: 1,
    marginTop: spacing.xl,
    gap: spacing.md,
    minHeight: 0,
  },
  // Bleed to screen edges so the OptionList horizontal slide animations
  // aren't clipped at the parent body's spacing.lg padding.
  optionsScroll: {
    flex: 1,
    marginHorizontal: -spacing.lg,
  },
  optionsScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  bottom: { paddingBottom: spacing.lg },
});
