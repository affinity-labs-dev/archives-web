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

    // Add the font scaling override in didFinishLaunchingWithOptions
    // We cap contentSizeCategory to .large (the system default) so Dynamic Type
    // cannot make fonts larger than the default size
    const swizzleCode = `
    // AFF-331: Cap Dynamic Type to default size for consistent UI
    if #available(iOS 15.0, *) {
      UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .flatMap { $0.windows }
        .forEach { $0.maximumContentSizeCategory = .large }
    }
`;

    // Insert after the opening of didFinishLaunchingWithOptions
    if (!appDelegate.includes("maximumContentSizeCategory")) {
      const didFinishPattern = "super.application(application, didFinishLaunchingWithOptions: launchOptions)";
      if (appDelegate.includes(didFinishPattern)) {
        config.modResults.contents = appDelegate.replace(
          didFinishPattern,
          `${didFinishPattern}\n${swizzleCode}`
        );
      }
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
