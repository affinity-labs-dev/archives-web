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

public class LiveActivityModule: Module {
  // MARK: State

  /// Active StreakGuard activities, keyed by activity.id (UUID string).
  private var streakGuardActivities: [String: Any] = [:]

  /// Active DailyStory activities, keyed by activity.id (UUID string).
  private var dailyStoryActivities: [String: Any] = [:]

  // MARK: Module definition

  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    // MARK: Events
    // Push-to-start token events emitted to JS. JS handles POST to backend.
    // Pattern matches expo-notifications: native emits token, JS calls API.
    Events("onPushToStartToken")

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
          pushType: nil
        )
        let id = activity.id
        self.streakGuardActivities[id] = activity
        NSLog("[LiveActivity] Started StreakGuard activity id=\(id) state=\(state)")
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

      guard let activity = self.streakGuardActivities[id] as? Activity<StreakGuardAttributes> else {
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

      guard let activity = self.streakGuardActivities[id] as? Activity<StreakGuardAttributes> else {
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
    AsyncFunction("startDailyStory") {
      (
        storyId: String,
        storyTitle: String,
        eraTitle: String,
        dayNumber: Int,
        totalDays: Int,
        currentCard: Int,
        totalCards: Int,
        progressPercent: Double,
        watchCompleted: Bool,
        exploreCompleted: Bool,
        questionsCompleted: Bool
      ) -> String in

      guard #available(iOS 16.2, *) else {
        throw LiveActivityError.unsupported
      }

      guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        throw LiveActivityError.notAuthorized
      }

      let attributes = DailyStoryAttributes(
        storyId: storyId,
        storyTitle: storyTitle,
        eraTitle: eraTitle,
        dayNumber: dayNumber,
        totalDays: totalDays
      )
      let contentState = DailyStoryAttributes.ContentState(
        currentCard: currentCard,
        totalCards: totalCards,
        progressPercent: progressPercent,
        lastUpdated: Date().timeIntervalSince1970,
        watchCompleted: watchCompleted,
        exploreCompleted: exploreCompleted,
        questionsCompleted: questionsCompleted
      )

      do {
        let activity = try Activity<DailyStoryAttributes>.request(
          attributes: attributes,
          content: .init(state: contentState, staleDate: nil),
          pushType: nil
        )
        let id = activity.id
        self.dailyStoryActivities[id] = activity
        NSLog("[LiveActivity] Started DailyStory activity id=\(id) title=\(storyTitle)")
        return id
      } catch {
        NSLog("[LiveActivity] Failed to start DailyStory: \(error.localizedDescription)")
        throw LiveActivityError.requestFailed(error.localizedDescription)
      }
    }

    /// Updates an existing DailyStory activity's progress state.
    AsyncFunction("updateDailyStory") {
      (
        id: String,
        currentCard: Int,
        totalCards: Int,
        progressPercent: Double,
        watchCompleted: Bool,
        exploreCompleted: Bool,
        questionsCompleted: Bool
      ) async throws in

      guard #available(iOS 16.2, *) else {
        throw LiveActivityError.unsupported
      }

      guard let activity = self.dailyStoryActivities[id] as? Activity<DailyStoryAttributes> else {
        throw LiveActivityError.activityNotFound(id)
      }

      let contentState = DailyStoryAttributes.ContentState(
        currentCard: currentCard,
        totalCards: totalCards,
        progressPercent: progressPercent,
        lastUpdated: Date().timeIntervalSince1970,
        watchCompleted: watchCompleted,
        exploreCompleted: exploreCompleted,
        questionsCompleted: questionsCompleted
      )

      await activity.update(.init(state: contentState, staleDate: nil))
      NSLog("[LiveActivity] Updated DailyStory id=\(id) card=\(currentCard)/\(totalCards)")
    }

    /// Ends a DailyStory activity.
    AsyncFunction("endDailyStory") {
      (id: String, dismissInSeconds: Double) async throws in

      guard #available(iOS 16.2, *) else {
        throw LiveActivityError.unsupported
      }

      guard let activity = self.dailyStoryActivities[id] as? Activity<DailyStoryAttributes> else {
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

    /// Start listening for push-to-start tokens for StreakGuard activities.
    /// When iOS provides a token, this emits an 'onPushToStartToken' event to JS.
    /// JS is responsible for POSTing the token to the backend.
    ///
    /// Architecture rationale: keeping backend API calls in JS means:
    /// - Same AffinityNotificationService pattern already used for push tokens
    /// - Hot-reloadable debugging (no native rebuild for API fixes)
    /// - Consistent error handling with rest of JS codebase
    AsyncFunction("registerPushToStartTokens") { () async throws in
      guard #available(iOS 17.2, *) else {
        throw LiveActivityError.unsupported
      }

      // Listen for StreakGuard push-to-start tokens
      Task {
        for await tokenData in Activity<StreakGuardAttributes>.pushToStartTokenUpdates {
          let tokenString = tokenData.map { String(format: "%02x", $0) }.joined()
          NSLog("[LiveActivity] Received push-to-start token for StreakGuard: \(tokenString.prefix(16))...")

          // Emit to JS — JS will POST to backend
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
