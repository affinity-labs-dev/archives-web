import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { typographyRows, colors } from '../theme';

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
// Typography Row
// ─────────────────────────────────────────────

function TypographyRow({ name, spec, sample, style: typographyStyle }: {
  name: string;
  spec: string;
  sample: string;
  style: Record<string, unknown>;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < 400;

  return (
    <View style={[styles.typographyRow, isNarrow && styles.typographyRowNarrow]}>
      <View style={[styles.typographyMeta, isNarrow && styles.typographyMetaNarrow]}>
        <Text style={styles.typographyName}>{name}</Text>
        <Text style={styles.typographySpec}>{spec}</Text>
      </View>
      <View style={styles.typographySample}>
        <Text style={[styles.sampleText, typographyStyle as never]}>{sample}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Typography Section
// ─────────────────────────────────────────────

export default function TypographySection() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>TYPOGRAPHY</Text>
        <Text style={styles.subtitle}>
          Type scale built on Bounded for display and Onest for UI & body.
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Typography Sections */}
      {Object.entries(typographyRows).map(([sectionName, section]) => (
        <View key={sectionName} style={styles.section}>
          <SectionBadge
            label={sectionName}
            description={section.description}
          />
          {section.rows.map((row) => (
            <TypographyRow
              key={row.name}
              name={row.name}
              spec={row.spec}
              sample={row.sample}
              style={row.style}
            />
          ))}
        </View>
      ))}
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
    color: '#737373',
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
    paddingBottom: 16,
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

  // Section
  section: {
    gap: 0,
  },

  // Typography Row
  typographyRow: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  typographyRowNarrow: {
    flexDirection: 'column',
    gap: 8,
  },
  typographyMeta: {
    width: 140,
    gap: 4,
    flexShrink: 0,
  },
  typographyMetaNarrow: {
    width: '100%',
  },
  typographyName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onyx,
  },
  typographySpec: {
    fontSize: 12,
    fontWeight: '600',
    color: '#737373',
    letterSpacing: -0.12,
    lineHeight: 18,
  },
  typographySample: {
    flex: 1,
    justifyContent: 'center',
  },
  sampleText: {
    color: colors.onyx,
  },
});
