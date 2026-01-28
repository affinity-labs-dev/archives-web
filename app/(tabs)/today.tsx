// Daily Quest Tab - New card-based design with expandable sections
// Features: Calendar week view, progress tracker, three content cards (WATCH, EXPLORE, QUESTIONS)

import TodayVideoLesson from "@/components/lessons/TodayVideoLesson";
import Quiz from "@/components/quiz/Quiz";
import type { ContentItem } from "@/components/shared/types";
import ArchivesTheme from "@/constants/ArchivesTheme";
import { useGamificationOrchestrator, useGamifiedProgress } from "@/gamification";
import { supabase } from "@/hooks/lib/supabase";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import RenderHtml from "react-native-render-html";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

// Theme styles
const themeStyles = ArchivesTheme.common.today;

// Streak icon (flame) - orange on white background
const StreakIcon = ({ size = 14 }: { size?: number }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 -960 960 960"
    fill={ArchivesTheme.colors.persianOrange}
  >
    <Path d="M240-400q0 52 21 98.5t60 81.5q-1-5-1-9v-9q0-32 12-60t35-51l113-111 113 111q23 23 35 51t12 60v9q0 4-1 9 39-35 60-81.5t21-98.5q0-50-18.5-94.5T648-574q-20 13-42 19.5t-45 6.5q-62 0-107.5-41T401-690q-39 33-69 68.5t-50.5 72Q261-513 250.5-475T240-400Zm240 52-57 56q-11 11-17 25t-6 29q0 32 23.5 55t56.5 23q33 0 56.5-23t23.5-55q0-16-6-29.5T537-292l-57-56Zm0-492v132q0 34 23.5 57t57.5 23q18 0 33.5-7.5T622-658l18-22q74 42 117 117t43 163q0 134-93 227T480-80q-134 0-227-93t-93-227q0-129 86.5-245T480-840Z" />
  </Svg>
);

// ============================================================================
// TYPES & INTERFACES (from useToday.ts)
// ============================================================================

interface Card1Content {
  content_type: 'reel';
  title: string;
  media_url: string;
  content: {
    reading_text: string;
  };
}

interface Card2Content {
  content_type: 'scrollable_media_view';
  title: string;
  inner_image: string;
  inner_voice: string;
  content: string;
}

interface Card3Content {
  title: string;
  questions: Array<{
    question_id: string;
    question_text: string;
    question_type: 'mcq' | 'trueFalse';
    answers: Array<{
      answer_id: string;
      text: string;
      is_correct: boolean;
    }>;
    explanation: string;
    order: number;
  }>;
}

interface TodayContent {
  card1: Card1Content;
  card2: Card2Content;
  card3: Card3Content;
}

interface Today {
  id: string;
  date: string;
  content: TodayContent;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TodayProgress {
  id: string;
  user_id: string;
  daily_quest_id: string;
  completed_at: string;
  score: number;
  correct_answers: number;
  total_questions: number;
}

// ============================================================================
// HELPER FUNCTIONS (from ElevenLabsService.ts)
// ============================================================================

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Strip HTML tags from text to get plain text for TTS
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert text to speech and return a data URI
 */
async function textToSpeech(
  text: string,
  voiceId: string = '21m00Tcm4TlvDq8ikWAM'
): Promise<string | null> {
  console.log('🎤 [ElevenLabs] Starting TTS generation');
  console.log('   Text length:', text.length);
  console.log('   Voice ID:', voiceId);

  if (!ELEVENLABS_API_KEY) {
    console.error('❌ [ElevenLabs] API key not found');
    return null;
  }

  try {
    console.log('🌐 [ElevenLabs] Calling API...');
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          output_format: 'mp3_44100_128',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    console.log('📡 [ElevenLabs] Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ElevenLabs] API error:', response.status);
      console.error('   Error:', errorText);
      return null;
    }

    console.log('💾 [ElevenLabs] Converting to blob...');
    const blob = await response.blob();
    console.log('   Blob size:', blob.size, 'bytes');

    console.log('🔄 [ElevenLabs] Converting to base64...');
    const base64 = await blobToBase64(blob);
    console.log('   Base64 length:', base64.length);

    const dataUri = `data:audio/mpeg;base64,${base64}`;
    console.log('✅ [ElevenLabs] Success! Data URI ready');

    return dataUri;
  } catch (error) {
    console.error('❌ [ElevenLabs] Error:', error);
    return null;
  }
}

// ============================================================================
// CUSTOM HOOK (from useToday.ts)
// ============================================================================

function useToday(userId?: string) {
  const [todayQuest, setTodayQuest] = useState<Today | null>(null);
  const [questProgress, setQuestProgress] = useState<TodayProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodayQuest = async () => {
      try {
        setLoading(true);
        setError(null);

        const today = new Date();
        const todayDate = today.toISOString().split('T')[0];

        console.log(`🔍 [useToday] Fetching quest for ${todayDate}`);

        const { data: questData, error: questError } = await supabase
          .from('daily_content')
          .select('*')
          .eq('date', todayDate)
          .eq('is_active', true)
          .single();

        if (questError) {
          console.error('❌ [useToday] Error fetching quest:', questError);
          setError('No quest available for today');
          setTodayQuest(null);
          setLoading(false);
          return;
        }

        console.log('✅ [useToday] Quest fetched:', questData?.content?.card1?.title);
        setTodayQuest(questData as Today);

        if (userId && questData) {
          try {
            const { data: progressData, error: progressError } = await supabase
              .from('user_daily_quest_progress')
              .select('*')
              .eq('user_id', userId)
              .eq('daily_quest_id', questData.id)
              .maybeSingle();

            if (progressError) {
              console.warn('⚠️ [useToday] Progress query failed:', progressError.message);
            } else if (progressData) {
              console.log('✅ [useToday] User already completed this quest');
              setQuestProgress(progressData as TodayProgress);
            }
          } catch (err) {
            console.warn('⚠️ [useToday] Progress check failed:', err);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('❌ [useToday] Unexpected error:', err);
        setError('Failed to load daily quest');
        setLoading(false);
      }
    };

    fetchTodayQuest();
  }, [userId]);

  const saveQuestCompletion = async (
    userId: string,
    questId: string,
    score: number,
    correctAnswers: number,
    totalQuestions: number
  ) => {
    try {
      console.log(`💾 [useToday] Saving completion: ${correctAnswers}/${totalQuestions}`);

      const { data, error } = await supabase
        .from('user_daily_quest_progress')
        .insert({
          user_id: userId,
          daily_quest_id: questId,
          score,
          correct_answers: correctAnswers,
          total_questions: totalQuestions,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [useToday] Error saving completion:', error);
        throw error;
      }

      console.log('✅ [useToday] Completion saved');
      setQuestProgress(data as TodayProgress);
      return data;
    } catch (err) {
      console.error('❌ [useToday] Failed to save completion:', err);
      throw err;
    }
  };

  return {
    todayQuest,
    questProgress,
    loading,
    error,
    isCompleted: !!questProgress,
    saveQuestCompletion,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TodayScreen() {
  const { user } = useUser();
  const { streak, longestStreak, lastActiveBeforeUpdate, streakBeforeUpdate } = useGamificationOrchestrator();
  const { getStreak } = useGamifiedProgress();
  const {
    todayQuest,
    questProgress,
    loading,
    error,
    isCompleted,
    saveQuestCompletion,
  } = useToday(user?.id);
  const { width: contentWidth } = useWindowDimensions();

  // Debug logging
  useEffect(() => {
    if (todayQuest) {
      console.log("📋 [Today UI] Quest loaded:", {
        card1_media: todayQuest.content?.card1?.media_url,
        card2_voice: todayQuest.content?.card2?.inner_voice,
        card3_questions: todayQuest.content?.card3?.questions?.length,
      });
    }
  }, [todayQuest]);

  const [expandedCard, setExpandedCard] = useState<
    "watch" | "explore" | "questions" | null
  >(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showVideoLesson, setShowVideoLesson] = useState(false);
  const [showReadingView, setShowReadingView] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Generated audio state
  const [generatedAudioUri, setGeneratedAudioUri] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  // Voice selection state
  const [selectedVoice, setSelectedVoice] = useState('21m00Tcm4TlvDq8ikWAM'); // Rachel default
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  // Voice options
  const voices = [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'Female', desc: 'Clear, professional' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'Female', desc: 'Warm, friendly' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'Male', desc: 'Deep, narrative' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'Male', desc: 'Calm, storytelling' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'Female', desc: 'Young, energetic' },
  ];

  // Audio player for narration (dynamically generated from text or fallback to inner_voice)
  const player = useAudioPlayer(
    generatedAudioUri || todayQuest?.content?.card2?.inner_voice || null,
  );

  // Configure audio mode for silent mode playback
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true, // Audio plays even in silent mode
        });
        console.log(
          "🎵 [Today] Audio mode configured for silent mode playback",
        );
      } catch (error) {
        console.error("🎵 [Today] Failed to configure audio mode:", error);
      }
    };

    configureAudio();
  }, []);

  // Load saved voice preference from Supabase
  useEffect(() => {
    const loadVoicePreference = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('gamification_data')
          .select('data')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.log('📢 [Today] No saved voice preference found');
          return;
        }

        const preferredVoiceId = data?.data?.preferred_voice_id;
        if (preferredVoiceId) {
          console.log('📢 [Today] Loaded voice preference:', preferredVoiceId);
          setSelectedVoice(preferredVoiceId);
        }
      } catch (error) {
        console.error('❌ [Today] Error loading voice preference:', error);
      }
    };

    loadVoicePreference();
  }, [user?.id]);

  // Update player source when generated audio is ready
  useEffect(() => {
    if (generatedAudioUri) {
      console.log('🔄 [Today] Replacing player source with generated audio');
      player.replace(generatedAudioUri);
    } else if (todayQuest?.content?.card2?.inner_voice) {
      console.log('🔄 [Today] Using fallback audio source');
      player.replace(todayQuest.content.card2.inner_voice);
    }
  }, [generatedAudioUri, todayQuest]);

  // Generate audio from text when reading view opens
  useEffect(() => {
    if (showReadingView && todayQuest?.content?.card2?.content && !generatedAudioUri && !isGeneratingAudio) {
      const generateAudio = async () => {
        setIsGeneratingAudio(true);
        console.log('🎤 [Today] Starting voiceover generation...');

        try {
          // Strip HTML and get plain text
          const plainText = stripHtml(todayQuest.content.card2.content);
          console.log('📝 [Today] Text length:', plainText.length);

          // Generate audio
          const audioUri = await textToSpeech(plainText, selectedVoice);

          if (audioUri) {
            setGeneratedAudioUri(audioUri);
            console.log('✅ [Today] Voiceover generated successfully');
          } else {
            console.error('❌ [Today] Generation failed, using fallback');
          }
        } catch (error) {
          console.error('❌ [Today] Error:', error);
        }

        setIsGeneratingAudio(false);
      };

      generateAudio();
    }
  }, [showReadingView, todayQuest, generatedAudioUri, isGeneratingAudio]);

  // Toggle audio playback
  const toggleAudio = () => {
    console.log('🎵 [Today] Toggle audio clicked');
    console.log('   Player loaded:', player.isLoaded);
    console.log('   Player playing:', player.playing);
    console.log('   Generated URI:', generatedAudioUri ? 'Yes' : 'No');
    console.log('   Fallback URI:', todayQuest?.content?.card2?.inner_voice ? 'Yes' : 'No');

    if (!player.isLoaded) {
      console.log('❌ [Today] Player not loaded yet');
      return;
    }

    if (player.playing) {
      console.log('⏸️ [Today] Pausing audio');
      player.pause();
    } else {
      console.log('▶️ [Today] Playing audio');
      player.play();
    }
  };

  // Handle voice change and save to Supabase
  const handleVoiceChange = async (voiceId: string) => {
    console.log('📢 [Today] Changing voice to:', voiceId);
    setSelectedVoice(voiceId);
    setShowVoicePicker(false);

    // Clear generated audio to regenerate with new voice
    setGeneratedAudioUri(null);

    // Save to Supabase
    if (user?.id) {
      try {
        const { data: existingData } = await supabase
          .from('gamification_data')
          .select('data')
          .eq('user_id', user.id)
          .single();

        const updatedData = {
          ...(existingData?.data || {}),
          preferred_voice_id: voiceId,
        };

        const { error } = await supabase
          .from('gamification_data')
          .update({ data: updatedData })
          .eq('user_id', user.id);

        if (error) {
          console.error('❌ [Today] Error saving voice preference:', error);
        } else {
          console.log('✅ [Today] Voice preference saved');
        }
      } catch (error) {
        console.error('❌ [Today] Error saving voice preference:', error);
      }
    }
  };

  // Get current week dates for calendar
  const getWeekDates = () => {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayDay = today.getDate();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const dates = [];

    // Get full streak data from GamifiedProgress (includes longestStreakDate)
    const fullStreak = getStreak();
    const { longestStreakDate, lastActiveDate } = fullStreak;

    // Build a Set of all streak dates for efficient lookup
    const streakDates = new Set<string>();
    const missedDates = new Set<string>();

    // Check if we should show historical longest streak (when it's bigger than current)
    const useHistoricalStreak = longestStreak > streak;

    if (useHistoricalStreak && longestStreakDate) {
      console.log('📅 [Calendar] Using historical streak mode');

      // Add historical longest streak dates (e.g., 47 days ending Jan 24)
      const historicalEnd = new Date(longestStreakDate);
      historicalEnd.setHours(0, 0, 0, 0);

      for (let i = 0; i < longestStreak; i++) {
        const date = new Date(historicalEnd);
        date.setDate(historicalEnd.getDate() - i);
        streakDates.add(date.toISOString().split('T')[0]);
      }

      // Calculate current streak start date
      const currentStart = new Date(lastActiveDate);
      currentStart.setHours(0, 0, 0, 0);
      currentStart.setDate(currentStart.getDate() - (streak - 1));

      // Calculate gap between historical end and current start
      const gapDays = Math.floor((currentStart.getTime() - historicalEnd.getTime()) / (1000 * 60 * 60 * 24)) - 1;

      if (gapDays > 0) {
        console.log(`📅 [Calendar] Found ${gapDays} missed days between streaks`);
        for (let i = 1; i <= gapDays; i++) {
          const missedDate = new Date(historicalEnd);
          missedDate.setDate(historicalEnd.getDate() + i);
          missedDates.add(missedDate.toISOString().split('T')[0]);
        }
      }

      // Add current streak dates (e.g., 2 days ending today)
      if (streak > 0) {
        for (let i = 0; i < streak; i++) {
          const date = new Date(currentStart);
          date.setDate(currentStart.getDate() + i);
          streakDates.add(date.toISOString().split('T')[0]);
        }
      }
    } else {
      console.log('📅 [Calendar] Using normal streak mode');

      // Normal mode: show current streak only
      const lastActive = new Date(lastActiveDate);
      lastActive.setHours(0, 0, 0, 0);

      if (streak > 0) {
        for (let i = 0; i < streak; i++) {
          const streakDate = new Date(lastActive);
          streakDate.setDate(lastActive.getDate() - i);
          streakDates.add(streakDate.toISOString().split('T')[0]);
        }
      }

      // Missed days: gap between lastActive and today (if gap > 1)
      const daysDiff = Math.floor((todayStart.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 1) {
        for (let i = 1; i < daysDiff; i++) {
          const missedDate = new Date(lastActive);
          missedDate.setDate(lastActive.getDate() + i);
          missedDates.add(missedDate.toISOString().split('T')[0]);
        }
      }
    }

    console.log('📅 [Calendar] Week view:', {
      streak,
      longestStreak,
      longestStreakDate,
      streakDates: Array.from(streakDates),
      missedDates: Array.from(missedDates),
      today: today.toISOString().split('T')[0]
    });

    // Calculate start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    // Generate 7 days (Sun-Sat)
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStart = new Date(date.setHours(0, 0, 0, 0));
      const dateString = dateStart.toISOString().split('T')[0];
      const isToday = dateStart.getTime() === todayStart.getTime();
      const isPast = dateStart < todayStart;
      const isFuture = dateStart > todayStart;

      // Check if this day is part of the streak using the Set
      const isInStreak = streakDates.has(dateString);

      // Check if this day was missed using the Set
      const isMissed = missedDates.has(dateString);

      // Completed = part of streak OR is today
      const isCompleted = isInStreak || isToday;

      dates.push({
        day: ["S", "M", "T", "W", "T", "F", "S"][i],
        date: date.getDate(),
        dateObj: dateStart,
        isToday,
        isCompleted,
        isMissed,
        isFuture,
      });
    }

    return dates;
  };

  // Track completion state for each section (sequential order enforced)
  const [watchCompleted, setWatchCompleted] = useState(false);
  const [exploreCompleted, setExploreCompleted] = useState(false);
  const [questCompleted, setQuestCompleted] = useState(false);

  // Handle quiz completion
  const handleQuizComplete = async () => {
    setShowQuiz(false);
    setQuestCompleted(true);
    console.log("✅ [Today] Quiz completed, quest finished!");
  };

  // Calculate progress percentage based on actual completion
  const calculateProgress = () => {
    let completed = 0;
    if (watchCompleted) completed += 33;
    if (exploreCompleted) completed += 33;
    if (isCompleted || questCompleted) completed += 34;
    return completed;
  };

  // SEQUENTIAL UNLOCK LOGIC:
  // - WATCH: Always available
  // - EXPLORE: Unlocked after WATCH completed
  // - QUIZ: Unlocked after EXPLORE completed
  const isExploreUnlocked = watchCompleted;
  const isQuizUnlocked = watchCompleted && exploreCompleted;

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

  // Error state
  if (error || !todayQuest) {
    return (
      <SafeAreaView style={themeStyles.container} edges={["top"]}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 40,
          }}
        >
          <Ionicons
            name="calendar-outline"
            size={64}
            color={ArchivesTheme.colors.shoeBrown}
          />
          <Text
            style={[
              themeStyles.headerTitle,
              { marginTop: 20, textAlign: "center" },
            ]}
          >
            No Quest Today
          </Text>
          <Text
            style={{
              fontFamily: "DM Sans",
              fontSize: 14,
              fontWeight: "400",
              color: ArchivesTheme.colors.shoeBrown,
              textAlign: "center",
              marginTop: 10,
            }}
          >
            Check back tomorrow for a new daily quest!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const weekDates = getWeekDates();
  const progress = calculateProgress();

  // Get full month calendar data with streak tracking
  const getMonthCalendar = () => {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayDay = today.getDate();
    const year = today.getFullYear();
    const month = today.getMonth();

    // First day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Get full streak data from GamifiedProgress (includes longestStreakDate)
    const fullStreak = getStreak();
    const { longestStreakDate, lastActiveDate } = fullStreak;

    // Calculate which days were in the streak
    const streakDays = new Set<number>();
    const missedDays = new Set<number>();

    // Check if we should show historical longest streak (when it's bigger than current)
    const useHistoricalStreak = longestStreak > streak;

    if (useHistoricalStreak && longestStreakDate) {
      console.log('📅 [Calendar Modal] Using historical streak mode');

      // Add historical longest streak dates (e.g., 47 days ending Jan 24)
      const historicalEnd = new Date(longestStreakDate);
      historicalEnd.setHours(0, 0, 0, 0);

      for (let i = 0; i < longestStreak; i++) {
        const date = new Date(historicalEnd);
        date.setDate(historicalEnd.getDate() - i);

        // Only add to set if this day is in the current viewing month
        if (date.getMonth() === month && date.getFullYear() === year) {
          streakDays.add(date.getDate());
        }
      }

      // Calculate current streak start date
      const currentStart = new Date(lastActiveDate);
      currentStart.setHours(0, 0, 0, 0);
      currentStart.setDate(currentStart.getDate() - (streak - 1));

      // Calculate gap between historical end and current start
      const gapDays = Math.floor((currentStart.getTime() - historicalEnd.getTime()) / (1000 * 60 * 60 * 24)) - 1;

      if (gapDays > 0) {
        console.log(`📅 [Calendar Modal] Found ${gapDays} missed days between streaks`);
        for (let i = 1; i <= gapDays; i++) {
          const missedDate = new Date(historicalEnd);
          missedDate.setDate(historicalEnd.getDate() + i);

          // Only add to set if this day is in the current viewing month
          if (missedDate.getMonth() === month && missedDate.getFullYear() === year) {
            missedDays.add(missedDate.getDate());
          }
        }
      }

      // Add current streak dates (e.g., 2 days ending today)
      if (streak > 0) {
        for (let i = 0; i < streak; i++) {
          const date = new Date(currentStart);
          date.setDate(currentStart.getDate() + i);

          // Only add to set if this day is in the current viewing month
          if (date.getMonth() === month && date.getFullYear() === year) {
            streakDays.add(date.getDate());
          }
        }
      }
    } else {
      console.log('📅 [Calendar Modal] Using normal streak mode');

      // Normal mode: show current streak only
      const lastActive = new Date(lastActiveDate);
      lastActive.setHours(0, 0, 0, 0);

      if (streak > 0) {
        for (let i = 0; i < streak; i++) {
          const streakDate = new Date(lastActive);
          streakDate.setDate(lastActive.getDate() - i);

          // Only add to set if this day is in the current viewing month
          if (streakDate.getMonth() === month && streakDate.getFullYear() === year) {
            streakDays.add(streakDate.getDate());
          }
        }
      }

      // Missed days: gap between lastActive and today (if gap > 1)
      const daysDiff = Math.floor((todayStart.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 1) {
        for (let i = 1; i < daysDiff; i++) {
          const missedDate = new Date(lastActive);
          missedDate.setDate(lastActive.getDate() + i);

          // Only add to set if this day is in the current viewing month
          if (missedDate.getMonth() === month && missedDate.getFullYear() === year) {
            missedDays.add(missedDate.getDate());
          }
        }
      }
    }

    console.log('📅 [Calendar Modal] Month view:', {
      streak,
      longestStreak,
      longestStreakDate,
      streakDays: Array.from(streakDays),
      missedDays: Array.from(missedDays),
      today: today.toISOString().split('T')[0]
    });

    const calendar: Array<{
      date: number | null;
      isToday: boolean;
      hasStreak: boolean;
      isMissed: boolean;
      isFuture: boolean;
      isCurrentMonth: boolean;
    }> = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      calendar.push({
        date: null,
        isToday: false,
        hasStreak: false,
        isMissed: false,
        isFuture: false,
        isCurrentMonth: false,
      });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStart = new Date(date.setHours(0, 0, 0, 0));
      const isToday = dateStart.getTime() === todayStart.getTime();
      const isPast = dateStart < todayStart;
      const isFuture = dateStart > todayStart;

      // Check if this day is part of the streak using the Set
      const hasStreak = streakDays.has(day) || isToday;

      // Check if this day was missed using the Set
      const isMissed = missedDays.has(day);

      calendar.push({
        date: day,
        isToday,
        hasStreak,
        isMissed,
        isFuture,
        isCurrentMonth: true,
      });
    }

    return calendar;
  };

  const monthCalendar = getMonthCalendar();

  return (
    <SafeAreaView style={themeStyles.container} edges={["top"]}>
      <ScrollView
        style={themeStyles.scrollView}
        contentContainerStyle={themeStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Title, Streak, Calendar */}
        <View style={themeStyles.headerTop}>
          <View style={themeStyles.headerLeft}>
            <Text style={themeStyles.headerTitle}>Today's Story</Text>
            <View style={themeStyles.divider} />
            <View style={themeStyles.streakInline}>
              <StreakIcon size={16} />
              <Text style={themeStyles.streakText}>{streak} </Text>
              <Text style={themeStyles.streakText}>days</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowCalendarModal(true)}
            activeOpacity={0.7}
          >
            <Image
              source={require("@/assets/images/calander.png")}
              style={{ width: 24, height: 24 }}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Calendar Week View */}
        <View style={themeStyles.calendarContainer}>
          {weekDates.map((item, index) => {
            return (
              <View key={index} style={themeStyles.calendarDay}>
                <Text style={themeStyles.calendarDayLabel}>{item.day}</Text>
                <View
                  style={[
                    themeStyles.calendarDateCircle,
                    item.isCompleted && { backgroundColor: ArchivesTheme.colors.persianOrange },
                    item.isMissed && { backgroundColor: '#999999' },
                    item.isFuture && { backgroundColor: 'transparent' },
                  ]}
                >
                  {item.isCompleted ? (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  ) : item.isMissed ? (
                    <Text
                      style={{
                        fontFamily: "DM Sans",
                        fontSize: 20,
                        fontWeight: "700",
                        color: "#FFFFFF",
                        lineHeight: 32,
                      }}
                    >
                      -
                    </Text>
                  ) : (
                    <Text
                      style={[
                        themeStyles.calendarDateText,
                        { color: '#999999' },
                      ]}
                    >
                      {item.date}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Progress Tracker */}
        <View style={themeStyles.progressContainer}>
          <View style={themeStyles.progressHeader}>
            <Text style={themeStyles.progressLabel}>Progress today</Text>
            <Text style={themeStyles.progressPercentage}>{progress}%</Text>
          </View>
          <View style={themeStyles.progressBarBackground}>
            <View
              style={[themeStyles.progressBarFill, { width: `${progress}%` }]}
            />
          </View>
        </View>

        {/* WATCH Card */}
        <TouchableOpacity
          style={[
            themeStyles.cardWatch,
            expandedCard === "watch" && themeStyles.cardWatchExpanded,
          ]}
          onPress={() =>
            setExpandedCard(expandedCard === "watch" ? null : "watch")
          }
          activeOpacity={0.9}
        >
          {/* Background Image - TODO: Replace with random image from 3 hardcoded options */}
          {/* <Image
            source={{ uri: '' }}
            style={themeStyles.cardWatchBackground}
            contentFit="cover"
          /> */}
          {/* Dark Overlay */}
          <LinearGradient
            colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.6)"]}
            style={themeStyles.cardWatchOverlay}
          />
          {/* Content */}
          <View style={themeStyles.cardWatchContent}>
            <View style={themeStyles.cardHeader}>
              {/* Green Watch button on LEFT when collapsed, Title when expanded */}
              {!expandedCard || expandedCard !== "watch" ? (
                <TouchableOpacity
                  style={themeStyles.cardWatchButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (todayQuest.content.card1.media_url) {
                      setShowVideoLesson(true);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="play-outline"
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={themeStyles.cardWatchButtonText}>Watch</Text>
                </TouchableOpacity>
              ) : (
                <Text
                  style={[
                    themeStyles.cardWatchSubtitle,
                    { flex: 1, marginRight: 12 },
                  ]}
                >
                  {todayQuest.content.card1.title}
                </Text>
              )}

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                {/* Show duration when collapsed */}
                {expandedCard !== "watch" && (
                  <Text style={themeStyles.cardDuration}>1 MIN</Text>
                )}
                <Ionicons
                  name={
                    expandedCard === "watch" ? "chevron-up" : "chevron-down"
                  }
                  size={28}
                  color="#FFFFFF"
                />
              </View>
            </View>

            {expandedCard === "watch" && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  marginTop: 12,
                  gap: 12,
                }}
              >
                <Text style={themeStyles.cardDuration}>1 MIN</Text>
                <TouchableOpacity
                  style={themeStyles.cardWatchButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (todayQuest.content.card1.media_url) {
                      setShowVideoLesson(true);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="play-outline"
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={themeStyles.cardWatchButtonText}>Watch</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* EXPLORE Card */}
        <TouchableOpacity
          style={themeStyles.cardExplore}
          onPress={() =>
            setExpandedCard(expandedCard === "explore" ? null : "explore")
          }
          activeOpacity={0.8}
        >
          <View style={themeStyles.cardHeader}>
            <View style={themeStyles.cardHeaderLeft}>
              <Ionicons name="book-outline" size={20} color="#FFFFFF" />
              <Text style={themeStyles.cardTitle}>EXPLORE</Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text style={themeStyles.cardDuration}>1 MIN</Text>
              <Ionicons
                name={
                  expandedCard === "explore" ? "chevron-up" : "chevron-down"
                }
                size={20}
                color="#FFFFFF"
              />
            </View>
          </View>

          {expandedCard === "explore" && (
            <>
              <Text style={themeStyles.cardSubtitle}>
                Learn about the conquest of Al-Andalus
              </Text>
              <TouchableOpacity
                style={themeStyles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  if (isExploreUnlocked) {
                    setShowReadingView(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "white",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={ArchivesTheme.colors.mutedNavy}
                    style={{ transform: [{ rotate: '-45deg' }] }}
                  />
                </View>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>

        {/* QUESTIONS Card */}
        <TouchableOpacity
          style={themeStyles.cardQuestions}
          onPress={() =>
            setExpandedCard(expandedCard === "questions" ? null : "questions")
          }
          activeOpacity={0.8}
        >
          <View style={themeStyles.cardHeader}>
            <View style={themeStyles.cardHeaderLeft}>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={ArchivesTheme.colors.shoeBrown}
              />
              <Text
                style={[
                  themeStyles.cardTitle,
                  { color: ArchivesTheme.colors.shoeBrown },
                ]}
              >
                QUESTIONS
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text
                style={[
                  themeStyles.cardDuration,
                  { color: ArchivesTheme.colors.shoeBrown },
                ]}
              >
                2 MIN
              </Text>
              <Ionicons
                name={
                  expandedCard === "questions" ? "chevron-up" : "chevron-down"
                }
                size={20}
                color={ArchivesTheme.colors.shoeBrown}
              />
            </View>
          </View>

          {expandedCard === "questions" && (
            <>
              <Text
                style={[
                  themeStyles.cardSubtitle,
                  { color: ArchivesTheme.colors.shoeBrown },
                ]}
              >
                Test your knowledge
              </Text>
              <TouchableOpacity
                style={themeStyles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  if (isQuizUnlocked) {
                    setShowQuiz(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "white",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={ArchivesTheme.colors.shoeBrown}
                    style={{ transform: [{ rotate: '-45deg' }] }}
                  />
                </View>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>

        {/* Bottom Spacing for fixed button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Start My Day Button - Fixed at Bottom with 3D depth effect */}
      {!isCompleted && (
        <View style={themeStyles.bottomButtonContainer}>
          {/* Shadow layer for 3D effect */}
          <View style={themeStyles.startButtonShadow} />
          {/* Main button */}
          <TouchableOpacity
            style={themeStyles.startButton}
            onPress={() => {
              if (!watchCompleted) {
                // Step 1: Open WATCH if not completed
                setShowVideoLesson(true);
              } else if (!exploreCompleted) {
                // Step 2: Open EXPLORE if WATCH done but EXPLORE not done
                setShowReadingView(true);
              } else if (isQuizUnlocked) {
                // Step 3: Open QUIZ if both WATCH and EXPLORE done
                setShowQuiz(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={themeStyles.startButtonText}>Start My Day</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Video Lesson Modal (WATCH) */}
      {showVideoLesson && todayQuest && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <TodayVideoLesson
            contentItem={
              {
                id: todayQuest.id,
                thumbnail_title: todayQuest.content.card1.title,
                thumbnail_url: '', // TODO: Replace with random image from 3 hardcoded options
                media_url: [todayQuest.content.card1.media_url],
                content_type: "reel",
                bottom_content: {
                  title: todayQuest.content.card1.title,
                  description: todayQuest.content.card1.content.reading_text,
                  reading_text: todayQuest.content.card1.content.reading_text,
                },
                order_by: 0,
              } as ContentItem
            }
            progress={progress}
            onNext={() => {
              setShowVideoLesson(false);
              setWatchCompleted(true);
              setShowReadingView(true);
            }}
            onDismiss={() => setShowVideoLesson(false)}
          />
        </Modal>
      )}

      {/* Reading View Modal (EXPLORE) */}
      {showReadingView && todayQuest && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <SafeAreaView style={themeStyles.exploreModalContainer}>
            {/* Header */}
            <View style={themeStyles.exploreHeader}>
              <TouchableOpacity
                onPress={() => setShowReadingView(false)}
                style={themeStyles.exploreBackButton}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={ArchivesTheme.colors.shoeBrown}
                />
              </TouchableOpacity>
              <Text style={themeStyles.exploreHeaderTitle}>Explore</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Progress Bar */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: ArchivesTheme.colors.creamWhite }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: '600', color: ArchivesTheme.colors.shoeBrown }}>
                  Progress today
                </Text>
                <Text style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: '700', color: ArchivesTheme.colors.shoeBrown }}>
                  {progress}%
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: 'rgba(77, 57, 46, 0.2)', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${progress}%`, backgroundColor: ArchivesTheme.colors.mutedNavy, borderRadius: 2 }} />
              </View>
            </View>

            <ScrollView
              style={themeStyles.exploreContent}
              contentContainerStyle={themeStyles.exploreContentInner}
            >
              {/* Hero Image */}
              <View style={themeStyles.exploreHeroContainer}>
                <Image
                  source={{ uri: todayQuest.content.card2.inner_image }}
                  style={themeStyles.exploreHeroImage}
                  contentFit="cover"
                />
                <View style={themeStyles.exploreHeroCaption}>
                  <Text style={themeStyles.exploreHeroCaptionText}>
                    {todayQuest.content.card2.title}
                  </Text>
                </View>
              </View>

              {/* Play Voiceover Button - Enhanced UI with TTS */}
              <View
                style={{
                  paddingHorizontal: 20,
                  marginTop: 16,
                  marginBottom: 8,
                }}
              >
                <TouchableOpacity
                  onPress={toggleAudio}
                  activeOpacity={isGeneratingAudio ? 1 : 0.8}
                  disabled={isGeneratingAudio}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: isGeneratingAudio
                      ? ArchivesTheme.colors.mutedNavy
                      : ArchivesTheme.colors.persianOrange,
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    borderRadius: 12,
                    shadowColor: ArchivesTheme.colors.persianOrange,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                    opacity: isGeneratingAudio ? 0.7 : 1,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "rgba(255,255,255,0.2)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    {isGeneratingAudio ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons
                        name={player.playing ? "pause" : "play"}
                        size={20}
                        color="#FFFFFF"
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "DM Sans",
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#FFFFFF",
                      }}
                    >
                      {isGeneratingAudio
                        ? "Generating Voiceover..."
                        : player.playing
                        ? "Pause Voiceover"
                        : "Play Voiceover"}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "DM Sans",
                        fontSize: 12,
                        fontWeight: "400",
                        color: "rgba(255,255,255,0.8)",
                        marginTop: 2,
                      }}
                    >
                      {isGeneratingAudio
                        ? "Creating AI narration..."
                        : "Listen to the story narrated"}
                    </Text>
                  </View>
                  <Ionicons
                    name="volume-high-outline"
                    size={24}
                    color="rgba(255,255,255,0.8)"
                  />
                </TouchableOpacity>

                {/* Voice Selector Button */}
                <TouchableOpacity
                  onPress={() => setShowVoicePicker(!showVoicePicker)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: ArchivesTheme.colors.shoeBrown,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    marginTop: 8,
                  }}
                >
                  <Ionicons
                    name="mic-outline"
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#FFFFFF",
                      flex: 1,
                    }}
                  >
                    Voice: {voices.find(v => v.id === selectedVoice)?.name}
                  </Text>
                  <Ionicons
                    name={showVoicePicker ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                {/* Voice Picker Dropdown */}
                {showVoicePicker && (
                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 10,
                      marginTop: 8,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: ArchivesTheme.colors.shoeBrown,
                    }}
                  >
                    {voices.map((voice, index) => (
                      <TouchableOpacity
                        key={voice.id}
                        onPress={() => handleVoiceChange(voice.id)}
                        activeOpacity={0.8}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 14,
                          paddingHorizontal: 16,
                          borderTopWidth: index > 0 ? 1 : 0,
                          borderTopColor: "rgba(77, 57, 46, 0.1)",
                          backgroundColor:
                            selectedVoice === voice.id
                              ? "rgba(201, 145, 81, 0.1)"
                              : "#FFFFFF",
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontFamily: "DM Sans",
                              fontSize: 15,
                              fontWeight: "600",
                              color: ArchivesTheme.colors.shoeBrown,
                            }}
                          >
                            {voice.name} ({voice.gender})
                          </Text>
                          <Text
                            style={{
                              fontFamily: "DM Sans",
                              fontSize: 12,
                              fontWeight: "400",
                              color: "rgba(77, 57, 46, 0.6)",
                              marginTop: 2,
                            }}
                          >
                            {voice.desc}
                          </Text>
                        </View>
                        {selectedVoice === voice.id && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={ArchivesTheme.colors.persianOrange}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Main Title */}
              <Text style={themeStyles.exploreMainTitle}>
                {todayQuest.content.card2.title}
              </Text>

              {/* Article Content - Rendered HTML */}
              <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
                <RenderHtml
                  contentWidth={contentWidth - 40}
                  source={{ html: todayQuest.content.card2.content }}
                  tagsStyles={{
                    body: {
                      color: ArchivesTheme.colors.shoeBrown,
                      fontFamily: "DM Sans",
                      fontSize: 16,
                      lineHeight: 24,
                      margin: 0,
                      padding: 0,
                    },
                    h1: {
                      color: ArchivesTheme.colors.shoeBrown,
                      fontFamily: "DM Sans",
                      fontSize: 24,
                      fontWeight: "700",
                      marginBottom: 12,
                      marginTop: 0,
                    },
                    h2: {
                      color: ArchivesTheme.colors.shoeBrown,
                      fontFamily: "DM Sans",
                      fontSize: 20,
                      fontWeight: "700",
                      marginBottom: 10,
                      marginTop: 16,
                    },
                    h3: {
                      color: ArchivesTheme.colors.shoeBrown,
                      fontFamily: "DM Sans",
                      fontSize: 18,
                      fontWeight: "600",
                      marginBottom: 8,
                      marginTop: 12,
                    },
                    p: {
                      color: ArchivesTheme.colors.shoeBrown,
                      fontFamily: "DM Sans",
                      fontSize: 16,
                      lineHeight: 24,
                      marginBottom: 12,
                      marginTop: 0,
                    },
                    strong: {
                      fontWeight: "700",
                      color: ArchivesTheme.colors.shoeBrown,
                    },
                    em: {
                      fontStyle: "italic",
                      color: ArchivesTheme.colors.shoeBrown,
                    },
                    ul: {
                      marginBottom: 12,
                      paddingLeft: 20,
                    },
                    ol: {
                      marginBottom: 12,
                      paddingLeft: 20,
                    },
                    li: {
                      color: ArchivesTheme.colors.shoeBrown,
                      fontFamily: "DM Sans",
                      fontSize: 16,
                      lineHeight: 24,
                      marginBottom: 6,
                    },
                  }}
                />
              </View>

              {/* Completion Indicator */}
              <View style={themeStyles.exploreCompletionBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#6B7F3D" />
                <Text style={themeStyles.exploreCompletionText}>
                  You’ve read the full article
                </Text>
              </View>
            </ScrollView>

            {/* Next Button */}
            <View style={themeStyles.exploreFooter}>
              <TouchableOpacity
                style={themeStyles.exploreNextButton}
                onPress={() => {
                  setShowReadingView(false);
                  setExploreCompleted(true);
                  setShowQuiz(true);
                }}
              >
                <Text style={themeStyles.exploreNextText}>Next</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* Quiz Modal */}
      {showQuiz && todayQuest && user && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: ArchivesTheme.colors.creamWhite }}>
            {/* Progress Bar */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: ArchivesTheme.colors.creamWhite }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: '600', color: ArchivesTheme.colors.shoeBrown }}>
                  Progress today
                </Text>
                <Text style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: '700', color: ArchivesTheme.colors.shoeBrown }}>
                  {progress}%
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: 'rgba(77, 57, 46, 0.2)', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${progress}%`, backgroundColor: ArchivesTheme.colors.mutedNavy, borderRadius: 2 }} />
              </View>
            </View>
            <Quiz
            contentItem={
              {
                id: todayQuest.id,
                questions: todayQuest.content.card3.questions,
                thumbnail_title: todayQuest.content.card3.title,
                thumbnail_url: '', // TODO: Replace with random image from 3 hardcoded options
                media_url: [],
                content_type: "reel",
                bottom_content: null,
                order_by: 0,
              } as ContentItem
            }
            adventureId="daily_quest"
            moduleId={todayQuest.id}
            eraId="daily_quest"
            eraName="Daily Quest"
            isToday={true}
            onQuizResults={async (score, correctAnswers, totalQuestions) => {
              try {
                await saveQuestCompletion(
                  user.id,
                  todayQuest.id,
                  score,
                  correctAnswers,
                  totalQuestions,
                );
                console.log(
                  "✅ [Today] Quest completion saved to Supabase",
                );
              } catch (error) {
                console.error(
                  "❌ [Today] Failed to save completion:",
                  error,
                );
              }
            }}
            onContinue={handleQuizComplete}
            onDismiss={() => setShowQuiz(false)}
            onBack={() => setShowQuiz(false)}
          />
          </SafeAreaView>
        </Modal>
      )}

      {/* Calendar Modal - Full month view with streak stats */}
      {showCalendarModal && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView
            style={{
              flex: 1,
              backgroundColor: ArchivesTheme.colors.creamWhite,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#E0E0E0",
              }}
            >
              <Text
                style={{
                  fontFamily: "DM Sans",
                  fontSize: 20,
                  fontWeight: "700",
                  color: ArchivesTheme.colors.shoeBrown,
                }}
              >
                Calendar
              </Text>
              <TouchableOpacity
                onPress={() => setShowCalendarModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close"
                  size={28}
                  color={ArchivesTheme.colors.shoeBrown}
                />
              </TouchableOpacity>
            </View>

            {/* Calendar Content */}
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
              {/* Current Month Calendar - full month grid */}
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 18,
                    fontWeight: "600",
                    color: ArchivesTheme.colors.mutedNavy,
                    textAlign: "center",
                    marginBottom: 20,
                  }}
                >
                  {new Date().toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </Text>

                {/* Day headers (S M T W T F S) */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-around",
                    marginBottom: 12,
                  }}
                >
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <View
                      key={index}
                      style={{ width: 40, alignItems: "center" }}
                    >
                      <Text
                        style={{
                          fontFamily: "DM Sans",
                          fontSize: 12,
                          fontWeight: "600",
                          color: ArchivesTheme.colors.mutedNavy,
                          opacity: 0.6,
                        }}
                      >
                        {day}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {monthCalendar.map((item, index) => (
                    <View
                      key={index}
                      style={{
                        width: "14.28%",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      {item.date ? (
                        <View style={{ alignItems: "center" }}>
                          {/* Date circle */}
                          <View
                            style={[
                              {
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: item.hasStreak || item.isToday
                                  ? ArchivesTheme.colors.persianOrange
                                  : item.isMissed
                                    ? "#999999"
                                    : "#FFFFFF", // White background for empty days
                                borderWidth: item.hasStreak || item.isToday || item.isMissed ? 0 : 2,
                                borderColor: "#E5E5E5", // Light gray border for empty days
                              },
                            ]}
                          >
                            {item.hasStreak || item.isToday ? (
                              <Text
                                style={{
                                  fontFamily: "DM Sans",
                                  fontSize: 14,
                                  fontWeight: "700",
                                  color: "#FFFFFF",
                                }}
                              >
                                {item.date}
                              </Text>
                            ) : item.isMissed ? (
                              <Text
                                style={{
                                  fontFamily: "DM Sans",
                                  fontSize: 20,
                                  fontWeight: "700",
                                  color: "#FFFFFF",
                                  lineHeight: 32,
                                }}
                              >
                                -
                              </Text>
                            ) : (
                              <Text
                                style={{
                                  fontFamily: "DM Sans",
                                  fontSize: 14,
                                  fontWeight: "600",
                                  color: "#C3C3C3", // Light gray text on white background
                                }}
                              >
                                {item.date}
                              </Text>
                            )}
                          </View>
                        </View>
                      ) : (
                        <View style={{ width: 36, height: 36 }} />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Streak Stats Card - Fixed at Bottom */}
            <View
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                right: 20,
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 24,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              {/* Current Streak - Left */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                }}
              >
                {/* Icon - Commented out for now */}
                {/* <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: ArchivesTheme.colors.persianOrange,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <StreakIcon size={20} />
                </View> */}
                <View>
                  <Text
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#666",
                    }}
                  >
                    Current Streak
                  </Text>
                  <Text
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 24,
                      fontWeight: "700",
                      color: ArchivesTheme.colors.shoeBrown,
                    }}
                  >
                    {streak} {streak === 1 ? "day" : "days"}
                  </Text>
                </View>
              </View>

              {/* Vertical Divider */}
              <View
                style={{
                  width: 1,
                  height: "60%",
                  backgroundColor: "#E0E0E0",
                  marginHorizontal: 16,
                }}
              />

              {/* Longest Streak - Right */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                }}
              >
                {/* Icon - Commented out for now */}
                {/* <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "#FFD700",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="trophy" size={20} color="#FFFFFF" />
                </View> */}
                <View>
                  <Text
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#666",
                    }}
                  >
                    Longest Streak
                  </Text>
                  <Text
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 24,
                      fontWeight: "700",
                      color: ArchivesTheme.colors.shoeBrown,
                    }}
                  >
                    {longestStreak} {longestStreak === 1 ? "day" : "days"}
                  </Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}
