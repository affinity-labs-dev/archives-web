import { useMemo } from "react";
import type { ImageSource } from "expo-image";

import type { TodayCardData } from "@/components/today/TodayCardDeck";

import type { Today } from "./useTodayQuest";

// Static per-card config — kicker label, pill label, default duration,
// fallback background image. Title and completion-state are derived per
// render. Live thumbnails are sourced from Supabase via
// `cardN.thumbnail_url`; the static `imageSource` here is the fallback
// used until the per-day field is populated.
type CardKind = "explore" | "watch" | "questions";

interface CardConfig {
  kind: CardKind;
  kicker: string;
  pillLabel: string;
  defaultMinutes: string;
  imageSource: ImageSource | number;
}

const CARD_CONFIGS: Record<CardKind, CardConfig> = {
  explore: {
    kind: "explore",
    kicker: "Explore",
    pillLabel: "Start",
    defaultMinutes: "1 MIN",
    imageSource: require("@/assets/images/eras/era1-bg.jpg"),
  },
  watch: {
    kind: "watch",
    kicker: "Watch",
    pillLabel: "Watch",
    defaultMinutes: "2 MIN",
    imageSource: require("@/assets/images/adventure-backgrounds/UmmayadDynasty.png"),
  },
  questions: {
    kind: "questions",
    kicker: "Questions",
    pillLabel: "Start",
    defaultMinutes: "2 MIN",
    imageSource: require("@/assets/images/eras/era2-bg.jpg"),
  },
};

interface UseTodayCardsDataArgs {
  todayQuest: Today | null;
  displayedQuest: Today | null;
  watchCompleted: boolean;
  exploreCompleted: boolean;
  questCompleted: boolean;
  /**
   * Quiz correct-answer count (0..3) once the quiz has been submitted; null
   * before then. Forwarded onto every card so the centered card can render
   * the star row when the user is viewing a completed day.
   */
  quizCorrectAnswers: number | null;
  isExploreUnlocked: boolean;
  isQuizUnlocked: boolean;
  openModal: (modal: "video" | "reading" | "quiz") => void;
}

/**
 * Builds the [explore, watch, questions] tuple consumed by TodayCardDeck.
 *
 * Three responsibilities split out from the inline IIFE in today.tsx:
 * - Per-card static config (kicker / pill / default duration / image)
 *   lives in `CARD_CONFIGS`.
 * - Title comes from quest content (`card2.thumbnail_title`, `card1.title`,
 *   etc.); minutes flips to "DONE" when the section is completed.
 * - onPress callbacks gate on the unlock flags before opening the modal.
 *
 * Memoized so a new tuple reference is only produced when something
 * actually changed — avoids re-triggering TodayCardDeck's per-card
 * crossfade effects on unrelated parent renders.
 */
export function useTodayCardsData({
  todayQuest,
  displayedQuest,
  watchCompleted,
  exploreCompleted,
  questCompleted,
  quizCorrectAnswers,
  isExploreUnlocked,
  isQuizUnlocked,
  openModal,
}: UseTodayCardsDataArgs): [TodayCardData, TodayCardData, TodayCardData] {
  return useMemo(() => {
    const quest = displayedQuest || todayQuest;
    const card1 = quest?.content?.card1;
    const card2 = quest?.content?.card2;
    const card3 = quest?.content?.card3;

    const explore: TodayCardData = {
      ...CARD_CONFIGS.explore,
      imageSource: card2?.thumbnail_url
        ? { uri: card2.thumbnail_url }
        : CARD_CONFIGS.explore.imageSource,
      title: card2?.thumbnail_title ?? "",
      minutes: exploreCompleted ? "DONE" : CARD_CONFIGS.explore.defaultMinutes,
      completed: exploreCompleted,
      quizCorrectAnswers,
      onPress: () => {
        if (isExploreUnlocked) openModal("reading");
      },
    };

    const watch: TodayCardData = {
      ...CARD_CONFIGS.watch,
      imageSource: card1?.thumbnail_url
        ? { uri: card1.thumbnail_url }
        : CARD_CONFIGS.watch.imageSource,
      title: card1?.title ?? "",
      minutes: watchCompleted ? "DONE" : CARD_CONFIGS.watch.defaultMinutes,
      completed: watchCompleted,
      quizCorrectAnswers,
      onPress: () => {
        if (card1?.media_url) openModal("video");
      },
    };

    const questions: TodayCardData = {
      ...CARD_CONFIGS.questions,
      imageSource: card3?.thumbnail_url
        ? { uri: card3.thumbnail_url }
        : CARD_CONFIGS.questions.imageSource,
      title: "Test your knowledge",
      minutes: questCompleted ? "DONE" : CARD_CONFIGS.questions.defaultMinutes,
      completed: questCompleted,
      quizCorrectAnswers,
      onPress: () => {
        if (isQuizUnlocked) openModal("quiz");
      },
    };

    return [explore, watch, questions];
  }, [
    todayQuest,
    displayedQuest,
    watchCompleted,
    exploreCompleted,
    questCompleted,
    quizCorrectAnswers,
    isExploreUnlocked,
    isQuizUnlocked,
    openModal,
  ]);
}
