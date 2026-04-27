/**
 * Tail geometry helpers — used by SpeechBubble to render a triangular tail
 * as a separate SVG overlay that does NOT depend on the bubble body's
 * measured size. Positioning is done via percentage on the parent.
 */

export type BubbleTailDirection = 'left' | 'right' | 'top' | 'bottom';

export interface TailGeometry {
  /** SVG canvas width in px. */
  svgWidth: number;
  /** SVG canvas height in px. */
  svgHeight: number;
  /** Points for the triangle fill (Polygon). */
  fillPoints: string;
  /** Points for the border along top + bottom slopes (Polyline) — excludes the attach edge. */
  strokePoints: string;
}

export interface TailGeometryInput {
  direction: BubbleTailDirection;
  /** Tail base length, px. */
  size: number;
  /** Tail depth (how far it protrudes), px. */
  depth: number;
  /** Bubble border width (tail fill overlaps into bubble by this much to cover border). */
  borderWidth: number;
}

/**
 * Build tail triangle geometry for an SVG overlay.
 *
 * The triangle fill extends `borderWidth + 1` px beyond the bubble edge into the
 * bubble's interior so the bubble's own native border is hidden where the tail
 * attaches — giving a seamless connection.
 *
 * Only the two non-attach slopes are stroked (as a Polyline), so the attachment
 * edge never shows a visible seam.
 */
export function buildTailGeometry({
  direction,
  size,
  depth,
  borderWidth,
}: TailGeometryInput): TailGeometry {
  // Overlap into the bubble to cover its border. +0.5 for subpixel safety.
  const overlap = borderWidth + 0.5;
  // Stroke pad so the polyline's stroke isn't clipped at canvas edges.
  const strokePad = borderWidth / 2 + 0.5;

  if (direction === 'left') {
    // Apex at (strokePad, size/2 + strokePad), base at x = depth + strokePad
    const svgWidth = depth + overlap + strokePad;
    const svgHeight = size + strokePad * 2;
    const apexX = strokePad;
    const apexY = size / 2 + strokePad;
    const baseX = depth + strokePad;
    const baseRightX = baseX + overlap;
    const topY = strokePad;
    const botY = size + strokePad;

    return {
      svgWidth,
      svgHeight,
      // Fill extends fully to baseRightX so it covers bubble's border.
      fillPoints: `${baseRightX},${topY} ${apexX},${apexY} ${baseRightX},${botY}`,
      // Stroke only the two slopes (top and bottom). Skip the attach edge entirely.
      strokePoints: `${baseX},${topY} ${apexX},${apexY} ${baseX},${botY}`,
    };
  }

  if (direction === 'right') {
    // Mirror of left
    const svgWidth = depth + overlap + strokePad;
    const svgHeight = size + strokePad * 2;
    const apexX = svgWidth - strokePad;
    const apexY = size / 2 + strokePad;
    const baseX = overlap;
    const baseLeftX = 0;
    const topY = strokePad;
    const botY = size + strokePad;

    return {
      svgWidth,
      svgHeight,
      fillPoints: `${baseLeftX},${topY} ${apexX},${apexY} ${baseLeftX},${botY}`,
      strokePoints: `${baseX},${topY} ${apexX},${apexY} ${baseX},${botY}`,
    };
  }

  if (direction === 'top') {
    const svgWidth = size + strokePad * 2;
    const svgHeight = depth + overlap + strokePad;
    const apexX = size / 2 + strokePad;
    const apexY = strokePad;
    const baseY = depth + strokePad;
    const baseBotY = baseY + overlap;
    const leftX = strokePad;
    const rightX = size + strokePad;

    return {
      svgWidth,
      svgHeight,
      fillPoints: `${leftX},${baseBotY} ${apexX},${apexY} ${rightX},${baseBotY}`,
      strokePoints: `${leftX},${baseY} ${apexX},${apexY} ${rightX},${baseY}`,
    };
  }

  // bottom
  const svgWidth = size + strokePad * 2;
  const svgHeight = depth + overlap + strokePad;
  const apexX = size / 2 + strokePad;
  const apexY = svgHeight - strokePad;
  const baseY = overlap;
  const baseTopY = 0;
  const leftX = strokePad;
  const rightX = size + strokePad;

  return {
    svgWidth,
    svgHeight,
    fillPoints: `${leftX},${baseTopY} ${apexX},${apexY} ${rightX},${baseTopY}`,
    strokePoints: `${leftX},${baseY} ${apexX},${apexY} ${rightX},${baseY}`,
  };
}
