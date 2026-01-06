// AIRecommendationCard.tsx - Recommendation card component
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { analyticsService } from '@/services/AnalyticsService';

// AI Recommendation type (component not currently in use)
interface AIRecommendation {
  type: 'next_adventure' | 'strengthen_knowledge' | 'explore_new' | 'achievement';
  title: string;
  description: string;
  actionLabel?: string;
  route?: string;
}

interface AIRecommendationCardProps {
  recommendation: AIRecommendation;
  onPress?: () => void;
}

export default function AIRecommendationCard({ recommendation, onPress }: AIRecommendationCardProps) {
  const router = useRouter();

  const getCardColor = () => {
    switch (recommendation.type) {
      case 'next_adventure': return ArchivesTheme.colors.persianOrange;
      case 'strengthen_knowledge': return '#3498DB';
      case 'explore_new': return '#9B59B6';
      case 'achievement': return '#F39C12';
      default: return ArchivesTheme.colors.persianOrange;
    }
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    analyticsService.trackCustomEvent('ai_recommendation_clicked', {
      recommendation_id: recommendation.id,
      recommendation_type: recommendation.type,
      priority: recommendation.priority,
      era_id: recommendation.actionTarget.eraId,
      adventure_id: recommendation.actionTarget.adventureId,
      module_id: recommendation.actionTarget.moduleId,
    });

    if (onPress) {
      onPress();
    } else {
      const { eraId } = recommendation.actionTarget;
      router.push(eraId ? '/(tabs)/eras' : '/(tabs)');
    }
  };

  const cardColor = getCardColor();

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      <View style={[styles.iconCircle, { backgroundColor: cardColor }]}>
        <Ionicons name={recommendation.icon as any} size={28} color="white" />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{recommendation.title}</Text>
        <Text style={styles.description} numberOfLines={2}>{recommendation.description}</Text>

        <View style={styles.actionRow}>
          <Text style={[styles.actionText, { color: cardColor }]}>{recommendation.actionText}</Text>
          <Ionicons name="arrow-forward" size={16} color={cardColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    ...Platform.select({
      ios: {
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 4,
  },
  description: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 8,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  actionText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
});
