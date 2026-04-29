// Eras tab header — "Choose Your Era" + subtitle.
// Entrance timeline matches Downloads/04 eras/index.html → enterEras():
//   • title    — riseSoft   @ 100ms
//   • subtitle — riseSubtle @ 220ms

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { spacing } from '@/components/ui/theme';

export const ERAS_HEADER_DELAY = {
  TITLE: 100,
  SUBTITLE: 220,
} as const;

const EraSelectionHeader: React.FC = () => {
  return (
    <View style={styles.container}>
      <AnimatedEntrance preset="riseSoft" delay={ERAS_HEADER_DELAY.TITLE}>
        <Typography family="onest" size={28} weight="700" color="onyx">
          Choose Your Era
        </Typography>
      </AnimatedEntrance>
      <AnimatedEntrance preset="riseSubtle" delay={ERAS_HEADER_DELAY.SUBTITLE}>
        <Typography variant="body.m" color="acaiPrimary" weight="600">
          Begin your journey through Islamic history
        </Typography>
      </AnimatedEntrance>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
});

export default EraSelectionHeader;
