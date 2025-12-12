import React, { useState, useMemo, useCallback } from 'react';
import { FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { ADVENTURE_KEYS, WALKTHROUGH_KEYS } from '@/constants/WalkthroughKeys';
import { analyticsService } from '@/services/AnalyticsService';
import AdventureComponent from '@/components/adventure/shared/AdventureComponent';
import AdventureCard from './AdventureCard';
import XPMilestoneScreen from '@/components/gamified/XPMilestoneScreen';
import AdventureCompleteScreen from '@/components/gamified/AdventureCompleteScreen';
import LessonPlayer from '@/components/lessons/LessonPlayer';
import Quiz from '@/components/quiz/Quiz';
import type { Adventure, ContentItem } from '@/components/shared/types';

// TypeScript interfaces
interface UserProgress {
  adventureId: string;
  moduleId: string;
  quizScore: number;
  quizCorrectAnswers?: number; // Actual correct answers (for XP calculation)
  isCompleted: boolean;
  quizCompleted: boolean;
  completedAt: string;
  era_id: number;
}

interface BentoGridScreenProps {
  adventures: Adventure[];
  userProgress: UserProgress[];
  onProgressUpdate?: () => Promise<void> | void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const BentoGridScreen: React.FC<BentoGridScreenProps> = ({ adventures, userProgress, onProgressUpdate, refreshing, onRefresh }) => {
  const [selectedLesson, setSelectedLesson] = useState<{
    contentItem: ContentItem;
    adventureId: string;
    moduleId: string;
    lessonId: string;
    eraId: string;
    eraName: string;
  } | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAdventureCard, setSelectedAdventureCard] = useState<Adventure | null>(null);
  const [adventureSummary, setAdventureSummary] = useState<{
    adventure: Adventure;
    totalModules: number;
    totalXP: number;
    totalStars: number;
  } | null>(null);
  const [streakMilestone, setStreakMilestone] = useState<{
    milestoneXP: number;
    totalXP: number;
  } | null>(null);

  // Handle card press - open lesson modal
  const handleCardPress = (contentItem: ContentItem, adventureId: string) => {
    // Use database IDs directly (flows AS IS to ProgressContext)
    const moduleId = contentItem.id; // Use media_id from content_list
    const lessonId = `lesson${contentItem.order_by}`;

    // Find adventure to get era info (era-agnostic)
    const adventure = adventures.find(a => a.readable_id === adventureId);
    const eraId = adventure?.era_id || '';
    const eraName = adventure?.card_content?.era_name || adventure?.era_id || '';

    console.log('🎬 Opening lesson:', {
      adventureId,
      moduleId,
      lessonId,
      eraId,
      contentType: contentItem.content_type,
      title: contentItem.thumbnail_title,
      hasQuestions: contentItem.questions?.length > 0
    });

    setSelectedLesson({
      contentItem,
      adventureId,
      moduleId,
      lessonId,
      eraId,
      eraName,
    });
    setShowQuiz(false);
  };

  // Handle lesson continue - check if this lesson has questions to show
  const handleLessonContinue = () => {
    if (!selectedLesson) return;

    const { contentItem } = selectedLesson;

    console.log('✅ Lesson completed', {
      lessonId: selectedLesson.lessonId,
      hasQuestions: contentItem.questions?.length > 0,
      questionCount: contentItem.questions?.length || 0
    });

    // Check if THIS completed lesson has questions to show
    if (contentItem.questions && contentItem.questions.length > 0) {
      console.log('🎯 Showing quiz for completed lesson');
      setShowQuiz(true);
    } else {
      // No questions for this lesson, close modal
      console.log('✅ No quiz for this lesson, closing modal');
      setSelectedLesson(null);
      setShowQuiz(false);
    }
  };

  // Handle quiz continue - check if adventure is complete
  const handleQuizContinue = async () => {
    console.log('✅ Quiz completed, checking if adventure complete');

    // Reload progress to show stars immediately in UI (await to prevent race condition)
    if (onProgressUpdate) {
      await onProgressUpdate();
    }

    // Read FRESH progress data from AsyncStorage to avoid race condition
    const progressData = await AsyncStorage.getItem('new_user_progress');
    const freshUserProgress: UserProgress[] = progressData ? JSON.parse(progressData) : [];
    console.log('📊 Fresh progress data loaded:', freshUserProgress.length, 'modules');

    // Check if adventure is complete (all modules in content_list are done)
    if (selectedLesson) {
      const adventure = adventures.find(a => a.readable_id === selectedLesson.adventureId);

      if (adventure && adventure.content_list) {
        // Get displayed content (must match AdventureComponent display logic)
        const sortedContent = [...adventure.content_list]
          .sort((a, b) => a.order_by - b.order_by)
          .slice(0, 5);  // Match UI - only first 5 modules count

        // Get all completed modules for this adventure using FRESH data
        const completedModules = freshUserProgress.filter(
          p => p.adventureId === selectedLesson.adventureId &&
               p.isCompleted &&
               p.quizCompleted
        );

        // Check if all displayed modules are complete
        const totalModules = sortedContent.length;  // Should always be 5
        const isAdventureComplete = completedModules.length === totalModules;

        console.log(`📊 Adventure completion check:`, {
          adventureId: selectedLesson.adventureId,
          completedModules: completedModules.length,
          totalModules,
          displayedContent: sortedContent.length,
          isComplete: isAdventureComplete
        });

        if (isAdventureComplete) {
          // Check if user has already seen this adventure complete screen
          const adventureCompleteKey = ADVENTURE_KEYS.getAdventureCompleteKey(selectedLesson.adventureId);
          const hasSeenScreen = await AsyncStorage.getItem(adventureCompleteKey);

          if (hasSeenScreen === 'true') {
            console.log(`✅ User already saw adventure complete screen for ${selectedLesson.adventureId} - skipping`);
            setSelectedLesson(null);
            setShowQuiz(false);
            return; // Don't show modal again
          }

          // Calculate stats
          const totalStars = completedModules.reduce((sum, m) => sum + (m.quizScore || 0), 0);
          const totalXP = completedModules.reduce((sum, m) => {
            const correctAnswers = (m as any).quizCorrectAnswers !== undefined
              ? (m as any).quizCorrectAnswers
              : (m.quizScore ? m.quizScore - 1 : 0);
            return sum + (correctAnswers * 10);
          }, 0);

          console.log('🎉 Adventure complete! Showing summary (FIRST TIME)');

          // Close lesson/quiz modal first
          setSelectedLesson(null);
          setShowQuiz(false);

          // Show adventure summary
          setAdventureSummary({
            adventure,
            totalModules,
            totalXP,
            totalStars
          });
          return;
        }
      }
    }

    // If not complete, just close the modal
    setSelectedLesson(null);
    setShowQuiz(false);
  };

  // Handle lesson dismiss
  const handleLessonDismiss = () => {
    console.log('❌ Lesson dismissed');
    setSelectedLesson(null);
    setShowQuiz(false);
  };

  // Handle 50 XP milestone reached
  const handleMilestoneReached = async (milestoneXP: number, totalXP: number) => {
    console.log(`🎉 XP Milestone reached: ${milestoneXP}`);

    // Check if user has already seen this milestone screen
    const milestoneKey = ADVENTURE_KEYS.getXPMilestoneKey(milestoneXP);
    const hasSeenMilestone = await AsyncStorage.getItem(milestoneKey);

    if (hasSeenMilestone === 'true') {
      console.log(`✅ User already saw XP milestone screen for ${milestoneXP} XP - skipping`);
      setSelectedLesson(null);
      setShowQuiz(false);
      return; // Don't show modal again
    }

    console.log(`🎉 Showing XP milestone screen for ${milestoneXP} XP (FIRST TIME)`);

    // Reload progress to show stars immediately (await to prevent race condition)
    if (onProgressUpdate) {
      await onProgressUpdate();
    }

    // Close lesson/quiz modal first
    setSelectedLesson(null);
    setShowQuiz(false);

    // Show streak milestone modal
    setStreakMilestone({
      milestoneXP,
      totalXP,
    });
  };

  // Handle adventure started (when adventure card/summary is opened)
  const handleAdventureStarted = (adventure: Adventure) => {
    // Extract adventure number from readable_id (e.g., "roi_adventure_1" → 1)
    const adventureNumber = parseInt(adventure.readable_id.split('_')[2] || '0', 10);

    // Track adventure_started event (era-agnostic)
    analyticsService.trackAdventureStarted({
      era_id: adventure.era_id,
      era_name: adventure.card_content?.era_name || adventure.era_id,
      adventure_id: adventure.readable_id,
      adventure_number: adventureNumber,
      adventure_title: adventure.adventure_title || 'Unknown',
      screen: 'home',
    });

    console.log(`📊 [Analytics] Adventure Started: ${adventure.readable_id}`);

    // Open adventure card modal
    setSelectedAdventureCard(adventure);
  };

  // Render function for FlatList items (memoized for performance)
  const renderAdventureItem = useCallback(({ item: adventure }: { item: Adventure }) => {
    return (
      <AdventureComponent
        adventure={adventure}
        userProgress={userProgress}
        onCardPress={(contentItem) => handleCardPress(contentItem, adventure.readable_id)}
        onTitlePress={() => handleAdventureStarted(adventure)}
      />
    );
  }, [userProgress]);

  // Key extractor for FlatList (memoized)
  const keyExtractor = useCallback((item: Adventure) => item.readable_id, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={adventures}
        renderItem={renderAdventureItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || false}
            onRefresh={onRefresh}
            tintColor={ArchivesTheme.colors.persianOrange}
            colors={[ArchivesTheme.colors.persianOrange]}
          />
        }
        // Performance optimizations - reduces memory usage
        removeClippedSubviews={true}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={50}
        initialNumToRender={2}
        windowSize={3}
      />

      {/* Lesson/Quiz Modal */}
      {selectedLesson && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            {/* Show quiz if flag is set */}
            {showQuiz ? (
              <Quiz
                contentItem={selectedLesson.contentItem}
                adventureId={selectedLesson.adventureId}
                moduleId={selectedLesson.moduleId}
                eraId={selectedLesson.eraId}
                eraName={selectedLesson.eraName}
                onContinue={handleQuizContinue}
                onDismiss={handleLessonDismiss}
                onBack={handleLessonDismiss}
                onMilestoneReached={handleMilestoneReached}
              />
            ) : (
              <LessonPlayer
                contentItem={selectedLesson.contentItem}
                adventureId={selectedLesson.adventureId}
                moduleId={selectedLesson.moduleId}
                lessonId={selectedLesson.lessonId}
                eraId={selectedLesson.eraId}
                eraName={selectedLesson.eraName}
                onContinue={handleLessonContinue}
                onDismiss={handleLessonDismiss}
              />
            )}
          </SafeAreaProvider>
        </Modal>
      )}

      {/* Adventure Card Modal */}
      <AdventureCard
        isVisible={selectedAdventureCard !== null}
        adventure={selectedAdventureCard}
        onDismiss={() => setSelectedAdventureCard(null)}
      />

      {/* Adventure Summary Modal (Adventure completion) */}
      {adventureSummary && (
        <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
          <AdventureCompleteScreen
            adventure={adventureSummary.adventure}
            totalXP={adventureSummary.totalXP}
            completedModules={adventureSummary.totalModules}
            totalModules={adventureSummary.totalModules}
            onContinue={() => setAdventureSummary(null)}
          />
        </Modal>
      )}

      {/* Streak Milestone Modal (50 XP milestone) */}
      {streakMilestone && (
        <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
          <XPMilestoneScreen
            totalXP={streakMilestone.totalXP}
            milestoneXP={streakMilestone.milestoneXP}
            onContinue={() => {
              setStreakMilestone(null);
              handleQuizContinue(); // Check if adventure is complete
            }}
          />
        </Modal>
      )}

      {/* Development Only: Walkthrough Reset Button */}
      {__DEV__ && (
        <View style={styles.devButtonContainer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={async () => {
              try {
                await AsyncStorage.removeItem(WALKTHROUGH_KEYS.REEL);
                await AsyncStorage.removeItem(WALKTHROUGH_KEYS.CAROUSEL);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                console.log('✅ Walkthrough flags cleared');
              } catch (error) {
                console.error('❌ Error clearing walkthrough flags:', error);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.resetButtonText}>RESET WALKTHROUGH</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4EBDB',
  },
  scrollContent: {
    paddingBottom: 120, // Account for tab bar height
  },

  // Development Only: Reset Button
  devButtonContainer: {
    position: 'absolute',
    bottom: 100, // Above tab bar
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  resetButton: {
    backgroundColor: '#FF3B30', // iOS red
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'DM Sans',
    letterSpacing: 0.5,
  },
});

export default BentoGridScreen;
