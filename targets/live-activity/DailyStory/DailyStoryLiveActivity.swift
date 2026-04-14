#if canImport(ActivityKit)
import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - DailyStoryLiveActivity
// Lock screen layout uses the main Archives brand palette (shoe brown + persian orange).
// Dynamic Island variants mirror StreakGuardLiveActivity's 3-row expanded structure
// and compact leading/trailing pattern for visual consistency across both activities.

@available(iOS 16.2, *)
struct DailyStoryLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: DailyStoryAttributes.self) { context in
      // MARK: Lock Screen / Banner — state-driven
      if context.state.state == .completed {
        DailyStoryCompleteBanner(
          xpEarned: context.state.xpEarned,
          dayNumber: context.attributes.dayNumber,
          totalDays: context.attributes.totalDays,
          eraTitle: context.attributes.eraTitle
        )
        .activityBackgroundTint(.dailyStoryBackground)
        .activitySystemActionForegroundColor(.white)
      } else if context.state.state == .incomplete {
        DailyStoryIncompleteBanner(
          currentStreak: context.state.currentStreak,
          progressPercent: context.state.progressPercent,
          watchCompleted: context.state.watchCompleted,
          exploreCompleted: context.state.exploreCompleted,
          questionsCompleted: context.state.questionsCompleted,
          dayNumber: context.attributes.dayNumber,
          totalDays: context.attributes.totalDays,
          eraTitle: context.attributes.eraTitle
        )
        .activityBackgroundTint(.dailyStoryBackground)
        .activitySystemActionForegroundColor(.white)
      } else {
        DailyStoryBanner(
          currentStreak: context.state.currentStreak,
          endDate: context.state.endDate,
          progressPercent: context.state.progressPercent,
          watchCompleted: context.state.watchCompleted,
          exploreCompleted: context.state.exploreCompleted,
          questionsCompleted: context.state.questionsCompleted,
          dayNumber: context.attributes.dayNumber,
          totalDays: context.attributes.totalDays,
          eraTitle: context.attributes.eraTitle
        )
        .activityBackgroundTint(.dailyStoryBackground)
        .activitySystemActionForegroundColor(.white)
      }
    } dynamicIsland: { context in
      // MARK: Dynamic Island variants
      // No `let` bindings — all clamps inlined to avoid ViewBuilder/result builder issues.
      DynamicIsland {
        // MARK: Expanded — Figma 2752:4520
        // Single .bottom region with full content + surprise mascot.
        DynamicIslandExpandedRegion(.bottom) {
          DailyStoryExpandedContent(
            currentStreak: context.state.currentStreak,
            endDate: context.state.endDate,
            watchCompleted: context.state.watchCompleted,
            exploreCompleted: context.state.exploreCompleted,
            questionsCompleted: context.state.questionsCompleted,
            dayNumber: context.attributes.dayNumber,
            totalDays: context.attributes.totalDays,
            eraTitle: context.attributes.eraTitle
          )
        }
      } compactLeading: {
        // Per spec: flame + streak count (same as StreakGuard pattern)
        HStack(spacing: 3) {
          Text("🔥")
            .font(.system(size: 14))
          Text("\(max(1, context.state.currentStreak))")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(.white)
        }
      } compactTrailing: {
        Text(
          Date(timeIntervalSinceNow: context.state.endDate - Date().timeIntervalSince1970),
          style: .timer
        )
        .foregroundColor(.dailyStoryTimerGold)
        .monospacedDigit()
        .frame(maxWidth: 60, alignment: .trailing)
      } minimal: {
        // Per spec: flame + streak count in small oval pill
        HStack(spacing: 2) {
          Text("🔥")
            .font(.system(size: 10))
          Text("\(max(1, context.state.currentStreak))")
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(.white)
        }
      }
      .widgetURL(URL(string: "archives://today?source=live_activity"))
      .keylineTint(.dailyStoryTimerGold)
    }
  }
}

#endif
