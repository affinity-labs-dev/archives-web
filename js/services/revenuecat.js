// RevenueCat entitlement wrapper.
//
// Two sources of truth, in order:
//   1. The Web Billing SDK, keyed on the Clerk user id. Covers everyone whose
//      RevenueCat customer is already the Clerk id (App Store, Play, promotional,
//      and web-billing buyers who checked out while signed in).
//   2. The restore-entitlement Edge Function, for purchases sitting under a
//      different RevenueCat id (email, or an anonymous onboarding-funnel id).
//      It verifies the Clerk session server-side and aliases the customer onto
//      the Clerk id, so this only has to happen once per user.

import { SUPABASE_URL } from '../api.js';
import { getClerk } from '../auth.js';

// Public Web Billing key for the "Archives (Web Billing)" app (app84d4105344).
// Publishable by design - it is shipped to the browser.
var RC_API_KEY = 'rcb_pIfTfyBWFlWYZnlVJenySSHNokTC';

// Pinned: an unpinned import means a future major can change configure()'s
// signature and every failure looks identical to "not a subscriber".
var RC_SDK_URL = 'https://esm.sh/@revenuecat/purchases-js@1.51.0';

var RESTORE_FN_URL = SUPABASE_URL + '/functions/v1/restore-entitlement';

// The project's only entitlement. Checked by name, with "any active entitlement"
// as a fallback so a dashboard rename can't silently un-premium everyone again.
export var PREMIUM_ENTITLEMENT = 'Subscribers (monthly and Yearly combine)';

var CACHE_PREFIX = 'archives_premium:';

var purchases = null;
var cachedCustomerInfo = null;
var premiumStatus = false;
var currentAppUserId = null;
var managementUrl = null;
var initPromise = null;

// ---------------------------------------------------------------- entitlement

// True if any entitlement is currently active. Accepts either a CustomerInfo or
// the { customerInfo } wrapper some SDK calls return.
export function hasActiveEntitlement(info) {
  var ci = (info && info.customerInfo) || info;
  var active = ci && ci.entitlements && ci.entitlements.active;
  if (!active) return false;
  if (active[PREMIUM_ENTITLEMENT]) return true;
  return Object.keys(active).length > 0;
}

// Latest expiry across active entitlements, as an ISO string. null = lifetime.
export function activeExpiry(info) {
  var ci = (info && info.customerInfo) || info;
  var active = (ci && ci.entitlements && ci.entitlements.active) || {};
  var latest = null;
  for (var key in active) {
    var exp = active[key].expirationDate || active[key].expires_date;
    if (!exp) return null; // no expiry wins - treat as lifetime
    var iso = new Date(exp).toISOString();
    if (!latest || iso > latest) latest = iso;
  }
  return latest;
}

// ---------------------------------------------------------------- local cache

function cacheKey(appUserId) {
  return CACHE_PREFIX + appUserId;
}

export function readCache(appUserId) {
  if (!appUserId) return null;
  try {
    var raw = localStorage.getItem(cacheKey(appUserId));
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.premium !== 'boolean') return null;
    // A cached "premium" past its expiry is stale - don't honour it.
    if (parsed.premium && parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

function writeCache(appUserId, premium, expiresAt) {
  if (!appUserId) return;
  try {
    localStorage.setItem(cacheKey(appUserId), JSON.stringify({
      premium: premium,
      expiresAt: expiresAt || null,
      checkedAt: new Date().toISOString(),
    }));
  } catch (e) { /* quota / private mode - not fatal */ }
}

// ------------------------------------------------------------------- setter

function setPremium(value, expiresAt) {
  var changed = premiumStatus !== value;
  premiumStatus = value;
  window.__archivesPremium = value;
  writeCache(currentAppUserId, value, expiresAt);
  if (changed) {
    window.dispatchEvent(new CustomEvent('archives:premium-changed', {
      detail: { premium: value },
    }));
  }
}

export function isPremium() {
  return premiumStatus;
}

export function getManagementUrl() {
  return managementUrl;
}

// Mirrored on window so auth.js can read it without a circular import, the same
// way it already reads window.__archivesPremium.
function setManagementUrl(url) {
  // Freshest answer wins, including a null one. Keeping the old value would
  // leave a lapsed subscriber pointed at the wrong store's portal.
  managementUrl = url || null;
  window.__archivesManagementUrl = managementUrl;
}

// ------------------------------------------------------------ server restore

// Asks the Edge Function to look for a purchase under any RevenueCat id tied to
// this Clerk user, and to alias it onto the Clerk id if it finds one.
// Returns null when the check could not be performed (no session, network down).
export async function checkEntitlementOnServer() {
  var clerk = getClerk();
  if (!clerk || !clerk.session) return null;

  var token = await clerk.session.getToken();
  if (!token) return null;

  var res = await fetch(RESTORE_FN_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('restore-entitlement HTTP ' + res.status);
  return await res.json();
}

// What to do once both lookups have been tried. 'unknown' means leave the
// current status alone.
//
// The rule that matters: a failed server check is never evidence that someone
// is free. The SDK only sees the Clerk id, and the server is the only thing
// that looks at the user's other RevenueCat ids, so when it cannot answer we
// genuinely do not know - and guessing "free" strips access from a paying
// customer, which is the failure this whole module exists to prevent.
export function decideStatus(sdkAnswered, serverResult, serverFailed) {
  if (serverFailed) return 'unknown';
  if (serverResult) return serverResult.premium ? 'premium' : 'free';
  return sdkAnswered ? 'free' : 'unknown';
}

// ---------------------------------------------------------------------- init

export async function initPurchases(appUserId) {
  if (initPromise) return initPromise;

  currentAppUserId = appUserId;

  // Seed from cache synchronously, before anything awaits. app.js calls
  // startRouter() on the next line, so without this a subscriber's first paint
  // always renders as free.
  var cached = readCache(appUserId);
  if (cached) {
    premiumStatus = cached.premium;
    window.__archivesPremium = cached.premium;
  } else {
    window.__archivesPremium = premiumStatus;
  }

  initPromise = (async function () {
    var sdkAnswered = false;

    try {
      var mod = await import(/* @vite-ignore */ RC_SDK_URL);
      var Purchases = mod.Purchases || mod.default;

      try {
        purchases = Purchases.configure({ apiKey: RC_API_KEY, appUserId: appUserId });
      } catch (e) {
        // Older signature.
        purchases = Purchases.configure(RC_API_KEY, appUserId);
      }

      var info = await purchases.getCustomerInfo();
      cachedCustomerInfo = info.customerInfo || info;
      setManagementUrl(cachedCustomerInfo.managementURL);
      sdkAnswered = true;
      setPremium(hasActiveEntitlement(cachedCustomerInfo), activeExpiry(cachedCustomerInfo));
    } catch (err) {
      // Do NOT downgrade here - a failed request is not evidence of no
      // subscription. Whatever the cache seeded stands.
      console.warn('[RevenueCat] SDK init failed:', err);
    }

    // Only worth asking the server when the SDK found nothing: that is exactly
    // the case where the purchase may live under another RevenueCat id.
    if (!premiumStatus) {
      var serverResult = null;
      var serverFailed = false;

      try {
        serverResult = await checkEntitlementOnServer();
      } catch (err) {
        serverFailed = true;
        console.warn('[RevenueCat] Server entitlement check failed:', err);
      }

      var decision = decideStatus(sdkAnswered, serverResult, serverFailed);
      if (decision !== 'unknown') {
        // Before setPremium: that dispatches the event that re-renders the
        // user menu, which reads the management URL off window.
        if (serverResult) setManagementUrl(serverResult.managementUrl);
        setPremium(decision === 'premium', serverResult ? serverResult.expiresAt : null);
      }
      if (serverResult && serverResult.linked) {
        console.log('[RevenueCat] Linked purchase from', serverResult.source);
      }
    }

    console.log('[RevenueCat] Ready. Premium:', premiumStatus);
  })();

  return initPromise;
}

// Resolves once the first authoritative answer is in.
export function premiumReady() {
  return initPromise || Promise.resolve();
}

// ------------------------------------------------------------------ purchase

export async function getOfferings() {
  if (!purchases) throw new Error('RevenueCat not initialized');
  return await purchases.getOfferings();
}

export async function purchasePackage(pkg) {
  if (!purchases) throw new Error('RevenueCat not initialized');
  try {
    var result = await purchases.purchase({ rcPackage: pkg });
    cachedCustomerInfo = result.customerInfo || result;
    setPremium(hasActiveEntitlement(cachedCustomerInfo), activeExpiry(cachedCustomerInfo));
    return premiumStatus;
  } catch (err) {
    console.error('[RevenueCat] Purchase error:', err);
    return false;
  }
}

// ------------------------------------------------------------------- restore

// The server path is the one that can actually restore something: it searches
// every RevenueCat id tied to this Clerk user, not just the configured one.
export async function restorePurchases() {
  var serverFailed = false;

  try {
    var result = await checkEntitlementOnServer();
    if (result) {
      setManagementUrl(result.managementUrl);
      setPremium(!!result.premium, result.expiresAt);
      return premiumStatus;
    }
  } catch (err) {
    serverFailed = true;
    console.warn('[RevenueCat] Server restore failed, falling back to SDK:', err);
  }

  if (!purchases) return premiumStatus;
  try {
    var info = await purchases.getCustomerInfo();
    cachedCustomerInfo = info.customerInfo || info;
    var sdkPremium = hasActiveEntitlement(cachedCustomerInfo);
    setManagementUrl(cachedCustomerInfo.managementURL);
    // The SDK only knows about the Clerk id. When the server check never
    // completed, its "no" is not the whole picture, so let it grant access but
    // not revoke it.
    if (sdkPremium || !serverFailed) {
      setPremium(sdkPremium, activeExpiry(cachedCustomerInfo));
    }
    return premiumStatus;
  } catch (err) {
    console.error('[RevenueCat] Restore error:', err);
    return premiumStatus;
  }
}
