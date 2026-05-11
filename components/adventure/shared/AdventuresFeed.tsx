// AdventuresFeed.tsx - Bottom sheet modal showing scrollable list of adventures
// Slides up from era home screen when progress pill is tapped

import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography } from '@/components/ui';
import { colors, spacing, radius, easings } from '@/components/ui/theme';
import { AnimatedEntrance } from '@/components/ui/animations';
import type { EntranceConfig } from '@/components/ui/animations';
import type { Adventure } from '@/components/shared/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_IMAGE_WIDTH = Math.min(343, SCREEN_WIDTH - spacing.lg * 2);
const CARD_IMAGE_HEIGHT = 219;

// ─── Entrance animation configs per the HTML spec ───

/** Feed card: y 40->0, opacity, 500ms, back.out(1.4) */
const feedCardEntrance: EntranceConfig = {
  translateY: { from: 40, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 500,
  easing: easings.backOut14,
};

/** Ribbon badge: scale 0.8->1, opacity, 400ms, back.out(2) */
const ribbonBadgeEntrance: EntranceConfig = {
  scale: { from: 0.8, to: 1 },
  opacity: { from: 0, to: 1 },
  duration: 400,
  easing: easings.backOut2,
};

/** Title on hero: y 12->0, opacity, 400ms, power2.out */
const cardTitleEntrance: EntranceConfig = {
  translateY: { from: 12, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 400,
  easing: easings.power2Out,
};

/** Divider: scaleX 0->1 (approximated via opacity + translateX since Reanimated
 *  doesn't support transform-origin left easily; using opacity + width anim).
 *  400ms, power2.out */
const dividerEntrance: EntranceConfig = {
  opacity: { from: 0, to: 1 },
  duration: 400,
  easing: easings.power2Out,
};

/** Overview heading & body: y 8->0, opacity, 400ms, power2.out */
const textBlockEntrance: EntranceConfig = {
  translateY: { from: 8, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: 400,
  easing: easings.power2Out,
};

// ─── Delay calculation helpers ───

const BASE_DELAY = 200;
const STAGGER_PER_CARD = 120;

function cardDelay(index: number) {
  return BASE_DELAY + STAGGER_PER_CARD * index;
}
function ribbonDelay(index: number) {
  return 350 + STAGGER_PER_CARD * index;
}
function titleDelay(index: number) {
  return 450 + STAGGER_PER_CARD * index;
}
function dividerDelay(index: number) {
  return 600 + STAGGER_PER_CARD * index;
}
function headingDelay(index: number) {
  return 700 + STAGGER_PER_CARD * index;
}
function bodyDelay(index: number) {
  return 780 + STAGGER_PER_CARD * index; // 700 + 80ms inner stagger
}

// ─── Component ───

interface AdventuresFeedProps {
  visible: boolean;
  adventures: Adventure[];
  onDismiss: () => void;
  onAdventurePress: (adventure: Adventure) => void;
}

export default function AdventuresFeed({
  visible,
  adventures,
  onDismiss,
  onAdventurePress,
}: AdventuresFeedProps) {
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  const handleAdventurePress = (adventure: Adventure) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAdventurePress(adventure);
  };

  // Sort adventures by order_by
  const sortedAdventures = [...adventures].sort(
    (a, b) => a.order_by - b.order_by
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleClose}
      transparent={Platform.OS === 'android'}
    >
      <SafeAreaView style={styles.container}>
        {/* Swipe indicator bar */}
        <View style={styles.swipeIndicator} />

        {/* Android close button */}
        {Platform.OS === 'android' && (
          <TouchableOpacity
            style={styles.androidCloseButton}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color={colors.onyx} />
          </TouchableOpacity>
        )}

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={Platform.OS === 'ios'}
          bounces={Platform.OS === 'ios'}
        >
          {sortedAdventures.map((adventure, index) => {
            const backgroundImage = adventure.card_content?.background_image;
            const overviewText = adventure.card_content?.overview_text;
            const adventureNumber = adventure.order_by;
            const isLast = index === sortedAdventures.length - 1;

            return (
              <View key={adventure.readable_id}>
                {/* Adventure card */}
                <AnimatedEntrance
                  preset={feedCardEntrance}
                  delay={cardDelay(index)}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleAdventurePress(adventure)}
                    style={styles.cardTouchable}
                  >
                    {/* Hero image card */}
                    <View style={styles.heroImageContainer}>
                      <Image
                        source={{ uri: backgroundImage }}
                        style={styles.heroImage}
                        contentFit="cover"
                        placeholder={{
                          blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
                        }}
                        transition={300}
                      />

                      {/* Gradient overlay: transparent -> #1A1A1A */}
                      <LinearGradient
                        colors={['transparent', '#1A1A1A']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.heroGradient}
                      />

                      {/* Ribbon badge */}
                      <AnimatedEntrance
                        preset={ribbonBadgeEntrance}
                        delay={ribbonDelay(index)}
                        style={styles.ribbonPosition}
                      >
                        <View style={styles.ribbonBadge}>
                          <Typography
                            variant="label.xs"
                            color="white"
                            weight="700"
                            uppercase
                          >
                            ADVENTURE {adventureNumber}
                          </Typography>
                        </View>
                      </AnimatedEntrance>

                      {/* Adventure title */}
                      <AnimatedEntrance
                        preset={cardTitleEntrance}
                        delay={titleDelay(index)}
                        style={styles.titlePosition}
                      >
                        <Typography
                          family="bounded"
                          size={18}
                          weight="900"
                          color="white"
                          align="center"
                          uppercase
                          style={styles.adventureTitle}
                        >
                          {adventure.adventure_title}
                        </Typography>
                      </AnimatedEntrance>
                    </View>
                  </TouchableOpacity>
                </AnimatedEntrance>

                {/* Overview section */}
                <View style={styles.overviewSection}>
                  <AnimatedEntrance
                    preset={textBlockEntrance}
                    delay={headingDelay(index)}
                  >
                    <Typography
                      variant="body.l"
                      color="onyx"
                      weight="600"
                    >
                      Overview
                    </Typography>
                  </AnimatedEntrance>

                  {overviewText ? (
                    <AnimatedEntrance
                      preset={textBlockEntrance}
                      delay={bodyDelay(index)}
                    >
                      <Typography
                        variant="body.m"
                        color="onyx"
                        weight="500"
                        style={styles.overviewText}
                      >
                        {overviewText}
                      </Typography>
                    </AnimatedEntrance>
                  ) : null}
                </View>

                {/* Divider between adventures */}
                {!isLast && (
                  <AnimatedEntrance
                    preset={dividerEntrance}
                    delay={dividerDelay(index)}
                  >
                    <View style={styles.divider} />
                  </AnimatedEntrance>
                )}
              </View>
            );
          })}
        </Animated.ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  swipeIndicator: {
    alignSelf: 'center',
    width: 70,
    height: 5,
    backgroundColor: colors.concreteGrey,
    borderRadius: 2.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    zIndex: 2,
  },
  androidCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 16 : 12,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },

  // Card
  cardTouchable: {
    alignSelf: 'center',
    width: CARD_IMAGE_WIDTH,
  },
  heroImageContainer: {
    width: CARD_IMAGE_WIDTH,
    height: CARD_IMAGE_HEIGHT,
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },

  // Ribbon badge
  ribbonPosition: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  ribbonBadge: {
    backgroundColor: colors.bluePrimary,
    borderRadius: 16.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },

  // Title
  titlePosition: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
  },
  adventureTitle: {
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Overview
  overviewSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  overviewText: {
    lineHeight: 22,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#6F6F6F',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
});
