/**
 * AchievementsScreen — Full-screen modal grid of all 20 achievements.
 *
 * Tap a tile → detail card modal with gradient background, large image,
 * title, description, and unlocked/locked pills.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Typography } from '@/components/ui/Typography';
import { StaggerGroup } from '@/components/ui/animations/StaggerGroup';
import { safeDuration } from '@/components/ui/theme';
import { useGamificationOrchestrator } from '@/gamification';
import { AchievementDetailCard } from './shared/AchievementDetailCard';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface AchievementsScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface SelectedAchievement {
  id: string;
  label: string;
  description: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  image: any;
}

// ──────────────────────────────────────────────
// Static achievement image map
// ──────────────────────────────────────────────

const ACHIEVEMENT_IMAGES: Record<string, any> = {
  perfect_scholar: require('@/assets/images/adventure-unlocked/perfectscholar.png'),
  quiz_legend: require('@/assets/images/adventure-unlocked/quizlegend.png'),
  quiz_master: require('@/assets/images/adventure-unlocked/quizmaster.png'),
  first_perfect: require('@/assets/images/adventure-unlocked/firststeps.png'),
  century_scholar: require('@/assets/images/adventure-unlocked/100dayscholar.png'),
  quick_learner: require('@/assets/images/adventure-unlocked/quicklearner.png'),
  speed_demon: require('@/assets/images/adventure-unlocked/speeddemon.png'),
  week_warrior: require('@/assets/images/adventure-unlocked/weekwarrior.png'),
  month_master: require('@/assets/images/adventure-unlocked/monthmaster.png'),
  early_bird: require('@/assets/images/adventure-unlocked/earlybird.png'),
  night_owl: require('@/assets/images/adventure-unlocked/nightowl.png'),
  era_complete_umayyad: require('@/assets/images/adventure-unlocked/umayyadexpert.png'),
  era_complete_women_of_islam: require('@/assets/images/adventure-unlocked/womenofislam.png'),
  era_complete_roi: require('@/assets/images/adventure-unlocked/riseofislam.png'),
  xp_100: require('@/assets/images/adventure-unlocked/talib(seeker).png'),
  xp_250: require('@/assets/images/adventure-unlocked/daris(student).png'),
  xp_500: require('@/assets/images/adventure-unlocked/alim(scholar).png'),
  xp_1000: require('@/assets/images/adventure-unlocked/hakim(sage).png'),
  xp_2000: require('@/assets/images/adventure-unlocked/ustadh(master).png'),
  xp_3500: require('@/assets/images/adventure-unlocked/shaykhalilm.png'),
};

// Pre-rendered grayscale silhouettes — file names mirror the unlocked
// folder. Using purpose-built locked artwork (rather than runtime
// `opacity: 0.55` on the colored image) gives a cleaner gray-on-white
// look + lets the designer hand-tune contrast per piece.
const ACHIEVEMENT_IMAGES_LOCKED: Record<string, any> = {
  perfect_scholar: require('@/assets/images/adventure-locked/perfectscholar.png'),
  quiz_legend: require('@/assets/images/adventure-locked/quizlegend.png'),
  quiz_master: require('@/assets/images/adventure-locked/quizmaster.png'),
  first_perfect: require('@/assets/images/adventure-locked/firststeps.png'),
  century_scholar: require('@/assets/images/adventure-locked/100dayscholar.png'),
  quick_learner: require('@/assets/images/adventure-locked/quicklearner.png'),
  speed_demon: require('@/assets/images/adventure-locked/speeddemon.png'),
  week_warrior: require('@/assets/images/adventure-locked/weekwarrior.png'),
  month_master: require('@/assets/images/adventure-locked/monthmaster.png'),
  early_bird: require('@/assets/images/adventure-locked/earlybird.png'),
  night_owl: require('@/assets/images/adventure-locked/nightowl.png'),
  era_complete_umayyad: require('@/assets/images/adventure-locked/umayyadexpert.png'),
  era_complete_women_of_islam: require('@/assets/images/adventure-locked/womenofislam.png'),
  era_complete_roi: require('@/assets/images/adventure-locked/riseofislam.png'),
  xp_100: require('@/assets/images/adventure-locked/talib(seeker).png'),
  xp_250: require('@/assets/images/adventure-locked/daris(student).png'),
  xp_500: require('@/assets/images/adventure-locked/alim(scholar).png'),
  xp_1000: require('@/assets/images/adventure-locked/hakim(sage).png'),
  xp_2000: require('@/assets/images/adventure-locked/ustadh(master).png'),
  xp_3500: require('@/assets/images/adventure-locked/shaykhalilm.png'),
};

const getAchievementImage = (id: string, isUnlocked: boolean) =>
  isUnlocked ? ACHIEVEMENT_IMAGES[id] : ACHIEVEMENT_IMAGES_LOCKED[id];

// ──────────────────────────────────────────────
// Grid order (matches Figma layout)
// ──────────────────────────────────────────────

interface GridItem {
  id: string;
  label: string;
}

const GRID_ORDER: GridItem[] = [
  { id: 'perfect_scholar', label: 'Perfect Scholar' },
  { id: 'quiz_legend', label: 'Quiz Legend' },
  { id: 'quiz_master', label: 'Quiz Master' },
  { id: 'first_perfect', label: 'First Steps' },
  { id: 'century_scholar', label: '100 Day Scholar' },
  { id: 'quick_learner', label: 'Quick Learner' },
  { id: 'speed_demon', label: 'Speed Demon' },
  { id: 'week_warrior', label: 'Week Warrior' },
  { id: 'month_master', label: 'Month Master' },
  { id: 'early_bird', label: 'Early Bird' },
  { id: 'night_owl', label: 'Night Owl' },
  { id: 'era_complete_umayyad', label: 'Umayyad' },
  { id: 'era_complete_women_of_islam', label: 'Women of Islam' },
  { id: 'era_complete_roi', label: 'Rise of Islam' },
  { id: 'xp_100', label: 'Talib (Seeker)' },
  { id: 'xp_250', label: 'Daris (Student)' },
  { id: 'xp_500', label: 'Alim (Scholar)' },
  { id: 'xp_1000', label: 'Hakim (Sage)' },
  { id: 'xp_2000', label: 'Ustadh (Master)' },
  { id: 'xp_3500', label: 'Shaykh al-Ilm' },
];

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

// Grid sizing — Figma artboard is 393px (iPhone 16 Pro). Cell width is
// derived from the actual screen so 3 columns + the explicit 16px
// column gap always fit. On the design width (393pt) this resolves to
// the spec's 107pt cells; on iPhone SE/13 mini (375pt) it shrinks to
// ~101pt, preserving the 3-column layout instead of overflow-wrapping.
const GRID_H_PADDING = 20;
const ROW_GAP = 28;
const COL_GAP = 16;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_WIDTH = Math.floor(
  (SCREEN_WIDTH - GRID_H_PADDING * 2 - COL_GAP * 2) / 3,
);
const IMAGE_SIZE = 96;
const IMAGE_BORDER_RADIUS = 8;

const HEADER_HEIGHT = 56;

const HEADER_TEXT_COLOR = '#8c8c94';
const DIVIDER_COLOR = '#ebebf0';
const UNLOCKED_TEXT_COLOR = '#1a1a1a';
const LOCKED_TEXT_COLOR = '#9e9ea3';

// ──────────────────────────────────────────────
// AchievementTile — pressable with scale feedback
// ──────────────────────────────────────────────

// AchievementTile takes `onSelect(item)` instead of `onPress: () => ...`
// so the parent can pass a stable handler — same memo-friendly pattern
// as MonthlyBadgesScreen's BadgeTile. With 20 tiles, the per-row
// lambda allocation otherwise dominates re-render cost.
function AchievementTileImpl({
  item,
  isUnlocked,
  image,
  onSelect,
}: {
  item: GridItem;
  isUnlocked: boolean;
  image: any;
  onSelect: (item: GridItem) => void;
}) {
  const imgScale = useSharedValue(1);
  const imgY = useSharedValue(0);
  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: imgY.value }, { scale: imgScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    imgY.value = withTiming(-3, { duration: safeDuration(160) });
    imgScale.value = withTiming(1.04, { duration: safeDuration(160) });
  }, [imgY, imgScale]);
  const handlePressOut = useCallback(() => {
    imgY.value = withSpring(0, { damping: 12, stiffness: 200 });
    imgScale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, [imgY, imgScale]);
  const handlePress = useCallback(() => onSelect(item), [item, onSelect]);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <View style={styles.cell}>
        <Animated.View style={imgStyle}>
          <Image source={image} style={styles.image} resizeMode="contain" />
        </Animated.View>
        <Typography
          family="onest"
          size={14}
          weight="600"
          extraColor={isUnlocked ? UNLOCKED_TEXT_COLOR : LOCKED_TEXT_COLOR}
          align="center"
          style={styles.label}
        >
          {item.label}
        </Typography>
      </View>
    </Pressable>
  );
}

const AchievementTile = React.memo(AchievementTileImpl);

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function AchievementsScreen({ visible, onClose }: AchievementsScreenProps) {
  const insets = useSafeAreaInsets();
  const { achievements } = useGamificationOrchestrator();
  const [selected, setSelected] = useState<SelectedAchievement | null>(null);

  const unlockedMap = useMemo(() => {
    const map = new Map<string, { unlocked: boolean; unlockedAt?: string; description: string }>();
    for (const a of achievements) {
      map.set(a.id, {
        unlocked: a.unlocked,
        unlockedAt: a.unlockedAt,
        description: a.description,
      });
    }
    return map;
  }, [achievements]);

  const handleTileTap = useCallback(
    (item: GridItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const data = unlockedMap.get(item.id);
      const isUnlocked = data?.unlocked ?? false;
      setSelected({
        id: item.id,
        label: item.label,
        description: data?.description || '',
        isUnlocked,
        unlockedAt: data?.unlockedAt,
        image: getAchievementImage(item.id, isUnlocked),
      });
    },
    [unlockedMap],
  );

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const handleClosePreview = useCallback(() => setSelected(null), []);

  // Memoize the array literal — inline `[styles.safeArea, { paddingTop:
  // insets.top }]` would allocate a new array each render and force
  // View to diff style props.
  const safeAreaStyle = useMemo(
    () => [styles.safeArea, { paddingTop: insets.top }],
    [insets.top],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={safeAreaStyle}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color={HEADER_TEXT_COLOR} />
          </TouchableOpacity>

          <Typography
            family="bounded"
            size={20}
            weight="600"
            extraColor={HEADER_TEXT_COLOR}
            align="center"
            style={styles.headerTitle}
          >
            Achievements
          </Typography>

          <View style={styles.headerSpacer} />
        </View>

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Grid ── */}
        <Animated.ScrollView
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          // Android scroll perf: with 20 tiles each running a
          // Reanimated press-feedback worklet, off-screen tile cleanup
          // is a real win during fast scroll. ScrollEventThrottle 16
          // = 60fps; default 0 fires every native frame.
          removeClippedSubviews={Platform.OS === 'android'}
          scrollEventThrottle={16}
          overScrollMode={Platform.OS === 'android' ? 'never' : 'auto'}
        >
          <StaggerGroup preset="fadeScale" baseDelay={200} staggerInterval={60}>
            {GRID_ORDER.map((item) => {
              const data = unlockedMap.get(item.id);
              const isUnlocked = data?.unlocked ?? false;
              const image = getAchievementImage(item.id, isUnlocked);

              return (
                <AchievementTile
                  key={item.id}
                  item={item}
                  isUnlocked={isUnlocked}
                  image={image}
                  onSelect={handleTileTap}
                />
              );
            })}
          </StaggerGroup>
        </Animated.ScrollView>

        {/* ── Detail Card ── */}
        <AchievementDetailCard
          visible={!!selected}
          onClose={handleClosePreview}
          image={selected?.image}
          title={selected?.label || ''}
          description={selected?.description}
          unlocked={!!selected?.isUnlocked}
          unlockedAt={selected?.unlockedAt}
        />
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
  },
  headerSpacer: {
    width: 32,
    height: 32,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER_COLOR,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_H_PADDING,
    paddingTop: 24,
    paddingBottom: 40,
    // Split gap into row + column so vertical (28) ≠ horizontal (16) —
    // single `gap` would force both axes to the same value.
    rowGap: ROW_GAP,
    columnGap: COL_GAP,
  },
  cell: {
    width: CELL_WIDTH,
    alignItems: 'center',
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: IMAGE_BORDER_RADIUS,
  },
  label: {
    marginTop: 8,
    width: CELL_WIDTH,
  },
});
