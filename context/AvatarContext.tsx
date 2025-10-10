import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/hooks/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AvatarType {
  id: string;
  name: string;
  role: string;
  unlock_message: string;
  image_url: string;
}

interface UserAvatar {
  id: string;
  avatar_id: string;
  user_id: string;
  unlocked_at: string;
  is_selected?: boolean; // New field to mark selected avatar
}

interface AvatarContextType {
  avatarTypes: AvatarType[];
  userAvatars: UserAvatar[];
  selectedAvatar: AvatarType | null;
  setSelectedAvatar: (avatar: AvatarType) => Promise<void>;
  isAvatarUnlocked: (avatarId: string) => boolean;
  giveAvatar: (avatarId: string) => Promise<void>;
  loading: boolean;
  newlyUnlockedAvatar: AvatarType | null;
  clearNewlyUnlockedAvatar: () => void;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

const STORAGE_KEY = 'user_avatars_data';

export function AvatarProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [avatarTypes, setAvatarTypes] = useState<AvatarType[]>([]);
  const [userAvatars, setUserAvatars] = useState<UserAvatar[]>([]);
  const [selectedAvatar, setSelectedAvatarState] = useState<AvatarType | null>(null);
  const [loading, setLoading] = useState(true);
  const [newlyUnlockedAvatar, setNewlyUnlockedAvatar] = useState<AvatarType | null>(null);

  // Load avatar data on mount (STARTUP: Supabase → AsyncStorage)
  useEffect(() => {
    if (!user?.id) return;

    const loadAvatarData = async () => {
      try {
        console.log('🎭 [STARTUP] Loading avatar data from Supabase...');

        // Load all avatar types
        const { data: avatarTypesData, error: avatarTypesError } = await supabase
          .from('avatar_types')
          .select('*')
          .order('name', { ascending: true });

        if (avatarTypesError) throw avatarTypesError;

        // Load user's unlocked avatars
        const { data: userAvatarsData, error: userAvatarsError } = await supabase
          .from('user_avatars')
          .select('*')
          .eq('user_id', user.id);

        if (userAvatarsError) throw userAvatarsError;

        setAvatarTypes(avatarTypesData || []);

        // Auto-unlock ALL avatars for all users on login/signup
        let finalUserAvatars = userAvatarsData || [];
        const unlockedAvatarIds = new Set(finalUserAvatars.map(ua => ua.avatar_id));
        const avatarsToUnlock: UserAvatar[] = [];

        (avatarTypesData || []).forEach(avatarType => {
          if (!unlockedAvatarIds.has(avatarType.id)) {
            console.log(`🎭 Auto-unlocking avatar: ${avatarType.name}`);

            const newUserAvatar: UserAvatar = {
              id: `temp_${Date.now()}_${avatarType.id}`,
              avatar_id: avatarType.id,
              user_id: user.id,
              unlocked_at: new Date().toISOString(),
              is_selected: false
            };

            avatarsToUnlock.push(newUserAvatar);
          }
        });

        if (avatarsToUnlock.length > 0) {
          finalUserAvatars = [...finalUserAvatars, ...avatarsToUnlock];
          console.log(`✅ ${avatarsToUnlock.length} avatars auto-unlocked (in memory)`);
        }

        // Find selected avatar (from is_selected field)
        const selectedUserAvatar = finalUserAvatars.find(ua => ua.is_selected);
        const selectedAvatarData = selectedUserAvatar
          ? (avatarTypesData || []).find(a => a.id === selectedUserAvatar.avatar_id)
          : null;
        const defaultAvatar = avatarTypesData?.[0] || null;

        // If no selected avatar, mark first as selected
        if (!selectedUserAvatar && finalUserAvatars.length > 0) {
          finalUserAvatars[0].is_selected = true;
        }

        setUserAvatars(finalUserAvatars);
        setSelectedAvatarState(selectedAvatarData || defaultAvatar);

        // Store to AsyncStorage (Supabase → AsyncStorage)
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(finalUserAvatars));
        console.log('✅ [STARTUP] Avatar data saved to AsyncStorage');

        console.log('✅ Avatar data loaded:', {
          types: avatarTypesData?.length || 0,
          unlocked: finalUserAvatars.length,
          selected: selectedAvatarData?.name || defaultAvatar?.name || 'None'
        });
      } catch (error) {
        console.error('❌ Error loading avatar data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAvatarData();
  }, [user?.id]);

  // Check if avatar is unlocked
  const isAvatarUnlocked = (avatarId: string): boolean => {
    return userAvatars.some(ua => ua.avatar_id === avatarId);
  };

  // Give avatar to user (AsyncStorage + Supabase IMMEDIATELY)
  const giveAvatar = async (avatarId: string) => {
    if (!user?.id) return;

    // Check if already unlocked
    const alreadyHas = userAvatars.some(ua => ua.avatar_id === avatarId);

    if (alreadyHas) {
      console.log(`🎭 User already has avatar: ${avatarId}`);
      return;
    }

    console.log(`🎉 Awarding avatar: ${avatarId}`);

    // Find the avatar details
    const avatarDetails = avatarTypes.find(a => a.id === avatarId);
    if (avatarDetails) {
      setNewlyUnlockedAvatar(avatarDetails);
    }

    // Create avatar object
    const newUserAvatar: UserAvatar = {
      id: `temp_${Date.now()}`,
      avatar_id: avatarId,
      user_id: user.id,
      unlocked_at: new Date().toISOString(),
      is_selected: false
    };

    // Update state
    const updatedAvatars = [...userAvatars, newUserAvatar];
    setUserAvatars(updatedAvatars);

    // Store to AsyncStorage immediately
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAvatars));
      console.log(`✅ Avatar awarded and saved to AsyncStorage: ${avatarId}`);
    } catch (error) {
      console.error('❌ Error saving avatar to AsyncStorage:', error);
    }

    // IMMEDIATELY save to Supabase (don't wait for shutdown)
    try {
      console.log(`🎭 Saving new avatar to Supabase...`);

      // Check if already exists in DB first
      const { data: existing } = await supabase
        .from('user_avatars')
        .select('id')
        .eq('user_id', user.id)
        .eq('avatar_id', avatarId)
        .single();

      if (existing) {
        console.log(`⚠️ Avatar already exists in DB: ${avatarId}`);
        return;
      }

      const { error } = await supabase
        .from('user_avatars')
        .insert({
          avatar_id: avatarId,
          user_id: user.id,
          unlocked_at: new Date().toISOString(),
          is_selected: false
        });

      if (error && error.code !== '23505') {
        console.error('❌ Error saving avatar to Supabase:', error);
      } else {
        console.log(`✅ Avatar saved to Supabase: ${avatarId}`);
      }
    } catch (error) {
      console.error('❌ Error syncing avatar to Supabase:', error);
    }
  };

  // Clear newly unlocked avatar after animation completes
  const clearNewlyUnlockedAvatar = () => {
    setNewlyUnlockedAvatar(null);
  };

  // Set selected avatar (AsyncStorage + Supabase IMMEDIATELY)
  const setSelectedAvatar = async (avatar: AvatarType) => {
    if (!user?.id) return;

    console.log(`🎭 Selecting avatar: ${avatar.name}`);
    setSelectedAvatarState(avatar);

    // Update is_selected field (only one should be true)
    const updatedAvatars = userAvatars.map(ua => ({
      ...ua,
      is_selected: ua.avatar_id === avatar.id
    }));

    setUserAvatars(updatedAvatars);

    // Store to AsyncStorage immediately
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAvatars));
      console.log(`✅ Avatar selection saved to AsyncStorage: ${avatar.name}`);
    } catch (error) {
      console.error('❌ Error saving avatar selection to AsyncStorage:', error);
    }

    // IMMEDIATELY save to Supabase (don't wait for shutdown)
    try {
      console.log(`🎭 Saving avatar selection to Supabase...`);

      // First, unselect all avatars for this user
      await supabase
        .from('user_avatars')
        .update({ is_selected: false })
        .eq('user_id', user.id);

      // Then select the chosen avatar
      const { error } = await supabase
        .from('user_avatars')
        .update({ is_selected: true })
        .eq('user_id', user.id)
        .eq('avatar_id', avatar.id);

      if (error) {
        console.error('❌ Error saving avatar to Supabase:', error);
      } else {
        console.log(`✅ Avatar selection saved to Supabase: ${avatar.name}`);
      }
    } catch (error) {
      console.error('❌ Error syncing avatar to Supabase:', error);
    }
  };

  // Sync avatars to Supabase on unmount (SHUTDOWN: AsyncStorage → Supabase)
  useEffect(() => {
    return () => {
      if (!user?.id) return;

      const syncToSupabase = async () => {
        try {
          console.log('🎭 [SHUTDOWN] Syncing avatars from AsyncStorage to Supabase...');

          // Load from AsyncStorage
          const storedData = await AsyncStorage.getItem(STORAGE_KEY);
          if (!storedData) {
            console.log('⚠️ No avatar data in AsyncStorage to sync');
            return;
          }

          const avatarsToSync: UserAvatar[] = JSON.parse(storedData);

          // Separate new avatars (temp IDs) from existing ones
          const newAvatars = avatarsToSync.filter(ua => ua.id.startsWith('temp_'));
          const existingAvatars = avatarsToSync.filter(ua => !ua.id.startsWith('temp_'));

          // Insert new avatars
          if (newAvatars.length > 0) {
            const avatarsToInsert = newAvatars.map(ua => ({
              avatar_id: ua.avatar_id,
              user_id: user.id,
              unlocked_at: ua.unlocked_at,
              is_selected: ua.is_selected || false
            }));

            const { error: insertError } = await supabase
              .from('user_avatars')
              .insert(avatarsToInsert);

            if (insertError && insertError.code !== '23505') {
              console.error('❌ Error inserting new avatars:', insertError);
            } else {
              console.log(`✅ Synced ${newAvatars.length} new avatars to Supabase`);
            }
          }

          // Update is_selected for existing avatars
          for (const avatar of existingAvatars) {
            const { error: updateError } = await supabase
              .from('user_avatars')
              .update({ is_selected: avatar.is_selected || false })
              .eq('id', avatar.id)
              .eq('user_id', user.id);

            if (updateError) {
              console.error(`❌ Error updating avatar ${avatar.id}:`, updateError);
            }
          }

          console.log('✅ [SHUTDOWN] Avatars synced to Supabase successfully');
        } catch (error) {
          console.error('❌ Error syncing avatars to Supabase:', error);
        }
      };

      syncToSupabase();
    };
  }, [user?.id]);

  return (
    <AvatarContext.Provider
      value={{
        avatarTypes,
        userAvatars,
        selectedAvatar,
        setSelectedAvatar,
        isAvatarUnlocked,
        giveAvatar,
        loading,
        newlyUnlockedAvatar,
        clearNewlyUnlockedAvatar
      }}
    >
      {children}
    </AvatarContext.Provider>
  );
}

export const useAvatars = () => {
  const context = useContext(AvatarContext);
  if (!context) {
    throw new Error('useAvatars must be used within AvatarProvider');
  }
  return context;
};
