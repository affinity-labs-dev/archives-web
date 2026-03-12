/**
 * Expo config plugin to disable system font scaling at the native level (AFF-331).
 * This ensures ALL native views (including RevenueCat Paywall) respect app font sizes.
 *
 * iOS: Sets UIContentSizeCategoryLimit to "UICTContentSizeCategoryL" (Large = default)
 *      via a swizzle in AppDelegate that caps Dynamic Type.
 *
 * Android: Overrides attachBaseContext() in MainActivity to set fontScale = 1.0f
 *          via createConfigurationContext() (modern, non-deprecated API)
 */
const {
  withAppDelegate,
  withMainActivity,
} = require("expo/config-plugins");

function withDisableFontScalingIOS(config) {
  return withAppDelegate(config, (config) => {
    const appDelegate = config.modResults.contents;

    // Add the font scaling override in didFinishLaunchingWithOptions
    // We cap contentSizeCategory to .large (the system default) so Dynamic Type
    // cannot make fonts larger than the default size
    const swizzleCode = `
    // AFF-331: Cap Dynamic Type to default size for consistent UI
    if #available(iOS 15.0, *) {
      window?.maximumContentSizeCategory = .large
    }
`;

    // Insert BEFORE the return super.application(...) call so the code actually runs.
    // Uses a regex to match any variable name in the launchOptions argument (e.g.
    // "launchOptions" in fresh Expo templates, or "modifiedLaunchOptions" in our
    // locally customized AppDelegate with the Customer.io deep link workaround).
    if (!appDelegate.includes("maximumContentSizeCategory")) {
      const returnSuperRegex = /([ \t]*return super\.application\(application, didFinishLaunchingWithOptions:[^)]+\))/;
      if (!returnSuperRegex.test(appDelegate)) {
        throw new Error(
          "[withDisableFontScaling] iOS injection failed: could not find 'return super.application(...)' pattern in AppDelegate. " +
          "The plugin needs to be updated to match the current AppDelegate structure."
        );
      }
      config.modResults.contents = appDelegate.replace(
        returnSuperRegex,
        `${swizzleCode}$1`
      );
    }

    return config;
  });
}

function withDisableFontScalingAndroid(config) {
  return withMainActivity(config, (config) => {
    const mainActivity = config.modResults.contents;

    // Override attachBaseContext() to force fontScale = 1.0f via createConfigurationContext().
    // Runs once at Activity creation (not on every getResources() call).
    // createConfigurationContext() available since API 17, well below minSdkVersion 24.
    const overrideCode = `
    override fun attachBaseContext(newBase: android.content.Context) {
        val configuration = android.content.res.Configuration(newBase.resources.configuration)
        configuration.fontScale = 1.0f
        super.attachBaseContext(newBase.createConfigurationContext(configuration))
    }
`;

    if (!mainActivity.includes("override fun attachBaseContext")) {
      // Insert before the closing brace of the class
      const lastBraceIndex = mainActivity.lastIndexOf("}");
      if (lastBraceIndex === -1) {
        throw new Error(
          "[withDisableFontScaling] Android injection failed: could not find closing brace in MainActivity. " +
          "The plugin needs to be updated to match the current MainActivity structure."
        );
      }
      const modified =
        mainActivity.slice(0, lastBraceIndex) +
        overrideCode +
        mainActivity.slice(lastBraceIndex);
      if (!modified.includes("override fun attachBaseContext")) {
        throw new Error(
          "[withDisableFontScaling] Android post-injection validation failed: injected code not found in MainActivity."
        );
      }
      config.modResults.contents = modified;
    }

    return config;
  });
}

module.exports = function withDisableFontScaling(config) {
  config = withDisableFontScalingIOS(config);
  config = withDisableFontScalingAndroid(config);
  return config;
};
