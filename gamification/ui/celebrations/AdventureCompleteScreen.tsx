// Adventure Complete Screen — celebration modal shown when a user finishes
// the last module of an adventure.
//
// Design source (Figma): node 3215:9503 in Archives_Raw_File. Redesigned
// for AFF-854 to align with the new Archives design system:
//   • snow background with a blurred hero image fading into it
//   • Bounded display typography for subtitle + title
//   • pink "ADVENTURE COMPLETED!" pill
//   • ibu_teacher Rive mascot (replaces the previous mp4)
//   • blue tertiary DepthButton CTA ("NEXT ADVENTURE")
//
// Stats (XP / badges / modules) are no longer rendered — they live on
// QuizResults — but we still resolve them from the progress engine so
// the `adventure_completed` analytics payload keeps the same shape.

import type { Adventure } from '@/components/shared/types';
import { DepthButton, Typography, colors, easings } from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { ADVENTURE_KEYS } from '@/constants/WalkthroughKeys';
import { useGamifiedProgress } from '@/gamification';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type AppStateStatus,
} from 'react-native';
import Animated from 'react-native-reanimated';
import RenderHtml from 'react-native-render-html';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Rive, { Alignment, Fit } from 'rive-react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ibuTeacherRive = require('@/assets/rive/ibu_teacher.riv');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Entrance choreography ───────────────────────────────────────────
// Mirrors the GSAP timeline in `Downloads/03 questions/index.html`
// (`enterAdventureDone`, lines 2488–2525). Numbers are the GSAP `at`
// offsets in seconds; we convert to milliseconds for AnimatedEntrance.
// Each layer plays its own from→to tween with a delay; layers can
// overlap, matching the mock (e.g. title stagger lasts 550ms but the
// pill kicks off at 0.65s, before the title settles).
const ENTRANCE = {
  hero: { delay: 0, duration: 500 }, // bg + gradient fade in
  subtitle: { delay: 150, duration: 400 }, // "DAMASCUS"
  title: { delay: 250, duration: 550, stagger: 90 }, // word stagger
  pill: { delay: 650, duration: 420 }, // "ADVENTURE COMPLETED!"
  description: { delay: 850, duration: 400 },
  mascot: { delay: 1050, duration: 600 },
  cta: { delay: 1600, duration: 450 },
} as const;

// Custom pill preset — scale-only pop. Existing `chipPop` uses scale
// 0.6→1 + 320ms; mock specifies 0.7→1 + 420ms `back.out(2.2)`. Inline
// the config rather than adding another preset that's only used here.
const PILL_ENTRANCE = {
  scale: { from: 0.7, to: 1 },
  opacity: { from: 0, to: 1 },
  duration: ENTRANCE.pill.duration,
  easing: easings.backOut2,
} as const;

// Description bbox width — must match `descriptionWrap.maxWidth` below.
// react-native-render-html measures inline content against `contentWidth`
// to break lines correctly; passing the rendered text width (not the
// screen width) keeps wrapping aligned with our Figma 346px max.
const DESCRIPTION_MAX_WIDTH = Math.min(SCREEN_WIDTH - 48, 346);

// Module-scoped style objects — RenderHtml warns when these change
// reference between renders (it re-builds its TRT — Token-Render-Tree —
// on every prop change). Hoisting them out of the component keeps the
// tree stable across re-renders and silences the "tagsStyles changed"
// warning in dev.
const htmlBaseStyle = {
  fontFamily: 'Onest-SemiBold',
  fontSize: 16,
  lineHeight: 22,
  color: '#000000',
  textAlign: 'center' as const,
  letterSpacing: -0.16,
};

const htmlTagsStyles = {
  body: {
    fontFamily: 'Onest-SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: '#000000',
    textAlign: 'center' as const,
    letterSpacing: -0.16,
    margin: 0,
    padding: 0,
  },
  p: {
    fontFamily: 'Onest-SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: '#000000',
    textAlign: 'center' as const,
    letterSpacing: -0.16,
    marginTop: 0,
    marginBottom: 8,
  },
  strong: { fontFamily: 'Onest-Bold' },
  b: { fontFamily: 'Onest-Bold' },
  em: { fontStyle: 'italic' as const },
  i: { fontStyle: 'italic' as const },
  a: { color: '#1E3C88', textDecorationLine: 'underline' as const },
};

interface AdventureCompleteScreenProps {
  // Option 1: Pass Adventure object (data extracted automatically)
  adventure?: Adventure;

  // Option 2: Pass individual props (overrides adventure object)
  adventureId?: string;
  adventureSubtitle?: string;
  adventureTitle?: string;
  adventureDescription?: string;
  backgroundVideo?: string;
  backgroundImage?: string;

  // Stats — analytics-only after the redesign; not rendered.
  totalBadges?: number;
  totalXP?: number;
  completedModules?: number;
  totalModules?: number;

  onContinue: () => void;
  onClose?: () => void;
}

// Smart-wrap a long single-line title and pick a font size that won't
// truncate. Bounded-Black is wide — "SOUTHEAST ASIA" at 42px is ~330px
// and overflows on a 393-wide phone after horizontal padding. We split
// long titles into 2 lines AND step the font size down for very long
// words ("SOUTHEAST", "INDONESIA"). Returns lines + a fitted fontSize.
const TITLE_BASE_SIZE = 42;
const TITLE_MEDIUM_SIZE = 34;
const TITLE_SMALL_SIZE = 28;

const fitTitle = (
  title: string,
): { lines: string[]; fontSize: number } => {
  // Honor manual newlines if the content team authored any.
  if (title.includes('\n')) {
    const lines = title.split('\n').map((l) => l.trim()).filter(Boolean);
    const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
    return { lines, fontSize: pickSize(longest) };
  }

  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: [title], fontSize: TITLE_BASE_SIZE };
  if (words.length === 1) {
    return { lines: words, fontSize: pickSize(words[0].length) };
  }

  // Try every split point; pick the one that minimizes the longer line's
  // length (so both lines visually balance). Falls back to a single line
  // if the title is short enough to fit at base size.
  let best = { lines: [title], longest: title.length };
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const longest = Math.max(a.length, b.length);
    if (longest < best.longest) {
      best = { lines: [a, b], longest };
    }
  }
  return { lines: best.lines, fontSize: pickSize(best.longest) };
};

// Step the font size down for very long lines so Bounded-Black doesn't
// overflow the screen. Thresholds tuned to a 393px-wide phone with 48px
// horizontal padding (≈345px text bbox).
const pickSize = (longestLineChars: number): number => {
  if (longestLineChars <= 11) return TITLE_BASE_SIZE; // "DAMASCUS"
  if (longestLineChars <= 14) return TITLE_MEDIUM_SIZE; // "THE NEW CAPITAL"
  return TITLE_SMALL_SIZE; // "SOUTHEAST ASIA", "RISE OF INDONESIA"
};

export default function AdventureCompleteScreen({
  adventure,
  adventureId: propAdventureId,
  adventureSubtitle: propSubtitle,
  adventureTitle: propTitle,
  adventureDescription: propDescription,
  backgroundImage: propBackgroundImage,
  totalBadges: _totalBadges = 3,
  totalXP = 0,
  completedModules = 5,
  totalModules = 5,
  onContinue,
  onClose,
}: AdventureCompleteScreenProps) {
  const insets = useSafeAreaInsets();
  const { getROIAdventureStats } = useGamifiedProgress();

  const [calculatedStats, setCalculatedStats] = useState({ xp: 0, completedModules: 0 });
  const [hasTrackedCompletion, setHasTrackedCompletion] = useState(false);

  // Pull XP / module counts from the unified progress engine when an
  // Adventure object is passed. Used purely for analytics fidelity — the
  // redesigned screen no longer renders these numbers, but the
  // `adventure_completed` event downstream is still keyed off them.
  useEffect(() => {
    if (adventure?.readable_id) {
      getROIAdventureStats(adventure.readable_id).then(setCalculatedStats);
    }
  }, [adventure?.readable_id, getROIAdventureStats]);

  const totalModulesCount = totalModules || adventure?.content_list?.length || 5;
  const displayXP = totalXP || calculatedStats.xp;
  const displayCompletedModules = completedModules || calculatedStats.completedModules;

  useEffect(() => {
    if (
      !hasTrackedCompletion &&
      adventure?.readable_id &&
      (totalXP > 0 || calculatedStats.xp > 0)
    ) {
      analyticsService.trackCustomEvent('adventure_completed', {
        adventure_id: adventure.readable_id,
        adventure_title: adventure.adventure_title,
        total_xp: displayXP,
        completed_modules: displayCompletedModules,
        total_modules: totalModulesCount,
        era_id: adventure.era_id,
        era_name: adventure.card_content?.era_name || adventure.era_id,
        adventure_number:
          adventure.order_by ||
          parseInt(adventure.readable_id.split('_')[2] || '0', 10),
      });
      setHasTrackedCompletion(true);
    }
  }, [
    adventure?.readable_id,
    adventure?.adventure_title,
    adventure?.era_id,
    adventure?.card_content?.era_name,
    adventure?.order_by,
    calculatedStats,
    totalXP,
    hasTrackedCompletion,
    displayXP,
    displayCompletedModules,
    totalModulesCount,
  ]);

  // Android-only Rive surface recovery — see components/quiz/results/
  // Mascot.tsx for the full explanation. When a native modal/sheet
  // covers this screen and is dismissed, Android's SurfaceView can lose
  // its GL context and the Rive canvas renders blank. Bumping a remount
  // key on background→active forces Rive to recreate the surface. iOS
  // CoreAnimation preserves the layer, so the listener is no-op there.
  const [riveKey, setRiveKey] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let prev: AppStateStatus = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (prev !== 'active' && next === 'active') {
        setRiveKey((k) => k + 1);
      }
      prev = next;
    });
    return () => sub.remove();
  }, []);

  const rawTitle = propTitle || adventure?.adventure_title || 'Complete';
  const subtitle = propSubtitle ?? adventure?.card_content?.era_name ?? '';
  const description = propDescription || adventure?.adventure_description || '';
  const bgImage = propBackgroundImage || adventure?.card_content?.background_image || '';
  const { lines: titleLines, fontSize: titleFontSize } = fitTitle(rawTitle);

  const handleContinue = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const adventureId = propAdventureId || adventure?.readable_id;

    if (adventure?.readable_id) {
      analyticsService.trackCustomEvent('adventure_complete_continue', {
        adventure_id: adventure.readable_id,
        adventure_title: adventure.adventure_title,
        era_id: adventure.era_id,
        era_name: adventure.card_content?.era_name || adventure.era_id,
        adventure_number:
          adventure.order_by ||
          parseInt(adventure.readable_id.split('_')[2] || '0', 10),
      });
    } else if (adventureId) {
      analyticsService.trackCustomEvent('adventure_complete_continue', {
        adventure_id: adventureId,
      });
    }

    // Failsafe local flag so the celebration doesn't replay on reinstall
    // before cloud sync lands. Primary protection lives in Quiz.tsx via
    // wasAlreadyComplete; this is the belt-and-braces backup for a
    // cloud-sync-fails-then-reinstall edge case.
    if (adventureId) {
      try {
        await AsyncStorage.setItem(
          ADVENTURE_KEYS.getAdventureCompleteKey(adventureId),
          'true',
        );
      } catch (error) {
        console.error('❌ Error saving failsafe flag:', error);
      }
    }

    onContinue();
  }, [adventure, propAdventureId, onContinue]);

  return (
    <View style={styles.container}>
      {/* Hero — blurred image + gradient fade. Absolute so the title
          block in normal flow can overlap it. pointerEvents="none"
          lets taps fall through to the close button above.
          Wrapped in AnimatedEntrance so the bg + gradient fade in
          together at t=0 (mock: `.adv-bg, .adv-veil` 0.5s power2.out). */}
      <AnimatedEntrance
        preset="fadeIn"
        delay={ENTRANCE.hero.delay}
        duration={ENTRANCE.hero.duration}
        style={styles.hero}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {!!bgImage && (
            <Image
              source={{ uri: bgImage }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={3}
              placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
            />
          )}
          {/* Top→bottom: transparent (image visible) → cream tint → snow.
              Mirrors the Figma overlay so the bottom of the hero blends
              seamlessly into the page background regardless of image. */}
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0)',
              'rgba(255, 255, 255, 0)',
              'rgba(246, 240, 227, 0.773)',
              'rgb(244, 236, 220)',
              colors.snow,
            ]}
            locations={[0, 0.35, 0.76, 0.91, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </AnimatedEntrance>

      {onClose && (
        <Pressable
          style={[styles.closeButton, { top: insets.top + 8 }]}
          hitSlop={16}
          onPress={onClose}
        >
          <Ionicons name="close" size={28} color={colors.onyx} />
        </Pressable>
      )}

      {/* Scrollable upper region — title → badge → description → mascot.
          Pinned outside the scroller: the CTA. On large phones the
          content fits without scrolling; on small phones (SE/mini) or
          with long HTML descriptions the scroller absorbs the overflow
          so nothing is clipped or pushed under the CTA.

          Animated.ScrollView (instead of plain RN ScrollView) lets us
          drive scroll-linked worklets later if needed; the underlying
          native view is identical so there's no perf penalty for the
          swap. `scrollEventThrottle={16}` and `removeClippedSubviews`
          off (entrance children mount partially off-position; clipping
          would mask their starting state). */}
      <Animated.ScrollView
        style={styles.scroller}
        contentContainerStyle={[
          styles.scrollerContent,
          {
            paddingTop: insets.top + SCREEN_HEIGHT * 0.075,
            paddingBottom: 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces
        scrollEventThrottle={16}
        removeClippedSubviews={false}
      >
        {/* Title block — sits ON TOP of the hero gradient. Subtitle in
            Bounded 22, title in Bounded 42 (allows 2 lines).
            renderToHardwareTextureAndroid on the wrapper: each title
            line tween (translateY + opacity) commits via Reanimated;
            without the texture cache Android re-rasterizes Bounded-
            Black glyphs every frame on the title stagger, which on
            mid-tier devices stutters audibly. */}
        <View
          style={styles.titleBlock}
          renderToHardwareTextureAndroid
          collapsable={false}
        >
          {!!subtitle && (
            <AnimatedEntrance
              preset="riseSubtle"
              delay={ENTRANCE.subtitle.delay}
              duration={ENTRANCE.subtitle.duration}
            >
              <Typography
                family="bounded"
                weight="900"
                size={22}
                lineHeight={28}
                align="center"
                extraColor={colors.black}
                uppercase
              >
                {subtitle}
              </Typography>
            </AnimatedEntrance>
          )}
          {/* Word-stagger title — render each line as its own
              AnimatedEntrance with compounded delay. Mock spec
              (line 2503-2505): 0.55s back.out(1.4), stagger 0.09s. */}
          {titleLines.map((line, i) => (
            <AnimatedEntrance
              key={`title-${i}`}
              preset="riseSoft"
              delay={ENTRANCE.title.delay + i * ENTRANCE.title.stagger}
              duration={ENTRANCE.title.duration}
              style={i === 0 ? styles.title : undefined}
            >
              <Typography
                family="bounded"
                weight="900"
                size={titleFontSize}
                // Tight line-height (1.05× fontSize) so two-line titles
                // ("THE NEW / CAPITAL") read as one tight block.
                lineHeight={Math.round(titleFontSize * 1.05)}
                align="center"
                extraColor={colors.black}
                uppercase
              >
                {line}
              </Typography>
            </AnimatedEntrance>
          ))}
        </View>

        {/* Pill — scale-only pop (custom config; not a preset). */}
        <AnimatedEntrance
          preset={PILL_ENTRANCE}
          delay={ENTRANCE.pill.delay}
        >
          <View style={styles.badge}>
            <Typography
              family="onest"
              weight="700"
              size={14}
              align="center"
              extraColor={colors.white}
            >
              ADVENTURE COMPLETED!
            </Typography>
          </View>
        </AnimatedEntrance>

        {!!description && (
          <AnimatedEntrance
            preset="riseSubtle"
            delay={ENTRANCE.description.delay}
            duration={ENTRANCE.description.duration}
            style={styles.descriptionWrap}
          >
            {/* HTML rendering — `adventure_description` arrives from
                Supabase as authored HTML (paragraphs, <strong>, <em>,
                inline links). RenderHtml maps tags onto the design-
                system tokens so the inline markup keeps the same
                Onest-on-snow look as the rest of the screen. */}
            <RenderHtml
              contentWidth={DESCRIPTION_MAX_WIDTH}
              source={{ html: description }}
              defaultTextProps={{ allowFontScaling: false }}
              baseStyle={htmlBaseStyle}
              tagsStyles={htmlTagsStyles}
            />
          </AnimatedEntrance>
        )}

        {/* Mascot — Rive ibu_teacher. The wrapper is wrapped in
            AnimatedEntrance for the entrance lift+fade (mock t=1.05s,
            translateY 30→0 + fade, 600ms back.out(2)). The inner View
            keeps `renderToHardwareTextureAndroid` so the Rive native
            surface lives behind a stable cached layer during the
            entrance — without it, the translateY tween invalidates
            the surface every frame and Rive's GL canvas flickers on
            Android. */}
        <AnimatedEntrance
          preset="riseCard"
          delay={ENTRANCE.mascot.delay}
          duration={ENTRANCE.mascot.duration}
        >
          <View
            style={styles.mascotWrap}
            renderToHardwareTextureAndroid
            collapsable={false}
          >
            <Rive
              key={riveKey}
              source={ibuTeacherRive}
              autoplay
              fit={Fit.Contain}
              alignment={Alignment.Center}
              style={styles.rive}
            />
          </View>
        </AnimatedEntrance>
      </Animated.ScrollView>

      {/* CTA — pinned outside the ScrollView so the button stays
          tappable at the bottom of every screen size, regardless of
          how much HTML the description contains. DepthButton tertiary
          (navy surface + light-blue shadow + light-blue border)
          matches the Figma button tokens. Entrance: mock t=1.60s,
          translateY 30→0 + fade, 450ms back.out(2). */}
      <AnimatedEntrance
        preset="riseCta"
        delay={ENTRANCE.cta.delay}
        duration={ENTRANCE.cta.duration}
        style={[styles.ctaSlot, { paddingBottom: insets.bottom + 16 }]}
      >
        <DepthButton
          variant="tertiary"
          surfaceColor="bluePrimary"
          shadowColor="blueSecondary"
          borderColor="blueSecondary"
          onPress={handleContinue}
        >
          <Typography variant="label.m" color="white">
            NEXT ADVENTURE
          </Typography>
        </DepthButton>
      </AnimatedEntrance>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  // Hero strip ≈ 24% of screen height — matches the Figma anchor
  // (gradient overlay 206px on an 852px frame). The blurred image lives
  // here; the title block above paints over the gradient's faded zone.
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.245,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // ScrollView host: takes the page below the absolute hero. flex:1
  // gives the scroller all remaining vertical space (above the pinned
  // CTA). backgroundColor=transparent so the hero gradient bleeds
  // through the top of the scroll content.
  scroller: {
    flex: 1,
  },
  // ScrollView content container: alignItems centers each child
  // horizontally. NO minHeight here — the previous 70% screen min was
  // forcing a tall content area even when content was short, leaving a
  // large empty band before the mascot. Letting the container shrink-
  // to-fit means children sit right under each other; if total content
  // exceeds the viewport, the scroller absorbs it.
  scrollerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  titleBlock: {
    alignItems: 'center',
  },
  title: {
    marginTop: 6,
  },
  // Pink pill — Figma uses #C63D78 (= colors.pinkSecondary). 16.5
  // borderRadius + ~29px height gives the fully-rounded shape.
  badge: {
    marginTop: 18,
    backgroundColor: colors.pinkSecondary,
    borderRadius: 16.5,
    paddingHorizontal: 12,
    minHeight: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionWrap: {
    marginTop: 18,
    maxWidth: Math.min(SCREEN_WIDTH - 48, 346),
  },
  // Mascot wrapper: explicit pixel height (not minHeight + flex:1).
  // Rive's native view on Android needs concrete pixel dimensions on
  // both axes — `width: '100%'` of an alignItems:center parent with no
  // explicit width and `height: '100%'` of a minHeight-only parent
  // both collapse to 0 in the native layout pass, which is why the
  // Rive canvas was rendering invisibly inside a tall empty box.
  mascotWrap: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.95,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  // Rive surface: pixel dimensions sized to the wrapper. Centered via
  // the parent's alignItems/justifyContent. Square-ish aspect lets the
  // ibu_teacher artboard render fully without horizontal cropping.
  rive: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
    backgroundColor: 'transparent',
  },
  ctaSlot: {
    width: '100%',
    paddingHorizontal: 18,
  },
});
