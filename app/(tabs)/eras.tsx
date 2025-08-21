// Eras Tab - Direct era selection screen
// Matches SwiftUI MainTabView Eras tab functionality

import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Image,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { useProgress } from '@/context/ProgressContext'
import ArchivesTheme from '@/constants/ArchivesTheme'

// Era data structure (exact replica of SwiftUI)
interface Era {
  id: string
  title: string
  subtitle: string
  imageName: any
  adventuresCompleted: number
  totalAdventures: number
}

const eras: Era[] = [
  {
    id: '1',
    title: 'Umayyad Dynasty (661–750 CE)',
    subtitle: 'The first Islamic empire, expanding its reach from Damascus',
    imageName: require('@/assets/images/eras/era1-bg.png'),
    adventuresCompleted: 0,
    totalAdventures: 5,
  },
  {
    id: '2',
    title: 'Rise of Islam (570–632 CE)',
    subtitle: 'The life of Prophet Muhammad and the birth of Islam',
    imageName: require('@/assets/images/eras/umayyad-bg.png'),
    adventuresCompleted: 0,
    totalAdventures: 5,
  },
  {
    id: '3',
    title: 'Abbasid Golden Age (750–1258 CE)',
    subtitle: 'An age of science, literature, and innovation centered in Baghdad',
    imageName: require('@/assets/images/eras/era3-bg.png'),
    adventuresCompleted: 0,
    totalAdventures: 3,
  },
]

export default function ErasTab() {
  const [selectedEraIndex, setSelectedEraIndex] = useState(-1)
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const { setSelectedEra } = useProgress()

  // Redirect to landing if not signed in
  React.useEffect(() => {
    if (isSignedIn === false) {
      router.replace('/landing')
    }
  }, [isSignedIn, router])

  const handleContinue = async () => {
    if (selectedEraIndex >= 0) {
      const selectedEra = eras[selectedEraIndex]
      console.log('Selected era:', selectedEra)
      
      // Map era titles to era IDs for the progress context
      const eraIdMap: Record<string, string> = {
        'Umayyad Dynasty (661–750 CE)': 'umayyad',
        'Rise of Islam (570–632 CE)': 'riseOfIslam',
        'Abbasid Golden Age (750–1258 CE)': 'abbasid',
        'Ottoman Empire (1299–1922 CE)': 'ottoman', // Add if needed
        'Fatimid Caliphate (909–1171 CE)': 'fatimid', // Add if needed
      }
      
      const eraId = eraIdMap[selectedEra.title] || 'umayyad' // Default to umayyad
      
      // Store selected era in context
      await setSelectedEra(eraId)
      
      // Navigate to Home tab to see the selected era
      router.push('/(tabs)')
    }
  }

  const handleEraSelect = (index: number) => {
    setSelectedEraIndex(index)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent={false} backgroundColor={ArchivesTheme.colors.creamWhite} />
      <View style={styles.container}>
        {/* Background - CreamWhite */}
        <View style={styles.background} />

        {/* Header Section - Fixed Height 120px */}
        <View style={styles.headerSection}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Choose Your Era</Text>
            <Text style={styles.headerSubtitle}>
              Begin your journey through Middle Eastern history
            </Text>
          </View>
        </View>

        {/* Scrollable Content Section */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {eras.map((era, index) => (
            <EraCard
              key={era.id}
              era={era}
              isSelected={index === selectedEraIndex}
              onSelect={() => handleEraSelect(index)}
            />
          ))}
        </ScrollView>

        {/* Floating Enter Era Button - Overlaid on top */}
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity
            style={[
              styles.enterEraButton,
              selectedEraIndex >= 0 && styles.enterEraButtonActive
            ]}
            onPress={handleContinue}
            disabled={selectedEraIndex < 0}
          >
            <Text style={styles.enterEraButtonText}>ENTER ERA</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

// Era Card Component - Exact replica with 450px height and 4-stop gradient
interface EraCardProps {
  era: Era
  isSelected: boolean
  onSelect: () => void
}

function EraCard({ era, isSelected, onSelect }: EraCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.eraCard,
        isSelected && styles.eraCardSelected
      ]}
      onPress={onSelect}
    >
      {/* Background Image */}
      <Image 
        source={era.imageName} 
        style={styles.eraCardImage}
        onError={(error) => {
        }}
        onLoad={() => {
        }}
      />

      {/* Maximum Contrast Dark Overlay */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0)',      // Completely clear - 0%
          'rgba(0,0,0,0.4)',    // Strong start - 40%
          'rgba(0,0,0,0.8)',    // Very strong - 80%
          'rgba(0,0,0,0.95)',   // Nearly solid black - 95%
        ]}
        locations={[0, 0.24, 0.64, 1.0]}
        style={styles.gradientOverlay}
      />

      {/* Bottom Content Area */}
      <View style={styles.eraCardContent}>
        {/* Title and Subtitle */}
        <View style={styles.eraTextSection}>
          <Text style={styles.eraTitle} numberOfLines={2}>
            {era.title}
          </Text>
          <Text style={styles.eraSubtitle} numberOfLines={3}>
            {era.subtitle}
          </Text>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <Ionicons name="flag" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.progressLabel}>Adventures Completed</Text>
          <View style={styles.progressSpacer} />
          <Text style={styles.progressCount}>
            {era.adventuresCompleted}/{era.totalAdventures}
          </Text>
        </View>

        {/* Selection Indicator */}
        {isSelected && (
          <View style={styles.selectionIndicator}>
            <View style={styles.selectionBadge}>
              <Ionicons 
                name="checkmark-circle" 
                size={16} 
                color={ArchivesTheme.colors.persianOrange} 
              />
              <Text style={styles.selectionText}>Selected</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// EXACT REPLICA STYLES - Pixel-perfect match to SwiftUI
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  // Header Section (exact match - 120px height)
  headerSection: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0, // Remove padding from container
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12, // SwiftUI VStack spacing: 12
    maxWidth: '100%',
  },
  headerTitle: {
    ...ArchivesTheme.typography.h2,
    fontSize: 28,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    paddingHorizontal: 20, // Add padding to title
  },
  headerSubtitle: {
    ...ArchivesTheme.typography.body,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: 20, // Add padding to subtitle (matching SwiftUI)
  },

  // Scrollable Content
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100, // Space for floating button
    gap: 20,
  },

  // Era Card (exact match - 450px height)
  eraCard: {
    height: 450,
    borderRadius: 24,
    overflow: 'hidden',
    // Platform-specific shadow styling
    ...(Platform.OS === 'web' 
      ? { boxShadow: '0 8px 12px rgba(0, 0, 0, 0.15)' }
      : {
          shadowColor: 'black',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }
    ),
  },
  eraCardSelected: {
    borderWidth: 3,
    borderColor: ArchivesTheme.colors.mossGreen,
    // Platform-specific enhanced shadow for selected state
    ...(Platform.OS === 'web' 
      ? { boxShadow: `0 10px 16px rgba(149, 156, 0, 0.3)` }
      : {
          shadowColor: ArchivesTheme.colors.mossGreen,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 12,
        }
    ),
  },
  eraCardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: 450,
    resizeMode: 'cover',
  },

  // 4-Stop Gradient Overlay (extended text readability)
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250, // Extended height for maximum text coverage
  },

  // Era Card Content
  eraCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 32,
  },
  eraTextSection: {
    marginBottom: 16,
  },
  eraTitle: {
    ...ArchivesTheme.typography.bodyLarge,
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    lineHeight: 26,
    // Platform-specific text shadow
    ...(Platform.OS === 'web' 
      ? { textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }
      : {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 3,
        }
    ),
  },
  eraSubtitle: {
    ...ArchivesTheme.typography.body,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    // Platform-specific text shadow
    ...(Platform.OS === 'web' 
      ? { textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }
      : {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 3,
        }
    ),
  },

  // Progress Section
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressLabel: {
    ...ArchivesTheme.typography.bodySmall,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 8,
    // Platform-specific text shadow
    ...(Platform.OS === 'web' 
      ? { textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)' }
      : {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2,
        }
    ),
  },
  progressSpacer: {
    flex: 1,
  },
  progressCount: {
    ...ArchivesTheme.typography.bodySmall,
    fontWeight: 'bold',
    color: 'white',
    // Platform-specific text shadow
    ...(Platform.OS === 'web' 
      ? { textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)' }
      : {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2,
        }
    ),
  },

  // Selection Indicator
  selectionIndicator: {
    alignItems: 'flex-end',
  },
  selectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 145, 81, 0.2)', // PersianOrange with 20% opacity
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  selectionText: {
    ...ArchivesTheme.typography.bodySmall,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.persianOrange,
  },

  // Floating Enter Era Button
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  enterEraButton: {
    width: 280,
    height: 45,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 26.5,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.persianOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterEraButtonActive: {
    backgroundColor: ArchivesTheme.colors.mossGreen,
    // Platform-specific button shadow
    ...(Platform.OS === 'web' 
      ? { boxShadow: `0 5px 10px rgba(149, 156, 0, 0.4)` }
      : {
          shadowColor: ArchivesTheme.colors.mossGreen,
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 8,
        }
    ),
  },
  enterEraButtonText: {
    ...ArchivesTheme.typography.buttonLarge,
    fontSize: 20,
    fontWeight: '600',
    color: ArchivesTheme.colors.creamWhite,
  },
})