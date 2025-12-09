import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding-welcome" />
      <Stack.Screen name="onboarding-video" />
      <Stack.Screen name="onboarding-video-2" />
      <Stack.Screen name="onboarding-question-1" />
      <Stack.Screen name="onboarding-question-2" />
      <Stack.Screen name="onboarding-question-3" />
      <Stack.Screen name="onboarding-question-4" />
      <Stack.Screen name="onboarding-results" />
    </Stack>
  );
}
