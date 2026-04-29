// Renders the list of era rows (full-width / grid pairs / section header).
// Uses plain ScrollView (not FlatList/LegendList) — the eras list is short
// (~5–10 rows). Virtualization overhead from FlatList (per-frame visibility
// checks, view-manager bridge calls on edge mount/unmount) was dominating
// the scroll work and dropping Android frames from 120 → ~20 fps. ScrollView
// mounts every child once and delegates scroll to the native ScrollView, so
// scroll cost is pure GPU translate of the cached child tree — no JS work.
//
// Per-row entrance metadata (preset + delay) is still computed below for
// reference, but the AnimatedEntrance wrappers are currently disabled
// (commented out) per AFF-833 perf pass. To re-enable, uncomment the
// wrappers in renderRow.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { EraCard } from '@/components/EraSelection/EraCard';
import { Typography } from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import type { EntrancePresetKey } from '@/components/ui/animations';
import { spacing } from '@/components/ui/theme';
import { Era } from '@/hooks/useEras';
import { EraRow } from '@/hooks/eras';

interface EraListProps {
  rows: EraRow[];
  selectedEraId: string | null;
  isSubscribed: boolean;
  isFoundingMember: boolean;
  onEraSelect: (era: Era) => void;
}

interface RowEntrance {
  preset: EntrancePresetKey;
  delay: number;
}

const ENTRANCE = {
  HERO_DELAY: 400,
  AVAILABLE_BASE: 700,
  AVAILABLE_STAGGER: 80,
  SECTION_HEADER_DELAY: 1250,
  LOCKED_BASE: 1350,
  LOCKED_STAGGER: 60,
  /**
   * Cutoff after which newly mounted rows skip their entrance entirely.
   * Set to a beat past the last possible row entrance end:
   *   LOCKED_BASE + 5*LOCKED_STAGGER + ~350ms preset duration ≈ 2000ms.
   */
  WINDOW_MS: 2000,
} as const;

/** Walk the rows once to assign per-row entrance preset + delay. */
function computeRowEntrances(rows: EraRow[]): RowEntrance[] {
  const result: RowEntrance[] = [];
  let availableIndex = 0;
  let lockedIndex = 0;
  let inLockedSection = false;
  let heroAssigned = false;

  for (const row of rows) {
    if (row.type === 'sectionHeader') {
      result.push({ preset: 'riseSubtle', delay: ENTRANCE.SECTION_HEADER_DELAY });
      inLockedSection = true;
      continue;
    }

    if (inLockedSection) {
      result.push({
        preset: 'riseQuiet',
        delay: ENTRANCE.LOCKED_BASE + lockedIndex * ENTRANCE.LOCKED_STAGGER,
      });
      lockedIndex++;
    } else if (!heroAssigned && row.type === 'full') {
      result.push({ preset: 'cardHeroDrop', delay: ENTRANCE.HERO_DELAY });
      heroAssigned = true;
      availableIndex++;
    } else {
      result.push({
        preset: 'riseListItem',
        delay:
          ENTRANCE.AVAILABLE_BASE +
          Math.max(0, availableIndex - (heroAssigned ? 1 : 0)) * ENTRANCE.AVAILABLE_STAGGER,
      });
      availableIndex++;
    }
  }

  return result;
}

const EraList: React.FC<EraListProps> = ({
  rows,
  selectedEraId,
  isSubscribed,
  isFoundingMember,
  onEraSelect,
}) => {
  const rowEntrances = useMemo(() => computeRowEntrances(rows), [rows]);

  // Initial-entrance window: while true, rows mount with their staggered
  // entrance. After the window, newly mounted rows (recycled by LegendList
  // as user scrolls) skip the entrance and render at final state directly.
  const [hasEntered, setHasEntered] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHasEntered(true), ENTRANCE.WINDOW_MS);
    return () => clearTimeout(t);
  }, []);

  const renderRow = useCallback(
    (row: EraRow, index: number) => {
      const entrance = rowEntrances[index];
      const autoPlay = !hasEntered;
      // Pass undefined entranceDelay after the entrance window so EraCard's
      // chip pop also skips its delay (renders the chip at final state).
      const cardEntranceDelay = autoPlay ? entrance.delay : undefined;

      if (row.type === 'sectionHeader') {
        return (
          <AnimatedEntrance key="section-coming-soon" preset={entrance.preset} delay={entrance.delay} autoPlay={autoPlay}>
            <View style={styles.sectionHeader}>
              <Typography family="onest" size={18} weight="700" color="blueMutedNavy">
                {row.label}
              </Typography>
            </View>
          </AnimatedEntrance>
        );
      }

      if (row.type === 'full') {
        const era = row.eras[0];
        return (
          <AnimatedEntrance key={era.era_id} preset={entrance.preset} delay={entrance.delay} autoPlay={autoPlay}>
            <EraCard
              era={era}
              isSelected={selectedEraId === era.era_id}
              onSelect={onEraSelect}
              hasSubscription={isSubscribed}
              isFoundingMember={isFoundingMember}
              entranceDelay={cardEntranceDelay}
            />
          </AnimatedEntrance>
        );
      }

      return (
        <AnimatedEntrance key={row.eras[0].era_id} preset={entrance.preset} delay={entrance.delay} autoPlay={autoPlay}>
          <View style={[styles.gridRow]}>
            {row.eras.map((era) => (
              <EraCard
                key={era.era_id}
                era={era}
                isSelected={selectedEraId === era.era_id}
                onSelect={onEraSelect}
                hasSubscription={isSubscribed}
                isFoundingMember={isFoundingMember}
                entranceDelay={cardEntranceDelay}
              />
            ))}
          </View>
        </AnimatedEntrance>
      );
    },
    [hasEntered, rowEntrances, selectedEraId, onEraSelect, isSubscribed, isFoundingMember],
  );

  return (
    <Animated.ScrollView
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      // Disable Android overscroll glow — the rubber-band recompute on
      // each release was contributing to perceived jank near list edges.
      overScrollMode="never"
      // Drop scroll events that arrive faster than the renderer can
      // handle, instead of queueing them — defaults are fine but explicit.
      scrollEventThrottle={16}
    >
      {rows.map(renderRow)}
    </Animated.ScrollView>
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg - 4,
    paddingTop: spacing.md,
    paddingBottom: 70,
    gap: 10,
  },
  sectionHeader: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowSpacer: {
    marginBottom: 10,
  },
});

export default EraList;
