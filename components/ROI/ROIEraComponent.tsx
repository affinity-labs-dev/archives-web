import React, { useState, useMemo } from 'react';
import { Dimensions, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { WALKTHROUGH_KEYS, ADVENTURE_KEYS } from '@/constants/WalkthroughKeys';
import { analyticsService } from '@/services/AnalyticsService';
import ROIAdventureComponent from './ROIAdventureComponent';
import ROIAdventureCardComponent from './ROIAdventureCardComponent';
import XPMilestoneScreen from './XPMilestoneScreen';
import AdventureCompleteScreen from './AdventureCompleteScreen';
import ROIReelLesson from './ROIReelLesson';
import ROIVideoCarouselLesson from './ROIVideoCarouselLesson';
import ROIImageCarouselLesson from './ROIImageCarouselLesson';
import ROIScrollableMediaViewLesson from './ROIScrollableMediaViewLesson';
import ROIQuiz from './ROIQuiz';
import type { Adventure, ContentItem } from './types';

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

interface ROIEraComponentProps {
  adventures: Adventure[];
  userProgress: UserProgress[];
  onProgressUpdate?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const ROIEraComponent: React.FC<ROIEraComponentProps> = ({ adventures, userProgress, onProgressUpdate, refreshing, onRefresh }) => {
  const [selectedLesson, setSelectedLesson] = useState<{
    contentItem: ContentItem;
    adventureId: string;
    moduleId: string;
    lessonId: string;
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

  // Responsive padding to match bento grid
  const { width: screenWidth } = Dimensions.get('window');
  const containerPadding = screenWidth * 0.034; // ~13px on 375px screen

  // Calculate completed adventures count dynamically (recalculates when userProgress changes)
  const completedAdventuresCount = useMemo(() => {
    return adventures.filter(adventure => {
      // Get all modules for this adventure from userProgress
      const adventureModules = userProgress.filter(
        p => p.adventureId === adventure.readable_id && p.era_id === 2
      );

      // Get total modules for this adventure from content_list
      const totalModulesForAdventure = adventure.content_list?.length || 0;

      // Adventure is complete if all modules are completed and quizzes passed
      const completedModulesForAdventure = adventureModules.filter(
        p => p.isCompleted && p.quizCompleted
      ).length;

      return totalModulesForAdventure > 0 && completedModulesForAdventure === totalModulesForAdventure;
    }).length;
  }, [adventures, userProgress]);

  // Create dynamic progress bar data
  const progressBarData = {
    title: 'Exploring Rise of Islam',
    subtitle: '600 - 632 CE',
    currentStep: completedAdventuresCount,
    totalSteps: adventures.length,
  };

  // Handle card press - open lesson modal
  const handleCardPress = (contentItem: ContentItem, adventureId: string) => {
    // Use database IDs directly (flows AS IS to ProgressContext)
    const moduleId = contentItem.id; // Use media_id from content_list
    const lessonId = `lesson${contentItem.order_by}`;

    console.log('🎬 Opening lesson:', {
      adventureId,
      moduleId,
      lessonId,
      contentType: contentItem.content_type,
      title: contentItem.thumbnail_title,
      hasQuestions: contentItem.questions?.length > 0
    });

    setSelectedLesson({
      contentItem,
      adventureId,
      moduleId,
      lessonId,
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

    // Reload progress to show stars immediately in UI
    if (onProgressUpdate) {
      onProgressUpdate();
    }

    // Read FRESH progress data from AsyncStorage to avoid race condition
    const progressData = await AsyncStorage.getItem('new_user_progress');
    const freshUserProgress: UserProgress[] = progressData ? JSON.parse(progressData) : [];
    console.log('📊 Fresh progress data loaded:', freshUserProgress.length, 'modules');

    // Check if adventure is complete (all modules in content_list are done)
    if (selectedLesson) {
      const adventure = adventures.find(a => a.readable_id === selectedLesson.adventureId);

      if (adventure && adventure.content_list) {
        // Get displayed content (must match ROIAdventureComponent display logic)
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

    // Reload progress to show stars immediately
    if (onProgressUpdate) {
      onProgressUpdate();
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

    // Track adventure_started event
    analyticsService.trackAdventureStarted({
      era_id: 2,
      era_name: 'riseOfIslam',
      adventure_id: adventure.readable_id,
      adventure_number: adventureNumber,
      adventure_title: adventure.adventure_title || 'Unknown',
      screen: 'roi_home',
    });

    console.log(`📊 [Analytics] Adventure Started: ${adventure.readable_id}`);

    // Open adventure card modal
    setSelectedAdventureCard(adventure);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || false}
            onRefresh={onRefresh}
            tintColor={ArchivesTheme.colors.persianOrange}
            colors={[ArchivesTheme.colors.persianOrange]}
          />
        }
      >
        {/* Progress Card */}
        <View style={[styles.progressWrapper, { paddingLeft: containerPadding, paddingRight: containerPadding }]}>
          <View style={styles.progressCard}>
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressTitle}>{progressBarData.title}</Text>
              <View style={styles.progressSubtitleRow}>
                <Text style={styles.progressSubtitle}>{progressBarData.subtitle}</Text>
                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                  <Svg width={192} height={8} viewBox="0 0 192 8">
                    <Path d="M5 4L187 4" stroke="#D7C5B6" strokeWidth={2} strokeLinecap="round" />
                    <Circle cx={4} cy={4} r={4} fill={progressBarData.currentStep > 0 ? "white" : "#D7C5B6"} />
                    <Circle cx={50} cy={4} r={4} fill={progressBarData.currentStep > 1 ? "white" : "#D7C5B6"} />
                    <Circle cx={96} cy={4} r={4} fill={progressBarData.currentStep > 2 ? "white" : "#D7C5B6"} />
                    <Circle cx={142} cy={4} r={4} fill={progressBarData.currentStep > 3 ? "white" : "#D7C5B6"} />
                    <Circle cx={188} cy={4} r={4} fill={progressBarData.currentStep > 4 ? "white" : "#D7C5B6"} />
                  </Svg>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Render Adventures */}
        {adventures.map((adventure) => (
          <ROIAdventureComponent
            key={adventure.readable_id}
            adventure={adventure}
            userProgress={userProgress}
            onCardPress={(contentItem) => handleCardPress(contentItem, adventure.readable_id)}
            onTitlePress={() => handleAdventureStarted(adventure)}
          />
        ))}
      </ScrollView>

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
              <ROIQuiz
                contentItem={selectedLesson.contentItem}
                adventureId={selectedLesson.adventureId}
                moduleId={selectedLesson.moduleId}
                onContinue={handleQuizContinue}
                onDismiss={handleLessonDismiss}
                onBack={handleLessonDismiss}
                onMilestoneReached={handleMilestoneReached}
              />
            ) : (
              <>
                {/* Render lesson based on content_type */}
                {selectedLesson.contentItem.content_type === 'reel' && (
                  <ROIReelLesson
                    contentItem={selectedLesson.contentItem}
                    adventureId={selectedLesson.adventureId}
                    moduleId={selectedLesson.moduleId}
                    lessonId={selectedLesson.lessonId}
                    onContinue={handleLessonContinue}
                    onDismiss={handleLessonDismiss}
                  />
                )}
                {selectedLesson.contentItem.content_type === 'video_carousel' && (
                  <ROIVideoCarouselLesson
                    contentItem={selectedLesson.contentItem}
                    adventureId={selectedLesson.adventureId}
                    moduleId={selectedLesson.moduleId}
                    lessonId={selectedLesson.lessonId}
                    onContinue={handleLessonContinue}
                    onDismiss={handleLessonDismiss}
                  />
                )}
                {selectedLesson.contentItem.content_type === 'image_carousel' && (
                  <ROIImageCarouselLesson
                    contentItem={selectedLesson.contentItem}
                    adventureId={selectedLesson.adventureId}
                    moduleId={selectedLesson.moduleId}
                    lessonId={selectedLesson.lessonId}
                    onContinue={handleLessonContinue}
                    onDismiss={handleLessonDismiss}
                  />
                )}
                {selectedLesson.contentItem.content_type === 'scrollable_media_view' && (
                  <ROIScrollableMediaViewLesson
                    contentItem={selectedLesson.contentItem}
                    adventureId={selectedLesson.adventureId}
                    moduleId={selectedLesson.moduleId}
                    lessonId={selectedLesson.lessonId}
                    onContinue={handleLessonContinue}
                    onDismiss={handleLessonDismiss}
                  />
                )}
              </>
            )}
          </SafeAreaProvider>
        </Modal>
      )}

      {/* Adventure Card Modal */}
      <ROIAdventureCardComponent
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
            onContinue={() => setStreakMilestone(null)}
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

  // Progress Card (sticky header)
  progressWrapper: {
    marginBottom: 40,
    paddingTop: 77, // Status bar space when sticky
    backgroundColor: '#F4EBDB', // Match container background
    // paddingLeft and paddingRight applied inline to match bento grid (screenWidth * 0.034)
  },
  progressCard: {
    height: 53,
    backgroundColor: '#C99151',
    borderRadius: 11,
    paddingLeft: 24,
    paddingRight: 24,
    justifyContent: 'center',
  },
  progressTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  progressTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'DM Sans',
  },
  progressSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  progressSubtitle: {
    color: '#F4EBDB',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'DM Sans',
    letterSpacing: 0.14,
    marginRight: 12,
  },
  progressBarContainer: {
    width: 192,
    height: 8,
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

export default ROIEraComponent;
