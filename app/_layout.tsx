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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { PostHogProvider } from 'posthog-react-native';

import { useColorScheme } from "@/hooks/useColorScheme";
import { ProgressProvider } from "@/context/ProgressContext";
import { BackgroundSyncProvider } from "@/context/BackgroundSyncProvider";
import { BadgeProvider } from "@/context/BadgeContext";
import { AvatarProvider, useAvatars } from "@/context/AvatarContext";
import { PreferencesProvider } from "@/context/PreferencesContext";
import Purchases from 'react-native-purchases';
import * as Notifications from 'expo-notifications';
import { analyticsService } from "@/services/AnalyticsService";
import { usePostHog } from 'posthog-react-native';
import { AppState } from 'react-native';
import AvatarUnlockAnimation from "@/components/AvatarUnlockAnimation";
import AvatarUnlockNotification from "@/components/AvatarUnlockNotification";
import ConfettiEffect from "@/components/ConfettiEffect";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Analytics initialization wrapper that must be inside PostHogProvider
function AnalyticsWrapper({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog();

  // Initialize analytics service when PostHog becomes available
  React.useEffect(() => {
    if (posthog) {
      analyticsService.initialize(posthog);
      console.log('✅ [Analytics] Service initialized with PostHog instance');
      // Note: Session replay starts automatically via enableSessionReplay: true config (line 193)
    }
  }, [posthog]);

  // App lifecycle tracking - foreground/background/close
  React.useEffect(() => {
    console.log('📊 [AppLifecycle] Setting up app state listener');

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('📊 [AppLifecycle] App state changed to:', nextAppState);

      if (nextAppState === 'active') {
        analyticsService.trackCustomEvent('app_foregrounded', {
          previous_state: 'background',
        });
      } else if (nextAppState === 'background') {
        analyticsService.trackCustomEvent('app_backgrounded', {
          previous_state: 'active',
        });
      } else if (nextAppState === 'inactive') {
        console.log('📊 [AppLifecycle] App transitioning to inactive state');
      }
    });

    // Track initial app open
    analyticsService.trackCustomEvent('app_opened', {
      platform: Platform.OS,
    });

    return () => {
      subscription?.remove();
      analyticsService.trackCustomEvent('app_closed', {
        platform: Platform.OS,
      });
    };
  }, []);

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

// Avatar unlock animation wrapper that must be inside AvatarProvider
function AvatarAnimationWrapper({ children }: { children: React.ReactNode }) {
  const { newlyUnlockedAvatar, clearNewlyUnlockedAvatar } = useAvatars();
  const [showNotification, setShowNotification] = React.useState(false);
  const [notificationAvatar, setNotificationAvatar] = React.useState<{ image: any; name: string } | null>(null);
  const [showConfetti, setShowConfetti] = React.useState(false);

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
        name: newlyUnlockedAvatar.name,
      });
      setShowNotification(true);
    }
    clearNewlyUnlockedAvatar();
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
          avatarName={newlyUnlockedAvatar.name}
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
    "DM-Sans-Bold": require("../assets/fonts/DM_Sans-Bold.ttf"),
    "DMSans-Bold": require("../assets/fonts/DM_Sans-Bold.ttf"),
    "DM Sans Bold": require("../assets/fonts/DM_Sans-Bold.ttf"),
    "Cormorant": require("../assets/fonts/Cormorant.ttf"),
    "Cormorant-Bold": require("../assets/fonts/Cormorant-Bold.ttf"),
  });

  // Initialize RevenueCat early - matching sample app configuration
  React.useEffect(() => {
    console.log('🚀 Configuring RevenueCat in RootLayout...');
    const REVENUECAT_API_KEY = 'appl_oxMRgfHsashdXXOSrczqvnYYIxg';

    try {
      Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      console.log('✅ RevenueCat configured successfully');
    } catch (error) {
      console.error('❌ Failed to configure RevenueCat:', error);
    }
  }, []);


  console.log('RootLayout - Fonts loaded:', loaded);
  console.log('RootLayout - Platform:', Platform.OS);
  console.log('RootLayout - Available fonts:', {
    'SpaceMono': '✓',
    'DM Sans': '✓',
    'DM Sans-Bold': '✓',
    'Cormorant': '✓',
    'Cormorant-Bold': '✓'
  });

  if (!loaded) {
    // Show loading screen instead of null to prevent blank app
    console.log('RootLayout - Fonts not loaded, showing loading screen');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: 'white', fontSize: 16 }}>Loading Archives...</Text>
      </View>
    );
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
    // Enable session recording for mobile (disabled on web to prevent compatibility issues)
    enableSessionReplay: Platform.OS !== 'web',
    // Person profiles configuration - set to 'always' to avoid type conflicts
    // PostHog will consistently process person profiles for all events
    personProfiles: 'always' as const,
    // Capture all events including $set properties
    captureMode: 'full' as const,
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
    <GestureHandlerRootView style={{
      flex: 1,
      backgroundColor: Platform.OS === 'android' ? '#F4EBDB' : undefined
    }}>
      <PostHogProvider apiKey={posthogApiKey} options={posthogOptions}>
        <AnalyticsWrapper>
          <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
              <BackgroundSyncProvider>
                <BadgeProvider>
                  <AvatarProvider>
                    <ProgressProvider>
                      <PreferencesProvider>
                        <AvatarAnimationWrapper>
                          <ThemeProvider value={colorScheme === "dark" ? CustomDarkTheme : CustomTheme}>
                            <Stack>
                              <Stack.Screen name="onboarding-video" options={{ headerShown: false, title: '' }} />
                              <Stack.Screen name="onboarding-video-2" options={{ headerShown: false, title: '' }} />
                              <Stack.Screen name="onboarding-welcome" options={{ headerShown: false, title: '' }} />
                              <Stack.Screen name="onboarding-question-1" options={{ headerShown: false }} />
                              <Stack.Screen name="onboarding-question-2" options={{ headerShown: false }} />
                              <Stack.Screen name="onboarding-question-3" options={{ headerShown: false }} />
                              <Stack.Screen name="onboarding-question-4" options={{ headerShown: false }} />
                              <Stack.Screen name="onboarding-results" options={{ headerShown: false }} />
                              <Stack.Screen name="era-selection" options={{ headerShown: false, title: '' }} />
                              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                              <Stack.Screen name="+not-found" />
                            </Stack>
                            <StatusBar style="auto" />
                          </ThemeProvider>
                        </AvatarAnimationWrapper>
                      </PreferencesProvider>
                    </ProgressProvider>
                  </AvatarProvider>
                </BadgeProvider>
              </BackgroundSyncProvider>
          </ClerkProvider>
        </AnalyticsWrapper>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}
