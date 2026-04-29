import { useEffect, useRef } from 'react';

// Returns `true` only on the very first render of the screen — flips to
// `false` once mounted. Drives the entrance-animation gate so the cascade
// only plays when the tab is opened for the first time, not on every
// tab-bar switch back to Profile.
export function useProfileFirstMount() {
  const hasAnimated = useRef(false);
  useEffect(() => {
    hasAnimated.current = true;
  }, []);
  return !hasAnimated.current;
}
