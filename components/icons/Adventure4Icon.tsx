// Adventure4Icon.tsx - Great Mosque of Damascus Icon
// Custom SVG icon for Adventure 4 (Byzantine mosaics theme)

import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

interface Adventure4IconProps {
  size?: number;
  color?: string;
}

export default function Adventure4Icon({
  size = 24,
  color = "#C99151" // Default to Persian Orange
}: Adventure4IconProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Mosque dome */}
        <Path
          d="M12 3L20 8V10C20 13.314 16.418 16 12 16C7.582 16 4 13.314 4 10V8L12 3Z"
          fill={color}
          opacity={0.8}
        />

        {/* Minaret */}
        <Rect
          x="10"
          y="1"
          width="4"
          height="6"
          fill={color}
          opacity={0.6}
        />

        {/* Mosaic pattern - small squares to represent Byzantine tiles */}
        <Rect x="8" y="9" width="1.5" height="1.5" fill="#4D392E" opacity={0.7} />
        <Rect x="10" y="9" width="1.5" height="1.5" fill="#C99151" opacity={0.7} />
        <Rect x="12" y="9" width="1.5" height="1.5" fill="#4D392E" opacity={0.7} />
        <Rect x="14" y="9" width="1.5" height="1.5" fill="#C99151" opacity={0.7} />

        <Rect x="9" y="11" width="1.5" height="1.5" fill="#C99151" opacity={0.7} />
        <Rect x="11" y="11" width="1.5" height="1.5" fill="#4D392E" opacity={0.7} />
        <Rect x="13" y="11" width="1.5" height="1.5" fill="#C99151" opacity={0.7} />

        {/* Base structure */}
        <Rect
          x="6"
          y="16"
          width="12"
          height="6"
          fill={color}
          opacity={0.5}
        />

        {/* Entrance archway */}
        <Path
          d="M10 22V18C10 17.448 10.448 17 11 17H13C13.552 17 14 17.448 14 18V22"
          fill="white"
          opacity={0.8}
        />
      </Svg>
    </View>
  );
}