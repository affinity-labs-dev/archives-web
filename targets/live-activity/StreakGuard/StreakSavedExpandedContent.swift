#if canImport(ActivityKit)
import SwiftUI

// MARK: - StreakSavedExpandedContent
// Dynamic Island expanded view for .saved state — celebration variant.
// Same visual language as StreakSavedBanner but typography scaled for expanded region.

@available(iOS 16.2, *)
struct StreakSavedExpandedContent: View {
  let currentStreak: Int

  // MARK: Defensive guards
  /// Guarantees streak count is at least 1 for display purposes.
  private var displayStreak: Int { max(1, currentStreak) }
  /// Grammatical unit — "day" for 1, "days" otherwise.
  private var dayUnit: String { displayStreak == 1 ? "day" : "days" }

  var body: some View {
    ZStack(alignment: .topLeading) {
      // Celebration mascot on right (system-controlled background behind it)
      HStack {
        Spacer()
        Image("CelebrationMascot")
          .resizable()
          .aspectRatio(contentMode: .fit)
          .frame(width: 100, height: 91)
      }

      // Text content
      VStack(alignment: .leading, spacing: 4) {
        Text("🔥 Streak saved!")
          .font(.system(size: 14, weight: .bold))
          .foregroundColor(.white)
          .lineLimit(1)

        Text("\(displayStreak) \(dayUnit)")
          .font(.system(size: 22, weight: .bold))
          .foregroundColor(.streakSavedGreen)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
      }
      .padding(16)
      .frame(maxWidth: .infinity, alignment: .topLeading)
    }
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }
}

#endif
