// EraCardSkeleton.tsx - Loading skeleton for era cards
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import ArchivesTheme from '@/constants/ArchivesTheme';

interface EraCardSkeletonProps {
  layout: 'full_width' | 'grid';
}

export function EraCardSkeleton({ layout }: EraCardSkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  if (layout === 'full_width') {
    return (
      <Animated.View style={[styles.horizontalSkeleton, { opacity }]}>
        <View style={styles.horizontalTextArea}>
          <View style={styles.titleSkeleton} />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.gridSkeleton, { opacity }]}>
      <View style={styles.gridTextArea}>
        <View style={styles.gridTitleSkeleton} />
      </View>
    </Animated.View>
  );
}

// Loading state component showing multiple skeletons
export function EraSelectionSkeleton() {
  return (
    <View style={styles.container}>
      {/* Two full width skeletons */}
      <EraCardSkeleton layout="full_width" />
      <EraCardSkeleton layout="full_width" />

      {/* Grid row */}
      <View style={styles.gridRow}>
        <EraCardSkeleton layout="grid" />
        <EraCardSkeleton layout="grid" />
      </View>

      {/* Another grid row */}
      <View style={styles.gridRow}>
        <EraCardSkeleton layout="grid" />
        <EraCardSkeleton layout="grid" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 15,
    gap: 15,
  },
  horizontalSkeleton: {
    height: 250,
    borderRadius: 24,
    backgroundColor: ArchivesTheme.colors.shoeBrown,
    marginBottom: 8,
  },
  horizontalTextArea: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  titleSkeleton: {
    height: 24,
    width: '60%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridSkeleton: {
    width: '48%',
    height: 200,
    borderRadius: 18,
    backgroundColor: ArchivesTheme.colors.shoeBrown,
  },
  gridTextArea: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    right: 14,
  },
  gridTitleSkeleton: {
    height: 18,
    width: '80%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
  },
});
