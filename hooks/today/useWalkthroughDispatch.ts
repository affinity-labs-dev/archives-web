// useWalkthroughDispatch — call site for components that need to advance
// the walkthrough engine via named events (read-sheet-open, voice-toggled,
// read-sheet-close, voice-stopped).
//
// Safe outside the provider — returns a no-op so components like
// TodayVideoLesson / TodayScrollableLesson can dispatch unconditionally
// without `if (provider)` guards every call site, and so they remain
// usable in non-walkthrough contexts (e.g. lesson previews).

import { useCallback } from 'react';

import { useTodayWalkthroughOptional } from '@/components/today/walkthrough/TodayWalkthroughProvider';

export function useWalkthroughDispatch(): (event: string) => void {
  const ctx = useTodayWalkthroughOptional();
  return useCallback((event: string) => {
    if (!ctx) return;
    ctx.dispatch(event);
  }, [ctx]);
}
