// Adventure8Icon.tsx - Custom SVG Icon for Adventure 8 (The Hijra)
import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface Adventure8IconProps {
  size?: number
  color?: string
}

export default function Adventure8Icon({ size = 24, color = "#1f1f1f" }: Adventure8IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      fill={color}
    >
      {/* Arrow right/journey icon representing migration */}
      <Path d="M647-440H160q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520h487L423-744q-12-12-11.5-28.5T424-801q12-12 28.5-12t28.5 12l263 263q6 6 8.5 13t2.5 15q0 8-2.5 15t-8.5 13L481-239q-12 12-28.5 12T424-239q-12-12-12-28.5t12-28.5l224-224Z"/>
    </Svg>
  )
}