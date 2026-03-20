var APP_STORE_URL = 'https://apps.apple.com/us/app/archives-islamic-history/id6751173663';
var PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=ai.affinitylabs.archivesexpo';

function isMobilePhone() {
  var ua = navigator.userAgent || '';
  // iPhone is always a phone
  if (/iPhone/i.test(ua)) return 'ios';
  // iPad is a tablet — skip
  if (/iPad/i.test(ua)) return false;
  // Android: check it's not a tablet (tablets usually don't have "Mobile" in UA)
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return 'android';
  // iPadOS Safari reports as Mac — check touch + small screen
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return false;
  return false;
}

export function showAppBanner() {
  var platform = isMobilePhone();
  if (!platform) return false;

  var storeUrl = platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
  var badgeSrc = platform === 'ios'
    ? 'assets/images/app-store-badge.svg'
    : 'assets/images/google-play-badge.png';

  // Show once per day
  var today = new Date().toISOString().split('T')[0];
  if (localStorage.getItem('archives_banner_dismissed') === today) return false;

  var overlay = document.createElement('div');
  overlay.className = 'app-banner';
  overlay.innerHTML = '<div class="app-banner__content">'
    + '<img class="app-banner__logo" src="assets/images/archives-logo-light.png" alt="Archives">'
    + '<h1 class="app-banner__title">Archives is better as an app</h1>'
    + '<p class="app-banner__subtitle">Get the full experience with offline access, notifications, and more.</p>'
    + '<a class="app-banner__store" href="' + storeUrl + '" target="_blank" rel="noopener">'
    + '<img src="' + badgeSrc + '" alt="Download" class="app-banner__badge">'
    + '</a>'
    + '<button class="app-banner__dismiss" id="app-banner-dismiss">Continue to web</button>'
    + '</div>';

  document.body.appendChild(overlay);

  document.getElementById('app-banner-dismiss').addEventListener('click', function() {
    localStorage.setItem('archives_banner_dismissed', today);
    overlay.classList.add('app-banner--hiding');
    setTimeout(function() { overlay.remove(); }, 300);
  });

  return true;
}
