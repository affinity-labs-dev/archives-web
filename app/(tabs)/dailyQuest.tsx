// Daily Quest Tab - New card-based design with expandable sections
// Features: Calendar week view, progress tracker, three content cards (WATCH, EXPLORE, QUESTIONS)

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useUser } from '@clerk/clerk-expo';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { useGamificationOrchestrator } from '@/gamification';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useDailyQuest } from '@/hooks/useDailyQuest';
import Quiz from '@/components/quiz/Quiz';
import ReelLesson from '@/components/lessons/ReelLesson';
import type { ContentItem } from '@/components/shared/types';
import Svg, { Path } from 'react-native-svg';

// Theme styles
const themeStyles = ArchivesTheme.common.dailyQuest;

// Streak icon (flame) - orange on white background
const StreakIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960" fill={ArchivesTheme.colors.persianOrange}>
    <Path d="M240-400q0 52 21 98.5t60 81.5q-1-5-1-9v-9q0-32 12-60t35-51l113-111 113 111q23 23 35 51t12 60v9q0 4-1 9 39-35 60-81.5t21-98.5q0-50-18.5-94.5T648-574q-20 13-42 19.5t-45 6.5q-62 0-107.5-41T401-690q-39 33-69 68.5t-50.5 72Q261-513 250.5-475T240-400Zm240 52-57 56q-11 11-17 25t-6 29q0 32 23.5 55t56.5 23q33 0 56.5-23t23.5-55q0-16-6-29.5T537-292l-57-56Zm0-492v132q0 34 23.5 57t57.5 23q18 0 33.5-7.5T622-658l18-22q74 42 117 117t43 163q0 134-93 227T480-80q-134 0-227-93t-93-227q0-129 86.5-245T480-840Z" />
  </Svg>
);

export default function DailyQuestScreen() {
  const { user } = useUser();
  const { streak } = useGamificationOrchestrator();
  const { todayQuest, questProgress, loading, error, isCompleted, saveQuestCompletion } = useDailyQuest(user?.id);

  const [expandedCard, setExpandedCard] = useState<'watch' | 'explore' | 'questions' | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showVideoLesson, setShowVideoLesson] = useState(false);
  const [showReadingView, setShowReadingView] = useState(false);

  // Audio player for narration (when audioUrl exists)
  const player = useAudioPlayer(todayQuest?.content?.audio_url || null);

  // Configure audio mode for background playback (works when phone is locked)
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true, // Audio plays even in silent mode
          staysActiveInBackground: true, // Continue playing when phone is locked (like podcasts)
        });
        console.log('🎵 [DailyQuest] Audio mode configured for background playback');
      } catch (error) {
        console.error('🎵 [DailyQuest] Failed to configure audio mode:', error);
      }
    };

    configureAudio();
  }, []);

  // Toggle audio playback
  const toggleAudio = () => {
    if (!player.isLoaded) return;

    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  // Get current week dates for calendar
  const getWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const dates = [];

    // Calculate start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    // Generate 7 days (Sun-Sat)
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push({
        day: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i],
        date: date.getDate(),
        isToday: date.toDateString() === today.toDateString(),
      });
    }

    return dates;
  };

  // Handle quiz completion
  const handleQuizComplete = async () => {
    setShowQuiz(false);
    console.log('✅ [DailyQuest] Quiz completed, quest finished!');
  };

  // Track completion state for each section
  const [watchCompleted, setWatchCompleted] = useState(false);
  const [exploreCompleted, setExploreCompleted] = useState(false);

  // Calculate progress percentage based on actual completion
  const calculateProgress = () => {
    let completed = 0;
    if (watchCompleted) completed += 33;
    if (exploreCompleted) completed += 33;
    if (isCompleted) completed += 34;
    return completed;
  };

  // Check if quiz is unlocked (requires both WATCH and EXPLORE completed)
  const isQuizUnlocked = watchCompleted && exploreCompleted;

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={themeStyles.container} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
          <Text style={{ fontFamily: 'DM Sans', fontSize: 16, fontWeight: '600', color: ArchivesTheme.colors.shoeBrown, marginTop: 16 }}>
            Loading today’s quest...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !todayQuest) {
    return (
      <SafeAreaView style={themeStyles.container} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
          <Ionicons name="calendar-outline" size={64} color={ArchivesTheme.colors.shoeBrown} />
          <Text style={[themeStyles.headerTitle, { marginTop: 20, textAlign: 'center' }]}>
            No Quest Today
          </Text>
          <Text style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: '400', color: ArchivesTheme.colors.shoeBrown, textAlign: 'center', marginTop: 10 }}>
            Check back tomorrow for a new daily quest!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const weekDates = getWeekDates();
  const progress = calculateProgress();

  return (
    <SafeAreaView style={themeStyles.container} edges={['top']}>
      <ScrollView
        style={themeStyles.scrollView}
        contentContainerStyle={themeStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Badge, Title, Streak, Calendar */}
        <View style={themeStyles.headerTop}>
          <View style={themeStyles.headerLeft}>
            <View style={themeStyles.badge}>
              <Image
                source={require('@/assets/images/ai-images/sayhi.png')}
                style={themeStyles.badgeImage}
                contentFit="contain"
              />
            </View>
            <Text style={themeStyles.headerTitle}>Today’s Lesson</Text>
          </View>
          <View style={themeStyles.headerRight}>
            <View style={themeStyles.streakBadge}>
              <StreakIcon size={16} />
              <Text style={themeStyles.streakText}>{streak}</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="calendar-outline" size={24} color={ArchivesTheme.colors.shoeBrown} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Subtitle with info icon */}
        <View style={themeStyles.subtitleRow}>
          <Text style={themeStyles.headerSubtitle}>{todayQuest.content.title}</Text>
          <TouchableOpacity style={themeStyles.infoIcon}>
            <Ionicons name="information-circle-outline" size={18} color={ArchivesTheme.colors.shoeBrown} />
          </TouchableOpacity>
        </View>

        {/* Calendar Week View */}
        <View style={themeStyles.calendarContainer}>
          {weekDates.map((item, index) => (
            <View key={index} style={themeStyles.calendarDay}>
              <Text style={themeStyles.calendarDayLabel}>{item.day}</Text>
              <View style={[themeStyles.calendarDateCircle, item.isToday && themeStyles.calendarDateCircleActive]}>
                <Text style={[themeStyles.calendarDateText, item.isToday && themeStyles.calendarDateTextActive]}>
                  {item.date}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Progress Tracker */}
        <View style={themeStyles.progressContainer}>
          <View style={themeStyles.progressHeader}>
            <Text style={themeStyles.progressLabel}>Progress today</Text>
            <Text style={themeStyles.progressPercentage}>{progress}%</Text>
          </View>
          <View style={themeStyles.progressBarBackground}>
            <View style={[themeStyles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* WATCH Card */}
        <TouchableOpacity
          style={[themeStyles.card, themeStyles.cardWatch]}
          onPress={() => {
            const newState = expandedCard === 'watch' ? null : 'watch';
            setExpandedCard(newState);
            if (newState === 'watch' && !watchCompleted) {
              setWatchCompleted(true);
            }
          }}
          activeOpacity={0.8}
        >
          <View style={themeStyles.cardHeader}>
            <View style={themeStyles.cardHeaderLeft}>
              <Ionicons name="play-circle-outline" size={24} color="#FFFFFF" />
              <Text style={themeStyles.cardTitle}>WATCH</Text>
            </View>
            <View style={themeStyles.cardHeaderRight}>
              <Text style={themeStyles.cardDuration}>3 MIN</Text>
              <Ionicons
                name={expandedCard === 'watch' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#FFFFFF"
              />
            </View>
          </View>
          {expandedCard === 'watch' && (
            <TouchableOpacity
              style={themeStyles.cardExpandedContent}
              activeOpacity={0.7}
              onPress={() => {
                if (todayQuest.content.video_url) {
                  setShowVideoLesson(true);
                }
              }}
            >
              <Text style={themeStyles.cardExpandedText}>
                {todayQuest.content.video_url
                  ? `Watch the story of ${todayQuest.content.title}`
                  : 'Video coming soon'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* EXPLORE Card */}
        <TouchableOpacity
          style={[themeStyles.card, themeStyles.cardExplore]}
          onPress={() => {
            const newState = expandedCard === 'explore' ? null : 'explore';
            setExpandedCard(newState);
            if (newState === 'explore' && !exploreCompleted) {
              setExploreCompleted(true);
            }
          }}
          activeOpacity={0.8}
        >
          <View style={themeStyles.cardHeader}>
            <View style={themeStyles.cardHeaderLeft}>
              <Ionicons name="book-outline" size={24} color="#FFFFFF" />
              <Text style={themeStyles.cardTitle}>EXPLORE</Text>
            </View>
            <View style={themeStyles.cardHeaderRight}>
              <Text style={themeStyles.cardDuration}>5 MIN</Text>
              <Ionicons
                name={expandedCard === 'explore' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#FFFFFF"
              />
            </View>
          </View>
          {expandedCard === 'explore' && (
            <TouchableOpacity
              style={themeStyles.cardExpandedContent}
              activeOpacity={0.7}
              onPress={() => setShowReadingView(true)}
            >
              <Text style={themeStyles.cardExpandedText}>Learn about the conquest of Al-Andalus</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* QUESTIONS Card */}
        <TouchableOpacity
          style={[
            themeStyles.card,
            themeStyles.cardQuestions,
            !isQuizUnlocked && !isCompleted && themeStyles.cardLocked
          ]}
          onPress={() => {
            if (!isCompleted && isQuizUnlocked) {
              const newState = expandedCard === 'questions' ? null : 'questions';
              setExpandedCard(newState);
            }
          }}
          activeOpacity={0.8}
        >
          <View style={themeStyles.cardHeader}>
            <View style={themeStyles.cardHeaderLeft}>
              <Ionicons name="help-circle-outline" size={24} color="#FFFFFF" />
              <Text style={themeStyles.cardTitle}>QUESTIONS</Text>
            </View>
            <View style={themeStyles.cardHeaderRight}>
              <Text style={themeStyles.cardDuration}>2 MIN</Text>
              {isCompleted ? (
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              ) : !isQuizUnlocked ? (
                <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={expandedCard === 'questions' ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#FFFFFF"
                />
              )}
            </View>
          </View>
          {expandedCard === 'questions' && !isCompleted && isQuizUnlocked && (
            <TouchableOpacity
              style={themeStyles.cardExpandedContent}
              activeOpacity={0.7}
              onPress={() => setShowQuiz(true)}
            >
              <Text style={themeStyles.cardExpandedText}>Test your knowledge</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {!isQuizUnlocked && !isCompleted && (
            <View style={themeStyles.cardExpandedContent}>
              <Text style={themeStyles.cardExpandedText}>Complete WATCH and EXPLORE first</Text>
            </View>
          )}
          {isCompleted && (
            <TouchableOpacity
              style={themeStyles.cardExpandedContent}
              activeOpacity={0.7}
              onPress={() => setShowQuiz(true)}
            >
              <Text style={themeStyles.cardExpandedText}>
                ✓ Best Score: {questProgress?.correct_answers}/{questProgress?.total_questions} - Retake Quiz
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Bottom Spacing for fixed button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Start My Day Button - Fixed at Bottom */}
      {!isCompleted && (
        <View style={themeStyles.bottomButtonContainer}>
          <TouchableOpacity
            style={themeStyles.startButton}
            onPress={() => {
              if (!watchCompleted) {
                // Step 1: Open WATCH if not completed
                setShowVideoLesson(true);
                setExpandedCard('watch');
              } else if (!exploreCompleted) {
                // Step 2: Open EXPLORE if WATCH done but EXPLORE not done
                setShowReadingView(true);
                setExpandedCard('explore');
              } else if (isQuizUnlocked) {
                // Step 3: Open QUIZ if both WATCH and EXPLORE done
                setShowQuiz(true);
                setExpandedCard('questions');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={themeStyles.startButtonText}>
              {!watchCompleted
                ? 'Start My Day'
                : !exploreCompleted
                ? 'Continue to Explore'
                : 'Continue to Quiz'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Video Lesson Modal (WATCH) */}
      {showVideoLesson && todayQuest && (
        <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
          <ReelLesson
            contentItem={{
              id: todayQuest.id,
              thumbnail_title: todayQuest.content.title,
              thumbnail_url: todayQuest.content.image_url,
              media_url: todayQuest.content.video_url ? [todayQuest.content.video_url] : [],
              content_type: 'reel',
              bottom_content: {
                title: todayQuest.content.title,
                description: todayQuest.content.text_content,
                reading_text: todayQuest.content.text_content,
              },
              order_by: 0,
            } as ContentItem}
            adventureId="daily_quest"
            moduleId={todayQuest.id}
            lessonId="watch"
            eraId="daily_quest"
            eraName="Daily Quest"
            onContinue={() => {
              setShowVideoLesson(false);
              setWatchCompleted(true);
              setShowReadingView(true);
              setExpandedCard('explore');
            }}
            onDismiss={() => setShowVideoLesson(false)}
          />
        </Modal>
      )}

      {/* Reading View Modal (EXPLORE) */}
      {showReadingView && todayQuest && (
        <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
          <SafeAreaView style={themeStyles.exploreModalContainer}>
            {/* Header */}
            <View style={themeStyles.exploreHeader}>
              <TouchableOpacity
                onPress={() => setShowReadingView(false)}
                style={themeStyles.exploreBackButton}
              >
                <Ionicons name="arrow-back" size={24} color={ArchivesTheme.colors.shoeBrown} />
              </TouchableOpacity>
              <Text style={themeStyles.exploreHeaderTitle}>Explore</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={themeStyles.exploreContent} contentContainerStyle={themeStyles.exploreContentInner}>
              {/* Hero Image */}
              <View style={themeStyles.exploreHeroContainer}>
                <Image
                  source={{ uri: todayQuest.content.image_url }}
                  style={themeStyles.exploreHeroImage}
                  contentFit="cover"
                />
                <View style={themeStyles.exploreHeroCaption}>
                  <Text style={themeStyles.exploreHeroCaptionText}>
                    {todayQuest.content.title}
                  </Text>
                </View>
              </View>

              {/* Play Voiceover Button */}
              {todayQuest.content.audio_url && (
                <TouchableOpacity
                  onPress={toggleAudio}
                  style={themeStyles.exploreVoiceoverButton}
                >
                  <Ionicons
                    name={player.playing ? 'pause' : 'volume-high'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={themeStyles.exploreVoiceoverText}>
                    {player.playing ? 'Pause Voiceover' : 'Play Voiceover'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Main Title */}
              <Text style={themeStyles.exploreMainTitle}>The Conquest of Al-Andalus</Text>

              {/* Article Content */}
              <Text style={themeStyles.exploreSectionHeader}>The Crossing</Text>
              <Text style={themeStyles.exploreBodyText}>{todayQuest.content.text_content}</Text>

              {/* Completion Indicator */}
              <View style={themeStyles.exploreCompletionBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#6B7F3D" />
                <Text style={themeStyles.exploreCompletionText}>You’ve read the full article</Text>
              </View>
            </ScrollView>

            {/* Next Button */}
            <View style={themeStyles.exploreFooter}>
              <TouchableOpacity
                style={themeStyles.exploreNextButton}
                onPress={() => {
                  setShowReadingView(false);
                  setExploreCompleted(true);
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
        <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
          <Quiz
            contentItem={{
              id: todayQuest.id,
              questions: todayQuest.content.questions,
              thumbnail_title: todayQuest.content.title,
              order_by: 0,
            } as ContentItem}
            adventureId="daily_quest"
            moduleId={todayQuest.id}
            eraId="daily_quest"
            eraName="Daily Quest"
            isDailyQuest={true}
            onQuizResults={async (score, correctAnswers, totalQuestions) => {
              try {
                await saveQuestCompletion(
                  user.id,
                  todayQuest.id,
                  score,
                  correctAnswers,
                  totalQuestions
                );
                console.log('✅ [DailyQuest] Quest completion saved to Supabase');
              } catch (error) {
                console.error('❌ [DailyQuest] Failed to save completion:', error);
              }
            }}
            onContinue={handleQuizComplete}
            onDismiss={() => setShowQuiz(false)}
            onBack={() => setShowQuiz(false)}
          />
        </Modal>
      )}
    </SafeAreaView>
  );
}
