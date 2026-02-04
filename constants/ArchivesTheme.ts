// Archives Affinity Labs Theme Constants
// Porting the beautiful color palette and design system from SwiftUI to React Native

export const ArchivesTheme = {
  // Core Color Palette (from SwiftUI Assets)
  colors: {
    // Primary Colors
    shoeBrown: "#4D392E", // Primary brown tone
    persianOrange: "#C99151", // Accent orange
    creamWhite: "#F4EBDB", // Background color
    mutedNavy: "#41425E", // Secondary dark color
    mossGreen: "#959C00", // Primary green
    mossGreenShadow: "#6E7300", // Darker green variant
    concreteGrey: "#E5E5E5", // Light grey for unselected shadows (iOS ConcreteGrey)
    tweedBeige: "#D7C5B6", // Beige for secondary cards

    // Semantic Colors
    primary: "#4D392E", // shoeBrown
    secondary: "#C99151", // persianOrange
    background: "#F4EBDB", // creamWhite
    surface: "#FFFFFF", // White cards/surfaces
    accent: "#C99151", // persianOrange for highlights
    text: "#41425E", // mutedNavy for readable text
    textLight: "#41425E80", // mutedNavy with 50% opacity
    border: "#41425E30", // mutedNavy with 20% opacity
    error: "#D32F2F", // Error red
    success: "#2E7D32", // Success green
    warning: "#F57C00", // Warning orange

    // Gradients
    backgroundGradient: ["#F4EBDB", "#F4EBDB99", "#4D392E1A"], // CreamWhite to ShoeBrown fade
    buttonGradient: ["#C99151", "#B8824A"], // PersianOrange gradient
    cardShadow: "#4D392E20", // ShoeBrown with 12% opacity
  },

  // Typography (matching DM Sans styling from SwiftUI)
  typography: {
    // Headers
    h1: {
      fontSize: 32,
      lineHeight: 40,
      fontFamily: "DM Sans-Bold",
    },
    h2: {
      fontSize: 28,
      lineHeight: 36,
      fontFamily: "DM Sans-Bold",
    },
    h3: {
      fontSize: 24,
      fontWeight: "600" as const,
      lineHeight: 32,
      fontFamily: "DM Sans",
    },

    // Body Text
    bodyLarge: {
      fontSize: 18,
      fontWeight: "600" as const,
      lineHeight: 28,
      fontFamily: "DM Sans",
    },
    body: {
      fontSize: 16,
      fontWeight: "500" as const,
      lineHeight: 24,
      fontFamily: "DM Sans",
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: "500" as const,
      lineHeight: 20,
      fontFamily: "DM Sans",
    },

    // Labels
    labelLarge: {
      fontSize: 16,
      fontWeight: "600" as const,
      lineHeight: 20,
      fontFamily: "DM Sans",
    },
    label: {
      fontSize: 14,
      fontWeight: "600" as const,
      lineHeight: 16,
      fontFamily: "DM Sans",
    },
    labelSmall: {
      fontSize: 12,
      fontWeight: "600" as const,
      lineHeight: 14,
      fontFamily: "DM Sans",
    },

    // Button Text
    buttonLarge: {
      fontSize: 18,
      fontWeight: "700" as const,
      lineHeight: 24,
      fontFamily: "DM Sans",
    },
    button: {
      fontSize: 16,
      fontWeight: "600" as const,
      lineHeight: 20,
      fontFamily: "DM Sans",
    },
  },

  // Spacing (8px base unit)
  spacing: {
    xs: 4, // 0.25 * 16
    sm: 8, // 0.5 * 16
    md: 16, // 1 * 16 (base)
    lg: 24, // 1.5 * 16
    xl: 32, // 2 * 16
    xxl: 40, // 2.5 * 16
    xxxl: 48, // 3 * 16
  },

  // Border Radius
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    pill: 1000, // For pill-shaped buttons
  },

  // Shadows (matching SwiftUI shadow system)
  shadows: {
    small: {
      shadowColor: "#4D392E",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2, // Android
    },
    medium: {
      shadowColor: "#4D392E",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4, // Android
    },
    large: {
      shadowColor: "#C99151",
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8, // Android
    },
  },

  // Component Styles (reusable style objects)
  components: {
    // Card styling (for form containers)
    card: {
      backgroundColor: "#FFFFFF",
      borderRadius: 12,
      padding: 16,
      shadowColor: "#4D392E",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },

    // Input field styling
    input: {
      backgroundColor: "#FFFFFF",
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: "#41425E30",
      fontSize: 16,
      fontWeight: "500" as const,
      color: "#41425E",
    },

    // Primary button styling (matching SwiftUI gradient button)
    primaryButton: {
      backgroundColor: "#C99151",
      borderRadius: 30,
      paddingVertical: 18,
      paddingHorizontal: 24,
      shadowColor: "#C99151",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 8,
    },

    // Secondary button styling (like Google sign-in)
    secondaryButton: {
      backgroundColor: "#FFFFFF",
      borderRadius: 26,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: "#41425E30",
      shadowColor: "#4D392E",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },

    // Toggle card styling (for Sign In/Sign Up selection)
    toggleCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      paddingVertical: 20,
      paddingHorizontal: 16,
      borderWidth: 2,
      borderColor: "transparent",
      shadowColor: "#4D392E",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },

    // Active toggle card (selected state)
    toggleCardActive: {
      borderColor: "#C99151",
      shadowColor: "#C99151",
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
  },

  // Animation timing (matching SwiftUI easing)
  animation: {
    fast: 200,
    medium: 300,
    slow: 500,
    easing: "ease-in-out" as const,
  },

  // Common Component Styles (merged from CommonStyles.ts)
  // Reusable style patterns used across the app
  common: {
    // CARDS
    whiteCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      shadowColor: "rgba(0, 0, 0, 0.05)",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 3,
    },
    achievementCardBase: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginRight: 16,
    },

    // ICON CONTAINERS
    iconContainer: {
      justifyContent: "center" as const,
      alignItems: "center" as const,
      shadowColor: "rgba(0, 0, 0, 0.1)",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 4,
    },
    circularIcon: {
      justifyContent: "center" as const,
      alignItems: "center" as const,
      borderRadius: 999,
    },

    // MODALS
    modalHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 10,
    },
    modalTitle: {
      fontFamily: "DM Sans",
      fontSize: 20,
      fontWeight: "bold" as const,
      lineHeight: 24,
      color: "#41425E", // mutedNavy
      textAlign: "center" as const,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: "rgba(0, 0, 0, 0.1)",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 2,
    },
    closeButtonPlaceholder: {
      width: 44,
      height: 44,
    },

    // SECTIONS
    sectionTitle: {
      fontFamily: "DM Sans",
      fontSize: 18,
      fontWeight: "600" as const,
      color: "#41425E", // mutedNavy
      marginBottom: 16,
    },
    sectionContainer: {
      paddingHorizontal: 20,
      marginBottom: 30,
    },

    // TEXT STYLES
    bodyText: {
      fontFamily: "DM Sans",
      fontSize: 16,
      fontWeight: "500" as const,
      color: "#41425E", // mutedNavy
    },
    labelText: {
      fontFamily: "DM Sans",
      fontSize: 12,
      fontWeight: "600" as const,
      color: "#41425E", // mutedNavy
    },
    subtitleText: {
      fontFamily: "DM Sans",
      fontSize: 14,
      color: "#41425E", // mutedNavy
      opacity: 0.7,
    },

    // PROGRESS BARS
    progressBar: {
      width: "100%" as const,
      height: 4,
      backgroundColor: "#E0E0E0",
      borderRadius: 2,
      overflow: "hidden" as const,
    },
    progressFill: {
      height: "100%" as const,
      borderRadius: 2,
    },

    // LAYOUT HELPERS
    rowBetween: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
    rowCenter: {
      flexDirection: "row" as const,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    columnCenter: {
      flexDirection: "column" as const,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },

    // TODAY SCREEN
    today: {
      // Layout
      container: {
        flex: 1,
        backgroundColor: "#F4EBDB", // creamWhite
      },
      scrollView: {
        flex: 1,
      },
      scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
      },

      // Header Section
      headerTop: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
        paddingTop: 20,
        paddingBottom: 12,
      },
      headerLeft: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
      },
      headerTitle: {
        fontFamily: "DM Sans",
        fontSize: 24,
        fontWeight: "600" as const,
        color: "#41425E", // mutedNavy
        lineHeight: 33, // 110% of 30px
        letterSpacing: 0,
        textAlignVertical: "center" as const,
      },
      divider: {
        width: 2,
        height: 20,
        backgroundColor: "#C99151", // persianOrange
        marginHorizontal: 4,
        alignSelf: "center" as const,
      },
      streakInline: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 3,
      },
      streakText: {
        fontFamily: "DM Sans",
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#C99151", // persianOrange - same as flame icon
        // lineHeight: 14, // 100% of 14px
        letterSpacing: 0.14, // 1% of 14px
        textAlignVertical: "center" as const,
      },
      streakDaysLabel: {
        fontFamily: "DM Sans",
        fontSize: 12,
        fontWeight: "400" as const,
        color: "#C3C3C3", // lighter gray like home screen
      },

      // Calendar
      calendarContainer: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        paddingVertical: 20,
        paddingHorizontal: 16,
        backgroundColor: "#41425E", // mutedNavy
        borderRadius: 16,
        marginBottom: 20,
      },
      calendarDay: {
        alignItems: "center" as const,
        gap: 8,
      },
      calendarDayLabel: {
        fontFamily: "DM Sans",
        fontSize: 12,
        fontWeight: "600" as const,
        color: "#FFFFFF",
        opacity: 0.6,
      },
      calendarDateCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: "transparent",
      },
      calendarDateCircleActive: {
        backgroundColor: "#959C00", // mossGreen for today
      },
      calendarDateText: {
        fontFamily: "DM Sans",
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#FFFFFF",
      },
      calendarDateTextActive: {
        color: "#FFFFFF",
      },

      // Progress Tracker
      progressContainer: {
        marginBottom: 20,
      },
      progressHeader: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
        marginBottom: 8,
      },
      progressLabel: {
        fontFamily: "DM Sans",
        fontSize: 14,
        fontWeight: "700" as const,
        color: "#C99151", // shoeBrown
        // lineHeight: 18, // 100% of 18px
        letterSpacing: 0.18, // 1% of 18px
      },
      progressPercentage: {
        fontFamily: "DM Sans",
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#41425E",
        lineHeight: 18, // 100% of 18px
        letterSpacing: 0.18, // 1% of 18px
      },
      progressBarBackground: {
        height: 5,
        backgroundColor: "#E5DDD3", // dull beige
        borderRadius: 3,
        overflow: "hidden" as const,
      },
      progressBarFill: {
        height: "100%" as const,
        backgroundColor: "#C99151", // persianOrange
        borderRadius: 3,
        shadowColor: "#FFFFFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4.5,
        elevation: 4,
      },

      // Cards (WATCH, EXPLORE, QUESTIONS)
      // WATCH Card - Background image with overlay
      cardWatch: {
        height: 80,
        borderRadius: 15,
        marginBottom: 7,
        overflow: "hidden" as const,
        position: "relative" as const,
      },
      cardWatchExpanded: {
        height: 140,
      },
      cardWatchBackground: {
        position: "absolute" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%" as const,
        height: "100%" as const,
      },
      cardWatchOverlay: {
        position: "absolute" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
      cardWatchContent: {
        flex: 1,
        padding: 16,
        justifyContent: "flex-start" as const,
      },
      cardWatchSubtitle: {
        fontFamily: "DM Sans",
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#FFFFFF",
        // marginTop: -2,
        marginBottom: 12,
        lineHeight: 28, // 159% of 14px
        letterSpacing: 0,
      },
      cardWatchButton: {
        flexDirection: "row" as const,
        backgroundColor: "#959C00", // mossGreen
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 24,
        alignItems: "center" as const,
        alignSelf: "flex-end" as const,
      },
      cardWatchButtonText: {
        fontFamily: "DM Sans",
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#FFFFFF",
        letterSpacing: 0,
        lineHeight: 20,
      },

      // EXPLORE Card - Persian Orange flat card
      cardExplore: {
        backgroundColor: "#C99151", // persianOrange
        padding: 16,
        borderRadius: 15,
        marginBottom: 7,
        minHeight: 61,
      },

      // QUESTIONS Card - Tweed Beige flat card
      cardQuestions: {
        backgroundColor: "#D7C5B6", // tweedBeige
        padding: 16,
        borderRadius: 15,
        marginBottom: 16,
        minHeight: 61,
      },
      cardLocked: {
        opacity: 0.6,
      },
      cardHeader: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
      },
      cardHeaderLeft: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
      },
      cardTitle: {
        fontFamily: "DM Sans",
        fontSize: 14,
        fontWeight: "700" as const,
        color: "#FFFFFF",
        lineHeight: 20,
      },
      cardDuration: {
        fontFamily: "DM Sans",
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#FFFFFF",
        letterSpacing: 0,
        textAlignVertical: "center" as const,
        lineHeight: 20,
      },
      cardSubtitle: {
        fontFamily: "DM Sans",
        fontSize: 14,
        fontWeight: "700" as const,
        color: "#FFFFFF",
        marginTop: 12,
        marginBottom: 12,
        lineHeight: 22,
      },
      cardActionButton: {
        alignSelf: "flex-end" as const,
      },
      cardActionButtonText: {
        fontFamily: "DM Sans",
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#FFFFFF",
        lineHeight: 20,
      },

      // Bottom Button (3D depth effect like quiz button)
      bottomButtonContainer: {
        position: "absolute" as const,
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#F4EBDB", // creamWhite
        alignItems: "center" as const,
      },
      startButtonShadow: {
        position: "absolute" as const,
        width: 340,
        height: 50,
        borderRadius: 16,
        top: 23, // 16px (container padding) + 7px offset = 23px
        backgroundColor: "#6E7300", // mossGreenShadow for 3D depth
      },
      startButton: {
        width: 340,
        height: 50,
        borderRadius: 16,
        backgroundColor: "#959C00", // mossGreen
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      startButtonText: {
        fontFamily: "DM Sans",
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#FFFFFF",
      },

      // WATCH Modal (TodayVideoLesson component)
      watchModalContainer: {
        flex: 1,
        backgroundColor: "#000000", // Black for video player
      },
      watchVideoContainer: {
        position: "absolute" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
      },
      watchTopHeader: {
        position: "absolute" as const,
        right: 16,
        zIndex: 40,
        paddingHorizontal: 16,
        paddingVertical: 12,
      },
      watchProgressContainer: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
        marginBottom: 8,
      },
      watchProgressLabel: {
        fontFamily: "DM Sans",
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#C99151", // persianOrange
      },
      watchProgressPercentage: {
        fontFamily: "DM Sans",
        fontSize: 14,
        fontWeight: "700" as const,
        color: "#C99151", // persianOrange
      },
      watchProgressBar: {
        height: 4,
        backgroundColor: "rgba(255,255,255,0.3)",
        borderRadius: 2,
        overflow: "hidden" as const,
      },
      watchProgressFill: {
        height: "100%" as const,
        backgroundColor: "#C99151", // persianOrange
        borderRadius: 2,
      },
      watchBackButtonContainer: {
        position: "absolute" as const,
        left: 16,
        zIndex: 50,
      },
      watchBackButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(139, 96, 64, 0.1)",
        flexDirection: "row" as const,
        justifyContent: "center" as const,
        alignItems: "center" as const,
      },
      watchCardContainer: {
        position: "absolute" as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 30,
      },
      watchReadingCard: {
        flex: 1,
        backgroundColor: "rgba(77, 57, 46, 0.95)", // shoeBrown with 95% opacity
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
      },
      watchCardHandle: {
        width: 70,
        height: 5,
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        borderRadius: 3,
        alignSelf: "center" as const,
        marginBottom: 16,
      },
      watchExpandedContent: {
        flex: 1,
      },
      watchExpandedScroll: {
        flex: 1,
      },
      watchExpandedContentInner: {
        paddingHorizontal: 20,
        paddingBottom: 16,
      },
      watchTitleSection: {
        marginBottom: 16,
      },
      watchSheetTitle: {
        fontFamily: "DM Sans",
        fontSize: 24,
        fontWeight: "700" as const,
        color: "#FFFFFF",
        marginBottom: 4,
      },
      watchHistoricalSection: {
        marginBottom: 16,
      },
      watchFloatingButtonContainer: {
        position: "absolute" as const,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 30,
        zIndex: 40,
      },
      watchButtonRow: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
        gap: 12,
      },
      watchReadButton: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 26,
        gap: 8,
      },
      watchReadButtonText: {
        fontFamily: "DM Sans",
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#FFFFFF",
      },
      watchContinueButton: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: "#959C00", // mossGreen
        height: 50,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 26,
        gap: 8,
      },
      watchContinueButtonText: {
        fontFamily: "DM Sans",
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#FFFFFF",
      },

      // Scrollable Lesson (Explore)
      scrollableContainer: {
        flex: 1,
        backgroundColor: "#F4EBDB", // creamWhite
      },
      scrollableScrollView: {
        flex: 1,
      },
      scrollableContent: {
        paddingTop: 130,
        paddingBottom: 230, // Extra space for floating buttons
      },
      scrollableMediaSection: {
        marginBottom: 20,
      },
      scrollableMediaContainer: {
        alignItems: "center" as const,
        paddingHorizontal: 20,
      },
      scrollableMedia: {
        width: "100%" as const,
        height: 250,
        borderRadius: 12,
      },
      scrollableTextSection: {
        marginBottom: 20,
      },
      scrollableTextContainer: {
        paddingHorizontal: 20,
      },

      // EXPLORE Modal
      exploreModalContainer: {
        flex: 1,
        backgroundColor: "#F4EBDB", // creamWhite
      },
      exploreHeader: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
      },
      exploreBackButton: {
        padding: 4,
      },
      exploreHeaderTitle: {
        fontFamily: "DM Sans",
        fontSize: 20,
        fontWeight: "700" as const,
        color: "#4D392E", // shoeBrown
        position: "absolute" as const,
        left: 0,
        right: 0,
        textAlign: "center" as const,
        zIndex: -1,
      },
      exploreContent: {
        flex: 1,
      },
      exploreContentInner: {
        paddingBottom: 40,
      },
      exploreHeroContainer: {
        position: "relative" as const,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 20,
        borderRadius: 16,
        overflow: "hidden" as const,
      },
      exploreHeroImage: {
        width: "100%" as const,
        height: 200,
        borderRadius: 16,
      },
      exploreHeroCaption: {
        position: "absolute" as const,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        paddingHorizontal: 16,
        paddingVertical: 12,
      },
      exploreHeroCaptionText: {
        fontFamily: "DM Sans",
        fontSize: 14,
        fontWeight: "500" as const,
        color: "#FFFFFF",
        textAlign: "center" as const,
      },
      exploreVoiceoverButton: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 10,
        marginHorizontal: 20,
        marginBottom: 24,
        paddingVertical: 14,
        backgroundColor: "#6B5B95", // Purple
        borderRadius: 12,
      },
      exploreVoiceoverText: {
        fontFamily: "DM Sans",
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#FFFFFF",
      },
      exploreMainTitle: {
        fontFamily: "DM Sans",
        fontSize: 28,
        fontWeight: "700" as const,
        color: "#4D392E", // shoeBrown
        marginHorizontal: 20,
        marginBottom: 20,
        lineHeight: 36,
      },
      exploreSectionHeader: {
        fontFamily: "DM Sans",
        fontSize: 20,
        fontWeight: "700" as const,
        color: "#C99151", // persianOrange
        marginHorizontal: 20,
        marginBottom: 12,
        marginTop: 8,
      },
      exploreBodyText: {
        fontFamily: "DM Sans",
        fontSize: 16,
        fontWeight: "400" as const,
        color: "#4D392E", // shoeBrown
        lineHeight: 26,
        marginHorizontal: 20,
        marginBottom: 20,
      },
      exploreCompletionBadge: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 8,
        marginHorizontal: 20,
        marginTop: 24,
        marginBottom: 16,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: "#E8F5E9", // Light green background
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#6B7F3D",
      },
      exploreCompletionText: {
        fontFamily: "DM Sans",
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#6B7F3D",
      },
      exploreFooter: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
        backgroundColor: "#F4EBDB", // creamWhite
      },
      exploreNextButton: {
        paddingVertical: 16,
        backgroundColor: "#6B5B95", // Purple
        borderRadius: 26,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
      },
      exploreNextText: {
        fontFamily: "DM Sans",
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#FFFFFF",
      },

      // Legacy styles (keeping for backward compatibility)
      header: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
        paddingVertical: 20,
      },
      section: {
        marginBottom: 24,
      },
      sectionTitle: {
        fontFamily: "DM Sans",
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#4D392E", // shoeBrown
        marginBottom: 12,
      },
      mediaCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        overflow: "hidden" as const,
        shadowColor: "#4D392E",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      },
      mediaImage: {
        width: "100%" as const,
        height: 200,
        backgroundColor: "#E5E5E5",
      },
      mediaContent: {
        padding: 16,
      },
      dateLabel: {
        fontFamily: "DM Sans",
        fontSize: 12,
        fontWeight: "600" as const,
        color: "#C99151", // persianOrange
        marginBottom: 8,
        textTransform: "uppercase" as const,
        letterSpacing: 0.5,
      },
      eventTitle: {
        fontFamily: "DM Sans",
        fontSize: 20,
        fontWeight: "700" as const,
        color: "#4D392E", // shoeBrown
        lineHeight: 26,
      },
      formatToggle: {
        flexDirection: "row" as const,
        gap: 12,
        marginBottom: 16,
      },
      formatButton: {
        flex: 1,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: "#4D392E33", // shoeBrown + 20%
      },
      formatButtonActive: {
        backgroundColor: "#C99151", // persianOrange
        borderColor: "#C99151",
      },
      formatButtonText: {
        fontFamily: "DM Sans",
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#4D392E", // shoeBrown
      },
      formatButtonTextActive: {
        color: "#FFFFFF",
      },
      contentCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        shadowColor: "#4D392E",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      contentText: {
        fontFamily: "DM Sans",
        fontSize: 16,
        fontWeight: "400" as const,
        color: "#4D392E", // shoeBrown
        lineHeight: 24,
      },
      audioPlaceholder: {
        alignItems: "center" as const,
        paddingVertical: 40,
      },
      audioPlaceholderText: {
        fontFamily: "DM Sans",
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#4D392ECC", // shoeBrown + 80%
        marginTop: 12,
      },
      quizCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#4D392E",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      quizQuestion: {
        fontFamily: "DM Sans",
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#4D392E", // shoeBrown
        marginBottom: 16,
        lineHeight: 22,
      },
      optionsContainer: {
        gap: 10,
      },
      optionButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: "#F4EBDB", // creamWhite
        borderWidth: 2,
        borderColor: "#4D392E33", // shoeBrown + 20%
      },
      optionButtonSelected: {
        backgroundColor: "#C9915133", // persianOrange + 20%
        borderColor: "#C99151",
      },
      optionText: {
        fontFamily: "DM Sans",
        fontSize: 14,
        fontWeight: "500" as const,
        color: "#4D392E", // shoeBrown
      },
      optionTextSelected: {
        fontWeight: "600" as const,
        color: "#C99151", // persianOrange
      },
      submitButton: {
        backgroundColor: "#C99151", // persianOrange
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center" as const,
        marginTop: 8,
        shadowColor: "#4D392E",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      },
      submitButtonText: {
        fontFamily: "DM Sans",
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#FFFFFF",
      },
      completedCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 32,
        alignItems: "center" as const,
        shadowColor: "#4D392E",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      completedTitle: {
        fontFamily: "DM Sans",
        fontSize: 20,
        fontWeight: "700" as const,
        color: "#4D392E", // shoeBrown
        marginTop: 12,
        marginBottom: 8,
      },
      completedText: {
        fontFamily: "DM Sans",
        fontSize: 16,
        fontWeight: "500" as const,
        color: "#4D392E", // shoeBrown
        marginBottom: 8,
      },
      completedXP: {
        fontFamily: "DM Sans",
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#C99151", // persianOrange
      },
    },

    // DAILY STORY END SCREEN (DailyStoryEndScreen.tsx)
    // Celebration shown after completing Today's daily quest
    dailyStoryEnd: {
      gradientBackground: {
        flex: 1,
      },
      container: {
        flex: 1,
        backgroundColor: "transparent",
        zIndex: 2000,
        elevation: 2000,
      },
      // Note: closeButton already exists in common.closeButton
      // Use absolute positioning override for top-right placement
      closeButtonTopRight: {
        position: "absolute" as const,
        top: 60, // Will be overridden with SCREEN_HEIGHT calculation in component
        right: 24,
        zIndex: 100,
        elevation: 100,
        width: 44,
        height: 44,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      animationContainer: {
        flex: 1,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        paddingHorizontal: 20,
      },
      riveAnimation: {
        width: "100%" as const, // Will use SCREEN_WIDTH in component
        height: "70%" as const, // Will use SCREEN_HEIGHT * 0.7 in component
        backgroundColor: "transparent",
      },
      messageContainer: {
        position: "absolute" as const,
        bottom: 140, // Will be overridden with SCREEN_HEIGHT calculation in component
        left: 0,
        right: 0,
        paddingHorizontal: 40,
        alignItems: "center" as const,
        zIndex: 25,
        elevation: 25,
      },
      completedText: {
        fontFamily: "DM Sans",
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#C99151", // persianOrange
        textAlign: "center" as const,
        letterSpacing: 0,
        marginBottom: 4,
      },
      heroicText: {
        fontFamily: "DM Sans",
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#C99151", // persianOrange
        textAlign: "center" as const,
        letterSpacing: 0,
      },
      ibuText: {
        fontFamily: "DM Sans",
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#4D392E", // shoeBrown
        letterSpacing: 0,
      },
      // ALL DONE Button - 3D depth effect matching "Start My Day" button
      allDoneButtonContainer: {
        position: "absolute" as const,
        bottom: 50, // Will be overridden with SCREEN_HEIGHT calculation in component
        left: 0, // Will be centered using calculation in component
        width: 340,
        height: 52,
        zIndex: 30,
        elevation: 30,
      },
      allDoneButtonShadow: {
        position: "absolute" as const,
        width: 340,
        height: 52,
        borderRadius: 26,
        top: 3, // 3px offset for 3D depth
        backgroundColor: "#6E7300", // mossGreenShadow
      },
      allDoneButton: {
        width: 340,
        height: 52,
        borderRadius: 26,
        backgroundColor: "#959C00", // mossGreen
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      allDoneButtonText: {
        fontFamily: "DM Sans",
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#FFFFFF",
        letterSpacing: -0.18,
      },
    },
  },
};

// Helper functions for theme usage
export const getColor = (colorName: keyof typeof ArchivesTheme.colors) => {
  return ArchivesTheme.colors[colorName];
};

export const getSpacing = (size: keyof typeof ArchivesTheme.spacing) => {
  return ArchivesTheme.spacing[size];
};

export const getBorderRadius = (
  size: keyof typeof ArchivesTheme.borderRadius,
) => {
  return ArchivesTheme.borderRadius[size];
};

// Export for easy importing
export default ArchivesTheme;
