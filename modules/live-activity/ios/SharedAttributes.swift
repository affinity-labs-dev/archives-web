import Foundation

#if canImport(ActivityKit)
import ActivityKit

// MARK: - SharedAttributes
//
// This file DUPLICATES the Attributes.swift content from the widget extension target
// (targets/live-activity/Attributes.swift). The two files MUST be kept in sync —
// they represent the same data contract on both sides of the JS↔Native bridge.
//
// Why duplicate: ActivityKit requires attribute types to be compiled into BOTH
// the widget extension (for rendering) and the main app's Expo Module (for
// start/update/end calls). Swift targets can't share source files across
// compilation units in the apple-targets workflow, so we copy-paste.
//
// When updating either copy:
//   1. Edit targets/live-activity/Attributes.swift
//   2. Edit modules/live-activity/ios/SharedAttributes.swift
//   3. Run `npx expo prebuild -p ios --clean` to verify both targets compile
//   4. Check the diff — any drift will show as a Codable mismatch at runtime

// MARK: - DailyStoryActivity

// ActivityAttributes protocol itself is @available(iOS 16.1, *), so conforming
// structs inherit that availability — no explicit marker needed on the struct.
struct DailyStoryAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var currentCard: Int
    var totalCards: Int
    var progressPercent: Double
    var lastUpdated: Double
    var watchCompleted: Bool
    var exploreCompleted: Bool
    var questionsCompleted: Bool
  }

  var storyId: String
  var storyTitle: String
  var eraTitle: String
  var dayNumber: Int
  var totalDays: Int
}

// MARK: - StreakGuardActivity

public enum StreakState: String, Codable, Hashable {
  case expiring
  case saved
  case failed
}

// ActivityAttributes protocol itself is @available(iOS 16.1, *), so conforming
// structs inherit that availability — no explicit marker needed on the struct.
struct StreakGuardAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var state: StreakState
    var endDate: Double
  }

  var currentStreak: Int
  var streakStartDate: String
}

#endif
