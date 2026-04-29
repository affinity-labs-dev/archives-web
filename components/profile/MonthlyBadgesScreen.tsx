import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  View,
  FlatList,
  Image,
  Platform,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Typography } from '@/components/ui';
import { safeDuration } from '@/components/ui/theme';
import { AchievementDetailCard } from './shared/AchievementDetailCard';

// ─── Badge data ────────────────────────────────────────────

interface BadgeItem {
  month: number;
  label: string;
  subtitle: string;
  earned: ImageSourcePropType;
  grey: ImageSourcePropType;
}

const BADGES: BadgeItem[] = [
  { month: 1, label: 'January', subtitle: 'The Scholar \u2014 Bayt al-Hikma', earned: require('@/assets/images/profile/badges/badge-january-scholar.png'), grey: require('@/assets/images/profile/badges/badge-january-scholar-grey.png') },
  { month: 2, label: 'February', subtitle: 'The Caravan Traveler \u2014 Silk Road', earned: require('@/assets/images/profile/badges/badge-february-caravan.png'), grey: require('@/assets/images/profile/badges/badge-february-caravan-grey.png') },
  { month: 3, label: 'March', subtitle: 'The Astronomer \u2014 Golden Age', earned: require('@/assets/images/profile/badges/badge-march-astronomer.png'), grey: require('@/assets/images/profile/badges/badge-march-astronomer-grey.png') },
  { month: 4, label: 'April', subtitle: 'The Calligrapher \u2014 manuscript tradition', earned: require('@/assets/images/profile/badges/badge-april-calligrapher.png'), grey: require('@/assets/images/profile/badges/badge-april-calligrapher-grey.png') },
  { month: 5, label: 'May', subtitle: 'The Architect \u2014 dome & tilework', earned: require('@/assets/images/profile/badges/badge-may-architect.png'), grey: require('@/assets/images/profile/badges/badge-may-architect-grey.png') },
  { month: 6, label: 'June', subtitle: 'The Healer \u2014 Al-Qanun', earned: require('@/assets/images/profile/badges/badge-june-healer.png'), grey: require('@/assets/images/profile/badges/badge-june-healer-grey.png') },
  { month: 7, label: 'July', subtitle: 'The Cartographer \u2014 Al-Idrisi', earned: require('@/assets/images/profile/badges/badge-july-cartographer.png'), grey: require('@/assets/images/profile/badges/badge-july-cartographer-grey.png') },
  { month: 8, label: 'August', subtitle: 'The Dhow Sailor \u2014 Indian Ocean trade', earned: require('@/assets/images/profile/badges/badge-august-sailor.png'), grey: require('@/assets/images/profile/badges/badge-august-sailor-grey.png') },
  { month: 9, label: 'September', subtitle: 'The Wayfinder \u2014 qibla compass', earned: require('@/assets/images/profile/badges/badge-september-wayfinder.png'), grey: require('@/assets/images/profile/badges/badge-september-wayfinder-grey.png') },
  { month: 10, label: 'October', subtitle: 'The Oasis Teacher \u2014 madrasa', earned: require('@/assets/images/profile/badges/badge-october-oasis.png'), grey: require('@/assets/images/profile/badges/badge-october-oasis-grey.png') },
  { month: 11, label: 'November', subtitle: 'The Lanternbearer \u2014 fanoos', earned: require('@/assets/images/profile/badges/badge-november-lantern.png'), grey: require('@/assets/images/profile/badges/badge-november-lantern-grey.png') },
  { month: 12, label: 'December', subtitle: 'The Storyteller \u2014 oral tradition', earned: require('@/assets/images/profile/badges/badge-december-storyteller.png'), grey: require('@/assets/images/profile/badges/badge-december-storyteller-grey.png') },
];

// ─── Props ─────────────────────────────────────────────────

interface MonthlyBadgesScreenProps {
  onClose: () => void;
  /** Array of earned month numbers (1-12). If month is in array, it is earned. */
  earnedMonths: number[];
}

// ─── Component ─────────────────────────────────────────────

interface SelectedBadge {
  item: BadgeItem;
  isEarned: boolean;
}

// ─── Badge Tile with press feedback ──────────────────────

// BadgeTile takes a stable `onSelect(item)` callback instead of a per-
// row `onPress: () => handleTileTap(item)` lambda. With the latter,
// parent re-renders create new lambdas → memo never hits → all 12
// tiles re-render on every parent state change. Binding `item`
// internally via useCallback gives the Pressable a stable handler
// while keeping memo fingerprint clean.
function BadgeTileImpl({
  item,
  isEarned,
  onSelect,
}: {
  item: BadgeItem;
  isEarned: boolean;
  onSelect: (item: BadgeItem) => void;
}) {
  const imgScale = useSharedValue(1);
  const imgY = useSharedValue(0);
  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: imgY.value }, { scale: imgScale.value }],
  }));

  const handleHoverIn = useCallback(() => {
    imgY.value = withTiming(-6, { duration: safeDuration(160) });
    imgScale.value = withTiming(1.1, { duration: safeDuration(160) });
  }, [imgY, imgScale]);
  const handleHoverOut = useCallback(() => {
    imgY.value = withSpring(0, { damping: 12, stiffness: 200 });
    imgScale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, [imgY, imgScale]);
  const handlePress = useCallback(() => onSelect(item), [item, onSelect]);

  return (
    <Pressable
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPress={handlePress}
    >
      <View style={styles.cell}>
        <Animated.View style={imgStyle}>
          <Image source={isEarned ? item.earned : item.grey} style={styles.badgeImage} resizeMode="cover" />
        </Animated.View>
        <Typography family="onest" size={14} weight="600" align="center" extraColor={isEarned ? '#1a1a1a' : '#9e9ea3'} style={styles.label}>
          {item.label}
        </Typography>
      </View>
    </Pressable>
  );
}

const BadgeTile = React.memo(BadgeTileImpl);

// ─── Main Component ──────────────────────────────────────

export function MonthlyBadgesScreen({ onClose, earnedMonths }: MonthlyBadgesScreenProps) {
  const insets = useSafeAreaInsets();
  const earnedSet = useMemo(() => new Set(earnedMonths), [earnedMonths]);
  const [selected, setSelected] = useState<SelectedBadge | null>(null);

  // Inline `[styles.safeArea, { paddingTop: insets.top }]` would
  // allocate a new array each render → propagate down through View
  // diffing. Memoizing on insets.top keeps the same array ref unless
  // the inset actually changes (rotation, fold device).
  const safeAreaStyle = useMemo(
    () => [styles.safeArea, { paddingTop: insets.top }],
    [insets.top],
  );

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const handleTileTap = useCallback((item: BadgeItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected({ item, isEarned: earnedSet.has(item.month) });
  }, [earnedSet]);

  const handleClosePreview = useCallback(() => setSelected(null), []);

  const keyExtractor = useCallback((item: BadgeItem) => String(item.month), []);

  // Stable renderItem — depends only on `earnedSet` + `handleTileTap`,
  // both stable per render. FlatList passes the same fn ref between
  // renders so memo'd BadgeTile only re-renders when its own props
  // change (item is keyed; isEarned per-month is stable per session).
  const renderItem = useCallback(
    ({ item }: { item: BadgeItem }) => (
      <BadgeTile
        item={item}
        isEarned={earnedSet.has(item.month)}
        onSelect={handleTileTap}
      />
    ),
    [earnedSet, handleTileTap],
  );

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible>
      <View style={safeAreaStyle}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.6}>
            <Ionicons name="arrow-back" size={22} color="#8c8c94" />
          </TouchableOpacity>
          <Typography family="bounded" size={20} weight="600" align="center" extraColor="#8c8c94" style={styles.headerTitle}>
            Monthly Badges
          </Typography>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.divider} />

        <FlatList
          data={BADGES}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          // FlatList Android perf knobs:
          // - removeClippedSubviews: tear off-screen tiles down (12
          //   total tiles × Reanimated press feedback = real cost).
          // - windowSize: # screens worth of cells kept rendered
          //   (default 21 — overkill for 4 rows of 3).
          // - maxToRenderPerBatch: cap async batch render size on
          //   first-paint scroll.
          removeClippedSubviews={Platform.OS === 'android'}
          windowSize={5}
          maxToRenderPerBatch={6}
          initialNumToRender={9}
        />

        <AchievementDetailCard
          visible={!!selected}
          onClose={handleClosePreview}
          // Badge data ships pre-rendered earned/grey assets so the
          // shared card renders the right variant directly — no
          // GrayscaleImage filter needed.
          image={
            selected
              ? selected.isEarned
                ? selected.item.earned
                : selected.item.grey
              : undefined!
          }
          title={selected?.item.label || ''}
          description={selected?.item.subtitle}
          unlocked={!!selected?.isEarned}
          // Treat the last day of the badge's month (current year) as
          // the unlocked-on date — same visual the inline component
          // showed before.
          unlockedAt={
            selected
              ? new Date(
                  new Date().getFullYear(),
                  selected.item.month,
                  0,
                ).toISOString()
              : null
          }
        />
      </View>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────

const ROW_GAP = 28;
const CELL_WIDTH = 107;
const IMAGE_SIZE = 96;
const IMAGE_BORDER_RADIUS = 8;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
  },
  headerSpacer: {
    width: 32,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#ebebf0',
  },

  // Grid
  gridContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: ROW_GAP,
  },

  // Cell
  cell: {
    width: CELL_WIDTH,
    alignItems: 'center',
  },
  badgeImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: IMAGE_BORDER_RADIUS,
  },
  label: {
    marginTop: 8,
    width: CELL_WIDTH,
  },

});
