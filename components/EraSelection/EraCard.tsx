// EraCard.tsx - v5.0 redesigned era card component
// Uses new design system: Onest font, acai/blue palette, updated badges
import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Typography } from '@/components/ui';
import { colors, spacing, radius, safeDuration } from '@/components/ui/theme';
import { Era, isEraAccessible } from '@/hooks/useEras';

// Local image mapping (until remote URLs are set up)
const ERA_IMAGE_MAP: Record<string, any> = {
  'rise_of_islam': require('@/assets/images/eras/era2-bg.jpg'),
  'umayyad': require('@/assets/images/eras/era1-bg.jpg'),
  'abbasid': require('@/assets/images/eras/era3-bg.jpg'),
  'rashidun': require('@/assets/images/eras/era4-bg.jpg'),
  'andalus': require('@/assets/images/eras/era5-bg.jpg'),
  'women_of_islam': require('@/assets/images/eras/era6-bg.jpg'),
  'prophets': require('@/assets/images/eras/era7-bg.jpg'),
  'mongol': require('@/assets/images/eras/era8-bg.jpg'),
};

const DEFAULT_IMAGE = require('@/assets/images/eras/era1-bg.jpg');

interface EraCardProps {
  era: Era;
  isSelected: boolean;
  onSelect: (era: Era) => void;
  hasSubscription?: boolean;
  isFoundingMember?: boolean;
}

function EraCardComponent({
  era,
  isSelected,
  onSelect,
  hasSubscription = false,
  isFoundingMember = false,
}: EraCardProps) {
  const handlePress = React.useCallback(() => onSelect(era), [onSelect, era]);
  const isFullWidth = era.card_layout === 'full_width';
  const isAccessible = isEraAccessible(era.status, hasSubscription, isFoundingMember);
  const showLock = !isAccessible;
  const isPremium = era.status === 'premium';

  // Purple glow pulse on selection
  const scale = useSharedValue(1);
  const glowRadius = useSharedValue(isSelected && !showLock ? 24 : 0);
  const glowOpacity = useSharedValue(isSelected && !showLock ? 0.55 : 0);
  const wasSelected = useRef(isSelected);

  useEffect(() => {
    if (isSelected && !wasSelected.current && !showLock) {
      // Scale bounce
      scale.value = withSequence(
        withTiming(1.03, { duration: safeDuration(200), easing: Easing.out(Easing.ease) }),
        withTiming(0.98, { duration: safeDuration(150), easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: safeDuration(250), easing: Easing.out(Easing.elastic(1)) }),
      );
      // Purple glow pulse: expand → contract → settle at prominent glow
      glowRadius.value = withSequence(
        withTiming(36, { duration: safeDuration(300), easing: Easing.out(Easing.ease) }),
        withTiming(24, { duration: safeDuration(600), easing: Easing.inOut(Easing.ease) }),
      );
      glowOpacity.value = withSequence(
        withTiming(0.75, { duration: safeDuration(300), easing: Easing.out(Easing.ease) }),
        withTiming(0.55, { duration: safeDuration(600), easing: Easing.inOut(Easing.ease) }),
      );
    } else if (!isSelected) {
      glowRadius.value = withTiming(0, { duration: safeDuration(200) });
      glowOpacity.value = withTiming(0, { duration: safeDuration(200) });
    }
    wasSelected.current = isSelected;
  }, [isSelected, showLock, scale, glowRadius, glowOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowColor: '#8C60CD',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: glowRadius.value,
    shadowOpacity: glowOpacity.value,
    elevation: glowRadius.value > 0 ? 12 : 0,
  }));

  const imageSource = React.useMemo(() => {
    if (era.bg_url && era.bg_url.startsWith('http')) {
      return { uri: era.bg_url };
    }
    return ERA_IMAGE_MAP[era.era_id] || DEFAULT_IMAGE;
  }, [era.bg_url, era.era_id]);

  const name = era.title;
  const dateRange = era.timeline ? `(${era.timeline})` : '';

  // ─── Full-width card ───
  if (isFullWidth) {
    return (
      <Animated.View style={[
        pulseStyle,
        styles.horizontalWrapper,
        isSelected && !showLock && styles.wrapperSelected,
      ]}>
      <Pressable
        style={styles.horizontalCard}
        onPress={handlePress}
        shouldRasterizeIOS
        renderToHardwareTextureAndroid
      >
        <Image
          source={imageSource}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={era.era_id}
          transition={0}
        />

        {/* Gradient — always shown, bottom-to-top dark */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Lock overlay — darkens the full card for locked eras */}
        {showLock && (
          <View style={styles.lockOverlay}>
            <View style={styles.lockBadge}>
              <MaterialIcons name="lock" size={15} color={colors.white} />
              {isPremium && (
                <Typography family="onest" size={14} weight="600" color="white" letterSpacing={-0.14}>
                  Premium
                </Typography>
              )}
            </View>
          </View>
        )}

        {/* Bottom content row: title + selected indicator */}
        <View style={styles.horizontalContent}>
          <View style={styles.horizontalBottomRow}>
            <View style={styles.horizontalTitleWrap}>
              <Typography family="onest" size={14} weight="700" color="white" numberOfLines={2}>
                {name} <Typography family="onest" size={14} weight="500" color="white">{dateRange}</Typography>
              </Typography>
            </View>

            {isSelected && !showLock && (
              <View style={styles.selectedIndicator}>
                <MaterialIcons name="check-circle" size={20} color={colors.acaiSecondary} />
                <Typography family="onest" size={13} weight="500" color="acaiTertiary">
                  Selected
                </Typography>
              </View>
            )}
          </View>
        </View>
      </Pressable>
      </Animated.View>
    );
  }

  // ─── Grid card ───
  return (
    <Animated.View style={[
      { width: '48%' },
      pulseStyle,
      styles.gridWrapper,
      isSelected && !showLock && styles.wrapperSelected,
    ]}>
    <Pressable
      style={styles.gridCard}
      onPress={handlePress}
      shouldRasterizeIOS
      renderToHardwareTextureAndroid
    >
      <Image
        source={imageSource}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={era.era_id}
        transition={0}
      />

      {/* Gradient — always shown */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Lock overlay — darkens the full card for locked eras */}
      {showLock && (
        <View style={styles.gridLockOverlay}>
          <View style={styles.lockBadge}>
            <MaterialIcons name="lock" size={13} color={colors.white} />
            {isPremium && (
              <Typography family="onest" size={14} weight="600" color="white" letterSpacing={-0.14}>
                Premium
              </Typography>
            )}
          </View>
        </View>
      )}

      <View style={styles.gridContent}>
        <Typography
          family="onest" size={14} weight="700" color="white"
          numberOfLines={2}
        >
          {name}
          {dateRange ? ` ${dateRange}` : ''}
        </Typography>
      </View>

      {isSelected && !showLock && (
        <View style={styles.gridSelectedIndicator}>
          <MaterialIcons name="check-circle" size={20} color={colors.acaiSecondary} />
        </View>
      )}
    </Pressable>
    </Animated.View>
  );
}

export const EraCard = memo(EraCardComponent);

const styles = StyleSheet.create({
  // ─── Full-width card ───
  horizontalWrapper: {
    marginBottom: spacing.sm,
    borderRadius: radius.xl + 3,
  },
  horizontalCard: {
    height: 250,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  horizontalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    paddingBottom: 14,
  },
  horizontalBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  horizontalTitleWrap: {
    flex: 1,
  },

  // ─── Grid card ───
  gridWrapper: {
    borderRadius: 25,
  },
  gridCard: {
    width: '100%',
    height: 200,
    borderRadius: 22,
    overflow: 'hidden',
  },
  // Shared selected wrapper — purple frame around card
  wrapperSelected: {
    padding: 3,
    backgroundColor: colors.acaiSecondary,
  },
  gridContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingLeft: 13,
    paddingBottom: 13,
    paddingRight: 10,
  },

  // ─── Lock overlay — semi-transparent dark fill on ALL locked cards ───
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingLeft: 16,
  },
  gridLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 17,
    paddingLeft: 13,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // ─── Selected indicator ───
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  gridSelectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});
