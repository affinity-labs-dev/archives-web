// Daily-story guided walkthrough — Provider.
// Owns the state machine, event bus, target registry, and AsyncStorage gating.
// Two child overlays (one per surface — see steps.ts) consume this context to
// render the bubble + spotlight + pulse for the active step.
//
// Why a single Provider instead of two independent overlays:
//   - The Modal opens a separate native window on RN. Children inside the
//     Modal do NOT share refs with siblings of the home tree. But they DO
//     share React Context as long as the Provider sits above both — which it
//     does (mounted at the top of TodayScreen, before both home + Modal).
//   - State (current step, idx, active flag) must stay coherent across the
//     home↔modal handoff at step 2→3 and again on tour finish. A single
//     state-of-truth in this Provider avoids the dual-overlay desync we'd
//     hit with two independent IIFEs.

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PropsWithChildren,
} from 'react';
import { type View } from 'react-native';

import { WALKTHROUGH_KEYS } from '@/constants/WalkthroughKeys';
import AppLogger from '@/services/AppLogger';

import {
  STEPS,
  TOTAL_STEPS,
  type WalkthroughStep,
  type WalkthroughTargetId,
} from './steps';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Modal slot states from useTodayModalSlots — provider's view of the lesson
// modal. 'none' means no modal mounted (home surface visible).
export type WalkthroughModal = 'none' | 'video' | 'reading' | 'quiz';

// Public context shape consumed by overlays + integration points.
type WalkthroughContextValue = {
  // ---- State (read-only for consumers) ----
  // True between start() and finish/skip.
  active: boolean;
  // Index into STEPS; only meaningful when active.
  idx: number;
  // Current step object, or null when not active.
  currentStep: WalkthroughStep | null;
  // True while waiting for showOn event — overlay should render NOTHING
  // (no dim, no bubble) so the user can interact freely with the screen.
  layerHidden: boolean;

  // ---- Imperative API ----
  // Force-start the tour. Used by Phase 4 dev reset; auto-start path uses
  // the internal effect below. idx defaults to 0.
  start: (idx?: number) => void;
  // User taps Skip Tour or back-navs out of a modal step. Marks SEEN.
  skip: () => void;
  // Advance to the next step. Called by:
  //   - 'next' advanceOn → overlay's Next button onPress.
  //   - 'screenEntered:N' → notifyModalChanged() below.
  //   - 'event:NAME' → dispatch(NAME) below.
  // Idempotent if not active.
  advance: () => void;

  // ---- Integration: child components dispatch named events ----
  // TodayVideoLesson dispatches 'read-sheet-open' / 'read-sheet-close'.
  // TodayScrollableLesson dispatches 'voice-toggled' / 'voice-stopped'.
  // Engine listens internally to advance / un-gate showOn.
  dispatch: (event: string) => void;

  // ---- Integration: today.tsx reports modal slot transitions ----
  // Called from a useEffect watching slotAModal/slotBModal. Provider
  // synthesizes 'screenEntered:<modal>' for advance triggers, and
  // dismisses the tour if the user backs out to home mid-modal-step.
  notifyModalChanged: (modal: WalkthroughModal) => void;

  // ---- Target registry ----
  // useWalkthroughTarget('streak') registers a ref under that ID. Overlay's
  // measure() looks it up at showStep time. Returns an unregister callback.
  registerTarget: (id: WalkthroughTargetId, ref: MutableRefObject<View | null>) => () => void;
  // Overlay reads the registered ref to call measureInWindow().
  getTargetRef: (id: WalkthroughTargetId) => MutableRefObject<View | null> | null;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null);

export function useTodayWalkthrough(): WalkthroughContextValue {
  const ctx = useContext(WalkthroughContext);
  if (!ctx) {
    throw new Error(
      'useTodayWalkthrough must be used inside <TodayWalkthroughProvider>',
    );
  }
  return ctx;
}

// Optional flavor — for components that may render outside the provider in
// tests or storybook. Returns null instead of throwing.
export function useTodayWalkthroughOptional(): WalkthroughContextValue | null {
  return useContext(WalkthroughContext);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function TodayWalkthroughProvider({ children }: PropsWithChildren) {
  // ---- Core state ----
  const [active, setActive] = useState(false);
  const [idx, setIdx] = useState(0);
  const [layerHidden, setLayerHidden] = useState(false);

  // Refs that mirror state for use inside event-driven callbacks. React state
  // can be stale by the time a dispatched event handler reads it (especially
  // when multiple synchronous events fire in the same tick).
  const activeRef = useRef(false);
  const idxRef = useRef(0);

  // Event bus — one Map of event-name → Set of callbacks. Cleared on tour
  // finish so stale listeners can't fire on the next replay.
  const subscribersRef = useRef<Map<string, Set<() => void>>>(new Map());

  // Target registry — id → ref to a measurable View.
  const targetsRef = useRef<Map<WalkthroughTargetId, MutableRefObject<View | null>>>(new Map());

  // Tracks the most recent modal value from notifyModalChanged. Used by the
  // back-out detection below — we only treat 'none' as a dismissal if the
  // CURRENT step expects modal context (surface === 'modal').
  const lastModalRef = useRef<WalkthroughModal>('none');

  // ---- State helpers ----
  const setActiveBoth = useCallback((v: boolean) => {
    activeRef.current = v;
    setActive(v);
  }, []);
  const setIdxBoth = useCallback((v: number) => {
    idxRef.current = v;
    setIdx(v);
  }, []);

  // ---- Persistence ----
  // Mark seen + tear down. Called on finish (advance past last step) and skip.
  const finish = useCallback(async (markSeen: boolean) => {
    AppLogger.info('walkthrough', 'finish', { idx: idxRef.current, markSeen });
    setActiveBoth(false);
    setLayerHidden(false);
    setIdxBoth(0);
    subscribersRef.current.clear();
    if (markSeen) {
      try {
        await AsyncStorage.setItem(WALKTHROUGH_KEYS.DAILY_STORY_TOUR_SEEN, '1');
      } catch (err) {
        AppLogger.warn('walkthrough', 'AsyncStorage SEEN write failed', {
          error: String(err),
        });
      }
    }
  }, [setActiveBoth, setIdxBoth]);

  const skip = useCallback(() => {
    finish(true);
  }, [finish]);

  // ---- Step navigation ----
  // showStep just commits idx + layerHidden state. Animation timing
  // (entry delay, target measure, bubble entrance) is owned by the overlay
  // components — Provider only manages the data plane.
  const showStep = useCallback((targetIdx: number) => {
    if (targetIdx >= TOTAL_STEPS) {
      finish(true);
      return;
    }
    const step = STEPS[targetIdx];
    setIdxBoth(targetIdx);
    if (step.showOn) {
      // Hide layer until showOn event fires. Overlay watches layerHidden.
      setLayerHidden(true);
    } else {
      setLayerHidden(false);
    }
  }, [finish, setIdxBoth]);

  const advance = useCallback(() => {
    if (!activeRef.current) return;
    const next = idxRef.current + 1;
    showStep(next);
  }, [showStep]);

  // Force-start. Used by auto-start effect + dev reset.
  const start = useCallback((startIdx: number = 0) => {
    AppLogger.info('walkthrough', 'start', { idx: startIdx });
    setActiveBoth(true);
    showStep(startIdx);
  }, [setActiveBoth, showStep]);

  // ---- Event bus ----
  const subscribe = useCallback((event: string, cb: () => void): (() => void) => {
    let set = subscribersRef.current.get(event);
    if (!set) {
      set = new Set();
      subscribersRef.current.set(event, set);
    }
    set.add(cb);
    return () => {
      const s = subscribersRef.current.get(event);
      if (s) s.delete(cb);
    };
  }, []);

  const dispatch = useCallback((event: string) => {
    if (!activeRef.current) return;
    const set = subscribersRef.current.get(event);
    if (!set) return;
    // Copy so a callback that unsubscribes itself doesn't mutate during iteration.
    const callbacks = Array.from(set);
    callbacks.forEach((cb) => {
      try { cb(); } catch (err) {
        AppLogger.warn('walkthrough', 'subscriber error', { event, error: String(err) });
      }
    });
  }, []);

  // ---- Internal: current step's advance/showOn wiring ----
  // When idx changes, subscribe to the new step's advance trigger (and showOn
  // if any). Cleanup unsubscribes both. This effect is the engine's heart —
  // every step transition runs through here.
  useEffect(() => {
    if (!active) return;
    const step = STEPS[idx];
    if (!step) return;

    const cleanups: (() => void)[] = [];

    // Wire advance trigger.
    if (step.advanceOn === 'next') {
      // 'next' is driven by overlay's Next button which calls advance() directly.
      // Nothing to subscribe to — overlay owns the wiring.
    } else if (step.advanceOn.startsWith('screenEntered:')) {
      const targetModal = step.advanceOn.split(':')[1] as WalkthroughModal;
      cleanups.push(
        subscribe(`screenEntered:${targetModal}`, () => advance()),
      );
    } else if (step.advanceOn.startsWith('event:')) {
      const eventName = step.advanceOn.split(':')[1];
      cleanups.push(subscribe(eventName, () => advance()));
    }

    // Wire showOn gate — fires once, un-hides the layer.
    if (step.showOn) {
      const eventName = step.showOn.split(':')[1];
      const unsubscribe = subscribe(eventName, () => {
        setLayerHidden(false);
        unsubscribe();
      });
      cleanups.push(unsubscribe);
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [active, idx, subscribe, advance]);

  // ---- Modal change handler ----
  const notifyModalChanged = useCallback((modal: WalkthroughModal) => {
    lastModalRef.current = modal;
    if (!activeRef.current) return;

    const step = STEPS[idxRef.current];
    if (!step) return;

    // Synthesize screenEntered for advance triggers. Skip 'none' — that's not
    // a step target; it's a dismissal signal handled below.
    if (modal !== 'none') {
      dispatch(`screenEntered:${modal}`);
    }

    // Back-out detection: if we're mid-modal step and the modal closes to
    // home, treat as "let me explore" — finish + mark seen. Mirrors mock
    // back-nav dismissal (HANDOVER.md line 5: "Back-nav dismissal matches
    // user intent").
    if (modal === 'none' && step.surface === 'modal') {
      AppLogger.info('walkthrough', 'modal dismissed mid-tour, finishing', {
        idx: idxRef.current,
      });
      finish(true);
    }
  }, [dispatch, finish]);

  // ---- Target registry ----
  const registerTarget = useCallback((id: WalkthroughTargetId, ref: MutableRefObject<View | null>): (() => void) => {
    targetsRef.current.set(id, ref);
    return () => {
      // Only delete if THIS ref is still the one registered — protects
      // against unmount-after-remount races where the new ref overwrote ours.
      if (targetsRef.current.get(id) === ref) {
        targetsRef.current.delete(id);
      }
    };
  }, []);

  const getTargetRef = useCallback((id: WalkthroughTargetId): MutableRefObject<View | null> | null => {
    return targetsRef.current.get(id) ?? null;
  }, []);

  // Auto-start gate moved out of the Provider when we hoisted Provider to
  // app/_layout.tsx — running it on Provider mount would fire at app boot,
  // before the user reaches the today tab. The trigger lives in today.tsx
  // via useFocusEffect so it only checks PENDING/SEEN when the today tab
  // is actually focused. Provider stays a pure state-machine + UI source.

  // ---- Memoized context value ----
  const currentStep = active ? STEPS[idx] ?? null : null;

  const value = useMemo<WalkthroughContextValue>(() => ({
    active,
    idx,
    currentStep,
    layerHidden,
    start,
    skip,
    advance,
    dispatch,
    notifyModalChanged,
    registerTarget,
    getTargetRef,
  }), [
    active,
    idx,
    currentStep,
    layerHidden,
    start,
    skip,
    advance,
    dispatch,
    notifyModalChanged,
    registerTarget,
    getTargetRef,
  ]);

  return (
    <WalkthroughContext.Provider value={value}>
      {children}
    </WalkthroughContext.Provider>
  );
}
