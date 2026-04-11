#if canImport(ActivityKit)
import SwiftUI

// MARK: - DailyStoryBanner
// Lock screen banner for the DailyStory .inProgress state (Figma 2756:4517).
// Dark background, streak + timer Row 1, blue progress bar Row 2,
// WATCH/EXPLORE/QUESTIONS pills Row 3, era caption Row 4, teacher mascot bottom-right.

@available(iOS 16.2, *)
struct DailyStoryBanner: View {
  let currentStreak: Int
  let endDate: Double
  let progressPercent: Double
  let watchCompleted: Bool
  let exploreCompleted: Bool
  let questionsCompleted: Bool
  let dayNumber: Int
  let totalDays: Int
  let eraTitle: String

  // MARK: Defensive guards
  private var displayStreak: Int { max(1, currentStreak) }
  private var safeProgress: Double { min(max(0, progressPercent), 1) }
  private var safeEndDate: Date {
    let raw = Date(timeIntervalSince1970: endDate)
    return max(Date().addingTimeInterval(1), raw)
  }

  var body: some View {
    ZStack(alignment: .topLeading) {
      // Layer 1: Dark background
      Color.dailyStoryBackground

      // Layer 2: Teacher mascot, bottom-right
      VStack {
        Spacer()
        HStack {
          Spacer()
          Image("TeacherMascot")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: 92, height: 99)
        }
      }

      // Layer 3: Content — 4 rows with 10px spacing
      VStack(alignment: .leading, spacing: 10) {
        // Row 1: Streak label (left) + timer group (right), justify-between across full banner width.
        //
        // Negative trailing padding cancels 75 of the parent's 95-pt trailing, so Row 1 reaches
        // 20pt from the banner's right edge (symmetrical with the 20pt leading). Rows 2–4 keep
        // the full 95-pt clearance for the teacher mascot anchored bottom-right.
        //
        // Timer+" left" is a nested HStack (NOT a `Text + Text` concatenation) because
        // `Text(Date, style: .timer)` over-reports its intrinsic width — SwiftUI reserves layout
        // space for the widest possible time string, and when that's concatenated with `+` the
        // inflated width eats into the Spacer, breaking the justify-between. `.fixedSize` on the
        // inner HStack pins its layout width to its natural content size, and `right-aligned
        // .trailing` inside the timer's own frame keeps the digits visually anchored right even
        // as the string shrinks from "5h 12m" to "5h 11m".
        HStack {
          Text("🔥 \(displayStreak)-day streak")
            .font(.system(size: 15, weight: .semibold))
            .foregroundColor(.white)
            .lineLimit(1)
          Spacer()
          HStack(spacing: 0) {
            Text(
              Date(timeIntervalSinceNow: endDate - Date().timeIntervalSince1970),
              style: .timer
            )
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(.dailyStoryTimerGold)
            .monospacedDigit()
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: 70, alignment: .trailing)
            Text(" left")
              .font(.system(size: 13, weight: .medium))
              .foregroundColor(.dailyStoryTimerGold)
          }
          .fixedSize(horizontal: true, vertical: false)
        }

        // Row 2: Progress bar (6pt tall, rounded)
        GeometryReader { geometry in
          ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 3)
              .fill(Color.dailyStoryProgressTrack)
              .frame(height: 6)
            RoundedRectangle(cornerRadius: 3)
              .fill(Color.dailyStoryProgressFill)
              .frame(width: geometry.size.width * safeProgress, height: 6)
          }
        }
        .frame(height: 6)

        // Row 3: WATCH / EXPLORE / QUESTIONS pills
        HStack(spacing: 8) {
          DailyStoryCardPill(label: "WATCH", completed: watchCompleted)
          DailyStoryCardPill(label: "EXPLORE", completed: exploreCompleted)
          DailyStoryCardPill(label: "QUESTIONS", completed: questionsCompleted)
          Spacer(minLength: 0)
        }

        // Row 4: Era caption
        Text("Day \(max(1, dayNumber)) of \(max(1, totalDays)) - \(eraTitle)")
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

// MARK: - DailyStoryCardPill
// Card status pill for DailyStory banner — uses blue for incomplete (distinct from
// StreakGuard's gray). Green checkmark for completed (shared).

@available(iOS 16.2, *)
private struct DailyStoryCardPill: View {
  let label: String
  let completed: Bool

  var body: some View {
    HStack(spacing: 5) {
      Text(label)
        .font(.system(size: 12, weight: .semibold))
        .tracking(0.6)
        .foregroundColor(completed ? .white : .dailyStoryIncompleteBlue)
      Text(completed ? "✓" : "○")
        .font(.system(size: 14, weight: .bold))
        .foregroundColor(completed ? .dynIslandCheckGreen : .dailyStoryIncompleteBlue)
    }
  }
}

#endif
