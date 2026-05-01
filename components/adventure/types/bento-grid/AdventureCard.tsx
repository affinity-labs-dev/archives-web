// AdventureCard.tsx - Adventure detail modal (v5.0 Design System)
// Displays adventure info from card_content JSONB field with v5.0 styling

import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AnimatedCountUp, Typography, DepthButton, ScrollFade, easings } from '@/components/ui';
import { colors, spacing, radius } from '@/components/ui/theme';
import { AnimatedEntrance } from '@/components/ui/animations';
import type { Adventure } from '@/components/shared/types';

// Mapping to existing design playground presets:
// heroImage → fadeScale, overlay → fadeIn, ribbon → bubblePop
// title → slideFromBottom, headings/body → fadeIn
// detailsCard → accordionLayer, icons → bubblePop, labels → fadeIn
// startButton → slideFromBottom

interface AdventureCardProps {
  isVisible: boolean;
  adventure: Adventure | null;
  onDismiss: () => void;
  onStartAdventure?: (adventure: Adventure) => void;
}

export default function AdventureCard({
  isVisible,
  adventure,
  onDismiss,
  onStartAdventure,
}: AdventureCardProps) {
  const insets = useSafeAreaInsets();

  if (!adventure || !adventure.card_content) {
    return null;
  }

  const cardContent = adventure.card_content;

  // Calculate modules count from content_list
  const modulesCount = adventure.content_list?.length || 0;

  // Calculate XP reward: total questions x 10 XP per correct answer
  const totalQuestions = adventure.content_list?.reduce((sum, item) =>
    sum + (item.questions?.length || 0), 0) || 0;
  const xpReward = totalQuestions * 10;

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={Platform.OS === 'ios'}
          bounces={Platform.OS === 'ios'}
        >
          {/* Hero Header Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroImageContainer}>
              {/* Hero image: scale 1.08->1, 900ms, 0ms delay */}
              <AnimatedEntrance preset="fadeScale" delay={0} style={styles.heroImageAnimWrapper}>
                <Image
                  source={{ uri: cardContent.background_image }}
                  style={styles.heroImage}
                  contentFit="cover"
                  placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
                  transition={300}
                />
              </AnimatedEntrance>

              {/* Swipe indicator bar */}
              <View style={styles.swipeIndicator} />

              {/* Close button for Android */}
              {Platform.OS === 'android' && (
                <TouchableOpacity style={styles.androidCloseButton} onPress={handleClose}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              )}

              {/* Dark overlay: opacity, 500ms, 200ms delay */}
              <AnimatedEntrance preset="fadeIn" delay={200} style={styles.heroOverlayAnimWrapper}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.heroOverlay}
                />
              </AnimatedEntrance>

              {/* Header Content */}
              <View style={styles.heroContent}>
                <View style={styles.spacer} />

                <View style={styles.titleSection}>
                  {/* Era Badge: y 20->0, scale 0.8->1, 500ms, 400ms delay */}
                  <AnimatedEntrance preset="bubblePop" delay={400}>
                    <View style={styles.eraBadge}>
                      <Typography variant="label.xs" color="white" weight="700" uppercase letterSpacing={0.5}>
                        {cardContent.era_name}, Adventure {adventure.order_by}
                      </Typography>
                    </View>
                  </AnimatedEntrance>

                  {/* Adventure Title: y -18->0, 550ms, 550ms delay (stagger 40ms per word) */}
                  <AnimatedEntrance preset="slideFromBottom" delay={550}>
                    <Typography
                      variant="display.small"
                      color="white"
                      align="center"
                      style={styles.adventureTitleStyle}
                    >
                      {adventure.adventure_title}
                    </Typography>
                  </AnimatedEntrance>
                </View>
              </View>
            </View>
          </View>

          {/* Content Section */}
          <View style={styles.contentSection}>
            {/* Overview */}
            <View style={styles.sectionContainer}>
              {/* Overview heading: y 12->0, 300ms, 800ms delay */}
              <AnimatedEntrance preset="fadeIn" delay={800}>
                <Typography variant="heading.s" color="onyx">
                  Overview
                </Typography>
              </AnimatedEntrance>
              {/* Overview body: y 8->0, 400ms, 900ms delay */}
              <AnimatedEntrance preset="fadeIn" delay={900}>
                <Typography variant="body.m" color="textPrimary" weight="500">
                  {cardContent.overview_text}
                </Typography>
              </AnimatedEntrance>
            </View>

            {/* Adventure Story */}
            <View style={styles.sectionContainer}>
              {/* Story heading: y 12->0, 300ms, 1100ms delay */}
              <AnimatedEntrance preset="fadeIn" delay={1100}>
                <Typography variant="heading.s" color="onyx">
                  Adventure Story
                </Typography>
              </AnimatedEntrance>
              {/* Story body: y 8->0, 400ms, 1200ms delay */}
              <AnimatedEntrance preset="fadeIn" delay={1200}>
                <Typography variant="body.m" color="textPrimary" weight="500">
                  {cardContent.adventure_story}
                </Typography>
              </AnimatedEntrance>
            </View>

            {/* Details Card: y 40->0, 500ms, 1400ms delay */}
            <AnimatedEntrance preset="accordionLayer" delay={1400}>
              <View style={styles.detailsCard}>
                <Typography variant="heading.m" color="white">
                  Details
                </Typography>

                <View style={styles.detailsRow}>
                  {/* Time - icon: 1650ms, label: 1850ms */}
                  <View style={styles.detailItem}>
                    <View style={{ alignItems: 'center' }}>
                      <AnimatedEntrance preset="bubblePop" delay={1650}>
                        <Ionicons name="time" size={28} color={colors.snow} />
                      </AnimatedEntrance>
                      <AnimatedEntrance preset="fadeIn" delay={1850}>
                        <Typography variant="body.l" color="snow" weight="700">
                          {cardContent.estimated_time}
                        </Typography>
                      </AnimatedEntrance>
                    </View>
                    <AnimatedEntrance preset="fadeIn" delay={1850}>
                      <Typography variant="label.xs" color="blueSecondary" weight="500">
                        Duration
                      </Typography>
                    </AnimatedEntrance>
                  </View>

                  {/* XP Reward - icon: 1730ms (80ms stagger), label: 1850ms */}
                  <View style={styles.detailItem}>
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <AnimatedEntrance preset="bubblePop" delay={1730}>
                        <Ionicons name="star" size={28} color={colors.snow} />
                      </AnimatedEntrance>
                      <AnimatedEntrance preset="fadeIn" delay={1850}>
                        <AnimatedCountUp
                          target={xpReward}
                          duration={800}
                          delay={1700}
                          prefix="+"
                          style={styles.detailValue}
                        />
                      </AnimatedEntrance>
                    </View>
                    <AnimatedEntrance preset="fadeIn" delay={1850}>
                      <Typography variant="label.xs" color="blueSecondary" weight="500">
                        XP Reward
                      </Typography>
                    </AnimatedEntrance>
                  </View>

                  {/* Modules Count - icon: 1810ms (160ms stagger), label: 1850ms */}
                  <View style={styles.detailItem}>
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <AnimatedEntrance preset="bubblePop" delay={1810}>
                        <Ionicons name="book" size={28} color={colors.snow} />
                      </AnimatedEntrance>
                      <AnimatedEntrance preset="fadeIn" delay={1850}>
                        <AnimatedCountUp
                          target={modulesCount}
                          duration={800}
                          delay={1700}
                          style={styles.detailValue}
                        />
                      </AnimatedEntrance>
                    </View>
                    <AnimatedEntrance preset="fadeIn" delay={1850}>
                      <Typography variant="label.xs" color="blueSecondary" weight="500">
                        Modules
                      </Typography>
                    </AnimatedEntrance>
                  </View>
                </View>
              </View>
            </AnimatedEntrance>
          </View>
        </Animated.ScrollView>

        {/* START ADVENTURE — full-bleed bottom bar, matches the
            today.tsx Start-My-Day pattern: snow background bar pinned to
            bottom, secondary DepthButton, label.m typography. Inline
            entrance preset (translateY 40→0 + opacity 0→1, 500ms with a
            light back.out(2) overshoot at the end) ports the same
            wave-finish reveal used on the home screen. */}
        <AnimatedEntrance
          delay={2150}
          preset={{
            translateY: { from: 40, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 500,
            easing: easings.backOut2,
          }}
          style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + (Platform.OS === 'android' ? 16 : 0) }]}
        >
          {/* Soft fade-out — masks the hard horizontal edge where the
              ScrollView's last visible content meets the snow bar. The
              `left/right: -20` overrides bleed past the container's
              `paddingHorizontal: 20` so the gradient extends edge-to-edge
              (RN absolute positioning honors the padding edge by default). */}
          <ScrollFade color={colors.snow} style={{ left: -20, right: -20 }} />
          <DepthButton
            isFullWidth
            variant="tertiary"
            pressEffect="dip"
            onPress={() => {
              if (onStartAdventure && adventure) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onStartAdventure(adventure);
              } else {
                handleClose();
              }
            }}
          >
            <Typography variant="label.m" color="white">
              START ADVENTURE
            </Typography>
          </DepthButton>
        </AnimatedEntrance>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },

  // Hero Section
  heroSection: {},
  heroImageContainer: {
    height: 280,
    position: 'relative',
  },
  heroImageAnimWrapper: {
    width: '100%',
    height: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  swipeIndicator: {
    position: 'absolute',
    top: 12,
    left: '50%',
    marginLeft: -35,
    width: 70,
    height: 5,
    backgroundColor: 'rgba(195, 195, 195, 1)',
    borderRadius: 2.5,
    zIndex: 2,
  },
  androidCloseButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  heroOverlayAnimWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroOverlay: {
    width: '100%',
    height: '100%',
  },
  heroContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  spacer: {
    flex: 1,
  },
  titleSection: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  eraBadge: {
    backgroundColor: colors.bluePrimary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  adventureTitleStyle: {
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Content Section
  contentSection: {
    paddingTop: spacing.xl,
  },
  sectionContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm + 4,
  },

  // Details Card - light blue background
  detailsCard: {
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bluePrimary,
    borderRadius: radius.xl,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Match Typography variant="body.l" color="onyx" weight="700"
  detailValue: {
    color: colors.snow,
    fontFamily: 'Onest-Bold',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 25,
  },

  // Bottom button — full-bleed bar pinned to the bottom edge of the
  // SafeAreaView. Matches `ArchivesTheme.common.today.bottomButtonContainer`
  // used by today.tsx so both Start-My-Day and Start-Adventure CTAs share
  // the same visual footprint (snow bar, paddingHorizontal 20 / Vertical 16,
  // button stretches via `isFullWidth`).
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: colors.snow,
  },
});
