import { useEffect, useState } from 'react';
import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

interface UseRevenueCatReturn {
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  isSubscribed: boolean;
  loading: boolean;
  error: string | null;
  refreshCustomerInfo: () => Promise<void>;
  purchasePackage: (purchasePackage: PurchasesPackage) => Promise<boolean>;
  getPackageForPlan: (plan: 'monthly' | 'yearly') => PurchasesPackage | null;
}

export function useRevenueCat(): UseRevenueCatReturn {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has active subscription (using latest RevenueCat pattern)
  const isSubscribed = typeof customerInfo?.entitlements?.active?.['premium'] !== "undefined";

  const refreshCustomerInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      console.log('✅ RevenueCat customer info refreshed:', {
        userId: info.originalAppUserId,
        entitlements: Object.keys(info.entitlements.active),
        isSubscribed: Object.keys(info.entitlements.active).length > 0
      });
    } catch (err: any) {
      console.error('❌ Error fetching customer info:', err);
      if (err.message?.includes('singleton instance')) {
        setError('RevenueCat not initialized yet');
      } else {
        setError(err.message || 'Failed to fetch customer info');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOfferings = async () => {
    try {
      console.log('🔄 Starting fetchOfferings...');

      // First check if RevenueCat is configured
      try {
        await Purchases.getCustomerInfo();
        console.log('✅ RevenueCat configuration check passed');
      } catch (configError: any) {
        if (configError.message?.includes('singleton instance')) {
          console.log('⏳ RevenueCat not configured yet, skipping offerings fetch');
          return;
        }
        console.error('❌ RevenueCat configuration error:', configError);
        throw configError;
      }

      console.log('📡 Calling Purchases.getOfferings()...');
      const offeringsResponse = await Purchases.getOfferings();

      console.log('📨 Raw offerings response:', {
        current: !!offeringsResponse.current,
        all: Object.keys(offeringsResponse.all),
        currentId: offeringsResponse.current?.identifier
      });

      if (offeringsResponse.current) {
        setOfferings(offeringsResponse.current);
        console.log('✅ RevenueCat offerings loaded:', {
          offeringId: offeringsResponse.current.identifier,
          packagesCount: offeringsResponse.current.availablePackages.length,
          packages: offeringsResponse.current.availablePackages.map(pkg => ({
            id: pkg.identifier,
            productId: pkg.storeProduct.identifier,
            price: pkg.storeProduct.priceString,
            packageType: pkg.packageType
          }))
        });
      } else {
        console.log('⚠️ No current offering configured in RevenueCat. All offerings:', Object.keys(offeringsResponse.all));
        setOfferings(null);
      }
    } catch (err: any) {
      console.error('❌ Error fetching offerings:', err);
      console.error('❌ Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      if (err.message?.includes('singleton instance')) {
        console.log('⏳ RevenueCat not ready for offerings, skipping...');
      } else {
        setError(err.message || 'Failed to fetch offerings');
      }
    }
  };

  // Debug function to test StoreKit connectivity
  const testStoreKit = async () => {
    try {
      console.log('🧪 Testing basic StoreKit...');
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('🧪 Customer info retrieved:', customerInfo.activeSubscriptions);

      // Try to get products directly
      const offerings = await Purchases.getOfferings();
      console.log('🧪 Offerings result:', offerings);

      // Test direct product fetch
      const products = await Purchases.getProducts(['ARCHIVESMONTH', 'ARCHIVESYEAR']);
      console.log('🧪 Direct products fetch:', products.map(p => ({ id: p.identifier, price: p.priceString })));

    } catch (error) {
      console.log('🧪 StoreKit test error:', error);
    }
  };

  const purchasePackage = async (purchasePackage: PurchasesPackage): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🛒 Attempting RevenueCat purchase:', {
        packageId: purchasePackage.identifier,
        productId: purchasePackage.storeProduct.identifier,
        price: purchasePackage.storeProduct.priceString
      });

      const { customerInfo: updatedInfo } = await Purchases.purchasePackage(purchasePackage);
      setCustomerInfo(updatedInfo);

      const success = updatedInfo.entitlements.active['premium'] !== undefined;

      if (success) {
        console.log('✅ RevenueCat purchase successful!', {
          entitlements: Object.keys(updatedInfo.entitlements.active),
          userId: updatedInfo.originalAppUserId
        });
      } else {
        console.log('⚠️ RevenueCat purchase completed but premium entitlement not active');
      }

      return success;
    } catch (err: any) {
      console.error('❌ RevenueCat purchase error:', err);
      setError(err.message || 'Purchase failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getPackageForPlan = (plan: 'monthly' | 'yearly'): PurchasesPackage | null => {
    console.log(`🔍 Looking for ${plan} package...`);

    if (!offerings?.availablePackages) {
      console.log('❌ No offerings or availablePackages found:', {
        offerings: !!offerings,
        availablePackages: offerings?.availablePackages
      });
      return null;
    }

    console.log('📦 Available packages:', offerings.availablePackages.map(pkg => ({
      identifier: pkg.identifier,
      productId: pkg.storeProduct.identifier,
      price: pkg.storeProduct.priceString
    })));

    // Look for packages based on common RevenueCat naming conventions
    const targetPackage = offerings.availablePackages.find(pkg => {
      const identifier = pkg.identifier.toLowerCase();
      const productId = pkg.storeProduct.identifier.toLowerCase();

      console.log(`🔍 Checking package:`, {
        identifier: pkg.identifier,
        identifierLower: identifier,
        productId: pkg.storeProduct.identifier,
        productIdLower: productId,
        searchingFor: plan
      });

      if (plan === 'monthly') {
        const matches = identifier.includes('monthly') || identifier.includes('month') ||
               productId.includes('monthly') || productId.includes('month');
        console.log(`🔍 Monthly match check:`, { matches, identifier, productId });
        return matches;
      } else {
        const matches = identifier.includes('yearly') || identifier.includes('annual') || identifier.includes('year') ||
               productId.includes('yearly') || productId.includes('annual') || productId.includes('year');
        console.log(`🔍 Yearly match check:`, { matches, identifier, productId });
        return matches;
      }
    });

    if (targetPackage) {
      console.log(`✅ Found ${plan} package:`, {
        id: targetPackage.identifier,
        productId: targetPackage.storeProduct.identifier,
        price: targetPackage.storeProduct.priceString
      });
    } else {
      console.log(`❌ No ${plan} package found in offerings. Available packages:`,
        offerings.availablePackages.map(pkg => `${pkg.identifier} (${pkg.storeProduct.identifier})`));
    }

    return targetPackage || null;
  };

  useEffect(() => {
    // Wait for RevenueCat to be initialized before calling any methods
    const initializeRevenueCat = async () => {
      try {
        // Check if RevenueCat API keys are available first
        const hasIosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
        const hasAndroidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

        if (!hasIosKey && !hasAndroidKey) {
          console.log('⚠️ RevenueCat API keys not configured, skipping initialization');
          setLoading(false);
          return;
        }

        // Wait longer to ensure RevenueCat is configured first
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test if RevenueCat is configured by attempting to get customer info
        try {
          await Purchases.getCustomerInfo();
          console.log('✅ RevenueCat is properly configured, proceeding with initialization');

          // Run debug test to check StoreKit connectivity
          await testStoreKit();

          await refreshCustomerInfo();
          await fetchOfferings();
        } catch (configError: any) {
          if (configError.message?.includes('singleton instance')) {
            console.log('⏳ RevenueCat not ready yet, will skip for now');
            setLoading(false);
            return;
          }
          throw configError;
        }
      } catch (err: any) {
        console.error('❌ RevenueCat initialization in hook failed:', err);
        // Always set loading to false to prevent infinite loading states
        setLoading(false);
        if (err.message?.includes('singleton instance')) {
          setError('RevenueCat is not configured. Subscription features unavailable.');
        } else {
          setError(err.message || 'Failed to initialize RevenueCat');
        }
      }
    };

    initializeRevenueCat();
  }, []);

  return {
    customerInfo,
    offerings,
    isSubscribed,
    loading,
    error,
    refreshCustomerInfo,
    purchasePackage,
    getPackageForPlan
  };
}