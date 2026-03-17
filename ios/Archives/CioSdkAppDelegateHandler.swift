import Foundation
import UIKit
import UserNotifications

// CIO push handling disabled — Affinity sends via Expo's push gateway.
// expo-notifications handles all push display, click handling, and token management.
//
// This file is kept as a stub so existing references compile.
// CIO is still used for analytics/in-app messaging (initialized from JS layer).

public class CioSdkAppDelegateHandler: NSObject {

  public func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) {
    // No-op: CIO push handling removed. expo-notifications owns the notification center delegate.
  }

  public func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    // No-op: expo-notifications handles token forwarding to Expo's push service.
  }

  public func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    // No-op
  }
}
