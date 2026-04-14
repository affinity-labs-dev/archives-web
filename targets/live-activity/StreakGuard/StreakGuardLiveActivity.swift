#if canImport(ActivityKit)
import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - StreakGuardLiveActivity
// Three-state Live Activity for daily streak tracking.
// Triggered at 21:00 when user hasn't completed today's story yet.
//
// Lifecycle:
//   .expiring → .saved  (user completes story before midnight)
//   .expiring → .failed (midnight passes, no cards completed)
//
// # State → presentation contract
//
// Lock screen banner has three dedicated designs (.expiring / .saved / .failed).
// Dynamic Island renders **only for .expiring** — terminal states auto-end the
// activity (see services/LiveActivityManager.ts → transitionToSaved/Failed),
// which tears down the Dynamic Island immediately while pinning the banner on
// the lock screen for 15 minutes via `dismissalPolicy: .after(Date + 15*60)`.
//
// This means: any code here that branches the Dynamic Island on .saved/.failed
// is unreachable. Keep the expanded region + compact variants single-path for
// .expiring only — they never see the terminal states.
//
// # JS bridge requirements
//
// `updateStreakGuard({ state: 'saved'|'failed' })` MUST be followed immediately
// by `endStreakGuard(id, 15 * 60)`. Without the follow-up end(), iOS would keep
// the Dynamic Island alive showing stale timer content (endDate = 0 → "0:00").
// See Attributes.swift for full lifecycle documentation.

@available(iOS 16.2, *)
struct StreakGuardLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: StreakGuardAttributes.self) { context in
      // MARK: Lock Screen / Banner layout
      // Three variants based on lifecycle state, each with its own Figma design.
      // Using if/else chain instead of switch — ViewBuilder compatibility.
      if context.state.state == .expiring {
        StreakExpiringBanner(
          currentStreak: context.state.currentStreak,
          endDate: context.state.endDate
        )
        .activityBackgroundTint(.streakExpiringBackground)
        .activitySystemActionForegroundColor(.streakExpiringTextPrimary)
      } else if context.state.state == .saved {
        StreakSavedBanner(currentStreak: context.state.currentStreak)
          .activityBackgroundTint(.streakSavedBackground)
          .activitySystemActionForegroundColor(.white)
      } else {
        StreakLostBanner(currentStreak: context.state.currentStreak)
          .activityBackgroundTint(.streakExpiringBackground)
          .activitySystemActionForegroundColor(.streakExpiringTextPrimary)
      }
    } dynamicIsland: { context in
      // MARK: Dynamic Island variants
      // Only .expiring reaches Dynamic Island — .saved and .failed auto-end the
      // activity at transition time, which drops DI immediately. No state branching
      // needed here; any `.saved`/`.failed` paths would be dead code.
      //
      // Background color is intentionally NOT set — the system-controlled pill
      // background (black) shows through. Content layout and typography are
      // preserved from the expiring mini-banner design.
      DynamicIsland {
        DynamicIslandExpandedRegion(.bottom) {
          StreakExpiringExpandedContent(
            currentStreak: context.state.currentStreak,
            endDate: context.state.endDate
          )
        }
      } compactLeading: {
        HStack(spacing: 3) {
          Text("🔥")
            .font(.system(size: 14))
          Text("\(max(1, context.state.currentStreak))")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(.white)
        }
      } compactTrailing: {
        // MARK: Compact trailing — countdown timer.
        // Text(Date, style: .timer) + .frame(maxWidth: 32) pattern from proven timer
        // live activity implementations. Constrains pill width against the well-known
        // intrinsic-width bug where timer Text reserves space for the widest string.
        // Ref: https://developer.apple.com/forums/thread/723316
        Text(
          Date(timeIntervalSinceNow: context.state.endDate - Date().timeIntervalSince1970),
          style: .timer
        )
        .foregroundColor(.streakExpiringTimerPink)
        .monospacedDigit()
        .frame(maxWidth: 32)
      } minimal: {
        // MARK: Minimal — single 🔥 emoji (smallest representation)
        Text("🔥")
          .font(.system(size: 12))
      }
      .widgetURL(URL(string: "archives://today?source=live_activity_urgent"))
      .keylineTint(.streakExpiringWarning)
    }
  }
}

#endif
