// Adventure3Icon.tsx - Custom SVG Icon for Adventure 3
import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface Adventure3IconProps {
  size?: number
  color?: string
}

export default function Adventure3Icon({ size = 24, color = "#1f1f1f" }: Adventure3IconProps) {
  return (
    <Svg 
      width={size} 
      height={size} 
      viewBox="0 -960 960 960" 
      fill={color}
    >
      <Path d="m256-240-56-56 384-384H240v-80h480v480h-80v-344L256-240Z" />
    </Svg>
  )
}