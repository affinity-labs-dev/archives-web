#if canImport(ActivityKit)
import SwiftUI

// MARK: - CardStatusPill
// Small reusable view for WATCH / EXPLORE / QUESTIONS status display in DailyStory
// Dynamic Island expanded view.
//
// Completed → white label + green ✓
// Incomplete → gray label + gray ○

@available(iOS 16.2, *)
struct CardStatusPill: View {
  let label: String
  let completed: Bool

  var body: some View {
    HStack(spacing: 4) {
      Text(label)
        .font(.system(size: 11, weight: .semibold))
        .tracking(0.55)
        .foregroundColor(completed ? .white : .dynIslandMutedGray)
      Text(completed ? "✓" : "○")
        .font(.system(size: 13, weight: .bold))
        .foregroundColor(completed ? .dynIslandCheckGreen : .dynIslandMutedGray)
    }
  }
}

#endif
