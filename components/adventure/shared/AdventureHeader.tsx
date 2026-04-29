// AdventureHeader — the textual header above each adventure's bento grid:
// ERA badge + adventure title (Bounded Black) + small icon on the right +
// timeline date range. Tapping the title or icon fires `onPress` (used to
// open the adventure detail sheet).
//
// Memoized so it doesn't re-render when sibling cards' progress changes —
// header content is purely derived from the adventure object.

import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Typography } from '@/components/ui';
import type { Adventure } from '@/components/shared/types';

import { AdventureIcon } from './AdventureIcon';

interface AdventureHeaderProps {
  adventure: Adventure;
  isLocked: boolean;
  onPress?: (adventure: Adventure) => void;
}

const AdventureHeaderComponent: React.FC<AdventureHeaderProps> = ({
  adventure,
  isLocked,
  onPress,
}) => {
  const handlePress = useCallback(() => {
    if (isLocked || !onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(adventure);
  }, [isLocked, onPress, adventure]);

  return (
    <View>
      {/* ERA Badge — Figma 3601:5501 */}
      <View style={styles.eraBadge}>
        <Typography
          family="onest"
          weight="700"
          size={14}
          lineHeight={14}
          color="onyx"
          letterSpacing={1.96}
          uppercase
        >
          {adventure.card_content?.era_name || adventure.era_id}
        </Typography>
        <Typography
          family="onest"
          weight="600"
          size={14}
          lineHeight={14}
          color="bluePrimary"
          letterSpacing={1.96}
          uppercase
        >
          ADVENTURE {adventure.order_by}
        </Typography>
      </View>

      {/* Title + Icon row — Figma 3601:5497 + 3601:5498 */}
      <View style={styles.titleSection}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={isLocked ? 1 : 0.7}
          disabled={isLocked}
          style={styles.titleTouchable}
        >
          <Typography
            family="bounded"
            weight="900"
            size={22}
            lineHeight={29}
            color="onyx"
            uppercase
          >
            {adventure.adventure_title}
          </Typography>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handlePress}
          activeOpacity={isLocked ? 1 : 0.7}
          disabled={isLocked}
        >
          <AdventureIcon iconUrl={adventure.icon_url} />
        </TouchableOpacity>
      </View>

      {/* Timeline — Figma 3601:5520 */}
      <Typography
        family="onest"
        weight="600"
        size={16}
        lineHeight={17}
        color="bluePrimary"
        style={styles.dateRange}
      >
        {adventure.timeline}
      </Typography>
    </View>
  );
};

export const AdventureHeader = React.memo(AdventureHeaderComponent);

const styles = StyleSheet.create({
  eraBadge: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginBottom: 20,
    gap: 8,
  },
  titleSection: {
    gap: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleTouchable: {
    flex: 1,
  },
  iconButton: {
    width: 32,
    height: 32,
  },
  dateRange: {
    marginTop: 4,
    marginLeft: 14,
    marginBottom: 13,
  },
});
