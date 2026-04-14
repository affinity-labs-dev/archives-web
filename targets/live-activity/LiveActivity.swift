#if canImport(ActivityKit)
import SwiftUI
import WidgetKit

// MARK: - ArchivesLiveActivityBundle
// Widget extension entry point — registers all Live Activity widgets.
//
// File structure (all files within targets/live-activity/):
//   - LiveActivity.swift               — this file (@main entry)
//   - Attributes.swift                 — ActivityAttributes types + StreakState enum
//   - Colors.swift                     — Color palette extensions
//   - StreakGuard/                     — StreakGuardLiveActivity + 6 state variant views
//   - DailyStory/                      — DailyStoryLiveActivity + banner variants + expanded content

@main
@available(iOS 16.2, *)
struct ArchivesLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    DailyStoryLiveActivity()
    StreakGuardLiveActivity()
  }
}

#endif
