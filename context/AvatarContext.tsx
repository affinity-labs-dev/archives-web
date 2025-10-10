import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/hooks/lib/supabase';

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
}

interface AvatarContextType {
  avatarTypes: AvatarType[];
  userAvatars: UserAvatar[];
  selectedAvatar: AvatarType | null;
  setSelectedAvatar: (avatar: AvatarType) => void;
  isAvatarUnlocked: (avatarId: string) => boolean;
  giveAvatar: (avatarId: string) => Promise<void>;
  loading: boolean;
  newlyUnlockedAvatar: AvatarType | null;
  clearNewlyUnlockedAvatar: () => void;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [avatarTypes, setAvatarTypes] = useState<AvatarType[]>([]);
  const [userAvatars, setUserAvatars] = useState<UserAvatar[]>([]);
  const [selectedAvatar, setSelectedAvatarState] = useState<AvatarType | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialSelectedAvatarId, setInitialSelectedAvatarId] = useState<string | null>(null);
  const [newlyUnlockedAvatar, setNewlyUnlockedAvatar] = useState<AvatarType | null>(null);

  // Load avatar data on mount
  useEffect(() => {
    if (!user?.id) return;

    const loadAvatarData = async () => {
      try {
        console.log('🎭 Loading avatar data...');

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

        // Load user's selected avatar from user_data.data
        const { data: userData, error: userDataError } = await supabase
          .from('user_data')
          .select('data')
          .eq('user_id', user.id)
          .single();

        if (userDataError && userDataError.code !== 'PGRST116') throw userDataError;

        setAvatarTypes(avatarTypesData || []);

        // Auto-unlock Al-Khwarizmi for all users (ID: fb25660f-c499-4346-8ee9-925105211ba6)
        const alKhwarizmiId = 'fb25660f-c499-4346-8ee9-925105211ba6';
        const hasAlKhwarizmi = userAvatarsData?.some(ua => ua.avatar_id === alKhwarizmiId);

        let finalUserAvatars = userAvatarsData || [];

        if (!hasAlKhwarizmi) {
          console.log('🎭 Auto-unlocking Al-Khwarizmi for user');

          const newUserAvatar: UserAvatar = {
            id: `temp_${Date.now()}`,
            avatar_id: alKhwarizmiId,
            user_id: user.id,
            unlocked_at: new Date().toISOString()
          };

          finalUserAvatars = [...finalUserAvatars, newUserAvatar];
          console.log('✅ Al-Khwarizmi unlocked (in memory)');
        }

        setUserAvatars(finalUserAvatars);

        // Set selected avatar (default to first avatar if none selected)
        const selectedAvatarId = userData?.data?.selectedAvatarId;
        const selectedAvatarData = (avatarTypesData || []).find(a => a.id === selectedAvatarId);
        const defaultAvatar = avatarTypesData?.[0] || null;

        setSelectedAvatarState(selectedAvatarData || defaultAvatar);
        setInitialSelectedAvatarId(selectedAvatarData?.id || defaultAvatar?.id || null);

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

  // Give avatar to user (IN-MEMORY ONLY - no DB write)
  const giveAvatar = async (avatarId: string) => {
    if (!user?.id) return;

    // Check if already unlocked
    const alreadyHas = userAvatars.some(ua => ua.avatar_id === avatarId);

    if (alreadyHas) {
      console.log(`🎭 User already has avatar: ${avatarId}`);
      return;
    }

    console.log(`🎉 Awarding avatar in memory: ${avatarId}`);

    // Find the avatar details
    const avatarDetails = avatarTypes.find(a => a.id === avatarId);
    if (avatarDetails) {
      setNewlyUnlockedAvatar(avatarDetails);
    }

    // Create avatar object in memory
    const newUserAvatar: UserAvatar = {
      id: `temp_${Date.now()}`,
      avatar_id: avatarId,
      user_id: user.id,
      unlocked_at: new Date().toISOString()
    };

    // Update local state only
    setUserAvatars((prev) => [...prev, newUserAvatar]);
    console.log(`✅ Avatar awarded (in memory): ${avatarId}`);
  };

  // Clear newly unlocked avatar after animation completes
  const clearNewlyUnlockedAvatar = () => {
    setNewlyUnlockedAvatar(null);
  };

  // Set selected avatar (in-memory only)
  const setSelectedAvatar = (avatar: AvatarType) => {
    console.log(`🎭 Selecting avatar: ${avatar.name}`);
    setSelectedAvatarState(avatar);
  };

  // Sync selected avatar and new avatars to database on unmount
  useEffect(() => {
    return () => {
      if (!user?.id) return;

      // Sync selected avatar if changed
      if (selectedAvatar && selectedAvatar.id !== initialSelectedAvatarId) {
        console.log('🎭 Syncing selected avatar to database on shutdown...');

        const syncAvatar = async () => {
          try {
            // Get current data
            const { data: userData, error: fetchError } = await supabase
              .from('user_data')
              .select('data')
              .eq('user_id', user.id)
              .single();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

            // Update data with selected avatar
            const updatedData = {
              ...(userData?.data || {}),
              selectedAvatarId: selectedAvatar.id
            };

            const { error } = await supabase
              .from('user_data')
              .update({ data: updatedData })
              .eq('user_id', user.id);

            if (error) throw error;
            console.log(`✅ Synced selected avatar: ${selectedAvatar.name}`);
          } catch (error) {
            console.error('❌ Error syncing selected avatar:', error);
          }
        };

        syncAvatar();
      }

      // Sync new avatars to database
      const newAvatars = userAvatars.filter(ua => ua.id.startsWith('temp_'));

      if (newAvatars.length > 0) {
        console.log('🎭 Syncing new avatars to database on shutdown...');

        const syncAvatars = async () => {
          try {
            const avatarsToInsert = newAvatars.map(ua => ({
              avatar_id: ua.avatar_id,
              user_id: user.id,
              unlocked_at: ua.unlocked_at
            }));

            const { error } = await supabase
              .from('user_avatars')
              .insert(avatarsToInsert);

            if (error && error.code !== '23505') throw error;

            console.log(`✅ Synced ${newAvatars.length} avatars to database`);
          } catch (error) {
            console.error('❌ Error syncing avatars:', error);
          }
        };

        syncAvatars();
      }
    };
  }, [user?.id, selectedAvatar, initialSelectedAvatarId, userAvatars]);

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
