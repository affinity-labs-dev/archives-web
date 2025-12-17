// EraCard.tsx - Reusable era card component for both layouts and all states
import ArchivesTheme from '@/constants/ArchivesTheme';
import { Era, getEraLockMessage, isEraAccessible } from '@/hooks/useEras';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
  onSelect: () => void;
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
  const isFullWidth = era.card_layout === 'full_width';
  const isAccessible = isEraAccessible(era.status, hasSubscription, isFoundingMember);
  const showLock = !isAccessible;
  const lockMessage = getEraLockMessage(era.status);

  // Get image source - use bg_url if it's a URL, otherwise use local mapping
  const getImageSource = () => {
    if (era.bg_url && era.bg_url.startsWith('http')) {
      return { uri: era.bg_url };
    }
    return ERA_IMAGE_MAP[era.era_id] || DEFAULT_IMAGE;
  };

  // Use title and timeline from Supabase directly
  const name = era.title;
  const dateRange = era.timeline ? `(${era.timeline})` : '';

  if (isFullWidth) {
    return (
      <Pressable
        style={[
          styles.horizontalCard,
          isSelected && !showLock && styles.horizontalCardSelected,
          showLock && styles.cardNoEffects,
        ]}
        onPress={onSelect}
      >
        <Image
          source={getImageSource()}
          style={styles.horizontalCardImage}
          contentFit="cover"
          cachePolicy="memory-disk"
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

        {/* Lock overlay renders LAST so it covers everything */}
        {showLock && (
          <View style={styles.lockOverlay}>
            <MaterialIcons name="lock" size={28} color={ArchivesTheme.colors.creamWhite} />
            <Text style={styles.lockText}>{lockMessage}</Text>
          </View>
        )}
      </Pressable>
    );
  }

  // Grid layout (smaller card)
  return (
    <Pressable
      style={[
        styles.gridCard,
        isSelected && !showLock && styles.gridCardSelected,
        showLock && styles.cardNoEffects,
      ]}
      onPress={onSelect}
    >
      <Image
        source={getImageSource()}
        style={styles.gridCardImage}
        contentFit="cover"
        cachePolicy="memory-disk"
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

      {/* Lock overlay renders LAST so it covers everything */}
      {showLock && (
        <View style={styles.gridLockOverlay}>
          <MaterialIcons name="lock" size={24} color={ArchivesTheme.colors.creamWhite} />
          <Text style={styles.lockText}>{lockMessage}</Text>
        </View>
      )}
    </Pressable>
  );
}

export const EraCard = memo(EraCardComponent);

const styles = StyleSheet.create({
  // Horizontal (full width) card styles
  horizontalCard: {
    height: 250,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
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

  // Grid card styles
  gridCard: {
    width: '48%',
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  gridCardSelected: {
    borderWidth: 2,
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
  cardNoEffects: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  titleNoEffects: {
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },

  // Lock overlay styles
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 24,
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
    borderRadius: 18,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
});
