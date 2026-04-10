#if canImport(ActivityKit)
import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - StreakGuardLiveActivity
// Three-state Live Activity for daily streak tracking.
// Triggered at 22:00 when user hasn't completed today's story yet.
//
// Lifecycle:
//   .expiring → .saved  (user completes story before midnight)
//   .expiring → .failed (midnight passes, no cards completed; 15 min linger)
//
// Lock screen banner and Dynamic Island expanded view have dedicated designs
// for each state (see StreakGuard/ subfolder). Compact Dynamic Island always
// shows 🔥 + streak count with state-dependent trailing indicator.
//
// # JS bridge requirements (Phase 1)
//
// When transitioning to a terminal state (.saved or .failed), the JS bridge MUST
// call `activity.end(using:dismissalPolicy:)` with `dismissalPolicy: .after(Date()
// .addingTimeInterval(15 * 60))`. Without this, iOS keeps the banner on the lock
// screen for up to 4 hours — a visible UX bug.
//
// The Swift widget itself does not control dismissal timing; it only renders the
// content state it's given. Dismissal lifecycle is the JS bridge's responsibility.
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
          currentStreak: context.attributes.currentStreak,
          endDate: context.state.endDate
        )
        .activityBackgroundTint(.streakExpiringBackground)
        .activitySystemActionForegroundColor(.streakExpiringTextPrimary)
      } else if context.state.state == .saved {
        StreakSavedBanner(currentStreak: context.attributes.currentStreak)
          .activityBackgroundTint(.streakSavedBackground)
          .activitySystemActionForegroundColor(.white)
      } else {
        StreakLostBanner(currentStreak: context.attributes.currentStreak)
          .activityBackgroundTint(.streakExpiringBackground)
          .activitySystemActionForegroundColor(.streakExpiringTextPrimary)
      }
    } dynamicIsland: { context in
      // MARK: Dynamic Island variants
      // Expanded mirrors the lock screen banner at reduced text sizes.
      // Background color is intentionally NOT set — the system-controlled pill
      // background (black) shows through. Content layout and typography are
      // preserved from the mini-banner designs.
      // NOTE: Using if/else instead of switch — SwiftUI DynamicIslandExpandedContentBuilder
      // does not support `switch` statements on all iOS versions (buildPartialBlock availability).
      // if/else chain is universally supported by all SwiftUI result builders.
      DynamicIsland {
        DynamicIslandExpandedRegion(.bottom) {
          if context.state.state == .expiring {
            StreakExpiringExpandedContent(
              currentStreak: context.attributes.currentStreak,
              endDate: context.state.endDate
            )
          } else if context.state.state == .saved {
            StreakSavedExpandedContent(currentStreak: context.attributes.currentStreak)
          } else {
            StreakLostExpandedContent(currentStreak: context.attributes.currentStreak)
          }
        }
      } compactLeading: {
        HStack(spacing: 3) {
          Text("🔥")
            .font(.system(size: 14))
          Text("\(max(1, context.attributes.currentStreak))")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(.white)
        }
      } compactTrailing: {
        // MARK: Compact trailing — state-dependent indicator
        // - .expiring: circular countdown ring (depletes as time passes)
        // - .saved:    green checkmark (success confirmation)
        // - .failed:   red x-mark (streak lost)
        //
        // Text countdown instead of circular ProgressView — shows actual time remaining
        // (e.g., "23:15", "0:30") which is more informative in the small compact trailing space.
        if context.state.state == .expiring {
          // Use Text(Date, style: .timer) + .frame(maxWidth: 32) pattern from
          // proven timer live activity implementations. This constrains pill width.
          // Ref: https://developer.apple.com/forums/thread/723316
          Text(
            Date(timeIntervalSinceNow: context.state.endDate - Date().timeIntervalSince1970),
            style: .timer
          )
          .foregroundColor(.white)
          .monospacedDigit()
          .frame(maxWidth: 32)
        } else if context.state.state == .saved {
          Image(systemName: "checkmark.circle.fill")
            .foregroundColor(.dynIslandCheckGreen)
        } else {
          Image(systemName: "xmark.circle.fill")
            .foregroundColor(.streakExpiringWarning)
        }
      } minimal: {
        // MARK: Minimal — single 🔥 emoji (smallest representation)
        Text("🔥")
          .font(.system(size: 12))
      }
      .widgetURL(URL(string: "archives://today?source=live_activity"))
      .keylineTint(.streakExpiringWarning)
    }
  }
}

#endif
