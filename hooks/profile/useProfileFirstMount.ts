import { useEffect, useState } from 'react';

// Returns `true` for the first 3 seconds after mount — enough time for
// all entrance animations + count-ups to complete. After that, flips to
// `false` so tab revisits skip animations. Uses useState (not useRef)
// because useRef flips on the next re-render which can happen before
// the animations even start, causing count-ups to show 0 → final
// instantly.
export function useProfileFirstMount() {
  const [shouldAnimate, setShouldAnimate] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShouldAnimate(false), 3000);
    return () => clearTimeout(timer);
  }, []);
  return shouldAnimate;
}
