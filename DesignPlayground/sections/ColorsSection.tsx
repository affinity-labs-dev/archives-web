import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { colorSwatches, buttonTokenRows, colors } from '../theme';

// ─────────────────────────────────────────────
// Color Swatch Card
// ─────────────────────────────────────────────

function ColorSwatch({ name, hex, token, description, cardWidth }: {
  name: string;
  hex: string;
  token: string;
  description?: string;
  cardWidth: number;
}) {
  const isLight = isLightColor(hex);

  return (
    <View style={[styles.swatchCard, { width: cardWidth }]}>
      <View style={[styles.swatchColor, { backgroundColor: hex }]}>
        <Text style={[styles.swatchHexOverlay, { color: isLight ? '#1A1A1A' : '#FFFFFF' }]}>
          {hex.toUpperCase()}
        </Text>
      </View>
      <View style={styles.swatchInfo}>
        <Text style={styles.swatchName}>{name}</Text>
        <Text style={styles.swatchToken}>{token}</Text>
        {description ? (
          <Text style={styles.swatchDescription}>{description}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Button Token Row
// ─────────────────────────────────────────────

function ButtonTokenRow({ tokenKey, hex, cssVar, scopes }: {
  tokenKey: string;
  hex: string;
  cssVar: string;
  scopes: string;
}) {
  return (
    <View style={styles.tokenRow}>
      <View style={[
        styles.tokenSwatch,
        {
          backgroundColor: hex === 'transparent' ? '#FFFFFF' : hex,
          borderWidth: hex === 'transparent' || hex === '#FFFFFF' ? 1 : 0,
          borderColor: '#E5E5E5',
        },
      ]} />
      <View style={styles.tokenInfo}>
        <Text style={styles.tokenKey}>{tokenKey}</Text>
        <Text style={styles.tokenScopes}>scopes: {scopes}</Text>
      </View>
      <View style={styles.tokenRight}>
        <Text style={styles.tokenHex}>{hex === 'transparent' ? 'transparent' : hex.toUpperCase()}</Text>
        <Text style={styles.tokenCssVar}>{cssVar}</Text>
      </View>
    </View>
  );
}

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
// Colors Section
// ─────────────────────────────────────────────

export default function ColorsSection() {
  const { width: screenWidth } = useWindowDimensions();
  // Calculate card width: fit as many ~160px cards as possible with 12px gaps
  // Account for container padding (24px each side = 48px total)
  const availableWidth = screenWidth - 48;
  const gap = 12;
  const columns = Math.max(1, Math.floor((availableWidth + gap) / (160 + gap)));
  const cardWidth = (availableWidth - (columns - 1) * gap) / columns;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>COLORS</Text>
        <Text style={styles.subtitle}>
          Palette and semantic tokens for developer handoff. Hex values are the authoritative source; use the suggested CSS var names to mirror the system in code.
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Palette Section */}
      <SectionBadge
        label="Palette"
        description="Brand, accent, neutral & semantic color roles."
      />

      {Object.entries(colorSwatches).map(([groupName, swatches]) => (
        <View key={groupName} style={styles.colorGroup}>
          <Text style={styles.groupLabel}>{groupName}</Text>
          <View style={styles.swatchRow}>
            {swatches.map((swatch) => (
              <ColorSwatch
                key={swatch.name}
                name={swatch.name}
                hex={swatch.hex}
                token={swatch.token}
                description={'description' in swatch ? swatch.description : undefined}
                cardWidth={cardWidth}
              />
            ))}
          </View>
        </View>
      ))}

      <View style={styles.divider} />

      {/* Semantic Tokens · Buttons */}
      <SectionBadge
        label="Semantic Tokens \u00B7 Buttons"
        description="Variables bound to button components. Use these keys in code."
      />

      {buttonTokenRows.map((btn) => (
        <View key={btn.name} style={styles.buttonGroup}>
          <View style={styles.buttonGroupHeader}>
            <Text style={styles.buttonGroupName}>{btn.name}</Text>
            <Text style={styles.buttonGroupDesc}>{btn.description}</Text>
          </View>
          {btn.tokens.map((token) => (
            <ButtonTokenRow
              key={token.key}
              tokenKey={token.key}
              hex={token.hex}
              cssVar={token.cssVar}
              scopes={token.scopes}
            />
          ))}
        </View>
      ))}

      <Text style={styles.footer}>
        Total: 15 paint styles {'\u00B7'} 13 button tokens.
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
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

  // Color Groups
  colorGroup: {
    gap: 12,
  },
  groupLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onyx,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // Swatch Card
  swatchCard: {
    minWidth: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  swatchColor: {
    height: 90,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 10,
  },
  swatchHexOverlay: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  swatchInfo: {
    padding: 12,
    gap: 3,
  },
  swatchName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onyx,
  },
  swatchToken: {
    fontSize: 11,
    fontWeight: '600',
    color: '#737373',
    letterSpacing: -0.11,
  },
  swatchDescription: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999999',
    lineHeight: 15,
    marginTop: 2,
  },

  // Button Token Groups
  buttonGroup: {
    gap: 8,
  },
  buttonGroupHeader: {
    gap: 2,
    marginBottom: 4,
  },
  buttonGroupName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onyx,
  },
  buttonGroupDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#737373',
  },

  // Token Row
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  tokenSwatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  tokenInfo: {
    flex: 1,
    gap: 2,
  },
  tokenKey: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onyx,
  },
  tokenScopes: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999999',
  },
  tokenRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  tokenHex: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onyx,
    fontVariant: ['tabular-nums'],
  },
  tokenCssVar: {
    fontSize: 11,
    fontWeight: '500',
    color: '#737373',
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
