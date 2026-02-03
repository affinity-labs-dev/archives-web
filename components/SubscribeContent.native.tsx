// Native subscription implementation for iOS/Android - Using RevenueCat Paywall UI
import ArchivesTheme from "@/constants/ArchivesTheme";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { analyticsService } from "@/services/AnalyticsService";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from 'expo-haptics';
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import RevenueCatUI from 'react-native-purchases-ui';

export default function SubscribeContent() {
  // Connect to real RevenueCat subscription system
  const {
    isSubscribed,
    isLoading,
  } = useRevenueCat();

  // Track page views with focus/blur
  useFocusEffect(
    useCallback(() => {
      console.log('📊 [SubscribeContent] Screen focused - starting page view tracking')
      analyticsService.startPageView('subscription', '/subscribe')

      return () => {
        console.log('📊 [SubscribeContent] Screen blurred - ending page view tracking')
        analyticsService.endPageView('subscription')
      }
    }, [])
  )

  console.log('💎 SubscribeContent rendered with RevenueCat state:', {
    isSubscribed,
    isLoading,
  });

  // Show loading state while RevenueCat initializes
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: 20 }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
          <Text style={styles.loadingText}>Loading subscription options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If user is already subscribed, show success state
  if (isSubscribed) {
    return (
      <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: 20 }]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.subscribedContainer}>
            <Ionicons
              name="checkmark-circle"
              size={80}
              color={ArchivesTheme.colors.mossGreen}
              style={styles.subscribedIcon}
            />
            <Text style={styles.subscribedTitle}>Archives Explorer Pass Active!</Text>
            <Text style={styles.subscribedMessage}>
              You have unlimited access to all historical eras and adventures!
            </Text>

            <View style={styles.explorerPassSection}>
              <Text style={styles.featuresHeader}>
                Your Explorer Pass includes:
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={ArchivesTheme.colors.persianOrange}
                  />
                  <Text style={styles.featureText}>
                    All Historical Eras & Adventures
                  </Text>
                </View>

                <View style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={ArchivesTheme.colors.persianOrange}
                  />
                  <Text style={styles.featureText}>New Learning Modules</Text>
                </View>

                <View style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={ArchivesTheme.colors.persianOrange}
                  />
                  <Text style={styles.featureText}>Exclusive Badges</Text>
                </View>

                <View style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={ArchivesTheme.colors.persianOrange}
                  />
                  <Text style={styles.featureText}>Early Access to New Eras</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show RevenueCat Paywall UI for non-subscribed users
  // This automatically uses the paywall attached to the current offering
  // Note: Close button is controlled in RevenueCat dashboard paywall template, not via code
  return (
    <RevenueCatUI.Paywall
      onPurchaseStarted={() => {
        console.log('💳 Purchase started');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      onPurchaseCompleted={() => {
        console.log('✅ Purchase completed!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }}
      onPurchaseError={() => {
        console.log('❌ Purchase error');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }}
      onPurchaseCancelled={() => {
        console.log('🚫 Purchase cancelled');
      }}
      onRestoreStarted={() => {
        console.log('🔄 Restore started');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onRestoreCompleted={() => {
        console.log('✅ Restore completed!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }}
      onRestoreError={() => {
        console.log('❌ Restore error');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }}
      onDismiss={() => {
        console.log('👋 Paywall dismissed');
      }}
    />
  );
}

// Simplified styles - only for loading and subscribed states
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Loading state styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    fontFamily: "DM Sans",
    fontSize: 16,
    fontWeight: "500",
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: "center",
    marginTop: 16,
    opacity: 0.7,
  },

  // Subscribed state styles
  subscribedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  subscribedIcon: {
    marginBottom: 24,
  },
  subscribedTitle: {
    fontFamily: "DM Sans",
    fontSize: 28,
    fontWeight: "600",
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: "center",
    marginBottom: 12,
  },
  subscribedMessage: {
    fontFamily: "DM Sans",
    fontSize: 16,
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
    opacity: 0.8,
  },

  // Explorer Pass Section (for subscribed state)
  explorerPassSection: {
    backgroundColor: ArchivesTheme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 30,
    shadowColor: ArchivesTheme.colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuresHeader: {
    fontFamily: "DM Sans",
    fontSize: 16,
    fontWeight: "600",
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: "left",
    marginBottom: 16,
    marginTop: 0,
  },
  featuresList: {},
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    paddingVertical: 2,
  },
  featureText: {
    fontFamily: "DM Sans",
    fontSize: 15,
    fontWeight: "500",
    color: ArchivesTheme.colors.mutedNavy,
    marginLeft: 12,
  },
});