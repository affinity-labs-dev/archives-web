/**
 * AvatarSelectorSheet — bottom-sheet avatar picker.
 *
 * Opens when the pencil edit badge on the profile avatar is tapped.
 * User taps a tile to preview (hero crossfades), taps Save to commit.
 * Dismissing via backdrop, X, or Android back discards the preview.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { AnimatedEntrance } from '@/components/ui/animations/AnimatedEntrance';
import { DepthButton } from '@/components/ui/DepthButton';
import { Typography } from '@/components/ui/Typography';
import { colors, easings, safeDuration } from '@/components/ui/theme';

import { iconCloseX, svgIcon } from './settings/icons';

// ── Avatar data ────────────────────────────────────────────────────────

interface AvatarDatum {
  id: string;
  name: string;
  title: string;
  image: ReturnType<typeof require>;
}

const AVATARS: AvatarDatum[] = [
  { id: 'architect', name: 'Fatima al-Fihri', title: 'Founder of al-Qarawiyyin', image: require('@/assets/images/profile/avatars/av-01-architect.png') },
  { id: 'musician', name: 'Ziryab', title: 'Polymath of al-Andalus', image: require('@/assets/images/profile/avatars/av-02-musician.png') },
  { id: 'lamplighter', name: 'Al-Ghazali', title: 'The Proof of Islam', image: require('@/assets/images/profile/avatars/av-03-lamplighter.png') },
  { id: 'reader', name: 'Al-Khwarizmi', title: 'Father of Algebra', image: require('@/assets/images/profile/avatars/av-04-reader.png') },
  { id: 'explorer', name: 'Ibn Battuta', title: 'The Great Traveller', image: require('@/assets/images/profile/avatars/av-05-explorer.png') },
  { id: 'physician', name: 'Ibn Sina', title: 'Author of the Canon of Medicine', image: require('@/assets/images/profile/avatars/av-06-physician.png') },
  { id: 'elder', name: 'Al-Razi', title: 'Pioneer of Clinical Medicine', image: require('@/assets/images/profile/avatars/av-07-elder.png') },
  { id: 'apothecary', name: 'Al-Zahrawi', title: 'Father of Modern Surgery', image: require('@/assets/images/profile/avatars/av-08-apothecary.png') },
  { id: 'merchant', name: 'Al-Masudi', title: 'Herodotus of the Arabs', image: require('@/assets/images/profile/avatars/av-09-merchant.png') },
  { id: 'librarian', name: 'Ibn al-Nadim', title: 'Keeper of the Fihrist', image: require('@/assets/images/profile/avatars/av-10-librarian.png') },
  { id: 'teacher', name: 'Al-Farabi', title: 'The Second Teacher', image: require('@/assets/images/profile/avatars/av-11-teacher.png') },
  { id: 'astronomer', name: 'Al-Biruni', title: 'Pioneer of Astronomy', image: require('@/assets/images/profile/avatars/av-12-astronomer.png') },
  { id: 'cartographer', name: 'Al-Idrisi', title: 'Mapmaker of the World', image: require('@/assets/images/profile/avatars/av-13-cartographer.png') },
  { id: 'scribe', name: 'Ibn al-Bawwab', title: 'Master Calligrapher', image: require('@/assets/images/profile/avatars/av-14-scribe.png') },
  { id: 'inventor', name: 'Al-Jazari', title: 'Engineer of Ingenious Devices', image: require('@/assets/images/profile/avatars/av-15-inventor.png') },
  { id: 'poet', name: 'Rumi', title: 'The Poet of the Heart', image: require('@/assets/images/profile/avatars/av-16-poet.png') },
  { id: 'storyteller', name: 'Al-Jahiz', title: 'Master of Arabic Prose', image: require('@/assets/images/profile/avatars/av-17-storyteller.png') },
  { id: 'navigator', name: 'Ibn Majid', title: 'Lion of the Sea', image: require('@/assets/images/profile/avatars/av-18-navigator.png') },
  { id: 'scholar', name: 'Aisha bint Abi Bakr', title: 'Mother of the Believers', image: require('@/assets/images/profile/avatars/av-19-scholar.png') },
];

const AVATAR_BY_ID = new Map(AVATARS.map((a) => [a.id, a]));

// ── Props ──────────────────────────────────────────────────────────────

export interface AvatarSelectorSheetProps {
  visible: boolean;
  onClose: () => void;
  currentAvatarId: string | null;
  onSave: (avatarId: string) => void;
}

// ── Dimensions & constants ─────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 4;
const GRID_GAP = 12;
const GRID_HORIZONTAL_PAD = 20;
const TILE_SIZE = (SCREEN_WIDTH - GRID_HORIZONTAL_PAD * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

const SHEET_TOP = 72;

const BACKDROP_COLOR = 'rgba(26, 26, 26, 0.62)';

// Easing: back.out(1.4) for sheet slide
const SHEET_EASING = easings.backOut14;
// Easing: back.out(1.6) for save button
const SAVE_EASING = Easing.bezier(0.175, 0.885, 0.32, 1.2);

// ── Component ──────────────────────────────────────────────────────────

export function AvatarSelectorSheet({
  visible,
  onClose,
  currentAvatarId,
  onSave,
}: AvatarSelectorSheetProps) {
  const insets = useSafeAreaInsets();

  // Pending preview — does NOT commit until Save
  const [previewId, setPreviewId] = useState<string>(currentAvatarId ?? AVATARS[0].id);

  // Track pressed tile for scale feedback
  const [pressedTileId, setPressedTileId] = useState<string | null>(null);

  // Reset preview when sheet opens with a new avatar
  useEffect(() => {
    if (visible) {
      setPreviewId(currentAvatarId ?? AVATARS[0].id);
    }
  }, [visible, currentAvatarId]);

  // Derived preview avatar data
  const previewAvatar = useMemo(
    () => AVATAR_BY_ID.get(previewId) ?? AVATARS[0],
    [previewId],
  );

  // ── Manual sheet animation (matches SettingsSheet transparent pattern) ──

  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SCREEN_WIDTH * 3); // start off-screen
  const saveTranslateY = useSharedValue(20);
  const saveOpacity = useSharedValue(0);

  // Track whether the component is fully showing (for render gating)
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsShowing(true);
      // Backdrop fade in
      backdropOpacity.value = withTiming(1, { duration: safeDuration(350), easing: easings.power2Out });
      // Sheet slide up
      sheetTranslateY.value = withTiming(0, {
        duration: safeDuration(550),
        easing: SHEET_EASING,
      });
      // Save button delayed entrance
      saveOpacity.value = withDelay(
        safeDuration(700),
        withTiming(1, { duration: safeDuration(400), easing: easings.power2Out }),
      );
      saveTranslateY.value = withDelay(
        safeDuration(700),
        withTiming(0, { duration: safeDuration(400), easing: SAVE_EASING }),
      );
    } else {
      // Exit
      backdropOpacity.value = withTiming(0, { duration: safeDuration(250), easing: easings.power2In });
      sheetTranslateY.value = withTiming(
        SCREEN_WIDTH * 3,
        { duration: safeDuration(300), easing: easings.power2In },
        (finished) => {
          if (finished) runOnJS(setIsShowing)(false);
        },
      );
      saveOpacity.value = 0;
      saveTranslateY.value = 20;
    }
  }, [visible, backdropOpacity, sheetTranslateY, saveOpacity, saveTranslateY]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const saveAnimatedStyle = useAnimatedStyle(() => ({
    opacity: saveOpacity.value,
    transform: [{ translateY: saveTranslateY.value }],
  }));

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleTilePress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreviewId(id);
  }, []);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave(previewId);
    onClose();
  }, [previewId, onSave, onClose]);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  // ── Grid tile renderer ───────────────────────────────────────────────

  const flatListRef = useRef<FlatList>(null);

  const renderTile = useCallback(
    ({ item }: { item: AvatarDatum }) => {
      const isSelected = item.id === previewId;
      const isPressed = item.id === pressedTileId;
      return (
        <Pressable
          onPress={() => handleTilePress(item.id)}
          onPressIn={() => setPressedTileId(item.id)}
          onPressOut={() => setPressedTileId(null)}
          style={[
            styles.tile,
            { width: TILE_SIZE },
            isPressed && styles.tilePressed,
          ]}
        >
          <View style={{ position: 'relative', width: TILE_SIZE, height: TILE_SIZE }}>
            <View style={[styles.tileImageWrapper, { width: TILE_SIZE, height: TILE_SIZE }]}>
              <Image source={item.image} style={styles.tileImage} />
              {isSelected && <View style={styles.selectedRing} />}
            </View>
            {isSelected && (
              <View style={styles.checkBadge}>
                <Typography family="onest" size={12} weight="bold" color="white">
                  {'\u2713'}
                </Typography>
              </View>
            )}
          </View>
          <Typography
            family="onest"
            size={12}
            weight="600"
            color="onyx"
            align="center"
            numberOfLines={1}
            style={styles.tileName}
          >
            {item.name}
          </Typography>
        </Pressable>
      );
    },
    [previewId, pressedTileId, handleTilePress],
  );

  const keyExtractor = useCallback((item: AvatarDatum) => item.id, []);

  const columnWrapperStyle = useMemo(
    () => ({ gap: GRID_GAP }),
    [],
  );

  // ── Render ───────────────────────────────────────────────────────────

  if (!isShowing && !visible) return null;

  return (
    <Modal
      visible={isShowing || visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { top: SHEET_TOP, paddingBottom: insets.bottom + 16 },
          sheetAnimatedStyle,
        ]}
      >
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Close X */}
        <AnimatedEntrance
          preset={{
            scale: { from: 0.85, to: 1 },
            rotate: { from: -15, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 450,
            easing: easings.backOut17,
          }}
          delay={300}
          style={styles.closeButtonWrapper}
        >
          <Pressable
            onPress={handleDismiss}
            hitSlop={12}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close avatar selector"
          >
            {svgIcon(iconCloseX(colors.bluePrimary), 36, 36)}
          </Pressable>
        </AnimatedEntrance>

        {/* Hero preview */}
        <View style={styles.heroSection}>
          <View style={styles.heroRing}>
            <Image source={previewAvatar.image} style={styles.heroImage} />
          </View>
          <Typography
            family="onest"
            size={22}
            weight="bold"
            style={styles.heroName}
          >
            {previewAvatar.name}
          </Typography>
          <Typography
            family="onest"
            size={13}
            weight="500"
            style={styles.heroTitle}
          >
            {previewAvatar.title}
          </Typography>
        </View>

        {/* Grid */}
        <FlatList
          ref={flatListRef}
          data={AVATARS}
          renderItem={renderTile}
          keyExtractor={keyExtractor}
          numColumns={GRID_COLUMNS}
          columnWrapperStyle={columnWrapperStyle}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: 80 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={GridRowSeparator}
        />

        {/* Save button — pinned to bottom */}
        <Animated.View style={[styles.saveWrapper, { bottom: insets.bottom + 16 }, saveAnimatedStyle]}>
          <DepthButton
            variant="tertiary"
            size="large"
            onPress={handleSave}
          >
            <Typography
              family="onest"
              size={18}
              weight="bold"
              color="snow"
              uppercase
            >
              SAVE
            </Typography>
          </DepthButton>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Grid row separator ─────────────────────────────────────────────────

function GridRowSeparator() {
  return <View style={styles.gridRowGap} />;
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BACKDROP_COLOR,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.snow,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  dragHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(26, 26, 26, 0.18)',
    marginTop: 12,
    marginBottom: 4,
  },
  closeButtonWrapper: {
    position: 'absolute',
    top: 28,
    left: 18,
    zIndex: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 4,
    elevation: 2,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 70,
    paddingBottom: 14,
  },
  heroRing: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: colors.acaiSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    shadowColor: colors.acaiSecondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  heroImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  heroName: {
    marginTop: 12,
    color: '#4D392E',
  },
  heroTitle: {
    marginTop: 4,
    color: 'rgba(26, 26, 26, 0.6)',
  },
  gridContent: {
    paddingHorizontal: GRID_HORIZONTAL_PAD,
    paddingTop: 8,
  },
  gridRowGap: {
    height: GRID_GAP,
  },
  tile: {
    alignItems: 'center',
  },
  tilePressed: {
    transform: [{ scale: 0.92 }],
  },
  tileImageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F0ECF6',
  },
  tileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  selectedRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.acaiSecondary,
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.acaiSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: {
    marginTop: 6,
    width: '100%',
  },
  saveWrapper: {
    position: 'absolute',
    left: GRID_HORIZONTAL_PAD,
    right: GRID_HORIZONTAL_PAD,
  },
});
