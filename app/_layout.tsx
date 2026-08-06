// MUST be first: it clamps the width Dimensions reports, and the layout
// constants that depend on it are evaluated at module scope in the imports
// below. See constants/phoneColumn.web.ts.
import { PHONE_COLUMN_WIDTH } from "@/constants/phoneColumn.web";

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { PreferencesProvider } from "@/context/PreferencesContext";
import { TodayWalkthroughProvider } from "@/components/today/walkthrough/TodayWalkthroughProvider";
// The lesson and quiz components read XP/streak state through these, so they
// throw without them even though nothing here writes to the cloud. Nesting
// order matches app/_layout.tsx:874-880.
import { GamifiedProgressProvider, RewardsProvider } from "@/gamification";
// The gamification engines call Clerk's useUser(), so ClerkProvider has to be
// present even though nobody signs in here. Unlike the real root layout this
// does NOT gate rendering on Clerk being loaded: the production instance only
// accepts archiveszone.app, so on localhost it never loads and gating would
// mean a permanently blank screen. Signed-out is a state the engines already
// handle (they fall back to local storage).
import { ClerkProvider } from "@clerk/clerk-expo";

// Spike layout: the smallest provider tree the real Today components need.
//
// Deliberately excludes Clerk, Supabase, RevenueCat, PostHog and the
// gamification engines - none of them affect what the screen looks like, and
// Clerk's production instance refuses any origin that is not archiveszone.app,
// so including it would just gate the whole app behind a blank splash.
//
// Fonts are loaded for real: the typography is half of "does this look like
// the app".
export default function SpikeLayout() {
  // Same registration as the real root layout, aliases included - the aliases
  // are what the components actually reference.
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    "DM Sans": require("../assets/fonts/DM_Sans.ttf"),
    "DM-Sans-SemiBold": require("../assets/fonts/DM_Sans-SemiBold.ttf"),
    "DM-Sans-Bold": require("../assets/fonts/DM_Sans-Bold.ttf"),
    "DMSans-Bold": require("../assets/fonts/DM_Sans-Bold.ttf"),
    "DM Sans Bold": require("../assets/fonts/DM_Sans-Bold.ttf"),
    Cormorant: require("../assets/fonts/Cormorant.ttf"),
    "Cormorant-Bold": require("../assets/fonts/Cormorant-Bold.ttf"),
    "Bounded-Black": require("../assets/fonts/Bounded-Black.ttf"),
    "Onest-Black": require("../assets/fonts/Onest-Black.ttf"),
    "Onest-Bold": require("../assets/fonts/Onest-Bold.ttf"),
    "Onest-SemiBold": require("../assets/fonts/Onest-SemiBold.ttf"),
    "Onest-Medium": require("../assets/fonts/Onest-Medium.ttf"),
  });

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0C0B09" }}>
      {/* The column. Centred, phone-width, everything outside it is chrome.
          Width matches what phoneColumn.web.ts reports to Dimensions, so the
          layout inside is laid out against exactly the space it occupies. */}
      <View style={{ flex: 1, alignItems: "center" }}>
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth: PHONE_COLUMN_WIDTH,
            backgroundColor: "#FAFAFA",
            overflow: "hidden",
          }}
        >
          <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
          <SafeAreaProvider>
            <PreferencesProvider>
              <RewardsProvider>
                <GamifiedProgressProvider>
                  {/* GamificationOrchestratorProvider is NOT here on purpose: it
                      requires AdventuresContentProvider, which requires the Supabase
                      data layer. Adding it blanks the page. The quiz needs it, so
                      the quiz is the next piece of work - see notes. */}
                  <TodayWalkthroughProvider>
                    <Stack screenOptions={{ headerShown: false }} />
                  </TodayWalkthroughProvider>
                </GamifiedProgressProvider>
              </RewardsProvider>
            </PreferencesProvider>
          </SafeAreaProvider>
          </ClerkProvider>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
