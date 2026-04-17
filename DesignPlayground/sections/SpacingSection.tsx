import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, shadows, colors } from '../theme';

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
// Spacing Bar Row
// ─────────────────────────────────────────────

function SpacingBar({ name, value }: { name: string; value: number }) {
  return (
    <View style={styles.spacingRow}>
      <View style={styles.spacingLabel}>
        <Text style={styles.spacingName}>{name}</Text>
        <Text style={styles.spacingValue}>{value}px</Text>
      </View>
      <View style={styles.spacingBarTrack}>
        <View style={[styles.spacingBar, { width: value }]} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Shadow Card
// ─────────────────────────────────────────────

function ShadowCard({ name, shadow }: { name: string; shadow: typeof shadows.small }) {
  return (
    <View style={[styles.shadowCard, shadow]}>
      <Text style={styles.shadowLabel}>{name}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// Spacing Section
// ─────────────────────────────────────────────

export default function SpacingSection() {
  const spacingEntries = Object.entries(spacing) as [keyof typeof spacing, number][];
  const shadowEntries = Object.entries(shadows) as [keyof typeof shadows, typeof shadows.small][];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SPACING & LAYOUT</Text>
        <Text style={styles.subtitle}>
          Spacing scale and elevation tokens.
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Spacing Scale */}
      <SectionBadge
        label="Spacing Scale"
        description="8px base unit, from xxs to xxxl."
      />

      <View style={styles.spacingGroup}>
        {spacingEntries.map(([name, value]) => (
          <SpacingBar key={name} name={name} value={value} />
        ))}
      </View>

      <View style={styles.divider} />

      {/* Shadows */}
      <SectionBadge
        label="Shadows"
        description="Elevation levels for layered surfaces."
      />

      <View style={styles.shadowGroup}>
        {shadowEntries.map(([name, shadow]) => (
          <ShadowCard key={name} name={name} shadow={shadow} />
        ))}
      </View>

      <Text style={styles.footer}>
        {spacingEntries.length} spacing tokens {'\u00B7'} {shadowEntries.length} shadow levels.
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 32,
  },

  // Header
  header: {
    gap: 8,
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
    paddingBottom: 8,
  },
  badge: {
    backgroundColor: '#1E3C88',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
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

  // Spacing Scale
  spacingGroup: {
    gap: 12,
  },
  spacingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  spacingLabel: {
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexShrink: 0,
  },
  spacingName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onyx,
  },
  spacingValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#737373',
    fontVariant: ['tabular-nums'],
  },
  spacingBarTrack: {
    flex: 1,
    height: 24,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    justifyContent: 'center',
  },
  spacingBar: {
    height: 24,
    backgroundColor: '#1E3C88',
    borderRadius: 4,
    minWidth: 2,
  },

  // Shadows
  shadowGroup: {
    gap: 16,
  },
  shadowCard: {
    width: '100%',
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shadowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onyx,
  },

  // Footer
  footer: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999999',
    textAlign: 'center',
    paddingTop: 8,
  },
});
