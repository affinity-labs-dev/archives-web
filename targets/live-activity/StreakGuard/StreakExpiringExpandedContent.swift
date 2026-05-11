#if canImport(ActivityKit)
import SwiftUI

// MARK: - StreakExpiringExpandedContent
// Dynamic Island expanded view for .expiring state — mini-banner layout.
// Same content as StreakExpiringBanner but with reduced typography (18/13/36/13pt).

@available(iOS 16.2, *)
struct StreakExpiringExpandedContent: View {
  let currentStreak: Int
  let endDate: Double

  // MARK: Defensive guards
  /// Guarantees streak count is at least 1 for display purposes.
  private var displayStreak: Int { max(1, currentStreak) }
  /// Guarantees the countdown endpoint is in the future, avoiding invalid ranges.
  private var safeEndDate: Date {
    let raw = Date(timeIntervalSince1970: endDate)
    return max(Date().addingTimeInterval(1), raw)
  }

  var body: some View {
    ZStack(alignment: .topLeading) {
      // Worried mascot on right (system-controlled background behind it)
      HStack {
        Spacer()
        Image("Mascot")
          .resizable()
          .aspectRatio(contentMode: .fit)
          .frame(width: 102, height: 135)
      }

      // Text content with smaller typography
      VStack(alignment: .leading, spacing: 6) {
        HStack(spacing: 6) {
          Text("🔥")
            .font(.system(size: 18))

          Text("\(displayStreak)-day streak at risk")
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(.streakExpiringTextSecondary)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }

        Text(
          timerInterval: Date()...safeEndDate,
          countsDown: true
        )
        .font(.system(size: 36, weight: .black))
        .foregroundColor(.streakExpiringTextPrimary)
        .tracking(-1)
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.6)

        Text("Left to save your streak")
          .font(.system(size: 13, weight: .semibold))
          .foregroundColor(.streakExpiringTextSecondary)
          .lineLimit(1)
      }
      .padding(.leading, 16)
      .padding(.bottom, 20)
      .padding(.trailing, 121)
      .frame(maxWidth: .infinity, alignment: .topLeading)
    }
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }
}

#endif
