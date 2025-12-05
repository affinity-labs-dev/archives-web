import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, Platform } from "react-native";
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
import { PreferencesProvider } from "@/context/PreferencesContext";
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { analyticsService } from "@/services/AnalyticsService";
import { usePostHog } from 'posthog-react-native';
import AvatarUnlockAnimation from "@/components/AvatarUnlockAnimation";
import AvatarUnlockNotification from "@/components/AvatarUnlockNotification";
import ConfettiEffect from "@/components/ConfettiEffect";
import LoadingScreen from "@/components/LoadingScreen";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
    // Production logging - Track initialization timing for debugging
    console.log('🔍 [Analytics] Effect triggered - PostHog ready:', !!posthog);
    console.log('🔍 [Analytics] Effect triggered - User signed in:', isSignedIn);
    console.log('🔍 [Analytics] Effect triggered - User ID:', user?.id || 'none');

    if (posthog) {
      analyticsService.initialize(posthog);
      console.log('✅ [Analytics] Service initialized with PostHog instance');
      // Note: Session replay starts automatically via enableSessionReplay: true config

      // Identify user if signed in - this merges all anonymous events to the authenticated user
      if (isSignedIn && user) {
        analyticsService.identifyUser(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
        });
        console.log('✅ [Analytics] User IDENTIFIED for Clerk ID:', user.id);
        console.log('✅ [Analytics] Email:', user.primaryEmailAddress?.emailAddress);

        // Initialize all 17 person properties with null (only once per user)
        // This establishes the property schema in PostHog for cohort analysis
        const initPersonProperties = async () => {
          try {
            const initKey = `posthog_props_init_${user.id}`;
            const alreadyInitialized = await AsyncStorage.getItem(initKey);

            if (!alreadyInitialized) {
              analyticsService.initializePersonProperties();
              await AsyncStorage.setItem(initKey, 'true');
              console.log('✅ [Analytics] Person properties initialized for user:', user.id);
            } else {
              console.log('ℹ️ [Analytics] Person properties already initialized for user:', user.id);
            }
          } catch (error) {
            console.error('❌ [Analytics] Error initializing person properties:', error);
            // Don't block app - this is non-critical
          }
        };
        initPersonProperties();
      } else {
        console.log('⏳ [Analytics] Waiting for user sign-in to set properties');
      }
    } else {
      console.log('⏳ [Analytics] Waiting for PostHog initialization');
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

  // Listen for notifications (both received and tapped)
  React.useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received while app open:', notification);
      const messageId = notification.request.identifier || `notif_${Date.now()}`;
      analyticsService.trackCustomEvent('notification_received', {
        message_id: messageId,
        title: notification.request.content.title,
        app_state: 'foreground',
      });
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      const messageId = response.notification.request.identifier || `notif_${Date.now()}`;
      analyticsService.trackNotificationClicked(messageId);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return <>{children}</>;
}

// Avatar unlock animation wrapper that must be inside RewardsProvider
function AvatarAnimationWrapper({ children }: { children: React.ReactNode }) {
  const { newlyUnlockedItem, clearNewlyUnlockedItem } = useRewards();
  const [showNotification, setShowNotification] = React.useState(false);
  const [notificationAvatar, setNotificationAvatar] = React.useState<{ image: any; name: string } | null>(null);
  const [showConfetti, setShowConfetti] = React.useState(false);

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

  // When confetti completes
  const handleConfettiComplete = () => {
    setShowConfetti(false);
  };

  return (
    <>
      {children}
      {/* TODO: Confetti disabled for now */}
      {/* <ConfettiEffect visible={showConfetti} onComplete={handleConfettiComplete} /> */}
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

export default function RootLayout() {
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

  console.log('RootLayout - Fonts loaded:', loaded);
  console.log('RootLayout - Platform:', Platform.OS);
  console.log('RootLayout - Available fonts:', {
    'SpaceMono': '✓',
    'DM Sans': '✓',
    'DM Sans-Bold': '✓',
    'Cormorant': '✓',
    'Cormorant-Bold': '✓'
  });

  // Hide splash screen when fonts are loaded
  React.useEffect(() => {
    if (loaded) {
      console.log('RootLayout - Fonts loaded, hiding splash screen');
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Set Android navigation bar color to match app background
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync('#F4EBDB');
    }
  }, []);

  if (!loaded) {
    // Show branded loading screen while fonts load
    console.log('RootLayout - Fonts not loaded, showing branded loading screen');
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

  console.log('RootLayout - Clerk publishable key exists:', !!publishableKey);
  console.log('RootLayout - PostHog API key exists:', !!posthogApiKey);

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
                      <PreferencesProvider>
                        <AvatarAnimationWrapper>
                        <ThemeProvider value={colorScheme === "dark" ? CustomDarkTheme : CustomTheme}>
                          <Stack>
                            <Stack.Screen name="index" options={{ headerShown: false }} />
                            <Stack.Screen name="onboarding-video" options={{ headerShown: false, title: '' }} />
                            <Stack.Screen name="onboarding-video-2" options={{ headerShown: false, title: '' }} />
                            <Stack.Screen name="onboarding-welcome" options={{ headerShown: false, title: '' }} />
                            <Stack.Screen name="onboarding-question-1" options={{ headerShown: false }} />
                            <Stack.Screen name="onboarding-question-2" options={{ headerShown: false }} />
                            <Stack.Screen name="onboarding-question-3" options={{ headerShown: false }} />
                            <Stack.Screen name="onboarding-question-4" options={{ headerShown: false }} />
                            <Stack.Screen name="onboarding-results" options={{ headerShown: false }} />
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                            <Stack.Screen name="+not-found" />
                          </Stack>
                          <StatusBar style="auto" />
                        </ThemeProvider>
                      </AvatarAnimationWrapper>
                    </PreferencesProvider>
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
}
