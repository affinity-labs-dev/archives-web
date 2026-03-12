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

    // TWO notification observers registered in didFinishLaunchingWithOptions — no class override needed.
    // This avoids any 'override' / 'super' conflict with ExpoAppDelegate's method hierarchy.
    //
    // Observer 1 — UIWindow.didBecomeVisibleNotification:
    //   Fires once per UIWindow when it first becomes visible. Catches the main app window
    //   and any window created by third-party SDKs (e.g. system alerts, keyboard).
    //
    // Observer 2 — UIApplication.didBecomeActiveNotification:
    //   Fires every time the app becomes active (launch, foreground, return from Settings).
    //   Re-applies the cap to ALL windows in all connected scenes, covering:
    //     - RevenueCat PaywallViewController (UIHostingController with deferred layoutSubviews init)
    //     - System font size changes made in Settings while app was backgrounded
    //
    // Both require iOS 15+ for maximumContentSizeCategory; guarded with #available.
    const notificationCode = `
    // AFF-331: Cap Dynamic Type to default size for consistent UI (iOS 15+)
    if #available(iOS 15.0, *) {
      // Observer 1: cap each UIWindow as it first becomes visible
      NotificationCenter.default.addObserver(
        forName: UIWindow.didBecomeVisibleNotification,
        object: nil,
        queue: .main
      ) { notification in
        if let window = notification.object as? UIWindow {
          window.maximumContentSizeCategory = .large
        }
      }
      // Observer 2: re-cap all windows every time the app becomes active
      // Covers RevenueCat Paywall (deferred UIHostingController init) and Settings font changes
      NotificationCenter.default.addObserver(
        forName: UIApplication.didBecomeActiveNotification,
        object: nil,
        queue: .main
      ) { _ in
        UIApplication.shared.connectedScenes
          .compactMap { $0 as? UIWindowScene }
          .flatMap { $0.windows }
          .forEach { $0.maximumContentSizeCategory = .large }
      }
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
        `${notificationCode}\n    ${match[0]}`
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
