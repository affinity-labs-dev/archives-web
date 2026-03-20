// RevenueCat Web Billing SDK wrapper
// Uses @revenuecat/purchases-js via ESM CDN

var purchases = null;
var cachedCustomerInfo = null;
var premiumStatus = false;
var initPromise = null;

// ⚠️ Replace with your RevenueCat public web API key
var RC_API_KEY = 'rcb_pIfTfyBWFlWYZnlVJenySSHNokTC';

export async function initPurchases(appUserId) {
  if (initPromise) return initPromise;

  initPromise = (async function() {
    try {
      var mod = await import('https://esm.sh/@revenuecat/purchases-js');
      var Purchases = mod.Purchases || mod.default;

      purchases = Purchases.configure(RC_API_KEY, appUserId);
      var info = await purchases.getCustomerInfo();
      cachedCustomerInfo = info.customerInfo || info;
      premiumStatus = !!(cachedCustomerInfo.entitlements &&
        cachedCustomerInfo.entitlements.active &&
        cachedCustomerInfo.entitlements.active['premium']);
      window.__archivesPremium = premiumStatus;
      console.log('[RevenueCat] Initialized. Premium:', premiumStatus);
    } catch (err) {
      console.warn('[RevenueCat] Init error:', err);
      premiumStatus = false;
      window.__archivesPremium = false;
    }
  })();

  return initPromise;
}

export function isPremium() {
  return premiumStatus;
}

export async function getOfferings() {
  if (!purchases) throw new Error('RevenueCat not initialized');
  var result = await purchases.getOfferings();
  return result;
}

export async function purchasePackage(pkg) {
  if (!purchases) throw new Error('RevenueCat not initialized');
  try {
    var result = await purchases.purchase({ rcPackage: pkg });
    cachedCustomerInfo = result.customerInfo || result;
    premiumStatus = !!(cachedCustomerInfo.entitlements &&
      cachedCustomerInfo.entitlements.active &&
      cachedCustomerInfo.entitlements.active['premium']);
    return premiumStatus;
  } catch (err) {
    console.error('[RevenueCat] Purchase error:', err);
    return false;
  }
}

export async function restorePurchases() {
  if (!purchases) throw new Error('RevenueCat not initialized');
  try {
    var info = await purchases.getCustomerInfo();
    cachedCustomerInfo = info.customerInfo || info;
    premiumStatus = !!(cachedCustomerInfo.entitlements &&
      cachedCustomerInfo.entitlements.active &&
      cachedCustomerInfo.entitlements.active['premium']);
    return premiumStatus;
  } catch (err) {
    console.error('[RevenueCat] Restore error:', err);
    return false;
  }
}
