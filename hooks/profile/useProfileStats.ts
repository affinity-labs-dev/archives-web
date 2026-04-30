import { useEffect, useMemo, useState } from 'react';

import { calculateLessonsCompleted } from '@/gamification';
import { supabase } from '@/hooks/lib/supabase';
import type { NewUserProgress } from '@/components/profile/types';

interface Args {
  moduleProgress: any;
  progressEntries: any[];
  newUserProgress: NewUserProgress[];
  calculateModulesCompleted: () => number;
  totalXP: number;
}

export function useProfileStats({
  moduleProgress,
  progressEntries,
  newUserProgress,
  calculateModulesCompleted,
  totalXP,
}: Args) {
  const modulesFinished = useMemo(
    () => calculateModulesCompleted(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moduleProgress, newUserProgress, calculateModulesCompleted],
  );

  const lessonsCompleted = useMemo(
    () => calculateLessonsCompleted(moduleProgress, progressEntries),
    [moduleProgress, progressEntries],
  );

  // Mo–Su daily XP buckets for the WeeklyXPChart. Read from the
  // unified progress array (post-migration), falling back to legacy
  // `(quizCorrectAnswers || 0) * 10` when an entry pre-dates the
  // explicit `xp_earned` column.
  const weeklyXPData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const dailyXP = [0, 0, 0, 0, 0, 0, 0];

    for (const entry of progressEntries) {
      const dateStr = entry.completedAt || entry.first_attempt_at;
      if (!dateStr) continue;
      const entryDate = new Date(dateStr);
      if (entryDate < monday) continue;
      const diffDays = Math.floor(
        (entryDate.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays >= 0 && diffDays < 7) {
        const xp = entry.xp_earned || (entry.quizCorrectAnswers || 0) * 10;
        dailyXP[diffDays] += xp;
      }
    }

    return dailyXP;
  }, [progressEntries]);

  const weeklyXPTotal = useMemo(
    () => weeklyXPData.reduce((sum, v) => sum + v, 0),
    [weeklyXPData],
  );

  // Minutes learned — estimate 5 mins per lesson
  const minutesLearned = (Number(lessonsCompleted) || 0) * 5;

  // XP percentile ranking — Supabase RPC (server-side calculation)
  const [xpPercentile, setXpPercentile] = useState<number | null>(null);
  useEffect(() => {
    if (totalXP <= 0) return;
    (async () => {
      try {
        const { data: pct, error } = await supabase.rpc('get_xp_percentile', { user_xp: totalXP });
        if (error || pct === null || pct === undefined) return;
        setXpPercentile(Number(pct));
      } catch {
        // Silently fail — percentile is non-critical
      }
    })();
  }, [totalXP]);

  return { modulesFinished, lessonsCompleted, minutesLearned, xpPercentile, weeklyXPData, weeklyXPTotal };
}
