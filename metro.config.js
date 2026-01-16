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

// Ensure platform-specific files are resolved in the correct order
config.resolver.resolverMainFields = ['react-native', 'browser', 'main']

module.exports = config