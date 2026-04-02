/**
 * Archives Expo - Comprehensive Analytics Service
 * Tracks all user interactions and engagement metrics
 * Uses PostHog for event collection and analysis
 */

import { usePostHog } from 'posthog-react-native';
import AppLogger from './AppLogger';
import { networkPerformanceService } from './NetworkPerformanceService';

// ==================== EVENT TYPES ====================

export type SignUpMethod = 'apple' | 'google' | 'email';
export type LoginMethod = 'apple' | 'google' | 'email';
export type DeviceType = 'ios' | 'android' | 'web';
export type SubscriptionType = 'monthly' | 'yearly' | 'lifetime';

// ==================== EVENT INTERFACES ====================

interface UserSignedUpEvent {
  sign_up_method: SignUpMethod;
  referral_code?: string;
  // device_type removed - PostHog auto-captures $os
  // location removed - PostHog auto-captures $geoip_country_name, $geoip_city_name
  // timestamp removed - PostHog auto-captures $timestamp
}

interface UserSessionInEvent {
  login_method: LoginMethod;
  // device_type removed - PostHog auto-captures $os
  // timestamp removed - PostHog auto-captures $timestamp
}

interface OnboardingCompletedEvent {
  screen: string;
  context: string;
  time_to_complete_seconds: number;
  onboarding_q1: string; // Learning goals
  onboarding_q2: string[]; // Interest areas (array)
  onboarding_q3: string; // Learning style
  onboarding_q4: string; // Time commitment
  // timestamp removed - PostHog auto-captures $timestamp
}

interface EraSelectedEvent {
  era_name: string;
  era_id: string;
  screen: string;
  context: 'onboarding' | 'era_switch';
  selection_order: number;
}

interface PermissionRequestedEvent {
  permission_type: 'app_tracking_transparency' | 'push_notifications';
  screen: string;
  result: 'granted' | 'denied' | 'undetermined' | 'restricted';
  platform: string;
}

interface OnboardingQuestionAnsweredEvent {
  screen: string;
  question_number: number;
  question_text: string;
  answer: string | string[];
  answer_index?: number;
}


interface AuthScreenViewedEvent {
  screen: string;
  mode: 'signin' | 'signup';
}

interface AuthMethodSelectedEvent {
  screen: string;
  auth_method: 'apple' | 'google' | 'email';
  mode: 'signin' | 'signup';
}

interface AuthSucceededEvent {
  screen: string;
  auth_method: 'apple' | 'google' | 'email';
  mode: 'signin' | 'signup';
  is_new_user: boolean;
}

interface AuthFailedEvent {
  screen: string;
  auth_method: 'apple' | 'google' | 'email';
  mode: 'signin' | 'signup';
  error_message: string;
}


// ==================== SESSION TELEMETRY INTERFACES (AFF-151) ====================

export type SessionOutTrigger = 'manual_profile' | 'stale_session_onboarding' | 'clerk_session_ended' | 'account_deleted' | 'app_backgrounded';

interface UserSessionOutEvent {
  trigger: SessionOutTrigger;
  session_duration_seconds: number | null;
  had_selected_era: boolean;
}

interface AuthStateChangeEvent {
  previous_state: 'signed_in' | 'signed_out' | 'unknown';
  new_state: 'signed_in' | 'signed_out';
  user_id: string | null;
  had_selected_era: boolean;
  app_state: string;
}

interface OnboardingStaleSessionEvent {
  user_id: string | null;
  had_selected_era: boolean;
  sign_out_result: 'success' | 'error';
  error_message?: string;
}

interface VideoProgressEvent {
  video_name: string;
  screen: string;
  progress_percent: number;
  duration_seconds?: number;
}

interface FirstLessonEvent {
  first_era_number: number;
  first_module_number: number;
  // timestamp removed - PostHog auto-captures $timestamp
}

interface ModuleTrackingEvent {
  era_number: number;
  adventure_number: number;
  module_number: number;
  lesson_type: 'video_reading' | 'image_carousel' | 'video_carousel' | 'static_image' | 'quiz';

  // Engagement metrics
  time_spent_seconds: number;
  time_per_reel?: number[]; // For video lessons
  time_per_carousel_image?: number[]; // For image carousels
  screen_presses: number;

  // Quiz answers (if quiz)
  q1_answer?: string;
  q2_answer?: string;
  q3_answer?: string;
  q4_answer?: string;
  q5_answer?: string;
  overall_score?: number; // 0-5

  // Video performance
  video_buffer_time_ms?: number;

  // timestamp removed - PostHog auto-captures $timestamp
}

interface DropOffEvent {
  screen_name: string;
  era_number?: number;
  adventure_number?: number;
  module_number?: number;
  session_duration_seconds: number;
  // timestamp removed - PostHog auto-captures $timestamp
}

interface PageViewEvent {
  page_name: 'profile' | 'subscription' | 'era' | 'home';
  time_spent_seconds: number;
  clicks: number;
  // timestamp removed - PostHog auto-captures $timestamp
}

interface NotificationSentEvent {
  notification_type: 'daily_reminder' | 'weekly_reminder';
  message_id: string;
  // timestamp removed - PostHog auto-captures $timestamp
}

interface NotificationClickedEvent {
  message_id: string;
  // timestamp removed - PostHog auto-captures $timestamp
}

interface SubscriptionEvent {
  subscription_type: SubscriptionType;
  price?: string;
  currency?: string;
  // timestamp removed - PostHog auto-captures $timestamp
}

// Subscribe flow trigger contexts (paywall placement IDs)
export type SubscribeTrigger =
  | 'subscribe_tab'
  | 'daily_story_rewind'
  | 'ai_quiz_explanation'
  | 'era_locked';

interface SubscribeScreenViewedEvent {
  trigger: SubscribeTrigger;
  era_id?: string;
  era_name?: string;
}

interface SubscribePurchaseCompletedEvent {
  trigger: SubscribeTrigger;
  plan: SubscriptionType;
  revenue?: number;
  era_id?: string;
  era_name?: string;
}

interface SubscribePurchaseFailedEvent {
  trigger: SubscribeTrigger;
  plan?: SubscriptionType;
  error_code?: string;
  era_id?: string;
  era_name?: string;
}

interface SubscribeRestoreEvent {
  trigger: SubscribeTrigger;
  era_id?: string;
  era_name?: string;
}

interface SubscribeRestoreFailedEvent {
  trigger: SubscribeTrigger;
  error_code?: string;
}

interface SubscriptionPurchasedEvent {
  product_id: string;
  plan_type: SubscriptionType;
  price_usd?: number;
  currency?: string;
  offering_id?: string;
  is_trial: boolean;
  source_placement?: SubscribeTrigger;
}

interface AdventureStartedEvent {
  era_id: string;
  era_name: string;
  adventure_id: string | number;
  adventure_number: number;
  adventure_title: string;
  screen: string;
}

interface AdventureCompleteContinueEvent {
  adventure_id: string | number;
  adventure_number: number;
  adventure_title: string;
  screen: string;
  era_id: string;
  era_name: string;
  total_xp_earned: number;
}

interface PushNotificationPermissionEvent {
  permission_type: 'push_notifications';
  screen: string;
  result: 'granted' | 'denied' | 'undetermined';
  platform: string;
}

interface UserAccountDeletedEvent {
  deletion_reason?: string;
  account_age_days?: number;
  total_xp?: number;
  adventures_completed?: number;
}

interface QuizResultsViewedEvent {
  adventure_id: string | number;
  module_id: string | number;
  quiz_id?: string;
  correct_answers: number;
  total_questions: number;
  percentage: number;
  total_points: number;
  performance_tier: 'high' | 'medium' | 'low';
  era_id: string;
  era_name: string;
  adventure_number?: number;
  module_number?: number;
}

interface ModuleStartedEvent {
  era_id: string;
  era_name: string;
  adventure_id: number | string;
  adventure_number: number;
  module_id: number | string;
  module_number: number;
  module_title?: string;
}

interface EraStartedEvent {
  era_id: string;
  era_name: string;
  screen: string;
}

interface EraCompletedEvent {
  era_id: string;
  era_name: string;
  total_adventures: number;
  total_xp: number;
}

interface ModuleCompletedEvent {
  era_id: string;
  era_name: string;
  adventure_id: number;
  adventure_number: number;
  module_id: number;
  module_number: number;
  lessons_completed: number;
  quiz_score: number;
  xp_earned?: number; // XP earned from module (quiz_score * 10)
  total_xp_after?: number; // User's total XP after module completion
  total_time_seconds?: number;
}

// ==================== DAILY STORY EVENT INTERFACES ====================

interface DailyStoryViewedEvent {
  story_id: string;
  story_date: string;
  story_title: string;
  entry_source: 'today_tab' | 'notification' | 'rewind' | 'deep_link';
  is_today: boolean;
}

interface DailyStoryDismissedEvent {
  story_id: string;
  time_spent_seconds: number;
  scroll_depth_pct: number;
  cards_seen: number;
  completed: boolean;
}

interface DailyStoryCardViewedEvent {
  story_id: string;
  card_index: number;
}

interface DailyStoryCompletedEvent {
  story_id: string;
  story_date: string;
  time_spent_seconds: number;
  entry_source: 'today_tab' | 'notification' | 'rewind' | 'deep_link';
}

interface DailyStoryMediaPlayedEvent {
  story_id: string;
  media_type: 'audio' | 'video';
  media_id: string;
}

interface DailyStoryRewindTappedEvent {
  story_date: string;
  is_subscribed: boolean;
  days_ago: number;
}

interface DailyStoryRewindBlockedEvent {
  story_date: string;
  days_ago: number;
}

interface DailyStoryStreakIncrementedEvent {
  story_id: string;
  current_streak: number;
  is_first_action_today: boolean;
}

// ==================== DEVICE HEALTH INTERFACES (AFF-618) ====================

interface DeviceHealthSnapshotEvent {
  // Memory metrics (from react-native-device-info)
  memory_used_mb: number;
  memory_total_mb: number;
  memory_percent: number;
  memory_threshold_exceeded: boolean; // >80%

  // CPU metrics (from DeviceHealth native module)
  cpu_usage_percent: number;
  cpu_core_count: number;
  cpu_spike_detected: boolean; // >80% sustained

  // Context
  screen: string;
  era_id?: string;
  adventure_id?: string | number;
  module_id?: string | number;
  lesson_id?: string | number;
}

interface DeviceHealthSummaryEvent {
  // Peak values over monitoring session
  peak_memory_mb: number;
  peak_memory_percent: number;
  peak_cpu_percent: number;
  avg_memory_percent: number;
  avg_cpu_percent: number;

  // Threshold flags
  memory_threshold_exceeded: boolean;
  cpu_spike_count: number; // number of consecutive polls >80%

  // Session info
  monitoring_duration_seconds: number;
  sample_count: number;
  screen: string;
  era_id?: string;
  adventure_id?: string | number;
  module_id?: string | number;
  lesson_id?: string | number;
}

interface NetworkSpeedEvent {
  download_speed_mbps?: number;      // Present for progressive, absent for HLS
  content_size_bytes?: number;       // Present for progressive, absent for HLS
  load_time_ms: number;
  media_type: 'video' | 'image';
  content_type: 'hls' | 'progressive';
  measurement_method: 'passive' | 'active';
  cdn_domain: string;
}

// ==================== ANALYTICS SERVICE ====================

class AnalyticsService {
  private posthog: ReturnType<typeof usePostHog> | null = null;
  private sessionStartTime: number | null = null;
  private pageStartTimes: Map<string, number> = new Map();
  private pageClicks: Map<string, number> = new Map();
  private pageUrls: Map<string, string> = new Map(); // Store screen URLs for PostHog activity view
  private currentUserId: string | null = null;
  private anonymousId: string | null = null;

  /**
   * AFF-151: Flag to prevent duplicate user_session_out events.
   * Set to true BEFORE calling signOut()/user.delete() in profile.tsx,
   * so _layout.tsx skips its own clerk_session_ended event.
   * Automatically reset after _layout.tsx reads it.
   */
  manualSignOutInProgress = false;

  /**
   * Initialize PostHog instance (call from root component)
   */
  async initialize(posthogInstance: ReturnType<typeof usePostHog>) {
    this.posthog = posthogInstance;

    // Generate or retrieve anonymous ID for tracking users before signup
    await this.initializeAnonymousId();

    AppLogger.info('startup', 'Analytics service initialized');
    AppLogger.info('startup', 'Analytics anonymous ID set', { anonymousId: this.anonymousId });
  }

  /**
   * Initialize anonymous ID for tracking before user signs up
   */
  private async initializeAnonymousId() {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);

    // Check if we already have an anonymous ID
    let storedAnonymousId = await AsyncStorage.getItem('analytics_anonymous_id');

    if (!storedAnonymousId) {
      // Generate a new anonymous ID
      storedAnonymousId = `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await AsyncStorage.setItem('analytics_anonymous_id', storedAnonymousId);
      AppLogger.info('startup', 'Generated new anonymous ID');
    }

    this.anonymousId = storedAnonymousId;
  }

  /**
   * Set current user ID (called automatically on login)
   */
  setUserId(userId: string | null) {
    this.currentUserId = userId;
    AppLogger.info('auth', 'Analytics user ID set', { userId });
  }

  /**
   * Get base event properties (includes both user_id and anonymous_id)
   */
  private getBaseProperties() {
    return {
      user_id: this.currentUserId, // null for anonymous users
      anonymous_id: this.anonymousId, // always present
      is_authenticated: !!this.currentUserId,
      // PostHog auto-captures $timestamp on every event
    };
  }

  /** AFF-579: Base properties + network context for CDN performance events only */
  private getPerformanceProperties() {
    return {
      ...this.getBaseProperties(),
      ...networkPerformanceService.getNetworkContext(),
    };
  }

  /**
   * Get current timestamp in ISO format
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  // getDeviceType() removed - PostHog auto-captures $os property

  // ==================== USER AUTHENTICATION EVENTS ====================

  /**
   * Track user sign up
   */
  trackUserSignedUp(userId: string, data: UserSignedUpEvent) {
    // Connect anonymous activity to this new user account
    // PostHog's alias() assigns an alias to the current user
    if (this.anonymousId) {
      this.posthog?.alias(userId);
      AppLogger.info('auth', 'Aliased user to PostHog', { userId });
    }

    const event = {
      ...data,
      ...this.getBaseProperties(),
      user_id: userId, // Override with the new user ID
      // PostHog auto-captures $os (device type)
    };

    this.posthog?.capture('user_signed_up', event);
    if (__DEV__) {
      console.log('📊 [Analytics] User Signed Up:', event);
    }
  }

  /**
   * Track user session start
   */
  trackUserSessionIn(loginMethod: LoginMethod) {
    this.sessionStartTime = Date.now();

    const event = {
      ...this.getBaseProperties(),
      login_method: loginMethod,
      // PostHog auto-captures $os (device type)
    };

    // AFF-151: AppLogger breadcrumb fallback for early lifecycle (Sentry inits before PostHog)
    AppLogger.info('auth', `user_session_in: ${loginMethod}`, event as Record<string, unknown>);

    this.posthog?.capture('user_session_in', event);
  }

  // ==================== ONBOARDING EVENTS ====================

  /**
   * Track onboarding completion
   */
  trackOnboardingCompleted(data: OnboardingCompletedEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('onboarding_completed', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Onboarding Completed:', event);
    }
  }

  /**
   * Track era selection
   */
  trackEraSelected(data: EraSelectedEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('era_selected', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Era Selected:', event);
    }
  }

  /**
   * Track permission requests (ATT, notifications, etc.)
   */
  trackPermissionRequested(data: PermissionRequestedEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('permission_requested', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Permission Requested:', event);
    }
  }

  /**
   * Track onboarding question answers as they're selected
   */
  trackOnboardingQuestionAnswered(data: OnboardingQuestionAnsweredEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('onboarding_question_answered', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Onboarding Question Answered:', event);
    }
  }


  /**
   * Track video progress milestones
   */
  trackVideoProgress(data: VideoProgressEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('video_progress', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Video Progress:', event);
    }
  }

  // ==================== AUTH EVENTS ====================

  /**
   * Track auth screen viewed
   */
  trackAuthScreenViewed(data: AuthScreenViewedEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('auth_screen_viewed', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Auth Screen Viewed:', event);
    }
  }

  /**
   * Track auth method selection (Apple/Google/Email button press)
   */
  trackAuthMethodSelected(data: AuthMethodSelectedEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('auth_method_selected', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Auth Method Selected:', event);
    }
  }

  /**
   * Track successful authentication
   */
  trackAuthSucceeded(data: AuthSucceededEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('auth_succeeded', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Auth Succeeded:', event);
    }
  }

  /**
   * Track authentication failure
   */
  trackAuthFailed(data: AuthFailedEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('auth_failed', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Auth Failed:', event);
    }
  }


  // ==================== SESSION TELEMETRY (AFF-151) ====================

  /**
   * Track user session end — fires BEFORE posthog.reset() so the event is attributed to the user.
   * Call this at every sign-out path, then call reset() separately.
   */
  trackUserSessionOut(data: UserSessionOutEvent) {
    const sessionDuration = this.sessionStartTime
      ? Math.floor((Date.now() - this.sessionStartTime) / 1000)
      : null;

    const event = {
      ...this.getBaseProperties(),
      trigger: data.trigger,
      session_duration_seconds: data.session_duration_seconds ?? sessionDuration,
      had_selected_era: data.had_selected_era,
    };

    // AFF-151: AppLogger breadcrumb ensures event is captured even if PostHog isn't ready
    AppLogger.info('auth', `user_session_out: ${data.trigger}`, event as Record<string, unknown>);

    this.posthog?.capture('user_session_out', event);
  }

  /**
   * Track auth state transitions (signed_in ↔ signed_out) for full timeline visibility.
   */
  trackAuthStateChange(data: AuthStateChangeEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    // AFF-151: AppLogger breadcrumb as fallback — Sentry inits before PostHog,
    // so this captures auth events even during the early app lifecycle
    AppLogger.info('auth', `auth_state_change: ${data.previous_state} → ${data.new_state}`, event as Record<string, unknown>);

    this.posthog?.capture('auth_state_change', event);
  }

  /**
   * Track when onboarding-video-2 detects a stale signed-in session and forces sign-out.
   */
  trackOnboardingStaleSession(data: OnboardingStaleSessionEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    AppLogger.warn('auth', 'Onboarding stale session detected', event as Record<string, unknown>);
    this.posthog?.capture('onboarding_stale_session_detected', event);
  }

  /**
   * Getter for session start time (used by callers to compute session_duration_seconds).
   */
  getSessionStartTime(): number | null {
    return this.sessionStartTime;
  }

  // ==================== LESSON EVENTS ====================

  /**
   * Track first lesson start
   */
  trackFirstLesson(eraNumber: number, moduleNumber: number) {
    const event = {
      ...this.getBaseProperties(),
      first_era_number: eraNumber,
      first_module_number: moduleNumber,
    };

    this.posthog?.capture('first_lesson', event);
    if (__DEV__) {
      console.log('📊 [Analytics] First Lesson:', event);
    }
  }

  /**
   * Track lesson started
   */
  trackLessonStarted(data: {
    adventure_id: number | string;
    module_id: number | string;
    lesson_id: string;
    lesson_type: string;
    era_id?: number | string; // Support both number (legacy) and string (new eras)
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
    $screen_name?: string; // Custom screen name for PostHog activity view
  }) {
    if (__DEV__) {
      console.log('🔍 [Analytics] trackLessonStarted called with:', data);
    }
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    if (__DEV__) {
      console.log('🔍 [Analytics] About to capture lesson_started, posthog exists:', !!this.posthog);
    }
    this.posthog?.capture('lesson_started', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Lesson Started:', event);
    }
  }

  /**
   * Track lesson completed
   */
  trackLessonCompleted(data: {
    adventure_id: number | string;
    module_id: number | string;
    lesson_id: string;
    time_spent_seconds: number;
    era_id?: string;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
    $screen_name?: string; // Custom screen name for PostHog activity view
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('lesson_completed', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Lesson Completed:', event);
    }
  }

  /**
   * Track video played - Enhanced with chapter/lesson details
   */
  trackVideoPlayed(data: {
    adventure_id: number | string;
    module_id: number | string;
    lesson_id: string;
    lesson_title?: string;
    chapter_number?: number;
    video_duration_seconds?: number;
    $current_url?: string; // Lesson screen URL for activity tracking
    era_id?: string;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
      // Add readable content path for easier filtering in PostHog
      content_path: `Adventure ${data.adventure_id} > Module ${data.module_id} > ${data.lesson_id}`,
    };

    this.posthog?.capture('video_played', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Video Played:', event);
    }
  }

  /**
   * Track video paused - Enhanced with detailed progress tracking
   */
  trackVideoPaused(data: {
    adventure_id: number | string;
    module_id: number | string;
    lesson_id: string;
    lesson_title?: string;
    chapter_number?: number;
    video_progress: number; // Percentage (0-100)
    position_seconds: number;
    duration_seconds?: number;
    $current_url?: string;
    era_id?: string;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
      content_path: `Adventure ${data.adventure_id} > Module ${data.module_id} > ${data.lesson_id}`,
      // Add formatted progress for easier reading
      progress_formatted: `${Math.round(data.video_progress)}%`,
    };

    this.posthog?.capture('video_paused', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Video Paused:', event);
    }
  }

  /**
   * Track video completed - Enhanced with completion metrics
   */
  trackVideoCompleted(data: {
    adventure_id: number | string;
    module_id: number | string;
    lesson_id: string;
    lesson_title?: string;
    chapter_number?: number;
    video_duration_seconds?: number;
    completion_time_seconds?: number; // How long it took user to complete
    $current_url?: string;
    era_id?: string;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
      content_path: `Adventure ${data.adventure_id} > Module ${data.module_id} > ${data.lesson_id}`,
    };

    this.posthog?.capture('video_completed', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Video Completed:', event);
    }
  }

  /**
   * Track reading card expanded
   */
  trackReadingCardExpanded(data: {
    adventure_id: number | string;
    module_id: number | string;
    lesson_id: string;
    era_id?: string;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('reading_card_expanded', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Reading Card Expanded:', event);
    }
  }

  /**
   * Track video buffer/loading time
   */
  trackVideoBuffering(data: {
    adventure_id: number | string;
    module_id: number | string;
    lesson_id: string;
    buffer_time_ms: number;
    video_url: string;
    era_id?: string;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
      content_path: `Adventure ${data.adventure_id} > Module ${data.module_id} > ${data.lesson_id}`,
    };

    this.posthog?.capture('video_buffering', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Video Buffering:', event);
    }
  }

  /**
   * Track carousel image view time
   */
  trackCarouselImageView(data: {
    adventure_id: number | string;
    module_id: number | string;
    lesson_id: string;
    image_index: number;
    time_spent_seconds: number;
    total_images: number;
    era_id?: string;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
      content_path: `Adventure ${data.adventure_id} > Module ${data.module_id} > ${data.lesson_id} > Image ${data.image_index + 1}`,
    };

    this.posthog?.capture('carousel_image_view', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Carousel Image View:', event);
    }
  }

  /**
   * Track screen press/interaction
   */
  trackScreenPress(data: {
    adventure_id: number | string;
    module_id: number | string;
    lesson_id: string;
    interaction_type: 'tap' | 'swipe' | 'card_expand' | 'card_collapse' | 'button_press';
    target?: string; // What was tapped/swiped (optional description)
    era_id?: string;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('screen_press', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Screen Press:', event);
    }
  }

  /**
   * Track module engagement (lessons and quizzes)
   */
  trackModuleEngagement(data: ModuleTrackingEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('module_tracking', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Module Tracking:', event);
    }
  }

  // ==================== QUIZ EVENTS ====================

  /**
   * Track quiz started
   */
  trackQuizStarted(data: {
    adventure_id: number | string;
    module_id: number | string;
    total_questions: number;
    era_id?: string;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
    quiz_id?: string;
    quiz_title?: string;
    $current_url?: string;
    $screen_name?: string; // Custom screen name for PostHog activity view
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('quiz_started', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Quiz Started:', event);
    }
  }

  /**
   * Track individual quiz question answered
   */
  trackQuizQuestionAnswered(data: {
    adventure_id: number | string;
    module_id: number | string;
    question_number: number;
    user_answer?: string; // The answer the user selected (optional for compatibility)
    correct_answer?: string; // The correct answer (optional for compatibility)
    is_correct: boolean;
    time_taken_seconds: number;
    xp_earned?: number; // 10 if correct, 0 if incorrect
    current_total_xp?: number; // User's current total XP
    era_id?: string;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
    quiz_id?: string;
    $current_url?: string;
    $screen_name?: string; // Custom screen name for PostHog activity view
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
      // Dynamic property naming for filtering (e.g., q1_answer, q2_answer)
      ...(data.user_answer ? { [`q${data.question_number}_answer`]: data.user_answer } : {}),
      [`q${data.question_number}_correct`]: data.is_correct,
    };

    this.posthog?.capture('quiz_question_answered', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Quiz Question Answered:', event);
    }
  }

  /**
   * Track quiz completed
   */
  trackQuizCompleted(data: {
    adventure_id: number | string;
    module_id: number | string;
    quiz_score: number;
    correct_answers: number;
    total_questions: number;
    time_spent_seconds: number;
    is_retake: boolean;
    xp_earned?: number; // XP earned from this quiz (correct_answers * 10)
    total_xp_before?: number; // User's total XP before quiz
    total_xp_after?: number; // User's total XP after quiz
    era_id?: string;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
    quiz_id?: string;
    quiz_title?: string;
    $current_url?: string;
    $screen_name?: string; // Custom screen name for PostHog activity view
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('quiz_completed', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Quiz Completed:', event);
    }
  }

  /**
   * Track quiz retake
   */
  trackQuizRetake(data: {
    adventure_id: number | string;
    module_id: number | string;
    previous_score: number;
    era_id?: string;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
    quiz_id?: string;
    $current_url?: string;
    $screen_name?: string; // Custom screen name for PostHog activity view
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('quiz_retake', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Quiz Retake:', event);
    }
  }

  // ==================== DROP-OFF TRACKING ====================

  /**
   * Track when user closes app or navigates away
   */
  trackDropOff(screenName: string, context?: {
    eraNumber?: number;
    adventureNumber?: number;
    moduleNumber?: number;
  }) {
    const sessionDuration = this.sessionStartTime
      ? Math.floor((Date.now() - this.sessionStartTime) / 1000)
      : 0;

    const event = {
      ...this.getBaseProperties(),
      screen_name: screenName,
      ...(context?.eraNumber !== undefined && { era_number: context.eraNumber }),
      ...(context?.adventureNumber !== undefined && { adventure_number: context.adventureNumber }),
      ...(context?.moduleNumber !== undefined && { module_number: context.moduleNumber }),
      session_duration_seconds: sessionDuration,
    };

    this.posthog?.capture('drop_off', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Drop Off:', event);
    }
  }

  // ==================== PAGE VIEW TRACKING ====================

  /**
   * Start tracking page view (call on screen focus)
   * @param pageName - Human-readable page name
   * @param screenUrl - Screen URL path for PostHog activity view (e.g., '/(tabs)/', '/(tabs)/profile')
   */
  startPageView(pageName: 'profile' | 'subscription' | 'era' | 'era_selection_onboarding' | 'home' | 'today' | 'adventures', screenUrl: string) {
    this.pageStartTimes.set(pageName, Date.now());
    this.pageClicks.set(pageName, 0);
    this.pageUrls.set(pageName, screenUrl);
    if (__DEV__) {
      console.log(`📊 [Analytics] Started tracking ${pageName} page (${screenUrl})`);
    }
  }

  /**
   * Track page click
   */
  trackPageClick(pageName: 'profile' | 'subscription' | 'era' | 'era_selection_onboarding' | 'home' | 'today' | 'adventures') {
    const currentClicks = this.pageClicks.get(pageName) || 0;
    this.pageClicks.set(pageName, currentClicks + 1);
  }

  /**
   * End tracking page view (call on screen blur)
   */
  endPageView(pageName: 'profile' | 'subscription' | 'era' | 'era_selection_onboarding' | 'home' | 'today' | 'adventures') {
    const startTime = this.pageStartTimes.get(pageName);
    if (!startTime) {
      AppLogger.warn('navigation', 'No start time for page view', { pageName });
      return;
    }

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const clicks = this.pageClicks.get(pageName) || 0;
    const screenUrl = this.pageUrls.get(pageName) || `/${pageName}`;

    const event = {
      ...this.getBaseProperties(),
      page_name: pageName,
      time_spent_seconds: timeSpent,
      clicks: clicks,
      $current_url: screenUrl, // PostHog uses this for activity view screen tracking
    };

    this.posthog?.capture('page_view', event);
    if (__DEV__) {
      console.log(`📊 [Analytics] ${pageName} Page View:`, event);
    }

    // Clean up
    this.pageStartTimes.delete(pageName);
    this.pageClicks.delete(pageName);
    this.pageUrls.delete(pageName);
  }

  // ==================== NOTIFICATION EVENTS ====================

  /**
   * Track notification sent
   */
  trackNotificationSent(messageId: string, notificationType: 'daily_reminder' | 'weekly_reminder') {
    const event = {
      ...this.getBaseProperties(),
      notification_type: notificationType,
      message_id: messageId,
    };

    this.posthog?.capture('notification_sent', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Notification Sent:', event);
    }
  }

  /**
   * Track notification clicked
   */
  trackNotificationClicked(messageId: string) {
    if (!this.posthog) {
      AppLogger.warn('startup', 'PostHog not ready, skipping event', { eventName: 'notification_clicked' });
      return;
    }

    const event = {
      ...this.getBaseProperties(),
      message_id: messageId,
    };

    this.posthog.capture('notification_clicked', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Notification Clicked:', event);
    }
  }

  // ==================== SUBSCRIPTION EVENTS ====================

  /**
   * Track subscription purchase
   */
  trackSubscription(data: SubscriptionEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('subscription_details', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Subscription:', event);
    }
  }

  /**
   * Track subscribe screen viewed (paywall shown to user)
   */
  trackSubscribeScreenViewed(data: SubscribeScreenViewedEvent) {
    this.trackCustomEvent('subscribe_screen_viewed', data);
  }

  /**
   * Track purchase completed from paywall UI
   */
  trackSubscribePurchaseCompleted(data: SubscribePurchaseCompletedEvent) {
    this.trackCustomEvent('subscribe_purchase_completed', data);
  }

  /**
   * Track purchase failed from paywall UI
   */
  trackSubscribePurchaseFailed(data: SubscribePurchaseFailedEvent) {
    this.trackCustomEvent('subscribe_purchase_failed', data);
  }

  /**
   * Track purchase cancelled by user
   */
  trackSubscribePurchaseCancelled(data: { trigger: SubscribeTrigger; era_id?: string; era_name?: string }) {
    this.trackCustomEvent('subscribe_purchase_cancelled', data);
  }

  /**
   * Track restore tapped
   */
  trackSubscribeRestoreTapped(data: SubscribeRestoreEvent) {
    this.trackCustomEvent('subscribe_restore_tapped', data);
  }

  /**
   * Track restore success
   */
  trackSubscribeRestoreSuccess(data: SubscribeRestoreEvent) {
    this.trackCustomEvent('subscribe_restore_success', data);
  }

  /**
   * Track restore failed
   */
  trackSubscribeRestoreFailed(data: SubscribeRestoreFailedEvent) {
    this.trackCustomEvent('subscribe_restore_failed', data);
  }

  /**
   * Track authoritative subscription_purchased event
   * Fires from RevenueCat purchase confirmation, NOT paywall UI
   */
  trackSubscriptionPurchased(data: SubscriptionPurchasedEvent) {
    this.trackCustomEvent('subscription_purchased', data);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Track custom event (for anything not covered above)
   */
  trackCustomEvent(eventName: string, properties: Record<string, any>) {
    if (!this.posthog) {
      AppLogger.warn('startup', 'PostHog not ready, skipping event', { eventName });
      return;
    }

    this.posthog.capture(eventName, properties);
    // PostHog auto-captures $timestamp on every event
    if (__DEV__) {
      console.log(`📊 [Analytics] Custom Event (${eventName}):`, properties);
    }
  }

  // ==================== NEW TRACKING EVENTS ====================

  /**
   * Track adventure started
   */
  trackAdventureStarted(properties: AdventureStartedEvent) {
    this.trackCustomEvent('adventure_started', properties);
  }

  /**
   * Track adventure complete continue button
   */
  trackAdventureCompleteContinue(properties: AdventureCompleteContinueEvent) {
    this.trackCustomEvent('adventure_complete_continue', properties);
  }

  /**
   * Track push notification permission enabled
   */
  trackPushNotificationsEnabled(properties: PushNotificationPermissionEvent) {
    this.trackCustomEvent('push_notifications_enabled', properties);
  }

  /**
   * Track push notification permission declined
   */
  trackPushNotificationsDeclined(properties: PushNotificationPermissionEvent) {
    this.trackCustomEvent('push_notifications_declined', properties);
  }

  /**
   * Track user account deleted
   */
  trackUserAccountDeleted(properties: UserAccountDeletedEvent) {
    this.trackCustomEvent('user_account_deleted', properties);
  }

  /**
   * Track quiz results viewed
   */
  trackQuizResultsViewed(properties: QuizResultsViewedEvent) {
    this.trackCustomEvent('quiz_results_viewed', properties);
  }

  /**
   * Track module started
   */
  trackModuleStarted(properties: ModuleStartedEvent) {
    this.trackCustomEvent('module_started', properties);
  }

  /**
   * Track module completed
   */
  trackModuleCompleted(properties: ModuleCompletedEvent) {
    this.trackCustomEvent('module_completed', properties);
  }

  /**
   * Track era started (first time user enters an era's content)
   */
  trackEraStarted(properties: EraStartedEvent) {
    this.trackCustomEvent('era_started', properties);
  }

  /**
   * Track era completed (all adventures in era finished)
   */
  trackEraCompleted(properties: EraCompletedEvent) {
    this.trackCustomEvent('era_completed', properties);
  }

  // ==================== DAILY STORY EVENTS ====================

  /**
   * Track daily story screen viewed
   */
  trackDailyStoryViewed(properties: DailyStoryViewedEvent) {
    this.trackCustomEvent('daily_story_viewed', properties);
  }

  /**
   * Track daily story dismissed (user navigated away)
   */
  trackDailyStoryDismissed(properties: DailyStoryDismissedEvent) {
    this.trackCustomEvent('daily_story_dismissed', properties);
  }

  /**
   * Track daily story card/section viewed (WATCH=1, EXPLORE=2, QUESTIONS=3)
   */
  trackDailyStoryCardViewed(properties: DailyStoryCardViewedEvent) {
    this.trackCustomEvent('daily_story_card_viewed', properties);
  }

  /**
   * Track daily story completed (all sections finished)
   */
  trackDailyStoryCompleted(properties: DailyStoryCompletedEvent) {
    this.trackCustomEvent('daily_story_completed', properties);
  }

  /**
   * Track media played within a daily story (video or audio)
   */
  trackDailyStoryMediaPlayed(properties: DailyStoryMediaPlayedEvent) {
    this.trackCustomEvent('daily_story_media_played', properties);
  }

  /**
   * Track user tapping a past story from the calendar
   */
  trackDailyStoryRewindTapped(properties: DailyStoryRewindTappedEvent) {
    this.trackCustomEvent('daily_story_rewind_tapped', properties);
  }

  /**
   * Track non-subscriber blocked from accessing past story
   */
  trackDailyStoryRewindBlocked(properties: DailyStoryRewindBlockedEvent) {
    this.trackCustomEvent('daily_story_rewind_blocked', properties);
  }

  /**
   * Track streak incremented from daily story completion
   */
  trackDailyStoryStreakIncremented(properties: DailyStoryStreakIncrementedEvent) {
    this.trackCustomEvent('daily_story_streak_incremented', properties);
  }

  // ==================== END DAILY STORY EVENTS ====================

  // ==================== END NEW TRACKING EVENTS ====================

  // ==================== PERSON PROPERTIES ====================

  /**
   * Initialize all person properties with null at auth time
   * Called once when user first signs in to establish the property schema
   * Properties will be updated with actual values as user progresses through app
   */
  initializePersonProperties() {
    if (!this.posthog) {
      AppLogger.warn('startup', 'PostHog not ready, skipping initializePersonProperties', {});
      return;
    }

    const nullProperties = {
      // Onboarding properties
      knowledge_level: null,
      daily_learning_goal: null,
      learning_motivation: null,
      awareness_channel: null,
      onboarding_result: null,
      // Push notification status
      is_push_enabled: null,
      // Activity tracking
      last_active_at: null,
      // Progress/streak properties
      current_streak: null,
      current_streak_date: null,
      longest_streak: null,
      longest_streak_date: null,
      lessons_completed: null,
      modules_completed: null,
      adventures_completed: null,
      eras_completed: null,
      quizzes_completed: null,
      // XP properties
      total_xp: null,
      era_xp: null, // Dynamic object: { "umayyad": 200, "rise_of_islam": 80 } - keys are era_ids from Supabase
      // Subscription properties
      subscription_product_id: null,
      subscription_billing_cycle: null,
      rc_subscription_status: null,
      // Daily story properties
      last_daily_story_date: null,
      daily_stories_read_count: null,
      daily_story_completion_rate: null,
    };

    this.posthog.capture('$set', {
      $set: nullProperties,
    });
    AppLogger.info('startup', 'Initialized person properties with null');
  }

  /**
   * Update onboarding-related person properties
   */
  updateOnboardingProperties(data: {
    knowledge_level?: string;
    daily_learning_goal?: string;  // String like "5 min / day • Casual"
    learning_motivation?: string[];
    awareness_channel?: string;
    onboarding_result?: string;
  }) {
    if (!this.posthog) {
      AppLogger.warn('startup', 'PostHog not ready, skipping updateOnboardingProperties', {});
      return;
    }

    // Filter out undefined values, keep null as valid
    const properties = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(properties).length === 0) return;

    this.posthog.capture('$set', {
      $set: properties,
    });
    if (__DEV__) {
      console.log('📊 [Analytics] Updated onboarding properties:', properties);
    }
  }

  /**
   * Update push notification status
   */
  updatePushStatus(isEnabled: boolean, permissionStatus?: 'Granted' | 'Denied' | 'NotDetermined') {
    if (!this.posthog) {
      AppLogger.warn('startup', 'PostHog not ready, skipping updatePushStatus', {});
      return;
    }

    this.posthog.capture('$set', {
      $set: {
        is_push_enabled: isEnabled,
        push_permission_status: permissionStatus || (isEnabled ? 'Granted' : 'Denied'),
        push_permission_updated_at: new Date().toISOString(),
      },
    });
    if (__DEV__) {
      console.log('📊 [Analytics] Updated push status:', isEnabled, permissionStatus);
    }
  }

  /**
   * Update last active timestamp (call on app open/foreground)
   */
  updateLastActiveAt() {
    if (!this.posthog) {
      return;
    }

    const timestamp = new Date().toISOString();
    this.posthog.capture('$set', {
      $set: { last_active_at: timestamp },
    });
    if (__DEV__) {
      console.log('📊 [Analytics] Updated last_active_at:', timestamp);
    }
  }

  /**
   * Update progress-related person properties
   */
  updateProgressProperties(data: {
    current_streak?: number;
    current_streak_date?: string;
    longest_streak?: number;
    longest_streak_date?: string;
    lessons_completed?: number;
    modules_completed?: number;
    adventures_completed?: number;
    eras_completed?: number;
    quizzes_completed?: number;
    total_xp?: number;
    era_xp?: Record<string, number>; // Dynamic: { "umayyad": 200, "rise_of_islam": 80 } - keys are era_ids from Supabase
  }) {
    if (!this.posthog) {
      AppLogger.warn('startup', 'PostHog not ready, skipping updateProgressProperties', {});
      return;
    }

    // Filter out undefined values, keep null as valid
    const properties = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(properties).length === 0) return;

    this.posthog.capture('$set', {
      $set: properties,
    });
    if (__DEV__) {
      console.log('📊 [Analytics] Updated progress properties:', properties);
    }
  }

  /**
   * Update subscription-related person properties
   */
  updateSubscriptionProperties(data: {
    subscription_product_id?: string | null;
    subscription_billing_cycle?: string | null;
    rc_subscription_status?: string | null;
  }) {
    if (!this.posthog) {
      AppLogger.warn('startup', 'PostHog not ready, skipping updateSubscriptionProperties', {});
      return;
    }

    // Filter out undefined values, keep null as valid
    const properties = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(properties).length === 0) return;

    this.posthog.capture('$set', {
      $set: properties,
    });
    if (__DEV__) {
      console.log('📊 [Analytics] Updated subscription properties:', properties);
    }
  }

  /**
   * Update daily story person properties
   */
  updateDailyStoryProperties(data: {
    last_daily_story_date?: string;
    daily_stories_read_count?: number;
    daily_story_completion_rate?: number;
  }) {
    if (!this.posthog) {
      AppLogger.warn('startup', 'PostHog not ready, skipping updateDailyStoryProperties', {});
      return;
    }

    const properties = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(properties).length === 0) return;

    this.posthog.capture('$set', {
      $set: properties,
    });
    if (__DEV__) {
      console.log('📊 [Analytics] Updated daily story properties:', properties);
    }
  }

  // ==================== USER IDENTIFICATION ====================

  /**
   * Identify user (call after login)
   */
  identifyUser(userId: string, properties?: Record<string, any>) {
    if (!this.posthog) {
      AppLogger.warn('startup', 'PostHog not ready, skipping identify', {});
      return;
    }

    this.setUserId(userId);

    // Sanitize properties to ensure consistent types (remove null/undefined)
    const sanitizedProperties = properties ?
      Object.fromEntries(
        Object.entries(properties).filter(([_, value]) => value != null)
      ) : {};

    this.posthog.identify(userId, sanitizedProperties);
    AppLogger.info('auth', 'User identified in PostHog', { userId });
  }

  /**
   * Set user properties (adds Clerk user ID as property without changing PostHog ID)
   */
  setUserProperties(clerkUserId: string, properties?: Record<string, any>) {
    if (!this.posthog) {
      AppLogger.warn('startup', 'PostHog not ready, skipping setUserProperties', {});
      return;
    }

    // Sanitize properties to ensure consistent types (remove null/undefined)
    const sanitizedProperties = properties ?
      Object.fromEntries(
        Object.entries(properties).filter(([_, value]) => value != null)
      ) : {};

    // Add Clerk user ID as a property (not as the PostHog user ID)
    const allProperties = {
      clerk_user_id: clerkUserId,
      ...sanitizedProperties,
    };

    // Use $set event to set person properties without changing distinct ID
    this.posthog.capture('$set', {
      $set: allProperties,
    });
    AppLogger.info('auth', 'User properties set in PostHog', { clerkUserId });
  }

  // ==================== DEVICE HEALTH TRACKING (AFF-618) ====================

  /**
   * Track a single device health snapshot during video playback.
   * Sent when a threshold is exceeded (memory >80% or CPU spike >80%).
   */
  trackDeviceHealthSnapshot(data: DeviceHealthSnapshotEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('device_health_snapshot', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Device Health Snapshot:', event);
    }
  }

  /**
   * Track a summary of device health metrics for a video playback session.
   * Sent once when monitoring ends (lesson exit or video completion).
   */
  trackDeviceHealthSummary(data: DeviceHealthSummaryEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('device_health_summary', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Device Health Summary:', event);
    }
  }

  // ==================== CDN PERFORMANCE TRACKING (AFF-579) ====================

  /**
   * Track video load time (player creation to readyToPlay)
   */
  trackVideoLoadTime(data: {
    load_time_ms: number;
    video_url: string;
    content_type: 'hls' | 'progressive';
    cdn_domain: string;
    initial_speed_mbps?: number;
  }) {
    const event = {
      ...data,
      time_to_first_frame_ms: data.load_time_ms, // AFF-612: alias for PostHog queries
      ...this.getPerformanceProperties(),
    };

    this.posthog?.capture('video_load_time', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Video Load Time:', event);
    }
  }

  /**
   * Track image load time (mount to onLoad)
   */
  trackImageLoadTime(data: {
    load_time_ms: number;
    image_url: string;
    image_index: number;
    total_images: number;
    cdn_domain: string;
    is_first_image: boolean;
  }) {
    const event = {
      ...data,
      ...this.getPerformanceProperties(),
    };

    this.posthog?.capture('image_load_time', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Image Load Time:', event);
    }
  }

  /**
   * Track CDN media loading errors (video or image)
   */
  trackCDNError(data: {
    media_type: 'video' | 'image';
    url: string;
    cdn_domain: string;
    error_message: string;
  }) {
    const event = {
      ...data,
      ...this.getPerformanceProperties(),
    };

    this.posthog?.capture('cdn_error', event);
    if (__DEV__) {
      console.log('📊 [Analytics] CDN Error:', event);
    }
  }

  /**
   * Track Supabase content fetch time (cache vs network)
   */
  trackContentFetchTime(data: {
    fetch_time_ms: number;
    era_id: string;
    record_count: number;
    source: 'cache' | 'supabase';
  }) {
    const event = {
      ...data,
      ...this.getPerformanceProperties(),
    };

    this.posthog?.capture('content_fetch_time', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Content Fetch Time:', event);
    }
  }

  /**
   * Track mid-playback buffer stall detected by VideoPlayer.
   * Separate from trackVideoBuffering (which requires lesson context from parent).
   */
  trackVideoBufferStall(data: {
    buffer_time_ms: number;
    video_url: string;
    content_type: 'hls' | 'progressive';
    cdn_domain: string;
  }) {
    const event = {
      ...data,
      ...this.getPerformanceProperties(),
    };

    this.posthog?.capture('video_buffer_stall', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Video Buffer Stall:', event);
    }
  }

  /**
   * AFF-612: Track video completion rate (% of video watched before exit).
   * Fired on unmount or when user navigates away from a video.
   */
  trackVideoCompletion(data: {
    completion_rate: number; // 0.0–1.0
    watch_duration_ms: number;
    video_duration_ms: number;
    video_url: string;
    content_type: 'hls' | 'progressive';
    cdn_domain: string;
  }) {
    // Guard against NaN/Infinity from expo-video edge cases (e.g. released player)
    if (!Number.isFinite(data.completion_rate) || !Number.isFinite(data.watch_duration_ms)) {
      if (__DEV__) {
        console.warn('📊 [Analytics] Video Completion skipped: invalid metrics', data);
      }
      return;
    }

    const event = {
      ...data,
      completion_rate: Math.round(data.completion_rate * 1000) / 1000, // 3 decimal places
      ...this.getPerformanceProperties(),
    };

    this.posthog?.capture('video_completion', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Video Completion:', event);
    }
  }

  // ==================== NETWORK SPEED TRACKING ====================

  /** Max network speed events per session to prevent PostHog spam */
  private networkSpeedEventCount = 0;
  private static readonly MAX_SPEED_EVENTS = 20;

  /**
   * Track a passive network speed measurement from an actual media load.
   * Fired after a video/image load completes and Content-Length is known.
   * Capped at 20 events per session.
   */
  trackNetworkSpeed(data: NetworkSpeedEvent) {
    if (this.networkSpeedEventCount >= AnalyticsService.MAX_SPEED_EVENTS) return;

    // Guard against invalid data
    if (!Number.isFinite(data.load_time_ms) || data.load_time_ms <= 0) return;
    if (data.download_speed_mbps != null && (!Number.isFinite(data.download_speed_mbps) || data.download_speed_mbps <= 0)) return;

    this.networkSpeedEventCount++;

    const event = {
      ...data,
      ...this.getPerformanceProperties(),
    };

    this.posthog?.capture('network_speed_measurement', event);
    if (__DEV__) {
      console.log('📊 [Analytics] Network Speed:', event);
    }
  }

  /**
   * Reset analytics (call on logout)
   */
  reset() {
    this.posthog?.reset();
    this.currentUserId = null;
    this.sessionStartTime = null;
    this.pageStartTimes.clear();
    this.pageClicks.clear();
    this.networkSpeedEventCount = 0;
    // Note: We keep anonymousId - it persists across sessions
    AppLogger.info('auth', 'Analytics reset (anonymous ID preserved)');
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
