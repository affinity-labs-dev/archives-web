import { useState, useEffect, useCallback } from 'react';
import Purchases, {
  CustomerInfo,
  Offerings,
  PurchasesPackage,
  PurchasesError,
  PURCHASES_ERROR_CODE
} from 'react-native-purchases';

// Constants matching the sample app configuration
const REVENUECAT_API_KEY = 'appl_oxMRgfHsashdXXOSrczqvnYYIxg';
const ENTITLEMENT_IDENTIFIER = 'Access of All Eras';

interface UseRevenueCatReturn {
  // Subscription state
  isSubscribed: boolean;
  customerInfo: CustomerInfo | null;

  // Offerings and packages
  offerings: Offerings | null;
  monthlyPackage: PurchasesPackage | null;
  yearlyPackage: PurchasesPackage | null;

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
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isFetchingOfferings, setIsFetchingOfferings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived state - check if user has active subscription
  const isSubscribed = customerInfo?.entitlements.active[ENTITLEMENT_IDENTIFIER]?.isActive ?? false;

  // Extract packages from offerings using package types (following sample app pattern)
  // This approach is more reliable than searching by product IDs
  const findPackageByType = (packageType: string): PurchasesPackage | null => {
    // Try current offering first
    if (offerings?.current?.availablePackages) {
      const found = offerings.current.availablePackages.find(
        pkg => pkg.packageType === packageType
      );
      if (found) return found;
    }

    // Try all offerings if not found in current
    if (offerings?.all) {
      for (const offeringKey in offerings.all) {
        const offering = offerings.all[offeringKey];
        const found = offering.availablePackages.find(
          pkg => pkg.packageType === packageType
        );
        if (found) return found;
      }
    }

    return null;
  };

  // Use package types instead of hardcoded product IDs (following sample app pattern)
  const monthlyPackage = findPackageByType('MONTHLY') ||
    offerings?.current?.availablePackages?.find(pkg =>
      pkg.storeProduct?.productIdentifier?.includes('MONTH') ||
      pkg.identifier?.toLowerCase().includes('month')
    ) || null;

  const yearlyPackage = findPackageByType('ANNUAL') ||
    offerings?.current?.availablePackages?.find(pkg =>
      pkg.storeProduct?.productIdentifier?.includes('YEAR') ||
      pkg.identifier?.toLowerCase().includes('year') ||
      pkg.identifier?.toLowerCase().includes('annual')
    ) || null;

  // Initialize RevenueCat and set up listeners
  useEffect(() => {
    let mounted = true;

    const initializeRevenueCat = async () => {
      try {
        console.log('🚀 Initializing RevenueCat with API key:', REVENUECAT_API_KEY);

        // Configure RevenueCat with the same API key as sample app
        Purchases.configure({ apiKey: REVENUECAT_API_KEY });

        // Set up customer info listener for real-time updates
        // This replicates the sample app's customerInfoStream pattern
        Purchases.addCustomerInfoUpdateListener((info) => {
          if (mounted) {
            console.log('📱 Customer info updated:', {
              userId: info.originalPurchaser,
              entitlements: Object.keys(info.entitlements.active),
              isSubscribed: info.entitlements.active[ENTITLEMENT_IDENTIFIER]?.isActive ?? false
            });
            setCustomerInfo(info);
          }
        });

        // Fetch initial customer info
        const initialCustomerInfo = await Purchases.getCustomerInfo();
        if (mounted) {
          setCustomerInfo(initialCustomerInfo);
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
          productId: pkg.storeProduct?.productIdentifier || 'N/A',
          price: pkg.storeProduct?.priceString || 'N/A',
          packageType: pkg.packageType
        })));
      }

      // Debug: Look for packages using new approach (package types + fallbacks)
      const monthlyByType = fetchedOfferings.current?.availablePackages.find(pkg => pkg.packageType === 'MONTHLY');
      const yearlyByType = fetchedOfferings.current?.availablePackages.find(pkg => pkg.packageType === 'ANNUAL');
      const monthlyByName = fetchedOfferings.current?.availablePackages.find(pkg =>
        pkg.storeProduct?.productIdentifier?.includes('MONTH') ||
        pkg.identifier?.toLowerCase().includes('month')
      );
      const yearlyByName = fetchedOfferings.current?.availablePackages.find(pkg =>
        pkg.storeProduct?.productIdentifier?.includes('YEAR') ||
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
        monthlyPrice: (monthlyByType || monthlyByName)?.storeProduct?.priceString,
        yearlyPrice: (yearlyByType || yearlyByName)?.storeProduct?.priceString
      });

      // If no current offering is set, but we have offerings available, warn about it
      if (!fetchedOfferings.current && Object.keys(fetchedOfferings.all || {}).length > 0) {
        console.warn('⚠️ No current offering set in RevenueCat dashboard. Available offerings:', Object.keys(fetchedOfferings.all || {}));
        console.warn('⚠️ Consider setting a "current" offering in your RevenueCat dashboard for easier product access.');
      }

      setOfferings(fetchedOfferings);
    } catch (error) {
      console.error('❌ Failed to fetch offerings:', error);
      setError('Failed to load subscription options');
    } finally {
      setIsFetchingOfferings(false);
    }
  }, [isFetchingOfferings]);

  // Purchase function - replicates sample app's purchase flow
  const purchase = useCallback(async (packageToPurchase: PurchasesPackage) => {
    if (isPurchasing) return;

    setIsPurchasing(true);
    setError(null);

    try {
      console.log('💳 Starting purchase for package:', packageToPurchase.identifier);

      // This replicates the exact purchase flow from sample app
      const { customerInfo: updatedCustomerInfo, userCancelled } = await Purchases.purchasePackage(packageToPurchase);

      // Check if user cancelled (matching sample app logic)
      if (userCancelled) {
        console.log('🚫 User cancelled purchase');
        return;
      }

      console.log('✅ Purchase successful!', {
        userId: updatedCustomerInfo.originalPurchaser,
        entitlements: Object.keys(updatedCustomerInfo.entitlements.active),
        isSubscribed: updatedCustomerInfo.entitlements.active[ENTITLEMENT_IDENTIFIER]?.isActive ?? false
      });

      // Update customer info (this will trigger real-time UI updates)
      setCustomerInfo(updatedCustomerInfo);

    } catch (error) {
      console.error('❌ Purchase failed:', error);

      // Handle specific error types
      const purchasesError = error as PurchasesError;
      let errorMessage = 'Purchase failed. Please try again.';

      switch (purchasesError.code) {
        case PURCHASES_ERROR_CODE.PURCHASE_CANCELLED:
          errorMessage = 'Purchase was cancelled';
          break;
        case PURCHASES_ERROR_CODE.STORE_PROBLEM:
          errorMessage = 'There was a problem with the App Store. Please try again later.';
          break;
        case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED:
          errorMessage = 'Purchases are not allowed on this device';
          break;
        case PURCHASES_ERROR_CODE.PAYMENT_PENDING:
          errorMessage = 'Payment is pending approval';
          break;
        case PURCHASES_ERROR_CODE.INSUFFICIENT_PERMISSIONS:
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
        userId: restoredCustomerInfo.originalPurchaser,
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