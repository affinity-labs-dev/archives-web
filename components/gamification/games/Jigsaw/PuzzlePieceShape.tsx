// PuzzlePieceShape.tsx - SVG puzzle piece shape with tabs and blanks
// Creates authentic jigsaw puzzle piece shapes

import React from 'react';
import Svg, { Path, Defs, ClipPath } from 'react-native-svg';kk matur

export type EdgeType = 'flat' | 'tab-out' | 'tab-in';

interface PuzzlePieceShapeProps {
  size: number;
  edges: {
    top: EdgeType;
    right: EdgeType;
    bottom: EdgeType;
    left: EdgeType;
  };
  clipPathId: string;
}

export default function PuzzlePieceShape({ size, edges, clipPathId }: PuzzlePieceShapeProps) {
  // Tab dimensions (as percentage of piece size)
  const tabWidth = size * 0.25; // Width of tab
  const tabHeight = size * 0.15; // How far tab sticks out
  const tabCurve = size * 0.08; // Curve radius

  // Generate SVG path for puzzle piece
  const generatePath = (): string => {
    const { top, right, bottom, left } = edges;
    let path = '';

    // Start at top-left corner
    path += `M 0,0`;

    // TOP EDGE
    if (top === 'flat') {
      path += ` L ${size},0`;
    } else {
      const start = (size - tabWidth) / 2;
      const mid = size / 2;
      const end = (size + tabWidth) / 2;
      const direction = top === 'tab-out' ? -1 : 1;

      path += ` L ${start},0`;
      path += ` Q ${start},${direction * tabCurve} ${start},${direction * tabHeight}`;
      path += ` Q ${mid},${direction * (tabHeight + tabCurve)} ${end},${direction * tabHeight}`;
      path += ` Q ${end},${direction * tabCurve} ${end},0`;
      path += ` L ${size},0`;
    }

    // RIGHT EDGE
    if (right === 'flat') {
      path += ` L ${size},${size}`;
    } else {
      const start = (size - tabWidth) / 2;
      const mid = size / 2;
      const end = (size + tabWidth) / 2;
      const direction = right === 'tab-out' ? 1 : -1;

      path += ` L ${size},${start}`;
      path += ` Q ${size - direction * tabCurve},${start} ${size + direction * tabHeight},${start}`;
      path += ` Q ${size + direction * (tabHeight + tabCurve)},${mid} ${size + direction * tabHeight},${end}`;
      path += ` Q ${size - direction * tabCurve},${end} ${size},${end}`;
      path += ` L ${size},${size}`;
    }

    // BOTTOM EDGE
    if (bottom === 'flat') {
      path += ` L 0,${size}`;
    } else {
      const start = (size + tabWidth) / 2;
      const mid = size / 2;
      const end = (size - tabWidth) / 2;
      const direction = bottom === 'tab-out' ? 1 : -1;

      path += ` L ${start},${size}`;
      path += ` Q ${start},${size - direction * tabCurve} ${start},${size + direction * tabHeight}`;
      path += ` Q ${mid},${size + direction * (tabHeight + tabCurve)} ${end},${size + direction * tabHeight}`;
      path += ` Q ${end},${size - direction * tabCurve} ${end},${size}`;
      path += ` L 0,${size}`;
    }

    // LEFT EDGE
    if (left === 'flat') {
      path += ` L 0,0`;
    } else {
      const start = (size + tabWidth) / 2;
      const mid = size / 2;
      const end = (size - tabWidth) / 2;
      const direction = left === 'tab-out' ? -1 : 1;

      path += ` L 0,${start}`;
      path += ` Q ${direction * tabCurve},${start} ${direction * tabHeight},${start}`;
      path += ` Q ${direction * (tabHeight + tabCurve)},${mid} ${direction * tabHeight},${end}`;
      path += ` Q ${direction * tabCurve},${end} 0,${end}`;
      path += ` L 0,0`;
    }

    path += ` Z`; // Close path
    return path;
  };

  const pathData = generatePath();

  return (
    <Svg height={size} width={size} style={{ position: 'absolute' }}>
      <Defs>
        <ClipPath id={clipPathId}>
          <Path d={pathData} fill="white" />
        </ClipPath>
      </Defs>
      {/* Stroke for visual effect */}
      <Path
        d={pathData}
        fill="none"
        stroke="rgba(0,0,0,0.1)"
        strokeWidth={1}
      />
    </Svg>
  );
}
