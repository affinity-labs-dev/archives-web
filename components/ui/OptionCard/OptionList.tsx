import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

import { OptionCard } from './OptionCard';
import type { OptionListProps } from './OptionCard.types';

/**
 * OptionList — orchestrates entrance stagger + selection state for a group of OptionCards.
 */
export function OptionList({
  options,
  selectionMode,
  value,
  onChange,
  exitSignal = false,
  animateIn = true,
  gap = 12,
}: OptionListProps) {
  const isSelected = useCallback(
    (id: string) => {
      if (selectionMode === 'single') return value === id;
      return Array.isArray(value) && value.includes(id);
    },
    [selectionMode, value],
  );

  const handlePress = useCallback(
    (id: string) => {
      if (selectionMode === 'single') {
        onChange(value === id ? null : id);
        return;
      }
      const current = Array.isArray(value) ? value : [];
      if (current.includes(id)) {
        onChange(current.filter((v) => v !== id));
      } else {
        onChange([...current, id]);
      }
    },
    [selectionMode, value, onChange],
  );

  return (
    <View style={[styles.container, { gap }]}>
      {options.map((option, index) => (
        <OptionCard
          key={option.id}
          label={option.label}
          isSelected={isSelected(option.id)}
          onPress={() => handlePress(option.id)}
          animationIndex={index}
          animateIn={animateIn}
          exitSignal={exitSignal}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
