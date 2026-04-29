// AdventureIcon — small 32×32 themed glyph used to the right of the
// adventure title. Renders the remote `iconUrl` if provided, falling back
// to a built-in landmark SVG. Memoized so it doesn't re-render on every
// parent change (icon URL is stable per adventure).

import React from 'react';
import { Image } from 'expo-image';
import Svg, { G, Mask, Path, Rect } from 'react-native-svg';

import { colors } from '@/components/ui/theme';

interface AdventureIconProps {
  iconUrl: string | null;
}

const AdventureIconComponent: React.FC<AdventureIconProps> = ({ iconUrl }) => {
  if (!iconUrl) {
    return (
      <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
        <Mask id="mask0_466_4368" maskUnits="userSpaceOnUse" x={0} y={0} width={32} height={32}>
          <Rect width={32} height={32} fill="#D9D9D9" />
        </Mask>
        <G mask="url(#mask0_466_4368)">
          <Path
            d="M8.04368 25.7777V19.7333H6.26602C5.95113 19.7333 5.68724 19.6264 5.47435 19.4127C5.26146 19.1991 5.15502 18.9343 5.15502 18.6183C5.15502 18.3023 5.26146 18.0388 5.47435 17.8277C5.68724 17.6166 5.95113 17.511 6.26602 17.511H8.11035C8.27346 15.711 8.97168 14.2018 10.205 12.9833C11.4383 11.7649 12.9995 11.0371 14.8883 10.8V5.111C14.8883 4.79633 14.9948 4.53245 15.2077 4.31933C15.4206 4.10645 15.6845 4 15.9993 4H22.8437C23.1586 4 23.4225 4.10645 23.6354 4.31933C23.8485 4.53245 23.955 4.79633 23.955 5.111V7.911C23.955 8.22589 23.8485 8.48978 23.6354 8.70267C23.4225 8.91578 23.1586 9.02233 22.8437 9.02233H17.1104V10.8C18.9992 11.0371 20.5604 11.7649 21.7937 12.9833C23.027 14.2018 23.7252 15.711 23.8883 17.511H25.7327C26.0476 17.511 26.3115 17.6179 26.5243 17.8317C26.7372 18.0454 26.8437 18.3102 26.8437 18.626C26.8437 18.942 26.7372 19.2056 26.5243 19.4167C26.3115 19.6278 26.0476 19.7333 25.7327 19.7333H23.955V25.7777H28.2217C28.5364 25.7777 28.8002 25.8846 29.0133 26.0983C29.2262 26.3121 29.3327 26.5769 29.3327 26.8927C29.3327 27.2087 29.2262 27.4722 29.0133 27.6833C28.8002 27.8944 28.5364 28 28.2217 28H3.77702C3.46235 28 3.19846 27.8931 2.98535 27.6793C2.77246 27.4658 2.66602 27.201 2.66602 26.885C2.66602 26.569 2.77246 26.3054 2.98535 26.0943C3.19846 25.8832 3.46235 25.7777 3.77702 25.7777H8.04368ZM10.266 25.7777H14.8883V19.7333H10.266V25.7777ZM17.1104 25.7777H21.7327V19.7333H17.1104V25.7777ZM10.3993 17.511H21.5993C21.4216 16.1703 20.8105 15.0722 19.766 14.2167C18.7216 13.3611 17.466 12.9333 15.9993 12.9333C14.5327 12.9333 13.2771 13.3611 12.2327 14.2167C11.1882 15.0722 10.5771 16.1703 10.3993 17.511Z"
            fill={colors.bluePrimary}
          />
        </G>
      </Svg>
    );
  }

  return (
    <Image
      source={{ uri: iconUrl }}
      style={{ width: 32, height: 32 }}
      contentFit="contain"
      tintColor={colors.bluePrimary}
    />
  );
};

export const AdventureIcon = React.memo(AdventureIconComponent);
