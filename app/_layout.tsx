import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text } from "react-native";
import "react-native-reanimated";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { PostHogProvider } from 'posthog-react-native';

import { useColorScheme } from "@/hooks/useColorScheme";
import { ProgressProvider } from "@/context/ProgressContext";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    "DM Sans": require("../assets/fonts/DM_Sans.ttf"),
    "Cormorant": require("../assets/fonts/Cormorant.ttf"),
  });

  console.log('RootLayout - Fonts loaded:', loaded);

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PostHogProvider 
        apiKey={posthogApiKey} 
        options={{
          host: posthogHost,
        }}
      >
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
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
        </ClerkProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}
