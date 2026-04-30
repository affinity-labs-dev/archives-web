// Daily Quest Tab - New card-based design with expandable sections
// Features: Calendar week view, progress tracker, three content cards (WATCH, EXPLORE, QUESTIONS)

import TodayScrollableLesson from "@/components/lessons/today/TodayScrollableLesson";
import TodayVideoLesson from "@/components/lessons/today/TodayVideoLesson";
import Quiz from "@/components/quiz/Quiz";
import TodayLessonChrome from "@/components/today/TodayLessonChrome";
import TodayCalendar from "@/components/today/TodayCalendar";
import TodayCardDeck from "@/components/today/TodayCardDeck";
import TodayEmptyState from "@/components/today/TodayEmptyState";
import TodayHeader from "@/components/today/TodayHeader";
import TodayProgressBar from "@/components/today/TodayProgressBar";
import { DepthButton, Typography, colors, easings } from "@/components/ui";
import { AnimatedEntrance } from "@/components/ui/animations";
import {
  useDailyStoryLiveActivity,
  useDailyStoryTracking,
  useHeroDive,
  useTodayCardsData,
  useTodayHistory,
  useTodayModalSlots,
  useTodayPaywall,
  useTodayProgress,
  useTodayQuest,
  type ModalState,
} from "@/hooks/today";
import { useVideoPreloader } from "@/hooks/useVideoPreloader";
import type { ContentItem } from "@/components/shared/types";
import ArchivesTheme from "@/constants/ArchivesTheme";
import { toLocalDateString } from "@/utils/dateUtils";
import { useGamificationOrchestrator } from "@/gamification";
import { analyticsService } from "@/services/AnalyticsService";
import AppLogger from "@/services/AppLogger";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useUser } from "@clerk/clerk-expo";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

// Theme styles
const themeStyles = ArchivesTheme.common.today;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TodayScreen() {
  const { user } = useUser();
  const { isSubscribed, isLoading: isSubscriptionLoading } = useRevenueCat();
  const {
    streak,
    reportTodayComplete,
    showStreakCelebration,
  } = useGamificationOrchestrator();
  const {
    todayQuest,
    loading,
    saveQuestCompletion,
  } = useTodayQuest(user?.id);

  // Read safe-area insets imperatively from context (set up at app
  // boot via SafeAreaProvider in `_layout.tsx`). Synchronous from the
  // first render — no async settling pass like SafeAreaView's internal
  // useEffect introduces. The async pass was causing layout jitter on
  // Android post-login: SafeAreaView mounted with default insets at
  // frame 1, then committed real insets at frame 2, shifting the whole
  // tab content (and the parent tab bar via the shared flex column).
  // Same pattern StreakCelebrationScreen adopted to fix its own jump.
  const insets = useSafeAreaInsets();

  // Track quiz feedback visibility so we can make the chrome's
  // floating header transparent while the per-question feedback sheet
  // is up — Quiz's dim backdrop already covers the body, but the
  // chrome's z-indexed absolute header masks the dim at the top of
  // the screen unless we get out of the way.
  const [isQuizFeedbackVisible, setIsQuizFeedbackVisible] = useState(false);

  // Track when Quiz reaches its post-quiz results screen so we can
  // hide the chrome's progress bar (back button stays). The "Progress
  // today" indicator doesn't read on top of a results summary.
  const [isQuizResultsVisible, setIsQuizResultsVisible] = useState(false);

  // Track page view for Today tab
  useFocusEffect(
    useCallback(() => {
      analyticsService.startPageView('today', '/(tabs)/today');
      return () => {
        analyticsService.endPageView('today');
      };
    }, [])
  );

  // Debug logging
  useEffect(() => {
    if (todayQuest) {
      AppLogger.info("daily", "Quest loaded", {
        card1_media: todayQuest.content?.card1?.media_url,
        card2_voice: todayQuest.content?.card2?.inner_voice,
        card3_questions: todayQuest.content?.card3?.questions?.length,
      });
    }
  }, [todayQuest]);

  // Warm disk cache for today's thumbnails so cards render instantly on tab open.
  // Only prefetch image URLs — video URLs would waste bandwidth trying to decode as images.
  useEffect(() => {
    const card1 = todayQuest?.content?.card1;
    if (!card1) return;
    const thumbs: string[] = [];
    if (typeof card1.thumbnail_url === 'string' && card1.thumbnail_url.length > 0) {
      thumbs.push(card1.thumbnail_url);
    }
    if (card1.content_type === 'image_carousel') {
      const firstMedia = Array.isArray(card1.media_url) ? card1.media_url[0] : card1.media_url;
      if (typeof firstMedia === 'string' && firstMedia.length > 0) thumbs.push(firstMedia);
    }
    if (thumbs.length > 0) {
      Image.prefetch(thumbs, { cachePolicy: 'disk' }).catch(() => {});
    }
  }, [todayQuest]);

  // Preload today's watch video so the modal opens without a cold-start spinner
  const watchVideoUrls = useMemo(() => {
    const card1 = todayQuest?.content?.card1;
    if (!card1) return [];
    if (card1.content_type !== 'reel' && card1.content_type !== 'video_carousel') return [];
    const source = card1.media_hls_url ?? card1.media_url;
    const urls = Array.isArray(source) ? source : [source];
    return urls.filter((u): u is string => typeof u === 'string' && u.length > 0);
  }, [todayQuest]);

  useVideoPreloader(watchVideoUrls, { maxVideos: 2 });


  // Dual-slot push/pop modal animation system. Owns slot state, shared
  // values, animated styles, and the transition functions. `onCardViewed`
  // bridges the inline `tracking.trackCardViewed(...)` calls without
  // entangling the hook with PostHog.
  const {
    previousModal,
    slotAModal,
    slotBModal,
    outgoingSlot,
    slotAAnimatedStyle,
    slotBAnimatedStyle,
    isModalTransitioning,
    openModal,
    closeModal,
    animateModalTransition,
  } = useTodayModalSlots({
    onCardViewed: (cardIndex) => tracking.trackCardViewed(cardIndex),
  });

  // Hero-dive open animation — drives the home fade-out, center-card scale +
  // fade, and lesson crossfade-in when the user taps START MY DAY. Mock spec
  // in `Downloads/02 daily story/index.html:1672-1768`. The same shared
  // values are forwarded to TodayCardDeck (centerCard transform), the home
  // ScrollView wrapper (homeOpacity), and the Modal contents (lessonOpacity)
  // so all three layers ride a single coordinated timeline.
  const heroDive = useHeroDive();
  const homeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: heroDive.homeOpacity.value,
  }));
  const lessonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: heroDive.lessonOpacity.value,
  }));

  // Drives pointerEvents on the lesson wrapper. Stays `false` while the dive
  // is mid-fade-in (lesson is partially transparent) and during the close
  // playReverse, so a stray tap can't trigger a button that's only 30%
  // visible. Flips to `true` after `playDive` settles, back to `false` at
  // the start of every close.
  const [lessonInteractive, setLessonInteractive] = useState(false);

  // Drives `renderToHardwareTextureAndroid` on the home wrapper for the
  // duration of the dive (open Phase 1 → modal lifetime → close Phase 2).
  // Android compositor caches the entire ScrollView subtree (header,
  // calendar, progress bar, deck, CTA) as a single GPU texture, so the
  // homeOpacity fade applies to the cached texture instead of recompositing
  // every child every frame. Without this the Phase 1 fade visibly stutters
  // on mid-tier Android. Set true BEFORE Phase 1 so Android has a frame to
  // create the texture, kept true through the modal lifetime so the close
  // Phase 2 home-return fade rides the same cache, dropped after the dive
  // completes (frees ~5–10MB GPU memory). iOS ignores the prop.
  const [diveActive, setDiveActive] = useState(false);

  // Re-entrancy lock — blocks rapid taps and overlapping open↔close calls.
  // Without this, double-tapping START MY DAY queues two playDive calls (the
  // second overrides the first mid-flight, leaving lessonOpacity at an
  // unpredictable mid-tween value), and tapping while a close is in flight
  // can leave the prior promise dangling → modal never unmounts. Ref instead
  // of state because we read/write it synchronously in event handlers
  // without re-render churn.
  const isHeroDiveBusy = useRef(false);

  // Hero-dive open: dispatch the modal-slot state change FIRST (so the lesson
  // mounts behind a transparent Modal at lessonOpacity=0), then run the dive
  // timeline. The lesson crossfades in once the card has dived out.
  // Hero-dive open — TWO-PHASE on purpose. See `useHeroDive.ts` for the full
  // explanation of why a single-phase timeline ran on iOS but not Android.
  // Short version: Android Modal extends Dialog and reduces parent Activity
  // paint while it's mounted, so the home fade + card dive (Today surface)
  // weren't composited if we ran them with the Modal already up.
  //
  // Phase 1: dive on Today (no Modal yet) — both platforms paint Today.
  // <openModal — Modal mounts; double-RAF lets React commit + the lesson's
  //  heavy children (TodayVideoLesson / expo-video) lay out before Phase 2>
  // Phase 2: lesson crossfade (Modal is now the active surface).
  const openWithDive = async (target: ModalState) => {
    if (isHeroDiveBusy.current) return;
    isHeroDiveBusy.current = true;
    setLessonInteractive(false);
    try {
      // Enable Android hardware texture on the home wrapper BEFORE Phase 1.
      // setDiveActive(true) → React re-render → Android allocates GPU
      // texture for the ScrollView subtree. The double-RAF gives the
      // compositor 2 frames (~32ms) to commit the texture before opacity
      // tweens start; without the wait, Phase 1's first frames composite
      // without the cache and the visible stutter remains.
      setDiveActive(true);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      // Kick off Phase 1 FIRST so the dive animation is already in flight
      // on the UI thread (Reanimated worklets run independently of the JS
      // thread). The returned promise settles in ~550ms.
      const phase1Promise = heroDive.playDivePhase1();

      // Mount the Modal IN PARALLEL with the dive. Modal mount on Android
      // synchronously blocks the JS thread for ~1–2s while expo-video
      // initialises (HLS source fetch + MediaCodec decoder warmup). Before
      // this overlap, that block landed AFTER Phase 1, leaving the user
      // staring at a faded-out home with no modal for 1–2s — perceived as
      // a freeze. Running it during the dive hides the JS-thread block
      // behind the animation that's already running on the UI thread.
      //
      // Note: the slot state change here triggers a React re-render that
      // mounts the Modal subtree. The Modal's `transparent={true}` +
      // lessonOpacity=0 means the user doesn't see lesson contents during
      // Phase 1 — only after Phase 2 ramps lessonOpacity 0→1.
      openModal(target);

      // Wait for Phase 1 to finish. By now Modal mount + video init are
      // typically done too (1–2s mount overlapped with 550ms+ wait).
      await phase1Promise;

      // Settling buffer between phases — Android only.
      //
      // iOS — no buffer. The dive ends and Phase 2 must start the very
      // next frame; any wait here reads as "modal is late vs. the dive"
      // (user-reported on iOS, "modal hiển thị chậm hơn so với animation
      // dive khi zoom lên"). expo-video init is fast on iOS, the JS
      // thread is free by Phase 1 end, and Phase 2's `withTiming` is
      // scheduled on the UI thread regardless — no settling needed.
      //
      // Android — setTimeout 120ms. JS thread may still be finalising
      // expo-video MediaCodec init / Modal layout when Phase 1 ends.
      // A `requestAnimationFrame` here would queue behind that block
      // and fire all at once when JS frees, visually compressing
      // Phase 2 (fade-in starts late, runs short). A real wall-clock
      // timer fires regardless of JS state, so Phase 2 schedules with
      // consistent timing and any final video-poster commit lands
      // before lessonOpacity ramps.
      if (Platform.OS === "android") {
        await new Promise<void>((resolve) => setTimeout(resolve, 120));
      }

      // Phase 2 — Modal active surface, lesson crossfades in.
      await heroDive.playDivePhase2();
    } finally {
      isHeroDiveBusy.current = false;
      setLessonInteractive(true);
    }
  };

  // Hero-dive close — mirrors the open: lesson fade-out (Modal phase) →
  // closeModal → home + card return (Today phase). Without splitting, the
  // Phase 2 "card returns to scale 1" runs while the Modal is still mounted
  // on Android, so the user sees a hard pop from scale 2.1 → 1 the instant
  // the Modal unmounts.
  const closeWithDive = async () => {
    if (isHeroDiveBusy.current) return;
    isHeroDiveBusy.current = true;
    setLessonInteractive(false);
    try {
      // Phase 1 — lesson fades out (Modal active surface).
      await heroDive.playReversePhase1();

      // Unmount the Modal. closeModal sets slot state → next render Modal
      // disappears. Today is now the active surface for Phase 2.
      closeModal();

      // Wait for the Modal to unmount before animating Today layers. Without
      // this, the home/card tweens start while Android is still tearing the
      // Dialog down → animations invisible.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      // Phase 2 — home + card return (Today active surface).
      await heroDive.playReversePhase2();
    } finally {
      isHeroDiveBusy.current = false;
      // Drop the Android hardware texture now that the dive is fully done.
      // Keeping it allocated longer would tie up GPU memory while the user
      // is back on Today scrolling — and ScrollView + always-on hardware
      // texture is a known anti-pattern (texture invalidates on every
      // scroll frame, costs more than it saves).
      setDiveActive(false);
    }
  };

  // Quiz unmounts when the modal closes (and never fires
  // onResultsChange(false) on its way out), so reset chrome-related
  // quiz state whenever neither slot is showing the quiz. Without
  // this, the next time any modal opens after a completed quiz, the
  // chrome would mount with hideProgress / transparent header still
  // active from the prior session.
  useEffect(() => {
    if (slotAModal !== "quiz" && slotBModal !== "quiz") {
      setIsQuizResultsVisible(false);
      setIsQuizFeedbackVisible(false);
    }
  }, [slotAModal, slotBModal]);

  // Race-guard shared between paywall (writes) and history's
  // subscription-expiration effect (reads). Owned here so both hooks can
  // see the same ref.
  const justPurchasedRef = useRef(false);

  // Calendar / historical-date navigation state. Owns selectedDate,
  // displayedQuest, isHistoricalView, completedDatesCache, the Supabase
  // fetchers, and the 3 sync effects (todayQuest → displayedQuest,
  // subscription-expired recovery, completed-dates cache refresh).
  const {
    selectedDate,
    setSelectedDate,
    displayedQuest,
    setDisplayedQuest,
    isHistoricalView,
    setIsHistoricalView,
    completedDatesCache,
    fetchQuestByDate,
    refreshCompletedDates,
  } = useTodayHistory({
    todayQuest,
    userId: user?.id,
    isSubscribed,
    isSubscriptionLoading,
    justPurchasedRef,
  });

  // Daily story PostHog tracking
  const tracking = useDailyStoryTracking({
    storyId: (displayedQuest || todayQuest)?.id || null,
    storyDate: (displayedQuest || todayQuest)?.date || null,
    storyTitle: (displayedQuest || todayQuest)?.content?.today_title || (displayedQuest || todayQuest)?.content?.card1?.title || null,
    entrySource: isHistoricalView ? 'rewind' : 'today_tab',
    isToday: !isHistoricalView,
    isSubscribed,
  });

  // Paywall presentation flow for daily-story rewind. Re-entrancy guard
  // lives inside the hook; the cross-hook `justPurchasedRef` is shared.
  const { handleShowPaywall } = useTodayPaywall({
    fetchQuestByDate,
    justPurchasedRef,
    onUnlockHistoricalDate: (date, quest) => {
      setSelectedDate(date);
      setIsHistoricalView(true);
      setDisplayedQuest(quest);
    },
  });

  useEffect(() => {
    StatusBar.setBarStyle("dark-content");
  }, []);

  // Handle calendar date click
  const handleDateClick = async (date: Date) => {
    const dateStr = toLocalDateString(date);
    const today = toLocalDateString(new Date());
    const isPastDate = dateStr < today;

    AppLogger.info("daily", "Date clicked", { dateStr });

    // Track rewind tapped for past dates
    if (isPastDate) {
      const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      tracking.trackRewindTapped(dateStr, daysAgo);
    }

    // Wait for subscription status to load before making gate decisions
    if (isPastDate && isSubscriptionLoading) {
      AppLogger.info("daily", "Waiting for subscription status");
      return;
    }

    if (dateStr === today) {
      // Viewing current day - always allowed
      AppLogger.info("daily", "Returning to current day");
      setSelectedDate(date);
      setDisplayedQuest(todayQuest);
      setIsHistoricalView(false);
    } else if (isPastDate && !isSubscribed) {
      // Past date and not subscribed - track block and show paywall
      const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      tracking.trackRewindBlocked(dateStr, daysAgo);
      AppLogger.info("daily", "Subscription required for date", { dateStr });
      await handleShowPaywall(date);
    } else {
      // Past date and subscribed - load historical content
      AppLogger.info("daily", "Loading historical content", { dateStr });
      setSelectedDate(date);
      setIsHistoricalView(true);
      const historicalQuest = await fetchQuestByDate(dateStr);
      setDisplayedQuest(historicalQuest);
    }
  };

  // Per-section completion state for the active quest. Loads from Supabase
  // (with AsyncStorage fallback), exposes setters + a save helper that
  // round-trips to both stores, and derives `progress` / unlock flags.
  const {
    watchCompleted,
    exploreCompleted,
    questCompleted,
    quizCorrectAnswers,
    isLoadingProgress,
    progress,
    isExploreUnlocked,
    isQuizUnlocked,
    setWatchCompleted,
    setExploreCompleted,
    setQuestCompleted,
    setQuizCorrectAnswers,
    saveProgress,
  } = useTodayProgress({
    displayedQuest,
    todayQuest,
    userId: user?.id,
    isHistoricalView,
  });

  // Refresh the calendar's completed-dates cache when the user finishes
  // the current day. (User-id changes are handled inside useTodayHistory.)
  useEffect(() => {
    if (questCompleted) refreshCompletedDates();
  }, [questCompleted, refreshCompletedDates]);

  // Card-deck data: builds the [explore, watch, questions] tuple from
  // the active quest + completion state. Memoized so unrelated parent
  // renders don't churn TodayCardDeck's per-card crossfade effects.
  const cardsData = useTodayCardsData({
    todayQuest,
    displayedQuest,
    watchCompleted,
    exploreCompleted,
    questCompleted,
    quizCorrectAnswers,
    isExploreUnlocked,
    isQuizUnlocked,
    // Route card-deck taps through `openWithDive` so they share the same
    // hero-dive timeline as the START MY DAY button. Calling `openModal`
    // directly here bypassed the dive entirely, and because the lesson
    // wrapper's `lessonOpacity` shared value sits at 0 until `playDivePhase2`
    // ramps it, the Modal mounted but rendered fully transparent — "tap
    // card, nothing happens" from the user's view.
    openModal: openWithDive,
  });

  // Live Activity — cache quiz results for XP plumbing to Live Activity completion
  const lastQuizCorrectAnswersRef = useRef(0);

  // iOS Live Activity coordination — starts on first Today focus, syncs
  // streak changes, exposes `updateDailyStoryIfActive` for onNext callbacks.
  const { updateDailyStoryIfActive } = useDailyStoryLiveActivity({
    todayQuest,
    displayedQuest,
    isHistoricalView,
    watchCompleted,
    exploreCompleted,
    questCompleted,
    streak,
  });

  // Handle quiz completion
  const handleQuizComplete = async () => {
    setQuestCompleted(true);
    AppLogger.info("daily", "Quiz completed, quest finished");

    // Track daily story completed
    await tracking.trackCompleted();

    // Trigger celebration immediately when quiz is completed (including replays)
    const currentQuest = displayedQuest || todayQuest;
    if (currentQuest?.date && watchCompleted && exploreCompleted) {
      const questDate = currentQuest.date;
      const xpEarned = lastQuizCorrectAnswersRef.current * 10;
      AppLogger.info("daily", "Triggering celebration", { questDate, xpEarned });
      await reportTodayComplete(questDate, xpEarned);
      AppLogger.info("daily", "Celebration triggered");
    }
  };

  // Note: Celebration now triggered directly in handleQuizComplete (not useEffect)
  // This ensures animation shows only when user actively completes quiz, not when loading completed quest

  // Loading state — plain View + insets.top instead of SafeAreaView
  // for the same async-settle reason as the main return below.
  if (loading) {
    return (
      <View style={[themeStyles.container, { paddingTop: insets.top }]}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator
            size="large"
            color={ArchivesTheme.colors.persianOrange}
          />
          <Text
            style={{
              fontFamily: "DM Sans",
              fontSize: 16,
              fontWeight: "600",
              color: ArchivesTheme.colors.shoeBrown,
              marginTop: 16,
            }}
          >
            Loading today’s quest...
          </Text>
        </View>
      </View>
    );
  }

  const headerTitle = (() => {
    if (isHistoricalView && !displayedQuest) {
      const day = selectedDate.getDate();
      const month = selectedDate.toLocaleDateString("en-US", { month: "short" });
      return `${day} ${month}'s Story`;
    }

    const currentQuest = displayedQuest || todayQuest;
    if (!currentQuest?.date) return "Today's Story";

    const today = toLocalDateString(new Date());
    if (currentQuest.date === today) return "Today's Story";

    const questDate = new Date(currentQuest.date + "T00:00:00");
    const day = questDate.getDate();
    const month = questDate.toLocaleDateString("en-US", { month: "short" });
    return `${day} ${month}'s Story`;
  })();

  const progressLabel = (() => {
    if (isHistoricalView && !displayedQuest) {
      const day = selectedDate.getDate();
      const month = selectedDate.toLocaleDateString("en-US", { month: "short" });
      return `${day} ${month}'s progress`;
    }

    const currentQuest = displayedQuest || todayQuest;
    if (!currentQuest?.date) return "Progress today";

    const today = toLocalDateString(new Date());
    if (currentQuest.date === today) return "Progress today";

    const questDate = new Date(currentQuest.date + "T00:00:00");
    const day = questDate.getDate();
    const month = questDate.toLocaleDateString("en-US", { month: "short" });
    return `${day} ${month}'s progress`;
  })();

  // Render content for a given modal state (used by both slots)
  const renderModalContent = (modal: ModalState) => {
    if (modal === "none") return null;

    const quest = displayedQuest || todayQuest;
    if (!quest) {
      AppLogger.error("daily", "renderModalContent called with no quest data");
      return null;
    }

    if (modal === "video") {
      const card1 = quest.content.card1;
      const sourceUrl = card1.media_hls_url !== undefined ? card1.media_hls_url : card1.media_url;
      const mediaUrls = Array.isArray(sourceUrl)
        ? sourceUrl
        : [sourceUrl];

      return (
        <TodayVideoLesson
          contentItem={{
            id: quest.id,
            thumbnail_title: card1.title,
            thumbnail_url: "",
            media_url: mediaUrls,
            content_type: card1.content_type || "reel",
            background_music_url: card1.background_music_url,
            bottom_content: {
              title: card1.title,
              description: card1.content.reading_text,
              reading_text: card1.content.reading_text,
              captions: card1.content.captions || [],
            },
            order_by: 0,
          } as ContentItem}
          progress={progress}
          onMediaPlayed={() => tracking.trackMediaPlayed("video", quest.id)}
          onNext={async () => {
            if (isModalTransitioning.current) return;
            setWatchCompleted(true);
            await saveProgress("watch");
            updateDailyStoryIfActive({ watchCompleted: true, exploreCompleted: false, questionsCompleted: false });
            animateModalTransition("reading", "video", "forward");
            tracking.trackCardViewed(2);
          }}
          onDismiss={() => {
            if (isModalTransitioning.current) return;
            closeWithDive();
          }}
        />
      );
    }

    if (modal === "reading") {
      return (
        <TodayScrollableLesson
          contentBlocks={
            quest.content.card2.content_blocks || []
          }
          progress={progress}
          innerVoiceUrl={
            quest.content.card2.inner_voice
          }
          onMediaPlayed={() => tracking.trackMediaPlayed("audio", quest.id)}
          onContinue={async () => {
            if (isModalTransitioning.current) return;
            setExploreCompleted(true);
            await saveProgress("explore");
            updateDailyStoryIfActive({ watchCompleted: true, exploreCompleted: true, questionsCompleted: false });
            animateModalTransition("quiz", "reading", "forward");
            tracking.trackCardViewed(3);
          }}
          onBack={() => {
            if (isModalTransitioning.current) return;
            if (previousModal === "video") {
              animateModalTransition("video", "none", "backward");
              tracking.trackCardViewed(1);
            } else {
              closeWithDive();
            }
          }}
        />
      );
    }

    if (modal === "quiz") {
      if (!user) {
        AppLogger.error("quiz", "[Today] Quiz modal opened without authenticated user");
        // Error path — snap close, no need to play reverse dive
        closeModal();
        return null;
      }
      // Quiz body wraps in TodayLessonChrome for the floating back +
      // progress header; bottom CTAs are hidden because Quiz owns its
      // own SUBMIT / feedback-sheet CONTINUE buttons (figma 3379:5286 +
      // 5131 + 5167 — buttons live inside the quiz / feedback sheet, not
      // on the chrome). The chrome's back button maps to closeModal so
      // the back gesture exits the entire modal stack.
      const handleQuizBack = () => {
        if (isModalTransitioning.current) return;
        if (previousModal === "reading") {
          animateModalTransition("reading", "video", "backward");
          tracking.trackCardViewed(2);
        } else {
          closeWithDive();
        }
      };
      return (
        <SafeAreaView
          style={{ flex: 1, backgroundColor: colors.snow }}
          edges={[]}
        >
          {/* While the quiz feedback sheet is open, drop the chrome
              header background to transparent so Quiz's dim backdrop
              (which already absolute-fills the entire screen behind
              the chrome) bleeds through behind the back button +
              progress bar — without this, the chrome's z-indexed
              absolute header masks the dim and only the body looks
              dimmed. */}
          <TodayLessonChrome
            progress={progress}
            onBack={handleQuizBack}
            headerBackground={
              // Transparent during feedback (so the dim backdrop covers
              // the header zone) AND during results (so QuizResults's
              // cream body bleeds up under the back button instead of
              // a snow-on-cream seam at the top of the screen).
              isQuizFeedbackVisible || isQuizResultsVisible
                ? "transparent"
                : colors.snow
            }
            backIconColor={colors.bluePrimary}
            progressLabelColor={colors.bluePrimary}
            progressFillColor={colors.bluePrimary}
            progressTrackColor={colors.blueSecondary}
            hideProgress={isQuizResultsVisible}
            hideBottomCtas
            // Chrome's bottom CTA row is hidden, but the prop is required.
            rightCta={null}
          >
          <Quiz
            contentItem={
              {
                id: quest.id,
                questions: quest.content.card3.questions,
                thumbnail_title: quest.content.card3.title,
                thumbnail_url: "",
                media_url: [],
                content_type: "reel",
                bottom_content: null,
                order_by: 0,
              } as ContentItem
            }
            adventureId="daily_quest"
            moduleId={quest.id}
            eraId="daily_quest"
            eraName="Daily Quest"
            isToday={true}
            onFeedbackChange={({ visible }) => setIsQuizFeedbackVisible(visible)}
            onResultsChange={setIsQuizResultsVisible}
            onQuizResults={async (score, correctAnswers, totalQuestions) => {
              // Cache for Live Activity XP plumbing (read in handleQuizComplete)
              lastQuizCorrectAnswersRef.current = correctAnswers;
              // Surface the score so the deck's center card shows the
              // gold/grey star row immediately — without it we'd have to
              // wait for the next Supabase reload before stars appear.
              setQuizCorrectAnswers(correctAnswers);
              try {
                await saveQuestCompletion(
                  user.id,
                  quest.id,
                  score,
                  correctAnswers,
                  totalQuestions,
                );
                AppLogger.info("daily", "Quest completion saved to Supabase");
              } catch (error) {
                AppLogger.error("daily", "Failed to save completion", {}, error);
              }
            }}
            onContinue={async () => {
              if (isModalTransitioning.current) return;
              await handleQuizComplete();
              closeWithDive();
            }}
            onDismiss={() => {
              if (isModalTransitioning.current) return;
              if (previousModal === "reading") {
                animateModalTransition("reading", "video", "backward");
                tracking.trackCardViewed(2);
              } else {
                closeWithDive();
              }
            }}
            onBack={() => {
              if (isModalTransitioning.current) return;
              if (previousModal === "reading") {
                animateModalTransition("reading", "video", "backward");
                tracking.trackCardViewed(2);
              } else {
                closeWithDive();
              }
            }}
          />
          </TodayLessonChrome>
        </SafeAreaView>
      );
    }

    return null;
  };

  return (
    <View style={[themeStyles.container, { paddingTop: Platform.OS === "ios" ? insets.top : (insets.top + 11) }]}>
      {/* Home layer — fades to opacity 0 during the hero dive (mock
          `index.html:1696-1707`). Wraps both the scrollable content AND
          the fixed-bottom CTA so the whole home recedes in lockstep, while
          the modal lives outside this wrapper at full opacity. `flex: 1`
          on the Animated.View keeps the existing layout (the unwrapped
          structure had ScrollView + bottom CTA as siblings of the outer
          View; we preserve that flex behavior here).

          `collapsable={false}` (Android-only) — without this, RN's view
          flattening can fold the Animated.View into its child during a
          translate/opacity cycle, breaking the opacity layer at runtime.
          Cheap insurance: the wrapper exists purely to host the opacity
          shared value, so flattening would defeat its purpose.

          `pointerEvents="none"` while a lesson modal is mounted — once the
          dive starts, the home is invisible (or about to be); blocking
          touches here means a stray tap during the 250ms fade can't fire
          a card pill or scroll. The Modal still catches its own touches
          via `lessonInteractive` below. */}
      <Animated.View
        style={[{ flex: 1 }, homeAnimatedStyle]}
        collapsable={false}
        pointerEvents={
          slotAModal !== "none" || slotBModal !== "none" ? "none" : "auto"
        }
        // Android-only: cache the entire home subtree (header + calendar +
        // progress bar + deck + CTA) as one GPU texture during the dive.
        // homeOpacity tweens then apply to the cached texture instead of
        // recompositing every child every frame — fixes the visible Phase 1
        // stutter on mid-tier Android devices. Toggled false when the dive
        // ends (in `closeWithDive`'s finally) to free GPU memory and avoid
        // the ScrollView+texture-invalidate anti-pattern when the user
        // resumes scrolling Today.
        renderToHardwareTextureAndroid={diveActive}
      >
      <ScrollView
        style={themeStyles.scrollView}
        contentContainerStyle={themeStyles.scrollContent}
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
          <TodayHeader
            title={headerTitle}
            streak={streak}
            onStreakPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              showStreakCelebration();
            }}
            style={{ marginBottom: 15 }}
          />
        </AnimatedEntrance>

        {/* Calendar — per-day-cell entrance with 50ms stagger lives inside
            TodayCalendar (not wrapped here) to match the mock's `.week-row .day` stagger. */}
        <TodayCalendar
          selectedDate={selectedDate}
          onSelectDate={handleDateClick}
          completedDates={completedDatesCache ?? new Set<string>()}
          isSubscribed={isSubscribed}
          style={{ marginBottom: 16 }}
          entranceDelay={180}
        />

        <AnimatedEntrance
          delay={500}
          preset={{
            opacity: { from: 0, to: 1 },
            duration: 300,
            easing: easings.power2Out,
          }}
        >
          <TodayProgressBar label={progressLabel} progress={progress} style={{ marginBottom: 30 }} />
        </AnimatedEntrance>

        {/* No Quest Available - Shows inline when no content exists (historical or today) */}
        {(isHistoricalView && !displayedQuest) ||
        (!isHistoricalView && !todayQuest) ? (
          <TodayEmptyState isHistoricalView={isHistoricalView} />
        ) : (
          <>
            {/* Wave entrance is now handled per-Card inside TodayCardDeck —
                each card translates 60→0 with `back.out(1.4)`, 90ms staggered
                from a 650ms base (mock `index.html:1883-1885`). Wrapping the
                whole deck in a single AnimatedEntrance flattened the wave
                into one slide-up; the per-card stagger lives next to the
                carousel's other shared values for direct transform-array
                composition. */}
            <TodayCardDeck
              cards={cardsData}
              isLoading={isLoadingProgress}
              heroDiveScale={heroDive.cardScale}
              heroDiveOpacity={heroDive.cardOpacity}
            />

            {/* Bottom Spacing for fixed button */}
            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* Start My Day Button - Fixed at Bottom with 3D depth effect */}
      {!(isHistoricalView && !displayedQuest) && (
        <AnimatedEntrance
          delay={1050}
          preset={{
            translateY: { from: 40, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 500,
            easing: easings.backOut2,
          }}
          style={themeStyles.bottomButtonContainer}
        >
          <DepthButton
            isFullWidth
            variant="secondary"
            onPress={() => {
              // Hero dive — pick the next-incomplete section, then run the
              // mock-spec timeline (home fade + center card scale 1→2.1 +
              // lesson crossfade in). `openWithDive` mounts the lesson at
              // lessonOpacity=0 and triggers the timeline on the next frame.
              if (progress === 100) {
                openWithDive("video");
              } else if (!watchCompleted) {
                openWithDive("video");
              } else if (!exploreCompleted) {
                openWithDive("reading");
              } else if (isQuizUnlocked) {
                openWithDive("quiz");
              }
            }}
          >
            <Typography variant="label.m" color="white">
              {progress === 100 ? "RESTART MY DAY" : "START MY DAY"}
            </Typography>
          </DepthButton>
        </AnimatedEntrance>
      )}
      </Animated.View>

      {/* Dual-slot modal for Apple-style push/pop transitions.
          `transparent={true}` + `animationType="none"` lets the hero-dive
          timeline (mock `index.html:1672-1768`) run instead of the OS slide:
          - Today screen stays visible behind the Modal during the dive so
            the user can SEE the home fade out + center card "lao vào".
          - Modal contents start at `lessonOpacity=0` and crossfade in (400ms
            `power2.inOut`) once the dive completes — matches goTo() crossfade
            in the mock.
          - Modal still presents at window level above the native tab bar
            (`@bottom-tabs/react-navigation`) since `transparent` uses
            `UIModalPresentationOverFullScreen` on iOS.
          SafeAreaProvider wrapper is critical on Android: the Modal opens
          its own window when `statusBarTranslucent={true}`, and the
          app-root SafeAreaProvider does NOT automatically propagate into
          that new window. */}
      {(slotAModal !== "none" || slotBModal !== "none") &&
        (displayedQuest || todayQuest) && (
          <Modal
            visible={true}
            animationType="none"
            transparent={true}
            statusBarTranslucent={true}
            // Android-only: explicit hardware acceleration for the modal
            // window. Default is true on most devices, but on some OEM
            // skins the transparent-modal compositor falls back to
            // software rendering, dropping the dive timeline to ~30fps.
            hardwareAccelerated={true}
          >
            <SafeAreaProvider>
              <Animated.View
                style={[{ flex: 1 }, lessonAnimatedStyle]}
                collapsable={false}
                // Block taps while the lesson is mid-fade. `lessonInteractive`
                // flips to true only after `playDive` resolves and back to
                // false at the start of every close. During those windows the
                // lesson wrapper is partially transparent — letting taps
                // through could trigger a button the user can barely see.
                pointerEvents={lessonInteractive ? "auto" : "none"}
              >
                <Animated.View
                  style={slotAAnimatedStyle}
                  pointerEvents={slotAModal !== "none" && outgoingSlot !== "A" ? "auto" : "none"}
                >
                  {renderModalContent(slotAModal)}
                </Animated.View>
                <Animated.View
                  style={slotBAnimatedStyle}
                  pointerEvents={slotBModal !== "none" && outgoingSlot !== "B" ? "auto" : "none"}
                >
                  {renderModalContent(slotBModal)}
                </Animated.View>
              </Animated.View>
            </SafeAreaProvider>
          </Modal>
        )}
    </View>
  );
}
