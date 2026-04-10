import Foundation

#if canImport(ActivityKit)
import ActivityKit

// MARK: - DailyStoryActivity

/// ActivityAttributes for the "daily story in progress" Live Activity.
/// Triggered when a user exits a daily story mid-way and needs a resume CTA on the lock screen.
///
/// Shares the same underlying story structure (WATCH/EXPLORE/QUESTIONS cards + era context)
/// as StreakGuardAttributes, so the expanded Dynamic Island view uses identical pills and caption.
@available(iOS 16.2, *)
struct DailyStoryAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// 1-indexed card number the user was on when they exited.
    var currentCard: Int
    /// Total number of cards in the daily story (usually 3: WATCH / EXPLORE / QUESTIONS).
    var totalCards: Int
    /// 0.0 – 1.0 progress through the story — drives the circular ring in compact trailing.
    var progressPercent: Double
    /// Last-updated timestamp (seconds since 1970).
    var lastUpdated: Double
    /// Whether the user has completed the WATCH card.
    var watchCompleted: Bool
    /// Whether the user has completed the EXPLORE card.
    var exploreCompleted: Bool
    /// Whether the user has completed the QUESTIONS card.
    var questionsCompleted: Bool
  }

  /// YYYY-MM-DD identifier for the daily story.
  var storyId: String
  /// Human-readable title shown on the lock screen.
  var storyTitle: String
  /// Current era/adventure title, e.g. "The Golden Age".
  var eraTitle: String
  /// Which day of the current adventure the user is on (1-indexed).
  var dayNumber: Int
  /// Total days in the current adventure.
  var totalDays: Int
}

// MARK: - StreakGuardActivity

/// Three-way state for the StreakGuard Live Activity lifecycle.
///
/// # Lifecycle
///
/// Activities **MUST** start in `.expiring` state. Starting directly in a terminal
/// state (`.saved` or `.failed`) is technically allowed by the API but semantically
/// nonsensical — do not do this from the JS bridge layer.
///
/// Valid transitions:
///   - `21:00` → `.expiring` (activity.request with countdown to midnight)
///   - `.expiring` → `.saved` (user completes daily story; activity.update)
///   - `.expiring` → `.failed` (midnight passes with no card completed; activity.update)
///
/// Once in a terminal state (`.saved` or `.failed`), the activity should **not** be
/// transitioned back. The JS bridge must enforce monotonic progression.
///
/// # Dismissal timing
///
/// Per Apple's ActivityKit docs, a Live Activity lingers on the lock screen for up
/// to 4 hours after ending unless `dismissal-date` is explicitly set. For StreakGuard:
///   - `.saved`  → JS bridge must call `activity.end(using:, dismissalPolicy: .after(Date() + 15 * 60))`
///   - `.failed` → Same — lingers 15 minutes per product spec
///   - `.expiring` → Never ends on its own; transitioned by JS bridge
///
/// Forgetting to set `dismissalPolicy` means terminal banners persist until ~04:00
/// the next day, which is a UX bug.
///
/// # Race condition handling
///
/// If user completes final card at 23:59:59 while the midnight scheduler is firing
/// at 00:00:00, both `.saved` and `.failed` transitions may race. JS bridge layer
/// is responsible for last-write-wins or explicit ordering; Swift widget renders
/// whatever content state it's given.
public enum StreakState: String, Codable, Hashable {
  case expiring  // Active countdown, user still has time
  case saved     // User completed story before midnight
  case failed    // Midnight passed with no cards completed
}

/// ActivityAttributes for the "streak at risk" Live Activity.
/// Triggered when a user opens the app after 21:00 without completing today's story.
///
/// The Dynamic Island design for StreakGuard is compact-only: compactLeading shows
/// the streak count, compactTrailing shows a circular countdown. The expanded view
/// mirrors the compact (same content, scaled up) rather than surfacing additional
/// story progress — that detail lives in DailyStoryActivity instead.
@available(iOS 16.2, *)
struct StreakGuardAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// Current lifecycle state — drives which banner variant renders.
    var state: StreakState
    /// End timestamp (seconds since 1970) — usually midnight local time.
    /// iOS renders the countdown natively via Text(timerInterval:) without manual updates.
    /// Only meaningful in `.expiring` state; ignored in `.saved` and `.failed`.
    var endDate: Double
  }

  /// Current streak count at the time the activity was started.
  /// For `.saved` state, this should be updated to the new streak count (currentStreak + 1)
  /// when the user completes their story.
  /// For `.failed` state, this is the streak count that was lost.
  var currentStreak: Int
  /// YYYY-MM-DD when the streak started (for display purposes).
  var streakStartDate: String
}

#endif
