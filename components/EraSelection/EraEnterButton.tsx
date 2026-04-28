// Floating "ENTER ERA" CTA at the bottom of the eras tab.
// Entrance timeline: riseCta @ 1050ms (matches enterEras() pill-btn step).

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { DepthButton, Typography } from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { spacing } from '@/components/ui/theme';

export const ERAS_CTA_DELAY = 1050;

interface EraEnterButtonProps {
  onPress: () => void;
  disabled: boolean;
}

const EraEnterButton: React.FC<EraEnterButtonProps> = ({ onPress, disabled }) => {
  return (
    <AnimatedEntrance preset="riseCta" delay={ERAS_CTA_DELAY} style={styles.container}>
      <DepthButton
        variant="tertiary"
        size="medium"
        radius={26.5}
        pressEffect="dip"
        onPress={onPress}
        isDisabled={disabled}
        isFullWidth
      >
        <Typography
          family="onest"
          size={18}
          weight="700"
          color="white"
          letterSpacing={-0.18}
        >
          ENTER ERA
        </Typography>
      </DepthButton>
    </AnimatedEntrance>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: spacing.xl,
    right: spacing.xl,
  },
});

export default EraEnterButton;
