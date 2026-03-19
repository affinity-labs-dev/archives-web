import { route, startRouter } from './router.js';
import { initClerk, isSignedIn, mountSignIn, mountUserMenu } from './auth.js';
import { initPurchases } from './services/revenuecat.js';
import homeView from './views/home.js';
import adventuresView from './views/adventures.js';
import adventureDetailView from './views/adventure-detail.js';
import lessonView from './views/lesson.js';
import quizView from './views/quiz.js';
import dailyHomeView from './views/daily-home.js';
import dailyView from './views/daily.js';
import settingsView from './views/settings.js';

route('/', homeView);
route('/settings', settingsView);
route('/daily', dailyHomeView);
route('/daily/play/:date', dailyView);
route('/daily/play', dailyView);
route('/daily/:date', dailyHomeView);
route('/era/:eraId', adventuresView);
route('/adventure/:readableId', adventureDetailView);
route('/lesson/:readableId/:moduleIndex', lessonView);
route('/quiz/:readableId/:moduleIndex', quizView);

async function boot() {
  const app = document.getElementById('app');

  try {
    const clerk = await initClerk();

    if (clerk.user) {
      startApp(clerk);
    } else {
      showAuthScreen(app, clerk);
    }
  } catch (err) {
    console.error('Clerk init failed:', err);
    startRouter();
  }
}

function startApp(clerk) {
  // Create a fixed UserButton container outside #app so views can't clear it
  let userBtnEl = document.getElementById('clerk-user-button');
  if (!userBtnEl) {
    userBtnEl = document.createElement('div');
    userBtnEl.id = 'clerk-user-button';
    userBtnEl.className = 'header__user';
    document.body.appendChild(userBtnEl);
  }
  mountUserMenu(userBtnEl);

  // Init RevenueCat for premium entitlements (fire-and-forget)
  initPurchases(clerk.user.id).catch(function(err) { console.warn('RevenueCat init:', err); });

  startRouter();
  // Sign-out → reload to auth screen
  clerk.addListener(({ user }) => {
    if (!user) window.location.reload();
  });
}

function showAuthScreen(app, clerk) {
  app.innerHTML = `
    <div class="auth-screen">
      <img class="auth-screen__logo" src="assets/images/archives-logo-light.png" alt="Archives" />
      <div id="clerk-sign-in"></div>
    </div>
  `;
  mountSignIn(document.getElementById('clerk-sign-in'));

  clerk.addListener(({ user }) => {
    if (user) {
      app.innerHTML = '';
      startApp(clerk);
    }
  });
}

boot();
