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

// Web-compatible PostHog wrapper to prevent SSR issues
function WebCompatiblePostHogProvider({ 
  children, 
  apiKey, 
  options 
}: { 
  children: React.ReactNode;
  apiKey: string;
  options: any;
}) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    // Only initialize PostHog on client-side to avoid SSR issues
    setIsClient(true);
  }, []);

  // On web, only render PostHogProvider after client-side hydration
  if (Platform.OS === 'web' && !isClient) {
    return <>{children}</>;
  }
  
  // On native platforms, always use PostHogProvider
  // On web, only use after client-side hydration
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
    "Cormorant": require("../assets/fonts/Cormorant.ttf"),
  });

  console.log('RootLayout - Fonts loaded:', loaded);
  console.log('RootLayout - Platform:', Platform.OS);

  if (!loaded) {
    // Show loading screen instead of null to prevent blank app
    console.log('RootLayout - Fonts not loaded, showing loading screen');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: 'white', fontSize: 16 }}>Loading Archives...</Text>
      </View>
    );
  }

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WebCompatiblePostHogProvider apiKey={posthogApiKey} options={posthogOptions}>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <BackgroundSyncProvider>
            <ProgressProvider>
              <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
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
        </ClerkProvider>
      </WebCompatiblePostHogProvider>
    </GestureHandlerRootView>
  );
}
