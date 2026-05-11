// Reusable Archives Plus member screen — renders the "subscribed" surface
// for both yearly subscribers and founding (lifetime) members. Layout is
// fixed; data + actions are driven by props so new variants (monthly, etc.)
// can be added by passing a different config.

import { Typography, colors, radius, spacing } from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Entrance timeline (ms from mount). Mirrors the eras screen cadence:
// header → hero → divider → section header → staggered list → footer.
const ENTRANCE = {
  TITLE: 100,
  HERO: 220,
  SEPARATOR: 380,
  BENEFITS_HEADER: 450,
  BENEFITS_BASE: 550,
  BENEFITS_STAGGER: 80,
  TRAILING_GAP: 100,
} as const;

export type ArchivesPlusBenefitIcon =
  | 'refresh'
  | 'help'
  | 'sparkles'
  | 'lock-open'
  | 'star'
  | 'ribbon'
  | 'rocket';

export interface ArchivesPlusBenefit {
  icon: ArchivesPlusBenefitIcon;
  title: string;
  subtitle: string;
}

export interface ArchivesPlusMemberScreenProps {
  /** Top-of-screen title. Defaults to "Subscription". */
  title?: string;
  /** Hero card primary line, e.g. "Archives Plus". */
  planName: string;
  /** Status label under plan name, e.g. "Active member" or "Founding member". */
  statusLabel: string;
  /** Plan detail line, e.g. "Yearly plan · renews automatically" or "Lifetime · permanent access". */
  planDetail: string;
  /** Chip text in the top-right of hero card, e.g. "MEMBER" or "FOUNDING". */
  chipLabel: string;
  /** Section header above benefits. Defaults to "Your benefits". */
  benefitsHeader?: string;
  /** Benefits list — each rendered as its own bordered row. */
  benefits: readonly ArchivesPlusBenefit[];
  /** Small gray copy below benefits (motivational / thank-you line). */
  footerNote: string;
  /**
   * Manage-subscription link config. Pass `null` (or omit) to hide the link
   * entirely (useful for lifetime members who can't manage anything).
   *
   * `onPress` is invoked when the user taps — caller is responsible for
   * opening the platform's subscription management UI (e.g. via
   * `Purchases.showManageSubscriptions()` from `react-native-purchases`).
   */
  manageLink?: {
    label: string;
    onPress: () => void | Promise<void>;
  } | null;
}

export function ArchivesPlusMemberScreen({
  title = 'Subscription',
  planName,
  statusLabel,
  planDetail,
  chipLabel,
  benefitsHeader = 'Your benefits',
  benefits,
  footerNote,
  manageLink = null,
}: ArchivesPlusMemberScreenProps) {
  const handleManagePress = () => {
    if (!manageLink) return;
    Haptics.selectionAsync();
    Promise.resolve(manageLink.onPress()).catch((err: unknown) => {
      console.warn('❌ Failed to open subscription management:', err);
    });
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, Platform.OS === 'android' && styles.safeAreaAndroid]}
    >
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedEntrance preset="riseSoft" delay={ENTRANCE.TITLE}>
          <Typography
            family="bounded"
            size={22}
            weight="900"
            color="onyx"
            align="center"
            uppercase
            style={styles.title}
          >
            {title}
          </Typography>
        </AnimatedEntrance>

        <AnimatedEntrance preset="cardHeroDrop" delay={ENTRANCE.HERO}>
          <View style={styles.heroCard}>
            <View style={styles.heroTextColumn}>
              <Typography family="onest" size={20} weight="700" color="onyx">
                {planName}
              </Typography>
              <Typography
                family="onest"
                size={12}
                weight="500"
                color="acaiSecondary"
                style={styles.heroLine}
              >
                {statusLabel}
              </Typography>
              <Typography
                family="onest"
                size={11}
                weight="600"
                extraColor="#939393"
                style={styles.heroLine}
              >
                {planDetail}
              </Typography>
            </View>

            <View style={styles.chip}>
              <Typography
                family="onest"
                size={10}
                weight="700"
                color="onyx"
                align="center"
                uppercase
                letterSpacing={0.8}
              >
                {chipLabel}
              </Typography>
            </View>
          </View>
        </AnimatedEntrance>

        <AnimatedEntrance preset="fadeIn" delay={ENTRANCE.SEPARATOR}>
          <View style={styles.separator} />
        </AnimatedEntrance>

        <AnimatedEntrance preset="riseSubtle" delay={ENTRANCE.BENEFITS_HEADER}>
          <Typography
            family="onest"
            size={18}
            weight="700"
            color="onyx"
            style={styles.benefitsHeader}
          >
            {benefitsHeader}
          </Typography>
        </AnimatedEntrance>

        <View style={styles.benefitsList}>
          {benefits.map((benefit, index) => (
            <AnimatedEntrance
              key={benefit.title}
              preset="riseListItem"
              delay={ENTRANCE.BENEFITS_BASE + index * ENTRANCE.BENEFITS_STAGGER}
            >
              <View style={styles.benefitRow}>
                <View style={styles.benefitIconWrap}>
                  <Ionicons name={benefit.icon} size={16} color={colors.white} />
                </View>
                <View style={styles.benefitTextColumn}>
                  <Typography family="onest" size={16} weight="600" color="onyx">
                    {benefit.title}
                  </Typography>
                  <Typography
                    family="onest"
                    size={12}
                    weight="500"
                    extraColor="#939393"
                    style={styles.benefitSubtitle}
                  >
                    {benefit.subtitle}
                  </Typography>
                </View>
              </View>
            </AnimatedEntrance>
          ))}
        </View>

        <AnimatedEntrance
          preset="fadeIn"
          delay={
            ENTRANCE.BENEFITS_BASE +
            benefits.length * ENTRANCE.BENEFITS_STAGGER +
            ENTRANCE.TRAILING_GAP
          }
        >
          <Typography
            family="onest"
            size={12}
            weight="500"
            extraColor="#939393"
            align="center"
            style={styles.footerNote}
          >
            {footerNote}
          </Typography>
        </AnimatedEntrance>

        {manageLink ? (
          <AnimatedEntrance
            preset="riseSubtle"
            delay={
              ENTRANCE.BENEFITS_BASE +
              benefits.length * ENTRANCE.BENEFITS_STAGGER +
              ENTRANCE.TRAILING_GAP * 2
            }
          >
            <Pressable
              onPress={handleManagePress}
              hitSlop={12}
              disabled={true}
              style={({ pressed }) => [
                styles.manageButton,
                pressed && styles.manageButtonPressed,
              ]}
            >
              <Typography
                family="onest"
                size={13}
                weight="600"
                color="bluePrimary"
                align="center"
              >
                {manageLink.label}
              </Typography>
            </Pressable>
          </AnimatedEntrance>
        ) : null}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  safeAreaAndroid: {
    paddingTop: 11,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  title: {
    marginBottom: spacing.lg,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.acaiPrimary,
    borderWidth: 1.5,
    borderRadius: radius.option,
    paddingVertical: 22,
    paddingHorizontal: 20,
    minHeight: 110,
  },
  heroTextColumn: {
    flex: 1,
  },
  heroLine: {
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#FFCC00',
    borderColor: colors.onyx,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  benefitsHeader: {
    marginBottom: spacing.md,
  },
  benefitsList: {
    gap: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.bluePrimary,
    borderWidth: 1.5,
    borderRadius: radius.option,
    paddingVertical: 18,
    paddingHorizontal: 16,
    minHeight: 68,
  },
  benefitIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: colors.acaiPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  benefitTextColumn: {
    flex: 1,
  },
  benefitSubtitle: {
    marginTop: 4,
  },
  footerNote: {
    marginTop: 36,
    paddingHorizontal: spacing.sm,
  },
  manageButton: {
    marginTop: 18,
    paddingVertical: spacing.sm,
  },
  manageButtonPressed: {
    opacity: 0.6,
  },
});
