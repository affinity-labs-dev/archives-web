import { supabase } from '@/hooks/lib/supabase';
import { useUser } from '@clerk/clerk-expo';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BadgeDefinition {
  id: string;
  name: string;
  level: number;
  displayName: string;
  threshold: number;
}

interface UserBadge {
  id: string;
  badge_id: string;
  user_id: string;
  received_at: string;
  badge?: BadgeDefinition;
}

interface BadgeContextType {
  badges: BadgeDefinition[];
  userBadges: UserBadge[];
  giveBadge: (badgeName: string, level: number) => Promise<void>;
  calculateTotalXP: (userData: any) => number;
  checkAndAwardBadges: (userData: any, totalXP: number) => Promise<void>;
  loading: boolean;
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

const STORAGE_KEY = 'user_badges_data';

export function BadgeProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  // Load badge definitions and user badges on mount (STARTUP: Supabase → AsyncStorage)
  useEffect(() => {
    console.log('🎖️ Badge useEffect triggered, user:', user?.id);

    if (!user?.id) {
      console.log('🎖️ No user ID, skipping badge load');
      return;
    }

    const loadBadgeData = async () => {
      try {
        console.log('🎖️ [STARTUP] Loading badge data from Supabase for user:', user.id);

        // Load all badge definitions
        const { data: badgeDefs, error: badgeError } = await supabase
          .from('badge_definitions')
          .select('*')
          .order('name', { ascending: true })
          .order('level', { ascending: true });

        if (badgeError) throw badgeError;

        // Load user's earned badges
        const { data: userBadgeData, error: userBadgeError } = await supabase
          .from('user_badges')
          .select(`
            id,
            badge_id,
            user_id,
            received_at,
            badge:badge_definitions(*)
          `)
          .eq('user_id', user.id);

        if (userBadgeError) throw userBadgeError;

        console.log('🎖️ Raw badge definitions from DB:', badgeDefs);
        console.log('🎖️ Raw user badges from DB:', userBadgeData);

        setBadges(badgeDefs || []);
        setUserBadges(userBadgeData || []);

        // Store to AsyncStorage (Supabase → AsyncStorage)
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userBadgeData || []));
        console.log('✅ [STARTUP] Badge data saved to AsyncStorage');

        console.log('✅ Badge data loaded:', {
          definitions: badgeDefs?.length || 0,
          earned: userBadgeData?.length || 0
        });

        // Check and award badges on login
        console.log('🎖️ [LOGIN] Checking for badges to award...');
        await checkBadgesOnLogin(badgeDefs || [], userBadgeData || []);

      } catch (error) {
        console.error('❌ Error loading badge data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBadgeData();
  }, [user?.id]);

  // Check badges on login by reading progress from AsyncStorage
  const checkBadgesOnLogin = async (badgeDefs: BadgeDefinition[], currentUserBadges: UserBadge[]) => {
    try {
      // Load module progress from AsyncStorage
      const moduleProgressData = await AsyncStorage.getItem('module_progress');
      if (!moduleProgressData) {
        console.log('🎖️ [LOGIN] No module progress found');
        return;
      }

      const moduleProgress = JSON.parse(moduleProgressData);
      console.log('🎖️ [LOGIN] Module progress loaded:', moduleProgress.length, 'modules');

      // Calculate XP
      let totalXP = 0;
      moduleProgress.forEach((m: any) => {
        if (m.quizScore) {
          totalXP += m.quizScore * 10;
        }
      });
      console.log('🎖️ [LOGIN] Total XP:', totalXP);

      // Build userData structure for monthly badge checking
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

      // Calculate months active
      const monthsActive = calculateMonthsActive(userData);
      console.log('🎖️ [LOGIN] Months active:', monthsActive);

      const metrics: Record<string, number> = {
        'ACH_EarnedXP': totalXP,
        'ACH_MonthlyActive': monthsActive
      };

      // Check all badge definitions
      for (const badge of badgeDefs) {
        const currentValue = metrics[badge.name];
        const alreadyHas = currentUserBadges.some(ub => ub.badge?.name === badge.name && ub.badge?.level === badge.level);

        console.log(`🎖️ [LOGIN] ${badge.name} L${badge.level}: current=${currentValue}, threshold=${badge.threshold}, has=${alreadyHas}`);

        if (currentValue !== undefined && currentValue >= badge.threshold && !alreadyHas) {
          console.log(`🎉 [LOGIN] Awarding ${badge.name} L${badge.level}!`);
          await giveBadge(badge.name, badge.level);
        }
      }
    } catch (error) {
      console.error('❌ Error checking badges on login:', error);
    }
  };

  // Calculate total XP from user_data modules
  const calculateTotalXP = (userData: any): number => {
    if (!userData?.data) return 0;

    let xp = 0;
    const data = userData.data;

    // Iterate through all adventures
    Object.keys(data).forEach((adventureKey) => {
      const adventure = data[adventureKey];
      if (!adventure?.modules) return;

      // Iterate through all modules
      Object.keys(adventure.modules).forEach((moduleKey) => {
        const module = adventure.modules[moduleKey];
        if (module?.quizScore != null) {
          // Each correct answer = 10 XP
          xp += module.quizScore * 10;
        }
      });
    });

    return xp;
  };

  // Give badge to user (AsyncStorage + Supabase IMMEDIATELY)
  const giveBadge = async (badgeName: string, level: number) => {
    if (!user?.id) return;

    // Check if already earned in memory
    const alreadyHas = userBadges.some(
      (ub) => ub.badge?.name === badgeName && ub.badge?.level === level
    );

    if (alreadyHas) return;

    // Find badge definition
    const badgeDef = badges.find((b) => b.name === badgeName && b.level === level);
    if (!badgeDef) {
      console.error(`❌ Badge ${badgeName} level ${level} not found in definitions`);
      return;
    }

    console.log(`🎉 Awarding badge: ${badgeName} level ${level}`);

    // Create badge object
    const newBadge: UserBadge = {
      id: `temp_${Date.now()}`, // Temporary ID
      badge_id: badgeDef.id,
      user_id: user.id,
      received_at: new Date().toISOString(),
      badge: badgeDef
    };

    // Update state
    const updatedBadges = [...userBadges, newBadge];
    setUserBadges(updatedBadges);

    // Store to AsyncStorage immediately
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBadges));
      console.log(`✅ Badge awarded and saved to AsyncStorage: ${badgeName} level ${level}`);
    } catch (error) {
      console.error('❌ Error saving badge to AsyncStorage:', error);
    }

    // IMMEDIATELY save to Supabase (don't wait for shutdown)
    try {
      console.log(`🎖️ Saving new badge to Supabase...`);

      // Check if already exists in DB first
      const { data: existing } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', user.id)
        .eq('badge_id', badgeDef.id)
        .single();

      if (existing) {
        console.log(`⚠️ Badge already exists in DB: ${badgeName} level ${level}`);
        return;
      }

      const { error } = await supabase
        .from('user_badges')
        .insert({
          badge_id: badgeDef.id,
          user_id: user.id,
          received_at: new Date().toISOString()
        });

      if (error && error.code !== '23505') {
        console.error('❌ Error saving badge to Supabase:', error);
      } else {
        console.log(`✅ Badge saved to Supabase: ${badgeName} level ${level}`);
      }
    } catch (error) {
      console.error('❌ Error syncing badge to Supabase:', error);
    }
  };

  // Check and award badges based on user data (IN-MEMORY ONLY)
  const checkAndAwardBadges = async (userData: any, currentXP: number) => {
    if (!user?.id) return;

    console.log('🎖️ [BadgeCheck] Starting badge check...');
    console.log('🎖️ [BadgeCheck] Current XP:', currentXP);

    // Calculate all metric values
    const monthsActive = calculateMonthsActive(userData);
    const metrics: Record<string, number> = {
      'ACH_EarnedXP': currentXP,
      'ACH_MonthlyActive': monthsActive
    };

    console.log('🎖️ [BadgeCheck] Metrics:', metrics);
    console.log('🎖️ [BadgeCheck] Badge definitions:', badges.length);

    // Check all badge definitions against thresholds
    for (const badge of badges) {
      const currentValue = metrics[badge.name];
      const alreadyHas = userBadges.some(ub => ub.badge?.name === badge.name && ub.badge?.level === badge.level);

      console.log(`🎖️ [BadgeCheck] ${badge.name} L${badge.level}: current=${currentValue}, threshold=${badge.threshold}, has=${alreadyHas}`);

      if (currentValue !== undefined && currentValue >= badge.threshold) {
        if (!alreadyHas) {
          console.log(`🎉 [BadgeCheck] Awarding ${badge.name} L${badge.level}!`);
          await giveBadge(badge.name, badge.level);
        } else {
          console.log(`✅ [BadgeCheck] Already has ${badge.name} L${badge.level}`);
        }
      }
    }
  };

  // Calculate months active from user_data
  const calculateMonthsActive = (userData: any): number => {
    if (!userData?.data) return 0;

    const monthsSet = new Set<string>();
    const data = userData.data;

    // Iterate through all adventures
    Object.keys(data).forEach((adventureKey) => {
      const adventure = data[adventureKey];
      if (!adventure?.modules) return;

      // Iterate through all modules
      Object.keys(adventure.modules).forEach((moduleKey) => {
        const module = adventure.modules[moduleKey];

        // Simple check: quiz completed + month from unlockedAt
        if (module.unlockedAt && module.quizCompleted) {
          const date = new Date(module.unlockedAt);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthsSet.add(monthKey);
          console.log(`🎖️ Month counted: ${monthKey} for ${adventureKey} ${moduleKey}`);
        }
      });
    });

    console.log(`🎖️ Total unique months active: ${monthsSet.size}`, Array.from(monthsSet));
    return monthsSet.size;
  };

  // Sync badges to Supabase on unmount (SHUTDOWN: AsyncStorage → Supabase)
  useEffect(() => {
    return () => {
      if (!user?.id) return;

      const syncToSupabase = async () => {
        try {
          console.log('🎖️ [SHUTDOWN] Syncing badges from AsyncStorage to Supabase...');

          // Load from AsyncStorage
          const storedData = await AsyncStorage.getItem(STORAGE_KEY);
          if (!storedData) {
            console.log('⚠️ No badge data in AsyncStorage to sync');
            return;
          }

          const badgesToSync: UserBadge[] = JSON.parse(storedData);

          // Filter out temporary badges (newly earned in this session)
          const newBadges = badgesToSync.filter((ub) => ub.id.startsWith('temp_'));

          if (newBadges.length === 0) {
            console.log('✅ No new badges to sync');
            return;
          }

          // Insert new badges to database
          const badgesToInsert = newBadges.map((ub) => ({
            badge_id: ub.badge_id,
            user_id: user.id,
            received_at: ub.received_at
          }));

          const { error } = await supabase
            .from('user_badges')
            .insert(badgesToInsert);

          if (error && error.code !== '23505') {
            console.error('❌ Error inserting new badges:', error);
          } else {
            console.log(`✅ [SHUTDOWN] Synced ${newBadges.length} badges to Supabase`);
          }
        } catch (error) {
          console.error('❌ Error syncing badges to Supabase:', error);
        }
      };

      syncToSupabase();
    };
  }, [user?.id]);

  return (
    <BadgeContext.Provider
      value={{
        badges,
        userBadges,
        giveBadge,
        calculateTotalXP,
        checkAndAwardBadges,
        loading
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
}

export const useBadges = () => {
  const context = useContext(BadgeContext);
  if (!context) {
    throw new Error('useBadges must be used within BadgeProvider');
  }
  return context;
};
