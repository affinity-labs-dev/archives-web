import { useFocusEffect } from '@react-navigation/native';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface PersistentMascotState {
  visibleCount: number;
  request: () => () => void;
}

const Ctx = createContext<PersistentMascotState | null>(null);

export function PersistentMascotProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  // Refcounted: each focused mascot screen +1, releases -1. Counter never
  // dips to 0 during a transition between two mascot screens (incoming
  // focus fires before outgoing blur), so the layout-level Mascot never
  // flickers off mid-cross-fade.
  const request = useCallback(() => {
    setCount((n) => n + 1);
    return () => setCount((n) => Math.max(0, n - 1));
  }, []);

  const value = useMemo(() => ({ visibleCount: count, request }), [count, request]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useCtx(): PersistentMascotState {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useMascotPresence must be used inside PersistentMascotProvider');
  }
  return v;
}

export function usePersistentMascotState(): PersistentMascotState {
  return useCtx();
}

/**
 * Call from a screen body to hold the persistent layout-level Mascot visible
 * while this screen is focused. Released automatically on blur.
 */
export function useMascotPresence(): void {
  const { request } = useCtx();
  useFocusEffect(
    useCallback(() => {
      const release = request();
      return release;
    }, [request]),
  );
}
