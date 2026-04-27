/**
 * AppLogger - Unified logging utility for Archives Expo
 *
 * Sends to console in __DEV__ mode, Sentry breadcrumbs in production.
 * AppLogger.error() also calls Sentry.captureException() when an Error object is provided.
 *
 * Usage:
 *   AppLogger.info('auth', 'Token read successfully', { key });
 *   AppLogger.warn('sync', 'Cloud sync retry', { attempt: 2 });
 *   AppLogger.error('video', 'Playback failed', { url }, error);
 */

import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

// ==================== TYPES ====================

type LogCategory =
  | 'auth'
  | 'navigation'
  | 'sync'
  | 'progress'
  | 'content'
  | 'video'
  | 'audio'
  | 'quiz'
  | 'notification'
  | 'subscription'
  | 'ai'
  | 'network'
  | 'deeplink'
  | 'startup'
  | 'paywall'
  | 'gamification';

type SentryLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

// Emoji prefixes per category (used in dev console only)
const CATEGORY_EMOJI: Record<LogCategory, string> = {
  auth: '🔐',
  navigation: '🔑',
  sync: '🔄',
  progress: '🎮',
  content: '📦',
  video: '🎬',
  audio: '🎵',
  quiz: '📝',
  notification: '🔔',
  subscription: '💰',
  ai: '🤖',
  network: '🌐',
  deeplink: '🔗',
  startup: '🚀',
  gamification: '🎮',
  paywall: '💸',
};

// ==================== LOGGER ====================

function log(
  level: SentryLevel,
  category: LogCategory,
  message: string,
  data?: Record<string, unknown>,
  error?: unknown,
) {
  const emoji = CATEGORY_EMOJI[category] ?? '📋';
  const tag = `[${category.toUpperCase()}]`;

  // Always log to console in dev
  if (__DEV__) {
    const consoleData = data ? { ...data } : undefined;
    switch (level) {
      case 'error':
      case 'fatal':
        console.error(`${emoji} ${tag} ${message}`, ...(consoleData ? [consoleData] : []), ...(error ? [error] : []));
        break;
      case 'warning':
        console.warn(`${emoji} ${tag} ${message}`, ...(consoleData ? [consoleData] : []));
        break;
      default:
        console.log(`${emoji} ${tag} ${message}`, ...(consoleData ? [consoleData] : []));
    }
  }

  // Always send Sentry breadcrumb (lightweight, stored locally until an error is captured)
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data: data ? { ...data, platform: Platform.OS } : { platform: Platform.OS },
  });

  // Capture exception for errors with an Error object
  if ((level === 'error' || level === 'fatal') && error) {
    let errorObj: Error;
    if (error instanceof Error) {
      errorObj = error;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      // Handle plain objects with a message property (e.g. { message: "..." })
      errorObj = new Error((error as { message: string }).message);
    } else if (typeof error === 'string') {
      errorObj = new Error(error);
    } else {
      // Last resort: JSON.stringify to preserve structure instead of [object Object]
      errorObj = new Error(JSON.stringify(error));
    }
    Sentry.captureException(errorObj, {
      tags: { log_category: category },
      extra: data,
    });
  }
}

// ==================== PUBLIC API ====================

const AppLogger = {
  /** Informational breadcrumb — routine operations, state transitions */
  info(category: LogCategory, message: string, data?: Record<string, unknown>) {
    log('info', category, message, data);
  },

  /** Warning breadcrumb — recoverable issues, retries, unexpected but handled states */
  warn(category: LogCategory, message: string, data?: Record<string, unknown>) {
    log('warning', category, message, data);
  },

  /** Error breadcrumb + Sentry.captureException if error object provided */
  error(category: LogCategory, message: string, data?: Record<string, unknown>, error?: unknown) {
    log('error', category, message, data, error);
  },

  /**
   * Set Sentry context — attached to all subsequent error reports.
   * Call on app launch and major state changes (auth, progress, screen).
   */
  setContext(name: string, data: Record<string, unknown>) {
    Sentry.setContext(name, { ...data, platform: Platform.OS });

    if (__DEV__) {
      console.log(`📋 [CONTEXT:${name}]`, data);
    }
  },
};

export default AppLogger;
