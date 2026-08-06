/**
 * AccountAvatar — circular avatar with Clerk image priority and Google-style
 * color-hash + initial fallback.
 *
 * Fallback chain:
 *   1. `imageUrl` loads successfully → render <Image />.
 *   2. `imageUrl` is null / empty / fails to load → render colored circle with
 *      first letter of `firstName` (or `email` if name missing) in white.
 *
 * Background color is derived from a deterministic hash of the seed string
 * (`email`, falling back to `firstName`) so the same account always gets the
 * same color across renders and cold starts — matches the Google account
 * picker convention.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { colors } from '@/components/ui/theme';

// 8-color palette modeled on Google's account picker. Each has enough
// saturation/contrast that white text remains readable (WCAG AA at 17px bold).
const PALETTE: string[] = [
  '#1E88E5', // blue
  '#43A047', // green
  '#E53935', // red
  '#8E24AA', // purple
  '#FB8C00', // orange
  '#00ACC1', // teal
  '#6D4C41', // brown
  '#C2185B', // pink
];

export interface AccountAvatarProps {
  /** Remote avatar URL from Clerk (`user.imageUrl`). Null/undefined → fallback. */
  imageUrl?: string | null;
  /** Used for initial fallback and as primary hash seed after email. */
  firstName?: string | null;
  /** Primary hash seed — most stable unique string per account. */
  email?: string | null;
  /** Diameter in px. Default 48 (matches Figma welcome-back card). */
  size?: number;
  /** Override font size; defaults to ~45% of `size`. */
  initialFontSize?: number;
  style?: StyleProp<ViewStyle>;
}

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    // Standard djb2-ish accumulate; avoids bitwise ops so TypeScript is happy
    // and negative outputs from 32-bit rollover are sidestepped via Math.abs.
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickColor(seed: string): string {
  if (!seed) return PALETTE[0];
  return PALETTE[hashSeed(seed) % PALETTE.length];
}

function initialFrom(firstName?: string | null, email?: string | null): string {
  const source = (firstName?.trim() || email?.trim() || '?');
  return source.charAt(0).toUpperCase();
}

export function AccountAvatar({
  imageUrl,
  firstName,
  email,
  size = 48,
  initialFontSize,
  style,
}: AccountAvatarProps) {
  const [hasImageError, setHasImageError] = React.useState(false);
  const showImage = !!imageUrl && !hasImageError;
  // Prefer email as seed — more unique than firstName across common names.
  const seed = email || firstName || '';
  const background = pickColor(seed);
  const initial = initialFrom(firstName, email);
  const fontSize = initialFontSize ?? Math.round(size * 0.45);

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: showImage ? colors.border : background,
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      {showImage ? (
        <Image
          source={{ uri: imageUrl! }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <Text
          style={[styles.initial, { fontSize, lineHeight: fontSize * 1.1 }]}
          allowFontScaling={false}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    fontFamily: 'Onest-Bold',
    color: colors.white,
    textAlign: 'center',
  },
});
