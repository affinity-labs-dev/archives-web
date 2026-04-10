#if canImport(ActivityKit)
import SwiftUI

// MARK: - StreakLostExpandedContent
// Dynamic Island expanded view for .failed state.
// Same visual language as StreakLostBanner but typography scaled for expanded region.

@available(iOS 16.2, *)
struct StreakLostExpandedContent: View {
  let currentStreak: Int

  // MARK: Defensive guards
  /// Guarantees streak count is at least 1 for display purposes.
  private var displayStreak: Int { max(1, currentStreak) }

  var body: some View {
    ZStack(alignment: .topLeading) {
      // Sad mascot on right (system-controlled background behind it)
      HStack {
        Spacer()
        Image("SadMascot")
          .resizable()
          .aspectRatio(contentMode: .fit)
          .frame(width: 67, height: 57)
      }

      // Text content
      VStack(alignment: .leading, spacing: 4) {
        Text("Your \(displayStreak)-day streak has ended")
          .font(.system(size: 14, weight: .bold))
          .foregroundColor(.streakExpiringTextPrimary)
          .lineLimit(1)
          .minimumScaleFactor(0.7)

        Text("Start a new streak today")
          .font(.system(size: 12, weight: .medium))
          .foregroundColor(.streakLostSubtitle)
          .lineLimit(1)
      }
      .padding(16)
      .frame(maxWidth: .infinity, alignment: .topLeading)
    }
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }
}

#endif
