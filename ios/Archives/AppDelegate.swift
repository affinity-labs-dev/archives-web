import Expo
import React
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {

  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    // Deep link workaround for app killed state — extract link from push payload
    // Mirrors JS logic: data?.link || data?.url || data?.deep_link
    // Also checks nested "data" dict and APNs "aps" payload
    var modifiedLaunchOptions = launchOptions
    NSLog("🔗 [DeepLink] didFinishLaunching — remoteNotification present: %@",
          launchOptions?[UIApplication.LaunchOptionsKey.remoteNotification] != nil ? "YES" : "NO")

    if let launchOptions = launchOptions,
       let pushContent = launchOptions[UIApplication.LaunchOptionsKey.remoteNotification] as? [AnyHashable: Any],
       !launchOptions.keys.contains(UIApplication.LaunchOptionsKey.url) {

        NSLog("🔗 [DeepLink] Push payload: %@", pushContent.description)

        let nestedData = pushContent["data"] as? [String: Any]

        // Check link fields in order: top-level → nested data
        // Matches JS: data?.link || data?.url || data?.deep_link
        let link = pushContent["link"] as? String
          ?? pushContent["url"] as? String
          ?? pushContent["deep_link"] as? String
          ?? nestedData?["link"] as? String
          ?? nestedData?["url"] as? String
          ?? nestedData?["deep_link"] as? String

        NSLog("🔗 [DeepLink] Extracted link: %@", link ?? "nil")

        if let link = link, let url = URL(string: link) {
          NSLog("🔗 [DeepLink] Injecting URL into launchOptions: %@", url.absoluteString)
          var mutableLaunchOptions = launchOptions
          mutableLaunchOptions[UIApplication.LaunchOptionsKey.url] = url
          modifiedLaunchOptions = mutableLaunchOptions
        } else {
          NSLog("🔗 [DeepLink] No valid link found or URL conversion failed")
        }
    }

    return super.application(application, didFinishLaunchingWithOptions: modifiedLaunchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
