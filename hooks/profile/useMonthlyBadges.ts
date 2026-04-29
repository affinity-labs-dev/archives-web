import { useEffect, useMemo, useState } from 'react';

import { MONTH_NAMES } from '@/components/profile/assetMaps';
import type { MonthlyBadge } from '@/components/profile/types';

interface Args {
  moduleProgress: any[];
}

// Builds a 12-element badge array Jan–Dec. Earned months sit on the
// left naturally (past → present → future reading order).
export function useMonthlyBadges({ moduleProgress }: Args) {
  const currentYear = new Date().getFullYear();

  const monthlyBadges = useMemo<MonthlyBadge[]>(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
      const earned = moduleProgress.some((m) => {
        if (!m.quizScore || !m.unlockedAt) return false;
        const completionYear = parseInt(m.unlockedAt.substring(0, 4), 10);
        const completionMonth = parseInt(m.unlockedAt.substring(5, 7), 10);
        return completionYear === currentYear && completionMonth === month;
      });
      return {
        id: `monthly_${month}`,
        month,
        display_text: MONTH_NAMES[month - 1],
        imagePath: `ACH_MonthlyActive_${month}.png`,
        earned,
        level: month,
      };
    });
  }, [moduleProgress, currentYear]);

  // Show first 3 earned badges, or first 3 in the rotation if none earned.
  const displayedMonthlyBadges = useMemo(() => {
    const earned = monthlyBadges.filter((b) => b.earned);
    if (earned.length >= 3) return earned.slice(0, 3);
    return monthlyBadges.slice(0, 3);
  }, [monthlyBadges]);

  const earnedMonths = useMemo(
    () => monthlyBadges.filter((b) => b.earned).map((b) => b.month),
    [monthlyBadges],
  );

  const [selectedBadgeMonth, setSelectedBadgeMonth] = useState<number | null>(null);

  // Default selection to the first displayed badge once the list is
  // available. Skipping if user already picked something keeps their
  // choice across re-renders triggered by other parts of the screen.
  useEffect(() => {
    if (selectedBadgeMonth === null && displayedMonthlyBadges.length > 0) {
      setSelectedBadgeMonth(displayedMonthlyBadges[0].month);
    }
  }, [displayedMonthlyBadges, selectedBadgeMonth]);

  return {
    monthlyBadges,
    displayedMonthlyBadges,
    earnedMonths,
    selectedBadgeMonth,
    setSelectedBadgeMonth,
  };
}
