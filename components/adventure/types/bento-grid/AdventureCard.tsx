// AdventureCard.tsx - Adventure detail modal (v5.0 Design System)
// Displays adventure info from card_content JSONB field with v5.0 styling

import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, DepthButton } from '@/components/ui';
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
}

export default function AdventureCard({
  isVisible,
  adventure,
  onDismiss,
}: AdventureCardProps) {
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
                      variant="display.large"
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
                <Typography variant="heading.m" color="onyx">
                  Overview
                </Typography>
              </AnimatedEntrance>
              {/* Overview body: y 8->0, 400ms, 900ms delay */}
              <AnimatedEntrance preset="fadeIn" delay={900}>
                <Typography variant="body.m" color="textMuted" style={styles.descriptionText}>
                  {cardContent.overview_text}
                </Typography>
              </AnimatedEntrance>
            </View>

            {/* Adventure Story */}
            <View style={styles.sectionContainer}>
              {/* Story heading: y 12->0, 300ms, 1100ms delay */}
              <AnimatedEntrance preset="fadeIn" delay={1100}>
                <Typography variant="heading.m" color="onyx">
                  Adventure Story
                </Typography>
              </AnimatedEntrance>
              {/* Story body: y 8->0, 400ms, 1200ms delay */}
              <AnimatedEntrance preset="fadeIn" delay={1200}>
                <Typography variant="body.m" color="textMuted" style={styles.storyText}>
                  {cardContent.adventure_story}
                </Typography>
              </AnimatedEntrance>
            </View>

            {/* Details Card: y 40->0, 500ms, 1400ms delay */}
            <AnimatedEntrance preset="accordionLayer" delay={1400}>
              <View style={styles.detailsCard}>
                <Typography variant="heading.m" color="bluePrimary" style={styles.detailsCardTitle}>
                  Details
                </Typography>

                <View style={styles.detailsRow}>
                  {/* Time - icon: 1650ms, label: 1850ms */}
                  <View style={styles.detailItem}>
                    <AnimatedEntrance preset="bubblePop" delay={1650}>
                      <Ionicons name="time" size={24} color={colors.bluePrimary} />
                    </AnimatedEntrance>
                    <AnimatedEntrance preset="fadeIn" delay={1850}>
                      <Typography variant="body.l" color="onyx" weight="700">
                        {cardContent.estimated_time}
                      </Typography>
                    </AnimatedEntrance>
                    <AnimatedEntrance preset="fadeIn" delay={1850}>
                      <Typography variant="label.xs" color="textMuted">
                        Duration
                      </Typography>
                    </AnimatedEntrance>
                  </View>

                  {/* XP Reward - icon: 1730ms (80ms stagger), label: 1850ms */}
                  <View style={styles.detailItem}>
                    <AnimatedEntrance preset="bubblePop" delay={1730}>
                      <Ionicons name="star" size={24} color={colors.bluePrimary} />
                    </AnimatedEntrance>
                    <AnimatedEntrance preset="fadeIn" delay={1850}>
                      <Typography variant="body.l" color="onyx" weight="700">
                        +{xpReward}
                      </Typography>
                    </AnimatedEntrance>
                    <AnimatedEntrance preset="fadeIn" delay={1850}>
                      <Typography variant="label.xs" color="textMuted">
                        XP Reward
                      </Typography>
                    </AnimatedEntrance>
                  </View>

                  {/* Modules Count - icon: 1810ms (160ms stagger), label: 1850ms */}
                  <View style={styles.detailItem}>
                    <AnimatedEntrance preset="bubblePop" delay={1810}>
                      <Ionicons name="book" size={24} color={colors.bluePrimary} />
                    </AnimatedEntrance>
                    <AnimatedEntrance preset="fadeIn" delay={1850}>
                      <Typography variant="body.l" color="onyx" weight="700">
                        {modulesCount}
                      </Typography>
                    </AnimatedEntrance>
                    <AnimatedEntrance preset="fadeIn" delay={1850}>
                      <Typography variant="label.xs" color="textMuted">
                        Modules
                      </Typography>
                    </AnimatedEntrance>
                  </View>
                </View>
              </View>
            </AnimatedEntrance>
          </View>

          <View style={styles.bottomSpacer} />
        </Animated.ScrollView>

        {/* Floating START ADVENTURE button: y 30->0, 450ms, 2150ms delay */}
        <AnimatedEntrance preset="slideFromBottom" delay={2150} style={styles.floatingButton}>
          <DepthButton
            variant="tertiary"
            size="medium"
            pressEffect="dip"
            onPress={handleClose}
            isFullWidth
          >
            <Typography variant="label.l" color="white" weight="700" uppercase letterSpacing={1}>
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
    paddingHorizontal: spacing.lg,
  },
  eraBadge: {
    backgroundColor: colors.pinkSecondary,
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
  descriptionText: {
    lineHeight: 22,
  },
  storyText: {
    lineHeight: 22,
  },

  // Details Card - light blue background
  detailsCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.blueSecondary + '30', // 19% opacity
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  detailsCardTitle: {
    marginBottom: spacing.md,
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

  // Floating button
  floatingButton: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 24 : 40,
    left: spacing.xl,
    right: spacing.xl,
  },

  // Bottom Spacer
  bottomSpacer: {
    height: Platform.OS === 'android' ? 30 : 15,
  },
});
