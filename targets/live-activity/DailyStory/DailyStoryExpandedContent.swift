#if canImport(ActivityKit)
import SwiftUI

// MARK: - DailyStoryExpandedContent
// Dynamic Island expanded view for DailyStory (Figma 2752:4520).
// 4 rows: streak+timer, separator, WATCH/EXPLORE/QUESTIONS pills, era caption.
// Surprise mascot head in bottom-right corner.

@available(iOS 16.2, *)
struct DailyStoryExpandedContent: View {
  let currentStreak: Int
  let endDate: Double
  let watchCompleted: Bool
  let exploreCompleted: Bool
  let questionsCompleted: Bool
  let dayNumber: Int
  let totalDays: Int
  let eraTitle: String

  private var displayStreak: Int { max(1, currentStreak) }

  var body: some View {
    ZStack(alignment: .topLeading) {
      // Surprise mascot, bottom-right
      VStack {
        Spacer()
        HStack {
          Spacer()
          Image("SurpriseMascot")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: 57, height: 50)
        }
      }

      // Content — 4 rows
      VStack(alignment: .leading, spacing: 10) {
        // Row 1: Streak label + gold timer
        HStack {
          HStack(spacing: 4) {
            Image("Flame")
              .resizable()
              .aspectRatio(contentMode: .fit)
              .frame(width: 12, height: 14)
            Text("\(displayStreak)-day streak")
              .font(.system(size: 15, weight: .semibold))
              .foregroundColor(.white)
              .lineLimit(1)
          }
          Spacer()
          Text(
            Date(timeIntervalSinceNow: endDate - Date().timeIntervalSince1970),
            style: .timer
          )
          .font(.system(size: 14, weight: .medium))
          .foregroundColor(.dailyStoryTimerGold)
          .monospacedDigit()
        }

        // Separator
        Rectangle()
          .fill(Color.dailyStorySeparator)
          .frame(height: 1)

        // Row 2: WATCH / EXPLORE / QUESTIONS
        HStack(spacing: 25) {
          DailyStoryExpandedPill(icon: "Watch", completed: watchCompleted)
          DailyStoryExpandedPill(icon: "Explore", completed: exploreCompleted)
          DailyStoryExpandedPill(icon: "Questions", completed: questionsCompleted)
          Spacer(minLength: 0)
        }

        // Row 3: Era caption
        Text("Day \(max(1, dayNumber)) of \(max(1, totalDays)) - \(eraTitle)")
          .font(.system(size: 11))
          .foregroundColor(.dailyStoryCaptionLavender)
          .lineLimit(1)
      }
      .padding(.leading, 18)
      .padding(.top, 16)
      .padding(.bottom, 16)
      .padding(.trailing, 65)
    }
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }
}

// MARK: - DailyStoryExpandedPill
// Card status pill for expanded Dynamic Island — glyph + 18×18 icon.

@available(iOS 16.2, *)
private struct DailyStoryExpandedPill: View {
  let icon: String
  let completed: Bool

  var body: some View {
    HStack(spacing: 4) {
      Text(completed ? "✓" : "○")
        .font(.system(size: 13, weight: .bold))
        .foregroundColor(completed ? .dynIslandCheckGreen : .dailyStoryIncompleteBlue)
      Image(icon)
        .resizable()
        .aspectRatio(contentMode: .fit)
        .frame(width: 18, height: 18)
    }
  }
}

#endif
