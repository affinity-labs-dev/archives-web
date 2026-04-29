// Owns the locally-selected era state on the eras tab.
// - Initializes from the zustand global store on mount / fresh login
// - Auto-selects the era from a deep-link `era` query param when accessible
// - Exposes `handleEraSelect` which routes locked premium taps to the paywall

import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';

import { useEraProgressStore } from '@/gamification';
import { Era, isEraAccessible } from '@/hooks/useEras';

interface UseEraSelectionOptions {
  eras: Era[];
  loading: boolean;
  error: string | null;
  deepLinkEraId: string | undefined;
  isSubscribed: boolean;
  isFoundingMember: boolean;
  onLockedPremiumTap: (era: Era) => void;
}

export function useEraSelection({
  eras,
  loading,
  error,
  deepLinkEraId,
  isSubscribed,
  isFoundingMember,
  onLockedPremiumTap,
}: UseEraSelectionOptions) {
  const globalSelectedEra = useEraProgressStore((s) => s.selectedEra);
  const [selectedEraId, setSelectedEraId] = useState<string | null>(null);

  // Sync local UI state when global selectedEra changes (fresh login, tab switch)
  useEffect(() => {
    if (globalSelectedEra && selectedEraId === null) {
      setSelectedEraId(globalSelectedEra);
    }
  }, [globalSelectedEra, selectedEraId]);

  // Deep-link auto-select
  useEffect(() => {
    if (!deepLinkEraId || loading || error || eras.length === 0) return;

    const matchedEra = eras.find((e) => e.era_id === deepLinkEraId);
    if (!matchedEra) {
      console.log(`🔗 [DeepLink] Era not found: ${deepLinkEraId}`);
      return;
    }

    const canSelect = isEraAccessible(matchedEra.status, isSubscribed, isFoundingMember);
    if (canSelect) {
      console.log(`🔗 [DeepLink] Auto-selecting era: ${matchedEra.title} (${deepLinkEraId})`);
      setSelectedEraId(matchedEra.era_id);
      Haptics.selectionAsync();
    } else {
      console.log(`🔗 [DeepLink] Era not accessible: ${matchedEra.title} (${deepLinkEraId})`);
    }
  }, [deepLinkEraId, eras, loading, error, isSubscribed, isFoundingMember]);

  const handleEraSelect = useCallback(
    (era: Era) => {
      const canSelect = isEraAccessible(era.status, isSubscribed, isFoundingMember);
      if (!canSelect) {
        if (era.status === 'premium') {
          onLockedPremiumTap(era);
        }
        return;
      }
      Haptics.selectionAsync();
      setSelectedEraId(era.era_id);
    },
    [isSubscribed, isFoundingMember, onLockedPremiumTap],
  );

  return {
    selectedEraId,
    setSelectedEraId,
    handleEraSelect,
  };
}
