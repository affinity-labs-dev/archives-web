import React from 'react';
import {
  Image,
  type ImageSourcePropType,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedEntrance } from '@/components/ui/animations/AnimatedEntrance';
import { StaggerGroup } from '@/components/ui/animations/StaggerGroup';
import { Typography } from '@/components/ui/Typography';
import { colors, easings } from '@/components/ui/theme';
import { GrayscaleImage } from '@/gamification/ui/achievement/GrayscaleImage';

// Hero image dims — bleeds `IMAGE_H - IMAGE_OVERHANG` (= 60px) into the
// top of the card body. Card `paddingTop: 80` then leaves a 20px gap
// between image bottom and the title.
const IMAGE_W = 180;
const IMAGE_H = 170;
const IMAGE_OVERHANG = 110;

const UNLOCKED_TEXT_COLOR = '#1a1a1a';
const LOCKED_TEXT_COLOR = '#9e9ea3';

interface AchievementDetailCardProps {
  visible: boolean;
  onClose: () => void;
  image: ImageSourcePropType;
  title: string;
  description?: string;
  unlocked: boolean;
  /** ISO date string for the unlocked-on pill. Renders only when unlocked. */
  unlockedAt?: string | null;
  /**
   * Image opacity when locked. Defaults to 1 (no dim). The full
   * Achievements grid passes pre-rendered locked artwork directly so
   * doesn't need this; monthly badges have a single colored asset and
   * use `useGrayscaleWhenLocked` instead.
   */
  lockedImageOpacity?: number;
  /**
   * When true and `unlocked === false`, render the image through
   * `GrayscaleImage` (SVG color-matrix filter) so the locked state is
   * shown desaturated instead of in full color. Used by monthly-badge
   * previews where the asset is a single colored png. The achievements
   * grid uses pre-rendered locked artwork instead, so leaves this off.
   */
  useGrayscaleWhenLocked?: boolean;
}

// Shared overlay for the achievement / monthly-badge / single-tile
// previews. Three call-sites used to duplicate ~80 lines of identical
// Modal/gradient/pill markup; folding them into one component locks
// the close-button position, gradient stops, and pill colors together.
export function AchievementDetailCard({
  visible,
  onClose,
  image,
  title,
  description,
  unlocked,
  unlockedAt,
  lockedImageOpacity = 1,
  useGrayscaleWhenLocked = false,
}: AchievementDetailCardProps) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <AnimatedEntrance preset="fadeIn" delay={0}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <View />
        </Pressable>
      </AnimatedEntrance>
      <View style={styles.center} pointerEvents="box-none">
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
          <View style={styles.cardOuter}>
            <TouchableOpacity
              style={styles.close}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.6}
            >
              <Ionicons name="close" size={22} color="#000" />
            </TouchableOpacity>

            <LinearGradient
              colors={unlocked ? ['#FFDD63', '#FFFFFF'] : ['#C3C3C3', '#FFFFFF']}
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.7, y: 0.6 }}
              style={styles.card}
              pointerEvents="box-none"
            >
              {/* Cascade timing matches the mock at
                  ~/Downloads/05 profile and settings/index.html — title at
                  350ms, sub at 450ms, pills at 550ms with 80ms stagger
                  between pills (back.out(1.5) for the pill bounce). */}
              <AnimatedEntrance
                preset={{
                  translateY: { from: 12, to: 0 },
                  opacity: { from: 0, to: 1 },
                  duration: 400,
                  easing: easings.power2Out,
                }}
                delay={350}
              >
                <Typography
                  family="onest"
                  size={28}
                  weight="700"
                  extraColor={unlocked ? UNLOCKED_TEXT_COLOR : LOCKED_TEXT_COLOR}
                  style={{ marginBottom: 10, lineHeight: 30 }}
                >
                  {title}
                </Typography>
              </AnimatedEntrance>
              {description ? (
                <AnimatedEntrance
                  preset={{
                    translateY: { from: 10, to: 0 },
                    opacity: { from: 0, to: 1 },
                    duration: 400,
                    easing: easings.power2Out,
                  }}
                  delay={450}
                >
                  <Typography
                    family="onest"
                    size={16}
                    weight="600"
                    extraColor={unlocked ? '#1D1D1D' : LOCKED_TEXT_COLOR}
                    style={{ marginBottom: 18, lineHeight: 20 }}
                  >
                    {description}
                  </Typography>
                </AnimatedEntrance>
              ) : null}
              <View style={styles.pills}>
              <StaggerGroup
                preset={{
                  translateY: { from: 14, to: 0 },
                  opacity: { from: 0, to: 1 },
                  duration: 400,
                  easing: easings.backOut15,
                }}
                baseDelay={550}
                staggerInterval={80}
              >
                {unlocked ? (
                  [
                    <View
                      key="unlocked-pill"
                      style={[
                        styles.pill,
                        { backgroundColor: colors.pinkSecondary },
                      ]}
                    >
                      <Ionicons name="checkmark" size={14} color="#fff" />
                      <Typography family="onest" size={12} weight="600" color="snow">
                        Unlocked
                      </Typography>
                    </View>,
                    unlockedAt ? (
                      <View
                        key="date-pill"
                        style={[
                          styles.pill,
                          { backgroundColor: colors.acaiSecondary },
                        ]}
                      >
                        <Typography
                          family="onest"
                          size={12}
                          weight="600"
                          color="snow"
                        >
                          {new Date(unlockedAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Typography>
                      </View>
                    ) : null,
                  ]
                ) : (
                  <View
                    key="locked-pill"
                    style={[styles.pill, { backgroundColor: colors.bluePrimary }]}
                  >
                    <Ionicons name="lock-closed" size={14} color="#fff" />
                    <Typography family="onest" size={12} weight="600" color="snow">
                      Locked
                    </Typography>
                  </View>
                )}
              </StaggerGroup>
              </View>
            </LinearGradient>

            {/* Image rendered AFTER the gradient so it paints on top on
                BOTH iOS and Android. zIndex on normal-flow flex siblings
                is unreliable across platforms — Android ignores it for
                non-elevation views, iOS sometimes flips paint order
                under Animated wrappers. Sibling order + absolute pos is
                the only stacking primitive that's portable here. */}
            <AnimatedEntrance
              preset={{
                scale: { from: 0.75, to: 1 },
                opacity: { from: 0, to: 1 },
                translateY: { from: 20, to: 0 },
                duration: 650,
                easing: easings.backOut2,
              }}
              delay={150}
              style={styles.imageWrapper}
            >
              {useGrayscaleWhenLocked ? (
                // SVG color-matrix path — applies a true luminance
                // grayscale to the colored asset when locked.
                <GrayscaleImage
                  source={image}
                  style={styles.image}
                  width={IMAGE_W}
                  height={IMAGE_H}
                  resizeMode="contain"
                  grayscale={!unlocked}
                />
              ) : (
                <Image
                  source={image}
                  style={[
                    styles.image,
                    !unlocked && { opacity: lockedImageOpacity },
                  ]}
                  resizeMode="contain"
                />
              )}
            </AnimatedEntrance>
          </View>
        </AnimatedEntrance>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardOuter: {
    width: 328,
    alignItems: 'center',
    overflow: 'visible',
    paddingTop: IMAGE_OVERHANG,
  },
  close: {
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
  imageWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingRight: 31,
    alignItems: 'flex-end',
  },
  image: {
    width: IMAGE_W,
    height: IMAGE_H,
  },
  card: {
    width: 328,
    borderRadius: 25,
    paddingTop: 80,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  pills: {
    flexDirection: 'row',
    gap: 11,
    alignItems: 'center',
  },
  pill: {
    height: 30,
    borderRadius: 17,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
