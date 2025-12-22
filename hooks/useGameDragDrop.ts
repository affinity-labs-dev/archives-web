// useGameDragDrop.ts - Universal drag-drop logic for game pieces
// Cross-platform (iOS + Android) pan gesture handling

import { useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface DragDropPosition {
  x: number;
  y: number;
  gridPosition?: { row: number; col: number }; // Optional grid position for game board snapping
}

export interface UseDragDropOptions {
  initialPosition?: DragDropPosition;
  onDragStart?: (position: DragDropPosition) => void;
  onDragMove?: (position: DragDropPosition) => void;
  onDragEnd?: (position: DragDropPosition) => void;
  onSnapToPosition?: (position: DragDropPosition) => void;
  bounds?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  };
  snapToPosition?: (x: number, y: number) => DragDropPosition | null;
  disabled?: boolean;
}

export function useGameDragDrop(options: UseDragDropOptions) {
  const {
    initialPosition = { x: 0, y: 0 },
    onDragStart,
    onDragMove,
    onDragEnd,
    onSnapToPosition,
    bounds,
    snapToPosition,
    disabled = false,
  } = options;

  const [isDragging, setIsDragging] = useState(false);
  const pan = useRef(new Animated.ValueXY(initialPosition)).current;
  const lastPosition = useRef(initialPosition);

  const panResponder = useRef(
    PanResponder.create({
      // Always try to become responder on touch start
      onStartShouldSetPanResponder: () => !disabled,
      // Become responder on any movement
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture if not disabled and there's meaningful movement
        return !disabled && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2);
      },
      // Higher priority to capture touches before parent ScrollView
      onStartShouldSetPanResponderCapture: () => !disabled,
      onMoveShouldSetPanResponderCapture: () => !disabled,

      onPanResponderGrant: () => {
        if (disabled) return;

        setIsDragging(true);

        // Light haptic feedback on drag start
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Set current offset
        pan.setOffset({
          x: lastPosition.current.x,
          y: lastPosition.current.y,
        });
        pan.setValue({ x: 0, y: 0 });

        if (onDragStart) {
          onDragStart(lastPosition.current);
        }
      },

      onPanResponderMove: (evt, gesture) => {
        if (disabled) return;

        // Use moveX and moveY for screen coordinates (works across containers)
        const screenX = gesture.moveX;
        const screenY = gesture.moveY;

        // Apply bounds if specified
        let x = gesture.dx;
        let y = gesture.dy;

        const currentX = lastPosition.current.x + x;
        const currentY = lastPosition.current.y + y;

        if (bounds) {
          if (bounds.minX !== undefined && currentX < bounds.minX) {
            x = bounds.minX - lastPosition.current.x;
          }
          if (bounds.maxX !== undefined && currentX > bounds.maxX) {
            x = bounds.maxX - lastPosition.current.x;
          }
          if (bounds.minY !== undefined && currentY < bounds.minY) {
            y = bounds.minY - lastPosition.current.y;
          }
          if (bounds.maxY !== undefined && currentY > bounds.maxY) {
            y = bounds.maxY - lastPosition.current.y;
          }
        }

        // Update animated values directly
        pan.x.setValue(x);
        pan.y.setValue(y);

        if (onDragMove) {
          onDragMove({ x: screenX, y: screenY }); // Pass screen coordinates
        }
      },

      onPanResponderRelease: (evt, gesture) => {
        if (disabled) return;

        setIsDragging(false);

        // Use screen coordinates for drop detection (works across containers)
        const dropX = evt.nativeEvent.pageX;
        const dropY = evt.nativeEvent.pageY;

        console.log(`📍 Drop at screen coords: x=${dropX}, y=${dropY}`);

        // Calculate final position (local coordinates)
        const finalX = lastPosition.current.x + gesture.dx;
        const finalY = lastPosition.current.y + gesture.dy;

        // Apply bounds to final position
        let boundedX = finalX;
        let boundedY = finalY;

        if (bounds) {
          if (bounds.minX !== undefined) boundedX = Math.max(boundedX, bounds.minX);
          if (bounds.maxX !== undefined) boundedX = Math.min(boundedX, bounds.maxX);
          if (bounds.minY !== undefined) boundedY = Math.max(boundedY, bounds.minY);
          if (bounds.maxY !== undefined) boundedY = Math.min(boundedY, bounds.maxY);
        }

        // Check for snap position using SCREEN coordinates
        const snapResult = snapToPosition ? snapToPosition(dropX, dropY) : null;

        if (snapResult && snapResult.gridPosition) {
          // Successfully snapped to grid
          console.log('✅ Snapped to grid:', snapResult.gridPosition);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          pan.flattenOffset();
          Animated.spring(pan, {
            toValue: { x: snapResult.x, y: snapResult.y },
            useNativeDriver: false,
            tension: 100,
            friction: 10,
          }).start();

          lastPosition.current = { x: snapResult.x, y: snapResult.y };

          if (onSnapToPosition) {
            onSnapToPosition({ x: snapResult.x, y: snapResult.y });
          }
        } else {
          // Failed to snap - return to original position (stay in tray)
          console.log('❌ Failed to snap - returning to tray');
          pan.flattenOffset();
          Animated.spring(pan, {
            toValue: initialPosition,
            useNativeDriver: false,
            tension: 100,
            friction: 10,
          }).start();
          lastPosition.current = initialPosition;
        }

        if (onDragEnd) {
          onDragEnd(lastPosition.current);
        }
      },
    })
  ).current;

  /**
   * Manually set position (without animation)
   */
  const setPosition = (position: DragDropPosition) => {
    lastPosition.current = position;
    pan.setValue(position);
  };

  /**
   * Animate to position
   */
  const animateToPosition = (position: DragDropPosition, onComplete?: () => void) => {
    Animated.spring(pan, {
      toValue: position,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start(onComplete);

    lastPosition.current = position;
  };

  /**
   * Reset to initial position
   */
  const reset = () => {
    animateToPosition(initialPosition);
  };

  return {
    pan,
    panResponder,
    isDragging,
    currentPosition: lastPosition.current,
    setPosition,
    animateToPosition,
    reset,
  };
}
