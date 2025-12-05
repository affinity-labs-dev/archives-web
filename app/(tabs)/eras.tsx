// Unified Era Selection Screen
// Handles both onboarding (first-time) and switching (returning user) modes
// Data fetched from Supabase via useEras hook

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { useProgress } from '@/context/ProgressContext';
import { useEras, Era, isEraAccessible } from '@/hooks/useEras';
import { EraCard, EraSelectionSkeleton } from '@/components/EraSelection';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { analyticsService } from '@/services/AnalyticsService';

// Map era_id to context era IDs
const ERA_CONTEXT_MAP: Record<string, string> = {
  'rise_of_islam': 'riseOfIslam',
  'umayyad': 'umayyad',
  'abbasid': 'abbasid',
  'rashidun': 'rashidun',
  'andalus': 'andalus',
  'women_of_islam': 'womenOfIslam',
  'prophets': 'prophets',
  'mongol': 'mongol',
};

export default function EraSelection() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: 'onboarding' }>();
  const isOnboarding = mode === 'onboarding';

  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { setSelectedEra } = useProgress();
  const { eras, loading, error } = useEras();

  const [selectedEraId, setSelectedEraId] = useState<string | null>(null);

  // TODO: Get these from RevenueCat
  const hasSubscription = false;
  const isFoundingMember = false;

  // Set user properties for analytics (fallback for onboarding)
  React.useEffect(() => {
    if (isSignedIn && user) {
      analyticsService.setUserProperties(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      });
      console.log('✅ [EraSelection] User properties set for Clerk ID:', user.id);
    }
  }, [isSignedIn, user]);

  // Track page views
  useFocusEffect(
    useCallback(() => {
      const screenName = isOnboarding ? 'era_selection_onboarding' : 'era';
      console.log(`📊 [EraSelection] Screen focused - ${screenName}`);
      analyticsService.startPageView(screenName, isOnboarding ? '/era-selection' : '/eras');

      return () => {
        console.log(`📊 [EraSelection] Screen blurred - ${screenName}`);
        analyticsService.endPageView(screenName);
      };
    }, [isOnboarding])
  );

  const handleEraSelect = (era: Era) => {
    const canSelect = isEraAccessible(era.status, hasSubscription, isFoundingMember);
    if (!canSelect) {
      // TODO: Show subscription/upgrade modal
      return;
    }

    Haptics.selectionAsync();
    setSelectedEraId(era.era_id);
  };

  const handleContinue = async () => {
    if (!selectedEraId) return;

    const selectedEra = eras.find((e) => e.era_id === selectedEraId);
    if (!selectedEra) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Map to context era ID
    const contextEraId = ERA_CONTEXT_MAP[selectedEra.era_id] || 'umayyad';

    // Store selected era in context
    await setSelectedEra(contextEraId);

    // Track era selection
    analyticsService.trackEraSelected({
      era_name: selectedEra.title,
      era_id: selectedEra.era_id,
      screen: isOnboarding ? 'era_selection' : 'eras_tab',
      context: isOnboarding ? 'onboarding' : 'era_switch',
      selection_order: eras.findIndex((e) => e.era_id === selectedEraId),
    });

    if (isOnboarding) {
      // Mark onboarding as completed
      await AsyncStorage.setItem('onboarding_completed', 'true');
      console.log('✅ Onboarding completed - user can now return directly to home');
      router.replace('/(tabs)');
    } else {
      // Just navigate to home tab
      router.push('/(tabs)/');
    }
  };

  // Check if selected era is accessible
  const selectedEra = eras.find((e) => e.era_id === selectedEraId);
  const canContinue =
    selectedEraId !== null &&
    selectedEra &&
    isEraAccessible(selectedEra.status, hasSubscription, isFoundingMember);

  // Group eras by layout
  const fullWidthEras = eras.filter((e) => e.card_layout === 'full_width');
  const gridEras = eras.filter((e) => e.card_layout === 'grid');

  // Split grid eras into rows of 2
  const gridRows: Era[][] = [];
  for (let i = 0; i < gridEras.length; i += 2) {
    gridRows.push(gridEras.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: 20 }]}>
      <StatusBar
        barStyle="dark-content"
        translucent={false}
        backgroundColor={ArchivesTheme.colors.creamWhite}
      />
      <View style={styles.container}>
        <View style={styles.background} />

        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Choose Your Era</Text>
            <Text style={styles.headerSubtitle}>
              Begin your journey through Islamic history
            </Text>
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <EraSelectionSkeleton />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load eras</Text>
            <Text style={styles.errorSubtext}>{error}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Full width cards */}
            {fullWidthEras.map((era) => (
              <EraCard
                key={era.era_id}
                era={era}
                isSelected={selectedEraId === era.era_id}
                onSelect={() => handleEraSelect(era)}
                hasSubscription={hasSubscription}
                isFoundingMember={isFoundingMember}
              />
            ))}

            {/* Grid cards */}
            {gridRows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.gridContainer}>
                <View style={styles.gridRow}>
                  {row.map((era) => (
                    <EraCard
                      key={era.era_id}
                      era={era}
                      isSelected={selectedEraId === era.era_id}
                      onSelect={() => handleEraSelect(era)}
                      hasSubscription={hasSubscription}
                      isFoundingMember={isFoundingMember}
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Floating button */}
        <View style={styles.floatingButtonContainer}>
          <Pressable
            style={[styles.enterEraButton, canContinue && styles.enterEraButtonActive]}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            <Text style={styles.enterEraButtonText}>ENTER ERA</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  // Header
  headerSection: {
    height: 120,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
  },
  headerTitle: {
    ...ArchivesTheme.typography.h2,
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'DM Sans',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'left',
    paddingLeft: 25,
    paddingRight: 20,
    paddingTop: 10,
  },
  headerSubtitle: {
    ...ArchivesTheme.typography.body,
    fontWeight: '600',
    color: ArchivesTheme.colors.persianOrange,
    textAlign: 'left',
    paddingLeft: 25,
    paddingRight: 20,
  },

  // Scroll content
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 100,
    gap: 15,
  },

  // Grid layout
  gridContainer: {
    marginVertical: 5,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
  },

  // Floating button
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  enterEraButton: {
    width: 280,
    height: 45,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 26.5,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.persianOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterEraButtonActive: {
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderColor: ArchivesTheme.colors.mossGreen,
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  enterEraButtonText: {
    ...ArchivesTheme.typography.buttonLarge,
    fontSize: 20,
    fontWeight: '600',
    color: ArchivesTheme.colors.creamWhite,
  },
});
