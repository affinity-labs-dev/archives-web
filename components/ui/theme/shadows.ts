/**
 * Archives Design System — Shadow / elevation tokens
 *
 * Cross-platform-safe shadow objects. Apply directly in StyleSheet.
 */

import { colors } from './colors';

export const shadows = {
  none: {},
  small: {
    shadowColor: colors.onyx,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.onyx,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: colors.onyx,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export type ShadowKey = keyof typeof shadows;
