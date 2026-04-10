#if canImport(ActivityKit)
import SwiftUI

// MARK: - StreakLostBanner
// Lock screen banner for the .failed state (Figma 2764:4517).
// Maroon background (reused from expiring, no glow), sad mascot, cream headline + lavender subtitle.
// 84pt tall — compact compared to expiring (180pt) and saved (131pt).

@available(iOS 16.2, *)
struct StreakLostBanner: View {
  let currentStreak: Int

  // MARK: Defensive guards
  /// Guarantees streak count is at least 1 for display purposes.
  /// "Your 0-day streak has ended" is semantically nonsense.
  private var displayStreak: Int { max(1, currentStreak) }

  var body: some View {
    ZStack(alignment: .topLeading) {
      // Layer 1: Flat maroon background (no gradient — past-tense tone, no urgency)
      Color.streakExpiringBackground

      // Layer 2: Sad mascot, right-aligned (smaller than other mascots — 67×57 native)
      HStack {
        Spacer()
        Image("SadMascot")
          .resizable()
          .aspectRatio(contentMode: .fit)
          .frame(width: 67, height: 57)
          .padding(.trailing, 14)
          .padding(.top, 14)
      }

      // Layer 3: Text content, left-aligned
      // "N-day" is a compound modifier, grammatically correct for any N (1-day, 12-day, 365-day)
      VStack(alignment: .leading, spacing: 6) {
        Text("Your \(displayStreak)-day streak has ended")
          .font(.system(size: 17, weight: .bold))
          .foregroundColor(.streakExpiringTextPrimary)
          .lineLimit(1)
          .minimumScaleFactor(0.7)

        Text("Start a new streak today")
          .font(.system(size: 14, weight: .medium))
          .foregroundColor(.streakLostSubtitle)
          .lineLimit(1)
      }
      .padding(.leading, 20)
      .padding(.top, 20)
      .padding(.bottom, 20)
      .padding(.trailing, 90)
    }
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }
}

#endif
