let clerkInstance = null;

export async function initClerk() {
  // Wait for the CDN script to populate window.Clerk
  await new Promise((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(() => {
      if (window.Clerk) {
        clearInterval(interval);
        resolve();
      } else if (++attempts > 100) {
        clearInterval(interval);
        reject(new Error('ClerkJS failed to load'));
      }
    }, 100);
  });
  // Re-load with UI components enabled
  await window.Clerk.load();
  clerkInstance = window.Clerk;
  return clerkInstance;
}

export function isSignedIn() {
  return !!(clerkInstance && clerkInstance.user);
}

export function mountSignIn(el) {
  if (!clerkInstance) return;
  clerkInstance.mountSignIn(el, {
    afterSignInUrl: window.location.href,
    afterSignUpUrl: window.location.href,
    redirectUrl: window.location.href,
    appearance: {
      variables: {
        colorPrimary: '#D4A04A',
        colorBackground: '#141310',
        colorText: '#F0EAE0',
        colorTextSecondary: 'rgba(240, 234, 224, 0.5)',
        colorInputBackground: '#1A1815',
        colorInputText: '#F0EAE0',
        borderRadius: '14px',
        fontFamily: "'DM Sans', sans-serif",
      },
      elements: {
        card: { background: '#141310', border: '1px solid rgba(240, 234, 224, 0.08)', boxShadow: 'none' },
        headerTitle: { fontFamily: "'Cormorant Garamond', serif", color: '#F0EAE0' },
        headerSubtitle: { color: 'rgba(240, 234, 224, 0.5)' },
        formButtonPrimary: { background: '#D4A04A', color: '#0C0B09', fontWeight: '600' },
        footerActionLink: { color: '#D4A04A' },
        identityPreviewEditButton: { color: '#D4A04A' },
      }
    }
  });
}

export function mountUserMenu(el) {
  if (!clerkInstance || !clerkInstance.user) return;

  const user = clerkInstance.user;
  const avatarUrl = user.imageUrl;
  const name = user.fullName || user.primaryEmailAddress?.emailAddress || '';

  el.innerHTML = `
    <button class="user-menu__trigger" aria-label="User menu">
      <img class="user-menu__avatar" src="${avatarUrl}" alt="${name}" />
    </button>
    <div class="user-menu__dropdown">
      <div class="user-menu__info">
        <img class="user-menu__avatar-lg" src="${avatarUrl}" alt="" />
        <span class="user-menu__name">${name}</span>
      </div>
      <div class="user-menu__divider"></div>
      <button class="user-menu__item" data-action="settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Settings
      </button>
      <button class="user-menu__item" data-action="signout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign out
      </button>
    </div>
  `;

  const trigger = el.querySelector('.user-menu__trigger');
  const dropdown = el.querySelector('.user-menu__dropdown');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('user-menu__dropdown--open');
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('user-menu__dropdown--open');
  });

  el.querySelector('[data-action="settings"]').addEventListener('click', () => {
    dropdown.classList.remove('user-menu__dropdown--open');
    window.location.hash = '#/settings';
  });

  el.querySelector('[data-action="signout"]').addEventListener('click', () => {
    clerkInstance.signOut();
  });
}

export function getClerk() {
  return clerkInstance;
}
