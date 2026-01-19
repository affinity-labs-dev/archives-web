// DailyQuestIcon.tsx - Custom SVG Icon for Daily Quest Tab
import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface DailyQuestIconProps {
  size?: number
  color?: string
}

export default function DailyQuestIcon({ size = 24, color = "#1f1f1f" }: DailyQuestIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      fill={color}
    >
      <Path d="m438-240 226-226-58-58-169 169-84-84-57 57 142 142ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h480q33 0 56.5 23.5T800-800v640q0 33-23.5 56.5T720-80H240Zm0-80h480v-640h-60v280l-100-60-100 60v-280H240v640Zm0 0v-640 640Zm220-360 100-60 100 60-100-60-100 60Z" />
    </Svg>
  )
}
