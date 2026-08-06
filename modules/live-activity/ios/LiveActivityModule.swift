import ExpoModulesCore
import Foundation

#if canImport(ActivityKit)
import ActivityKit

// MARK: - LiveActivityModule
//
// Expo Module bridge between JavaScript and iOS ActivityKit.
// Exposes start/update/end methods for StreakGuardActivity and DailyStoryActivity.
//
// iOS 16.2+ only. On older iOS, all methods throw a `LiveActivityError.unsupported`
// error which propagates as a JS Promise rejection.
//
// # Activity tracking
//
// Active activities are stored in private dictionaries keyed by activity ID (UUID string).
// JS passes the ID returned from a start call back to subsequent update/end calls.
// This avoids iterating `Activity.activities` on every update.
//
// # Error handling
//
// All AsyncFunctions throw structured errors that propagate as Promise rejections in JS.
// The JS wrapper catches these and presents friendly error messages to the caller.

// MARK: - Records
//
// Expo Modules' `AsyncFunction` typed closures support at most 10 positional arguments.
// DailyStory start/update need 11–15 fields, so we pass a single `Record` object from JS
// and let Expo deserialize it into these structs. JS callers pass one plain object,
// Swift receives a type-checked struct — cleaner and removes positional ordering bugs.

struct DailyStoryStartRecord: Record {
  @Field var storyId: String = ""
  @Field var storyTitle: String = ""
  @Field var eraTitle: String = ""
  @Field var dayNumber: Int = 1
  @Field var totalDays: Int = 1
  @Field var state: String = "inProgress"
  @Field var currentCard: Int = 1
  @Field var totalCards: Int = 3
  @Field var progressPercent: Double = 0
  @Field var watchCompleted: Bool = false
  @Field var exploreCompleted: Bool = false
  @Field var questionsCompleted: Bool = false
  @Field var currentStreak: Int = 0
  @Field var endDate: Double = 0
  @Field var startedAt: Double = 0
  @Field var xpEarned: Int = 0
}

struct DailyStoryUpdateRecord: Record {
  @Field var id: String = ""
  @Field var state: String = "inProgress"
  @Field var currentCard: Int = 1
  @Field var totalCards: Int = 3
  @Field var progressPercent: Double = 0
  @Field var watchCompleted: Bool = false
  @Field var exploreCompleted: Bool = false
  @Field var questionsCompleted: Bool = false
  @Field var currentStreak: Int = 0
  @Field var endDate: Double = 0
  @Field var startedAt: Double = 0
  @Field var xpEarned: Int = 0
}

private let kPushToStartTokenKey = "LiveActivity_PushToStartToken_StreakGuard"

public class LiveActivityModule: Module {
  // MARK: State

  /// Active StreakGuard activities, keyed by activity.id (UUID string).
  private var streakGuardActivities: [String: Any] = [:]

  /// Active DailyStory activities, keyed by activity.id (UUID string).
  private var dailyStoryActivities: [String: Any] = [:]

  /// Guard against duplicate push-to-start listener Tasks.
  /// If JS calls registerPushToStartTokens() multiple times (React StrictMode,
  /// component remount), we cancel the previous Task before starting a new one.
  private var pushToStartListenerTask: Task<Void, Never>?

  // MARK: Activity lookup helpers
  //
  // The `streakGuardActivities` / `dailyStoryActivities` dictionaries are
  // IN-MEMORY only — they're wiped when iOS kills the app process. But
  // ActivityKit persists active Live Activities at OS level: when the user
  // re-opens the app, `Activity<T>.activities` still returns the running
  // activity even though our dictionary is empty.
  //
  // Without this fallback, `updateDailyStory(id)` after a kill+restart
  // throws `activityNotFound` even when the activity is alive on the lock
  // screen — JS's restored ID matches iOS's view but not our cache.
  //
  // These helpers check the cache first (fast path) then fall back to
  // `Activity<T>.activities` (post-kill recovery), re-caching on hit so
  // subsequent calls hit the fast path again.

  @available(iOS 16.2, *)
  private func findStreakGuardActivity(id: String) -> Activity<StreakGuardAttributes>? {
    if let cached = self.streakGuardActivities[id] as? Activity<StreakGuardAttributes> {
      return cached
    }
    if let live = Activity<StreakGuardAttributes>.activities.first(where: { $0.id == id }) {
      self.streakGuardActivities[id] = live
      NSLog("[LiveActivity] Recovered StreakGuard from ActivityKit after process restart id=\(id)")
      return live
    }
    return nil
  }

  @available(iOS 16.2, *)
  private func findDailyStoryActivity(id: String) -> Activity<DailyStoryAttributes>? {
    if let cached = self.dailyStoryActivities[id] as? Activity<DailyStoryAttributes> {
      return cached
    }
    if let live = Activity<DailyStoryAttributes>.activities.first(where: { $0.id == id }) {
      self.dailyStoryActivities[id] = live
      NSLog("[LiveActivity] Recovered DailyStory from ActivityKit after process restart id=\(id)")
      return live
    }
    return nil
  }

  // MARK: Module definition

  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    // MARK: Events
    // Push-to-start token events emitted to JS. JS handles POST to backend.
    // Pattern matches expo-notifications: native emits token, JS calls API.
    Events("onPushToStartToken", "onActivityPushToken")

    // MARK: Status

    /// Returns whether the user has enabled Live Activities for this app.
    /// JS should check this before attempting to start an activity.
    AsyncFunction("areActivitiesEnabled") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    // MARK: StreakGuard

    /// Starts a new StreakGuard activity in the given state.
    /// Returns the activity ID for later update/end calls.
    ///
    /// - Parameters:
    ///   - currentStreak: Streak count to display
    ///   - streakStartDate: YYYY-MM-DD for display purposes
    ///   - state: "expiring" | "saved" | "failed"
    ///   - endDate: Unix epoch seconds when countdown ends (only meaningful for .expiring)
    AsyncFunction("startStreakGuard") {
      (currentStreak: Int, streakStartDate: String, state: String, endDate: Double) -> String in

      guard #available(iOS 16.2, *) else {
        throw LiveActivityError.unsupported
      }

      guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        throw LiveActivityError.notAuthorized
      }

      guard let streakState = StreakState(rawValue: state) else {
        throw LiveActivityError.invalidState(state)
      }

      let attributes = StreakGuardAttributes(
        streakStartDate: streakStartDate
      )
      let contentState = StreakGuardAttributes.ContentState(
        state: streakState,
        endDate: endDate,
        currentStreak: currentStreak
      )

      do {
        let activity = try Activity<StreakGuardAttributes>.request(
          attributes: attributes,
          content: .init(state: contentState, staleDate: nil),
          pushType: .token
        )
        let id = activity.id
        self.streakGuardActivities[id] = activity
        NSLog("[LiveActivity] Started StreakGuard activity id=\(id) state=\(state)")

        // Listen for activity push token updates — emitted to JS for backend registration
        Task {
          for await tokenData in activity.pushTokenUpdates {
            let tokenString = tokenData.map { String(format: "%02x", $0) }.joined()
            NSLog("[LiveActivity] 🔑 Activity push token for StreakGuard id=\(id): \(tokenString.prefix(16))...")
            self.sendEvent("onActivityPushToken", [
              "token": tokenString,
              "activityType": "StreakGuard",
              "activityId": id,
            ])
          }
        }

        return id
      } catch {
        NSLog("[LiveActivity] Failed to start StreakGuard: \(error.localizedDescription)")
        throw LiveActivityError.requestFailed(error.localizedDescription)
      }
    }

    /// Updates an existing StreakGuard activity with a new state.
    AsyncFunction("updateStreakGuard") {
      (id: String, state: String, endDate: Double, currentStreak: Int) async throws in

      guard #available(iOS 16.2, *) else {
        throw LiveActivityError.unsupported
      }

      guard let activity = self.findStreakGuardActivity(id: id) else {
        throw LiveActivityError.activityNotFound(id)
      }

      guard let streakState = StreakState(rawValue: state) else {
        throw LiveActivityError.invalidState(state)
      }

      let contentState = StreakGuardAttributes.ContentState(
        state: streakState,
        endDate: endDate,
        currentStreak: currentStreak
      )

      await activity.update(.init(state: contentState, staleDate: nil))
      NSLog("[LiveActivity] Updated StreakGuard id=\(id) to state=\(state) streak=\(currentStreak)")
    }

    /// Ends a StreakGuard activity, lingering for `dismissInSeconds` before removal.
    /// Pass 0 for immediate dismissal.
    AsyncFunction("endStreakGuard") {
      (id: String, dismissInSeconds: Double) async throws in

      guard #available(iOS 16.2, *) else {
        throw LiveActivityError.unsupported
      }

      guard let activity = self.findStreakGuardActivity(id: id) else {
        throw LiveActivityError.activityNotFound(id)
      }

      let dismissalPolicy: ActivityUIDismissalPolicy
      if dismissInSeconds <= 0 {
        dismissalPolicy = .immediate
      } else {
        dismissalPolicy = .after(Date().addingTimeInterval(dismissInSeconds))
      }

      await activity.end(nil, dismissalPolicy: dismissalPolicy)
      self.streakGuardActivities.removeValue(forKey: id)
      NSLog("[LiveActivity] Ended StreakGuard id=\(id) dismissIn=\(dismissInSeconds)s")
    }

    // MARK: DailyStory

    /// Starts a new DailyStory activity.
    /// Uses a `Record` struct because Expo Modules caps positional AsyncFunction args at 10
    /// and DailyStory needs 15 fields (story metadata + per-card flags + xp + timer).
    AsyncFunction("startDailyStory") {
      (params: DailyStoryStartRecord) -> String in

      guard #available(iOS 16.2, *) else {
        throw LiveActivityError.unsupported
      }

      guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        throw LiveActivityError.notAuthorized
      }

      guard let dailyStoryState = DailyStoryState(rawValue: params.state) else {
        throw LiveActivityError.invalidState(params.state)
      }

      let attributes = DailyStoryAttributes(
        storyId: params.storyId,
        storyTitle: params.storyTitle,
        eraTitle: params.eraTitle,
        dayNumber: params.dayNumber,
        totalDays: params.totalDays
      )
      let contentState = DailyStoryAttributes.ContentState(
        state: dailyStoryState,
        currentCard: params.currentCard,
        totalCards: params.totalCards,
        progressPercent: params.progressPercent,
        lastUpdated: Date().timeIntervalSince1970,
        watchCompleted: params.watchCompleted,
        exploreCompleted: params.exploreCompleted,
        questionsCompleted: params.questionsCompleted,
        currentStreak: params.currentStreak,
        endDate: params.endDate,
        startedAt: params.startedAt,
        xpEarned: params.xpEarned
      )

      do {
        let activity = try Activity<DailyStoryAttributes>.request(
          attributes: attributes,
          content: .init(state: contentState, staleDate: nil),
          pushType: .token
        )
        let id = activity.id
        self.dailyStoryActivities[id] = activity
        NSLog("[LiveActivity] Started DailyStory activity id=\(id) title=\(params.storyTitle)")

        // Listen for activity push token updates — emitted to JS for backend registration
        Task {
          for await tokenData in activity.pushTokenUpdates {
            let tokenString = tokenData.map { String(format: "%02x", $0) }.joined()
            NSLog("[LiveActivity] 🔑 Activity push token for DailyStory id=\(id): \(tokenString.prefix(16))...")
            self.sendEvent("onActivityPushToken", [
              "token": tokenString,
              "activityType": "DailyStory",
              "activityId": id,
            ])
          }
        }

        return id
      } catch {
        NSLog("[LiveActivity] Failed to start DailyStory: \(error.localizedDescription)")
        throw LiveActivityError.requestFailed(error.localizedDescription)
      }
    }

    /// Updates an existing DailyStory activity's progress state.
    AsyncFunction("updateDailyStory") {
      (params: DailyStoryUpdateRecord) async throws in

      guard #available(iOS 16.2, *) else {
        throw LiveActivityError.unsupported
      }

      guard let activity = self.findDailyStoryActivity(id: params.id) else {
        throw LiveActivityError.activityNotFound(params.id)
      }

      guard let dailyStoryState = DailyStoryState(rawValue: params.state) else {
        throw LiveActivityError.invalidState(params.state)
      }

      let contentState = DailyStoryAttributes.ContentState(
        state: dailyStoryState,
        currentCard: params.currentCard,
        totalCards: params.totalCards,
        progressPercent: params.progressPercent,
        lastUpdated: Date().timeIntervalSince1970,
        watchCompleted: params.watchCompleted,
        exploreCompleted: params.exploreCompleted,
        questionsCompleted: params.questionsCompleted,
        currentStreak: params.currentStreak,
        endDate: params.endDate,
        startedAt: params.startedAt,
        xpEarned: params.xpEarned
      )

      await activity.update(.init(state: contentState, staleDate: nil))
      NSLog("[LiveActivity] Updated DailyStory id=\(params.id) card=\(params.currentCard)/\(params.totalCards)")
    }

    /// Ends a DailyStory activity.
    AsyncFunction("endDailyStory") {
      (id: String, dismissInSeconds: Double) async throws in

      guard #available(iOS 16.2, *) else {
        throw LiveActivityError.unsupported
      }

      guard let activity = self.findDailyStoryActivity(id: id) else {
        throw LiveActivityError.activityNotFound(id)
      }

      let dismissalPolicy: ActivityUIDismissalPolicy
      if dismissInSeconds <= 0 {
        dismissalPolicy = .immediate
      } else {
        dismissalPolicy = .after(Date().addingTimeInterval(dismissInSeconds))
      }

      await activity.end(nil, dismissalPolicy: dismissalPolicy)
      self.dailyStoryActivities.removeValue(forKey: id)
      NSLog("[LiveActivity] Ended DailyStory id=\(id) dismissIn=\(dismissInSeconds)s")
    }

    // MARK: Safety net

    /// Ends every active Live Activity owned by this app, immediately.
    /// Useful for test screens and orphan cleanup on app launch.
    AsyncFunction("endAllActivities") { () async throws in
      guard #available(iOS 16.2, *) else {
        throw LiveActivityError.unsupported
      }

      for activity in Activity<StreakGuardAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
      for activity in Activity<DailyStoryAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
      self.streakGuardActivities.removeAll()
      self.dailyStoryActivities.removeAll()
      NSLog("[LiveActivity] Ended all activities")
    }

    /// Returns an array of currently active activity IDs with their type.
    /// Useful for reconciling JS-side state with iOS-side state on app launch.
    AsyncFunction("listActiveActivities") { () -> [[String: String]] in
      guard #available(iOS 16.2, *) else {
        return []
      }

      var result: [[String: String]] = []
      for activity in Activity<StreakGuardAttributes>.activities {
        result.append(["id": activity.id, "type": "StreakGuard"])
      }
      for activity in Activity<DailyStoryAttributes>.activities {
        result.append(["id": activity.id, "type": "DailyStory"])
      }
      return result
    }

    // MARK: Push-to-start token registration

    /// Returns the cached push-to-start token from UserDefaults.
    /// iOS only emits via pushToStartTokenUpdates when the token CHANGES,
    /// so on subsequent app launches we read from cache instead of waiting.
    /// Returns null if no token has been cached yet (first install, pre-iOS 17.2).
    AsyncFunction("getCachedPushToStartToken") { () -> [String: String]? in
      guard let token = UserDefaults.standard.string(forKey: kPushToStartTokenKey) else {
        return nil
      }
      return [
        "token": token,
        "activityType": "StreakGuard",
        "attributeType": "StreakGuardAttributes",
      ]
    }

    /// Start listening for push-to-start token CHANGES.
    /// On first install iOS emits the initial token; on subsequent launches
    /// this only fires if iOS rotates the token. JS should call
    /// getCachedPushToStartToken() first for the current token, then
    /// registerPushToStartTokens() to catch future rotations.
    ///
    /// Correct call order in JS:
    ///   1. addPushToStartTokenListener(callback)     — attach listener
    ///   2. getCachedPushToStartToken()                — read cached token
    ///   3. registerPushToStartTokens()                — listen for changes
    AsyncFunction("registerPushToStartTokens") { () async throws in
      guard #available(iOS 17.2, *) else {
        throw LiveActivityError.unsupported
      }

      // Cancel previous listener Task (guard against duplicate calls)
      self.pushToStartListenerTask?.cancel()

      self.pushToStartListenerTask = Task {
        for await tokenData in Activity<StreakGuardAttributes>.pushToStartTokenUpdates {
          guard !Task.isCancelled else { break }
          let tokenString = tokenData.map { String(format: "%02x", $0) }.joined()
          NSLog("[LiveActivity] 🔑 Push-to-start token for StreakGuard: \(tokenString.prefix(16))...")

          // Cache in UserDefaults so next app launch can read it immediately
          UserDefaults.standard.set(tokenString, forKey: kPushToStartTokenKey)

          self.sendEvent("onPushToStartToken", [
            "token": tokenString,
            "activityType": "StreakGuard",
            "attributeType": "StreakGuardAttributes",
          ])
        }
      }

      NSLog("[LiveActivity] Push-to-start token listener registered for StreakGuard")
    }
  }
}

// MARK: - Errors

enum LiveActivityError: Error, LocalizedError {
  case unsupported
  case notAuthorized
  case invalidState(String)
  case activityNotFound(String)
  case requestFailed(String)

  var errorDescription: String? {
    switch self {
    case .unsupported:
      return "Live Activities require iOS 16.2 or later."
    case .notAuthorized:
      return "Live Activities are not enabled for this app. Check Settings → Archives → Live Activities."
    case .invalidState(let state):
      return "Unknown state value: '\(state)'. Expected one of: expiring, saved, failed."
    case .activityNotFound(let id):
      return "No active Live Activity found with ID: \(id)."
    case .requestFailed(let reason):
      return "Failed to create Live Activity: \(reason)"
    }
  }
}

#else

// Fallback module for non-ActivityKit platforms (tvOS, macOS, etc.)
public class LiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiveActivity")
  }
}

#endif
