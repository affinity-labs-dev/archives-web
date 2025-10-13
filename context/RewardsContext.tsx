import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/hooks/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Unified interface for all unlockable items (avatars + badges)
interface UnlockableItem {
  id: string;
  type: 'avatar' | 'badge';
  name: string;
  display_text: string;
  subtitle: string | null;
  image_url: string;
  unlock_condition: string | null;
  unlock_threshold: number | null;
  unlock_metric: string | null; // 'xp', 'modules_completed', 'months_active'
  sort_order: number;
}

// User's unlocked item
interface UserUnlockable {
  id: string;
  item_id: string;
  user_id: string;
  unlocked_at: string;
  is_selected: boolean;
  item?: UnlockableItem; // Joined item details
}

interface RewardsContextType {
  // All available items
  allItems: UnlockableItem[];
  avatars: UnlockableItem[];
  badges: UnlockableItem[];

  // User's unlocked items
  userUnlockables: UserUnlockable[];
  unlockedAvatars: UserUnlockable[];
  unlockedBadges: UserUnlockable[];

  // Selected avatar
  selectedAvatar: UnlockableItem | null;
  setSelectedAvatar: (avatar: UnlockableItem) => Promise<void>;

  // Check if item is unlocked
  isUnlocked: (itemId: string) => boolean;

  // Unlock new item
  unlockItem: (itemId: string) => Promise<void>;

  // Auto-check and unlock based on progress
  checkAndUnlockItems: (userData: any, totalXP: number, modulesCompleted?: number) => Promise<void>;

  // Loading state
  loading: boolean;

  // Newly unlocked item (for animations)
  newlyUnlockedItem: UnlockableItem | null;
  clearNewlyUnlockedItem: () => void;
}

const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

const STORAGE_KEY = 'user_unlockables_data';

export function RewardsProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [allItems, setAllItems] = useState<UnlockableItem[]>([]);
  const [userUnlockables, setUserUnlockables] = useState<UserUnlockable[]>([]);
  const [selectedAvatar, setSelectedAvatarState] = useState<UnlockableItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [newlyUnlockedItem, setNewlyUnlockedItem] = useState<UnlockableItem | null>(null);

  // Derived state
  const avatars = allItems.filter(item => item.type === 'avatar');
  const badges = allItems.filter(item => item.type === 'badge');
  const unlockedAvatars = userUnlockables.filter(u => u.item?.type === 'avatar');
  const unlockedBadges = userUnlockables.filter(u => u.item?.type === 'badge');

  // Load reward data on mount (STARTUP: Supabase → AsyncStorage)
  useEffect(() => {
    if (!user?.id) return;

    const loadRewardData = async () => {
      try {
        console.log('🎁 [STARTUP] Loading reward data from Supabase...');

        // Load all unlockable items
        const { data: itemsData, error: itemsError } = await supabase
          .from('unlockable_items')
          .select('*')
          .order('sort_order', { ascending: true });

        if (itemsError) throw itemsError;

        // Load user's unlocked items with joined item details
        const { data: userUnlockedData, error: userUnlockedError } = await supabase
          .from('user_unlockables')
          .select(`
            id,
            item_id,
            user_id,
            unlocked_at,
            is_selected,
            item:unlockable_items(*)
          `)
          .eq('user_id', user.id);

        if (userUnlockedError) throw userUnlockedError;

        setAllItems(itemsData || []);

        // Auto-unlock all avatars with threshold 0 (starter avatars)
        let finalUnlockables = userUnlockedData || [];
        const unlockedItemIds = new Set(finalUnlockables.map(u => u.item_id));
        const itemsToUnlock: UserUnlockable[] = [];

        (itemsData || []).forEach(item => {
          if (item.type === 'avatar' && item.unlock_threshold === 0 && !unlockedItemIds.has(item.id)) {
            console.log(`🎁 Auto-unlocking starter avatar: ${item.display_text}`);
            const newUnlockable: UserUnlockable = {
              id: `temp_${Date.now()}_${item.id}`,
              item_id: item.id,
              user_id: user.id,
              unlocked_at: new Date().toISOString(),
              is_selected: false,
              item: item
            };
            itemsToUnlock.push(newUnlockable);
          }
        });

        if (itemsToUnlock.length > 0) {
          finalUnlockables = [...finalUnlockables, ...itemsToUnlock];
          console.log(`✅ ${itemsToUnlock.length} starter avatars auto-unlocked`);
        }

        // Find selected avatar
        const selectedUnlockable = finalUnlockables.find(u => u.is_selected && u.item?.type === 'avatar');
        const selectedAvatarData = selectedUnlockable?.item || null;
        const defaultAvatar = (itemsData || []).find(i => i.type === 'avatar') || null;

        // If no selected avatar, mark first unlocked avatar as selected
        if (!selectedUnlockable && finalUnlockables.length > 0) {
          const firstAvatar = finalUnlockables.find(u => u.item?.type === 'avatar');
          if (firstAvatar) {
            firstAvatar.is_selected = true;
          }
        }

        setUserUnlockables(finalUnlockables);
        setSelectedAvatarState(selectedAvatarData || defaultAvatar);

        // Store to AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(finalUnlockables));
        console.log('✅ [STARTUP] Reward data saved to AsyncStorage');

        console.log('✅ Reward data loaded:', {
          totalItems: itemsData?.length || 0,
          avatars: avatars.length,
          badges: badges.length,
          unlockedItems: finalUnlockables.length,
          selectedAvatar: selectedAvatarData?.display_text || defaultAvatar?.display_text || 'None'
        });

        // Check for unlocks on login
        console.log('🎁 [LOGIN] Checking for items to unlock...');
        await checkUnlocksOnLogin(itemsData || [], finalUnlockables);

      } catch (error) {
        console.error('❌ Error loading reward data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRewardData();
  }, [user?.id]);

  // Check unlocks on login by reading progress from AsyncStorage
  const checkUnlocksOnLogin = async (items: UnlockableItem[], currentUnlocked: UserUnlockable[]) => {
    try {
      // Load module progress from AsyncStorage
      const moduleProgressData = await AsyncStorage.getItem('module_progress');
      if (!moduleProgressData) {
        console.log('🎁 [LOGIN] No module progress found');
        return;
      }

      const moduleProgress = JSON.parse(moduleProgressData);
      console.log('🎁 [LOGIN] Module progress loaded:', moduleProgress.length, 'modules');

      // Calculate metrics
      let totalXP = 0;
      let modulesCompleted = 0;
      moduleProgress.forEach((m: any) => {
        if (m.quizScore) {
          totalXP += m.quizScore * 10;
        }
        if (m.isCompleted) {
          modulesCompleted += 1;
        }
      });

      // Build userData for months calculation
      const userData: any = { data: {} };
      moduleProgress.forEach((m: any) => {
        const advKey = `adventure${m.adventureId}`;
        if (!userData.data[advKey]) {
          userData.data[advKey] = { modules: {} };
        }
        userData.data[advKey].modules[`module${m.moduleId}`] = {
          isCompleted: m.isCompleted,
          quizCompleted: m.quizCompleted,
          lessonsCompleted: m.lessonsCompleted,
          quizScore: m.quizScore,
          unlockedAt: m.unlockedAt
        };
      });

      const monthsActive = calculateMonthsActive(userData);

      console.log('🎁 [LOGIN] Metrics - XP:', totalXP, 'Modules:', modulesCompleted, 'Months:', monthsActive);

      // Build dynamic metrics map (completely extensible - add new metrics here)
      const metrics: Record<string, number> = {
        'xp': totalXP,
        'modules_completed': modulesCompleted,
        'months_active': monthsActive
      };

      // Check all items for unlock eligibility (dynamic lookup based on DB unlock_metric)
      for (const item of items) {
        if (!item.unlock_metric || item.unlock_threshold === null || item.unlock_threshold === undefined) continue;

        // Dynamic metric lookup
        const currentValue = metrics[item.unlock_metric];

        if (currentValue === undefined) {
          console.log(`⚠️ [LOGIN] Unknown or missing metric: ${item.unlock_metric}`);
          continue;
        }

        const alreadyUnlocked = currentUnlocked.some(u => u.item_id === item.id);

        console.log(`🎁 [LOGIN] ${item.display_text} (${item.type}): ${currentValue}/${item.unlock_threshold} ${item.unlock_metric} - unlocked: ${alreadyUnlocked}`);

        if (currentValue >= item.unlock_threshold && !alreadyUnlocked) {
          console.log(`🎉 [LOGIN] Unlocking ${item.display_text}!`);
          await unlockItem(item.id);
        }
      }
    } catch (error) {
      console.error('❌ Error checking unlocks on login:', error);
    }
  };

  // Calculate months active from user_data
  const calculateMonthsActive = (userData: any): number => {
    if (!userData?.data) return 0;

    const monthsSet = new Set<string>();
    const data = userData.data;

    Object.keys(data).forEach((adventureKey) => {
      const adventure = data[adventureKey];
      if (!adventure?.modules) return;

      Object.keys(adventure.modules).forEach((moduleKey) => {
        const module = adventure.modules[moduleKey];
        if (module.unlockedAt && module.quizCompleted) {
          const date = new Date(module.unlockedAt);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthsSet.add(monthKey);
        }
      });
    });

    return monthsSet.size;
  };

  // Check if item is unlocked
  const isUnlocked = (itemId: string): boolean => {
    return userUnlockables.some(u => u.item_id === itemId);
  };

  // Unlock new item (AsyncStorage + Supabase IMMEDIATELY)
  const unlockItem = async (itemId: string) => {
    if (!user?.id) return;

    // Check if already unlocked (single source of truth - state)
    const alreadyUnlocked = userUnlockables.some(u => u.item_id === itemId);
    if (alreadyUnlocked) {
      console.log(`🎁 Item already unlocked: ${itemId}`);
      return;
    }

    // Find item details
    const item = allItems.find(i => i.id === itemId);
    if (!item) {
      console.error(`❌ Item ${itemId} not found`);
      return;
    }

    console.log(`🎉 Unlocking item: ${item.display_text} (${item.type})`);

    // Set newly unlocked item for animation
    setNewlyUnlockedItem(item);

    // Create unlockable object
    const newUnlockable: UserUnlockable = {
      id: `temp_${Date.now()}`,
      item_id: itemId,
      user_id: user.id,
      unlocked_at: new Date().toISOString(),
      is_selected: false,
      item: item
    };

    // Update state
    const updatedUnlockables = [...userUnlockables, newUnlockable];
    setUserUnlockables(updatedUnlockables);

    // Store to AsyncStorage immediately
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUnlockables));
      console.log(`✅ Item unlocked and saved to AsyncStorage: ${item.display_text}`);
    } catch (error) {
      console.error('❌ Error saving unlock to AsyncStorage:', error);
    }

    // IMMEDIATELY save to Supabase
    try {
      console.log(`🎁 Saving unlock to Supabase...`);

      // Check if already exists in DB first
      const { data: existing } = await supabase
        .from('user_unlockables')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .single();

      if (existing) {
        console.log(`⚠️ Item already exists in DB: ${item.display_text}`);
        return;
      }

      const { error } = await supabase
        .from('user_unlockables')
        .insert({
          item_id: itemId,
          user_id: user.id,
          unlocked_at: new Date().toISOString(),
          is_selected: false
        });

      if (error && error.code !== '23505') {
        console.error('❌ Error saving unlock to Supabase:', error);
      } else {
        console.log(`✅ Unlock saved to Supabase: ${item.display_text}`);
      }
    } catch (error) {
      console.error('❌ Error syncing unlock to Supabase:', error);
    }
  };

  // Clear newly unlocked item after animation
  const clearNewlyUnlockedItem = () => {
    setNewlyUnlockedItem(null);
  };

  // Set selected avatar (AsyncStorage + Supabase IMMEDIATELY)
  const setSelectedAvatar = async (avatar: UnlockableItem) => {
    if (!user?.id) return;

    console.log(`🎁 Selecting avatar: ${avatar.display_text}`);
    setSelectedAvatarState(avatar);

    // Update is_selected field (only one avatar should be true)
    const updatedUnlockables = userUnlockables.map(u => ({
      ...u,
      is_selected: u.item?.type === 'avatar' && u.item_id === avatar.id
    }));

    setUserUnlockables(updatedUnlockables);

    // Store to AsyncStorage immediately
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUnlockables));
      console.log(`✅ Avatar selection saved to AsyncStorage: ${avatar.display_text}`);
    } catch (error) {
      console.error('❌ Error saving avatar selection to AsyncStorage:', error);
    }

    // IMMEDIATELY save to Supabase
    try {
      console.log(`🎁 Saving avatar selection to Supabase...`);

      // First, unselect all avatars for this user
      await supabase
        .from('user_unlockables')
        .update({ is_selected: false })
        .eq('user_id', user.id);

      // Then select the chosen avatar
      const { error } = await supabase
        .from('user_unlockables')
        .update({ is_selected: true })
        .eq('user_id', user.id)
        .eq('item_id', avatar.id);

      if (error) {
        console.error('❌ Error saving avatar selection to Supabase:', error);
      } else {
        console.log(`✅ Avatar selection saved to Supabase: ${avatar.display_text}`);
      }
    } catch (error) {
      console.error('❌ Error syncing avatar selection to Supabase:', error);
    }
  };

  // Check and unlock items based on user progress (IN-MEMORY ONLY)
  const checkAndUnlockItems = async (userData: any, totalXP: number, modulesCompleted?: number) => {
    if (!user?.id) return;

    console.log('🎁 [CHECK] Checking items to unlock...');
    console.log('🎁 [CHECK] XP:', totalXP, 'Modules:', modulesCompleted ?? 'not provided');

    // Calculate months active
    const monthsActive = calculateMonthsActive(userData);
    console.log('🎁 [CHECK] Months active:', monthsActive);

    // Build dynamic metrics map (completely extensible - add new metrics here)
    const metrics: Record<string, number> = {
      'xp': totalXP,
      'modules_completed': modulesCompleted ?? 0,
      'months_active': monthsActive
    };

    console.log('🎁 [CHECK] Available metrics:', metrics);

    // Check all items (dynamic lookup based on DB unlock_metric)
    for (const item of allItems) {
      if (!item.unlock_metric || item.unlock_threshold === null || item.unlock_threshold === undefined) continue;

      // Dynamic metric lookup
      const currentValue = metrics[item.unlock_metric];

      if (currentValue === undefined) {
        console.log(`⚠️ [CHECK] Unknown or missing metric: ${item.unlock_metric}`);
        continue;
      }

      const alreadyUnlocked = userUnlockables.some(u => u.item_id === item.id);

      console.log(`🎁 [CHECK] ${item.display_text}: ${currentValue}/${item.unlock_threshold} ${item.unlock_metric} - unlocked: ${alreadyUnlocked}`);

      if (currentValue >= item.unlock_threshold && !alreadyUnlocked) {
        console.log(`🎉 [CHECK] Unlocking ${item.display_text}!`);
        await unlockItem(item.id);
      }
    }
  };

  // Sync to Supabase on unmount (SHUTDOWN: AsyncStorage → Supabase)
  useEffect(() => {
    return () => {
      if (!user?.id) return;

      const syncToSupabase = async () => {
        try {
          console.log('🎁 [SHUTDOWN] Syncing unlockables from AsyncStorage to Supabase...');

          // Load from AsyncStorage
          const storedData = await AsyncStorage.getItem(STORAGE_KEY);
          if (!storedData) {
            console.log('⚠️ No unlockable data in AsyncStorage to sync');
            return;
          }

          const unlockablesToSync: UserUnlockable[] = JSON.parse(storedData);

          // Separate new unlockables (temp IDs) from existing ones
          const newUnlockables = unlockablesToSync.filter(u => u.id.startsWith('temp_'));
          const existingUnlockables = unlockablesToSync.filter(u => !u.id.startsWith('temp_'));

          // Insert new unlockables
          if (newUnlockables.length > 0) {
            const toInsert = newUnlockables.map(u => ({
              item_id: u.item_id,
              user_id: user.id,
              unlocked_at: u.unlocked_at,
              is_selected: u.is_selected || false
            }));

            const { error: insertError } = await supabase
              .from('user_unlockables')
              .insert(toInsert);

            if (insertError && insertError.code !== '23505') {
              console.error('❌ Error inserting new unlockables:', insertError);
            } else {
              console.log(`✅ Synced ${newUnlockables.length} new unlockables to Supabase`);
            }
          }

          // Update is_selected for existing unlockables
          for (const unlockable of existingUnlockables) {
            const { error: updateError } = await supabase
              .from('user_unlockables')
              .update({ is_selected: unlockable.is_selected || false })
              .eq('id', unlockable.id)
              .eq('user_id', user.id);

            if (updateError) {
              console.error(`❌ Error updating unlockable ${unlockable.id}:`, updateError);
            }
          }

          console.log('✅ [SHUTDOWN] Unlockables synced to Supabase successfully');
        } catch (error) {
          console.error('❌ Error syncing unlockables to Supabase:', error);
        }
      };

      syncToSupabase();
    };
  }, [user?.id]);

  return (
    <RewardsContext.Provider
      value={{
        allItems,
        avatars,
        badges,
        userUnlockables,
        unlockedAvatars,
        unlockedBadges,
        selectedAvatar,
        setSelectedAvatar,
        isUnlocked,
        unlockItem,
        checkAndUnlockItems,
        loading,
        newlyUnlockedItem,
        clearNewlyUnlockedItem
      }}
    >
      {children}
    </RewardsContext.Provider>
  );
}

export const useRewards = () => {
  const context = useContext(RewardsContext);
  if (!context) {
    throw new Error('useRewards must be used within RewardsProvider');
  }
  return context;
};
