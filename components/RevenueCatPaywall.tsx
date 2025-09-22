import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import Purchases from 'react-native-purchases';

interface RevenueCatPaywallProps {
  onPurchaseComplete?: (success: boolean) => void;
  onClose?: () => void;
}

export function RevenueCatPaywall({ onPurchaseComplete, onClose }: RevenueCatPaywallProps) {
  const [loading, setLoading] = useState(false);

  // Present paywall if user doesn't have premium entitlement
  const presentPaywall = async () => {
    try {
      setLoading(true);

      console.log('🎯 Presenting RevenueCat paywall for premium entitlement');

      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: 'premium'
      });

      console.log('📋 Paywall result:', paywallResult);

      if (paywallResult === PAYWALL_RESULT.PURCHASED) {
        console.log('✅ User purchased premium subscription');
        Alert.alert(
          'Welcome to Premium!',
          'Your Archives Explorer Pass is now active!',
          [{ text: 'Great!', onPress: () => onPurchaseComplete?.(true) }]
        );
      } else if (paywallResult === PAYWALL_RESULT.RESTORED) {
        console.log('✅ User restored premium subscription');
        Alert.alert(
          'Subscription Restored!',
          'Your Archives Explorer Pass has been restored!',
          [{ text: 'Great!', onPress: () => onPurchaseComplete?.(true) }]
        );
      } else if (paywallResult === PAYWALL_RESULT.CANCELLED) {
        console.log('ℹ️ User cancelled paywall');
        onClose?.();
      } else if (paywallResult === PAYWALL_RESULT.NOT_PRESENTED) {
        console.log('ℹ️ Paywall not presented - user already has premium');
        onPurchaseComplete?.(true);
      }

    } catch (error: any) {
      console.error('❌ RevenueCat paywall error:', error);
      Alert.alert(
        'Subscription Error',
        error.message || 'Something went wrong. Please try again.',
        [{ text: 'OK', onPress: () => onClose?.() }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Present paywall automatically when component mounts
  useEffect(() => {
    presentPaywall();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading subscription options...</Text>
      </View>
    );
  }

  return null; // RevenueCat UI handles the visual presentation
}

// Alternative: Manual paywall trigger component
export function PaywallTrigger({ children, onPurchaseComplete }: {
  children: React.ReactNode;
  onPurchaseComplete?: (success: boolean) => void;
}) {
  const showPaywall = async () => {
    try {
      console.log('🎯 Manually presenting RevenueCat paywall');

      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: 'premium'
      });

      if (paywallResult === PAYWALL_RESULT.PURCHASED ||
          paywallResult === PAYWALL_RESULT.RESTORED) {
        onPurchaseComplete?.(true);
      }

    } catch (error: any) {
      console.error('❌ Manual paywall error:', error);
      Alert.alert('Error', error.message || 'Failed to show subscription options');
    }
  };

  return (
    <View onTouchEnd={showPaywall}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'DM Sans',
  },
});