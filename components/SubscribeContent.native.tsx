// Native subscription implementation for iOS/Android - Using RevenueCat Paywall UI
import ArchivesTheme from "@/constants/ArchivesTheme";
import {
  ArchivesPlusMemberScreen,
  type ArchivesPlusBenefit,
} from "@/components/subscription/ArchivesPlusMemberScreen";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { analyticsService } from "@/services/AnalyticsService";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Purchases from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from "./ui";

const YEARLY_BENEFITS: readonly ArchivesPlusBenefit[] = [
  {
    icon: 'refresh',
    title: 'Unlimited Story Rewinds',
    subtitle: 'Replay missed days and stay up to date',
  },
  {
    icon: 'help',
    title: 'Unlimited Explanations',
    subtitle: 'Get answers to every question you ask',
  },
  {
    icon: 'sparkles',
    title: 'Unlimited AI Learning',
    subtitle: 'Chat without limits to go deeper',
  },
  {
    icon: 'lock-open',
    title: 'All Eras Unlocked',
    subtitle: 'Every chapter, now and future',
  },
];

const FOUNDING_BENEFITS: readonly ArchivesPlusBenefit[] = [
  {
    icon: 'lock-open',
    title: 'Lifetime Access to All Eras',
    subtitle: 'Every chapter unlocked, today and forever',
  },
  {
    icon: 'rocket',
    title: 'Early Access to New Content',
    subtitle: 'See new eras and features before anyone else',
  },
  {
    icon: 'ribbon',
    title: 'Founding Member Recognition',
    subtitle: 'One of the first to believe in Archives',
  },
  {
    icon: 'star',
    title: 'All Future Features Included',
    subtitle: 'Every upcoming addition, at no extra cost',
  },
];

export default function SubscribeContent() {
  // Connect to real RevenueCat subscription system
  const {
    isSubscribed,
    isLoading,
    customerInfo,
  } = useRevenueCat();
  const isFocused = useIsFocused();
  const [isTransacting, setIsTransacting] = useState(false);

  // Founding members purchased the Lifetime Subscription via web billing
  const isFoundingMember = customerInfo?.entitlements.active['Access of All Eras - Yearly']
    ?.productIdentifier === 'Archives_Lifetime_Offer';

  // Track page views with focus/blur
  useFocusEffect(
    useCallback(() => {
      console.log('📊 [SubscribeContent] Screen focused - starting page view tracking')
      analyticsService.startPageView('subscription', '/subscribe')

      // Track subscribe screen viewed (only for non-subscribed users seeing the paywall)
      if (!isSubscribed && !isLoading) {
        analyticsService.trackSubscribeScreenViewed({ trigger: 'subscribe_tab' });
      }

      return () => {
        console.log('📊 [SubscribeContent] Screen blurred - ending page view tracking')
        analyticsService.endPageView('subscription')
      }
    }, [isSubscribed, isLoading])
  )

  console.log('💎 SubscribeContent rendered with RevenueCat state:', {
    isSubscribed,
    isLoading,
  });

  // Show loading state while RevenueCat initializes
  if (isLoading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: 11 }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
          <Text style={styles.loadingText}>Loading subscription options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Founding members — lifetime variant of the Archives Plus member screen.
  // No manage link since lifetime purchases can't be managed in-app.
  if (isFoundingMember) {
    return (
      <ArchivesPlusMemberScreen
        planName="Archives Plus"
        statusLabel="Founding member"
        planDetail="Lifetime · permanent access"
        chipLabel="Founding"
        benefits={FOUNDING_BENEFITS}
        footerNote="Thank you for believing in Archives before anyone else. Your support helps build more lessons for learners worldwide."
        manageLink={null}
      />
    );
  }

  // Yearly subscriber — default Archives Plus member screen.
  if (isSubscribed) {
    return (
      <ArchivesPlusMemberScreen
        planName="Archives Plus"
        statusLabel="Active member"
        planDetail="Yearly plan · renews automatically"
        chipLabel="Member"
        benefits={YEARLY_BENEFITS}
        footerNote="Your subscription helps us build more lessons for learners worldwide."
        manageLink={{
          label: 'Manage subscription in your App Store',
          onPress: () => Purchases.showManageSubscriptions(),
        }}
      />
    );
  }

  // Guard: On Android, unmount the native PaywallView when tab is not focused.
  // This prevents the CompatComposeView lifecycle crash (DESTROYED → CREATED)
  // caused by React Navigation detaching/reattaching the view on tab switches.
  // iOS uses native UITabBarController which handles view lifecycle correctly.
  if (!isFocused && Platform.OS === 'android' && !isTransacting) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { paddingTop: 11 }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
        </View>
      </SafeAreaView>
    );
  }

  // Show RevenueCat Paywall UI for non-subscribed users
  // This automatically uses the paywall attached to the current offering
  // Note: Close button is controlled in RevenueCat dashboard paywall template, not via code
  return (
    <RevenueCatUI.Paywall
      onPurchaseStarted={({ packageBeingPurchased }) => {
        console.log('💳 Purchase started', packageBeingPurchased?.identifier);
        setIsTransacting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        analyticsService.trackSubscribePurchaseStarted({
          trigger: 'subscribe_tab',
          plan_id: packageBeingPurchased?.product?.identifier,
          billing_cycle: packageBeingPurchased?.packageType,
        });
      }}
      onPurchaseCompleted={({ storeTransaction }) => {
        console.log('✅ Purchase completed!', storeTransaction?.productIdentifier);
        setIsTransacting(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        analyticsService.trackSubscribePurchaseCompleted({
          trigger: 'subscribe_tab',
          plan: 'yearly',
        });
      }}
      onPurchaseError={({ error }) => {
        console.log('❌ Purchase error', error?.message);
        setIsTransacting(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        analyticsService.trackSubscribePurchaseFailed({
          trigger: 'subscribe_tab',
          error_code: error?.code != null ? String(error.code) : undefined,
        });
      }}
      onPurchaseCancelled={() => {
        console.log('🚫 Purchase cancelled');
        setIsTransacting(false);
        analyticsService.trackSubscribePurchaseCancelled({
          trigger: 'subscribe_tab',
        });
      }}
      onRestoreStarted={() => {
        console.log('🔄 Restore started');
        setIsTransacting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        analyticsService.trackSubscribeRestoreTapped({
          trigger: 'subscribe_tab',
        });
      }}
      onRestoreCompleted={() => {
        console.log('✅ Restore completed!');
        setIsTransacting(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        analyticsService.trackSubscribeRestoreSuccess({
          trigger: 'subscribe_tab',
        });
      }}
      onRestoreError={({ error }) => {
        console.log('❌ Restore error', error?.message);
        setIsTransacting(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        analyticsService.trackSubscribeRestoreFailed({
          trigger: 'subscribe_tab',
          error_code: error?.code != null ? String(error.code) : undefined,
        });
      }}
      onDismiss={() => {
        console.log('👋 Paywall dismissed');
      }}
    />
  );
}

// Loading-only styles. Member-screen styles live in ArchivesPlusMemberScreen.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.snow,
  },
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
});
