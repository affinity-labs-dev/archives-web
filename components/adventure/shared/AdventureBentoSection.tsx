// AdventureBentoSection — one row of the era-view list.
//
// Renamed from `AdventureComponent` (too generic; collided with the React
// `Component` concept). "BentoSection" describes both purpose and layout:
// a per-adventure block containing the textual header + a 5-card bento grid.
//
// Composition (each piece is its own memoized component):
//   - AdventureHeader      ERA badge + Bounded title + icon + timeline
//   - AdventureBentoCard×5 the 5 lesson tiles laid out as 2 tall + 1 wide + 2 short
//
// Performance notes:
//   - Bento layout positions are memoized on screenWidth so they only
//     recompute on rotation, not on every parent re-render.
//   - User progress is converted into a `Map<moduleId, progress>` once per
//     render (O(N) build, O(1) lookup) — avoids N×M `Array.find()` work
//     when rendering 5 cards × N adventures.
//   - All children are React.memo'd, so a single lesson completing only
//     re-renders the one card whose progress changed; siblings + the
//     header skip the render entirely.

import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AnimatedEntrance } from '@/components/ui/animations';
import type { Adventure, ContentItem } from '@/components/shared/types';

import { AdventureHeader } from './AdventureHeader';
import { AdventureBentoCard, type AdventureBentoCardLayout } from './AdventureBentoCard';

interface UserProgress {
  adventureId: string;
  moduleId: string;
  quizScore: number;
  isCompleted: boolean;
  quizCompleted: boolean;
  completedAt: string;
  era_id: string;
}

interface AdventureBentoSectionProps {
  adventure: Adventure;
  userProgress: UserProgress[];
  onCardPress?: (contentItem: ContentItem, adventureId: string) => void;
  onTitlePress?: (adventure: Adventure) => void;
  isLocked?: boolean;
  /**
   * Plays the mount entrance (header slide + bento grid lift). Caller
   * sets this `true` only for the initial render window — sections that
   * mount later (scrolled into view by FlatList) receive `false` so the
   * animation doesn't fire mid-scroll. Skipping scroll-triggered
   * entrances is intentional: per-card scroll animations were too
   * expensive on Android and gave poor results.
   *
   * Defaults to `false` (no animation) so omitting the prop is safe.
   */
  enableEntrance?: boolean;
}

/**
 * Compute bento card positions + layout flags + the actual container
 * height needed for the given card count. Pure function — memoized on
 * `screenWidth` and `count`.
 *
 * Height adapts so adventures with fewer than 5 cards don't leave dead
 * space below the grid:
 *   1–2 cards → 1 row of tall cards (tallHeight)
 *   3 cards   → tall row + wide row (tallHeight + gap + shortHeight)
 *   4–5 cards → full grid (tallHeight + 2×shortHeight + 2×gap)
 *
 * Card 1 stretches to full width when it's the only card so a single
 * tile doesn't look orphaned in the left column.
 */
function computeBentoLayout(
  screenWidth: number,
  count: number,
): {
  positions: AdventureBentoCardLayout[];
  containerHeight: number;
} {
  const containerPadding = screenWidth * 0.034; // ~13px @ 375
  const gap = screenWidth * 0.021; // ~8px @ 375
  const cardWidth = (screenWidth - containerPadding * 2 - gap) / 2;
  const fullWidth = screenWidth - containerPadding * 2;
  const tallHeight = cardWidth * 1.2;
  const shortHeight = cardWidth * 0.6;

  const allPositions: AdventureBentoCardLayout[] = [
    // Card 1 — tall left (or full-width when it's the only card)
    {
      left: containerPadding,
      top: 0,
      width: count === 1 ? fullWidth : cardWidth,
      height: tallHeight,
      isLarge: true,
      isWide: count === 1,
    },
    // Card 2 — tall right
    { left: containerPadding + cardWidth + gap, top: 0, width: cardWidth, height: tallHeight, isLarge: true, isWide: false },
    // Card 3 — full-width
    { left: containerPadding, top: tallHeight + gap, width: fullWidth, height: shortHeight, isLarge: false, isWide: true },
    // Card 4 — short left
    { left: containerPadding, top: tallHeight + shortHeight + gap * 2, width: cardWidth, height: shortHeight, isLarge: false, isWide: false },
    // Card 5 — short right
    { left: containerPadding + cardWidth + gap, top: tallHeight + shortHeight + gap * 2, width: cardWidth, height: shortHeight, isLarge: false, isWide: false },
  ];

  let containerHeight: number;
  if (count <= 2) {
    containerHeight = tallHeight;
  } else if (count === 3) {
    containerHeight = tallHeight + gap + shortHeight;
  } else {
    containerHeight = tallHeight + shortHeight + shortHeight + gap * 2;
  }

  return { positions: allPositions.slice(0, count), containerHeight };
}

const AdventureBentoSectionComponent: React.FC<AdventureBentoSectionProps> = ({
  adventure,
  userProgress,
  onCardPress,
  onTitlePress,
  isLocked = false,
  enableEntrance = false,
}) => {
  // Pre-sort + slice once. Stable across re-renders unless content list changes.
  const sortedContent = useMemo(
    () =>
      [...(adventure.content_list || [])]
        .sort((a, b) => a.order_by - b.order_by)
        .slice(0, 5),
    [adventure.content_list],
  );

  // Bento layout — depends on screen width AND card count so the container
  // height shrinks to fit the actual number of cards (no dead space below
  // adventures with < 5 lessons).
  //
  // `useWindowDimensions` is React Native's official width source: it
  // subscribes to native dimension events once at app level and returns
  // the current width without doing a synchronous bridge read on every
  // render. `Dimensions.get('window')` was hitting the bridge on each
  // render of every adventure section — measurable on Android during
  // scroll re-render cascades.
  const { width: screenWidth } = useWindowDimensions();
  const { positions, containerHeight } = useMemo(
    () => computeBentoLayout(screenWidth, sortedContent.length),
    [screenWidth, sortedContent.length],
  );

  // Pre-index this adventure's progress entries by moduleId. With 5 cards
  // looking up progress per render, the previous `userProgress.find()`
  // approach was O(N×5); the Map makes it O(N + 5) and amortizes the
  // adventureId filter across all cards.
  const progressByModuleId = useMemo(() => {
    const m = new Map<string, UserProgress>();
    for (const p of userProgress) {
      if (p.adventureId === adventure.readable_id) {
        m.set(p.moduleId, p);
      }
    }
    return m;
  }, [userProgress, adventure.readable_id]);

  return (
    <View style={styles.container}>
      {/* Header slides in first — short, snappy `riseSoft` (translate
          y:20 → 0 + fade) so the ERA badge / title / timeline appear
          to drop into place from above their final position. */}
      <AnimatedEntrance preset="riseSoft" delay={ENTRANCE_HEADER_DELAY} autoPlay={enableEntrance}>
        <AdventureHeader adventure={adventure} isLocked={isLocked} onPress={onTitlePress} />
      </AnimatedEntrance>

      {/* Bento grid lifts in as a single block 200ms after the header.
          We animate the GRID CONTAINER (not each card) so the absolute
          positioning of the cards inside isn't fighting an Animated.View
          wrapper layout — gives the same staggered-feeling without
          per-card worklets. */}
      <AnimatedEntrance preset="riseCard" delay={ENTRANCE_GRID_DELAY} autoPlay={enableEntrance}>
        <View style={[styles.bentoGrid, { height: containerHeight }]}>
          {sortedContent.map((item, index) => {
            const layout = positions[index];
            const progress = progressByModuleId.get(item.id);
            const isCompleted = !!progress?.isCompleted && !!progress?.quizCompleted;
            const starCount = progress?.quizScore || 0;

            return (
              <AdventureBentoCard
                key={item.id}
                item={item}
                adventureId={adventure.readable_id}
                layout={layout}
                isCompleted={isCompleted}
                starCount={starCount}
                isLocked={isLocked}
                onPress={onCardPress ?? noop}
              />
            );
          })}
        </View>
      </AnimatedEntrance>
    </View>
  );
};

// Entrance timing — picked to feel like the `enterScoreScreen` pattern
// from Downloads/03 questions/index.html: header lands first, the body
// content arrives ~200ms behind it.
const ENTRANCE_HEADER_DELAY = 0;
const ENTRANCE_GRID_DELAY = 200;

function noop() {}

const AdventureBentoSection = React.memo(AdventureBentoSectionComponent);

export default AdventureBentoSection;

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    position: 'relative', // enable absolute positioning for lock overlay applied externally
  },
  bentoGrid: {
    position: 'relative',
  },
});
