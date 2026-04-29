import { useMemo } from 'react';

import { calculateLessonsCompleted } from '@/gamification';
import type { NewUserProgress } from '@/components/profile/types';

interface Args {
  moduleProgress: any;
  progressEntries: any[];
  newUserProgress: NewUserProgress[];
  calculateModulesCompleted: () => number;
}

export function useProfileStats({
  moduleProgress,
  progressEntries,
  newUserProgress,
  calculateModulesCompleted,
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

  return { modulesFinished, lessonsCompleted, weeklyXPData, weeklyXPTotal };
}
