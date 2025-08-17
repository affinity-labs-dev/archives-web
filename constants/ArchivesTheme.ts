// Archives Affinity Labs Theme Constants
// Porting the beautiful color palette and design system from SwiftUI to React Native

export const ArchivesTheme = {
  // Core Color Palette (from SwiftUI Assets)
  colors: {
    // Primary Colors
    shoeBrown: '#4D392E',        // Primary brown tone
    persianOrange: '#C99151',    // Accent orange
    creamWhite: '#F4EBDB',       // Background color
    mutedNavy: '#41425E',        // Secondary dark color
    mossGreen: '#959C00',        // Primary green
    mossGreenShadow: '#6E7300',  // Darker green variant
    concreteGrey: '#E5E5E5',     // Light grey for unselected shadows (iOS ConcreteGrey)
    
    // Semantic Colors
    primary: '#4D392E',          // shoeBrown
    secondary: '#C99151',        // persianOrange
    background: '#F4EBDB',       // creamWhite
    surface: '#FFFFFF',          // White cards/surfaces
    accent: '#C99151',           // persianOrange for highlights
    text: '#41425E',             // mutedNavy for readable text
    textLight: '#41425E80',      // mutedNavy with 50% opacity
    border: '#41425E30',         // mutedNavy with 20% opacity
    error: '#D32F2F',            // Error red
    success: '#2E7D32',          // Success green
    warning: '#F57C00',          // Warning orange
    
    // Gradients
    backgroundGradient: ['#F4EBDB', '#F4EBDB99', '#4D392E1A'], // CreamWhite to ShoeBrown fade
    buttonGradient: ['#C99151', '#B8824A'],                    // PersianOrange gradient
    cardShadow: '#4D392E20',                                   // ShoeBrown with 12% opacity
  },

  // Typography (matching DM Sans styling from SwiftUI)
  typography: {
    // Headers
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
      fontFamily: 'DM Sans',
    },
    h2: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
      fontFamily: 'DM Sans',
    },
    h3: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
      fontFamily: 'DM Sans',
    },
    
    // Body Text
    bodyLarge: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 28,
      fontFamily: 'DM Sans',
    },
    body: {
      fontSize: 16,
      fontWeight: '500' as const,
      lineHeight: 24,
      fontFamily: 'DM Sans',
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
      fontFamily: 'DM Sans',
    },
    
    // Labels
    labelLarge: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 20,
      fontFamily: 'DM Sans',
    },
    label: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 16,
      fontFamily: 'DM Sans',
    },
    labelSmall: {
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 14,
      fontFamily: 'DM Sans',
    },
    
    // Button Text
    buttonLarge: {
      fontSize: 18,
      fontWeight: '700' as const,
      lineHeight: 24,
      fontFamily: 'DM Sans',
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 20,
      fontFamily: 'DM Sans',
    },
  },

  // Spacing (8px base unit)
  spacing: {
    xs: 4,      // 0.25 * 16
    sm: 8,      // 0.5 * 16
    md: 16,     // 1 * 16 (base)
    lg: 24,     // 1.5 * 16
    xl: 32,     // 2 * 16
    xxl: 40,    // 2.5 * 16
    xxxl: 48,   // 3 * 16
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
      shadowColor: '#4D392E',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2, // Android
    },
    medium: {
      shadowColor: '#4D392E',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4, // Android
    },
    large: {
      shadowColor: '#C99151',
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
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      shadowColor: '#4D392E',
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
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: '#41425E30',
      fontSize: 16,
      fontWeight: '500' as const,
      color: '#41425E',
    },

    // Primary button styling (matching SwiftUI gradient button)
    primaryButton: {
      backgroundColor: '#C99151',
      borderRadius: 30,
      paddingVertical: 18,
      paddingHorizontal: 24,
      shadowColor: '#C99151',
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
      backgroundColor: '#FFFFFF',
      borderRadius: 26,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: '#41425E30',
      shadowColor: '#4D392E',
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
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      paddingVertical: 20,
      paddingHorizontal: 16,
      borderWidth: 2,
      borderColor: 'transparent',
      shadowColor: '#4D392E',
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
      borderColor: '#C99151',
      shadowColor: '#C99151',
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
    easing: 'ease-in-out' as const,
  },
}

// Helper functions for theme usage
export const getColor = (colorName: keyof typeof ArchivesTheme.colors) => {
  return ArchivesTheme.colors[colorName]
}

export const getSpacing = (size: keyof typeof ArchivesTheme.spacing) => {
  return ArchivesTheme.spacing[size]
}

export const getBorderRadius = (size: keyof typeof ArchivesTheme.borderRadius) => {
  return ArchivesTheme.borderRadius[size]
}

// Export for easy importing
export default ArchivesTheme