import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, Linking, AppState, AppStateStatus } from "react-native";
import React from "react";
import "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider, ClerkLoaded, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@/services/ClerkTokenCache";
import { PostHogProvider, usePostHog } from 'posthog-react-native';

import { useColorScheme } from "@/hooks/useColorScheme";
import { AdventuresContentProvider } from "@/context/AdventuresContentProvider";
import { PreferencesProvider } from "@/context/PreferencesContext";
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { analyticsService, type LoginMethod } from "@/services/AnalyticsService";
import '@/services/GlobalHapticsWrapper'; // Patch haptics globally
import LoadingScreen from "@/components/LoadingScreen";
import * as Sentry from '@sentry/react-native';
import AffinityNotificationService from '@/services/AffinityNotificationService';
import PushNotificationService from '@/services/PushNotificationService';
import NotificationBadgeService from '@/services/NotificationBadgeService';
import { useOTAUpdates } from '@/hooks/useOTAUpdates';
import AppLogger from '@/services/AppLogger';
import Purchases from 'react-native-purchases';

// Gamification imports - unified from @/gamification
import {
  GamifiedProgressProvider,
  GamificationOrchestratorProvider,
  RewardsProvider,
  AIProvider,
  NotificationPromptProvider,
} from "@/gamification";
import AIAssistant from "@/gamification/ui/ai/AIAssistant";

// Font scaling disabled globally via Babel plugin (plugins/babel-plugin-font-scaling.js) (AFF-331)

Sentry.init({
  dsn: 'https://87a73fd4ec7ba02d87dccedcce85a9fa@o4510499177889792.ingest.de.sentry.io/4510499179790416',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable performance tracing - captures 100% of transactions
  // Reduce in production to lower costs (e.g., 0.2 for 20%)
  tracesSampleRate: 1.0,

  // Enable Logs
  enableLogs: true,

  // Session Replay enabled at low sample rate — previously disabled due to
  // EXC_BAD_ACCESS crash (Sentry VC introspection vs expo-video Swift event race).
  // Re-enabled at 10% after Sentry SDK update; monitor for crashes.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 0.5,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Note: Foreground notification display is handled by Notifications.setNotificationHandler below.

/**
 * Handle deep links from push notification taps
 * Supports: archives:// scheme, https://link.archiveszone.app, and direct paths
 */
const handleNotificationDeepLink = (response: Notifications.NotificationResponse) => {
  try {
    const data = response.notification.request.content.data;
    AppLogger.info('deeplink', 'Processing notification deep link', { data: data as Record<string, unknown> });

    // Deep link can be in 'link', 'url', or 'deep_link' field of the data payload
    const deepLink = data?.link || data?.url || data?.deep_link;

    if (deepLink && typeof deepLink === 'string') {
      // Handle different URL formats
      if (deepLink.startsWith('archives://')) {
        const path = deepLink.replace('archives://', '/');
        AppLogger.info('deeplink', 'Navigating via custom scheme', { deepLink, path });
        router.push(path as any);
      } else if (deepLink.startsWith('https://link.archiveszone.app')) {
        try {
          const url = new URL(deepLink);
          const path = url.pathname;
          AppLogger.info('deeplink', 'Navigating via universal link', { deepLink, path });
          if (path && path !== '/') {
            router.push(path as any);
          }
        } catch {
          AppLogger.error('deeplink', 'Invalid universal link URL', { deepLink });
        }
      } else if (deepLink.startsWith('/')) {
        AppLogger.info('deeplink', 'Navigating via direct path', { deepLink });
        router.push(deepLink as any);
      } else {
        AppLogger.info('deeplink', 'Opening external URL', { deepLink });
        Linking.openURL(deepLink);
      }
    }
  } catch (error) {
    AppLogger.error('deeplink', 'Error handling notification deep link', {}, error);
  }
};

// Prevent native splash screen from auto-hiding (GLOBAL SCOPE - must be called before component renders)
SplashScreen.preventAutoHideAsync();

// Configure splash screen fade animation
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

// Configure foreground notification display (GLOBAL SCOPE).
// Required so expo-notifications shows banners when the app is in foreground.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('🔔 [NotifHandler] handleNotification called:', Platform.OS, JSON.stringify({
      title: notification.request.content.title,
      body: notification.request.content.body,
      data: notification.request.content.data,
    }));
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    };
  },
  handleSuccess: (notificationId) => {
    console.log('🔔 [NotifHandler] SUCCESS - notification presented:', notificationId);
  },
  handleError: (notificationId, error) => {
    console.error('❌ [NotifHandler] ERROR - failed to present:', notificationId, error);
  },
});

// Create Android notification channel at module scope so it exists before any push arrives.
// Must match the channel ID sent in Affinity notification payloads (push_config.android_channel_id).
// NOTE: On Android, once a channel is created, its importance CANNOT be changed programmatically.
// If foreground notifications aren't showing, uninstall & reinstall the app to reset the channel.
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('archives_notifications', {
    name: 'Archives Notifications',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  }).then((channel) => {
    console.log('🔔 [Android] Notification channel created/verified:', JSON.stringify(channel));
  });
}

// Analytics initialization wrapper that must be inside PostHogProvider
function AnalyticsWrapper({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog();
  const { user, isSignedIn } = useUser();

  // Track if user was previously signed in (to detect actual sign-out vs fresh install)
  const wasSignedInRef = React.useRef(false);

  // Guard against concurrent RevenueCat logIn calls (Clerk user object updates multiple times)
  const rcLoginInProgressRef = React.useRef(false);
  const rcLoggedInUserRef = React.useRef<string | null>(null);

  // AFF-151: Track the previous isSignedIn value to detect actual transitions
  // (not user object reference changes from token refreshes)
  const prevSignedInRef = React.useRef<boolean | null>(null);

  // Derive login method from Clerk user object (fixes hardcoded 'email')
  const getLoginMethod = (clerkUser: typeof user): LoginMethod => {
    const accounts = clerkUser?.externalAccounts || [];
    if (accounts.some((a) => a.provider === 'apple')) return 'apple';
    if (accounts.some((a) => a.provider === 'google')) return 'google';
    return 'email';
  };

  // Initialize OTA update checks (foreground check + Sentry tags + PostHog tracking)
  useOTAUpdates();

  // Register user with Affinity Notification Service on sign-in
  React.useEffect(() => {

    if (isSignedIn && user) {
      // Register user with Affinity Notification Service (idempotent upsert)
      AffinityNotificationService.registerUser(user.id, {
        email: user.primaryEmailAddress?.emailAddress ?? null,
        metadata: {
          first_name: user.firstName ?? null,
          last_name: user.lastName ?? null,
        },
      });
    } else {
      AffinityNotificationService.logout();
    }
  }, [isSignedIn, user]);

  // Sync RevenueCat identity with Clerk user (independent of PostHog)
  // Runs for ALL users — free and paid — so every user has real profile data in RevenueCat
  React.useEffect(() => {
    // RevenueCat only works on iOS/Android
    if (Platform.OS === 'web') return;

    const syncRevenueCatIdentity = async () => {
      if (isSignedIn && user) {
        // Skip if already logged in as this user or login is in progress
        if (rcLoggedInUserRef.current === user.id || rcLoginInProgressRef.current) {
          // Still update attributes (email/name may have loaded later)
          Purchases.setAttributes({
            '$email': user.primaryEmailAddress?.emailAddress ?? '',
            '$displayName': [user.firstName, user.lastName].filter(Boolean).join(' '),
            'clerk_id': user.id,
          });
          return;
        }

        rcLoginInProgressRef.current = true;
        try {
          // Log in to RevenueCat with Clerk user ID
          // This merges any anonymous purchases with this identified user
          const { customerInfo } = await Purchases.logIn(user.id);
          rcLoggedInUserRef.current = user.id;
          AppLogger.info('subscription', 'RevenueCat user identified', {
            userId: user.id,
            activeEntitlements: Object.keys(customerInfo.entitlements.active),
          });

          // Set subscriber attributes for ALL users (visible in RevenueCat dashboard)
          Purchases.setAttributes({
            '$email': user.primaryEmailAddress?.emailAddress ?? '',
            '$displayName': [user.firstName, user.lastName].filter(Boolean).join(' '),
            'clerk_id': user.id,
          });

          // Set ATT status as attribute (iOS only)
          if (Platform.OS === 'ios') {
            try {
              const { getTrackingPermissionsAsync } = require('expo-tracking-transparency');
              const { status } = await getTrackingPermissionsAsync();
              Purchases.setAttributes({
                'att_status': status,
              });
              AppLogger.info('subscription', 'RevenueCat ATT status set', { status });
            } catch (attError) {
              AppLogger.warn('subscription', 'Could not get ATT status', { error: String(attError) });
            }
          }

          // Collect device identifiers (IDFA/GAID) for attribution
          Purchases.collectDeviceIdentifiers();

          AppLogger.info('subscription', 'RevenueCat subscriber attributes synced', { userId: user.id });
        } catch (error) {
          AppLogger.error('subscription', 'RevenueCat identity sync failed', { userId: user.id }, error);
        } finally {
          rcLoginInProgressRef.current = false;
        }
      } else if (!isSignedIn && wasSignedInRef.current) {
        // User signed out — reset RevenueCat to anonymous
        rcLoggedInUserRef.current = null;
        try {
          await Purchases.logOut();
          AppLogger.info('subscription', 'RevenueCat user logged out, reset to anonymous');
        } catch {
          // logOut() throws if already anonymous — safe to ignore
          AppLogger.info('subscription', 'RevenueCat logout skipped (already anonymous)');
        }
      }
    };

    syncRevenueCatIdentity();
  }, [isSignedIn, user]);

  // Sync push token on sign-in for users who already granted permission
  // Session tracking - track sign-in/sign-out for analytics
  //
  // AFF-151 fixes:
  // - Depend on isSignedIn only (not user object which changes reference on every re-render)
  // - Use prevSignedInRef to detect actual boolean transitions
  // - Check manualSignOutInProgress flag to prevent duplicate user_session_out events
  React.useEffect(() => {
    // Skip on web during SSR
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }

    const currentSignedIn = !!isSignedIn;

    // AFF-151: Only track auth_state_change on actual boolean transitions
    // (not on every user object reference change from token refreshes)
    if (prevSignedInRef.current !== null && prevSignedInRef.current !== currentSignedIn) {
      const previousState = prevSignedInRef.current ? 'signed_in' : 'signed_out';
      const newState = currentSignedIn ? 'signed_in' : 'signed_out';

      ;(async () => {
        const hadSelectedEra = !!(await AsyncStorage.getItem('selected_era').catch(() => null));
        analyticsService.trackAuthStateChange({
          previous_state: previousState,
          new_state: newState,
          user_id: user?.id ?? null,
          had_selected_era: hadSelectedEra,
          app_state: AppState.currentState,
        });
      })();
    }
    prevSignedInRef.current = currentSignedIn;

    if (currentSignedIn && user) {
      // Only fire session-in on actual sign-in transition (not on re-renders)
      if (!wasSignedInRef.current) {
        AppLogger.info('auth', 'User signed in, tracking session', { userId: user.id, method: getLoginMethod(user) });
        // AFF-151: Login method via externalAccounts may not be populated immediately;
        // default to 'email' and let PostHog person properties update on next render
        analyticsService.trackUserSessionIn(getLoginMethod(user));
        wasSignedInRef.current = true;

        // Sync push token on sign-in — delegates to PushNotificationService which
        // handles permission check, Expo token fetch, and Affinity registration.
        PushNotificationService.syncPushToken();
      }
    } else if (!currentSignedIn && wasSignedInRef.current) {
      // AFF-151: Skip if profile.tsx already fired user_session_out (manual sign-out or account deletion)
      if (analyticsService.manualSignOutInProgress) {
        AppLogger.info('auth', 'Skipping duplicate session-out (manual sign-out handled it)');
        analyticsService.manualSignOutInProgress = false;
      } else {
        // Clerk session expired or was revoked — fire clerk_session_ended
        AppLogger.warn('auth', 'User signed out unexpectedly (Clerk session ended)');
        ;(async () => {
          const hadSelectedEra = !!(await AsyncStorage.getItem('selected_era').catch(() => null));
          analyticsService.trackUserSessionOut({
            trigger: 'clerk_session_ended',
            session_duration_seconds: null,
            had_selected_era: hadSelectedEra,
          });
        })();
      }
      analyticsService.reset();
      wasSignedInRef.current = false;
    }
  }, [isSignedIn]);

  // Update last_active_at on initial app launch
  React.useEffect(() => {
    analyticsService.updateLastActiveAt();
    NotificationBadgeService.clearBadge(); // Clear any stale badge on fresh launch
  }, []);

  // Monitor app state changes for updating last_active_at - Native only
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        analyticsService.updateLastActiveAt();
        NotificationBadgeService.clearBadge(); // Clear red dot when app opens
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
    };
  }, []);

  // Initialize PostHog analytics + set user properties when both PostHog and Clerk user are ready
  React.useEffect(() => {
    AppLogger.info('startup', 'PostHog init check', { posthogReady: !!posthog, isSignedIn: !!isSignedIn });

    if (posthog) {
      analyticsService.initialize(posthog);

      // Note: Session replay starts automatically via enableSessionReplay: true config

      // Identify user if signed in - this merges all anonymous events to the authenticated user
      if (isSignedIn && user) {
        AppLogger.info('auth', 'Identifying user in PostHog + Sentry', { userId: user.id });
        analyticsService.identifyUser(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
        });

        // Set Sentry user for crash reporting - links crashes to specific users
        Sentry.setUser({
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress || undefined,
          username: user.username || undefined,
        });

        // Set app_state context so every Sentry error includes session info
        AppLogger.setContext('app_state', {
          isSignedIn: true,
          userId: user.id,
          loginMethod: getLoginMethod(user),
        });

        // Initialize all 17 person properties with null (only once per user)
        // This establishes the property schema in PostHog for cohort analysis
        const initPersonProperties = async () => {
          try {
            const initKey = `posthog_props_init_${user.id}`;
            const alreadyInitialized = await AsyncStorage.getItem(initKey);

            if (!alreadyInitialized) {
              analyticsService.initializePersonProperties();
              await AsyncStorage.setItem(initKey, 'true');
            }
          } catch (error) {
            AppLogger.error('startup', 'Error initializing person properties', {}, error);
            // Don't block app - this is non-critical
          }
        };
        initPersonProperties();
      } else {
        // Clear Sentry user when signed out
        Sentry.setUser(null);
        AppLogger.setContext('app_state', { isSignedIn: false });
      }
    }
  }, [posthog, isSignedIn, user]);

  // App lifecycle tracking is now handled by PostHog autocapture
  // (captureAppLifecycleEvents: true in PostHog configuration)
  // PostHog automatically captures:
  // - Application Opened
  // - Application Became Active
  // - Application Backgrounded
  // - Application Installed
  // - Application Updated

  // Listen for notifications (both received and tapped) with deep link support
  // Also listen for push token changes — FCM/APNs can rotate tokens at any time
  React.useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      const messageId = notification.request.identifier || `notif_${Date.now()}`;
      analyticsService.trackCustomEvent('notification_received', {
        message_id: messageId,
        title: notification.request.content.title,
        app_state: 'foreground',
      });
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const messageId = response.notification.request.identifier || `notif_${Date.now()}`;
      analyticsService.trackNotificationClicked(messageId);

      // Handle deep links for all push notifications (Affinity / Expo gateway)
      handleNotificationDeepLink(response);
    });

    // Update push token when rotated by FCM/APNs — device already exists,
    // just patch the token via device_identifier lookup.
    const pushTokenListener = Notifications.addPushTokenListener(({ data: newToken }) => {
      if (AffinityNotificationService.getLastRegisteredToken() === newToken) return;
      AppLogger.info('notification', 'Push token changed — updating device with Affinity');
      AffinityNotificationService.updateDevice({ push_token: newToken });
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
      pushTokenListener.remove();
    };
  }, []);

  // PostHog $exception capture - backup to Sentry for crash tracking
  React.useEffect(() => {
    if (!posthog) return;

    // Capture unhandled JS errors
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      posthog.capture('$exception', {
        $exception_message: error.message,
        $exception_type: error.name,
        $exception_stack_trace_raw: error.stack ?? '',
        $exception_is_fatal: isFatal ?? false,
        $exception_source: 'global_error_handler',
      });

      // Call original handler (Sentry also hooks into this)
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });

    // Capture unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      posthog.capture('$exception', {
        $exception_message: error?.message || String(error),
        $exception_type: error?.name || 'UnhandledPromiseRejection',
        $exception_stack_trace_raw: error?.stack,
        $exception_is_fatal: false,
        $exception_source: 'promise_rejection',
      });
    };

    // @ts-ignore - React Native global
    if (global.HermesInternal) {
      // Hermes engine
      global.addEventListener?.('unhandledrejection', rejectionHandler);
    }

    return () => {
      ErrorUtils.setGlobalHandler(originalHandler);
      // @ts-ignore
      global.removeEventListener?.('unhandledrejection', rejectionHandler);
    };
  }, [posthog]);

  // Notification prompting moved to NotificationPromptProvider (AFF-117)
  // Permission request + token registration now handled via celebration queue

  return <>{children}</>;
}

// Gamification wrapper - GamifiedProgressProvider handles all initialization internally
function GamificationWrapper({ children }: { children: React.ReactNode }) {
  // Note: Orchestrator initialization moved to GamifiedProgressProvider
  // This wrapper is kept for potential future use
  return <>{children}</>;
}

export default Sentry.wrap(function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    "DM Sans": require("../assets/fonts/DM_Sans.ttf"),
    "DM-Sans-SemiBold": require("../assets/fonts/DM_Sans-SemiBold.ttf"),
    "DM-Sans-Bold": require("../assets/fonts/DM_Sans-Bold.ttf"),
    "DMSans-Bold": require("../assets/fonts/DM_Sans-Bold.ttf"),
    "DM Sans Bold": require("../assets/fonts/DM_Sans-Bold.ttf"),
    "Cormorant": require("../assets/fonts/Cormorant.ttf"),
    "Cormorant-Bold": require("../assets/fonts/Cormorant-Bold.ttf"),
  });

  // Hide splash screen when fonts are loaded
  React.useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Set Android navigation bar color to match app background
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync('#F4EBDB');
    }
  }, []);

  // Clean up test/debug data on app launch (only in DEV mode)
  React.useEffect(() => {
    const cleanupTestData = async () => {
      if (!__DEV__) return; // Only clean in development mode

      try {
        // Remove fake XP modules (adventureId 999)
        const progress = await AsyncStorage.getItem('new_user_progress');
        if (progress) {
          const parsed = JSON.parse(progress);
          const cleaned = parsed.filter((m: any) => m.adventureId !== 999);
          if (cleaned.length !== parsed.length) {
            await AsyncStorage.setItem('new_user_progress', JSON.stringify(cleaned));
            console.log('✅ [Startup] Cleaned test XP modules');
          }
        }

        // Clear XP cache to force recalculation
        await AsyncStorage.removeItem('totalXP');

        // Reset level tracking to trigger fresh calculation
        await AsyncStorage.removeItem('last_user_level');

        // Check if streak was manually set via debug panel
        const streakData = await AsyncStorage.getItem('daily_streak');
        const lastActive = await AsyncStorage.getItem('last_active_date');

        // If last active date is today (meaning it was just set via debug), reset it
        const today = new Date().toDateString();
        if (lastActive === today && streakData) {
          await AsyncStorage.removeItem('daily_streak');
          await AsyncStorage.removeItem('last_active_date');
          console.log('✅ [Startup] Reset debug streak data');
        }

        console.log('✅ [Startup] Test data cleanup complete');
      } catch (error) {
        console.error('❌ [Startup] Error cleaning test data:', error);
      }
    };

    cleanupTestData();
  }, []);

  if (!loaded) {
    // Show branded loading screen while fonts load
    return <LoadingScreen />;
  }

  // Custom theme with brand background color for Android
  const CustomTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: Platform.OS === 'android' ? '#F4EBDB' : DefaultTheme.colors.background,
    }
  };

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: Platform.OS === 'android' ? '#F4EBDB' : DarkTheme.colors.background,
    }
  };

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
  const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY!;
  const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST!;

  // Create PostHog options with platform-specific configuration
  const posthogOptions = {
    host: posthogHost,
    // Enable autocapture for automatic event tracking
    autocapture: {
      captureAppLifecycleEvents: true,  // Auto-track app open/foreground/background
      captureTouches: false,             // Disable touch tracking (too noisy for educational app)
      captureScreens: false,             // React Navigation v7 requires manual screen tracking
    },
    // Enable session recording for mobile (disabled on web to prevent compatibility issues)
    enableSessionReplay: Platform.OS !== 'web',
    ...(Platform.OS !== 'web' && {
      sessionReplayConfig: {
        // Mask text inputs to protect user privacy (quiz answers, personal info)
        maskAllTextInputs: true,
        // Keep images visible since educational content is important to analyze
        maskAllImages: false,
        // Enable masking of system views for privacy (iOS only)
        maskAllSandboxedViews: true,
        // Capture logs for debugging (Android only)
        captureLog: Platform.OS === 'android',
        // Capture network telemetry for performance insights (iOS only)
        captureNetworkTelemetry: Platform.OS === 'ios',
        // Throttle delay to reduce snapshots and improve performance (unified property for both platforms)
        throttleDelayMs: 1000,
        // IMPORTANT: Automatically start recording on app launch (captures from beginning)
        screenshot: true, // Enable screenshots for better replay quality
      },
    }),
  };

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{
        flex: 1,
        backgroundColor: Platform.OS === 'android' ? '#F4EBDB' : undefined
      }}>
        <PostHogProvider apiKey={posthogApiKey} options={posthogOptions}>
          <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <ClerkLoaded>
              <AnalyticsWrapper>
                <GamificationWrapper>
                  <AdventuresContentProvider>
                    <RewardsProvider>
                      <GamifiedProgressProvider>
                        <PreferencesProvider>
                          <NotificationPromptProvider>
                            <GamificationOrchestratorProvider>
                              <AIProvider>
                                <ThemeProvider value={colorScheme === "dark" ? CustomDarkTheme : CustomTheme}>
                                <Stack screenOptions={{
                                  gestureEnabled: false,
                                  animation: 'none',
                                  fullScreenGestureEnabled: false
                                }}>
                                  <Stack.Screen name="index" options={{ headerShown: false }} />
                                  <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                                  <Stack.Screen name="+not-found" />
                                </Stack>
                                <AIAssistant />
                                <StatusBar style="auto" />
                                </ThemeProvider>
                              </AIProvider>
                            </GamificationOrchestratorProvider>
                          </NotificationPromptProvider>
                        </PreferencesProvider>
                      </GamifiedProgressProvider>
                    </RewardsProvider>
                  </AdventuresContentProvider>
                </GamificationWrapper>
              </AnalyticsWrapper>
            </ClerkLoaded>
          </ClerkProvider>
        </PostHogProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
});