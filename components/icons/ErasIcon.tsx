// ErasIcon.tsx - Custom SVG Icon for Eras Tab
import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface ErasIconProps {
  size?: number
  color?: string
}

export default function ErasIcon({ size = 24, color = "#1f1f1f" }: ErasIconProps) {
  return (
    <Svg 
      width={size} 
      height={size} 
      viewBox="0 -960 960 960" 
      fill={color}
    >
      <Path d="M200-280v-280h80v280h-80Zm240 0v-280h80v280h-80ZM80-120v-80h800v80H80Zm600-160v-280h80v280h-80ZM80-640v-80l400-200 400 200v80H80Zm178-80h444-444Zm0 0h444L480-830 258-720Z" />
    </Svg>
  )
}