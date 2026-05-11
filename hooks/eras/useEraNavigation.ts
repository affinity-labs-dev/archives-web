// Owns the "Enter Era" continue flow: haptics, analytics, persistence,
// and routing into the tabs. The non-onboarding path defers
// `setSelectedEra` via `requestAnimationFrame` so the destination tab
// doesn't remount video views + start count-up animations on the same
// frame this screen is tearing down its own animations — that race
// caused a native crash in expo-video VideoTrack teardown + Reanimated
// worklet flush (see commit ca31fc9).

import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { useGamifiedProgress } from '@/gamification';
import { Era } from '@/hooks/useEras';
import { analyticsService } from '@/services/AnalyticsService';

interface UseEraNavigationOptions {
  isOnboarding: boolean;
  eras: Era[];
}

export function useEraNavigation({ isOnboarding, eras }: UseEraNavigationOptions) {
  const router = useRouter();
  const { setSelectedEra } = useGamifiedProgress();

  const handleContinue = useCallback(
    async (selectedEraId: string | null) => {
      if (!selectedEraId) return;

      const selectedEra = eras.find((e) => e.era_id === selectedEraId);
      if (!selectedEra) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      analyticsService.trackEraSelected({
        era_name: selectedEra.title,
        era_id: selectedEra.era_id,
        screen: isOnboarding ? 'era_selection' : 'eras_tab',
        context: isOnboarding ? 'onboarding' : 'era_switch',
        selection_order: eras.findIndex((e) => e.era_id === selectedEraId),
      });

      if (isOnboarding) {
        await AsyncStorage.setItem('onboarding_completed', 'true');
        await AsyncStorage.setItem('selected_era', selectedEra.era_id);
        await setSelectedEra(selectedEra.era_id);
        console.log('✅ Onboarding completed - selected era:', selectedEra.era_id);
        router.replace('/(tabs)');
      } else {
        router.push('/(tabs)');
        requestAnimationFrame(() => {
          setSelectedEra(selectedEra.era_id);
        });
      }
    },
    [isOnboarding, eras, router, setSelectedEra],
  );

  return { handleContinue };
}
