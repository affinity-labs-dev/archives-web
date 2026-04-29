import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import type { NewUserProgress } from '@/components/profile/types';

// Era 2+ progress lives outside the GamifiedProgress reducer (legacy
// `moduleProgress` only covers Era 1), so the Profile tab loads it
// directly from AsyncStorage on focus. Reload-on-focus catches changes
// from other tabs (a quiz finished on Today should bump the count
// before the user lands here).
export function useNewUserProgress() {
  const [progress, setProgress] = useState<NewUserProgress[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const data = await AsyncStorage.getItem('new_user_progress');
          if (data) setProgress(JSON.parse(data) as NewUserProgress[]);
        } catch (error) {
          console.error('Error loading Era 2+ progress:', error);
        }
      })();
    }, []),
  );

  return progress;
}
