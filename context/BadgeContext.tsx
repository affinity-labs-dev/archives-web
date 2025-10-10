import { supabase } from '@/hooks/lib/supabase';
import { useUser } from '@clerk/clerk-expo';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

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
  totalXP: number;
  giveBadge: (badgeName: string, level: number) => Promise<void>;
  calculateTotalXP: (userData: any) => number;
  checkAndAwardBadges: (userData: any, totalXP: number) => Promise<void>;
  loading: boolean;
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

export function BadgeProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load badge definitions and user badges on mount
  useEffect(() => {
    console.log('🎖️ Badge useEffect triggered, user:', user?.id);

    if (!user?.id) {
      console.log('🎖️ No user ID, skipping badge load');
      return;
    }

    const loadBadgeData = async () => {
      try {
        console.log('🎖️ Loading badge data for user:', user.id);

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

        // Load user's progress data to calculate XP from quiz scores
        const { data: userData, error: xpError } = await supabase
          .from('user_data')
          .select('data')
          .eq('user_id', user.id)
          .single();

        if (xpError && xpError.code !== 'PGRST116') throw xpError;

        // Calculate totalXP from quiz scores in all modules
        const calculatedXP = calculateTotalXP(userData);

        // Update totalxp field in user_data
        if (userData) {
          const { error: updateError } = await supabase
            .from('user_data')
            .update({ totalxp: calculatedXP })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('❌ Error updating totalxp:', updateError);
          } else {
            console.log('✅ Updated totalxp in DB:', calculatedXP);
          }
        }

        console.log('🎖️ Raw badge definitions from DB:', badgeDefs);
        console.log('🎖️ Raw user badges from DB:', userBadgeData);
        console.log('🎖️ Calculated totalXP from quiz scores:', calculatedXP);

        setBadges(badgeDefs || []);
        setUserBadges(userBadgeData || []);
        setTotalXP(calculatedXP);

        console.log('✅ Badge data loaded:', {
          definitions: badgeDefs?.length || 0,
          earned: userBadgeData?.length || 0,
          totalXP: calculatedXP
        });
      } catch (error) {
        console.error('❌ Error loading badge data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBadgeData();
  }, [user?.id]);

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

  // Give badge to user (IN-MEMORY ONLY - no DB write)
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

    console.log(`🎉 Awarding badge in memory: ${badgeName} level ${level}`);

    // Create badge object in memory
    const newBadge: UserBadge = {
      id: `temp_${Date.now()}`, // Temporary ID
      badge_id: badgeDef.id,
      user_id: user.id,
      received_at: new Date().toISOString(),
      badge: badgeDef
    };

    // Update local state only
    setUserBadges((prev) => [...prev, newBadge]);
    console.log(`✅ Badge awarded (in memory): ${badgeName} level ${level}`);
  };

  // Check and award badges based on user data (IN-MEMORY ONLY)
  const checkAndAwardBadges = async (userData: any, currentXP: number) => {
    if (!user?.id) return;

    setTotalXP(currentXP);

    // Calculate all metric values
    const metrics: Record<string, number> = {
      'ACH_EarnedXP': currentXP,
      'ACH_MonthlyActive': calculateMonthsActive(userData)
    };

    // Check all badge definitions against thresholds
    for (const badge of badges) {
      const currentValue = metrics[badge.name];
      if (currentValue !== undefined && currentValue >= badge.threshold) {
        await giveBadge(badge.name, badge.level);
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

        // Check completion criteria
        if (
          module.unlockedAt &&
          module.isCompleted &&
          module.quizCompleted &&
          module.lessonsCompleted &&
          module.quizScore != null
        ) {
          const date = new Date(module.unlockedAt);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthsSet.add(monthKey);
        }
      });
    });

    return monthsSet.size;
  };

  // Sync badges to database on unmount (shutdown/logout)
  useEffect(() => {
    return () => {
      if (!user?.id) return;

      console.log('🎖️ Syncing badges to database on shutdown...');

      // Filter out temporary badges (newly earned in this session)
      const newBadges = userBadges.filter((ub) => ub.id.startsWith('temp_'));

      if (newBadges.length === 0) {
        console.log('✅ No new badges to sync');
        return;
      }

      // Sync new badges to database
      const syncBadges = async () => {
        try {
          const badgesToInsert = newBadges.map((ub) => ({
            badge_id: ub.badge_id,
            user_id: user.id,
            received_at: ub.received_at
          }));

          const { error } = await supabase
            .from('user_badges')
            .insert(badgesToInsert);

          if (error && error.code !== '23505') throw error;

          console.log(`✅ Synced ${newBadges.length} badges to database`);
        } catch (error) {
          console.error('❌ Error syncing badges:', error);
        }
      };

      syncBadges();

      // Also sync totalXP to user_data
      const syncXP = async () => {
        try {
          const { error } = await supabase
            .from('user_data')
            .update({ totalxp: totalXP })
            .eq('user_id', user.id);

          if (error) throw error;
          console.log(`✅ Synced totalXP: ${totalXP}`);
        } catch (error) {
          console.error('❌ Error syncing totalXP:', error);
        }
      };

      syncXP();
    };
  }, [user?.id, userBadges, totalXP]);

  return (
    <BadgeContext.Provider
      value={{
        badges,
        userBadges,
        totalXP,
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
