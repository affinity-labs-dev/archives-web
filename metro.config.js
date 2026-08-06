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

// Ensure platform-specific files are resolved in the correct order.
//
// Web needs `browser` first: this list was applied to every platform, which
// silently defeated the `browser` field in all 75 dependencies when bundling
// for the web.
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
}

const defaultResolveRequest = config.resolver.resolveRequest

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS[moduleName]) {
    return { type: 'sourceFile', filePath: WEB_STUBS[moduleName] }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform)
}

module.exports = config