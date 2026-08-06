import { useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { useUser } from '@clerk/clerk-expo';

import { analyticsService } from '@/services/AnalyticsService';

type ClerkUser = ReturnType<typeof useUser>['user'];

interface Args {
  isSignedIn: boolean | undefined;
  user: ClerkUser;
  totalXP: number;
  currentStreak: number;
  lessonsCompleted: number;
}

// Two side-effects that always travel together:
//   1) sync Clerk user props → PostHog person properties (fallback in
//      case AnalyticsWrapper missed the auth state on cold launch)
//   2) start/end PostHog page view as the tab gains/loses focus
//   3) fire profile_viewed event on each focus
export function useProfilePageView({ isSignedIn, user, totalXP, currentStreak, lessonsCompleted }: Args) {
  useEffect(() => {
    if (isSignedIn && user) {
      analyticsService.setUserProperties(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      });
    }
  }, [isSignedIn, user]);

  useFocusEffect(
    useCallback(() => {
      analyticsService.startPageView('profile', '/profile');
      analyticsService.trackProfileViewed({
        total_xp: totalXP,
        current_streak: currentStreak,
        lessons_completed: lessonsCompleted,
      });
      return () => analyticsService.endPageView('profile');
    }, [totalXP, currentStreak, lessonsCompleted]),
  );
}
