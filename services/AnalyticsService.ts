/**
 * Archives Expo - Comprehensive Analytics Service
 * Tracks all user interactions and engagement metrics
 * Uses PostHog for event collection and analysis
 */

import { usePostHog } from 'posthog-react-native';

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

interface OnboardingScreenExitedEvent {
  screen: string;
  exit_action: 'back_button' | 'continued' | 'app_closed';
  duration_seconds: number;
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

interface AuthScreenExitedEvent {
  screen: string;
  exit_action: 'authenticated' | 'back_button' | 'app_closed';
  duration_seconds: number;
  mode: 'signin' | 'signup';
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

interface AdventureStartedEvent {
  era_id: number;
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
  era_id: number;
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
  era_id: number;
  era_name: string;
  adventure_number?: number;
  module_number?: number;
}

interface ModuleStartedEvent {
  era_id: number;
  era_name: string;
  adventure_id: number;
  adventure_number: number;
  module_id: number;
  module_number: number;
}

interface ModuleCompletedEvent {
  era_id: number;
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
   * Initialize PostHog instance (call from root component)
   */
  async initialize(posthogInstance: ReturnType<typeof usePostHog>) {
    this.posthog = posthogInstance;

    // Generate or retrieve anonymous ID for tracking users before signup
    await this.initializeAnonymousId();

    console.log('📊 [Analytics] Service initialized');
    console.log('📊 [Analytics] Anonymous ID:', this.anonymousId);
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
      console.log('📊 [Analytics] Generated new anonymous ID:', storedAnonymousId);
    }

    this.anonymousId = storedAnonymousId;
  }

  /**
   * Set current user ID (called automatically on login)
   */
  setUserId(userId: string | null) {
    this.currentUserId = userId;
    console.log('📊 [Analytics] User ID set:', userId);
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
    if (this.anonymousId) {
      this.posthog?.alias(userId, this.anonymousId);
      console.log('📊 [Analytics] Aliased anonymous ID to user ID:', {
        anonymousId: this.anonymousId,
        userId: userId
      });
    }

    const event = {
      ...data,
      ...this.getBaseProperties(),
      user_id: userId, // Override with the new user ID
      // PostHog auto-captures $os (device type)
    };

    this.posthog?.capture('user_signed_up', event);
    console.log('📊 [Analytics] User Signed Up:', event);
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

    this.posthog?.capture('user_session_in', event);
    console.log('📊 [Analytics] User Session In:', event);
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
    console.log('📊 [Analytics] Onboarding Completed:', event);
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
    console.log('📊 [Analytics] Era Selected:', event);
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
    console.log('📊 [Analytics] Permission Requested:', event);
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
    console.log('📊 [Analytics] Onboarding Question Answered:', event);
  }

  /**
   * Track when user exits onboarding screen
   */
  trackOnboardingScreenExited(data: OnboardingScreenExitedEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('onboarding_screen_exited', event);
    console.log('📊 [Analytics] Onboarding Screen Exited:', event);
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
    console.log('📊 [Analytics] Video Progress:', event);
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
    console.log('📊 [Analytics] Auth Screen Viewed:', event);
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
    console.log('📊 [Analytics] Auth Method Selected:', event);
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
    console.log('📊 [Analytics] Auth Succeeded:', event);
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
    console.log('📊 [Analytics] Auth Failed:', event);
  }

  /**
   * Track when user exits auth screen
   */
  trackAuthScreenExited(data: AuthScreenExitedEvent) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('auth_screen_exited', event);
    console.log('📊 [Analytics] Auth Screen Exited:', event);
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
    console.log('📊 [Analytics] First Lesson:', event);
  }

  /**
   * Track lesson started
   */
  trackLessonStarted(data: {
    adventure_id: number | string;
    module_id: number | string;
    lesson_id: string;
    lesson_type: string;
    era_id?: number;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('lesson_started', event);
    console.log('📊 [Analytics] Lesson Started:', event);
  }

  /**
   * Track lesson completed
   */
  trackLessonCompleted(data: {
    adventure_id: number | string;
    module_id: number | string;
    lesson_id: string;
    time_spent_seconds: number;
    era_id?: number;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('lesson_completed', event);
    console.log('📊 [Analytics] Lesson Completed:', event);
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
    era_id?: number;
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
    console.log('📊 [Analytics] Video Played:', event);
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
    era_id?: number;
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
    console.log('📊 [Analytics] Video Paused:', event);
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
    era_id?: number;
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
    console.log('📊 [Analytics] Video Completed:', event);
  }

  /**
   * Track reading card expanded
   */
  trackReadingCardExpanded(data: {
    adventure_id: number | string;
    module_id: number | string;
    lesson_id: string;
    era_id?: number;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('reading_card_expanded', event);
    console.log('📊 [Analytics] Reading Card Expanded:', event);
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
    era_id?: number;
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
    console.log('📊 [Analytics] Video Buffering:', event);
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
    era_id?: number;
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
    console.log('📊 [Analytics] Carousel Image View:', event);
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
    era_id?: number;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('screen_press', event);
    console.log('📊 [Analytics] Screen Press:', event);
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
    console.log('📊 [Analytics] Module Tracking:', event);
  }

  // ==================== QUIZ EVENTS ====================

  /**
   * Track quiz started
   */
  trackQuizStarted(data: {
    adventure_id: number | string;
    module_id: number | string;
    total_questions: number;
    era_id?: number;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
    quiz_id?: string;
    quiz_title?: string;
    $current_url?: string;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('quiz_started', event);
    console.log('📊 [Analytics] Quiz Started:', event);
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
    era_id?: number;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
    quiz_id?: string;
    $current_url?: string;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
      // Dynamic property naming for filtering (e.g., q1_answer, q2_answer)
      ...(data.user_answer ? { [`q${data.question_number}_answer`]: data.user_answer } : {}),
      [`q${data.question_number}_correct`]: data.is_correct,
    };

    this.posthog?.capture('quiz_question_answered', event);
    console.log('📊 [Analytics] Quiz Question Answered:', event);
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
    era_id?: number;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
    quiz_id?: string;
    quiz_title?: string;
    $current_url?: string;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('quiz_completed', event);
    console.log('📊 [Analytics] Quiz Completed:', event);
  }

  /**
   * Track quiz retake
   */
  trackQuizRetake(data: {
    adventure_id: number | string;
    module_id: number | string;
    previous_score: number;
    era_id?: number;
    era_name?: string;
    adventure_number?: number;
    module_number?: number;
    quiz_id?: string;
    $current_url?: string;
  }) {
    const event = {
      ...data,
      ...this.getBaseProperties(),
    };

    this.posthog?.capture('quiz_retake', event);
    console.log('📊 [Analytics] Quiz Retake:', event);
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
      era_number: context?.eraNumber,
      adventure_number: context?.adventureNumber,
      module_number: context?.moduleNumber,
      session_duration_seconds: sessionDuration,
    };

    this.posthog?.capture('drop_off', event);
    console.log('📊 [Analytics] Drop Off:', event);
  }

  // ==================== PAGE VIEW TRACKING ====================

  /**
   * Start tracking page view (call on screen focus)
   * @param pageName - Human-readable page name
   * @param screenUrl - Screen URL path for PostHog activity view (e.g., '/(tabs)/', '/(tabs)/profile')
   */
  startPageView(pageName: 'profile' | 'subscription' | 'era' | 'home', screenUrl: string) {
    this.pageStartTimes.set(pageName, Date.now());
    this.pageClicks.set(pageName, 0);
    this.pageUrls.set(pageName, screenUrl);
    console.log(`📊 [Analytics] Started tracking ${pageName} page (${screenUrl})`);
  }

  /**
   * Track page click
   */
  trackPageClick(pageName: 'profile' | 'subscription' | 'era' | 'home') {
    const currentClicks = this.pageClicks.get(pageName) || 0;
    this.pageClicks.set(pageName, currentClicks + 1);
  }

  /**
   * End tracking page view (call on screen blur)
   */
  endPageView(pageName: 'profile' | 'subscription' | 'era' | 'home') {
    const startTime = this.pageStartTimes.get(pageName);
    if (!startTime) {
      console.warn(`⚠️ [Analytics] No start time for ${pageName} page`);
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
    console.log(`📊 [Analytics] ${pageName} Page View:`, event);

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
    console.log('📊 [Analytics] Notification Sent:', event);
  }

  /**
   * Track notification clicked
   */
  trackNotificationClicked(messageId: string) {
    if (!this.posthog) {
      if (__DEV__) {
        console.log('📊 [Analytics] Skipping event (PostHog not ready): notification_clicked');
      }
      return;
    }

    const event = {
      ...this.getBaseProperties(),
      message_id: messageId,
    };

    this.posthog.capture('notification_clicked', event);
    console.log('📊 [Analytics] Notification Clicked:', event);
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
    console.log('📊 [Analytics] Subscription:', event);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Track custom event (for anything not covered above)
   */
  trackCustomEvent(eventName: string, properties: Record<string, any>) {
    if (!this.posthog) {
      if (__DEV__) {
        console.log(`📊 [Analytics] Skipping event (PostHog not ready): ${eventName}`);
      }
      return;
    }

    this.posthog.capture(eventName, properties);
    // PostHog auto-captures $timestamp on every event
    console.log(`📊 [Analytics] Custom Event (${eventName}):`, properties);
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
   * Track module started (Umayyad only)
   */
  trackModuleStarted(properties: ModuleStartedEvent) {
    // Only track for Umayyad (era_id = 1)
    if (properties.era_id === 1) {
      this.trackCustomEvent('module_started', properties);
    }
  }

  /**
   * Track module completed (Umayyad only)
   */
  trackModuleCompleted(properties: ModuleCompletedEvent) {
    // Only track for Umayyad (era_id = 1)
    if (properties.era_id === 1) {
      this.trackCustomEvent('module_completed', properties);
    }
  }

  // ==================== END NEW TRACKING EVENTS ====================

  /**
   * Identify user (call after login)
   */
  identifyUser(userId: string, properties?: Record<string, any>) {
    if (!this.posthog) {
      if (__DEV__) {
        console.log('📊 [Analytics] Skipping identify (PostHog not ready)');
      }
      return;
    }

    this.setUserId(userId);

    // Sanitize properties to ensure consistent types (remove null/undefined)
    const sanitizedProperties = properties ?
      Object.fromEntries(
        Object.entries(properties).filter(([_, value]) => value != null)
      ) : {};

    this.posthog.identify(userId, sanitizedProperties);
    console.log('📊 [Analytics] User Identified:', userId, sanitizedProperties);
  }

  /**
   * Set user properties (adds Clerk user ID as property without changing PostHog ID)
   */
  setUserProperties(clerkUserId: string, properties?: Record<string, any>) {
    if (!this.posthog) {
      if (__DEV__) {
        console.log('📊 [Analytics] Skipping setUserProperties (PostHog not ready)');
      }
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
    console.log('📊 [Analytics] User Properties Set:', allProperties);
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
    // Note: We keep anonymousId - it persists across sessions
    console.log('📊 [Analytics] Reset (anonymous ID preserved)');
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
