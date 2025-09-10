// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

// Add platform-specific extensions to ensure proper resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web']
config.resolver.sourceExts = [...config.resolver.sourceExts, 'tsx', 'ts', 'jsx', 'js']

// Ensure platform-specific files are resolved in the correct order
config.resolver.resolverMainFields = ['react-native', 'browser', 'main']

module.exports = config