import { Stack } from "expo-router";
import { StyleSheet, View } from 'react-native';

import {
  PersistentMascot,
  PersistentMascotProvider,
} from '@/components/onboarding/Mascot';

export default function OnboardingLayout() {
  return (
    <PersistentMascotProvider>
      <View style={styles.root}>
        <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
          {/* Legacy flow (Phase 0) */}
          <Stack.Screen name="onboarding-welcome" />
          <Stack.Screen name="onboarding-video" />
          <Stack.Screen name="onboarding-video-2" />
          <Stack.Screen name="onboarding-question-1" />
          <Stack.Screen name="onboarding-question-2" />
          <Stack.Screen name="onboarding-question-3" />
          <Stack.Screen name="onboarding-question-4" />
          <Stack.Screen name="onboarding-results" />

          {/* New flow (Phase 2+) */}
          <Stack.Screen name="onboarding-step-1" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding-step-2" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding-step-3" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding-step-4" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding-step-5" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding-step-6" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding-step-7" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding-auth" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding-step-9" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding-step-10" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding-step-11" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding-step-12" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding-step-13" options={{ animation: 'fade' }} />
        </Stack>
        <PersistentMascot />
      </View>
    </PersistentMascotProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
