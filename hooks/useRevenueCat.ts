import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesError,
  PURCHASES_ERROR_CODE,
  IntroEligibility,
  INTRO_ELIGIBILITY_STATUS
} from 'react-native-purchases';
import { analyticsService } from '@/services/AnalyticsService';

// Platform-specific RevenueCat API keys
const REVENUECAT_API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || 'appl_oxMRgfHsashdXXOSrczqvnYYIxg',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || 'goog_aJrTsOTWwhjzorwbmCTJADKObSG',
  default: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || 'appl_oxMRgfHsashdXXOSrczqvnYYIxg'
}) as string;

const ENTITLEMENT_IDENTIFIER = 'Subscribers (monthly and Yearly combine)';

/**
 * Sync RevenueCat subscription status to PostHog person properties.
 * Called whenever CustomerInfo updates (listener, initial fetch, restore, purchase).
 */
function syncSubscriptionToPostHog(info: CustomerInfo) {
  const entitlement = info.entitlements.active[ENTITLEMENT_IDENTIFIER];

  if (entitlement?.isActive) {
    const productId = entitlement.productIdentifier;
    // Derive billing cycle from the product identifier
    let billingCycle = 'unknown';
    if (productId?.toLowerCase().includes('lifetime')) {
      billingCycle = 'lifetime';
    } else if (productId?.toLowerCase().includes('year') || productId?.toLowerCase().includes('annual')) {
      billingCycle = 'yearly';
    } else if (productId?.toLowerCase().includes('month')) {
      billingCycle = 'monthly';
    }

    analyticsService.updateSubscriptionProperties({
      rc_subscription_status: 'active',
      subscription_product_id: productId || null,
      subscription_billing_cycle: billingCycle,
    });
  } else {
    analyticsService.updateSubscriptionProperties({
      rc_subscription_status: 'inactive',
      subscription_product_id: null,
      subscription_billing_cycle: null,
    });
  }
}

interface UseRevenueCatReturn {
  // Subscription state
  isSubscribed: boolean;
  customerInfo: CustomerInfo | null;

  // Offerings and packages
  offerings: PurchasesOfferings | null;
  monthlyPackage: PurchasesPackage | null;
  yearlyPackage: PurchasesPackage | null;

  // Intro offer eligibility (iOS only)
  monthlyEligibility: IntroEligibility | null;
  yearlyEligibility: IntroEligibility | null;

  // Purchase flow
  purchase: (packageToPurchase: PurchasesPackage) => Promise<void>;
  purchasePackage: (packageType: 'monthly' | 'yearly') => Promise<void>;

  // Loading states
  isLoading: boolean;
  isPurchasing: boolean;
  isFetchingOfferings: boolean;

  // Actions
  fetchOfferings: () => Promise<void>;
  restorePurchases: () => Promise<void>;

  // Error handling
  error: string | null;
}

export const useRevenueCat = (): UseRevenueCatReturn => {
  // State management - matching sample app patterns
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isFetchingOfferings, setIsFetchingOfferings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Intro offer eligibility state (iOS only)
  const [monthlyEligibility, setMonthlyEligibility] = useState<IntroEligibility | null>(null);
  const [yearlyEligibility, setYearlyEligibility] = useState<IntroEligibility | null>(null);

  // Derived state - check if user has active subscription
  const isSubscribed = customerInfo?.entitlements.active[ENTITLEMENT_IDENTIFIER]?.isActive ?? false;

  // Extract packages from offerings using package types (following sample app pattern)
  // This approach is more reliable than searching by product IDs
  const findPackageByType = (packageType: string): PurchasesPackage | null => {
    // Try current offering first
    if (offerings?.current?.availablePackages) {
      const found = offerings.current.availablePackages.find(
        (pkg: PurchasesPackage) => pkg.packageType === packageType
      );
      if (found) return found;
    }

    // Try all offerings if not found in current
    if (offerings?.all) {
      for (const offeringKey in offerings.all) {
        const offering = offerings.all[offeringKey];
        const found = offering.availablePackages.find(
          (pkg: PurchasesPackage) => pkg.packageType === packageType
        );
        if (found) return found;
      }
    }

    return null;
  };

  // Use package types instead of hardcoded product IDs (following sample app pattern)
  const monthlyPackage = findPackageByType('MONTHLY') ||
    offerings?.current?.availablePackages?.find((pkg: PurchasesPackage) =>
      pkg.product?.identifier?.includes('MONTH') ||
      pkg.identifier?.toLowerCase().includes('month')
    ) || null;

  const yearlyPackage = findPackageByType('ANNUAL') ||
    offerings?.current?.availablePackages?.find((pkg: PurchasesPackage) =>
      pkg.product?.identifier?.includes('YEAR') ||
      pkg.identifier?.toLowerCase().includes('year') ||
      pkg.identifier?.toLowerCase().includes('annual')
    ) || null;

  // Initialize RevenueCat and set up listeners
  useEffect(() => {
    let mounted = true;

    const initializeRevenueCat = async () => {
      // Skip RevenueCat on web - it only works on iOS/Android
      if (Platform.OS === 'web') {
        console.log('ℹ️ Skipping RevenueCat initialization on web');
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        console.log(`🚀 Initializing RevenueCat for ${Platform.OS} with API key:`, REVENUECAT_API_KEY);

        // Configure RevenueCat with platform-specific API key
        // CRITICAL: useAmazon must be false for Google Play Store (Android)
        Purchases.configure({
          apiKey: REVENUECAT_API_KEY,
          appUserID: null,      // Let RevenueCat manage anonymous user IDs
          useAmazon: false      // Use Google Play Store, not Amazon App Store
        });

        // Set up customer info listener for real-time updates
        // This replicates the sample app's customerInfoStream pattern
        Purchases.addCustomerInfoUpdateListener((info) => {
          if (mounted) {
            console.log('📱 Customer info updated:', {
              userId: info.originalAppUserId,
              entitlements: Object.keys(info.entitlements.active),
              isSubscribed: info.entitlements.active[ENTITLEMENT_IDENTIFIER]?.isActive ?? false
            });
            setCustomerInfo(info);
            syncSubscriptionToPostHog(info);
          }
        });

        // Fetch initial customer info
        const initialCustomerInfo = await Purchases.getCustomerInfo();
        if (mounted) {
          setCustomerInfo(initialCustomerInfo);
          syncSubscriptionToPostHog(initialCustomerInfo);
        }

        // Fetch initial offerings
        await fetchOfferings();

      } catch (error) {
        console.error('❌ Failed to initialize RevenueCat:', error);
        if (mounted) {
          setError('Failed to initialize subscription service');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeRevenueCat();

    // Cleanup function
    return () => {
      mounted = false;
      // Remove listeners if needed
    };
  }, []);

  // Fetch offerings from RevenueCat dashboard
  const fetchOfferings = useCallback(async () => {
    if (isFetchingOfferings) return;

    setIsFetchingOfferings(true);
    setError(null);

    try {
      console.log('📦 Fetching offerings from RevenueCat...');
      const fetchedOfferings = await Purchases.getOfferings();

      console.log('📦 Offerings fetched:', {
        current: fetchedOfferings.current?.identifier,
        availablePackages: fetchedOfferings.current?.availablePackages.length,
        allOfferings: Object.keys(fetchedOfferings.all || {}),
      });

      // Debug: Log all available packages and their product IDs
      if (fetchedOfferings.current?.availablePackages) {
        console.log('📦 Available packages:', fetchedOfferings.current.availablePackages.map(pkg => ({
          identifier: pkg.identifier,
          productId: pkg.product?.identifier || 'N/A',
          price: pkg.product?.priceString || 'N/A',
          packageType: pkg.packageType
        })));
      }

      // Debug: Look for packages using new approach (package types + fallbacks)
      const monthlyByType = fetchedOfferings.current?.availablePackages.find(pkg => pkg.packageType === 'MONTHLY');
      const yearlyByType = fetchedOfferings.current?.availablePackages.find(pkg => pkg.packageType === 'ANNUAL');
      const monthlyByName = fetchedOfferings.current?.availablePackages.find(pkg =>
        pkg.product?.identifier?.includes('MONTH') ||
        pkg.identifier?.toLowerCase().includes('month')
      );
      const yearlyByName = fetchedOfferings.current?.availablePackages.find(pkg =>
        pkg.product?.identifier?.includes('YEAR') ||
        pkg.identifier?.toLowerCase().includes('year') ||
        pkg.identifier?.toLowerCase().includes('annual')
      );

      console.log('📦 Package detection results (new approach):', {
        monthlyByType: !!monthlyByType,
        yearlyByType: !!yearlyByType,
        monthlyByName: !!monthlyByName,
        yearlyByName: !!yearlyByName,
        finalMonthly: !!(monthlyByType || monthlyByName),
        finalYearly: !!(yearlyByType || yearlyByName),
        monthlyPrice: (monthlyByType || monthlyByName)?.product?.priceString,
        yearlyPrice: (yearlyByType || yearlyByName)?.product?.priceString
      });

      // If no current offering is set, but we have offerings available, warn about it
      if (!fetchedOfferings.current && Object.keys(fetchedOfferings.all || {}).length > 0) {
        console.warn('⚠️ No current offering set in RevenueCat dashboard. Available offerings:', Object.keys(fetchedOfferings.all || {}));
        console.warn('⚠️ Consider setting a "current" offering in your RevenueCat dashboard for easier product access.');
      }

      setOfferings(fetchedOfferings);

      // Check intro offer eligibility after offerings are fetched
      await checkIntroEligibility(fetchedOfferings);
    } catch (error) {
      console.error('❌ Failed to fetch offerings:', error);
      setError('Failed to load subscription options');
    } finally {
      setIsFetchingOfferings(false);
    }
  }, [isFetchingOfferings]);

  // Check intro offer eligibility (iOS only)
  const checkIntroEligibility = useCallback(async (fetchedOfferings: PurchasesOfferings) => {
    // Only check on iOS - Android always returns UNKNOWN
    if (Platform.OS !== 'ios') {
      console.log('ℹ️ Skipping intro eligibility check - not on iOS');
      return;
    }

    try {
      // Find monthly and yearly packages from fetched offerings
      const monthlyPkg = findPackageByType('MONTHLY') ||
        fetchedOfferings?.current?.availablePackages?.find((pkg: PurchasesPackage) =>
          pkg.product?.identifier?.includes('MONTH') ||
          pkg.identifier?.toLowerCase().includes('month')
        );

      const yearlyPkg = findPackageByType('ANNUAL') ||
        fetchedOfferings?.current?.availablePackages?.find((pkg: PurchasesPackage) =>
          pkg.product?.identifier?.includes('YEAR') ||
          pkg.identifier?.toLowerCase().includes('year') ||
          pkg.identifier?.toLowerCase().includes('annual')
        );

      // Collect product IDs to check
      const productIds: string[] = [];
      if (monthlyPkg?.product?.identifier) {
        productIds.push(monthlyPkg.product.identifier);
      }
      if (yearlyPkg?.product?.identifier) {
        productIds.push(yearlyPkg.product.identifier);
      }

      if (productIds.length === 0) {
        console.log('⚠️ No product IDs found for eligibility check');
        return;
      }

      console.log('🔍 Checking intro eligibility for products:', productIds);

      // Check eligibility for all products
      const eligibilityMap = await Purchases.checkTrialOrIntroductoryPriceEligibility(productIds);

      console.log('✅ Intro eligibility results:', eligibilityMap);

      // Update state with eligibility for each product
      if (monthlyPkg?.product?.identifier) {
        const monthlyElig = eligibilityMap[monthlyPkg.product.identifier];
        setMonthlyEligibility(monthlyElig);
        console.log('📱 Monthly eligibility:', {
          status: monthlyElig.status,
          description: monthlyElig.description
        });
      }

      if (yearlyPkg?.product?.identifier) {
        const yearlyElig = eligibilityMap[yearlyPkg.product.identifier];
        setYearlyEligibility(yearlyElig);
        console.log('📅 Yearly eligibility:', {
          status: yearlyElig.status,
          description: yearlyElig.description
        });
      }

    } catch (error) {
      console.error('❌ Failed to check intro eligibility:', error);
      // Don't set error state - this is not critical for purchase flow
    }
  }, []);

  // Purchase function - replicates sample app's purchase flow
  const purchase = useCallback(async (packageToPurchase: PurchasesPackage) => {
    if (isPurchasing) return;

    setIsPurchasing(true);
    setError(null);

    try {
      console.log('💳 Starting purchase for package:', packageToPurchase.identifier);

      // Purchase the package - cancellation now throws an error instead of returning userCancelled
      const { customerInfo: updatedCustomerInfo } = await Purchases.purchasePackage(packageToPurchase);

      console.log('✅ Purchase successful!', {
        userId: updatedCustomerInfo.originalAppUserId,
        entitlements: Object.keys(updatedCustomerInfo.entitlements.active),
        isSubscribed: updatedCustomerInfo.entitlements.active[ENTITLEMENT_IDENTIFIER]?.isActive ?? false
      });

      // Update customer info (this will trigger real-time UI updates)
      setCustomerInfo(updatedCustomerInfo);

      // Fire authoritative subscription_purchased event (AFF-111)
      // Only fires on new purchases (not restores) — guarded by being inside purchase()
      const entitlement = updatedCustomerInfo.entitlements.active[ENTITLEMENT_IDENTIFIER];
      if (entitlement?.isActive) {
        const product = packageToPurchase.product;
        const productId = product?.identifier || '';

        // Derive plan type from product identifier
        let planType: 'monthly' | 'yearly' | 'lifetime' = 'yearly';
        if (productId.toLowerCase().includes('lifetime')) {
          planType = 'lifetime';
        } else if (productId.toLowerCase().includes('month')) {
          planType = 'monthly';
        }

        analyticsService.trackSubscriptionPurchased({
          product_id: productId,
          plan_type: planType,
          price_usd: product?.price,
          currency: product?.currencyCode,
          offering_id: packageToPurchase.offeringIdentifier,
          is_trial: entitlement.periodType === 'TRIAL',
        });
      }

    } catch (error) {
      // Handle specific error types
      const purchasesError = error as PurchasesError;

      // User cancellation is now an error with PURCHASE_CANCELLED_ERROR code
      if (purchasesError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        console.log('🚫 User cancelled purchase');
        return; // Don't show error for user cancellation
      }

      console.error('❌ Purchase failed:', error);
      let errorMessage = 'Purchase failed. Please try again.';

      switch (purchasesError.code) {
        case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
          errorMessage = 'There was a problem with the App Store. Please try again later.';
          break;
        case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
          errorMessage = 'Purchases are not allowed on this device';
          break;
        case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
          errorMessage = 'Payment is pending approval';
          break;
        case PURCHASES_ERROR_CODE.INSUFFICIENT_PERMISSIONS_ERROR:
          errorMessage = 'Insufficient permissions for purchase';
          break;
        case PURCHASES_ERROR_CODE.UNKNOWN_ERROR:
        default:
          errorMessage = 'An unexpected error occurred. Please try again.';
          break;
      }

      setError(errorMessage);
    } finally {
      setIsPurchasing(false);
    }
  }, [isPurchasing]);

  // Convenient wrapper for purchasing by package type
  const purchasePackage = useCallback(async (packageType: 'monthly' | 'yearly') => {
    const packageToPurchase = packageType === 'monthly' ? monthlyPackage : yearlyPackage;

    if (!packageToPurchase) {
      setError(`${packageType} subscription package not available`);
      return;
    }

    await purchase(packageToPurchase);
  }, [monthlyPackage, yearlyPackage, purchase]);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Restoring purchases...');
      const restoredCustomerInfo = await Purchases.restorePurchases();

      console.log('🔄 Purchases restored:', {
        userId: restoredCustomerInfo.originalAppUserId,
        entitlements: Object.keys(restoredCustomerInfo.entitlements.active),
        isSubscribed: restoredCustomerInfo.entitlements.active[ENTITLEMENT_IDENTIFIER]?.isActive ?? false
      });

      setCustomerInfo(restoredCustomerInfo);
    } catch (error) {
      console.error('❌ Failed to restore purchases:', error);
      setError('Failed to restore purchases');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // Subscription state
    isSubscribed,
    customerInfo,

    // Offerings and packages
    offerings,
    monthlyPackage,
    yearlyPackage,

    // Intro offer eligibility
    monthlyEligibility,
    yearlyEligibility,

    // Purchase flow
    purchase,
    purchasePackage,

    // Loading states
    isLoading,
    isPurchasing,
    isFetchingOfferings,

    // Actions
    fetchOfferings,
    restorePurchases,

    // Error handling
    error,
  };
};

export default useRevenueCat;