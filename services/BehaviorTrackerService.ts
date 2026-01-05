// BehaviorTrackerService.ts
// Intelligent user behavior tracking for smart puzzle engagement
// Monitors activity patterns to trigger puzzles at natural break points

import AsyncStorage from '@react-native-async-storage/async-storage';

export type ScreenType = 'content' | 'navigation' | 'profile' | 'settings';
export type ContentAction = 'lesson_start' | 'lesson_complete' | 'quiz_start' | 'quiz_complete' | 'module_complete' | 'adventure_complete';

interface BehaviorEvent {
  type: ContentAction | 'screen_change' | 'idle' | 'app_foreground' | 'app_background';
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface UserSession {
  sessionStart: Date;
  lastActivity: Date;
  currentScreen: ScreenType;
  recentEvents: BehaviorEvent[];
  completionsThisSession: {
    lessons: number;
    quizzes: number;
    modules: number;
    adventures: number;
  };
  totalLifetimeAdventures: number; // Total completed adventures ever (from AsyncStorage)
  lastPuzzleShown: Date | null;
  puzzleDismissedThisSession: boolean;

  // Smart tracking
  appReturnedFromBackground: boolean;
  lastBackgroundTime: Date | null;
  navigationScreenViews: number; // How many times returned to navigation
  erasSwitched: string[]; // Track era changes
  hasEverOpenedPuzzles: boolean; // First-time user nudge
  scrollActivityDetected: boolean; // User is browsing/scrolling
}

const STORAGE_KEY = 'behavior_tracker_session';
const MAX_EVENT_HISTORY = 50; // Keep last 50 events

class BehaviorTrackerService {
  private session: UserSession;
  private listeners: Set<(shouldTrigger: boolean) => void> = new Set();

  constructor() {
    // Initialize session
    this.session = {
      sessionStart: new Date(),
      lastActivity: new Date(),
      currentScreen: 'navigation',
      recentEvents: [],
      completionsThisSession: {
        lessons: 0,
        quizzes: 0,
        modules: 0,
        adventures: 0,
      },
      totalLifetimeAdventures: 0,
      lastPuzzleShown: null,
      puzzleDismissedThisSession: false,
      appReturnedFromBackground: false,
      lastBackgroundTime: null,
      navigationScreenViews: 0,
      erasSwitched: [],
      hasEverOpenedPuzzles: false,
      scrollActivityDetected: false,
    };
  }

  // Initialize from storage
  async initialize() {
    try {
      // Load total lifetime adventure completions
      await this.loadTotalAdventureCount();

      // Check if user has ever opened GameHub (for first-time nudge)
      const hasOpened = await AsyncStorage.getItem('has_opened_gamehub');
      this.session.hasEverOpenedPuzzles = hasOpened === 'true';

      // Load session data
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        // Check if last session was recent (within 1 hour)
        const lastActivity = new Date(data.lastActivity);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

        if (lastActivity > hourAgo) {
          // Resume recent session (but keep fresh calculated values)
          this.session = {
            ...data,
            sessionStart: new Date(data.sessionStart),
            lastActivity: new Date(data.lastActivity),
            recentEvents: data.recentEvents.map((e: any) => ({
              ...e,
              timestamp: new Date(e.timestamp),
            })),
            totalLifetimeAdventures: this.session.totalLifetimeAdventures, // Keep fresh count
            hasEverOpenedPuzzles: this.session.hasEverOpenedPuzzles, // Keep fresh flag
            lastPuzzleShown: data.lastPuzzleShown ? new Date(data.lastPuzzleShown) : null,
            lastBackgroundTime: data.lastBackgroundTime ? new Date(data.lastBackgroundTime) : null,
            erasSwitched: data.erasSwitched || [],
          };
          console.log('🔄 [BehaviorTracker] Resumed recent session');
        } else {
          console.log('🆕 [BehaviorTracker] Started new session (previous expired)');
        }
      }

      console.log(`📊 [BehaviorTracker] Total lifetime adventures: ${this.session.totalLifetimeAdventures}`);
      console.log(`🎮 [BehaviorTracker] Has opened puzzles before: ${this.session.hasEverOpenedPuzzles}`);
    } catch (error) {
      console.error('❌ [BehaviorTracker] Error loading session:', error);
    }
  }

  // Load total completed adventures from AsyncStorage
  private async loadTotalAdventureCount() {
    try {
      let totalAdventures = 0;

      // Check legacy Era 1 progress (module_progress)
      const legacyProgress = await AsyncStorage.getItem('module_progress');
      if (legacyProgress) {
        const modules = JSON.parse(legacyProgress);

        // Count completed adventures (each adventure has 3 modules)
        // Adventure 1: modules 1-3, Adventure 2: modules 4-6, etc.
        const completedModules = modules.filter((m: any) => m.isCompleted).map((m: any) => m.moduleId);

        // Check each adventure (5 adventures total, 3 modules each)
        for (let adventureNum = 1; adventureNum <= 5; adventureNum++) {
          const adventureModules = [
            (adventureNum - 1) * 3 + 1,
            (adventureNum - 1) * 3 + 2,
            (adventureNum - 1) * 3 + 3,
          ];
          const allCompleted = adventureModules.every(moduleId => completedModules.includes(moduleId));
          if (allCompleted) {
            totalAdventures++;
          }
        }
      }

      // Check new era progress (new_user_progress)
      const newProgress = await AsyncStorage.getItem('new_user_progress');
      if (newProgress) {
        const progressData = JSON.parse(newProgress);

        // Group by era and adventure
        const adventureMap = new Map<string, Set<string>>();
        progressData.forEach((p: any) => {
          if (p.isCompleted && p.era_id && p.adventureId) {
            const key = `${p.era_id}-${p.adventureId}`;
            if (!adventureMap.has(key)) {
              adventureMap.set(key, new Set());
            }
            adventureMap.get(key)!.add(p.moduleId);
          }
        });

        // Count adventures with all 3 modules completed
        adventureMap.forEach((modules) => {
          if (modules.size >= 3) {
            totalAdventures++;
          }
        });
      }

      this.session.totalLifetimeAdventures = totalAdventures;
    } catch (error) {
      console.error('❌ [BehaviorTracker] Error loading adventure count:', error);
      this.session.totalLifetimeAdventures = 0;
    }
  }

  // Save session to storage
  private async saveSession() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
    } catch (error) {
      console.error('❌ [BehaviorTracker] Error saving session:', error);
    }
  }

  // Add event to history
  private addEvent(event: BehaviorEvent) {
    this.session.recentEvents.push(event);
    // Keep only recent events
    if (this.session.recentEvents.length > MAX_EVENT_HISTORY) {
      this.session.recentEvents = this.session.recentEvents.slice(-MAX_EVENT_HISTORY);
    }
    this.session.lastActivity = new Date();
    this.saveSession();
  }

  // Track screen changes
  trackScreenChange(screen: ScreenType, metadata?: Record<string, any>) {
    console.log(`📱 [BehaviorTracker] Screen: ${screen}`);

    // Track navigation screen views
    if (screen === 'navigation') {
      this.session.navigationScreenViews++;
    }

    // Track era switches (if metadata includes era)
    if (metadata?.era && !this.session.erasSwitched.includes(metadata.era as string)) {
      this.session.erasSwitched.push(metadata.era as string);
      console.log(`🌍 [BehaviorTracker] User exploring different eras (${this.session.erasSwitched.length} total)`);
    }

    this.session.currentScreen = screen;
    this.addEvent({
      type: 'screen_change',
      timestamp: new Date(),
      metadata: { screen, ...metadata },
    });

    // Check if we should trigger puzzle
    this.evaluateTrigger();
  }

  // Track content actions
  trackContentAction(action: ContentAction, metadata?: Record<string, any>) {
    console.log(`🎯 [BehaviorTracker] Action: ${action}`);
    this.addEvent({
      type: action,
      timestamp: new Date(),
      metadata,
    });

    // Update completion counters
    if (action === 'lesson_complete') this.session.completionsThisSession.lessons++;
    if (action === 'quiz_complete') this.session.completionsThisSession.quizzes++;
    if (action === 'module_complete') this.session.completionsThisSession.modules++;
    if (action === 'adventure_complete') this.session.completionsThisSession.adventures++;

    // Check if we should trigger puzzle
    this.evaluateTrigger();
  }

  // Track idle time
  trackIdle(seconds: number) {
    this.addEvent({
      type: 'idle',
      timestamp: new Date(),
      metadata: { seconds },
    });

    // Check if we should trigger puzzle during idle
    this.evaluateTrigger();
  }

  // Track scroll activity (user is browsing)
  trackScrollActivity(metadata?: Record<string, any>) {
    this.session.scrollActivityDetected = true;
    this.session.lastActivity = new Date();

    console.log('📜 [BehaviorTracker] Scroll activity detected');

    // Reset scroll flag after 5 seconds of no scrolling
    setTimeout(() => {
      this.session.scrollActivityDetected = false;
    }, 5000);

    // Evaluate if browsing behavior warrants trigger
    this.evaluateTrigger();
  }

  // Track app foreground/background
  trackAppState(state: 'foreground' | 'background') {
    this.addEvent({
      type: state === 'foreground' ? 'app_foreground' : 'app_background',
      timestamp: new Date(),
    });

    if (state === 'background') {
      this.session.lastBackgroundTime = new Date();
      this.session.appReturnedFromBackground = false;
      console.log('📴 [BehaviorTracker] App backgrounded');
    } else if (state === 'foreground') {
      // Check if returning from background
      if (this.session.lastBackgroundTime) {
        const timeSince = (new Date().getTime() - this.session.lastBackgroundTime.getTime()) / 1000 / 60;
        if (timeSince >= 2) { // At least 2 minutes away
          this.session.appReturnedFromBackground = true;
          console.log(`📱 [BehaviorTracker] App returned from background (${Math.round(timeSince)} min away)`);

          // Evaluate trigger on return
          this.evaluateTrigger();
        }
      }
    }
  }

  // Mark puzzle as shown
  async markPuzzleShown() {
    this.session.lastPuzzleShown = new Date();
    this.session.hasEverOpenedPuzzles = true;

    // Save flag to AsyncStorage for persistence
    await AsyncStorage.setItem('has_opened_gamehub', 'true');

    this.saveSession();
    console.log('🧩 [BehaviorTracker] Puzzle shown');
  }

  // Mark puzzle as dismissed
  markPuzzleDismissed() {
    this.session.puzzleDismissedThisSession = true;
    this.saveSession();
    console.log('❌ [BehaviorTracker] Puzzle dismissed');
  }

  // Subscribe to trigger events
  onTrigger(callback: (shouldTrigger: boolean) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify listeners
  private notifyListeners(shouldTrigger: boolean) {
    this.listeners.forEach(callback => callback(shouldTrigger));
  }

  // ========== DECISION ENGINE ==========

  // Check if user is in flow state (rapid progression)
  private isInFlowState(): boolean {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    // Count content completions in last 2 minutes
    const recentCompletions = this.session.recentEvents.filter(e =>
      e.timestamp > twoMinutesAgo &&
      (e.type === 'lesson_complete' || e.type === 'quiz_complete')
    );

    // If 2+ completions in 2 minutes = flow state
    const inFlow = recentCompletions.length >= 2;
    if (inFlow) {
      console.log('🌊 [BehaviorTracker] User in FLOW state - don\'t interrupt');
    }
    return inFlow;
  }

  // Check if user is browsing (not focused on content)
  private isBrowsing(): boolean {
    const now = new Date();
    const lastActivityTime = this.session.lastActivity.getTime();
    const timeSinceActivity = (now.getTime() - lastActivityTime) / 1000; // seconds

    // User is browsing if on navigation screen for 15+ seconds
    const isBrowsingNavigation =
      this.session.currentScreen === 'navigation' &&
      timeSinceActivity >= 15;

    if (isBrowsingNavigation) {
      console.log('👀 [BehaviorTracker] User browsing (idle on navigation)');
    }

    return isBrowsingNavigation;
  }

  // Check if recently completed adventure
  private hasRecentAdventureCompletion(): boolean {
    const now = new Date();
    const tenSecondsAgo = new Date(now.getTime() - 10 * 1000);

    const recentAdventure = this.session.recentEvents.find(e =>
      e.type === 'adventure_complete' &&
      e.timestamp > tenSecondsAgo
    );

    return !!recentAdventure;
  }

  // Check if enough time since last puzzle
  private enoughTimeSinceLastPuzzle(): boolean {
    if (!this.session.lastPuzzleShown) return true;

    const now = new Date();
    const timeSince = (now.getTime() - this.session.lastPuzzleShown.getTime()) / 1000 / 60; // minutes

    // At least 30 minutes since last puzzle
    return timeSince >= 30;
  }

  // Main trigger evaluation - SMART DECISION ENGINE
  private evaluateTrigger() {
    // ========== BLOCKERS (never trigger) ==========

    // Don't trigger if dismissed this session
    if (this.session.puzzleDismissedThisSession) {
      console.log('⛔ [BehaviorTracker] Puzzle dismissed this session');
      this.notifyListeners(false);
      return;
    }

    // Must have completed at least 1 adventure EVER
    const hasCompletedAdventures =
      this.session.totalLifetimeAdventures > 0 ||
      this.session.completionsThisSession.adventures > 0;

    if (!hasCompletedAdventures) {
      console.log('⏳ [BehaviorTracker] No adventures completed yet');
      this.notifyListeners(false);
      return;
    }

    // Never interrupt flow state (rapid learning)
    if (this.isInFlowState()) {
      console.log('🌊 [BehaviorTracker] User in flow - don\'t interrupt');
      this.notifyListeners(false);
      return;
    }

    // Must be enough time since last puzzle
    if (!this.enoughTimeSinceLastPuzzle()) {
      console.log('⏰ [BehaviorTracker] Too soon since last puzzle');
      this.notifyListeners(false);
      return;
    }

    // ========== SMART TRIGGER CONDITIONS ==========

    const now = new Date();
    const sessionDuration = (now.getTime() - this.session.sessionStart.getTime()) / 1000 / 60; // minutes

    // CONDITION 1: Celebration - just completed adventure
    const recentCompletion = this.hasRecentAdventureCompletion();
    const celebration = recentCompletion && this.session.currentScreen === 'navigation';

    // CONDITION 2: App return - came back after 2+ min away
    const appReturn = this.session.appReturnedFromBackground && this.session.currentScreen === 'navigation';

    // CONDITION 3: Exploration - browsing multiple eras (curiosity)
    const exploringEras = this.session.erasSwitched.length >= 2 && sessionDuration >= 3;

    // CONDITION 4: Settled session - been in app 5+ min, returned to nav 3+ times (casual browsing)
    const settledBrowsing =
      sessionDuration >= 5 &&
      this.session.navigationScreenViews >= 3 &&
      this.session.currentScreen === 'navigation';

    // CONDITION 5: First-time nudge - never opened puzzles + has progress + browsing
    const firstTimeNudge =
      !this.session.hasEverOpenedPuzzles &&
      this.session.totalLifetimeAdventures >= 1 &&
      this.session.navigationScreenViews >= 2 &&
      sessionDuration >= 2;

    // CONDITION 6: Scroll browsing - actively scrolling adventures but not clicking
    const scrollBrowsing =
      this.session.scrollActivityDetected &&
      this.session.currentScreen === 'navigation' &&
      sessionDuration >= 3;

    // ========== TRIGGER DECISION ==========

    const shouldTrigger =
      celebration || appReturn || exploringEras || settledBrowsing || firstTimeNudge || scrollBrowsing;

    if (shouldTrigger) {
      // Determine reason for analytics
      let reason = 'idle';
      let triggerType = '';

      if (celebration) {
        reason = 'celebration';
        triggerType = 'Adventure completion';
      } else if (appReturn) {
        triggerType = 'App return from background';
      } else if (exploringEras) {
        triggerType = 'Era exploration';
      } else if (firstTimeNudge) {
        triggerType = 'First-time discovery';
      } else if (settledBrowsing) {
        triggerType = 'Settled browsing';
      } else if (scrollBrowsing) {
        triggerType = 'Active browsing';
      }

      console.log('🎉 [BehaviorTracker] SMART TRIGGER ACTIVATED!');
      console.log(`  ✨ Trigger Type: ${triggerType}`);
      console.log(`  📊 Session: ${Math.round(sessionDuration)} min | Nav views: ${this.session.navigationScreenViews}`);
      console.log(`  🌍 Eras explored: ${this.session.erasSwitched.length}`);
      console.log(`  🎮 First-timer: ${!this.session.hasEverOpenedPuzzles}`);
      console.log(`  📈 Total adventures: ${this.session.totalLifetimeAdventures}`);

      // Reset app return flag after triggering
      if (appReturn) {
        this.session.appReturnedFromBackground = false;
      }
    }

    this.notifyListeners(shouldTrigger);
  }

  // Manual trigger check (for testing or explicit calls)
  shouldTriggerPuzzle(): boolean {
    this.evaluateTrigger();
    return false; // Actual result comes via listeners
  }

  // Get session stats (for debugging/analytics)
  getSessionStats() {
    return {
      sessionDuration: (new Date().getTime() - this.session.sessionStart.getTime()) / 1000 / 60, // minutes
      completions: this.session.completionsThisSession,
      currentScreen: this.session.currentScreen,
      eventCount: this.session.recentEvents.length,
      lastActivity: this.session.lastActivity,
      lastPuzzleShown: this.session.lastPuzzleShown,
    };
  }

  // Reset session (for testing or new day)
  async resetSession() {
    // Reload total adventure count and puzzle history
    await this.loadTotalAdventureCount();
    const hasOpened = await AsyncStorage.getItem('has_opened_gamehub');

    this.session = {
      sessionStart: new Date(),
      lastActivity: new Date(),
      currentScreen: 'navigation',
      recentEvents: [],
      completionsThisSession: {
        lessons: 0,
        quizzes: 0,
        modules: 0,
        adventures: 0,
      },
      totalLifetimeAdventures: this.session.totalLifetimeAdventures, // Keep lifetime count
      hasEverOpenedPuzzles: hasOpened === 'true', // Keep puzzle history
      lastPuzzleShown: null,
      puzzleDismissedThisSession: false,
      appReturnedFromBackground: false,
      lastBackgroundTime: null,
      navigationScreenViews: 0,
      erasSwitched: [],
      scrollActivityDetected: false,
    };
    this.saveSession();
    console.log('🔄 [BehaviorTracker] Session reset');
  }
}

// Export singleton instance
export const behaviorTrackerService = new BehaviorTrackerService();
