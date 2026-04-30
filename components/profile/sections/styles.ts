import { StyleSheet } from 'react-native';
import { colors, radius, shadows, spacing } from '@/components/ui/theme';

export const HORIZONTAL_PADDING = spacing.lg;

export const profileStyles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: spacing.md,
  },
  gearButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: spacing.lg,
  },
  avatarRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 4,
    borderColor: colors.acaiSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: 155,
    height: 155,
    borderRadius: 77.5,
    resizeMode: 'contain' as const,
  },
  editBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.acaiSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },

  // Identity
  identityBlock: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  identityPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  identityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bluePrimary,
    opacity: 0.95,
  },

  // Stat tiles
  statSection: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  statRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 7,
  },
  statRowFull: {
    marginBottom: 6,
  },
  // Used by the special "TOP 2%" tile that doesn't go through StatTile
  staticRightTile: {
    flex: 1,
    height: 80,
    // paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
  },
  seeMoreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },

  // Sections shared
  sectionContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  // Monthly badges
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  badgeItem: {
    alignItems: 'center',
    width: 105,
    gap: 8,
  },
  badgeImage: {
    width: 92,
    height: 92,
  },

  // Achievements
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 12,
  },
  achievementItem: {
    alignItems: 'center',
    width: 105,
  },
  achievementIconWrap: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  achievementImage: {
    width: 92,
    height: 92,
  },

  // Learning Preferences
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.acaiTertiary,
    height: 57,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Sign out
  signOutContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: spacing.lg,
  },
});
