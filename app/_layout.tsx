// MUST be first: it clamps the width Dimensions reports, and the layout
// constants that depend on it are evaluated at module scope in the imports
// below. See constants/phoneColumn.web.ts.
import { PHONE_COLUMN_WIDTH } from "@/constants/phoneColumn.web";

import { useFonts } from "expo-font";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { PreferencesProvider } from "@/context/PreferencesContext";
import { AdventuresContentProvider } from "@/context/AdventuresContentProvider";
import { TodayWalkthroughProvider } from "@/components/today/walkthrough/TodayWalkthroughProvider";
// The lesson and quiz components read XP/streak state through these, so they
// throw without them. Nesting order matches app_full/_layout.tsx:862-924.
import {
  GamifiedProgressProvider,
  GamificationOrchestratorProvider,
  RewardsProvider,
  AIProvider,
  NotificationPromptProvider,
} from "@/gamification";
// The gamification engines call Clerk's useUser(), so ClerkProvider has to be
// present. Unlike the real root layout this does NOT gate rendering on Clerk
// being loaded - signed-out is a state the engines already handle, and gating
// turns any Clerk hiccup into a permanently blank screen.
//
// Local development now uses a Clerk *development* instance
// (welcomed-flea-99.clerk.accounts.dev, set in .env.web-spike). The production
// instance is origin-locked to archiveszone.app and returns 400 on localhost.
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

/**
 * Hands the web Supabase client a Clerk token getter. Must be inside
 * ClerkProvider.
 *
 * Without it every /api/db request goes out unauthenticated and the proxy
 * answers 401 - which is correct behaviour but reads as "the data layer is
 * broken" rather than "nothing registered a token".
 */
function SupabaseAuthBridge({ children }: { children: React.ReactNode }) {
  useSupabaseAuth();
  return <>{children}</>;
}

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
    // Icon fonts, and they are not optional on web.
    //
    // @expo/vector-icons loads these itself on native, so nothing here ever
    // mentioned them - and on web every icon rendered as a black square,
    // because the glyph has no font and falls back to the missing-character
    // box. It hits 45 call sites across Ionicons and MaterialIcons: the back
    // arrow, the read/voiceover controls, the quiz answer marks, "understand
    // your answers", "chat to learn more".
    //
    // Registering them costs nothing on native, where they are already bundled.
    ...Ionicons.font,
    ...MaterialIcons.font,

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

  // The outer chrome is the same #FAFAFA as the column, so the page reads as
  // one surface rather than a phone sitting on a dark backdrop. It is the app's
  // own background - app.json uses it for the splash and every native
  // background too.
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      {/* The column. Centred, phone-width. Width matches what
          phoneColumn.web.ts reports to Dimensions, so the layout inside is laid
          out against exactly the space it occupies. */}
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
          {/* Nesting order is copied from app_full/_layout.tsx:862-924 rather
              than chosen. These providers read each other during
              initialisation, so the order is behaviour, not style - and the
              quiz is what needs the full chain:
                Quiz.tsx:109        useGamificationOrchestrator()
                QuizResults.tsx:152 useAI()
              and the orchestrator in turn needs AdventuresContentProvider,
              which needs the data layer. That dependency is why the quiz could
              not be wired before the proxy existed. */}
          <SafeAreaProvider>
          <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
          {/* Nothing that reads data may mount before Clerk is ready, or its
              first queries go out unauthenticated, get a correct 401, and the
              engines crash on the empty result. app_full/_layout.tsx:870 does
              the same. Safe here now that local development uses a Clerk
              development instance - the production one never loads on
              localhost, which is why the spike originally skipped this. */}
          <ClerkLoaded>
          <SupabaseAuthBridge>
            <AdventuresContentProvider>
              <RewardsProvider>
                <GamifiedProgressProvider>
                  <PreferencesProvider>
                    <NotificationPromptProvider>
                      <GamificationOrchestratorProvider>
                        <AIProvider>
                          <TodayWalkthroughProvider>
                            <Stack screenOptions={{ headerShown: false }} />
                          </TodayWalkthroughProvider>
                        </AIProvider>
                      </GamificationOrchestratorProvider>
                    </NotificationPromptProvider>
                  </PreferencesProvider>
                </GamifiedProgressProvider>
              </RewardsProvider>
            </AdventuresContentProvider>
          </SupabaseAuthBridge>
          </ClerkLoaded>
          </ClerkProvider>
          </SafeAreaProvider>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
