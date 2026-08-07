import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SafeAreaView } from "react-native-safe-area-context";

import TodayCardDeck, { type TodayCardData } from "@/components/today/TodayCardDeck";
import TodayCalendar from "@/components/today/TodayCalendar";
import TodayHeader from "@/components/today/TodayHeader";
import TodayLessonChrome from "@/components/today/TodayLessonChrome";
import TodayProgressBar from "@/components/today/TodayProgressBar";
import TodayScrollableLesson from "@/components/lessons/today/TodayScrollableLesson";
import TodayVideoLesson from "@/components/lessons/today/TodayVideoLesson";
import Quiz from "@/components/quiz/Quiz";
import { DepthButton, Typography, colors, easings } from "@/components/ui";
import { AnimatedEntrance } from "@/components/ui/animations";
import { useHeroDive } from "@/hooks/today/useHeroDive";
import { useTodayModalSlots } from "@/hooks/today/useTodayModalSlots";
import { useTodayQuest } from "@/hooks/today/useTodayQuest";
import { useTodayHistory } from "@/hooks/today/useTodayHistory";
import { useTodayCardsData } from "@/hooks/today/useTodayCardsData";
import { useGamificationOrchestrator } from "@/gamification";
import { useUser } from "@clerk/clerk-expo";

// ─────────────────────────────────────────────────────────────
// The real Today screen, running in a browser, on today's real content.
//
// This is the mobile app's own code - TodayCardDeck, TodayVideoLesson, the
// hero-dive and the dual-slot crossfade - not a re-implementation. What it
// deliberately does NOT include is the parts that have nothing to do with how
// the app looks and would block the page from rendering at all:
//
//   Clerk    - the production instance only accepts archiveszone.app as an
//              origin, so including it gates everything behind a blank splash.
//   Supabase - the data layer is being replaced by the /api/* backend anyway
//              (M2), so content is fetched from that backend here instead.
//              That also means no credential is needed to run this.
//
// Everything else is the shipping code: same fonts, same colours, same
// components, same animation timings, same video pipeline.
// ─────────────────────────────────────────────────────────────

// The real endpoint, same origin. /api/* sends no Access-Control-Allow-Origin -
// correct, since only the app should be calling it - which is why the dev
// server serves the API itself instead of running it on a second port. See
// dev/api-middleware.js.
//
// The date is the client's on purpose: "today" belongs to the user's timezone,
// not the server's. Computing it server-side rolls the story over in the
// afternoon for anyone west of Greenwich and marks streak days missed.
const API = "/api/daily/today";

function localDateStr(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function TodayOnWeb() {
  const insets = useSafeAreaInsets();
  const hero = useHeroDive();
  const slots = useTodayModalSlots();
  const { user } = useUser();
  // The daily quiz does NOT write progress itself: Quiz.tsx:412 short-circuits
  // on `isToday` with "skipping gamification save" and hands the score to
  // onQuizResults instead. The caller owns the write, which is why nothing was
  // persisted until this was wired - the same handoff today.tsx:917 does.
  const { saveQuestCompletion } = useTodayQuest(user?.id);
  // The orchestrator owns the celebration overlay - it renders
  // DailyStoryEndScreen, the streak screen and the XP milestone itself
  // (GamificationOrchestrator.tsx:2290). The screen only has to report that the
  // day finished; it decides what, if anything, to show.
  const { reportTodayComplete } = useGamificationOrchestrator();
  // The score is needed for the celebration's XP figure, and onQuizResults
  // fires before onContinue - so it is captured rather than re-derived.
  const lastCorrectRef = React.useRef(0);
  const [quest, setQuest] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  // Which day is on screen. The calendar was wired to a no-op `onSelectDate`
  // with `selectedDate` pinned to today, so tapping a past day did nothing at
  // all - the same shape of gap as the missing onQuizResults.
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // The app's own hook for which days are finished, so the calendar's ticks
  // come from the same query the phone uses (useTodayHistory.ts:97 - watch AND
  // explore AND score > 0, all three). Only completedDatesCache is taken from
  // it: this screen owns day selection itself, because it fetches through
  // /api/daily/today rather than holding a Today object.
  const justPurchasedRef = React.useRef(false);
  const { completedDatesCache: completedDates } = useTodayHistory({
    todayQuest: quest as any,
    userId: user?.id,
    isSubscribed: true,
    isSubscriptionLoading: false,
    justPurchasedRef,
  });
  // The quiz owns its own feedback sheet and results screen; the chrome header
  // has to go transparent for both so the dim backdrop and the results body
  // bleed up behind the back button (today.tsx:880-891).
  const [quizFeedback, setQuizFeedback] = useState(false);
  const [quizResultsVisible, setQuizResultsVisible] = useState(false);
  const quizChromeClear = quizFeedback || quizResultsVisible;

  useEffect(() => {
    let cancelled = false;
    setQuest(null);
    setError(null);
    // Progress belongs to the day being viewed, not to the session.
    setProgress(0);
    fetch(`${API}?date=${localDateStr(selectedDate)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
        return r.json();
      })
      .then((entry) => {
        if (cancelled) return;
        const c = typeof entry?.content === "string" ? JSON.parse(entry.content) : entry?.content;
        if (!c?.card1) throw new Error("no story published for this day");
        setQuest({ id: entry.id ?? "today", date: entry.date, content: c });
      })
      .catch((e) => {
        // Guarded: switching days quickly would otherwise let a slow response
        // for the previous day overwrite the current one.
        if (!cancelled) setError(String(e.message || e));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  // Same shape today.tsx hands the lesson (app/(tabs)/today.tsx:750-773).
  const contentItem = React.useMemo(() => {
    if (!quest) return null;
    const card1 = quest.content.card1;
    const source = card1.media_hls_url !== undefined ? card1.media_hls_url : card1.media_url;
    return {
      id: quest.id,
      thumbnail_title: card1.title,
      thumbnail_url: "",
      media_url: Array.isArray(source) ? source : [source],
      content_type: card1.content_type || "reel",
      background_music_url: card1.background_music_url,
      bottom_content: {
        title: card1.title,
        description: card1.content?.reading_text,
        reading_text: card1.content?.reading_text,
        captions: card1.content?.captions || [],
      },
      order_by: 0,
    } as any;
  }, [quest]);

  // The hero dive: fade the home, fly the centred card forward, mount the
  // lesson, then fade it in. Same two-phase sequence as today.tsx.
  const openAt = useCallback(
    async (modal: "video" | "reading" | "quiz") => {
      await hero.playDivePhase1();
      slots.openModal(modal);
      await hero.playDivePhase2();
    },
    [hero, slots]
  );
  const openVideo = useCallback(() => openAt("video"), [openAt]);

  // Spike-only: expose the modal state so a browser test can assert which step
  // opened instead of guessing from the visible text (two steps can show the
  // same reading copy).
  useEffect(() => {
    (globalThis as any).__step = slots.activeModal;
  }, [slots.activeModal]);

  const close = useCallback(() => {
    slots.closeModal();
    hero.reset();
    setQuizFeedback(false);
    setQuizResultsVisible(false);
  }, [slots, hero]);

  // The app's own card builder, rather than a hand-rolled array.
  //
  // Mine got three things wrong at once, all invisible unless you compare with
  // the phone: every kicker read "TODAY" instead of Watch / Explore /
  // Questions, the titles came from the wrong fields, and the tuple was
  // [watch, explore, questions] when the deck expects
  // [explore, watch, questions] - so Explore sat in the centre slot where
  // Watch belongs.
  //
  // This is the whole lesson of the port in miniature: every one of those was a
  // detail I retyped instead of imported.
  const cards = useTodayCardsData({
    todayQuest: quest as any,
    displayedQuest: null,
    watchCompleted: progress >= 33,
    exploreCompleted: progress >= 66,
    questCompleted: progress >= 100,
    quizCorrectAnswers: lastCorrectRef.current,
    isExploreUnlocked: true,
    isQuizUnlocked: true,
    openModal: openAt,
  });

  // NOTE: every hook above this line. The early returns below mean a hook
  // placed after them is skipped on the first render, and React fails the whole
  // tree with "Rendered more hooks than during the previous render".

  if (error) {
    return (
      <View style={styles.centre}>
        <Text style={styles.err}>Could not load today's story{"\n"}{error}</Text>
      </View>
    );
  }
  if (!quest) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color="#C99151" />
      </View>
    );
  }

  const c = quest.content;
  const img = (u?: string) => (u ? { uri: u } : undefined);

  // Each step hands off to the next through the same 400ms dual-slot crossfade
  // the app uses, so the sequence is watch -> read -> quiz without a flash.
  // Progress is local state here rather than a Supabase write.
  const renderSlot = (modal: string) => {
    if (modal === "video" && contentItem) {
      return (
        <TodayVideoLesson
          contentItem={contentItem}
          progress={progress}
          onNext={() => {
            setProgress(33);
            slots.animateModalTransition("reading", "video", "forward");
          }}
          onDismiss={close}
        />
      );
    }

    if (modal === "reading") {
      return (
        <TodayScrollableLesson
          contentBlocks={c.card2?.content_blocks || []}
          progress={progress}
          innerVoiceUrl={c.card2?.inner_voice}
          onContinue={() => {
            setProgress(66);
            slots.animateModalTransition("quiz", "reading", "forward");
          }}
          onBack={() => slots.animateModalTransition("video", "none", "backward")}
        />
      );
    }

    if (modal === "quiz") {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.snow }} edges={[]}>
          <TodayLessonChrome
            progress={progress}
            onBack={() => slots.animateModalTransition("reading", "video", "backward")}
            headerBackground={quizChromeClear ? "transparent" : colors.snow}
            backIconColor={colors.bluePrimary}
            progressLabelColor={colors.bluePrimary}
            progressFillColor={colors.bluePrimary}
            progressTrackColor={colors.blueSecondary}
            hideProgress={quizResultsVisible}
            hideBottomCtas
            rightCta={null}
          >
            <Quiz
              contentItem={{
                id: quest.id,
                questions: c.card3?.questions || [],
                thumbnail_title: c.card3?.title,
                thumbnail_url: "",
                media_url: [],
                content_type: "reel",
                bottom_content: null,
                order_by: 0,
              } as any}
              adventureId="daily_quest"
              moduleId={quest.id}
              eraId="daily_quest"
              eraName="Daily Quest"
              isToday
              onFeedbackChange={({ visible }: { visible: boolean }) => setQuizFeedback(visible)}
              onResultsChange={setQuizResultsVisible}
              onQuizResults={async (
                score: number,
                correctAnswers: number,
                totalQuestions: number
              ) => {
                lastCorrectRef.current = correctAnswers;
                if (!user?.id) return;
                try {
                  await saveQuestCompletion(
                    user.id,
                    quest.id,
                    score,
                    correctAnswers,
                    totalQuestions
                  );
                } catch (err) {
                  // Non-fatal, exactly as on mobile: the score is already on
                  // screen, and failing the write must not block the user from
                  // finishing their day.
                  console.error("Failed to save quest completion", err);
                }
              }}
              onContinue={async () => {
                setProgress(100);
                // Sequential, not parallel: today.tsx:947 learned this the hard
                // way. Running the celebration's entrance choreography against
                // the closing animation shows up as a frozen modal with no
                // tappable buttons.
                close();
                if (quest.date) {
                  await reportTodayComplete(quest.date, lastCorrectRef.current * 10);
                }
              }}
              onDismiss={close}
            />
          </TodayLessonChrome>
        </SafeAreaView>
      );
    }

    return null;
  };

  // Same composition and the same entrance delays as app/(tabs)/today.tsx:1063-1155.
  return (
    <View style={styles.root}>
      <Animated.View style={{ flex: 1, opacity: hero.homeOpacity }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 14 }}
          showsVerticalScrollIndicator={false}
        >
          <AnimatedEntrance
            delay={0}
            preset={{
              translateY: { from: -16, to: 0 },
              opacity: { from: 0, to: 1 },
              duration: 450,
              easing: easings.power2Out,
            }}
          >
            {/* onStreakPress is a required prop and the streak detail sheet is
                not ported yet, so this is an explicit no-op rather than an
                accidental one. */}
            <TodayHeader
              title="Today"
              streak={4}
              style={{ marginBottom: 15 }}
              onStreakPress={() => {}}
            />
          </AnimatedEntrance>

          <TodayCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            completedDates={completedDates ?? new Set<string>()}
            isSubscribed
            style={{ marginBottom: 8 }}
            entranceDelay={180}
          />

          <AnimatedEntrance
            delay={500}
            preset={{ opacity: { from: 0, to: 1 }, duration: 300, easing: easings.power2Out }}
          >
            <TodayProgressBar label="Progress today" progress={progress} style={{ marginBottom: 18 }} />
          </AnimatedEntrance>

          <TodayCardDeck
            cards={cards}
            heroDiveScale={hero.cardScale}
            heroDiveOpacity={hero.cardOpacity}
          />

          <View style={{ height: 100 }} />
        </ScrollView>

        <AnimatedEntrance
          delay={1050}
          preset={{
            translateY: { from: 40, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 500,
            easing: easings.backOut2,
          }}
          style={[styles.cta, { paddingBottom: insets.bottom + 16 }]}
        >
          <DepthButton testID="cta-start" isFullWidth variant="secondary" onPress={openVideo}>
            {/* DepthButton renders children inside a View, so a bare string
                warns. Same variant the real screen uses (today.tsx:1208). */}
            <Typography variant="label.m" color="white">
              START MY DAY
            </Typography>
          </DepthButton>
        </AnimatedEntrance>
      </Animated.View>

      <Animated.View style={[styles.slot, slots.slotAAnimatedStyle]} pointerEvents="box-none">
        {renderSlot(slots.slotAModal)}
      </Animated.View>
      <Animated.View style={[styles.slot, slots.slotBAnimatedStyle]} pointerEvents="box-none">
        {renderSlot(slots.slotBModal)}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors?.snow ?? "#FAFAFA" },
  cta: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FAFAFA" },
  err: { color: "#8a2b2b", textAlign: "center", padding: 24 },
  slot: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
});
