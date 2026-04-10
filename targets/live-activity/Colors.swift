#if canImport(ActivityKit)
import SwiftUI

// MARK: - Archives color palette for Live Activities
//
// Centralized color constants used across all Live Activity variants.
// Organized by semantic purpose:
//   - Streak Expiring: urgency/warning (maroon + red glow + cream)
//   - Streak Saved:    success/celebration (dark neutral + lime green)
//   - Streak Lost:     past-tense/calm (reuses maroon bg + lavender subtitle)
//   - Dynamic Island:  multi-state UI pills (gray separators + green check)
//   - Archives brand:  primary brand palette (reused by DailyStoryActivity)
//
// # Future work
//
// ## Dark / Light mode adaptation (LOW-2)
// All colors are currently fixed RGB values. Live Activities render on the lock
// screen which is typically dark-themed, so this works in practice. For adaptive
// colors that respond to system appearance, switch to:
//   `Color(UIColor { trait in trait.userInterfaceStyle == .dark ? ... : ... })`
// Not critical for Phase 0 since Figma designs assume dark lock screen context.
//
// ## Localization (LOW-4)
// All text strings in views are hardcoded English ("Streak saved!", "day streak
// at risk", etc.). Future i18n work should:
//   1. Create Localizable.strings in this directory with all user-facing keys
//   2. Replace Text("...") literals with Text(LocalizedStringResource(...))
//   3. Use Swift's automatic grammar inflection via ^[\(n) day](inflect: true)
//      for proper plural handling across languages (Russian has 3 forms, etc.)
//   4. Add locale-specific mascot variants if culturally sensitive
// Not critical for Phase 0 — English-only ship is acceptable.

extension Color {
  // MARK: Streak Expiring palette (from Figma 2481:3902)
  // Urgency theme — warm reds, maroon background, red glow gradient.

  /// Streak expiring background — deep maroon — #470F0A
  static let streakExpiringBackground = Color(red: 71/255, green: 15/255, blue: 10/255)
  /// Red glow overlay (top of gradient) — #99140A
  static let streakExpiringGlowTop = Color(red: 153/255, green: 20/255, blue: 10/255)
  /// Warning badge dot (small red circle next to flame) — #E6402E
  static let streakExpiringWarning = Color(red: 230/255, green: 64/255, blue: 46/255)
  /// Primary cream text (strong contrast on maroon) — #FFF5ED
  static let streakExpiringTextPrimary = Color(red: 255/255, green: 245/255, blue: 237/255)
  /// Secondary muted tan text (less emphasis for supporting copy) — #BF998C
  static let streakExpiringTextSecondary = Color(red: 191/255, green: 153/255, blue: 140/255)

  // MARK: Streak Saved palette (from Figma 2773:4522)
  // Success state — neutral dark background, no urgency.

  /// Success banner background — flat dark gray (no gradient) — #1A1A1A
  static let streakSavedBackground = Color(red: 26/255, green: 26/255, blue: 26/255)
  /// Success streak count — lime-green celebratory accent — #B2E965
  static let streakSavedGreen = Color(red: 178/255, green: 233/255, blue: 101/255)

  // MARK: Streak Lost palette (from Figma 2764:4517)
  // Failed state — reuses maroon background (no glow), adds soft lavender subtitle.

  /// Lost banner CTA subtitle — soft lavender — #D6BBFF
  static let streakLostSubtitle = Color(red: 214/255, green: 187/255, blue: 255/255)

  // MARK: Dynamic Island palette (from Figma 2752:4520)
  // Used inside the system-controlled black pill — distinct from lock screen themes.

  /// Completed card checkmark (Material design green) — #34A853
  static let dynIslandCheckGreen = Color(red: 52/255, green: 168/255, blue: 83/255)
  /// Incomplete card label + circle — neutral mid-gray — #808080
  static let dynIslandMutedGray = Color(red: 128/255, green: 128/255, blue: 128/255)
  /// Horizontal separator between rows — darker gray — #404040
  static let dynIslandSeparator = Color(red: 64/255, green: 64/255, blue: 64/255)
  /// Caption text (era title) — #8C8C8C
  static let dynIslandCaptionGray = Color(red: 140/255, green: 140/255, blue: 140/255)

  // MARK: Archives brand palette (reused by DailyStoryLiveActivity)
  // Main app brand tokens — mirrors constants/ArchivesTheme.ts.

  /// Primary brand brown — #4D392E
  static let archivesShoeBrown = Color(red: 77/255, green: 57/255, blue: 46/255)
  /// Accent orange — #C99151
  static let archivesPersianOrange = Color(red: 201/255, green: 145/255, blue: 81/255)
  /// Light cream background — #F4EBDB
  static let archivesCreamWhite = Color(red: 244/255, green: 235/255, blue: 219/255)
}

#endif
