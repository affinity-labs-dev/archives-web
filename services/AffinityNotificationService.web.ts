/**
 * AffinityNotificationService — no-op on web.
 *
 * Two reasons this is a stub rather than a port.
 *
 * The functional one: every call registers a *native* push token obtained from
 * expo-notifications, alongside a device identifier from react-native-device-info
 * and expo-application. A browser has none of those, so there is nothing to
 * register and nothing for the backend to send to.
 *
 * The security one, which is why this file is required rather than nice to have:
 * the native module reads `EXPO_PUBLIC_AFFINITY_API_KEY` and sends it as
 * `Authorization: Bearer`. Metro inlines every `EXPO_PUBLIC_*` value into the
 * client bundle, so on web that key would be readable by anyone who opened
 * devtools — and it is scoped `users:write` + `devices:write`, so lifting it
 * would let a stranger write to the notification backend. There is no way to
 * ship that key to a browser safely, so the web build must never reference it.
 *
 * `api/_lib/__tests__/no-secrets-shipped.spec.js` fails the build if it ever
 * reappears in dist/.
 *
 * Native is untouched: Metro only resolves this file when platform === 'web'.
 *
 * If web push is ever wanted, it needs a real design - a Web Push subscription
 * registered through a `/api/*` endpoint that holds the key server-side - not a
 * revival of this module.
 */

export async function registerUser(
  _externalId: string,
  _opts?: {
    email?: string | null;
    userType?: 'authenticated' | 'anonymous';
    metadata?: Record<string, unknown>;
  }
): Promise<void> {}

export async function registerDevice(): Promise<void> {}

export async function updatePermission(
  _status: 'granted' | 'denied' | 'undetermined'
): Promise<void> {}

export async function logout(): Promise<void> {}

export async function updateDevice(_fields: {
  push_token?: string;
  notification_permission?: 'granted' | 'denied' | 'undetermined';
  notifications_enabled?: boolean;
  app_version?: string;
  os_version?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {}

export async function reportEvent(
  _deliveryId: string,
  _eventType: 'open' | 'click' | 'dismiss',
  _metadata?: Record<string, unknown>
): Promise<void> {}

export async function registerLiveActivityToken(_params: {
  pushToken: string;
  tokenType: 'push_to_start' | 'activity';
  activityType: string;
  activityId?: string | null;
}): Promise<void> {}

export function getLastRegisteredToken(): string | null {
  return null;
}

export function getDeviceIdentifier(): string | null {
  return null;
}

export default {
  registerUser,
  registerDevice,
  updatePermission,
  updateDevice,
  reportEvent,
  registerLiveActivityToken,
  logout,
  getLastRegisteredToken,
  getDeviceIdentifier,
};
