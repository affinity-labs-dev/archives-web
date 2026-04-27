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
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

// Theme styles
const themeStyles = ArchivesTheme.common.today;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// (Quest fetching, types, and per-section progress have moved to:
//  - hooks/useTodayQuest.ts
//  - hooks/useTodayProgress.ts
//  - hooks/useTodayPaywall.ts )


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

  // Track quiz feedback visibility so we can make the chrome's
  // floating header transparent while the per-question feedback sheet
  // is up — Quiz's dim backdrop already covers the body, but the
  // chrome's z-indexed absolute header masks the dim at the top of
  // the screen unless we get out of the way.
  const [isQuizFeedbackVisible, setIsQuizFeedbackVisible] = useState(false);

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
    activeModal,
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

  // Handle StatusBar for fullscreen Explore modal (checks slots too for mid-transition)
  const isReadingVisible = activeModal === "reading" || slotAModal === "reading" || slotBModal === "reading";
  useEffect(() => {
    if (isReadingVisible) {
      StatusBar.setBarStyle("dark-content");
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor("transparent");
        StatusBar.setTranslucent(true);
      }
    } else {
      if (Platform.OS === "android") {
        StatusBar.setTranslucent(false);
      }
    }
  }, [isReadingVisible]);

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
    openModal,
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

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={themeStyles.container} edges={["top"]}>
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
      </SafeAreaView>
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
            closeModal();
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
              closeModal();
            }
          }}
        />
      );
    }

    if (modal === "quiz") {
      if (!user) {
        AppLogger.error("quiz", "[Today] Quiz modal opened without authenticated user");
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
          closeModal();
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
            headerBackground={isQuizFeedbackVisible ? "transparent" : colors.snow}
            backIconColor={colors.bluePrimary}
            progressLabelColor={colors.bluePrimary}
            progressFillColor={colors.bluePrimary}
            progressTrackColor={colors.blueSecondary}
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
              closeModal();
            }}
            onDismiss={() => {
              if (isModalTransitioning.current) return;
              if (previousModal === "reading") {
                animateModalTransition("reading", "video", "backward");
                tracking.trackCardViewed(2);
              } else {
                closeModal();
              }
            }}
            onBack={() => {
              if (isModalTransitioning.current) return;
              if (previousModal === "reading") {
                animateModalTransition("reading", "video", "backward");
                tracking.trackCardViewed(2);
              } else {
                closeModal();
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
    <SafeAreaView style={themeStyles.container} edges={["top"]}>
      <ScrollView
        style={themeStyles.scrollView}
        contentContainerStyle={themeStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/*
          Today entrance timeline — ported 1:1 from
          `Downloads/02 daily story/index.html:1843-1888` (`enterScreen1`).

            Element              | from→to                    | dur  | easing       | delay
            ──────────────────────┼────────────────────────────┼──────┼──────────────┼──────
            Title (header)        | y -16 → 0, opacity 0 → 1   | 450  | power2.out   | 0
            Calendar (week row)   | y -10 → 0, opacity 0 → 1   | 400  | back.out(2)  | 180
            Progress              | opacity 0 → 1              | 300  | power2.out   | 500
            Card deck             | y 60 → 0, opacity 0 → 1    | 550  | back.out(1.4)| 650
            Start button          | y 40 → 0, opacity 0 → 1    | 500  | back.out(2)  | 1050
        */}
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
          style={{ marginBottom: 22 }}
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
            <AnimatedEntrance
              delay={650}
              preset={{
                translateY: { from: 60, to: 0 },
                opacity: { from: 0, to: 1 },
                duration: 550,
                easing: easings.backOut14,
              }}
            >
              <TodayCardDeck
                cards={cardsData}
                isLoading={isLoadingProgress}
              />
            </AnimatedEntrance>

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
              if (progress === 100) {
                openModal("video");
              } else if (!watchCompleted) {
                openModal("video");
              } else if (!exploreCompleted) {
                openModal("reading");
              } else if (isQuizUnlocked) {
                openModal("quiz");
              }
            }}
          >
            <Typography variant="label.m" color="white">
              {progress === 100 ? "RESTART MY DAY" : "START MY DAY"}
            </Typography>
          </DepthButton>
        </AnimatedEntrance>
      )}

      {/* Dual-slot modal for Apple-style push/pop transitions */}
      {(slotAModal !== "none" || slotBModal !== "none") &&
        (displayedQuest || todayQuest) && (
          <Modal
            visible={true}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent={true}
          >
            <View style={{ flex: 1 }}>
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
            </View>
          </Modal>
        )}

    </SafeAreaView>
  );
}
