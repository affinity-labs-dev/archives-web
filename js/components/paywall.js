// Paywall modal component
import { getOfferings, purchasePackage, restorePurchases } from '../services/revenuecat.js';

var paywallEl = null;

export function showPaywall(onSuccess) {
  if (paywallEl) return; // prevent duplicates

  paywallEl = document.createElement('div');
  paywallEl.className = 'paywall-overlay';
  paywallEl.innerHTML =
    '<div class="paywall">'
    + '<button class="paywall__close" id="pw-close">&times;</button>'
    + '<div class="paywall__icon">'
    + '<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>'
    + '</div>'
    + '<h2 class="paywall__title">Unlock Premium</h2>'
    + '<p class="paywall__subtitle">Access all eras, AI chat, and past daily stories</p>'
    + '<ul class="paywall__features">'
    + '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> All premium eras &amp; adventures</li>'
    + '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> AI-powered "Chat to Learn More"</li>'
    + '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Past daily stories archive</li>'
    + '</ul>'
    + '<div class="paywall__packages" id="pw-packages">'
    + '<div class="paywall__loading"><div class="spinner"></div>Loading plans...</div>'
    + '</div>'
    + '<button class="paywall__cta" id="pw-subscribe" disabled>Subscribe Now</button>'
    + '<button class="paywall__restore" id="pw-restore">Restore Purchases</button>'
    + '</div>';

  document.body.appendChild(paywallEl);

  // Animate in
  requestAnimationFrame(function() { paywallEl.classList.add('paywall-overlay--visible'); });

  // Close handlers
  document.getElementById('pw-close').addEventListener('click', hidePaywall);
  paywallEl.addEventListener('click', function(e) {
    if (e.target === paywallEl) hidePaywall();
  });

  // Fetch offerings
  var selectedPkg = null;

  getOfferings().then(function(offerings) {
    var pkgsEl = document.getElementById('pw-packages');
    if (!pkgsEl) return;

    var current = offerings.current;
    if (!current || !current.availablePackages || current.availablePackages.length === 0) {
      pkgsEl.innerHTML = '<div class="paywall__error">No plans available right now.</div>';
      return;
    }

    var pkgs = current.availablePackages;
    var html = '';
    pkgs.forEach(function(pkg, i) {
      var product = pkg.rcBillingProduct || pkg.product || {};
      var price = product.currentPrice
        ? (product.currentPrice.formattedPrice || ('$' + (product.currentPrice.amountMicros / 1000000).toFixed(2)))
        : (product.priceString || '');
      var title = product.title || pkg.identifier || 'Plan';
      var period = '';
      if (product.normalPeriodDuration || product.subscriptionPeriod) {
        var dur = product.normalPeriodDuration || product.subscriptionPeriod;
        if (dur === 'P1M' || dur.includes('month')) period = '/ month';
        else if (dur === 'P1Y' || dur.includes('year')) period = '/ year';
        else if (dur === 'P1W' || dur.includes('week')) period = '/ week';
        else period = dur;
      }

      html += '<div class="paywall__pkg' + (i === 0 ? ' paywall__pkg--selected' : '') + '" data-pkg="' + i + '">'
        + '<div class="paywall__pkg-title">' + title + '</div>'
        + '<div class="paywall__pkg-price">' + price + ' <span>' + period + '</span></div>'
        + '</div>';
    });

    pkgsEl.innerHTML = html;
    selectedPkg = pkgs[0];
    document.getElementById('pw-subscribe').disabled = false;

    // Package selection
    pkgsEl.addEventListener('click', function(e) {
      var pkgCard = e.target.closest('.paywall__pkg');
      if (!pkgCard) return;
      pkgsEl.querySelectorAll('.paywall__pkg').forEach(function(p) { p.classList.remove('paywall__pkg--selected'); });
      pkgCard.classList.add('paywall__pkg--selected');
      selectedPkg = pkgs[parseInt(pkgCard.dataset.pkg, 10)];
    });
  }).catch(function(err) {
    console.error('[Paywall] Offerings error:', err);
    var pkgsEl = document.getElementById('pw-packages');
    if (pkgsEl) pkgsEl.innerHTML = '<div class="paywall__error">Failed to load plans. Please try again.</div>';
  });

  // Subscribe button
  document.getElementById('pw-subscribe').addEventListener('click', function() {
    if (!selectedPkg) return;
    var btn = document.getElementById('pw-subscribe');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    purchasePackage(selectedPkg).then(function(success) {
      if (success) {
        hidePaywall();
        if (onSuccess) onSuccess();
      } else {
        btn.disabled = false;
        btn.textContent = 'Subscribe Now';
      }
    });
  });

  // Restore button
  document.getElementById('pw-restore').addEventListener('click', function() {
    var restoreBtn = document.getElementById('pw-restore');
    restoreBtn.textContent = 'Restoring...';

    restorePurchases().then(function(hasPremium) {
      if (hasPremium) {
        hidePaywall();
        if (onSuccess) onSuccess();
      } else {
        restoreBtn.textContent = 'No purchases found';
        setTimeout(function() { restoreBtn.textContent = 'Restore Purchases'; }, 2000);
      }
    });
  });
}

export function hidePaywall() {
  if (!paywallEl) return;
  paywallEl.classList.remove('paywall-overlay--visible');
  setTimeout(function() {
    if (paywallEl && paywallEl.parentNode) {
      paywallEl.parentNode.removeChild(paywallEl);
    }
    paywallEl = null;
  }, 300);
}
