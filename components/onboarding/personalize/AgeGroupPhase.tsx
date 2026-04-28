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
import { useOnboardingStore, type AgeGroup } from '@/stores/onboardingStore';

const AGE_OPTIONS: Array<{ id: AgeGroup; label: string }> = [
  { id: '13-17', label: '13-17' },
  { id: '18-24', label: '18-24' },
  { id: '25-34', label: '25-34' },
  { id: '35-44', label: '35-44' },
  { id: '45+', label: '45+' },
];

const CONTINUE_DELAY_AFTER_TYPEWRITER = 1000;

/**
 * Phase 12 body (age group single-select) — body-only, no mascot/bubble.
 * Mirrors DailyGoalPhase. See that file for the hoisting rationale.
 */
export function AgeGroupPhase({
  typewriterDone,
  exitSignal,
  onNext,
}: {
  typewriterDone: boolean;
  exitSignal: boolean;
  onNext: () => void;
}) {
  const ageGroup = useOnboardingStore((s) => s.ageGroup);
  const setAgeGroup = useOnboardingStore((s) => s.setAgeGroup);

  const canContinue = ageGroup !== null;

  const handleContinue = () => {
    if (!canContinue) return;
    onNext();
  };

  const handleChange = (val: string | string[] | null) => {
    if (typeof val === 'string') {
      setAgeGroup(val as AgeGroup);
    } else {
      setAgeGroup(null);
    }
  };

  return (
    <View style={styles.container}>
      {typewriterDone && (
        <View style={styles.optionsSection}>
          <AnimatedEntrance preset="slideFromRight">
            <Typography size="md" weight="600" color="onyx">
              This helps us tailor your experience.
            </Typography>
          </AnimatedEntrance>

          <ScrollView
            style={styles.optionsScroll}
            contentContainerStyle={styles.optionsScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <OptionList
              options={AGE_OPTIONS}
              selectionMode="single"
              value={ageGroup}
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
