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
import { useEffect, useState } from "react";

import { useColorScheme } from "@/hooks/useColorScheme";
import { ProgressProvider } from "@/context/ProgressContext";
import { BackgroundSyncProvider } from "@/context/BackgroundSyncProvider";
import { useAppTrackingTransparency } from "@/hooks/useAppTrackingTransparency";
import StripeProvider from "@/providers/StripeProvider";

// ATT-aware PostHog wrapper that respects tracking permissions
function ATTAwarePostHogProvider({ 
  children, 
  apiKey, 
  options 
}: { 
  children: React.ReactNode;
  apiKey: string;
  options: any;
}) {
  const [isClient, setIsClient] = useState(false);
  const { canTrack, isLoading: attLoading } = useAppTrackingTransparency();
  
  useEffect(() => {
    // Only initialize PostHog on client-side to avoid SSR issues
    setIsClient(true);
  }, []);

  // Wait for ATT permissions to be determined on iOS
  if (Platform.OS === 'ios' && attLoading) {
    return <>{children}</>;
  }

  // On web, only render PostHog after client-side hydration
  if (Platform.OS === 'web' && !isClient) {
    return <>{children}</>;
  }
  
  // Only initialize PostHog if tracking is allowed or on non-iOS platforms
  const shouldInitializePostHog = Platform.OS !== 'ios' || canTrack;
  
  if (!shouldInitializePostHog) {
    console.log('ATT: Tracking not authorized, PostHog disabled');
    return <>{children}</>;
  }
  
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
      <ATTAwarePostHogProvider apiKey={posthogApiKey} options={posthogOptions}>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <StripeProvider>
            <BackgroundSyncProvider>
              <ProgressProvider>
                <ThemeProvider value={colorScheme === "dark" ? CustomDarkTheme : CustomTheme}>
              <Stack>
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
          </StripeProvider>
        </ClerkProvider>
      </ATTAwarePostHogProvider>
    </GestureHandlerRootView>
  );
}
