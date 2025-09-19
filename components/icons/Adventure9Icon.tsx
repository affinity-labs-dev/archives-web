// Adventure9Icon.tsx - Custom SVG Icon for Adventure 9 (Building the Community)
import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface Adventure9IconProps {
  size?: number
  color?: string
}

export default function Adventure9Icon({ size = 24, color = "#1f1f1f" }: Adventure9IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      fill={color}
    >
      {/* Buildings/community icon representing building the community */}
      <Path d="M120-120v-560q0-33 23.5-56.5T200-760h40v-80q0-33 23.5-56.5T320-920h320q33 0 56.5 23.5T720-840v280h40q33 0 56.5 23.5T840-480v360H520v-240h-80v240H120Zm80-80h160v-80H200v80Zm0-160h160v-80H200v80Zm0-160h160v-80H200v80Zm240 320h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 480h160v-80H600v80Zm0-160h160v-80H600v80Z"/>
    </Svg>
  )
}