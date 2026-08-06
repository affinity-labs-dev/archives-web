const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname)

// Add platform-specific extensions to ensure proper resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web']
config.resolver.sourceExts = [...config.resolver.sourceExts, 'tsx', 'ts', 'jsx', 'js']

// Add .riv as an asset extension for Rive animations
config.resolver.assetExts = [...config.resolver.assetExts, 'riv']

// A no-op, kept only because deleting it invites someone to add it back "fixed".
//
// It reads like it forces `react-native` ahead of `browser` on every platform,
// and therefore like it defeats the browser build of every dependency on web.
// It does not. This array is byte-for-byte Expo's own default, and web
// resolution does not consult resolverMainFields at all: Expo picks web builds
// via `unstable_conditionsByPlatform` ({ web: ['browser'] }) plus package
// exports, both on by default and both untouched here.
//
// Verified, not reasoned about - getDefaultConfig() returns exactly
// ['react-native', 'browser', 'main'] and conditionsByPlatform web: ['browser'].
//
// Putting `browser` first here would change *native* resolution, which is the
// one thing this repo must never do.
config.resolver.resolverMainFields = ['react-native', 'browser', 'main']

// Native-only packages that blow up at *import* time on web, not at call time:
// each calls `requireNativeComponent` (or `requireNativeModule`) at module
// scope, so a single import anywhere in the graph blanks the entire page
// before a route renders. Point them at local placeholders for web only;
// native resolution is untouched.
//
// Two of these are real implementations and one is still a placeholder; the
// header of each says which and why.
const WEB_STUBS = {
  // Real: @rive-app/react-canvas plays the same .riv files the app ships. Only
  // the API differs, so this file is a shim rather than a stand-in.
  'rive-react-native': require.resolve('./web-stubs/rive-react-native.js'),
  // Real: HTMLAudioElement covers everything useBackgroundMusic asks for.
  'react-native-sound': require.resolve('./web-stubs/react-native-sound.js'),
  // Still a placeholder. RevenueCatUI.presentPaywall has no web equivalent -
  // the paywall has to be rebuilt in RN primitives against
  // @revenuecat/purchases-js. That is M5, and it is revenue-critical.
  'react-native-purchases-ui': require.resolve('./web-stubs/react-native-purchases-ui.js'),
}

const defaultResolveRequest = config.resolver.resolveRequest

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS[moduleName]) {
    return { type: 'sourceFile', filePath: WEB_STUBS[moduleName] }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform)
}

// Serve api/ from the dev server so local development has a single origin.
//
// /api/* sends no CORS headers by design, so running the backend on a second
// port means the browser blocks every call. Development only - Vercel runs the
// real functions in production and never reads this.
config.server = config.server || {}
config.server.enhanceMiddleware = require('./dev/api-middleware')

module.exports = config