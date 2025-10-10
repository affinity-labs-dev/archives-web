import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/hooks/lib/supabase';
import { AppState, AppStateStatus } from 'react-native';

interface PreferencesContextType {
  dailyGoal: number; // in minutes
  reminderTime: string; // HH:mm format (e.g., "19:00")
  setReminderTime: (time: string) => void;
  loading: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [dailyGoal, setDailyGoal] = useState(13); // Default 13 minutes (locked)
  const [reminderTime, setReminderTimeState] = useState('19:00'); // Default 7 PM
  const [initialReminderTime, setInitialReminderTime] = useState('19:00');
  const [loading, setLoading] = useState(true);
  const [hasDbRow, setHasDbRow] = useState(false); // Track if DB row exists

  // Load preferences on mount
  useEffect(() => {
    if (!user?.id) return;

    const loadPreferences = async () => {
      try {
        console.log('⚙️ Loading user preferences...');

        // Load from notification_preferences table
        const { data: notifPrefs, error } = await supabase
          .from('notification_preferences')
          .select('notification_time')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (notifPrefs) {
          // Row exists in DB - use it and enable saving
          setHasDbRow(true);
          const loadedTime = notifPrefs.notification_time || '19:00';
          setReminderTimeState(loadedTime);
          setInitialReminderTime(loadedTime);
          console.log('✅ Preferences loaded from DB:', loadedTime);
        } else {
          // Row doesn't exist - lock (don't allow saving)
          setHasDbRow(false);
          console.log('⚠️ No notification preferences in DB - using default (read-only)');
        }
      } catch (error) {
        console.error('❌ Error loading preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user?.id]);

  // Set reminder time (in-memory only)
  const setReminderTime = (time: string) => {
    console.log(`⚙️ Setting reminder time: ${time}`);
    setReminderTimeState(time);
  };

  // Save preferences to database (only UPDATE if DB row exists)
  const savePreferences = async () => {
    if (!user?.id) return;

    // Lock: Only save if we loaded a DB row on mount
    if (!hasDbRow) {
      console.log('🔒 No DB row exists - skipping save');
      return;
    }

    console.log('⚙️ Updating notification time in database:', reminderTime);

    try {
      // Only UPDATE existing row (never INSERT)
      const { error } = await supabase
        .from('notification_preferences')
        .update({
          notification_time: reminderTime,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;
      console.log('✅ Updated notification time in database:', reminderTime);
      setInitialReminderTime(reminderTime);
    } catch (error) {
      console.error('❌ Error syncing notification time:', error);
    }
  };

  // Listen to AppState changes to save when app backgrounds
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('⚙️ App going to background, saving preferences...');
        savePreferences();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [user?.id, reminderTime, hasDbRow]);

  // Also save on unmount
  useEffect(() => {
    return () => {
      savePreferences();
    };
  }, [user?.id, reminderTime, hasDbRow]);

  return (
    <PreferencesContext.Provider
      value={{
        dailyGoal,
        reminderTime,
        setReminderTime,
        loading
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
};
