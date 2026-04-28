import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface WeeklyXPChartProps {
  data: number[];
  totalXP: number;
}

// ─────────────────────────────────────────────
// Figma-exact constants (from node 3596:6886, 348×245)
// All positions are absolute from the card's top-left.
// ─────────────────────────────────────────────

const CARD_H = 245;

// Header labels
const HDR_Y = 17;
const HDR_LEFT = 21;
const HDR_RIGHT = 21; // padding from right

// Y-axis
const YAXIS_LEFT = 20;
const YAXIS_TOP = 52;
const YAXIS_W = 25;
const YAXIS_LINE_H = 30; // spacing between each label

// Plot area
const PLOT_LEFT = 58;
const PLOT_TOP = 66;
const PLOT_W = 260;
const PLOT_H = 120;

// X-axis
const XAXIS_TOP = 211;

// Grid line Y offsets inside plot (0, 30, 60, 90, 119)
const GRID_LINES = [0, 30, 60, 90, 119];

const Y_MAX = 400;
const Y_LABELS = [400, 300, 200, 100, 0];
const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const GRID_COLOR = '#E0E5F0';
const LABEL_COLOR = '#1A1A1A';
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

function valuesToPoints(data: number[]) {
  const step = PLOT_W / 6;
  return data.map((val, i) => {
    const x = i * step;
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

function Dot({ cx, cy, isPeak, index }: { cx: number; cy: number; isPeak: boolean; index: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    const delay = LINE_DRAW_MS * 0.3 + index * DOT_STAGGER_MS;
    opacity.value = withDelay(safeDuration(delay), withTiming(1, { duration: safeDuration(DOT_FADE_MS) }));
    scale.value = withDelay(safeDuration(delay), withTiming(1, { duration: safeDuration(DOT_FADE_MS), easing: Easing.out(Easing.back(1.5)) }));
    if (isPeak) {
      pulse.value = withDelay(
        safeDuration(delay + DOT_FADE_MS),
        withRepeat(withSequence(
          withTiming(1.3, { duration: safeDuration(PULSE_MS / 2), easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: safeDuration(PULSE_MS / 2), easing: Easing.inOut(Easing.ease) }),
        ), -1, false),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const props = useAnimatedProps(() => ({
    opacity: opacity.value,
    r: DOT_R * scale.value * pulse.value,
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      fill={isPeak ? LINE_COLOR : '#FFFFFF'}
      stroke={LINE_COLOR}
      strokeWidth={DOT_STROKE}
      animatedProps={props}
    />
  );
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export function WeeklyXPChart({ data, totalXP }: WeeklyXPChartProps) {
  const chartData = useMemo(() => {
    const p = [...data];
    while (p.length < 7) p.push(0);
    return p.slice(0, 7);
  }, [data]);

  const pts = useMemo(() => valuesToPoints(chartData), [chartData]);
  const { d, len } = useMemo(() => buildPath(pts), [pts]);
  const allZeros = useMemo(() => chartData.every((v) => v === 0), [chartData]);
  const peakIdx = useMemo(() => {
    let mx = -1, mi = 0;
    chartData.forEach((v, i) => { if (v > mx) { mx = v; mi = i; } });
    return mi;
  }, [chartData]);

  // Line-draw animation
  const progress = useSharedValue(0);
  useEffect(() => {
    if (len > 0) {
      progress.value = withTiming(1, { duration: safeDuration(LINE_DRAW_MS), easing: Easing.inOut(Easing.quad) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [len]);
  const pathProps = useAnimatedProps(() => ({
    strokeDashoffset: len === 0 ? 0 : len * (1 - progress.value),
  }));

  const xStep = PLOT_W / 6;

  return (
    <AnimatedEntrance preset="fadeScale">
      <View style={styles.card}>
        {/* ── Header ── */}
        <Text style={styles.hdrLeft}>Weekly progress</Text>
        <Text style={styles.hdrRight}>XP {totalXP}</Text>

        {/* ── Y-axis labels ── */}
        {Y_LABELS.map((val, i) => (
          <Text key={val} style={[styles.yLabel, { top: YAXIS_TOP + i * YAXIS_LINE_H }]}>
            {val}
          </Text>
        ))}

        {/* ── Plot (SVG) ── */}
        <View style={styles.plot}>
          <Svg width={PLOT_W} height={PLOT_H} style={{ overflow: 'visible' }}>
            {GRID_LINES.map((y) => (
              <Line key={y} x1={0} y1={y} x2={PLOT_W} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
            ))}
            {d.length > 0 && (
              <AnimatedPath
                d={d}
                stroke={LINE_COLOR}
                strokeWidth={2.2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={len}
                animatedProps={pathProps}
              />
            )}
            {pts.map((p, i) => (
              <Dot key={i} cx={p.x} cy={p.y} isPeak={!allZeros && i === peakIdx} index={i} />
            ))}
          </Svg>
        </View>

        {/* ── X-axis labels ── */}
        {DAY_LABELS.map((label, i) => (
          <Text
            key={label}
            style={[styles.xLabel, { left: PLOT_LEFT + i * xStep - 11, top: XAXIS_TOP }]}
          >
            {label}
          </Text>
        ))}
      </View>
    </AnimatedEntrance>
  );
}

// ─────────────────────────────────────────────
// Styles — absolute positioning matching Figma
// ─────────────────────────────────────────────

const hdrBase: any = {
  position: 'absolute',
  top: HDR_Y,
  fontFamily: 'Onest-Bold',
  fontSize: 16,
  letterSpacing: 0.16,
  color: LINE_COLOR,
};

const labelBase: any = {
  position: 'absolute',
  fontFamily: 'Onest-SemiBold',
};

const styles = StyleSheet.create({
  card: {
    height: CARD_H,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE_COLOR,
    backgroundColor: colors.snow,
  },
  hdrLeft: { ...hdrBase, left: HDR_LEFT },
  hdrRight: { ...hdrBase, right: HDR_RIGHT },
  yLabel: {
    ...labelBase,
    left: YAXIS_LEFT,
    width: YAXIS_W,
    textAlign: 'right',
    fontSize: 12,
    lineHeight: 14,
    color: LABEL_COLOR,
  },
  plot: {
    position: 'absolute',
    left: PLOT_LEFT,
    top: PLOT_TOP,
    width: PLOT_W,
    height: PLOT_H,
  },
  xLabel: {
    ...labelBase,
    width: 22,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
    color: LABEL_COLOR,
  },
});
