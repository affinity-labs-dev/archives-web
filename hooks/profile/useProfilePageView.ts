import { useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { useUser } from '@clerk/clerk-expo';

import { analyticsService } from '@/services/AnalyticsService';

type ClerkUser = ReturnType<typeof useUser>['user'];

interface Args {
  isSignedIn: boolean | undefined;
  user: ClerkUser;
}

// Two side-effects that always travel together:
//   1) sync Clerk user props → PostHog person properties (fallback in
//      case AnalyticsWrapper missed the auth state on cold launch)
//   2) start/end PostHog page view as the tab gains/loses focus
export function useProfilePageView({ isSignedIn, user }: Args) {
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
      return () => analyticsService.endPageView('profile');
    }, []),
  );
}
