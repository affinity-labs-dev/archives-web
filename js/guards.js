// Route-level entitlement guards.
//
// Gating used to live only on click handlers in home.js and daily-home.js, so
// typing a URL walked straight past it: #/era/:premiumEra, #/adventure/:id and
// #/lesson/:id/:index rendered premium content with no check at all.
//
// This is defence in depth, not the boundary. The content is still fetched with
// the public anon key, so a determined user can read it from PostgREST
// directly. Only server-side row-level security fixes that.

import { getEra } from './api.js';
import { isPremium, premiumReady } from './services/revenuecat.js';

/**
 * Whether the user may open content from this era.
 *
 * Deliberately waits for the authoritative entitlement answer before denying:
 * premiumStatus starts false, so a subscriber who deep-links to a premium
 * lesson would otherwise be shown a paywall for their own content.
 */
export async function canAccessEra(eraId) {
  if (!eraId || isPremium()) return true;

  let era = null;
  try {
    era = await getEra(eraId);
  } catch (err) {
    // Never lock someone out because a lookup failed.
    console.warn('[guard] era lookup failed:', err);
    return true;
  }
  return canAccessEraRecord(era);
}

/** Same check when the caller already has the era row - avoids a second fetch. */
export async function canAccessEraRecord(era) {
  if (isPremium()) return true;
  if (!era || era.status !== 'premium') return true;

  await premiumReady();
  return isPremium();
}

/**
 * Renders a locked state and opens the paywall. `onUnlock` re-runs the view
 * after a successful purchase or restore.
 */
export function renderLocked(app, onUnlock) {
  app.innerHTML =
    '<div class="locked-state">'
    + '<div class="locked-state__icon">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">'
    + '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
    + '</div>'
    + '<h2 class="locked-state__title">Premium content</h2>'
    + '<p class="locked-state__text">Subscribe to unlock this era, or restore a purchase you already made.</p>'
    + '<button class="cta-btn" id="locked-unlock">Unlock Premium</button>'
    + '<a class="locked-state__back" href="#/">Back to home</a>'
    + '</div>';

  const open = () => {
    import('./components/paywall.js')
      .then((pw) => pw.showPaywall(onUnlock))
      .catch((err) => console.warn('[guard] paywall failed to load:', err));
  };

  const btn = document.getElementById('locked-unlock');
  if (btn) btn.addEventListener('click', open);
  open();
}
