/**
 * useOTAUpdates.ts
 *
 * Hook for managing OTA (Over-The-Air) updates via EAS Update.
 * Checks for updates on app foreground, downloads in background,
 * and exposes state + functions for UI to optionally show an update prompt.
 *
 * Does NOT include any UI — consumers decide how to present updates.
 *
 * Exposed functions:
 * - checkForUpdate()  → manually check + download
 * - applyUpdate()     → reload the app with the downloaded update
 *
 * Exposed state (from expo-updates useUpdates):
 * - isChecking, isDownloading, isUpdateAvailable, isUpdatePending
 * - downloadProgress (0-1), downloadedUpdate, availableUpdate, errors
 */

import { useEffect, useRef, useCallback } from 'react';
import { Alert, AppState, AppStateStatus, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { useUpdates } from 'expo-updates';
import * as Sentry from '@sentry/react-native';
import { usePostHog } from 'posthog-react-native';

/**
 * Initializes OTA update infrastructure:
 * - Tags Sentry with current update ID and channel
 * - Checks for updates on app foreground
 * - Downloads updates automatically
 * - Tracks OTA events to PostHog
 * - Exposes applyUpdate() for manual reload
 * - Exposes reactive download progress (0-1)
 *
 * Call this once at the app root level (inside PostHogProvider).
 */
export function useOTAUpdates() {
  const posthog = usePostHog();
  const isCheckingRef = useRef(false);

  // Reactive update state from expo-updates (includes downloadProgress)
  const updatesState = useUpdates();

  // Tag Sentry with OTA update info on mount
  useEffect(() => {
    if (__DEV__) return;

    try {
      const { currentlyRunning } = updatesState;
      Sentry.setTag('ota.update_id', currentlyRunning.updateId ?? 'embedded');
      Sentry.setTag('ota.channel', currentlyRunning.channel ?? 'unknown');
      Sentry.setTag('ota.runtime_version', currentlyRunning.runtimeVersion ?? 'unknown');
      Sentry.setContext('ota_update', {
        update_id: currentlyRunning.updateId,
        channel: currentlyRunning.channel,
        runtime_version: currentlyRunning.runtimeVersion,
        created_at: currentlyRunning.createdAt?.toISOString(),
        is_embedded: currentlyRunning.isEmbeddedLaunch,
      });

      console.log('🔄 [OTA] Sentry tagged:', {
        update_id: currentlyRunning.updateId ?? 'embedded',
        channel: currentlyRunning.channel ?? 'unknown',
        runtime_version: currentlyRunning.runtimeVersion,
      });
    } catch (error) {
      console.error('❌ [OTA] Failed to tag Sentry:', error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for updates and download if available
  const checkForUpdate = useCallback(async () => {
    if (__DEV__) return;
    if (isCheckingRef.current) return;

    isCheckingRef.current = true;

    try {
      console.log('🔄 [OTA] Checking for updates...');
      const checkResult = await Updates.checkForUpdateAsync();

      posthog?.capture('ota_update_check', {
        has_update: checkResult.isAvailable,
        platform: Platform.OS,
        current_update_id: updatesState.currentlyRunning.updateId ?? 'embedded',
      });

      if (!checkResult.isAvailable) {
        console.log('✅ [OTA] App is up to date');
        return;
      }

      console.log('🔄 [OTA] Update available, downloading...');
      const fetchResult = await Updates.fetchUpdateAsync();

      if (fetchResult.isNew) {
        posthog?.capture('ota_update_downloaded', {
          platform: Platform.OS,
          previous_update_id: updatesState.currentlyRunning.updateId ?? 'embedded',
        });

        posthog?.capture('$set', {
          $set: { ota_update_pending: true },
        });

        console.log('✅ [OTA] Update downloaded, ready to apply.');

        Sentry.addBreadcrumb({
          category: 'ota',
          message: 'OTA update downloaded, ready to apply',
          level: 'info',
        });

        // Show native alert prompting user to restart
        Alert.alert(
          'New Version Available',
          'A new update was downloaded for your app. Restart the app to install the update.',
          [
            {
              text: 'Restart App',
              style: 'cancel',
              onPress: async () => {
                try {
                  posthog?.capture('ota_update_applied', {
                    platform: Platform.OS,
                    previous_update_id: updatesState.currentlyRunning.updateId ?? 'embedded',
                  });
                  posthog?.capture('$set', {
                    $set: { ota_update_pending: false },
                  });
                  await Updates.reloadAsync();
                } catch (reloadError) {
                  console.error('❌ [OTA] Failed to reload:', reloadError);
                }
              },
            },
          ],
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      posthog?.capture('ota_update_error', {
        error_message: errorMessage,
        platform: Platform.OS,
      });

      Sentry.addBreadcrumb({
        category: 'ota',
        message: `OTA update check failed: ${errorMessage}`,
        level: 'warning',
      });

      console.error('❌ [OTA] Update check failed:', errorMessage);
    } finally {
      isCheckingRef.current = false;
    }
  }, [posthog, updatesState.currentlyRunning.updateId]);

  // Apply a downloaded update by reloading the app
  const applyUpdate = useCallback(async () => {
    if (__DEV__) return;

    if (!updatesState.isUpdatePending) {
      console.log('🔄 [OTA] No pending update to apply');
      return;
    }

    try {
      posthog?.capture('ota_update_applied', {
        platform: Platform.OS,
        previous_update_id: updatesState.currentlyRunning.updateId ?? 'embedded',
        new_update_id: updatesState.downloadedUpdate?.updateId ?? 'unknown',
      });

      posthog?.capture('$set', {
        $set: { ota_update_pending: false },
      });

      console.log('🔄 [OTA] Applying update, reloading app...');

      Sentry.addBreadcrumb({
        category: 'ota',
        message: 'User triggered OTA update reload',
        level: 'info',
      });

      await Updates.reloadAsync();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ [OTA] Failed to apply update:', errorMessage);

      Sentry.captureException(error, {
        tags: { component: 'useOTAUpdates' },
      });
    }
  }, [posthog, updatesState.isUpdatePending, updatesState.currentlyRunning.updateId, updatesState.downloadedUpdate?.updateId]);

  // Check for updates when app comes to foreground
  useEffect(() => {
    if (__DEV__) return;

    // Check on mount (app launch)
    checkForUpdate();

    // Check when app returns from background
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkForUpdate();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [checkForUpdate]);

  return {
    /** Manually trigger an update check + download */
    checkForUpdate,
    /** Reload the app with the downloaded update */
    applyUpdate,

    // Reactive state from expo-updates useUpdates()
    /** True if currently checking the server for an update */
    isChecking: updatesState.isChecking,
    /** True if currently downloading an update */
    isDownloading: updatesState.isDownloading,
    /** True if a new update is available on the server */
    isUpdateAvailable: updatesState.isUpdateAvailable,
    /** True if an update has been downloaded and is ready to apply */
    isUpdatePending: updatesState.isUpdatePending,
    /** Download progress from 0 to 1 (undefined if not downloading) */
    downloadProgress: updatesState.downloadProgress,
    /** Info about the currently running update */
    currentlyRunning: updatesState.currentlyRunning,
    /** Info about the available update (if any) */
    availableUpdate: updatesState.availableUpdate,
    /** Info about the downloaded update (if any) */
    downloadedUpdate: updatesState.downloadedUpdate,
    /** Error from checking for updates */
    checkError: updatesState.checkError,
    /** Error from downloading an update */
    downloadError: updatesState.downloadError,
    /** Last time an update check was performed */
    lastCheckTime: updatesState.lastCheckForUpdateTimeSinceRestart,
  };
}
