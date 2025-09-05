// Exact replica of Archives Affinity Labs SwiftUI EraSelection
// Pixel-perfect conversion with immersive era cards and selection states

import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { useProgress } from '@/context/ProgressContext'
import ArchivesTheme from '@/constants/ArchivesTheme'

// const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

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
    imageName: require('@/assets/images/eras/era1-bg.jpg'),
    adventuresCompleted: 0,
    totalAdventures: 5,
  },
  {
    id: '2',
    title: 'Rise of Islam (570–632 CE)',
    subtitle: 'The life of Prophet Muhammad and the birth of Islam',
    imageName: require('@/assets/images/eras/era2-bg.jpg'),
    adventuresCompleted: 0,
    totalAdventures: 5,
  },
  {
    id: '3',
    title: 'Abbasid Golden Age (750–1258 CE)',
    subtitle: 'An age of science, literature, and innovation centered in Baghdad',
    imageName: require('@/assets/images/eras/era3-bg.jpg'),
    adventuresCompleted: 0,
    totalAdventures: 3,
  },
  {
    id: '4',
    title: 'Rashidun Caliphate (632-661 CE)',
    subtitle: 'The first four caliphs who succeeded Prophet Muhammad',
    imageName: require('@/assets/images/eras/era4-bg.jpg'),
    adventuresCompleted: 0,
    totalAdventures: 4,
  },
  {
    id: '5',
    title: 'Al-Andalus (711-1492 CE)',
    subtitle: 'Islamic civilization in medieval Iberian Peninsula',
    imageName: require('@/assets/images/eras/era5-bg.jpg'),
    adventuresCompleted: 0,
    totalAdventures: 4,
  },
  {
    id: '6',
    title: 'Women of Islam',
    subtitle: 'Influential women throughout Islamic history',
    imageName: require('@/assets/images/eras/era6-bg.jpg'),
    adventuresCompleted: 0,
    totalAdventures: 5,
  },
  {
    id: '7',
    title: 'Prophets Series',
    subtitle: 'Stories and teachings of the Islamic prophets',
    imageName: require('@/assets/images/eras/era7-bg.jpg'),
    adventuresCompleted: 0,
    totalAdventures: 3,
  },
  {
    id: '8',
    title: 'Mongol Invasions (1219–1312 CE)',
    subtitle: 'The Mongol conquests and their impact on Islamic lands',
    imageName: require('@/assets/images/eras/era8-bg.jpg'),
    adventuresCompleted: 0,
    totalAdventures: 6,
  },
]

export default function EraSelection() {
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

  // const handleBack = () => {
  //   router.back()
  // }

  const handleContinue = async () => {
    if (selectedEraIndex === 0) {
      const selectedEra = eras[selectedEraIndex]
      console.log('Selected era:', selectedEra)
      
      // Map era titles to era IDs for the progress context
      const eraIdMap: Record<string, string> = {
        'Umayyad Dynasty (661–750 CE)': 'umayyad',
        'Rise of Islam (570–632 CE)': 'riseOfIslam',
        'Abbasid Golden Age (750–1258 CE)': 'abbasid',
        'Rashidun Caliphate (632-661 CE)': 'rashidun',
        'Al-Andalus (711-1492 CE)': 'andalus',
        'Women of Islam': 'womenOfIslam',
        'Prophets Series': 'prophets',
        'Mongol Invasions (1219–1312 CE)': 'mongol',
      }
      
      const eraId = eraIdMap[selectedEra.title] || 'umayyad' // Default to umayyad
      
      // Store selected era in context
      await setSelectedEra(eraId)
      
      // Navigate to main tabs
      router.replace('/(tabs)')
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
          {/* Era 1 - Horizontal */}
          <HorizontalEraCard
            era={eras[0]}
            isSelected={0 === selectedEraIndex}
            onSelect={() => handleEraSelect(0)}
            showLock={false}
          />

          {/* Eras Coming Soon Text */}
          <Text style={styles.comingSoonText}>Eras Coming Soon...</Text>

          {/* Eras 2-3 - 2x2 Grid */}
          <View style={[styles.gridContainer, styles.gridContainerAfterText]}>
            <View style={styles.gridRow}>
              <GridEraCard
                era={eras[1]}
                isSelected={1 === selectedEraIndex}
                onSelect={() => handleEraSelect(1)}
                showLock={true}
              />
              <GridEraCard
                era={eras[2]}
                isSelected={2 === selectedEraIndex}
                onSelect={() => handleEraSelect(2)}
                showLock={true}
              />
            </View>
          </View>

          {/* Era 4 - Horizontal */}
          <HorizontalEraCard
            era={eras[3]}
            isSelected={3 === selectedEraIndex}
            onSelect={() => handleEraSelect(3)}
            showLock={true}
          />

          {/* Eras 5-6 - 2x2 Grid */}
          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              <GridEraCard
                era={eras[4]}
                isSelected={4 === selectedEraIndex}
                onSelect={() => handleEraSelect(4)}
                showLock={true}
              />
              <GridEraCard
                era={eras[5]}
                isSelected={5 === selectedEraIndex}
                onSelect={() => handleEraSelect(5)}
                showLock={true}
              />
            </View>
          </View>

          {/* Eras 7-8 - 2x2 Grid (partial) */}
          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              <GridEraCard
                era={eras[6]}
                isSelected={6 === selectedEraIndex}
                onSelect={() => handleEraSelect(6)}
                showLock={true}
              />
              <GridEraCard
                era={eras[7]}
                isSelected={7 === selectedEraIndex}
                onSelect={() => handleEraSelect(7)}
                showLock={true}
              />
            </View>
          </View>
        </ScrollView>

        {/* Floating Enter Era Button - Overlaid on top */}
        <View style={styles.floatingButtonContainer}>
          <Pressable
            style={[
              styles.enterEraButton,
              selectedEraIndex === 0 && styles.enterEraButtonActive
            ]}
            onPress={handleContinue}
            disabled={selectedEraIndex !== 0}
          >
            <Text style={styles.enterEraButtonText}>ENTER ERA</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

// Horizontal Era Card Component - Full width
interface HorizontalEraCardProps {
  era: Era
  isSelected: boolean
  onSelect: () => void
  showLock?: boolean
}

function HorizontalEraCard({ era, isSelected, onSelect, showLock = false }: HorizontalEraCardProps) {
  return (
    <Pressable
      style={[
        styles.horizontalEraCard,
        isSelected && !showLock && styles.horizontalEraCardSelected,
        showLock && styles.horizontalEraCardNoEffects
      ]}
      onPress={onSelect}
    >
      {/* Background Image */}
      <Image 
        source={era.imageName} 
        style={styles.horizontalEraCardImage}
      />

      {/* Maximum Contrast Dark Overlay - Only for unlocked */}
      {!showLock && (
        <LinearGradient
          colors={[
            'rgba(0,0,0,0)',      // Completely clear - 0%
            'rgba(0,0,0,0.3)',    // Light start - 30%
            'rgba(0,0,0,0.6)',    // Medium - 60%
            'rgba(0,0,0,0.8)',    // Bottom - 80%
          ]}
          locations={[0, 0.24, 0.64, 1.0]}
          style={styles.horizontalGradientOverlay}
        />
      )}

      {/* Simple Lock Overlay */}
      {showLock && (
        <View style={styles.simpleLockOverlay}>
          <MaterialIcons name="lock" size={28} color="white" />
        </View>
      )}

      {/* Bottom Content Area */}
      <View style={styles.horizontalEraCardContent}>
        {/* Title */}
        <View style={styles.horizontalEraTextSection}>
          <Text style={[
            styles.horizontalEraTitle,
            showLock && styles.horizontalEraTitleNoEffects
          ]} numberOfLines={2}>
            {era.title}
          </Text>
        </View>

      </View>

      {/* Selected Indicator - Top Right */}
      {isSelected && !showLock && (
        <View style={styles.selectedIndicatorTopRight}>
          <MaterialIcons name="check-circle" size={14} color="white" />
          <Text style={styles.selectedText}>Selected</Text>
        </View>
      )}
    </Pressable>
  )
}

// Grid Era Card Component - Smaller for 2x2 layout
interface GridEraCardProps {
  era: Era
  isSelected: boolean
  onSelect: () => void
  showLock?: boolean
}

function GridEraCard({ era, isSelected, onSelect, showLock = false }: GridEraCardProps) {
  return (
    <Pressable
      style={[
        styles.gridEraCard,
        isSelected && !showLock && styles.gridEraCardSelected,
        showLock && styles.gridEraCardNoEffects
      ]}
      onPress={onSelect}
    >
      {/* Background Image */}
      <Image 
        source={era.imageName} 
        style={styles.gridEraCardImage}
      />

      {/* Maximum Contrast Dark Overlay - Only for unlocked */}
      {!showLock && (
        <LinearGradient
          colors={[
            'rgba(0,0,0,0)',      // Completely clear - 0%
            'rgba(0,0,0,0.4)',    // Strong start - 40%
            'rgba(0,0,0,0.8)',    // Very strong - 80%
            'rgba(0,0,0,0.95)',   // Nearly solid black - 95%
          ]}
          locations={[0, 0.24, 0.64, 1.0]}
          style={styles.gridGradientOverlay}
        />
      )}

      {/* Simple Lock Overlay */}
      {showLock && (
        <View style={styles.gridSimpleLockOverlay}>
          <MaterialIcons name="lock" size={24} color="white" />
        </View>
      )}

      {/* Bottom Content Area */}
      <View style={styles.gridEraCardContent}>
        {/* Title */}
        <View style={styles.gridEraTextSection}>
          <Text style={[
            styles.gridEraTitle,
            showLock && styles.gridEraTitleNoEffects
          ]} numberOfLines={2}>
            {era.title}
          </Text>
        </View>

      </View>
    </Pressable>
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
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  headerTitle: {
    ...ArchivesTheme.typography.h2,
    fontSize: 28,
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'left',
    paddingLeft: 25,
    paddingRight: 20,
    paddingTop: 10,
  },
  headerSubtitle: {
    ...ArchivesTheme.typography.body,
    fontWeight: '600',
    color: ArchivesTheme.colors.persianOrange,
    textAlign: 'left',
    paddingLeft: 25,
    paddingRight: 20,
  },

  // Scrollable Content
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 100, // Space for floating button
    gap: 15,
  },

  // Grid Container
  gridContainer: {
    marginVertical: 5,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  // Horizontal Era Card (full width)
  horizontalEraCard: {
    height: 250,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  horizontalEraCardSelected: {
    borderWidth: 3,
    borderColor: ArchivesTheme.colors.mossGreen,
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  
  horizontalEraCardNoEffects: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  horizontalEraCardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  horizontalGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  horizontalEraCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
  },
  horizontalEraTextSection: {
    marginBottom: 8,
  },
  horizontalEraTitle: {
    ...ArchivesTheme.typography.bodyLarge,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'DM Sans',
    color: 'white',
    marginBottom: 0,
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  
  horizontalEraTitleNoEffects: {
    textShadowColor: 'transparent',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 0,
  },
  

  // Grid Era Card (2x2 layout)
  gridEraCard: {
    width: '48%', // Two cards per row with some spacing
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  gridEraCardSelected: {
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.mossGreen,
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  
  gridEraCardNoEffects: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  gridEraCardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  gridGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  gridEraCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    paddingBottom: 16,
  },
  gridEraTextSection: {
    marginBottom: 8,
  },
  gridEraTitle: {
    ...ArchivesTheme.typography.body,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'DM Sans',
    color: 'white',
    marginBottom: 0,
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  
  gridEraTitleNoEffects: {
    textShadowColor: 'transparent',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 0,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 26.5,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.persianOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterEraButtonActive: {
    backgroundColor: ArchivesTheme.colors.mossGreen,
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  enterEraButtonText: {
    ...ArchivesTheme.typography.buttonLarge,
    fontSize: 20,
    fontWeight: '600',
    color: ArchivesTheme.colors.creamWhite,
  },

  // Coming Soon Text
  comingSoonText: {
    ...ArchivesTheme.typography.h2,
    fontSize: 20,
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'left',
    paddingLeft: 5,
    paddingRight: 20,
    paddingTop: 10,
    marginBottom: -5,
  },
  
  // Grid container after text
  gridContainerAfterText: {
    marginTop: -10,
  },

  // Simple Lock Overlay Styles
  simpleLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 24,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingLeft: 16,
  },
  
  gridSimpleLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 18,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingLeft: 12,
  },

  // Selected Indicator Styles - Top Right
  selectedIndicatorTopRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ArchivesTheme.colors.mossGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  
  selectedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'DM Sans',
    marginLeft: 3,
  },
})