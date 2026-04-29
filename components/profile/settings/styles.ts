import { StyleSheet } from 'react-native';
import { colors, radius, spacing } from '@/components/ui/theme';
import {
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
  androidBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  androidBackdropDismiss: {
    flex: 1,
  },
  androidSheet: {
    height: '90%',
    backgroundColor: colors.snow,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  swipeIndicator: {
    alignSelf: 'center',
    width: 70,
    height: 5,
    backgroundColor: colors.concreteGrey,
    borderRadius: 2.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  closeButtonWrapper: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollContent: {
    // Top padding leaves room for the absolutely-positioned close
    // button (~32px tall + spacing.md offset) so the first row doesn't
    // sit underneath it.
    gap: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: SETTINGS_CARD_HORIZONTAL_MARGIN,
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
  },
  rowGroup: {
    gap: 20,
  },
});
