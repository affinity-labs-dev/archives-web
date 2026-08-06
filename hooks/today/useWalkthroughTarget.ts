// useWalkthroughTarget — child components call this to register a measurable
// View under a target ID. The provider's overlay reads the ref at showStep
// time and calls measureInWindow() to get the rect for spotlight + bubble
// placement.
//
// Usage in a leaf component:
//   const ref = useWalkthroughTarget('streak');
//   return <View ref={ref} ...>{...}</View>;
//
// The hook is a no-op (returns a fresh ref that nobody reads) when used
// outside the provider — protects test/storybook environments. Provider
// presence is the single source of truth for whether walkthrough is active.

import { useEffect, useRef } from 'react';
import { type View } from 'react-native';

import {
  useTodayWalkthroughOptional,
} from '@/components/today/walkthrough/TodayWalkthroughProvider';
import type { WalkthroughTargetId } from '@/components/today/walkthrough/steps';

export function useWalkthroughTarget(id: WalkthroughTargetId) {
  const ctx = useTodayWalkthroughOptional();
  const ref = useRef<View | null>(null);

  useEffect(() => {
    if (!ctx) return;
    // Register on mount, deregister on unmount. Provider's registry is a
    // Map<id, ref> — re-registering the same id with a different ref simply
    // overwrites; the cleanup callback only removes if THIS ref is still
    // the registered one (race-safe).
    return ctx.registerTarget(id, ref);
    // We intentionally exclude `ctx` from the dep list — context value is
    // stable across renders (memoized in provider) and adding it here would
    // cause unnecessary register/unregister cycles when an unrelated state
    // change in the provider triggers a re-render. The id is the only thing
    // a consumer would meaningfully change at runtime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return ref;
}
