// LessonConstants.ts - Shared constants for lesson components across all eras
// Ensures consistent reading card behavior across all lesson types

export const LESSON_CONSTANTS = {
  // Reading Card Dimensions (responsive to screen size)
  READING_CARD: {
    COLLAPSED_HEIGHT_RATIO: 0.20,  // 20% of screen height (~160px on medium phones)
    EXPANDED_HEIGHT_RATIO: 0.85,   // 85% of screen height
    ANIMATION_TENSION: 100,        // Spring animation tension
    ANIMATION_FRICTION: 8,         // Spring animation friction
  },

  // Gesture Recognition Thresholds
  GESTURES: {
    MIN_SWIPE_DISTANCE: 20,        // Minimum distance for swipe detection (px)
    MIN_SWIPE_VELOCITY: 300,       // Minimum velocity for swipe detection
    TAP_MAX_DISTANCE: 10,          // Maximum movement to be considered a tap (px)
    TAP_MAX_DURATION: 200,         // Maximum duration to be considered a tap (ms)
    ACTIVE_OFFSET_Y: 15,           // PanGestureHandler activeOffsetY
    FAIL_OFFSET_X: 40,             // PanGestureHandler failOffsetX (prevent horizontal conflicts)
  },
} as const;
