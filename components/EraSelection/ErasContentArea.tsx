import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing as RNEasing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import EraList from './EraList';
import { EraSelectionSkeleton } from './EraCardSkeleton';
import { safeDuration } from '@/components/ui/theme';
import { Era } from '@/hooks/useEras';
import { EraRow } from '@/hooks/eras';

const SKELETON_FADE_OUT_MS = 200;

interface ErasContentAreaProps {
  loading: boolean;
  eraRows: EraRow[];
  selectedEraId: string | null;
  isSubscribed: boolean;
  isFoundingMember: boolean;
  onEraSelect: (era: Era) => void;
}

/**
 * Wraps the skeleton in a UI-thread fade-out Animated.View. Lives inside
 * ErasContentArea so EraCardSkeleton itself stays simple (no exit prop).
 */
const FadingSkeleton: React.FC<{ isExiting: boolean }> = ({ isExiting }) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isExiting) {
      opacity.value = withTiming(0, {
        duration: safeDuration(SKELETON_FADE_OUT_MS),
        easing: RNEasing.out(RNEasing.ease),
      });
    }
  }, [isExiting, opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]} pointerEvents="none">
      <EraSelectionSkeleton />
    </Animated.View>
  );
};

const ErasContentArea: React.FC<ErasContentAreaProps> = ({
  loading,
  eraRows,
  selectedEraId,
  isSubscribed,
  isFoundingMember,
  onEraSelect,
}) => {
  const [showSkeleton, setShowSkeleton] = useState(loading);
  const [skeletonExiting, setSkeletonExiting] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) {
      // Cancel any in-progress exit and re-show the skeleton.
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setShowSkeleton(true);
      setSkeletonExiting(false);
      return;
    }

    if (!showSkeleton) return; // already hidden, nothing to fade out

    setSkeletonExiting(true);
    exitTimerRef.current = setTimeout(() => {
      setShowSkeleton(false);
      setSkeletonExiting(false);
      exitTimerRef.current = null;
    }, SKELETON_FADE_OUT_MS);

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [loading, showSkeleton]);

  return (
    <View style={styles.root}>
      {/* Real list mounts as soon as `loading` flips false so its entrance
          timeline runs underneath the fading skeleton. */}
      {!loading && (
        <EraList
          rows={eraRows}
          selectedEraId={selectedEraId}
          isSubscribed={isSubscribed}
          isFoundingMember={isFoundingMember}
          onEraSelect={onEraSelect}
        />
      )}

      {/* Skeleton overlays on top during loading + the 200ms exit fade. */}
      {showSkeleton && <FadingSkeleton isExiting={skeletonExiting} />}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default ErasContentArea;
