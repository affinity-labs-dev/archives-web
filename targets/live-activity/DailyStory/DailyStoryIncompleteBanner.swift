#if canImport(ActivityKit)
import SwiftUI

// MARK: - DailyStoryIncompleteBanner
// Lock screen banner for the .incomplete state (Figma 2773:4528).
// "Quest incomplete" + flame streak, muted progress bar, completed cards in lavender,
// missed cards in pink ✗, sad mascot bottom-right.

@available(iOS 16.2, *)
struct DailyStoryIncompleteBanner: View {
  let currentStreak: Int
  let progressPercent: Double
  let watchCompleted: Bool
  let exploreCompleted: Bool
  let questionsCompleted: Bool
  let dayNumber: Int
  let totalDays: Int
  let eraTitle: String

  private var displayStreak: Int { max(1, currentStreak) }
  private var safeProgress: Double { min(max(0, progressPercent), 1) }

  var body: some View {
    ZStack(alignment: .topLeading) {
      // Layer 1: Dark background
      Color.dailyStoryBackground

      // Layer 2: Sad mascot, bottom-right
      VStack {
        Spacer()
        HStack {
          Spacer()
          Image("SadMascot")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: 67, height: 57)
            .padding(.trailing, 14)
            .padding(.top, 14)
        }
      }

      // Layer 3: Content — 4 rows
      VStack(alignment: .leading, spacing: 10) {
        // Row 1: "Quest incomplete" + flame streak
        HStack {
          Text("Quest incomplete")
            .font(.system(size: 17, weight: .bold))
            .foregroundColor(.white)
            .lineLimit(1)
          Spacer()
          HStack(spacing: 4) {
            Image("Flame")
              .resizable()
              .aspectRatio(contentMode: .fit)
              .frame(width: 12, height: 14)
            Text("\(displayStreak)")
              .font(.system(size: 14, weight: .medium))
              .foregroundColor(.dailyStoryCaptionLavender)
          }
        }

        // Row 2: Muted progress bar
        GeometryReader { geometry in
          ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 3)
              .fill(Color.dailyStoryIncompleteTrack)
              .frame(height: 6)
            RoundedRectangle(cornerRadius: 3)
              .fill(Color.dailyStoryIncompleteFill)
              .frame(width: geometry.size.width * safeProgress, height: 6)
          }
        }
        .frame(height: 6)

        // Row 3: Card pills — completed in lavender ✓, missed in pink ✗
        // `minimumScaleFactor(0.85)` auto-scales "QUESTIONS" on small devices.
        HStack(spacing: 25) {
          IncompleteCardPill(icon: "Watch", completed: watchCompleted)
          IncompleteCardPill(icon: "Explore", completed: exploreCompleted)
          IncompleteCardPill(icon: "Questions", completed: questionsCompleted)
          Spacer(minLength: 0)
        }

        // Row 4: Caption
        Text("A new quest starts tomorrow")
          .font(.system(size: 12))
          .foregroundColor(.dailyStoryCaptionLavender)
          .lineLimit(1)
      }
      .padding(.leading, 16)
      .padding(.top, 16)
      .padding(.bottom, 16)
      .padding(.trailing, 95)
    }
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }
}

// MARK: - IncompleteCardPill
// Completed cards: lavender ✓ + icon. Missed cards: pink ✗ + icon.

@available(iOS 16.2, *)
private struct IncompleteCardPill: View {
  let icon: String
  let completed: Bool

  var body: some View {
    HStack(spacing: 5) {
      Text(completed ? "✓" : "✗")
        .font(.system(size: 14, weight: .bold))
        .foregroundColor(completed ? .dailyStoryCaptionLavender : .dailyStoryMissedPink)
      Image(icon)
        .resizable()
        .aspectRatio(contentMode: .fit)
        .frame(width: 18, height: 18)
    }
  }
}

#endif
