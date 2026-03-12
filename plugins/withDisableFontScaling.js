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
    //
    // TWO-PRONGED APPROACH:
    //
    // 1. UIWindow.didBecomeVisibleNotification (registered in didFinishLaunchingWithOptions):
    //    Catches every UIWindow as it becomes visible, including any windows created by
    //    third-party SDKs. This covers the initial app window.
    //
    // 2. applicationDidBecomeActive override (new method added to AppDelegate class):
    //    Re-applies the cap to ALL windows in ALL connected scenes every time the app
    //    becomes active. This handles:
    //    - RevenueCat's PaywallViewController (UIHostingController, deferred init in layoutSubviews)
    //    - Windows already visible when user changes system font size in Settings
    //    - Any SDK that creates windows before the notification can fire
    //
    // Requires iOS 15+ for maximumContentSizeCategory; both blocks are guarded with #available.

    const notificationCode = `
    // AFF-331: Cap Dynamic Type to default size for consistent UI (iOS 15+)
    // Observer 1: catches each UIWindow as it first becomes visible
    if #available(iOS 15.0, *) {
      NotificationCenter.default.addObserver(
        forName: UIWindow.didBecomeVisibleNotification,
        object: nil,
        queue: .main
      ) { notification in
        if let window = notification.object as? UIWindow {
          window.maximumContentSizeCategory = .large
        }
      }
    }`;

    // applicationDidBecomeActive re-applies the cap to every window on every app activation.
    // Inserted just before the closing brace of the AppDelegate class so it becomes a proper
    // method override alongside the existing didFinishLaunchingWithOptions override.
    const becomeActiveCode = `
  override func applicationDidBecomeActive(_ application: UIApplication) {
    super.applicationDidBecomeActive(application)
    // AFF-331: Re-apply Dynamic Type cap to all windows on every app activation (iOS 15+)
    // This covers RevenueCat PaywallViewController and any SDK using deferred UIHostingController init
    if #available(iOS 15.0, *) {
      UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .flatMap { $0.windows }
        .forEach { $0.maximumContentSizeCategory = .large }
    }
  }
`;

    // Use a regex to match the `return super.application(application, didFinishLaunchingWithOptions: ...)`
    // line regardless of the parameter name. The customerio-expo-plugin (which runs before this
    // plugin in app.json) rewrites the parameter from `launchOptions` to `modifiedLaunchOptions`,
    // so a hard-coded string match would fail. The regex handles both cases.
    const returnPattern = /return super\.application\(application, didFinishLaunchingWithOptions:[^)]+\)/;
    const match = appDelegate.match(returnPattern);

    if (match) {
      // Step 1: insert notification observer before the return statement
      let patched = appDelegate.replace(
        match[0],
        `${notificationCode}\n    ${match[0]}`
      );

      // Step 2: insert applicationDidBecomeActive before the class closing brace
      const lastBraceIndex = patched.lastIndexOf("}");
      if (lastBraceIndex !== -1) {
        patched =
          patched.slice(0, lastBraceIndex) +
          becomeActiveCode +
          patched.slice(lastBraceIndex);
      }

      config.modResults.contents = patched;
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
