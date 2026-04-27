import { useEffect, useRef, useState } from "react";
import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import AppLogger from "@/services/AppLogger";

export type ModalState = "none" | "video" | "reading" | "quiz";

interface UseTodayModalSlotsArgs {
  /**
   * Called whenever a modal opens via `openModal` (not via animated
   * transition). The arg is the card index 1=video, 2=reading, 3=quiz.
   * Lets PostHog tracking stay outside the hook.
   */
  onCardViewed?: (cardIndex: 1 | 2 | 3) => void;
}

/**
 * Dual-slot crossfade modal animation system.
 *
 * Two absolutely-positioned slots (A and B) allow both outgoing and
 * incoming modal content to be visible simultaneously during the
 * crossfade — no white flash between video → reading → quiz, AND
 * because both slots render their lesson chrome at the same screen
 * position, the floating header (back arrow + progress bar) appears
 * stationary through the transition. Matches the daily-story HTML
 * mock (`Downloads/02 daily story/index.html:1720-1768`) which uses
 * a `power2.inOut` 0.4s opacity crossfade for the same reason.
 *
 * `openModal` and `closeModal` set state instantly without animation;
 * `animateModalTransition` runs the 400ms crossfade between two
 * already-mounted modal contents.
 */
export function useTodayModalSlots({
  onCardViewed,
}: UseTodayModalSlotsArgs = {}) {
  const [activeModal, setActiveModal] = useState<ModalState>("none");
  const [previousModal, setPreviousModal] = useState<ModalState>("none");

  const activeSlotRef = useRef<"A" | "B">("A");
  const [slotAModal, setSlotAModal] = useState<ModalState>("none");
  const [slotBModal, setSlotBModal] = useState<ModalState>("none");
  const isModalTransitioning = useRef(false);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const [outgoingSlot, setOutgoingSlot] = useState<"A" | "B" | null>(null);

  // Cleanup on unmount — prevent state updates after component is removed
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      isModalTransitioning.current = false;
    };
  }, []);

  // Slot A animation values
  const slotATranslateX = useSharedValue(0);
  const slotAOpacity = useSharedValue(1);
  const slotAZIndex = useSharedValue(1);

  // Slot B animation values
  const slotBTranslateX = useSharedValue(0);
  const slotBOpacity = useSharedValue(0);
  const slotBZIndex = useSharedValue(0);

  // Crossfade-only — translateX is intentionally left out of the
  // animated style so the slots stay locked at the same screen
  // position. Each lesson renders its own TodayLessonChrome at the
  // same `top` offset, so during the opacity crossfade the user
  // perceives the chrome as stationary (mock `index.html:1720-1768`
  // — same `power2.inOut` 0.4s crossfade pattern). The translateX
  // shared values are kept around purely so existing call sites that
  // still write to them don't break; they're just not read here.
  const slotAAnimatedStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: slotAOpacity.value,
    zIndex: slotAZIndex.value,
  }));

  const slotBAnimatedStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: slotBOpacity.value,
    zIndex: slotBZIndex.value,
  }));

  // Clean up after transition completes — always releases the lock
  const finishTransition = (
    newActiveSlot: "A" | "B",
    nextModal: ModalState,
  ) => {
    // Clear safety timeout (safe to call from JS thread)
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    if (!isMountedRef.current) return; // Component unmounted
    if (!isModalTransitioning.current) return; // Already finished (safety timeout race)
    try {
      activeSlotRef.current = newActiveSlot;
      // Clear the outgoing slot
      if (newActiveSlot === "A") {
        setSlotBModal("none");
        slotBTranslateX.value = 0;
        slotBOpacity.value = 0;
        slotBZIndex.value = 0;
      } else {
        setSlotAModal("none");
        slotATranslateX.value = 0;
        slotAOpacity.value = 0;
        slotAZIndex.value = 0;
      }
      // Sync activeModal for other effects (music pause, chat message, etc.)
      setActiveModal(nextModal);
      setOutgoingSlot(null);
    } catch (error) {
      AppLogger.error("quiz", "[Today] Error in finishTransition:", {}, error);
      // Force full reset to recover
      setSlotAModal("none");
      setSlotBModal("none");
      setActiveModal("none");
      setOutgoingSlot(null);
      activeSlotRef.current = "A";
    } finally {
      isModalTransitioning.current = false;
    }
  };

  // Apple-style push/pop transition between modal content views
  const animateModalTransition = (
    nextModal: ModalState,
    prevModal: ModalState,
    direction: "forward" | "backward",
  ) => {
    if (isModalTransitioning.current) {
      AppLogger.warn("daily", "Transition blocked — already transitioning");
      return;
    }
    isModalTransitioning.current = true;
    const currentSlot = activeSlotRef.current;
    setOutgoingSlot(currentSlot);

    const incomingSlot = currentSlot === "A" ? "B" : "A";

    // Get refs for the correct slots
    const outX = currentSlot === "A" ? slotATranslateX : slotBTranslateX;
    const outOpacity = currentSlot === "A" ? slotAOpacity : slotBOpacity;
    const outZ = currentSlot === "A" ? slotAZIndex : slotBZIndex;
    const inX = incomingSlot === "A" ? slotATranslateX : slotBTranslateX;
    const inOpacity = incomingSlot === "A" ? slotAOpacity : slotBOpacity;
    const inZ = incomingSlot === "A" ? slotAZIndex : slotBZIndex;
    const setIncoming = incomingSlot === "A" ? setSlotAModal : setSlotBModal;

    // Z-order: incoming sits on top so its fade-in covers the
    // outgoing fade-out cleanly — forward and backward both put the
    // new content above. Direction is preserved as a parameter for
    // call-site compatibility but doesn't change the visual.
    outZ.value = 1;
    inZ.value = 2;

    // Crossfade: incoming starts at full transparency, outgoing
    // starts at full opacity. Both slots stay at the same screen
    // position (translateX is intentionally not animated). Reset
    // any leftover slide offset from the prior implementation so
    // legacy state can't accidentally shift the new content.
    inX.value = 0;
    outX.value = 0;
    inOpacity.value = 0;
    setIncoming(nextModal);
    setPreviousModal(prevModal);

    // Safety timeout: force cleanup if animation doesn't complete in 1s
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = setTimeout(() => {
      if (isModalTransitioning.current) {
        AppLogger.warn("daily", "Modal transition timed out, forcing cleanup");
        finishTransition(incomingSlot, nextModal);
      }
    }, 1000);

    // Wait one frame for React to mount the incoming content, then
    // crossfade. Mock `index.html:1767` uses `power2.inOut` over
    // 0.4s — `Easing.inOut(Easing.quad)` is the 1:1 RN equivalent.
    rafRef.current = requestAnimationFrame(() => {
      const duration = 400;
      const timingConfig = { duration, easing: Easing.inOut(Easing.quad) };

      // Outgoing: fade out fully so it doesn't ghost behind the new
      // content after the transition settles.
      outOpacity.value = withTiming(0, timingConfig);

      // Incoming: fade in. finishTransition runs on the JS thread
      // when the fade lands, hides the outgoing slot, and unlocks
      // the transition state.
      inOpacity.value = withTiming(1, timingConfig, () => {
        runOnJS(finishTransition)(incomingSlot, nextModal);
      });
    });
  };

  // Modal opener — puts content in active slot, resets everything
  const openModal = (modal: ModalState) => {
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    isModalTransitioning.current = false;
    const slot = activeSlotRef.current;
    if (slot === "A") {
      setSlotAModal(modal);
      slotATranslateX.value = 0;
      slotAOpacity.value = 1;
      slotAZIndex.value = 1;
      setSlotBModal("none");
      slotBOpacity.value = 0;
      slotBZIndex.value = 0;
    } else {
      setSlotBModal(modal);
      slotBTranslateX.value = 0;
      slotBOpacity.value = 1;
      slotBZIndex.value = 1;
      setSlotAModal("none");
      slotAOpacity.value = 0;
      slotAZIndex.value = 0;
    }
    setActiveModal(modal);
    setPreviousModal("none");
    if (modal === "video") onCardViewed?.(1);
    if (modal === "reading") onCardViewed?.(2);
    if (modal === "quiz") onCardViewed?.(3);
  };

  // Close modal entirely — clear both slots
  const closeModal = () => {
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    isModalTransitioning.current = false;
    setSlotAModal("none");
    setSlotBModal("none");
    slotATranslateX.value = 0;
    slotAOpacity.value = 1;
    slotAZIndex.value = 1;
    slotBTranslateX.value = 0;
    slotBOpacity.value = 0;
    slotBZIndex.value = 0;
    activeSlotRef.current = "A";
    setActiveModal("none");
    setPreviousModal("none");
  };

  return {
    activeModal,
    previousModal,
    slotAModal,
    slotBModal,
    outgoingSlot,
    slotAAnimatedStyle,
    slotBAnimatedStyle,
    isModalTransitioning,
    openModal,
    closeModal,
    animateModalTransition,
  };
}
