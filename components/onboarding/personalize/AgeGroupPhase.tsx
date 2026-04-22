import React from 'react';
import { View, StyleSheet } from 'react-native';

import {
  Typography,
  DepthButton,
  OptionList,
  spacing,
} from '@/components/ui';
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

          <View style={styles.optionsList}>
            <OptionList
              options={AGE_OPTIONS}
              selectionMode="single"
              value={ageGroup}
              onChange={handleChange}
              exitSignal={exitSignal}
              animateIn
            />
          </View>
        </View>
      )}

      <View style={styles.flex} />

      {typewriterDone && (
        <AnimatedEntrance preset="slideFromBottom" delay={CONTINUE_DELAY_AFTER_TYPEWRITER}>
          <View style={styles.bottom}>
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
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  optionsList: {
    minHeight: 320,
  },
  flex: { flex: 1 },
  bottom: { paddingBottom: spacing.lg },
});
