// Adventure7Icon.tsx - Custom SVG Icon for Adventure 7 (First Revelations)
import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface Adventure7IconProps {
  size?: number
  color?: string
}

export default function Adventure7Icon({ size = 24, color = "#1f1f1f" }: Adventure7IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      fill={color}
    >
      {/* Book/Scripture icon representing revelations */}
      <Path d="M240-80q-50 0-85-35t-35-85v-560q0-50 35-85t85-35h480q17 0 28.5 11.5T760-840q0 17-11.5 28.5T720-800H240q-17 0-28.5 11.5T200-760v560q0 17 11.5 28.5T240-160h480q17 0 28.5 11.5T760-120q0 17-11.5 28.5T720-80H240Zm40-200v-480h400v480H280Zm80-320h240q17 0 28.5-11.5T640-640q0-17-11.5-28.5T600-680H360q-17 0-28.5 11.5T320-640q0 17 11.5 28.5T360-600Zm0 80h240q17 0 28.5-11.5T640-560q0-17-11.5-28.5T600-600H360q-17 0-28.5 11.5T320-560q0 17 11.5 28.5T360-520Zm0 80h160q17 0 28.5-11.5T560-480q0-17-11.5-28.5T520-520H360q-17 0-28.5 11.5T320-480q0 17 11.5 28.5T360-440Z"/>
    </Svg>
  )
}