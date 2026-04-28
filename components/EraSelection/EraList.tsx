// Renders the LegendList of era rows (full-width / grid pairs / section header).
// Owns the renderItem + keyExtractor wiring AND computes the entrance-timeline
// metadata (preset + delay) for each row so animations stay in sync with the
// rest of the screen entrance (Downloads/04 eras/index.html → enterEras()).
//
// Per-row entrance mapping:
//   - First full_width row in the available group → cardHeroDrop @ 400ms (Umayyad hero)
//   - Subsequent rows in available group        → riseListItem @ 700 + (i-1)*80ms
//   - "Coming Soon..." section header           → riseSubtle    @ 1250ms
//   - Rows in coming-soon group                 → riseQuiet     @ 1350 + i*60ms
//
// Recycling guard: AnimatedEntrance applies its `delay` from each mount,
// not from screen mount. So a locked row with delay=1500ms that mounts
// fresh because the user scrolled into it 800ms after screen open would
// stay invisible until t=2300ms — visible blank space. To prevent that,
// we flip `hasEntered=true` after the initial entrance window finishes
// (~1700ms). After the flip, AnimatedEntrance receives `autoPlay=false`
// → useEntrance initializes shared values at the final state directly
// → newly mounted rows render fully visible without animation.
//
// In-flight entrances at the moment of the flip are NOT interrupted —
// the useEffect cleanup just no-ops, and existing animations keep running.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LegendList } from '@legendapp/list';

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
    ({ item: row, index }: { item: EraRow; index: number }) => {
      const entrance = rowEntrances[index];
      const autoPlay = !hasEntered;
      // Pass undefined entranceDelay after the entrance window so EraCard's
      // chip pop also skips its delay (renders the chip at final state).
      const cardEntranceDelay = autoPlay ? entrance.delay : undefined;

      if (row.type === 'sectionHeader') {
        return (
          <AnimatedEntrance preset={entrance.preset} delay={entrance.delay} autoPlay={autoPlay}>
            <View style={styles.sectionHeader}>
              <Typography family="onest" size={18} weight="700" extraColor="#41425E">
                {row.label}
              </Typography>
            </View>
          </AnimatedEntrance>
        );
      }

      if (row.type === 'full') {
        const era = row.eras[0];
        return (
          <AnimatedEntrance preset={entrance.preset} delay={entrance.delay} autoPlay={autoPlay}>
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
        <AnimatedEntrance preset={entrance.preset} delay={entrance.delay} autoPlay={autoPlay}>
          <View style={styles.gridRow}>
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

  const keyExtractor = useCallback(
    (item: EraRow) =>
      item.type === 'sectionHeader' ? 'section-coming-soon' : item.eras[0].era_id,
    [],
  );

  return (
    <LegendList
      recycleItems
      data={rows}
      extraData={selectedEraId}
      renderItem={renderRow}
      keyExtractor={keyExtractor}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      estimatedItemSize={250}
    />
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
});

export default EraList;
