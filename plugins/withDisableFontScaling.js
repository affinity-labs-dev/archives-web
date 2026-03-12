/**
 * Expo config plugin to disable system font scaling at the native level (AFF-331).
 * This ensures ALL native views (including RevenueCat Paywall) respect app font sizes.
 *
 * iOS: Sets UIContentSizeCategoryLimit to "UICTContentSizeCategoryL" (Large = default)
 *      via a swizzle in AppDelegate that caps Dynamic Type.
 *
 * Android: Overrides getResources() in MainActivity to set fontScale = 1.0f
 */
const {
  withAppDelegate,
  withMainActivity,
} = require("expo/config-plugins");

function withDisableFontScalingIOS(config) {
  return withAppDelegate(config, (config) => {
    const appDelegate = config.modResults.contents;

    // Already patched — skip
    if (appDelegate.includes("maximumContentSizeCategory")) {
      return config;
    }

    // Cap Dynamic Type to .large (system default) so font scaling cannot exceed it.
    // Uses the AppDelegate's own `window` property (set earlier in the same function
    // via `window = UIWindow(frame: UIScreen.main.bounds)`), so it is always available
    // at this insertion point.
    // Requires iOS 15+ for maximumContentSizeCategory; guarded with #available.
    const swizzleCode = `
    // AFF-331: Cap Dynamic Type to default size for consistent UI (iOS 15+)
    if #available(iOS 15.0, *) {
      window?.maximumContentSizeCategory = .large
    }`;

    // Use a regex to match the `return super.application(application, didFinishLaunchingWithOptions: ...)`
    // line regardless of the parameter name. The customerio-expo-plugin (which runs before this
    // plugin in app.json) rewrites the parameter from `launchOptions` to `modifiedLaunchOptions`,
    // so a hard-coded string match would fail. The regex handles both cases.
    const returnPattern = /return super\.application\(application, didFinishLaunchingWithOptions:[^)]+\)/;
    const match = appDelegate.match(returnPattern);

    if (match) {
      config.modResults.contents = appDelegate.replace(
        match[0],
        `${swizzleCode}\n    ${match[0]}`
      );
    } else {
      console.warn(
        "[withDisableFontScaling] iOS: Could not find 'return super.application(application, didFinishLaunchingWithOptions:...)' in AppDelegate.swift. Font scaling override was NOT applied."
      );
    }

    return config;
  });
}

function withDisableFontScalingAndroid(config) {
  return withMainActivity(config, (config) => {
    const mainActivity = config.modResults.contents;

    // Override attachBaseContext() to force fontScale = 1.0f
    // Uses createConfigurationContext() — the modern replacement for deprecated updateConfiguration()
    const overrideCode = `
    override fun attachBaseContext(newBase: android.content.Context) {
        val configuration = android.content.res.Configuration(newBase.resources.configuration)
        configuration.fontScale = 1.0f
        val context = newBase.createConfigurationContext(configuration)
        super.attachBaseContext(context)
    }
`;

    if (!mainActivity.includes("fontScale")) {
      // Insert before the closing brace of the class
      const lastBraceIndex = mainActivity.lastIndexOf("}");
      if (lastBraceIndex !== -1) {
        config.modResults.contents =
          mainActivity.slice(0, lastBraceIndex) +
          overrideCode +
          mainActivity.slice(lastBraceIndex);
      }
    }

    return config;
  });
}

module.exports = function withDisableFontScaling(config) {
  config = withDisableFontScalingIOS(config);
  config = withDisableFontScalingAndroid(config);
  return config;
};
