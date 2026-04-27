// 6 alternating purple wedges (30° on, 30° off pattern from the HTML
// mock's conic-gradient). Drawn as SVG paths inside a 2000×2000
// canvas; rotation is driven by an external sharedValue so the parent
// can chain it onto the entrance timeline.

import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import {
  SUNBURST_CENTER_X,
  SUNBURST_CENTER_Y,
  SUNBURST_DIAMETER,
  SUNBURST_RADIUS,
} from './constants';

const SUNBURST_FILL = 'rgba(180, 138, 255, 0.45)';

function wedgePath(startDeg: number, endDeg: number): string {
  // Convert to SVG coords: 0deg points up (-y), clockwise positive.
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const x1 = SUNBURST_RADIUS + SUNBURST_RADIUS * Math.cos(toRad(startDeg));
  const y1 = SUNBURST_RADIUS + SUNBURST_RADIUS * Math.sin(toRad(startDeg));
  const x2 = SUNBURST_RADIUS + SUNBURST_RADIUS * Math.cos(toRad(endDeg));
  const y2 = SUNBURST_RADIUS + SUNBURST_RADIUS * Math.sin(toRad(endDeg));
  // 30° wedge < 180° so largeArcFlag = 0; sweepFlag = 1 for clockwise.
  return `M${SUNBURST_RADIUS},${SUNBURST_RADIUS} L${x1},${y1} A${SUNBURST_RADIUS},${SUNBURST_RADIUS} 0 0 1 ${x2},${y2} Z`;
}

// 6 visible wedges centered at 0°, 60°, 120°, 180°, 240°, 300°.
const SUNBURST_WEDGES = [0, 60, 120, 180, 240, 300].map((center) => ({
  d: wedgePath(center - 15, center + 15),
}));

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
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sunburst,
        {
          left: SUNBURST_CENTER_X - SUNBURST_RADIUS,
          top: SUNBURST_CENTER_Y - SUNBURST_RADIUS,
        },
        animatedStyle,
      ]}
    >
      <Svg
        width={SUNBURST_DIAMETER}
        height={SUNBURST_DIAMETER}
        viewBox={`0 0 ${SUNBURST_DIAMETER} ${SUNBURST_DIAMETER}`}
      >
        {SUNBURST_WEDGES.map((w, i) => (
          <Path key={i} d={w.d} fill={SUNBURST_FILL} />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sunburst: {
    position: 'absolute',
    width: SUNBURST_DIAMETER,
    height: SUNBURST_DIAMETER,
  },
});
