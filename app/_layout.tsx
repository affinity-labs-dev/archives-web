import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, Platform, Linking, AppState, AppStateStatus } from "react-native";
import React from "react";
import "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { PostHogProvider } from 'posthog-react-native';

import { useColorScheme } from "@/hooks/useColorScheme";
import { AdventuresContentProvider } from "@/context/AdventuresContentProvider";
import { PreferencesProvider } from "@/context/PreferencesContext";
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { analyticsService } from "@/services/AnalyticsService";
import '@/services/GlobalHapticsWrapper'; // Patch haptics globally
import { usePostHog } from 'posthog-react-native';
import LoadingScreen from "@/components/LoadingScreen";
import * as Sentry from '@sentry/react-native';
import CustomerIOService from '@/services/CustomerIOService';

// Gamification imports - unified from @/gamification
import {
  GamifiedProgressProvider,
  GamificationOrchestratorProvider,
  RewardsProvider,
  AIProvider,
} from "@/gamification";
import AIAssistant from "@/gamification/ui/ai/AIAssistant";

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

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Note: Foreground notification display is handled by Customer.io's
// showPushAppInForeground: true setting in app.json

/**
 * Handle deep links from push notification taps
 * Supports: archives:// scheme, https://link.archiveszone.app, and direct paths
 */
const handleNotificationDeepLink = (response: Notifications.NotificationResponse) => {
  try {
    const data = response.notification.request.content.data;
    console.log('🔔 [DeepLink] Notification data:', data);

    // Customer.io deep link can be in 'link', 'url', or 'deep_link' field
    const deepLink = data?.link || data?.url || data?.deep_link;

    if (deepLink && typeof deepLink === 'string') {
      console.log('🔗 [DeepLink] Found:', deepLink);

      // Handle different URL formats
      if (deepLink.startsWith('archives://')) {
        // Custom scheme - extract path and navigate
        const path = deepLink.replace('archives://', '/');
        console.log('🔗 [DeepLink] Custom scheme path:', path);
        router.push(path as any);
      } else if (deepLink.startsWith('https://link.archiveszone.app')) {
        // Universal link - extract path
        try {
          const url = new URL(deepLink);
          const path = url.pathname;
          console.log('🔗 [DeepLink] Universal link path:', path);
          if (path && path !== '/') {
            router.push(path as any);
          }
        } catch {
          console.error('🔗 [DeepLink] Invalid URL:', deepLink);
        }
      } else if (deepLink.startsWith('/')) {
        // Direct path - navigate directly
        console.log('🔗 [DeepLink] Direct path:', deepLink);
        router.push(deepLink as any);
      } else {
        // External URL - open in browser
        console.log('🔗 [DeepLink] Opening external URL:', deepLink);
        Linking.openURL(deepLink);
      }
    }
  } catch (error) {
    console.error('❌ [DeepLink] Error handling:', error);
  }
};

// Prevent native splash screen from auto-hiding (GLOBAL SCOPE - must be called before component renders)
SplashScreen.preventAutoHideAsync();

// Configure splash screen fade animation
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

// Analytics initialization wrapper that must be inside PostHogProvider
function AnalyticsWrapper({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog();
  const { user, isSignedIn } = useUser();

  // Track if user was previously signed in (to detect actual sign-out vs fresh install)
  const wasSignedInRef = React.useRef(false);

  // Customer.io SDK auto-initializes from app.json config
  // No manual initialization needed - the Expo plugin handles it

  // Identify user to Customer.io when signed in (independent of PostHog)
  React.useEffect(() => {
    console.log('🔍 [AnalyticsWrapper DEBUG] CustomerIO identify useEffect, isSignedIn:', isSignedIn, 'user:', !!user);

    if (isSignedIn && user) {
      console.log('🔍 [AnalyticsWrapper DEBUG] Calling CustomerIOService.identify()...');
      CustomerIOService.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        first_name: user.firstName,
        last_name: user.lastName,
        last_sign_in: user.lastSignInAt ? Math.floor(new Date(user.lastSignInAt).getTime() / 1000) : undefined,
        created_at: user.createdAt ? Math.floor(new Date(user.createdAt).getTime() / 1000) : undefined,
        device_type: Platform.OS,
      });
      console.log('🔍 [AnalyticsWrapper DEBUG] CustomerIOService.identify() returned');
    } else {
      // Clear Customer.io identity when signed out
      CustomerIOService.clearIdentify();
    }
  }, [isSignedIn, user]);

  // Sync push token on sign-in for users who already granted permission
  // This ensures Customer.io always has the latest APNs/FCM token
  // Also prompts for notification permission if never asked (e.g., existing users after app update)
  // Session tracking - track sign-in/sign-out for analytics
  React.useEffect(() => {
    // Skip on web during SSR
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }

    if (isSignedIn && user) {
      console.log('🔑 [AnalyticsWrapper] User signed in, tracking session');
      analyticsService.trackUserSessionIn('email');
      wasSignedInRef.current = true;

      // Check push notification permission and prompt if never asked
      // This catches existing users who update the app and never went through Q3 onboarding
      ;(async () => {
        try {
          const { status } = await Notifications.getPermissionsAsync();
          console.log('🔔 [AnalyticsWrapper] Push permission status:', status);

          if (status === 'undetermined') {
            // Never asked — show Customer.io permission prompt
            console.log('🔔 [AnalyticsWrapper] Permission never asked, showing prompt...');
            try {
              const { CustomerIO, CioPushPermissionStatus } = require('customerio-reactnative');
              const result = await CustomerIO.pushMessaging.showPromptForPushNotifications({
                ios: { sound: true, badge: true },
              });

              const granted = result === CioPushPermissionStatus.Granted;
              console.log('🔔 [AnalyticsWrapper] Permission result:', granted ? 'GRANTED' : 'DENIED');

              // Sync permission attributes to Customer.io profile
              CustomerIOService.setProfileAttributes({
                push_notifications_enabled: granted,
                push_permission_status: granted ? 'Granted' : 'Denied',
                push_permission_updated_at: Math.floor(Date.now() / 1000),
              });

              // Sync to PostHog
              analyticsService.updatePushStatus(granted, granted ? 'Granted' : 'Denied');

              // If granted, register device token in background
              if (granted) {
                setTimeout(async () => {
                  try {
                    const pushToken = await Notifications.getDevicePushTokenAsync();
                    if (pushToken?.data) {
                      CustomerIO.registerDeviceToken(pushToken.data);
                      CustomerIOService.setProfileAttributes({
                        cio_push_token: pushToken.data,
                      });
                      console.log('🔔 [AnalyticsWrapper] Device token registered after sign-in prompt');
                    }
                  } catch (tokenErr) {
                    console.log('🔔 [AnalyticsWrapper] Token registration error:', tokenErr);
                  }
                }, 1500);
              }
            } catch (sdkErr) {
              console.log('🔔 [AnalyticsWrapper] Customer.io SDK not available:', sdkErr);
            }
          } else if (status === 'granted') {
            // Already granted — sync token to Customer.io (might have changed)
            try {
              const pushToken = await Notifications.getDevicePushTokenAsync();
              if (pushToken?.data) {
                CustomerIOService.registerPushToken(pushToken.data);
                CustomerIOService.setProfileAttributes({
                  push_notifications_enabled: true,
                  push_permission_status: 'Granted',
                  cio_push_token: pushToken.data,
                });
                console.log('🔔 [AnalyticsWrapper] Push token synced on sign-in');
              }
            } catch (tokenErr) {
              console.log('🔔 [AnalyticsWrapper] Token sync error:', tokenErr);
            }
          }
        } catch (err) {
          console.log('🔔 [AnalyticsWrapper] Permission check error:', err);
        }
      })();
    } else if (!isSignedIn && wasSignedInRef.current) {
      // Only reset analytics if user was PREVIOUSLY signed in (actual sign-out)
      console.log('👋 [AnalyticsWrapper] User signed out, resetting analytics');
      analyticsService.reset();
      wasSignedInRef.current = false;
    }
  }, [isSignedIn, user]);

  // Update last_active_at on initial app launch
  React.useEffect(() => {
    analyticsService.updateLastActiveAt();
  }, []);

  // Monitor app state changes for updating last_active_at - Native only
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        analyticsService.updateLastActiveAt();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
    };
  }, []);

  // Initialize PostHog analytics + set user properties when both PostHog and Clerk user are ready
  React.useEffect(() => {
    console.log('🔍 [AnalyticsWrapper DEBUG] PostHog useEffect running, posthog:', !!posthog, 'isSignedIn:', isSignedIn);

    if (posthog) {
      console.log('🔍 [AnalyticsWrapper DEBUG] PostHog available, initializing analytics...');
      analyticsService.initialize(posthog);
      // Note: Session replay starts automatically via enableSessionReplay: true config

      // Identify user if signed in - this merges all anonymous events to the authenticated user
      if (isSignedIn && user) {
        console.log('🔍 [AnalyticsWrapper DEBUG] User signed in:', user.id);
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
            console.error('❌ [Analytics] Error initializing person properties:', error);
            // Don't block app - this is non-critical
          }
        };
        initPersonProperties();
      } else {
        // Clear Sentry user when signed out
        Sentry.setUser(null);
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

      // Check if this push came from Customer.io
      const data = response.notification.request.content.data as Record<string, any> | undefined;
      const isCioPush = data?.CIO?.push;

      if (isCioPush) {
        // Let Customer.io SDK handle deep links for its own pushes
        console.log('🔗 [DeepLink] CIO push — SDK handles deep link');
        return;
      }

      // Only handle deep links for non-CIO pushes (e.g., local notifications)
      handleNotificationDeepLink(response);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
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
            <AnalyticsWrapper>
              <GamificationWrapper>
                  <AdventuresContentProvider>
                    <RewardsProvider>
                      <GamifiedProgressProvider>
                        <PreferencesProvider>
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
                        </PreferencesProvider>
                    </GamifiedProgressProvider>
                </RewardsProvider>
              </AdventuresContentProvider>
          </GamificationWrapper>
          </AnalyticsWrapper>
          </ClerkProvider>
        </PostHogProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
});