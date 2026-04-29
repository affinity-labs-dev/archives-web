// 6 alternating purple wedges (30° on, 30° off pattern from the HTML
// mock's conic-gradient). The wedge geometry was originally drawn with
// react-native-svg <Path> elements inside a 2000×2000 <Svg>; under a
// continuously-rotating parent transform, Skia on Android couldn't
// cache the path rasterization and re-rasterized 4M offscreen pixels
// every frame — major source of the device-old crash + lag we saw.
//
// Now: a SINGLE pre-rasterized PNG (1024×1024 transparent, six wedges
// baked in at the same fill colour). Rotation is a GPU matrix uniform
// on an Animated.Image — the bitmap is uploaded to a hardware texture
// once and reused for every frame. iOS already did this; Android now
// gets it explicitly via `renderToHardwareTextureAndroid`.
//
// We render the PNG at the SUNBURST_DIAMETER coordinate the constants
// expose (still 2000) so the on-screen coverage is unchanged — the
// upscale is a one-time bilinear filter, far cheaper than per-frame
// path rasterization.

import React from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import {
  SUNBURST_CENTER_X,
  SUNBURST_CENTER_Y,
  SUNBURST_DIAMETER,
  SUNBURST_RADIUS,
} from './constants';

// PNG export of the same six 30° wedges (rgba(180,138,255,0.45)) on a
// 1024×1024 transparent canvas. See `assets/images/celebrations/` for
// the bake script that produced it.
const SUNBURST_PNG = require('../../../../assets/images/celebrations/sunburst-purple.png');

interface SunburstProps {
  opacity: SharedValue<number>;
  rotation: SharedValue<number>;
}

export function Sunburst({ opacity, rotation }: SunburstProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return (
    // Animated wrapper drives the rotation; the Image inside stays
    // static. `renderToHardwareTextureAndroid` is a View-only prop, so
    // the wrapper is what gets baked to a GPU layer — and since the
    // Image isn't redrawing or relaying out, the wrapper's bitmap stays
    // valid across every rotation frame. iOS uses its own compositor
    // and ignores the prop.
    <Animated.View
      pointerEvents="none"
      renderToHardwareTextureAndroid
      style={[
        styles.sunburst,
        {
          left: SUNBURST_CENTER_X - SUNBURST_RADIUS,
          top: SUNBURST_CENTER_Y - SUNBURST_RADIUS,
        },
        animatedStyle,
      ]}
    >
      <Image
        source={SUNBURST_PNG}
        fadeDuration={0}
        resizeMode="stretch"
        style={styles.image}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sunburst: {
    position: 'absolute',
    width: SUNBURST_DIAMETER,
    height: SUNBURST_DIAMETER,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
