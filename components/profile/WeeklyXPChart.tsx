import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors, safeDuration } from '@/components/ui/theme';
import { AnimatedEntrance } from '@/components/ui/animations';
import { Typography } from '@/components/ui';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface WeeklyXPChartProps {
  data: number[];
  totalXP: number;
}

// ─────────────────────────────────────────────
// Layout constants (relative to card width)
// Only vertical sizes remain as fixed pixels.
// ─────────────────────────────────────────────

const CARD_H = 245;

// Vertical positions (fixed — height is constant)
const HDR_H = 48;           // header row height
const PLOT_TOP = 66;
const PLOT_H = 120;
const XAXIS_TOP = 211;
const YAXIS_TOP = 52;
const YAXIS_LINE_H = 30;   // vertical spacing between Y labels

// Horizontal ratios (fraction of card width)
const PAD_H_RATIO = 0.06;       // header horizontal padding (~21px on 348)
const YAXIS_LEFT_RATIO = 0.057; // Y-axis label left edge (~20px on 348)
const YAXIS_W_RATIO = 0.072;    // Y-axis label width (~25px on 348)
const PLOT_LEFT_RATIO = 0.167;  // plot area left edge (~58px on 348)
const PLOT_RIGHT_PAD = 16;      // right padding inside card (px)

// Grid line Y offsets inside plot (0, 30, 60, 90, 119)
const GRID_LINES = [0, 30, 60, 90, 119];

const Y_MAX = 400;
const Y_LABELS = [400, 300, 200, 100, 0];
const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const GRID_COLOR = '#E0E5F0';
const LINE_COLOR = colors.bluePrimary;
const DOT_SIZE = 9;
const DOT_R = DOT_SIZE / 2;
const DOT_STROKE = 2;

const LINE_DRAW_MS = 900;
const DOT_STAGGER_MS = 110;
const DOT_FADE_MS = 250;
const PULSE_MS = 1800;

// ─────────────────────────────────────────────
// Animated wrappers
// ─────────────────────────────────────────────

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const DOT_INSET = 8; // px clearance so edge dots aren't clipped

function valuesToPoints(data: number[], plotW: number) {
  const usableW = plotW - DOT_INSET * 2;
  const step = usableW / 6;
  return data.map((val, i) => {
    const x = DOT_INSET + i * step;
    const clamped = Math.min(Math.max(val, 0), Y_MAX);
    const y = PLOT_H - (clamped / Y_MAX) * PLOT_H;
    return { x, y };
  });
}

function buildPath(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return { d: '', len: 0 };
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return { d, len };
}

// ─────────────────────────────────────────────
// Dot with optional pulse
// ─────────────────────────────────────────────

function Dot({ cx, cy, isToday, index }: { cx: number; cy: number; isToday: boolean; index: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const ringScale = useSharedValue(1);

  useEffect(() => {
    const delay = LINE_DRAW_MS * 0.3 + index * DOT_STAGGER_MS;
    opacity.value = withDelay(safeDuration(delay), withTiming(1, { duration: safeDuration(DOT_FADE_MS) }));
    scale.value = withDelay(safeDuration(delay), withTiming(1, { duration: safeDuration(DOT_FADE_MS), easing: Easing.out(Easing.back(1.5)) }));
    if (isToday) {
      // Pulsing ring — grows outward and fades, then resets
      const ringDelay = delay + DOT_FADE_MS;
      ringOpacity.value = withDelay(
        safeDuration(ringDelay),
        withRepeat(withSequence(
          withTiming(0.6, { duration: 0 }),
          withTiming(0, { duration: safeDuration(PULSE_MS), easing: Easing.out(Easing.ease) }),
        ), -1, false),
      );
      ringScale.value = withDelay(
        safeDuration(ringDelay),
        withRepeat(withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(2.5, { duration: safeDuration(PULSE_MS), easing: Easing.out(Easing.ease) }),
        ), -1, false),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dotProps = useAnimatedProps(() => ({
    opacity: opacity.value,
    r: DOT_R * scale.value,
  }));

  const ringProps = useAnimatedProps(() => ({
    opacity: ringOpacity.value,
    r: DOT_R * ringScale.value,
  }));

  return (
    <>
      {isToday && (
        <AnimatedCircle
          cx={cx}
          cy={cy}
          fill="none"
          stroke={LINE_COLOR}
          strokeWidth={1.5}
          animatedProps={ringProps}
        />
      )}
      <AnimatedCircle
        cx={cx}
        cy={cy}
        fill={isToday ? LINE_COLOR : '#FFFFFF'}
        stroke={LINE_COLOR}
        strokeWidth={DOT_STROKE}
        animatedProps={dotProps}
      />
    </>
  );
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export function WeeklyXPChart({ data, totalXP }: WeeklyXPChartProps) {
  const [cardWidth, setCardWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== cardWidth) setCardWidth(w);
  }, [cardWidth]);

  // Derived responsive dimensions
  const plotLeft = cardWidth * PLOT_LEFT_RATIO;
  const plotW = Math.max(0, cardWidth - plotLeft - PLOT_RIGHT_PAD);
  const padH = cardWidth * PAD_H_RATIO;
  const yAxisLeft = cardWidth * YAXIS_LEFT_RATIO;
  const yAxisW = cardWidth * YAXIS_W_RATIO;
  const usableW = plotW - DOT_INSET * 2;
  const xStep = usableW / 6;

  const chartData = useMemo(() => {
    const p = [...data];
    while (p.length < 7) p.push(0);
    return p.slice(0, 7);
  }, [data]);

  const pts = useMemo(() => valuesToPoints(chartData, plotW), [chartData, plotW]);
  // Full path no longer needed — we only draw up to today
  // Today's day index (0=Mo, 1=Tu, ..., 6=Su)
  const todayIdx = useMemo(() => {
    const day = new Date().getDay(); // 0=Sun, 1=Mon...
    return day === 0 ? 6 : day - 1;
  }, []);

  // Only show points up to today (inclusive)
  const visiblePts = useMemo(() => pts.slice(0, todayIdx + 1), [pts, todayIdx]);
  const { d: visibleD, len: visibleLen } = useMemo(() => buildPath(visiblePts), [visiblePts]);

  // Line-draw animation — uses visible path only
  const progress = useSharedValue(0);
  useEffect(() => {
    if (visibleLen > 0) {
      progress.value = withTiming(1, { duration: safeDuration(LINE_DRAW_MS), easing: Easing.inOut(Easing.quad) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleLen]);
  const pathProps = useAnimatedProps(() => ({
    strokeDashoffset: visibleLen === 0 ? 0 : visibleLen * (1 - progress.value),
  }));

  return (
    <AnimatedEntrance preset="fadeScale">
      <View style={styles.card} onLayout={onLayout}>
        {cardWidth > 0 && (
          <>
            {/* ── Header ── */}
            <View style={[styles.header, { paddingHorizontal: padH }]}>
              <Typography
                family="onest"
                size={16}
                weight="700"
                extraColor={LINE_COLOR}
                letterSpacing={0.16}
              >
                Weekly progress
              </Typography>
              <Typography
                family="onest"
                size={16}
                weight="700"
                extraColor={LINE_COLOR}
                letterSpacing={0.16}
              >
                XP {totalXP}
              </Typography>
            </View>

            {/* ── Y-axis labels ── */}
            {Y_LABELS.map((val, i) => (
              <Typography
                key={val}
                family="onest"
                size={12}
                lineHeight={14}
                weight="600"
                color="onyx"
                align="right"
                style={[
                  styles.yLabel,
                  {
                    left: yAxisLeft,
                    width: yAxisW,
                    top: YAXIS_TOP + i * YAXIS_LINE_H,
                  },
                ]}
              >
                {val}
              </Typography>
            ))}

            {/* ── Plot (SVG) ── */}
            <View
              style={[
                styles.plot,
                { left: plotLeft, width: plotW },
              ]}
            >
              <Svg width={plotW} height={PLOT_H} style={{ overflow: 'visible' }}>
                {GRID_LINES.map((y) => (
                  <Line key={y} x1={0} y1={y} x2={plotW} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
                ))}
                {visibleD.length > 0 && (
                  <AnimatedPath
                    d={visibleD}
                    stroke={LINE_COLOR}
                    strokeWidth={2.2}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={visibleLen}
                    animatedProps={pathProps}
                  />
                )}
                {visiblePts.map((p, i) => (
                  <Dot key={i} cx={p.x} cy={p.y} isToday={i === todayIdx} index={i} />
                ))}
              </Svg>
            </View>

            {/* ── X-axis labels ── */}
            {DAY_LABELS.map((label, i) => (
              <Typography
                key={label}
                family="onest"
                size={14}
                lineHeight={18}
                weight="600"
                color="onyx"
                align="center"
                style={[
                  styles.xLabel,
                  { left: plotLeft + DOT_INSET + i * xStep - 11, top: XAXIS_TOP },
                ]}
              >
                {label}
              </Typography>
            ))}
          </>
        )}
      </View>
    </AnimatedEntrance>
  );
}

// ─────────────────────────────────────────────
// Styles — responsive layout (positions derived from cardWidth)
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    height: CARD_H,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE_COLOR,
    backgroundColor: colors.snow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: HDR_H,
  },
  yLabel: {
    position: 'absolute',
  },
  plot: {
    position: 'absolute',
    top: PLOT_TOP,
    height: PLOT_H,
  },
  xLabel: {
    position: 'absolute',
    width: 22,
  },
});
