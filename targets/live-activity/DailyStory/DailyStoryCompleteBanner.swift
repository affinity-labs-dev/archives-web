#if canImport(ActivityKit)
import SwiftUI

// MARK: - DailyStoryCompleteBanner
// Lock screen banner for the .completed state (Figma 2764:4522).
// "Quest Complete!" + "+30 XP" gold, full progress bar, all cards checked green,
// celebration mascot (pom-poms) bottom-right.

@available(iOS 16.2, *)
struct DailyStoryCompleteBanner: View {
  let xpEarned: Int
  let dayNumber: Int
  let totalDays: Int
  let eraTitle: String

  var body: some View {
    ZStack(alignment: .topLeading) {
      // Layer 1: Dark background
      Color.dailyStoryBackground

      // Layer 2: Celebration mascot, bottom-right.
      // Width reduced from 92pt → 75pt to match DailyStoryBanner and prevent
      // "QUESTIONS" pill from wrapping on small devices (iPhone SE/mini).
      VStack {
        Spacer()
        HStack {
          Spacer()
          Image("CelebrationMascot")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: 75, height: 74)
        }
      }

      // Layer 3: Content — 4 rows
      VStack(alignment: .leading, spacing: 10) {
        // Row 1: "Quest Complete!" + "+XP", justify-between across full banner width.
        // Negative trailing cancels 85 of the parent's 105-pt trailing, leaving 20pt from
        // the banner's right edge (symmetrical with the 20pt leading). Same pattern as
        // DailyStoryBanner Row 1 so the XP badge pins to the right edge, not the mascot edge.
        HStack {
          Text("Quest Complete!")
            .font(.system(size: 17, weight: .bold))
            .foregroundColor(.white)
            .lineLimit(1)
          Spacer()
          Text("+\(xpEarned) XP")
            .font(.system(size: 15, weight: .bold))
            .foregroundColor(.dailyStoryTimerGold)
        }

        // Row 2: Progress bar — 100% filled
        RoundedRectangle(cornerRadius: 3)
          .fill(Color.dailyStoryProgressFill)
          .frame(height: 6)

        // Row 3: All cards completed (all green)
        // `minimumScaleFactor(0.85)` on each pill auto-scales "QUESTIONS"
        // so it doesn't wrap on small devices.
        HStack(spacing: 25) {
          DailyStoryCompletePill(icon: "Watch")
          DailyStoryCompletePill(icon: "Explore")
          DailyStoryCompletePill(icon: "Questions")
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
      .padding(.trailing, 78)
    }
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }
}

// MARK: - DailyStoryCompletePill
// All-green pill for completed state — green ✓ + 18×18 icon.

@available(iOS 16.2, *)
private struct DailyStoryCompletePill: View {
  let icon: String

  var body: some View {
    HStack(spacing: 5) {
      Text("✓")
        .font(.system(size: 14, weight: .bold))
        .foregroundColor(.dynIslandCheckGreen)
      Image(icon)
        .resizable()
        .aspectRatio(contentMode: .fit)
        .frame(width: 18, height: 18)
    }
  }
}

#endif
