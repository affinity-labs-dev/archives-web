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
// These are deliberately placeholders, not implementations - see the header of
// each stub for what replacing it actually involves.
const WEB_STUBS = {
  'rive-react-native': require.resolve('./web-stubs/rive-react-native.js'),
  'react-native-purchases-ui': require.resolve('./web-stubs/react-native-purchases-ui.js'),
  // Unlike the two above this one is a real implementation, not a placeholder -
  // HTMLAudioElement covers everything useBackgroundMusic asks for.
  'react-native-sound': require.resolve('./web-stubs/react-native-sound.js'),
}

const defaultResolveRequest = config.resolver.resolveRequest

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS[moduleName]) {
    return { type: 'sourceFile', filePath: WEB_STUBS[moduleName] }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform)
}

module.exports = config