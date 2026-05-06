import React from 'react';
import { View } from 'react-native';

export const MASCOT_SLOT_WIDTH = 110;
export const MASCOT_SLOT_HEIGHT = 96;

/**
 * Invisible spacer that reserves the layout space the persistent layout-level
 * Mascot floats over. Drop this in place of `<Mascot>` inside the screen's
 * `mascotRow` so the bubble's flex math stays unchanged.
 */
export function MascotSlot() {
  return <View style={{ width: MASCOT_SLOT_WIDTH, height: MASCOT_SLOT_HEIGHT }} />;
}
