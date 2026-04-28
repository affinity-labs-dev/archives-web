/**
 * AchievementsScreen — Full-screen modal grid of all 20 achievements.
 *
 * Tap a tile → detail card modal with gradient background, large image,
 * title, description, and unlocked/locked pills.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Typography } from '@/components/ui/Typography';
import { AnimatedEntrance } from '@/components/ui/animations/AnimatedEntrance';
import { StaggerGroup } from '@/components/ui/animations/StaggerGroup';
import { colors, safeDuration, easings } from '@/components/ui/theme';
import { useGamificationOrchestrator } from '@/gamification';

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

const GRID_H_PADDING = 20;
const ROW_GAP = 28;
const CELL_WIDTH = 107;
const IMAGE_SIZE = 96;
const IMAGE_BORDER_RADIUS = 8;

const HEADER_HEIGHT = 56;
const LOCKED_OPACITY = 0.55;

const HEADER_TEXT_COLOR = '#8c8c94';
const DIVIDER_COLOR = '#ebebf0';
const UNLOCKED_TEXT_COLOR = '#1a1a1a';
const LOCKED_TEXT_COLOR = '#9e9ea3';

// ──────────────────────────────────────────────
// AchievementTile — pressable with scale feedback
// ──────────────────────────────────────────────

function AchievementTile({
  item,
  isUnlocked,
  image,
  onPress,
}: {
  item: GridItem;
  isUnlocked: boolean;
  image: any;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withTiming(0.93, { duration: safeDuration(100) });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
      onPress={onPress}
    >
      <Animated.View style={[styles.cell, animStyle]}>
        <Image
          source={image}
          style={[styles.image, !isUnlocked && styles.imageLocked]}
          resizeMode="cover"
        />
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
      </Animated.View>
    </Pressable>
  );
}

// ──────────────────────────────────────────────
// AchievementDetailCard — modal overlay
// ──────────────────────────────────────────────

function AchievementDetailCard({
  achievement,
  onClose,
}: {
  achievement: SelectedAchievement;
  onClose: () => void;
}) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <AnimatedEntrance preset="fadeIn" delay={0}>
        <Pressable style={styles.detailBackdrop} onPress={onClose}>
          <View />
        </Pressable>
      </AnimatedEntrance>

      {/* Card */}
      <View style={styles.detailCenter} pointerEvents="box-none">
        <AnimatedEntrance
          preset={{
            translateY: { from: 40, to: 0 },
            scale: { from: 0.94, to: 1 },
            opacity: { from: 0, to: 1 },
            duration: 500,
            easing: easings.backOut14,
          }}
          delay={50}
        >
          <View style={styles.detailCardOuter}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.detailClose}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.6}
            >
              <Ionicons name="close" size={22} color="#888" />
            </TouchableOpacity>

            {/* Floating image */}
            <AnimatedEntrance
              preset={{
                scale: { from: 0.75, to: 1 },
                opacity: { from: 0, to: 1 },
                translateY: { from: 20, to: 0 },
                duration: 650,
                easing: easings.backOut2,
              }}
              delay={150}
            >
              <Image
                source={achievement.image}
                style={[
                  styles.detailImage,
                  !achievement.isUnlocked && { opacity: LOCKED_OPACITY },
                ]}
                resizeMode="contain"
              />
            </AnimatedEntrance>

            {/* Card body with gradient */}
            <LinearGradient
              colors={
                achievement.isUnlocked
                  ? ['#FFDD63', '#FFFFFF']
                  : ['#C3C3C3', '#FFFFFF']
              }
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.7, y: 0.6 }}
              style={styles.detailCard}
            >
              <AnimatedEntrance preset="fadeIn" delay={350}>
                <Typography
                  family="onest"
                  size={28}
                  weight="700"
                  extraColor={achievement.isUnlocked ? UNLOCKED_TEXT_COLOR : LOCKED_TEXT_COLOR}
                  style={{ marginBottom: 10, lineHeight: 30 }}
                >
                  {achievement.label}
                </Typography>
              </AnimatedEntrance>

              <AnimatedEntrance preset="fadeIn" delay={450}>
                <Typography
                  family="onest"
                  size={16}
                  weight="600"
                  extraColor={achievement.isUnlocked ? '#1D1D1D' : LOCKED_TEXT_COLOR}
                  style={{ marginBottom: 18, lineHeight: 20 }}
                >
                  {achievement.description}
                </Typography>
              </AnimatedEntrance>

              <AnimatedEntrance preset="fadeIn" delay={550}>
                <View style={styles.detailPills}>
                  {achievement.isUnlocked ? (
                    <>
                      <View style={[styles.detailPill, { backgroundColor: colors.pinkSecondary }]}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                        <Typography family="onest" size={12} weight="600" color="snow">
                          Unlocked
                        </Typography>
                      </View>
                      {achievement.unlockedAt && (
                        <View style={[styles.detailPill, { backgroundColor: colors.acaiSecondary }]}>
                          <Typography family="onest" size={12} weight="600" color="snow">
                            {formatDate(achievement.unlockedAt)}
                          </Typography>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={[styles.detailPill, { backgroundColor: colors.bluePrimary }]}>
                      <Ionicons name="lock-closed" size={14} color="#fff" />
                      <Typography family="onest" size={12} weight="600" color="snow">
                        Locked
                      </Typography>
                    </View>
                  )}
                </View>
              </AnimatedEntrance>
            </LinearGradient>
          </View>
        </AnimatedEntrance>
      </View>
    </Modal>
  );
}

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
      setSelected({
        id: item.id,
        label: item.label,
        description: data?.description || '',
        isUnlocked: data?.unlocked ?? false,
        unlockedAt: data?.unlockedAt,
        image: ACHIEVEMENT_IMAGES[item.id],
      });
    },
    [unlockedMap],
  );

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
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
        <ScrollView
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        >
          <StaggerGroup preset="fadeScale" baseDelay={200} staggerInterval={60}>
            {GRID_ORDER.map((item) => {
              const data = unlockedMap.get(item.id);
              const isUnlocked = data?.unlocked ?? false;
              const image = ACHIEVEMENT_IMAGES[item.id];

              return (
                <AchievementTile
                  key={item.id}
                  item={item}
                  isUnlocked={isUnlocked}
                  image={image}
                  onPress={() => handleTileTap(item)}
                />
              );
            })}
          </StaggerGroup>
        </ScrollView>

        {/* ── Detail Card ── */}
        {selected && (
          <AchievementDetailCard
            achievement={selected}
            onClose={() => setSelected(null)}
          />
        )}
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
    gap: ROW_GAP,
    justifyContent: 'space-between',
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
  imageLocked: {
    opacity: LOCKED_OPACITY,
  },
  label: {
    marginTop: 8,
    width: CELL_WIDTH,
  },

  // Detail card modal
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  detailCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCardOuter: {
    width: 328,
    alignItems: 'center',
  },
  detailClose: {
    position: 'absolute',
    top: -44,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  detailImage: {
    width: 180,
    height: 170,
    marginBottom: -60,
    zIndex: 5,
  },
  detailCard: {
    width: 328,
    borderRadius: 25,
    paddingTop: 80,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  detailPills: {
    flexDirection: 'row',
    gap: 11,
    alignItems: 'center',
  },
  detailPill: {
    height: 30,
    borderRadius: 17,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
