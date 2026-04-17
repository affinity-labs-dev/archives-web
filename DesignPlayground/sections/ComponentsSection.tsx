import React from 'react';
import { View, Text, TextInput, StyleSheet, useWindowDimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors, spacing, borderRadius, shadows } from '../theme';
import { starsSvg, bookSvg, clockSvg } from '../assets/svgs';

// ─────────────────────────────────────────────
// Section Badge
// ─────────────────────────────────────────────

function SectionBadge({ label, description }: { label: string; description?: string }) {
  return (
    <View style={styles.sectionBadgeRow}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{label}</Text>
      </View>
      {description ? (
        <Text style={styles.badgeDescription}>{description}</Text>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────
// Card Variants
// ─────────────────────────────────────────────

function ElevatedCard() {
  return (
    <View style={[styles.card, styles.elevatedCard, shadows.medium]}>
      <Text style={styles.cardLabel}>Elevated</Text>
      <Text style={styles.cardTitle}>Card Title</Text>
      <Text style={styles.cardBody}>Card body content goes here.</Text>
    </View>
  );
}

function OutlinedCard() {
  return (
    <View style={[styles.card, styles.outlinedCard]}>
      <Text style={styles.cardLabel}>Outlined</Text>
      <Text style={styles.cardTitle}>Card Title</Text>
      <Text style={styles.cardBody}>Card body content goes here.</Text>
    </View>
  );
}

function FilledCard() {
  return (
    <View style={[styles.card, styles.filledCard]}>
      <Text style={styles.cardLabel}>Filled</Text>
      <Text style={[styles.cardTitle, { color: colors.acaiPrimary }]}>Card Title</Text>
      <Text style={[styles.cardBody, { color: colors.onyx }]}>Card body content goes here.</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// Review Card
// ─────────────────────────────────────────────

function ReviewCard() {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewName}>Hana</Text>
        <SvgXml xml={starsSvg} width={132} height={18} />
      </View>
      <Text style={styles.reviewBody}>
        My 6 year old daughter insists to sit with me on Archives, we love questioning each other even long after finishing each day{'\u2019'}s lesson
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// Stats Badges
// ─────────────────────────────────────────────

function StatsBadges() {
  return (
    <View style={styles.statsBadgesContainer}>
      {/* Left badge — dark blue */}
      <View style={styles.statsBadgeLeft}>
        <SvgXml xml={bookSvg} width={27} height={27} />
        <Text style={styles.statsBadgeLeftText}>3  Eras</Text>
      </View>
      {/* Right badge — light blue, overlaps left */}
      <View style={styles.statsBadgeRight}>
        <SvgXml xml={clockSvg} width={32} height={32} />
        <Text style={styles.statsBadgeRightText}>Less than 5 mins a day</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Components Section
// ─────────────────────────────────────────────

export default function ComponentsSection() {
  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < 500;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>COMPONENTS</Text>
        <Text style={styles.subtitle}>
          Reusable UI patterns built with the design system tokens.
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Cards */}
      <SectionBadge
        label="Cards"
        description="Surface containers with elevation, outline, or fill."
      />

      <View style={[styles.cardsRow, isNarrow && styles.cardsRowNarrow]}>
        <ElevatedCard />
        <OutlinedCard />
        <FilledCard />
      </View>

      <View style={styles.divider} />

      {/* Stats Badges */}
      <SectionBadge
        label="Stats Badges"
        description="Interlocking pill badges for key stats."
      />

      <StatsBadges />

      <View style={styles.divider} />

      {/* Review Card */}
      <SectionBadge
        label="Review Card"
        description="User testimonial card from Figma."
      />

      <ReviewCard />

      <View style={styles.divider} />

      {/* Inputs */}
      <SectionBadge
        label="Inputs"
        description="Text field variants for forms."
      />

      <View style={styles.inputGroup}>
        <View style={styles.inputMeta}>
          <Text style={styles.variantLabel}>Default</Text>
          <Text style={styles.variantDesc}>Neutral border, no focus ring.</Text>
        </View>
        <TextInput
          style={styles.inputDefault}
          placeholder="Enter your name"
          placeholderTextColor="#999999"
          editable={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputMeta}>
          <Text style={styles.variantLabel}>Focused</Text>
          <Text style={styles.variantDesc}>Blue border with subtle shadow.</Text>
        </View>
        <TextInput
          style={[styles.inputDefault, styles.inputFocused]}
          placeholder="Enter your name"
          placeholderTextColor="#999999"
          value="Ahmed"
          editable={false}
        />
      </View>

      <View style={styles.divider} />

      {/* Dividers */}
      <SectionBadge
        label="Dividers"
        description="Horizontal rules for content separation."
      />

      <View style={styles.dividerPreviewGroup}>
        <View style={styles.dividerPreviewRow}>
          <Text style={styles.dividerLabel}>Thin (1px)</Text>
          <View style={styles.dividerThin} />
        </View>

        <View style={styles.dividerPreviewRow}>
          <Text style={styles.dividerLabel}>Thick (2px)</Text>
          <View style={styles.dividerThick} />
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },

  // Header
  header: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.onyx,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B6B6B',
    lineHeight: 20,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
  },

  // Section Badge
  sectionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: spacing.sm,
  },
  badge: {
    backgroundColor: colors.bluePrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.14,
  },
  badgeDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
    flexShrink: 1,
  },

  // Cards
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cardsRowNarrow: {
    flexDirection: 'column',
  },
  card: {
    flex: 1,
    minWidth: 200,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  elevatedCard: {
    backgroundColor: '#FFFFFF',
  },
  outlinedCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
  },
  filledCard: {
    backgroundColor: colors.acaiTertiary,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xxs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onyx,
  },
  cardBody: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
    lineHeight: 20,
  },

  // Stats Badges
  statsBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 350,
    width: '100%',
    height: 50,
  },
  statsBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3C88',
    height: 50,
    paddingLeft: 9,
    paddingRight: 16,
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    gap: 12,
    zIndex: 1,
  },
  statsBadgeLeftText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: 0.22,
  },
  statsBadgeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A2C5FF',
    height: 50,
    flex: 1,
    marginLeft: -4,
    paddingLeft: 23,
    paddingRight: 16,
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
    gap: 11,
  },
  statsBadgeRightText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.14,
    lineHeight: 15,
    flexShrink: 1,
  },

  // Review Card
  reviewCard: {
    backgroundColor: colors.blueSecondary,
    borderRadius: 19,
    paddingTop: 11,
    paddingBottom: 13,
    paddingLeft: 20,
    paddingRight: 21,
    gap: 10,
    maxWidth: 358,
    width: '100%',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  reviewBody: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 22,
  },

  // Inputs
  inputGroup: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  inputMeta: {
    gap: 2,
  },
  variantLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onyx,
  },
  variantDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: '#737373',
  },
  inputDefault: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    height: 52,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontWeight: '500',
    color: colors.onyx,
  },
  inputFocused: {
    borderColor: colors.bluePrimary,
    shadowColor: colors.bluePrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },

  // Divider Previews
  dividerPreviewGroup: {
    gap: spacing.lg,
  },
  dividerPreviewRow: {
    gap: spacing.sm,
  },
  dividerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#737373',
  },
  dividerThin: {
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dividerThick: {
    height: 2,
    backgroundColor: '#E5E5E5',
  },
});
