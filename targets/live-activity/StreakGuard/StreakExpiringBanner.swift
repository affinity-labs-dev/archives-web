#if canImport(ActivityKit)
import SwiftUI

// MARK: - StreakExpiringBanner
// Lock screen banner for the .expiring state (Figma 2481:3902).
// Maroon background with red glow gradient, worried mascot, mixed-size streak label,
// 52pt native-rendered countdown, supporting caption.

@available(iOS 16.2, *)
struct StreakExpiringBanner: View {
  let currentStreak: Int
  let endDate: Double

  // MARK: Defensive guards
  /// Guarantees streak count is at least 1 for display purposes (avoids "0-day streak").
  private var displayStreak: Int { max(1, currentStreak) }
  /// Guarantees the countdown endpoint is in the future, avoiding invalid Text(timerInterval:) ranges.
  /// Handles clock skew, stale payloads, and endDate == 0 (Unix epoch default).
  private var safeEndDate: Date {
    let raw = Date(timeIntervalSince1970: endDate)
    return max(Date().addingTimeInterval(1), raw)
  }

  var body: some View {
    ZStack(alignment: .topLeading) {
      // Layer 1: Deep maroon background
      Color.streakExpiringBackground

      // Layer 2: Red glow gradient (top → transparent at 60% mark)
      LinearGradient(
        gradient: Gradient(stops: [
          .init(color: Color.streakExpiringGlowTop.opacity(0.5), location: 0.0),
          .init(color: Color.streakExpiringBackground.opacity(0.0), location: 0.6)
        ]),
        startPoint: .top,
        endPoint: .bottom
      )

      // Layer 3: Worried mascot, bottom-right aligned
      VStack {
        Spacer()
        HStack {
          Spacer()
          Image("Mascot")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: 102, height: 135)
        }
      }

      // Layer 4: Text content, left-aligned
      VStack(alignment: .leading, spacing: 8) {
        HStack(spacing: 8) {
          Text("🔥")
            .font(.system(size: 24))

          // Warning badge dot
          Circle()
            .fill(Color.streakExpiringWarning)
            .frame(width: 10, height: 10)

          // Mixed-size streak label — "day" used as compound modifier, grammatical for any N
          (
            Text("\(displayStreak) ")
              .font(.system(size: 22, weight: .bold))
            +
            Text("day streak at risk")
              .font(.system(size: 16, weight: .bold))
          )
          .foregroundColor(.streakExpiringTextPrimary)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        }

        // Countdown — iOS renders natively via timerInterval
        Text(
          timerInterval: Date()...safeEndDate,
          countsDown: true
        )
        .font(.system(size: 52, weight: .black))
        .foregroundColor(.streakExpiringTextPrimary)
        .tracking(-1)
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.6)

        Text("Left to extend your streak")
          .font(.system(size: 15, weight: .semibold))
          .foregroundColor(.streakExpiringTextSecondary)
          .lineLimit(1)
      }
      .padding(.leading, 20)
      .padding(.top, 18)
      .padding(.bottom, 38)
      .padding(.trailing, 121)
    }
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }
}

#endif
