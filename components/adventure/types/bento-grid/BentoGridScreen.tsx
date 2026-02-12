import AdventureComponent from '@/components/adventure/shared/AdventureComponent';
import LessonPlayer from '@/components/lessons/LessonPlayer';
import Quiz from '@/components/quiz/Quiz';
import type { Adventure, ContentItem } from '@/components/shared/types';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { WALKTHROUGH_KEYS } from '@/constants/WalkthroughKeys';
import { useAdventurePreloader } from '@/hooks/useAdventurePreloader';
import { analyticsService } from '@/services/AnalyticsService';
import { getAdventureUnlockStatus } from '@/utils/adventureUnlock';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import AdventureCard from './AdventureCard';

// TypeScript interfaces
interface UserProgress {
  adventureId: string;
  moduleId: string;
  quizScore: number;
  quizCorrectAnswers?: number; // Actual correct answers (for XP calculation)
  isCompleted: boolean;
  quizCompleted: boolean;
  completedAt: string;
  era_id: string;
}

interface BentoGridScreenProps {
  adventures: Adventure[];
  userProgress: UserProgress[];
  onProgressUpdate?: () => Promise<void> | void;
  refreshing?: boolean;
  onRefresh?: () => void;
  onScrollActivity?: () => void; // Track browsing behavior
}

const BentoGridScreen: React.FC<BentoGridScreenProps> = ({ adventures, userProgress, onProgressUpdate, refreshing, onRefresh, onScrollActivity }) => {
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

  const flatListRef = useRef<FlatList>(null);

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
      hasQuestions: (contentItem.questions?.length ?? 0) > 0
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
      hasQuestions: (contentItem.questions?.length ?? 0) > 0,
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

  // Handle quiz continue - just refresh and close
  const handleQuizContinue = async () => {
    // Reload progress to show stars immediately in UI
    if (onProgressUpdate) {
      await onProgressUpdate();
    }

    // Close the modal - Orchestrator handles all celebrations
    setSelectedLesson(null);
    setShowQuiz(false);
  };

  // Handle lesson dismiss
  const handleLessonDismiss = () => {
    console.log('❌ Lesson dismissed');
    setSelectedLesson(null);
    setShowQuiz(false);
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

  // Calculate unlock status for all adventures (memoized)
  // Rules: Adv 1 = OPEN, Adv 2-5 = progressive unlock, Adv 6+ = OPEN (bonus)
  const adventureUnlockStatus = useMemo(() => {
    return getAdventureUnlockStatus(adventures, userProgress);
  }, [adventures, userProgress]);

  // Adaptive content preloading based on device capabilities and progress
  // Preloads next adventure when user is 60%+ through current adventure
  const { state: preloadState, refresh: refreshPreloading } = useAdventurePreloader(
    adventures,
    userProgress,
    true // enabled
  );

  // Log preload stats in development (only when stats change, not every render)
  // Commented out to reduce console noise - preloading works correctly
  // useEffect(() => {
  //   if (__DEV__ && preloadState.stats.preloadedImages > 0) {
  //     console.log('📦 [Preload] Stats:', preloadState.stats);
  //   }
  // }, [preloadState.stats.preloadedImages, preloadState.stats.preloadedVideos]);

  // Find first locked adventure ID (for showing lock banner only on first one)
  const firstLockedAdventureId = useMemo(() => {
    const firstLocked = adventures.find((adv) => !adventureUnlockStatus[adv.readable_id]);
    return firstLocked?.readable_id || null;
  }, [adventures, adventureUnlockStatus]);

  // Render function for FlatList items (memoized for performance)
  const renderAdventureItem = useCallback(({ item: adventure }: { item: Adventure }) => {
    const isLocked = !adventureUnlockStatus[adventure.readable_id];
    const isFirstLocked = adventure.readable_id === firstLockedAdventureId;

    return (
      <View style={isFirstLocked ? styles.firstLockedContainer : undefined}>
        <AdventureComponent
          adventure={adventure}
          userProgress={userProgress}
          onCardPress={(contentItem) => handleCardPress(contentItem, adventure.readable_id)}
          onTitlePress={() => handleAdventureStarted(adventure)}
          isLocked={isLocked}
        />

        {/* Single continuous overlay - only on first locked adventure, extends to cover all */}
        {isFirstLocked && (
          <BlurView
            intensity={2.3}
            tint="dark"
            style={styles.continuousLockOverlay}
            pointerEvents="box-none"
          >
            <LinearGradient
              colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.6)']}
              locations={[0, 0.02, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="box-none"
            >
              <View style={styles.lockBannerContainer} pointerEvents="box-none">
                <View style={styles.lockBanner} pointerEvents="auto">
                  <Svg width={35} height={35} viewBox="0 -960 960 960" fill="#FFFFFF" style={styles.lockIcon}>
                    <Path d="M226.67-80q-27.5 0-47.09-19.58Q160-119.17 160-146.67v-422.66q0-27.5 19.58-47.09Q199.17-636 226.67-636h60v-90.67q0-80.23 56.57-136.78T480.07-920q80.26 0 136.76 56.55 56.5 56.55 56.5 136.78V-636h60q27.5 0 47.09 19.58Q800-596.83 800-569.33v422.66q0 27.5-19.58 47.09Q760.83-80 733.33-80H226.67Zm253.44-200q32.22 0 55.06-22.52Q558-325.04 558-356.67q0-31-22.95-55.16Q512.11-436 479.89-436t-55.06 24.17Q402-387.67 402-356.33q0 31.33 22.95 53.83 22.94 22.5 55.16 22.5ZM353.33-636h253.34v-90.67q0-52.77-36.92-89.72-36.93-36.94-89.67-36.94-52.75 0-89.75 36.94-37 36.95-37 89.72V-636Z" />
                  </Svg>
                  <Text style={styles.lockText}>Complete above modules to unlock this!</Text>
                </View>
              </View>
            </LinearGradient>
          </BlurView>
        )}
      </View>
    );
  }, [userProgress, adventureUnlockStatus, firstLockedAdventureId]);

  // Key extractor for FlatList (memoized)
  const keyExtractor = useCallback((item: Adventure) => item.readable_id, []);

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        <FlatList
          data={adventures}
          renderItem={renderAdventureItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={() => onScrollActivity?.()} // Track browsing behavior
          scrollEventThrottle={400} // Throttle to avoid excessive tracking
          refreshControl={
            <RefreshControl
              refreshing={refreshing || false}
              onRefresh={onRefresh}
              tintColor={ArchivesTheme.colors.persianOrange}
              colors={[ArchivesTheme.colors.persianOrange]}
            />
          }
          // Performance optimizations - reduced to ensure lock overlay renders correctly
          // removeClippedSubviews disabled to prevent clipping lock overlay
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={21} // Large window to keep lock overlay in view
        />
      </View>

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
    overflow: 'visible', // Prevent clipping of lock overlay
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'visible', // Allow overlay to extend beyond container
  },
  scrollContent: {
    paddingBottom: 120, // Account for tab bar height
    overflow: 'visible', // Allow lock overlay to extend beyond scroll container
  },

  // First locked adventure container - allows overlay to extend downward
  firstLockedContainer: {
    position: 'relative',
    overflow: 'visible',
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

  // Continuous Lock Overlay - single overlay extending down to cover all locked adventures
  continuousLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5000, // Extremely large height to guarantee coverage of all locked adventures
    zIndex: 50,
  },
  lockBannerContainer: {
    paddingTop: 200, // Position banner in middle of locked area
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ArchivesTheme.colors.mutedNavy,
    height: 57,
    paddingLeft: 50,
    paddingRight: 28,
    borderRadius: 60,
    gap: 10,
  },
  lockIcon: {
    flexShrink: 0,
  },
  lockText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'DM Sans',
    flexShrink: 0,
  },
});

export default BentoGridScreen;
