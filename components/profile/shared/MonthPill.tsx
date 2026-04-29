import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radius } from '@/components/ui/theme';

interface MonthPillProps {
  label: string;
  earned: boolean;
  onPress: () => void;
}

export function MonthPill({ label, earned, onPress }: MonthPillProps) {
  return (
    <TouchableOpacity
      style={[
        pillStyles.pill,
        { backgroundColor: earned ? colors.bluePrimary : colors.concreteGrey },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Typography
        family="onest"
        size={13}
        weight="600"
        color={earned ? 'snow' : 'onyx'}
      >
        {label}
      </Typography>
    </TouchableOpacity>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
});
