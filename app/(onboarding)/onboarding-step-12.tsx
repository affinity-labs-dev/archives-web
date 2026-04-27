import React from 'react';
import { View, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import { router } from 'expo-router';

import {
  Typography,
  DepthButton,
  SpeechBubble,
  colors,
  spacing,
  easings,
} from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { Mascot } from '@/components/onboarding/Mascot/Mascot';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { line1Svg, line2Svg } from '@/components/onboarding/icons/lineSvgs';
import { bookSvg, clockSvg } from '@/components/onboarding/icons/pillIcons';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { toDisplayStep } from '@/constants/OnboardingRoutes';

const riseOfIslamImg = require('@/assets/images/rise-of-islam-era.png');
const womenOfIslamImg = require('@/assets/images/women-of-islam-era.png');
const prophetsImg = require('@/assets/images/prophets-era-1.png');

type Side = 'left' | 'right';

interface WeekEntry {
  id: string;
  side: Side;
  image: number;
  title: string;
  description: string;
}

const WEEKS: WeekEntry[] = [
  {
    id: 'week-1',
    side: 'left',
    image: riseOfIslamImg,
    title: 'Week 1 \u2022 Rise of Islam Era',
    description:
      'Explore Mecca before Islam and how a night in Hira Cave changed the world.',
  },
  {
    id: 'week-2',
    side: 'right',
    image: womenOfIslamImg,
    title: 'Week 2 \u2022 Women of Islam Era',
    description:
      'Learn about the women leaders that shaped Islamic history, from scholars to leaders',
  },
  {
    id: 'week-3',
    side: 'left',
    image: prophetsImg,
    title: 'Week 3 \u2022 Prophets 1 Era',
    description:
      'Discover the early Prophets and how they shaped Islam, everyone from Adam to Ibrahim AS',
  },
];

/**
 * Screen 14 — Personalized learning path overview.
 *
 * Figma: 3359:5025. Mascot + speech bubble header, two stat pills (3 Eras +
 * Less than 5 mins), three week cards in zig-zag layout connected by dashed
 * curves, and a GET STARTED CTA.
 *
 * Connector curves (line1 between week 1-2, line2 between 2-3) are inline SVG
 * XML strings rendered with `preserveAspectRatio="none"` so they stretch
 * non-uniformly across any screen width. Height stays at 58px, width fills
 * the connector container (full horizontal space between cards).
 *
 * Staggered entrance (per DEVELOPER_INSTRUCTIONS spec):
 *   header 0ms, mascot 150ms, pills 400ms, week 1 (left) 550ms,
 *   week 2 (right) 700ms, week 3 (left) 850ms, CTA 1000ms.
 */
export default function OnboardingStep12Screen() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const markCompleted = useOnboardingStore((s) => s.markCompleted);

  const handleGetStarted = () => {
    setStep(12);
    // markCompleted flips status → 'completed'. useOnboardingSync picks up
    // the terminal transition and fires `flushOnboardingAnswers` (immediate
    // cloud upsert), so we don't block navigation on the network round trip.
    markCompleted();
    router.push('/onboarding-step-13' as never);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <AnimatedEntrance
          preset={{
            translateY: { from: -20, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 300,
            easing: easings.power2Out,
          }}
        >
          <OnboardingHeader currentStep={toDisplayStep(12)} totalSteps={12} showSkip={false} />
        </AnimatedEntrance>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Mascot + bubble header */}
          <AnimatedEntrance
            preset={{
              scale: { from: 0.7, to: 1 },
              translateY: { from: 30, to: 0 },
              opacity: { from: 0, to: 1 },
              duration: 600,
              easing: easings.backOut17,
            }}
            delay={150}
          >
            <View style={styles.mascotRow}>
              <Mascot size={96} autoPlayEntrance={false} />
              <View style={styles.bubbleWrapper}>
                <SpeechBubble
                  borderWidth={1.5}
                  autoPlay={false}
                  tail={{ direction: 'left', offset: 0.4, depth: 10, size: 14 }}
                  padding={spacing.md}
                >
                  <Typography size={18} weight="600" color="onyx" lineHeight={22}>
                    Your personalized learning path
                  </Typography>
                </SpeechBubble>
              </View>
            </View>
          </AnimatedEntrance>

          {/* Stat pills */}
          <AnimatedEntrance
            preset={{
              translateX: { from: -200, to: 0 },
              opacity: { from: 0, to: 1 },
              duration: 450,
              easing: easings.backOut14,
            }}
            delay={400}
            style={styles.pillsRow}
          >
            <View style={[styles.pill, styles.pillFilled]}>
              <SvgXml xml={bookSvg} width={27} height={27} />
              <Typography size={22} weight="700" extraColor={colors.snow} letterSpacing={0.22}>
                3 Eras
              </Typography>
            </View>

            <View style={[styles.pill, styles.pillOutline]}>
              <SvgXml xml={clockSvg} width={32} height={32} />
              <Typography size={14} weight="700" color="onyx" lineHeight={17} letterSpacing={0.14}>
                {'Less than 5\nmins a day'}
              </Typography>
            </View>
          </AnimatedEntrance>

          {/* Week path — zig-zag cards with dashed connectors.
              Each card + its outgoing connector share a single AnimatedEntrance
              so the line slides in WITH its upper card (not waiting standalone). */}
          <View style={styles.pathSection}>
            {WEEKS.map((week, i) => {
              const slideFrom = week.side === 'left' ? -300 : 300;
              const hasConnectorBelow = i < WEEKS.length - 1;
              const connectorSvg = i === 0 ? line1Svg : line2Svg;
              // Earlier cards get HIGHER zIndex so their absolute-positioned
              // connector (which overlaps into the next card's image corner)
              // draws ABOVE later sibling cards. Plain zIndex alone won't work
              // on Android — elevation must match.
              const stackingOrder = WEEKS.length - i;
              return (
                <AnimatedEntrance
                  key={week.id}
                  preset={{
                    translateX: { from: slideFrom, to: 0 },
                    opacity: { from: 0, to: 1 },
                    duration: 500,
                    easing: easings.backOut14,
                  }}
                  delay={550 + i * 150}
                  style={{ zIndex: stackingOrder, elevation: stackingOrder }}
                >
                  <WeekCard
                    side={week.side}
                    image={week.image}
                    title={week.title}
                    description={week.description}
                    isLast={i === WEEKS.length - 1}
                  />
                  {hasConnectorBelow && <Connector svg={connectorSvg} />}
                </AnimatedEntrance>
              );
            })}
          </View>

        </ScrollView>

        {/* CTA — outside ScrollView so it anchors to the screen bottom
            regardless of content length, matching step-11/12 pattern. */}
        <AnimatedEntrance
          preset={{
            translateY: { from: 60, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 500,
            easing: easings.backOut2,
          }}
          delay={1000}
          style={styles.bottomBar}
        >
          <DepthButton
            surfaceColor="onyx"
            shadowColor="white"
            borderColor="onyx"
            onPress={handleGetStarted}
          >
            <Typography variant="label.m" color="white">
              GET STARTED
            </Typography>
          </DepthButton>
        </AnimatedEntrance>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// WeekCard — image + text row, mirrored based on `side`
// ─────────────────────────────────────────────────────────────

function WeekCard({
  side,
  image,
  title,
  description,
  isLast,
}: {
  side: Side;
  image: number;
  title: string;
  description: string;
  isLast: boolean;
}) {
  const isRight = side === 'right';
  const textAlign = isRight ? 'right' : 'left';

  return (
    <View style={[styles.weekCard, isRight && styles.weekCardReversed, isLast && { marginBottom: 0 }]}>
      <Image source={image} style={styles.weekThumb} contentFit="cover" />
      <View style={styles.weekInfo}>
        <Typography
          size={16}
          weight="600"
          color="onyx"
          align={textAlign}
          letterSpacing={-0.16}
        >
          {title}
        </Typography>
        <Typography
          size={14}
          weight="500"
          color="onyx"
          align={textAlign}
          lineHeight={20}
          letterSpacing={-0.14}
        >
          {description}
        </Typography>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Connector — dashed curve SVG, stretches to full container width
// ─────────────────────────────────────────────────────────────

function Connector({ svg }: { svg: string }) {
  return (
    <View style={styles.connector}>
      <SvgXml
        xml={svg}
        width="100%"
        height={CONNECTOR_HEIGHT}
        preserveAspectRatio="none"
      />
    </View>
  );
}

const CONNECTOR_HEIGHT = 48;
// Card image is 106×106; half-width = 53. Connector horizontal padding equals
// this so the stretched SVG's endpoints align with the vertical center-lines
// of the adjacent cards' images on any screen width.
const IMAGE_WIDTH = 106;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.snow },
  safe: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },

  mascotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bubbleWrapper: {
    flex: 1,
    paddingTop: spacing.md,
  },

  pillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  pill: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  pillFilled: {
    backgroundColor: colors.bluePrimary,
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    minWidth: 138,
  },
  pillOutline: {
    backgroundColor: colors.blueSecondary,
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
    flex: 1,
    paddingLeft: 16,
  },

  pathSection: {
    marginTop: spacing.xl,
  },
  weekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: CONNECTOR_HEIGHT - 5,
  },
  weekCardReversed: {
    flexDirection: 'row-reverse',
  },
  weekThumb: {
    width: IMAGE_WIDTH,
    height: IMAGE_WIDTH,
    borderRadius: 15,
  },
  weekInfo: {
    flex: 1,
    gap: 4,
  },

  connector: {
    width: '100%',
    height: CONNECTOR_HEIGHT,
    paddingLeft: IMAGE_WIDTH / 2 - 5,
    paddingRight: IMAGE_WIDTH / 2 - 5,
    position: 'absolute',
    top: IMAGE_WIDTH, 
    zIndex: 10,
  },

});
