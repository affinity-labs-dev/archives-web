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
      // MARK: Lock Screen / Banner layout (brand palette — to be updated when Figma design arrives)
      // Defensive clamps inlined into views — no `let` bindings in result builder closures.
      VStack(alignment: .leading, spacing: 8) {
        HStack {
          Text("Daily Story")
            .font(.caption)
            .foregroundColor(.archivesPersianOrange)
            .lineLimit(1)
          Spacer()
          Text("Card \(min(max(1, context.state.currentCard), max(1, context.state.totalCards))) of \(max(1, context.state.totalCards))")
            .font(.caption)
            .foregroundColor(.archivesCreamWhite.opacity(0.7))
            .lineLimit(1)
        }
        Text(context.attributes.storyTitle)
          .font(.headline)
          .foregroundColor(.archivesCreamWhite)
          .lineLimit(2)
          .minimumScaleFactor(0.8)
        ProgressView(value: min(max(0, context.state.progressPercent), 1))
          .tint(.archivesPersianOrange)
        Text("Tap to continue")
          .font(.caption2)
          .foregroundColor(.archivesCreamWhite.opacity(0.6))
          .lineLimit(1)
      }
      .padding(16)
      .background(Color.archivesShoeBrown)
      .activityBackgroundTint(.archivesShoeBrown)
      .activitySystemActionForegroundColor(.archivesCreamWhite)
      .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    } dynamicIsland: { context in
      // MARK: Dynamic Island variants
      // No `let` bindings — all clamps inlined to avoid ViewBuilder/result builder issues.
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 4) {
            Image(systemName: "book.closed.fill")
              .font(.system(size: 13))
              .foregroundColor(.archivesPersianOrange)
            Text("Daily Story")
              .font(.system(size: 15, weight: .semibold))
              .foregroundColor(.white)
              .lineLimit(1)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text("\(min(max(1, context.state.currentCard), max(1, context.state.totalCards))) of \(max(1, context.state.totalCards)) cards")
            .font(.system(size: 14, weight: .medium))
            .foregroundColor(.archivesPersianOrange)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 10) {
            Rectangle()
              .fill(Color.dynIslandSeparator)
              .frame(height: 1)

            HStack(spacing: 20) {
              CardStatusPill(label: "WATCH", completed: context.state.watchCompleted)
              CardStatusPill(label: "EXPLORE", completed: context.state.exploreCompleted)
              CardStatusPill(label: "QUESTIONS", completed: context.state.questionsCompleted)
              Spacer(minLength: 0)
            }

            Text("Day \(min(max(1, context.attributes.dayNumber), max(1, context.attributes.totalDays))) of \(max(1, context.attributes.totalDays)) — \(context.attributes.eraTitle)")
              .font(.system(size: 11))
              .foregroundColor(.dynIslandCaptionGray)
              .lineLimit(1)
              .minimumScaleFactor(0.8)
          }
        }
      } compactLeading: {
        HStack(spacing: 3) {
          Image(systemName: "book.closed.fill")
            .font(.system(size: 12))
            .foregroundColor(.archivesPersianOrange)
          Text("\(min(max(1, context.state.currentCard), max(1, context.state.totalCards)))/\(max(1, context.state.totalCards))")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
      } compactTrailing: {
        ProgressView(value: min(max(0, context.state.progressPercent), 1))
          .progressViewStyle(.circular)
          .tint(.archivesPersianOrange)
      } minimal: {
        // MARK: Minimal — book icon
        Image(systemName: "book.closed.fill")
          .foregroundColor(.archivesPersianOrange)
      }
      .widgetURL(URL(string: "archives://today?source=live_activity"))
      .keylineTint(.archivesPersianOrange)
    }
  }
}

#endif
