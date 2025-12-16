import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, Platform, Linking } from "react-native";
import React from "react";
import "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { PostHogProvider } from 'posthog-react-native';

import { useColorScheme } from "@/hooks/useColorScheme";
import { ProgressProvider } from "@/context/ProgressContext";
import { BackgroundSyncProvider } from "@/context/BackgroundSyncProvider";
import { AdventuresContentProvider } from "@/context/AdventuresContentProvider";
import { RewardsProvider, useRewards } from "@/context/RewardsContext";
import { AIProvider } from "@/context/AIContext";
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { analyticsService } from "@/services/AnalyticsService";
import { usePostHog } from 'posthog-react-native';
import AvatarUnlockAnimation from "@/components/AvatarUnlockAnimation";
import AvatarUnlockNotification from "@/components/AvatarUnlockNotification";
import LoadingScreen from "@/components/LoadingScreen";
import AIAssistant from "@/components/ai/AIAssistant";
import * as Sentry from '@sentry/react-native';
import CustomerIOService from '@/services/CustomerIOService';

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

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

  // Initialize analytics service + set user properties when both PostHog and Clerk user are ready
  React.useEffect(() => {
    if (posthog) {
      analyticsService.initialize(posthog);
      // Note: Session replay starts automatically via enableSessionReplay: true config

      // Identify user if signed in - this merges all anonymous events to the authenticated user
      if (isSignedIn && user) {
        analyticsService.identifyUser(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
        });

        // Identify user to Customer.io for push notifications
        CustomerIOService.identify(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          first_name: user.firstName,
          last_name: user.lastName,
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
        // Clear Customer.io identity when signed out
        CustomerIOService.clearIdentify();
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

      // Handle deep links from Customer.io push notifications
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
        $exception_stack_trace_raw: error.stack,
        $exception_is_fatal: isFatal,
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

// Avatar unlock animation wrapper that must be inside RewardsProvider
function AvatarAnimationWrapper({ children }: { children: React.ReactNode }) {
  const { newlyUnlockedItem, clearNewlyUnlockedItem } = useRewards();
  const [showNotification, setShowNotification] = React.useState(false);
  const [notificationAvatar, setNotificationAvatar] = React.useState<{ image: any; name: string } | null>(null);

  // Only show animations for avatars (not badges)
  const newlyUnlockedAvatar = newlyUnlockedItem?.type === 'avatar' ? newlyUnlockedItem : null;

  // Helper to get avatar image - static mapping for require()
  const AVATAR_IMAGE_MAP: Record<string, any> = {
    'avatars/Al-Khwarizmi.png': require('@/assets/images/avatars/Al-Khwarizmi.png'),
    'avatars/Fatima-al-Fihri.png': require('@/assets/images/avatars/Fatima-al-Fihri.png'),
    'avatars/ibn-sina-avicenna.png': require('@/assets/images/avatars/Ibn-Sina-Avicenna.png'),
    'avatars/Ziryab.png': require('@/assets/images/avatars/Ziryab.png'),
    'avatars/Al-Razi.png': require('@/assets/images/avatars/Al-Razi.png'),
    'avatars/Ibn-Battuta.png': require('@/assets/images/avatars/Ibn-Battuta.png'),
    'avatars/Lubna-of-Cordoba.png': require('@/assets/images/avatars/Lubna-of-Cordoba.png'),
    'avatars/Mariam-al-Asturlabi.png': require('@/assets/images/avatars/Mariam-al-Asturlabi.png'),
    'avatars/Zaynab-al-Shahda.png': require('@/assets/images/avatars/Zaynab-al-Shahda.png'),
  };

  const getAvatarImage = (imageUrl: string) => {
    return AVATAR_IMAGE_MAP[imageUrl] || AVATAR_IMAGE_MAP['avatars/Al-Khwarizmi.png'];
  };

  // TODO: Confetti disabled for now
  // Trigger confetti when avatar is unlocked
  // React.useEffect(() => {
  //   if (newlyUnlockedAvatar) {
  //     setShowConfetti(true);
  //   }
  // }, [newlyUnlockedAvatar]);

  // When animation completes, show notification
  const handleAnimationComplete = () => {
    if (newlyUnlockedAvatar) {
      setNotificationAvatar({
        image: getAvatarImage(newlyUnlockedAvatar.image_url),
        name: newlyUnlockedAvatar.display_text,
      });
      setShowNotification(true);
    }
    clearNewlyUnlockedItem();
  };

  // When notification completes, clear everything
  const handleNotificationComplete = () => {
    setShowNotification(false);
    setNotificationAvatar(null);
  };

  return (
    <>
      {children}
      {newlyUnlockedAvatar && (
        <AvatarUnlockAnimation
          visible={true}
          avatarImage={getAvatarImage(newlyUnlockedAvatar.image_url)}
          avatarName={newlyUnlockedAvatar.display_text}
          onComplete={handleAnimationComplete}
        />
      )}
      {showNotification && notificationAvatar && (
        <AvatarUnlockNotification
          visible={true}
          avatarImage={notificationAvatar.image}
          avatarName={notificationAvatar.name}
          onComplete={handleNotificationComplete}
        />
      )}
    </>
  );
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
      // Initialize Customer.io SDK
      CustomerIOService.initialize();
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
              <BackgroundSyncProvider>
                <AdventuresContentProvider>
                  <RewardsProvider>
                    <ProgressProvider>
                      <AIProvider>
                        <AvatarAnimationWrapper>
                          <ThemeProvider value={colorScheme === "dark" ? CustomDarkTheme : CustomTheme}>
                            <Stack>
                              <Stack.Screen name="index" options={{ headerShown: false }} />
                              <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                              <Stack.Screen name="+not-found" />
                            </Stack>
                            <AIAssistant />
                            <StatusBar style="auto" />
                          </ThemeProvider>
                        </AvatarAnimationWrapper>
                      </AIProvider>
                    </ProgressProvider>
                </RewardsProvider>
              </AdventuresContentProvider>
            </BackgroundSyncProvider>
          </AnalyticsWrapper>
          </ClerkProvider>
        </PostHogProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
});