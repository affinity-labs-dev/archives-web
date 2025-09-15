// Adventure5Icon.tsx - Future Adventure Icon
// Custom SVG icon for Adventure 5 (placeholder for future content)

import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface Adventure5IconProps {
  size?: number;
  color?: string;
}

export default function Adventure5Icon({
  size = 24,
  color = "#C99151" // Default to Persian Orange
}: Adventure5IconProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Central star - representing future discoveries */}
        <Path
          d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"
          fill={color}
          opacity={0.7}
        />

        {/* Inner circle for detail */}
        <Circle
          cx="12"
          cy="12"
          r="4"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity={0.5}
        />

        {/* Decorative dots around the star */}
        <Circle cx="12" cy="5" r="1" fill={color} opacity={0.4} />
        <Circle cx="12" cy="19" r="1" fill={color} opacity={0.4} />
        <Circle cx="5" cy="12" r="1" fill={color} opacity={0.4} />
        <Circle cx="19" cy="12" r="1" fill={color} opacity={0.4} />
      </Svg>
    </View>
  );
}