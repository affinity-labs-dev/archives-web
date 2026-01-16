// GrayscaleImage.tsx - Wrapper component for displaying images in true black & white
import React from 'react';
import { Image, ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';
import Svg, { Defs, FeColorMatrix, Filter, Image as SvgImage } from 'react-native-svg';

interface GrayscaleImageProps {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  width: number;
  height: number;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  grayscale?: boolean; // If false, shows normal color image
}

export function GrayscaleImage({
  source,
  style,
  width,
  height,
  resizeMode = 'contain',
  grayscale = true,
}: GrayscaleImageProps) {
  // If grayscale is false, just return normal image
  if (!grayscale) {
    return <Image source={source} style={[style, { width, height }]} resizeMode={resizeMode} />;
  }

  // True grayscale using SVG color matrix filter
  // Matrix values: standard luminance formula (0.2126*R + 0.7152*G + 0.0722*B)
  return (
    <Svg width={width} height={height} style={style}>
      <Defs>
        <Filter id="grayscale">
          <FeColorMatrix
            type="matrix"
            values="0.2126 0.7152 0.0722 0 0
                    0.2126 0.7152 0.0722 0 0
                    0.2126 0.7152 0.0722 0 0
                    0      0      0      1 0"
          />
        </Filter>
      </Defs>
      <SvgImage
        width={width}
        height={height}
        href={source}
        preserveAspectRatio={resizeMode === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'}
        filter="url(#grayscale)"
      />
    </Svg>
  );
}
