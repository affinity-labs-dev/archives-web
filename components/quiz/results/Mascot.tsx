// Mascot — tier-keyed character render for QuizResults.
//   • Low (open-mouth Ibu, crying): standard 280×280 portrait box
//   • Medium (skating Ibu): full screen width, wide pose
//   • High (celebrating Ibu + sparkles): full width, SVG aspect-matched
//
// Tier 1/2 → Rive runtime (GPU-accelerated, built-in idle anims).
// Tier 3   → SvgXml (single-shot rasterization, no idle cost).
// Both wrapped with `renderToHardwareTextureAndroid` so the entrance
// translateY tween doesn't re-rasterize per frame on Android.

import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Rive, { Alignment, Fit } from 'rive-react-native';
import { SvgXml } from 'react-native-svg';

import { ibuScreen3Svg } from '../icons/ibuScreen3Svg';
import type { Tier } from './tiers';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const openMouthRive = require('@/assets/rive/open-mouth.riv');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ibuSkatingRive = require('@/assets/rive/ibu-skating.riv');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MASCOT_SIZE = Math.min(SCREEN_WIDTH * 0.9, 500);

export function Mascot({ tier }: { tier: Tier }) {
  const wrapStyle =
    tier === 'high'
      ? styles.mascotWrapHigh
      : tier === 'medium'
        ? styles.mascotWrapWide
        : styles.mascotWrap;

  if (tier === 'high') {
    return (
      <View
        renderToHardwareTextureAndroid
        collapsable={false}
        style={wrapStyle}
      >
        <SvgXml xml={ibuScreen3Svg} width="100%" height="100%" />
      </View>
    );
  }
  const source = tier === 'low' ? openMouthRive : ibuSkatingRive;
  return (
    <View
      renderToHardwareTextureAndroid
      collapsable={false}
      style={wrapStyle}
    >
      <Rive
        source={source}
        autoplay
        fit={Fit.Contain}
        alignment={Alignment.Center}
        style={styles.rive}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mascotWrap: {
    width: 280,
    height: 280,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tier 2: full-width skater. `marginHorizontal: -20` negates the
  // ScrollView padding so the canvas reaches edge-to-edge.
  mascotWrapWide: {
    width: SCREEN_WIDTH,
    height: MASCOT_SIZE - 55,
    marginHorizontal: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tier 3: SVG viewBox 358×243 — width-capped so corner stars stay in
  // their designed positions without horizontal stretching.
  mascotWrapHigh: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE - 60,
    marginHorizontal: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rive: {
    width: '100%',
    height: '100%',
  },
});
