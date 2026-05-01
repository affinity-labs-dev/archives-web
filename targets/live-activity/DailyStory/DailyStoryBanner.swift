#if canImport(ActivityKit)
import SwiftUI

// MARK: - DailyStoryBanner
// Lock screen banner for the DailyStory .inProgress state (Figma 2756:4517).
// Dark background, streak + timer Row 1, blue progress bar Row 2,
// WATCH/EXPLORE/QUESTIONS pills Row 3, era caption Row 4, teacher mascot bottom-right.

@available(iOS 16.2, *)
struct DailyStoryBanner: View {
  let currentStreak: Int
  /// Countdown target — usually midnight local time.
  /// SwiftUI's `Text(_, style: .timer)` auto-counts DOWN to a future date.
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
  /// Countdown target. Clamps to `now+1` if `endDate` is past or missing —
  /// without this, `Text(_, style: .timer)` would silently flip to count-UP
  /// for any past Date, producing a wrong elapsed-time display after midnight.
  private var countdownEnd: Date {
    let now = Date()
    let raw = Date(timeIntervalSince1970: endDate)
    return max(now.addingTimeInterval(1), raw)
  }

  var body: some View {
    ZStack(alignment: .topLeading) {
      // Layer 1: Dark background
      Color.dailyStoryBackground

      // Layer 2: Teacher mascot, bottom-right — larger and shifted down so
      // it partially overflows past the banner bottom edge. iOS Live Activity
      // container clips to its rounded-corner shape automatically.
      VStack {
        Spacer()
        HStack {
          Spacer()
          Image("TeacherMascot")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: 120, height: 110)
            .offset(y: 32)
        }
      }

      // Layer 3: Archives logo, top-right — pinned above mascot.
      // Logo sits at (top: 10, trailing: 10) well above the mascot whose top
      // edge starts around y ≈ 48 (banner height ~160 - mascot 110 - offset 16 + padding).
      VStack {
        HStack {
          Spacer()
          Image("ArchivesLogo")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: 72, height: 16)
            .padding(.top, 14)
            .padding(.trailing, 14)
        }
        Spacer()
      }

      // Layer 4: Content — 4 rows. Spacing 16 (up from 10) increases banner
      // height so Archives logo and mascot don't overlap in the right column.
      VStack(alignment: .leading, spacing: 16) {
        // Row 1: Streak label (left) + timer group (right), justify-between across full banner width.
        //
        // Negative trailing padding cancels 58 of the parent's 78-pt trailing, so Row 1 reaches
        // 20pt from the banner's right edge (symmetrical with the 20pt leading). Rows 2–4 keep
        // the full 78-pt clearance for the teacher mascot anchored bottom-right.
        //
        // Timer+" left" is a nested HStack (NOT a `Text + Text` concatenation) because
        // `Text(Date, style: .timer)` over-reports its intrinsic width — SwiftUI reserves layout
        // space for the widest possible time string, and when that's concatenated with `+` the
        // inflated width eats into the Spacer, breaking the justify-between. `.fixedSize` on the
        // inner HStack pins its layout width to its natural content size, and `right-aligned
        // .trailing` inside the timer's own frame keeps the digits visually anchored right even
        // as the string shrinks from "5h 12m" to "5h 11m".
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
            // Countdown: SwiftUI counts DOWN to a future date with `style: .timer`.
            // No JS-driven updates needed — iOS ticks the digits natively.
            Text(countdownEnd, style: .timer)
              .font(.system(size: 13, weight: .medium))
              .foregroundColor(.dailyStoryTimerGold)
              .monospacedDigit()
              .multilineTextAlignment(.trailing)
              .frame(maxWidth: 70, alignment: .trailing)
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
        // On small devices (iPhone SE/mini), `minimumScaleFactor(0.85)` on each pill
        // auto-scales the text so "QUESTIONS" doesn't wrap its trailing "s".
        HStack(spacing: 25) {
          DailyStoryCardPill(icon: "Watch", completed: watchCompleted)
          DailyStoryCardPill(icon: "Explore", completed: exploreCompleted)
          DailyStoryCardPill(icon: "Questions", completed: questionsCompleted)
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
      .padding(.bottom, 20)
      .padding(.trailing, 115)
    }
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }
}

// MARK: - DailyStoryCardPill
// Card status pill — status glyph (✓/○) + 18×18 card icon.
// Icons render as "original" (white PNG), glyph provides state color.

@available(iOS 16.2, *)
private struct DailyStoryCardPill: View {
  let icon: String
  let completed: Bool

  var body: some View {
    HStack(spacing: 5) {
      Text(completed ? "✓" : "○")
        .font(.system(size: 14, weight: .bold))
        .foregroundColor(completed ? .dynIslandCheckGreen : .dailyStoryIncompleteBlue)
      Image(icon)
        .resizable()
        .aspectRatio(contentMode: .fit)
        .frame(width: 18, height: 18)
    }
  }
}

#endif
