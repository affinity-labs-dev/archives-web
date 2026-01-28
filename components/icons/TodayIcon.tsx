// TodayIcon.tsx - Custom SVG Icon for Today Tab
import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'

interface TodayIconProps {
  size?: number
  color?: string
}

export default function TodayIcon({ size = 24, color = "#1f1f1f" }: TodayIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
    >
      {/* Center circle */}
      <Circle cx="12" cy="12" r="4" />

      {/* Top ray */}
      <Path d="M12 0 L12 4" stroke={color} strokeWidth="2" strokeLinecap="round" />

      {/* Top-right ray */}
      <Path d="M17.66 3.51 L15.24 5.93" stroke={color} strokeWidth="2" strokeLinecap="round" />

      {/* Right ray */}
      <Path d="M24 12 L20 12" stroke={color} strokeWidth="2" strokeLinecap="round" />

      {/* Bottom-right ray */}
      <Path d="M17.66 20.49 L15.24 18.07" stroke={color} strokeWidth="2" strokeLinecap="round" />

      {/* Bottom ray */}
      <Path d="M12 24 L12 20" stroke={color} strokeWidth="2" strokeLinecap="round" />

      {/* Bottom-left ray */}
      <Path d="M6.34 20.49 L8.76 18.07" stroke={color} strokeWidth="2" strokeLinecap="round" />

      {/* Left ray */}
      <Path d="M0 12 L4 12" stroke={color} strokeWidth="2" strokeLinecap="round" />

      {/* Top-left ray */}
      <Path d="M6.34 3.51 L8.76 5.93" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}
