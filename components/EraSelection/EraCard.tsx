// EraCard.tsx - Reusable era card component for both layouts and all states
import React, { memo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { Era, isEraAccessible, getEraLockMessage } from '@/hooks/useEras';

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

// Fallback image
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
  const lockMessage = getEraLockMessage(era.status);

  // Memoize image source to prevent new object reference on every render
  const imageSource = React.useMemo(() => {
    if (era.bg_url && era.bg_url.startsWith('http')) {
      return { uri: era.bg_url };
    }
    return ERA_IMAGE_MAP[era.era_id] || DEFAULT_IMAGE;
  }, [era.bg_url, era.era_id]);

  // Use title and timeline from Supabase directly
  const name = era.title;
  const dateRange = era.timeline ? `(${era.timeline})` : '';

  if (isFullWidth) {
    return (
      <Pressable
        style={[
          styles.horizontalCard,
          isSelected && !showLock && styles.horizontalCardSelected,
        ]}
        onPress={handlePress}
        shouldRasterizeIOS
        renderToHardwareTextureAndroid
      >
        <Image
          source={imageSource}
          style={styles.horizontalCardImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={era.era_id}
          transition={0}
        />

        {!showLock && (
          <LinearGradient
            colors={[
              'rgba(0,0,0,0)',
              'rgba(0,0,0,0.3)',
              'rgba(0,0,0,0.6)',
              'rgba(0,0,0,0.8)',
            ]}
            locations={[0, 0.24, 0.64, 1.0]}
            style={styles.horizontalGradient}
          />
        )}

        {showLock && (
          <View style={styles.lockOverlay}>
            <MaterialIcons name="lock" size={28} color={ArchivesTheme.colors.creamWhite} />
            <Text style={styles.lockText}>{lockMessage}</Text>
          </View>
        )}

        <View style={styles.horizontalContent}>
          <Text
            style={[styles.horizontalTitle, showLock && styles.titleNoEffects]}
            numberOfLines={2}
          >
            {name} <Text style={styles.dateRange}>{dateRange}</Text>
          </Text>
        </View>

        <View
          style={[
            styles.selectedIndicator,
            { opacity: isSelected && !showLock ? 1 : 0 },
          ]}
        >
          <MaterialIcons name="check-circle" size={14} color="white" />
          <Text style={styles.selectedText}>Selected</Text>
        </View>
      </Pressable>
    );
  }

  // Grid layout (smaller card)
  return (
    <Pressable
      style={[
        styles.gridCard,
        isSelected && !showLock && styles.gridCardSelected,
      ]}
      onPress={handlePress}
      shouldRasterizeIOS
      renderToHardwareTextureAndroid
    >
      <Image
        source={imageSource}
        style={styles.gridCardImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={era.era_id}
        transition={0}
      />

      {!showLock && (
        <LinearGradient
          colors={[
            'rgba(0,0,0,0)',
            'rgba(0,0,0,0.4)',
            'rgba(0,0,0,0.8)',
            'rgba(0,0,0,0.95)',
          ]}
          locations={[0, 0.24, 0.64, 1.0]}
          style={styles.gridGradient}
        />
      )}

      {showLock && (
        <View style={styles.gridLockOverlay}>
          <MaterialIcons name="lock" size={24} color={ArchivesTheme.colors.creamWhite} />
          <Text style={styles.lockText}>{lockMessage}</Text>
        </View>
      )}

      <View style={styles.gridContent}>
        <Text
          style={[styles.gridTitle, showLock && styles.titleNoEffects]}
          numberOfLines={2}
        >
          {name}
          {dateRange && <Text style={styles.gridDateRange}> {dateRange}</Text>}
        </Text>
      </View>

      {/* Selected indicator for grid cards */}
      <View
        style={[
          styles.gridSelectedIndicator,
          { opacity: isSelected && !showLock ? 1 : 0 },
        ]}
      >
        <MaterialIcons name="check-circle" size={12} color="white" />
      </View>
    </Pressable>
  );
}

export const EraCard = memo(EraCardComponent);

const styles = StyleSheet.create({
  // Horizontal (full width) card styles
  // No shadows on base state — overflow:hidden + shadow on same view forces
  // iOS to create two offscreen rendering buffers per card per frame
  horizontalCard: {
    height: 250,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  // Selected state gets shadow (only 1 card at a time — perf is fine)
  horizontalCardSelected: {
    borderColor: ArchivesTheme.colors.mossGreen,
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  horizontalCardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: 250,
  },
  horizontalGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  horizontalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
  },
  horizontalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'DM Sans',
    color: 'white',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  dateRange: {
    fontWeight: 'normal',
  },

  // Grid card styles — same approach: no shadow on base, only on selected
  gridCard: {
    width: '48%',
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gridCardSelected: {
    borderColor: ArchivesTheme.colors.mossGreen,
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  gridCardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: 200,
  },
  gridGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  gridContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    paddingBottom: 16,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'DM Sans',
    color: 'white',
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  gridDateRange: {
    fontWeight: 'normal',
  },

  // Shared styles
  titleNoEffects: {
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },

  // Lock overlay styles
  // No borderRadius here — parent already clips with overflow:hidden + borderRadius
  // Adding borderRadius on the overlay creates an extra compositing layer on iOS
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingLeft: 16,
    gap: 8,
  },
  gridLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingLeft: 12,
    gap: 6,
  },
  lockText: {
    fontFamily: 'DM-Sans-SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: ArchivesTheme.colors.creamWhite,
    marginTop: 6,
  },

  // Selected indicator
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ArchivesTheme.colors.mossGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'DM Sans',
    marginLeft: 3,
  },

  // Grid selected indicator (smaller, just checkmark)
  gridSelectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: ArchivesTheme.colors.mossGreen,
    padding: 4,
    borderRadius: 10,
  },
});
