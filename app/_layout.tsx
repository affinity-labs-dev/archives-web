import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, Platform } from "react-native";
import "react-native-reanimated";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { PostHogProvider } from 'posthog-react-native';

import { useColorScheme } from "@/hooks/useColorScheme";
import { ProgressProvider } from "@/context/ProgressContext";
import { BackgroundSyncProvider } from "@/context/BackgroundSyncProvider";
import { useAppTrackingTransparency } from "@/hooks/useAppTrackingTransparency";

// Conditional PostHog provider that respects ATT permissions
function ConditionalPostHogProvider({
  children,
  apiKey,
  options
}: {
  children: React.ReactNode;
  apiKey: string;
  options: any;
}) {
  const { canTrack } = useAppTrackingTransparency();

  // On iOS, only initialize PostHog if user granted tracking permission
  if (Platform.OS === 'ios' && !canTrack) {
    console.log('ATT: Tracking not authorized, PostHog disabled');
    return <>{children}</>;
  }

  // On non-iOS platforms or when tracking is allowed, initialize PostHog
  return (
    <PostHogProvider apiKey={apiKey} options={options}>
      {children}
    </PostHogProvider>
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
    // Disable session recording on web to prevent compatibility issues
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
        // Debouncer delays for smooth performance
        androidDebouncerDelayMs: 1000,
        iOSdebouncerDelayMs: 1000,
      },
    }),
  };

  return (
    <GestureHandlerRootView style={{ 
      flex: 1, 
      backgroundColor: Platform.OS === 'android' ? '#F4EBDB' : undefined 
    }}>
      <ConditionalPostHogProvider apiKey={posthogApiKey} options={posthogOptions}>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <BackgroundSyncProvider>
              <ProgressProvider>
                <ThemeProvider value={colorScheme === "dark" ? CustomDarkTheme : CustomTheme}>
              <Stack>
                <Stack.Screen name="onboarding-video" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding-video-2" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding-welcome" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding-question-1" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding-question-2" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding-question-3" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding-question-4" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding-results" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="landing" options={{ headerShown: false }} />
                <Stack.Screen name="era-selection" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
                </ThemeProvider>
              </ProgressProvider>
            </BackgroundSyncProvider>
        </ClerkProvider>
      </ConditionalPostHogProvider>
    </GestureHandlerRootView>
  );
}
