#if canImport(ActivityKit)
import SwiftUI

// MARK: - StreakSavedBanner
// Lock screen banner for the .saved state (Figma 2773:4522).
// Flat dark gray background, celebratory mascot with pom-poms, "N days" in lime green.

@available(iOS 16.2, *)
struct StreakSavedBanner: View {
  let currentStreak: Int

  // MARK: Defensive guards
  /// Guarantees streak count is at least 1 for display purposes.
  private var displayStreak: Int { max(1, currentStreak) }
  /// Grammatical unit — "day" for 1, "days" for all others (including 0, plural default).
  private var dayUnit: String { displayStreak == 1 ? "day" : "days" }

  var body: some View {
    ZStack(alignment: .topLeading) {
      // Layer 1: Flat dark gray background (no gradient — calm success tone)
      Color.streakSavedBackground

      // Layer 2: Celebration mascot (pom-poms), right-aligned
      HStack {
        Spacer()
        Image("CelebrationMascot")
          .resizable()
          .aspectRatio(contentMode: .fit)
          .frame(width: 129, height: 117)
      }

      // Layer 3: Text content, left-aligned
      VStack(alignment: .leading, spacing: 6) {
        Text("🔥 Streak saved!")
          .font(.system(size: 17, weight: .bold))
          .foregroundColor(.white)
          .lineLimit(1)

        Text("\(displayStreak) \(dayUnit)")
          .font(.system(size: 27, weight: .bold))
          .foregroundColor(.streakSavedGreen)
          .lineLimit(1)
          .minimumScaleFactor(0.6)

        Text("Keep it going \u{2014} complete today\u{2019}s quest")
          .font(.system(size: 13, weight: .medium))
          .foregroundColor(.white.opacity(0.7))
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      .padding(.leading, 20)
      .padding(.top, 18)
      .padding(.bottom, 18)
      .padding(.trailing, 110)
    }
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }
}

#endif
