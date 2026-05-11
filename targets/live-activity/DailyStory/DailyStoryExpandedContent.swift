#if canImport(ActivityKit)
import SwiftUI

// MARK: - DailyStoryExpandedContent
// Dynamic Island expanded view for DailyStory (Figma 2752:4520).
// 4 rows: streak+timer, separator, WATCH/EXPLORE/QUESTIONS pills, era caption.
// Surprise mascot head in bottom-right corner.

@available(iOS 16.2, *)
struct DailyStoryExpandedContent: View {
  let currentStreak: Int
  /// Start anchor — matches lock-screen banner. Counts UP from past dates.
  let startedAt: Double
  let watchCompleted: Bool
  let exploreCompleted: Bool
  let questionsCompleted: Bool
  let dayNumber: Int
  let totalDays: Int
  let eraTitle: String

  private var displayStreak: Int { max(1, currentStreak) }
  /// Mirror of `DailyStoryBanner.countUpStart` — past-clamp so SwiftUI keeps
  /// counting UP (default behavior for past dates) instead of flipping to
  /// count-down for any value that's somehow in the future.
  private var countUpStart: Date {
    let now = Date()
    if startedAt <= 0 { return now.addingTimeInterval(-1) }
    let raw = Date(timeIntervalSince1970: startedAt)
    return min(now.addingTimeInterval(-1), raw)
  }

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
        // Layout mirrors `DailyStoryBanner` Row 1 — same `.fixedSize` + nested
        // HStack pattern. Reason: `Text(Date, style: .timer)` over-reports its
        // intrinsic width (SwiftUI reserves space for the widest possible time
        // string), which eats into the Spacer and breaks the justify-between.
        // Wrapping in HStack(spacing: 0) + .fixedSize pins layout width to the
        // natural content size; .frame(maxWidth: 70, alignment: .trailing)
        // keeps digits anchored right as the string shrinks tick-by-tick.
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
          HStack(spacing: 0) {
            // Two-phase render — see DailyStoryBanner for full rationale.
            // Pre-engagement: frozen "0:00" placeholder. Post-button-tap:
            // native count-UP ticker via `Text(_, style: .timer)`.
            if startedAt > 0 {
              Text(countUpStart, style: .timer)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.dailyStoryTimerGold)
                .monospacedDigit()
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 70, alignment: .trailing)
            } else {
              Text("0:00")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.dailyStoryTimerGold)
                .monospacedDigit()
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 70, alignment: .trailing)
            }
          }
          .fixedSize(horizontal: true, vertical: false)
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
