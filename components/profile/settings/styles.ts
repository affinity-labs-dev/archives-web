import { StyleSheet } from 'react-native';
import { colors, spacing } from '@/components/ui/theme';
import {
  CARD_BORDER_WIDTH,
  SETTINGS_CARD_HORIZONTAL_MARGIN,
  TOGGLE_BORDER_RADIUS,
  TOGGLE_HEIGHT,
  TOGGLE_KNOB_SIZE,
  TOGGLE_WIDTH,
} from './constants';

export const settingsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  closeButtonWrapper: {
    marginLeft: SETTINGS_CARD_HORIZONTAL_MARGIN,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: CARD_BORDER_WIDTH,
    borderColor: colors.bluePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  rowWrapper: {
    marginHorizontal: SETTINGS_CARD_HORIZONTAL_MARGIN,
    marginBottom: spacing.sm,
  },
  cardContainer: {
    position: 'relative',
  },
  cardShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    flex: 1,
  },
  textStack: {
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  togglePill: {
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    borderRadius: TOGGLE_BORDER_RADIUS,
    justifyContent: 'center',
    paddingLeft: 2.5,
  },
  toggleKnob: {
    width: TOGGLE_KNOB_SIZE,
    height: TOGGLE_KNOB_SIZE,
    borderRadius: TOGGLE_KNOB_SIZE / 2,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.bluePrimary,
    marginHorizontal: SETTINGS_CARD_HORIZONTAL_MARGIN,
    marginVertical: spacing.md,
  },
});
