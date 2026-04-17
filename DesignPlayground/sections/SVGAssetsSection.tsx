import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import { colors, spacing } from '../theme';
import { appleIconSvg, starsSvg, bookSvg, clockSvg } from '../assets/svgs';

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
// SVG Preview Card
// ─────────────────────────────────────────────

function SVGCard({ name, source, height, darkBg }: {
  name: string;
  source: any;
  height: number;
  darkBg?: boolean;
}) {
  return (
    <View style={styles.svgCard}>
      <View style={[styles.svgPreview, darkBg && styles.svgPreviewDark, { height }]}>
        <Image source={source} style={styles.svgImage} contentFit="contain" />
      </View>
      <View style={styles.svgInfo}>
        <Text style={styles.svgName}>{name}</Text>
      </View>
    </View>
  );
}

function IconCard({ name, xml, size, bgColor }: {
  name: string;
  xml: string;
  size: number;
  bgColor?: string;
}) {
  return (
    <View style={styles.iconCard}>
      <View style={[styles.iconPreview, { backgroundColor: bgColor || '#F0F0F0' }]}>
        <SvgXml xml={xml} width={size} height={size} />
      </View>
      <Text style={styles.iconName}>{name}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// SVG Assets Section
// ─────────────────────────────────────────────

export default function SVGAssetsSection() {
  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < 500;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SVG ASSETS</Text>
        <Text style={styles.subtitle}>
          All SVG icons and illustrations used in the design system.
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Illustrations */}
      <SectionBadge
        label="Illustrations"
        description="Onboarding and branding artwork."
      />

      <View style={[styles.illustrationGrid, isNarrow && styles.illustrationGridNarrow]}>
        <SVGCard name="welcome.svg" source={require('../assets/welcome.svg')} height={200} />
        <SVGCard name="onboardingicon.svg" source={require('../assets/onboardingicon.svg')} height={200} />
        <SVGCard name="learnislamic.svg" source={require('../assets/learnislamic.svg')} height={160} />
        <SVGCard name="sayhitoibu.svg" source={require('../assets/sayhitoibu.svg')} height={160} />
      </View>

      <View style={styles.divider} />

      {/* Decorative */}
      <SectionBadge
        label="Decorative"
        description="Lines and divider graphics."
      />

      <View style={styles.decorativeGrid}>
        <SVGCard name="line1.svg" source={require('../assets/line1.svg')} height={80} />
        <SVGCard name="line2.svg" source={require('../assets/line2.svg')} height={80} />
      </View>

      <View style={styles.divider} />

      {/* Icons */}
      <SectionBadge
        label="Icons"
        description="UI icons used in buttons and components."
      />

      <View style={styles.iconGrid}>
        <IconCard name="apple-icon" xml={appleIconSvg} size={24} bgColor="#1A1A1A" />
        <IconCard name="stars" xml={starsSvg} size={80} />
        <IconCard name="book" xml={bookSvg} size={24} bgColor="#1E3C88" />
        <IconCard name="clock" xml={clockSvg} size={28} />
      </View>
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

  // Illustration Grid
  illustrationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  illustrationGridNarrow: {
    flexDirection: 'column',
  },

  // SVG Card
  svgCard: {
    flex: 1,
    minWidth: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  svgPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F8F8F8',
  },
  svgPreviewDark: {
    backgroundColor: '#1A1A1A',
  },
  svgImage: {
    width: '100%',
    height: '100%',
  },
  svgInfo: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  svgName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onyx,
  },

  // Decorative Grid
  decorativeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  // Icon Grid
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconCard: {
    alignItems: 'center',
    gap: 8,
  },
  iconPreview: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#737373',
  },
});
