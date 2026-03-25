import AdventureComponent from '@/components/adventure/shared/AdventureComponent';
import LessonPlayer from '@/components/lessons/LessonPlayer';
import Quiz from '@/components/quiz/Quiz';
import type { Adventure, ContentItem } from '@/components/shared/types';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { WALKTHROUGH_KEYS } from '@/constants/WalkthroughKeys';
import { useAdventurePreloader } from '@/hooks/useAdventurePreloader';
import { useVideoPreloader, extractVideoUrls } from '@/hooks/useVideoPreloader';
import { analyticsService } from '@/services/AnalyticsService';
import { useAI } from '@/gamification';
import { getAdventureUnlockStatus } from '@/utils/adventureUnlock';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  showPullToRefreshHint?: boolean; // Show hint above adventure list (hide after first use)
}

const BentoGridScreen: React.FC<BentoGridScreenProps> = ({ adventures, userProgress, onProgressUpdate, refreshing, onRefresh, onScrollActivity, showPullToRefreshHint = false }) => {
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
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null);
  const { openChatToLearn } = useAI();

  // Open AI chat after quiz modal closes (fixes modal-on-modal issue on iOS)
  useEffect(() => {
    if (!selectedLesson && pendingChatMessage) {
      // Small delay to ensure the Modal is fully unmounted before presenting AIChatModal
      const timer = setTimeout(() => {
        openChatToLearn(pendingChatMessage);
        setPendingChatMessage(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedLesson, pendingChatMessage]);

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

    // Track module_started event for funnel analysis
    const adventureNumber = parseInt(adventureId.split('_')[2] || '0', 10);
    analyticsService.trackModuleStarted({
      era_id: eraId,
      era_name: eraName,
      adventure_id: adventureId,
      adventure_number: adventureNumber,
      module_id: moduleId,
      module_number: contentItem.order_by || 0,
      module_title: contentItem.thumbnail_title || undefined,
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

  // Video preloading: only preload the first two unlocked adventures (active + next)
  // instead of every AdventureComponent creating 6 players each (~30 total → ~12 max)
  const preloadVideoUrls = useMemo(() => {
    const unlockedAdventures = adventures.filter(
      (adv) => adventureUnlockStatus[adv.readable_id]
    );
    // Take the last 2 unlocked adventures (most recently available = most likely in progress)
    const toPreload = unlockedAdventures.slice(-2);
    const urls: string[] = [];
    for (const adv of toPreload) {
      urls.push(...extractVideoUrls(adv.content_list || []));
    }
    return urls;
  }, [adventures, adventureUnlockStatus]);

  useVideoPreloader(preloadVideoUrls, { maxVideos: 6 });

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

  // Calculate dynamic overlay height based on number of locked adventures
  // instead of hardcoding 5000px (which causes GPU memory exhaustion → SIGABRT on Android)
  const lockOverlayHeight = useMemo(() => {
    if (!firstLockedAdventureId) return 0;

    const firstLockedIndex = adventures.findIndex((adv) => adv.readable_id === firstLockedAdventureId);
    const lockedCount = adventures.length - firstLockedIndex;

    // Replicate AdventureComponent's height calculation:
    // cardWidth = (screenWidth - padding*2 - gap) / 2
    // containerHeight = cardWidth * 2.08
    // Per-adventure height = eraBadge(34) + titleSection(56) + timeline(40) + bentoGrid(containerHeight + 50) + container margin(24)
    const screenWidth = Dimensions.get('window').width;
    const containerPadding = screenWidth * 0.034;
    const gap = screenWidth * 0.021;
    const cardWidth = (screenWidth - containerPadding * 2 - gap) / 2;
    const containerHeight = cardWidth * 2.08;
    const estimatedAdventureHeight = 34 + 56 + 40 + containerHeight + 50 + 24;

    const totalHeight = lockedCount * estimatedAdventureHeight + 200; // 200px buffer for scrollContent padding
    console.log('🔒 Lock overlay:', { lockedCount, estimatedAdventureHeight, totalHeight, screenWidth });
    return totalHeight;
  }, [adventures, firstLockedAdventureId]);

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
            style={[styles.continuousLockOverlay, { height: lockOverlayHeight }]}
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
  }, [userProgress, adventureUnlockStatus, firstLockedAdventureId, lockOverlayHeight]);

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
          ListHeaderComponent={
            showPullToRefreshHint ? (
              <View style={styles.pullToRefreshHint}>
                <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                  <Path
                    d="M8 16C5.76667 16 3.875 15.225 2.325 13.675C0.775 12.125 0 10.2333 0 8C0 5.76667 0.775 3.875 2.325 2.325C3.875 0.775 5.76667 0 8 0C9.15 0 10.25 0.2375 11.3 0.7125C12.35 1.1875 13.25 1.86667 14 2.75V1C14 0.716667 14.0958 0.479167 14.2875 0.2875C14.4792 0.0958333 14.7167 0 15 0C15.2833 0 15.5208 0.0958333 15.7125 0.2875C15.9042 0.479167 16 0.716667 16 1V6C16 6.28333 15.9042 6.52083 15.7125 6.7125C15.5208 6.90417 15.2833 7 15 7H10C9.71667 7 9.47917 6.90417 9.2875 6.7125C9.09583 6.52083 9 6.28333 9 6C9 5.71667 9.09583 5.47917 9.2875 5.2875C9.47917 5.09583 9.71667 5 10 5H13.2C12.6667 4.06667 11.9375 3.33333 11.0125 2.8C10.0875 2.26667 9.08333 2 8 2C6.33333 2 4.91667 2.58333 3.75 3.75C2.58333 4.91667 2 6.33333 2 8C2 9.66667 2.58333 11.0833 3.75 12.25C4.91667 13.4167 6.33333 14 8 14C9.13333 14 10.1708 13.7125 11.1125 13.1375C12.0542 12.5625 12.7833 11.7917 13.3 10.825C13.4333 10.5917 13.6208 10.4292 13.8625 10.3375C14.1042 10.2458 14.35 10.2417 14.6 10.325C14.8667 10.4083 15.0583 10.5833 15.175 10.85C15.2917 11.1167 15.2833 11.3667 15.15 11.6C14.4667 12.9333 13.4917 14 12.225 14.8C10.9583 15.6 9.55 16 8 16Z"
                    fill="white"
                  />
                </Svg>
                <Text style={styles.pullToRefreshText}>Pull to refresh</Text>
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing || false}
              onRefresh={onRefresh}
              tintColor={ArchivesTheme.colors.persianOrange}
              colors={[ArchivesTheme.colors.persianOrange]}
            />
          }
          // Performance optimizations - reduced to ensure lock overlay renders correctly
          removeClippedSubviews={false} // Prevent IllegalStateException in ReactViewGroup.updateClippingToRect (REACT-NATIVE-7R)
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
                onChatToLearn={(msg) => {
                  setPendingChatMessage(msg);
                  handleLessonDismiss();
                }}
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
  pullToRefreshHint: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderRadius: 15,
    paddingHorizontal: 16,
    height: 30,
    gap: 8,
    marginBottom: 8,
  },
  pullToRefreshText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
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
  // Height is now calculated dynamically based on locked adventure count (set via inline style)
  continuousLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
