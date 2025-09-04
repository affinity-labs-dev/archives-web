// UmmayadDynastyEra Component - EXACT replica of SwiftUI UmmayadDynastyEra.swift
// Matches the exact structure: video player + adventure map section with proper headers

import React, { useState, useEffect, useRef } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
  Platform,
  Animated,
} from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useProgress } from '@/context/ProgressContext'
import ArchivesTheme from '@/constants/ArchivesTheme'
import ModuleModal from '@/components/modules/ModuleModal'
import AdventureDetailModal from '@/components/adventures/AdventureDetailModal'
import Adventure1Icon from '@/components/icons/Adventure1Icon'
import Adventure2Icon from '@/components/icons/Adventure2Icon'
import Adventure3Icon from '@/components/icons/Adventure3Icon'

const { width: screenWidth } = Dimensions.get('window')

// Adventure data with Google Material Icons
const UMAYYAD_ADVENTURES = [
  {
    id: 1,
    title: "Damascus - The New Capital",
    headerIcon: "custom", // Custom SVG icon
    iconLibrary: "CustomSVG" as const,
    mapImage: require('@/assets/images/adventure-maps/AdventureMap1.png'),
    iconPositions: [
      { id: "adv1_mod1", x: 0.4, y: 0.22 },
      { id: "adv1_mod2", x: 0.5, y: 0.5 },
      { id: "adv1_mod3", x: 0.40, y: 0.8 }
    ]
  },
  {
    id: 2,
    title: "Abd al-Malik's Reforms",
    headerIcon: "custom", // Custom SVG icon
    iconLibrary: "CustomSVG" as const,
    mapImage: require('@/assets/images/adventure-maps/AdventureMap2.png'),
    iconPositions: [
      { id: "adv2_mod1", x: 0.83, y: 0.3 },
      { id: "adv2_mod2", x: 0.6, y: 0.5 },
      { id: "adv2_mod3", x: 0.30, y: 0.89 }
    ]
  },
  {
    id: 3,
    title: "Westward Expansion",
    headerIcon: "custom", // Custom SVG icon
    iconLibrary: "CustomSVG" as const,
    mapImage: require('@/assets/images/adventure-maps/AdventureMap3.png'),
    iconPositions: [
      { id: "adv3_mod1", x: 0.6, y: 0.23 },
      { id: "adv3_mod2", x: 0.45, y: 0.5 },
      { id: "adv3_mod3", x: 0.33, y: 0.85 }
    ]
  },
]

interface UmmayadDynastyEraProps {
  onBackToEra?: () => void
}

export default function UmmayadDynastyEra({ onBackToEra }: UmmayadDynastyEraProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(true)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null) // EXACT SwiftUI: @State private var selectedModuleID: String? = nil
  const [showModuleModal, setShowModuleModal] = useState(false) // Modal visibility state
  const [selectedAdventureId, setSelectedAdventureId] = useState<number | null>(null) // For adventure detail modal
  const [showAdventureModal, setShowAdventureModal] = useState(false) // Adventure modal visibility state
  
  // Bouncing animation for first module (new user guidance)
  const bounceY = useRef(new Animated.Value(0)).current // Vertical bounce animation
  const [shouldShowBounce, setShouldShowBounce] = useState(false)
  // Create video player with expo-video
  const player = useVideoPlayer(require('@/assets/videos/adventures/UmmayadDynastyintro.mp4'), player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });
  const { 
    getAdventureProgress, 
    isModuleUnlocked,
    getModuleProgress,
    setSelectedEra,
    moduleProgress, // Add direct access to moduleProgress state for re-render triggers
    getModuleStarCount // NEW: Clean star count function
  } = useProgress()


  // Check if we should show the bouncing animation (first module not completed)
  useEffect(() => {
    const firstModuleProgress = getModuleProgress(1, 1) // Adventure 1, Module 1
    const isFirstModuleCompleted = firstModuleProgress?.isCompleted || false
    
    console.log('🎯 First module bounce check:', {
      firstModuleProgress,
      isCompleted: isFirstModuleCompleted,
      shouldShowBounce: !isFirstModuleCompleted
    })
    
    // Only show bounce if first module is not completed
    setShouldShowBounce(!isFirstModuleCompleted)
    
    // Stop bounce animation if module gets completed
    if (isFirstModuleCompleted && shouldShowBounce) {
      console.log('🎯 First module completed - stopping bounce animation')
      setShouldShowBounce(false)
    }
  }, [getModuleProgress, shouldShowBounce])

  // Start bouncing animation when shouldShowBounce is true
  useEffect(() => {
    if (shouldShowBounce) {
      console.log('🎯 Starting real bounce animation for first module guidance')
      
      const bounceSequence = Animated.sequence([
        // Quick upward movement (like jumping up)
        Animated.timing(bounceY, {
          toValue: -15, // Move up 15 pixels
          duration: 400, // Faster upward movement
          useNativeDriver: true,
        }),
        // Slower downward movement (gravity effect)
        Animated.timing(bounceY, {
          toValue: 0, // Return to original position
          duration: 600, // Slower downward movement for realistic physics
          useNativeDriver: true,
        }),
      ])

      const loopAnimation = Animated.loop(bounceSequence, {
        iterations: -1, // Infinite loop
      })

      loopAnimation.start()

      return () => {
        loopAnimation.stop()
      }
    } else {
      // Reset animation when not needed
      bounceY.setValue(0)
    }
  }, [shouldShowBounce, bounceY])

  // Set selected era on mount
  useEffect(() => {
    setSelectedEra('umayyad')
  }, [setSelectedEra])

  // Force component re-render when moduleProgress changes (critical for star updates)
  useEffect(() => {
    // This effect runs whenever moduleProgress changes, forcing icon re-renders
    // No additional logic needed - just having this dependency triggers re-renders
  }, [moduleProgress])

  // Handle video playback based on screen focus - Simple approach
  useFocusEffect(
    React.useCallback(() => {
      // Start playing when screen is focused
      try {
        if (player) {
          player.play();
          setIsVideoPlaying(true);
        }
      } catch (error) {
        console.warn('Failed to play video on focus:', error);
      }

      return () => {
        // Pause when screen loses focus
        try {
          if (player) {
            player.pause();
            setIsVideoPlaying(false);
          }
        } catch (error) {
          console.warn('Failed to pause video on blur:', error);
        }
      };
    }, [player])
  )

  const handleVideoPress = () => {
    try {
      if (player) {
        if (isVideoPlaying) {
          player.pause();
        } else {
          player.play();
        }
        setIsVideoPlaying(!isVideoPlaying);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.warn('Video toggle failed:', error);
    }
  }

  const handleAdventurePress = (adventureId: number) => {
    setSelectedAdventureId(adventureId)
    setShowAdventureModal(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  const handleModulePress = (moduleId: string) => {
    // EXACT SwiftUI: Parse adventure and module IDs + open module modal
    const adventureId = parseInt(moduleId.split('_')[0].replace('adv', ''))
    const modId = parseInt(moduleId.split('_')[1].replace('mod', ''))
    
    
    // Stop bounce animation when first module is tapped (immediate user feedback)
    if (moduleId === 'adv1_mod1' && shouldShowBounce) {
      console.log('🎯 First module tapped - stopping bounce animation')
      setShouldShowBounce(false)
    }
    
    // Check if module is unlocked
    if (!isModuleUnlocked(adventureId, modId)) {
      console.log('🔒 Module is locked')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      return
    }
    
    // Open module modal - EXACT SwiftUI: selectedModuleID = moduleID
    setSelectedModuleId(moduleId)
    setShowModuleModal(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  const renderModuleIcon = (iconPosition: any) => {
    const adventureId = parseInt(iconPosition.id.split('_')[0].replace('adv', ''))
    const moduleId = parseInt(iconPosition.id.split('_')[1].replace('mod', ''))
    const isUnlocked = isModuleUnlocked(adventureId, moduleId)
    const moduleProgress = getModuleProgress(adventureId, moduleId)
    const isCompleted = moduleProgress?.isCompleted || false
    
    // INTENSIVE DEBUG FOR ADV1 MOD3 LOOKUP
    if (adventureId === 1 && moduleId === 3) {
      console.log(`🚨 iconPosition.id:`, iconPosition.id)
      console.log(`🚨 adventureId parsed:`, adventureId)
      console.log(`🚨 moduleId parsed:`, moduleId)
      console.log(`🚨 getModuleProgress(${adventureId}, ${moduleId}) returned:`, JSON.stringify(moduleProgress, null, 2))
      console.log(`🚨 moduleProgress is null/undefined:`, moduleProgress === null || moduleProgress === undefined)
    }
    const isFirstModule = iconPosition.id === 'adv1_mod1'
    const showBounceForThisIcon = isFirstModule && shouldShowBounce && isUnlocked

    // Better positioning calculations
    const mapWidth = screenWidth - 40 // Account for padding
    const mapHeight = 600 // Updated to match new container height
    const iconX = iconPosition.x * mapWidth
    const iconY = iconPosition.y * mapHeight

    
    if (showBounceForThisIcon) {
      console.log('🎯 Rendering first module with bounce animation')
    }

    const IconContainer = showBounceForThisIcon ? Animated.View : View
    const iconContainerStyle = showBounceForThisIcon 
      ? [styles.moduleIconContainer, { transform: [{ translateY: bounceY }] }]
      : styles.moduleIconContainer

    return (
      <TouchableOpacity
        key={iconPosition.id}
        style={[
          styles.moduleIcon,
          {
            left: iconX,
            top: iconY,
          },
        ]}
        onPress={() => handleModulePress(iconPosition.id)}
        disabled={!isUnlocked}
      >
        {/* Era 1 Icon with proper container and shadow - with conditional bounce animation */}
        <IconContainer style={iconContainerStyle}>
          <Image 
            source={isUnlocked 
              ? require('@/assets/images/icons/Era 1 Icon.png')
              : require('@/assets/images/icons/Module locked.png')
            }
            style={styles.moduleIconImage}
            onError={(error) => {
            }}
            onLoad={() => {
            }}
          />
          
          {/* Star rating for quiz performance - NEW CLEAN LOGIC */}
          {moduleProgress?.quizCompleted && (() => {
            // Extract adventure and module IDs from iconPosition.id (e.g., "adv1_mod3")
            const [, adventureStr, moduleStr] = iconPosition.id.match(/adv(\d+)_mod(\d+)/) || []
            const adventureId = parseInt(adventureStr)
            const moduleId = parseInt(moduleStr)
            
            // Use the new clean star count function
            const starCount = getModuleStarCount(adventureId, moduleId)
            
            return (
              <View style={styles.starRating}>
                <Ionicons 
                  name="star"
                  size={22} 
                  color={starCount >= 1 ? "#DFB723" : "#A9A9A9"}
                  style={styles.leftStar}
                />
                <Ionicons 
                  name="star"
                  size={26} 
                  color={starCount >= 2 ? "#DFB723" : "#A9A9A9"}
                  style={styles.middleStar}
                />
                <Ionicons 
                  name="star"
                  size={22} 
                  color={starCount >= 3 ? "#DFB723" : "#A9A9A9"}
                  style={styles.rightStar}
                />
              </View>
            )
          })()}

        </IconContainer>
      </TouchableOpacity>
    )
  }

  const renderAdventureSection = (adventure: any, isFirst: boolean = false) => {
    return (
      <View key={adventure.id} style={styles.adventureSection}>
        {/* Adventure Header - EXACT SwiftUI structure */}
        <TouchableOpacity 
          style={styles.adventureHeader}
          onPress={() => handleAdventurePress(adventure.id)}
        >
          <View style={styles.adventureHeaderContent}>
            <View style={styles.adventureHeaderLeft}>
              <Text style={styles.eraAdventureLabel}>
                ERA 1, ADVENTURE {adventure.id}
              </Text>
              <Text style={styles.adventureTitle}>
                {adventure.title}
              </Text>
            </View>
            
            <View style={styles.adventureHeaderIcon}>
              <View style={styles.iconCircle}>
                {adventure.iconLibrary === "MaterialIcons" ? (
                  <MaterialIcons 
                    name={adventure.headerIcon as any} 
                    size={18} 
                    color="white" 
                  />
                ) : adventure.iconLibrary === "CustomSVG" && adventure.id === 1 ? (
                  <Adventure1Icon 
                    size={24} 
                    color="white" 
                  />
                ) : adventure.iconLibrary === "CustomSVG" && adventure.id === 2 ? (
                  <Adventure2Icon 
                    size={24} 
                    color="white" 
                  />
                ) : adventure.iconLibrary === "CustomSVG" && adventure.id === 3 ? (
                  <Adventure3Icon 
                    size={24} 
                    color="white" 
                  />
                ) : (
                  <Ionicons 
                    name={adventure.headerIcon as any} 
                    size={18} 
                    color="white" 
                  />
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Adventure Map */}
        <View style={styles.adventureMapContainer}>
          <Image 
            source={adventure.mapImage} 
            style={styles.adventureMapImage}
            onError={(error) => {
            }}
            onLoad={() => {
            }}
          />
          
          {/* Black overlay - EXACT SwiftUI: 0.15 opacity */}
          <View style={styles.mapOverlay} />
          
          {/* Module Icons positioned exactly like SwiftUI CGIconPositioner */}
          {adventure.iconPositions.map((iconPosition: any) => renderModuleIcon(iconPosition))}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Background - EXACT SwiftUI: CreamWhite */}
      <View style={styles.background} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.mainContainer}>
          {/* Video Player Section - Always playing, no controls */}
          <View style={styles.videoSection}>
            <VideoView
              player={player}
              style={styles.video}
              contentFit="cover"
              nativeControls={false}
              allowsFullscreen={false}
              allowsPictureInPicture={false}
            />
            
            {/* Dark overlay for better text readability - EXACT SwiftUI */}
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)']}
              start={{x: 0, y: 0}}
              end={{x: 0, y: 1}}
              style={styles.videoOverlay}
            />
            
            {/* Overlay content - EXACT SwiftUI positioning */}
            <View style={styles.dynastyHeader}>
              <Image 
                source={require('@/assets/images/icons/adventures/Umayyad Dynasty Icon.png')}
                style={styles.dynastyIcon}
              />
              <Text style={styles.dynastyTitle}>Umayyad Dynasty</Text>
              <Text style={styles.dynastySubtitle}>661-750 CE</Text>
            </View>
          </View>

          {/* Adventure Map Section - EXACT SwiftUI structure */}
          <View style={styles.adventureMapSection}>
            {UMAYYAD_ADVENTURES.map((adventure, index) => 
              renderAdventureSection(adventure, index === 0)
            )}

            {/* Back to Era Button - EXACT SwiftUI styling */}
            {onBackToEra && (
              <TouchableOpacity style={styles.backToEraButton} onPress={onBackToEra}>
                <Text style={styles.backToEraText}>Back to Eras</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Spacer - EXACT SwiftUI: minLength 50 */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* ModuleModal - EXACT SwiftUI: .fullScreenCover(item: selectedModuleID) */}
      <ModuleModal 
        isVisible={showModuleModal}
        moduleId={selectedModuleId}
        onDismiss={() => {
          setSelectedModuleId(null)
          setShowModuleModal(false)
          // Progress sync will be handled by ModuleModal through ProgressContext
        }}
      />

      {/* AdventureDetailModal - EXACT SwiftUI: .sheet(item: selectedAdventureID) */}
      <AdventureDetailModal
        isVisible={showAdventureModal}
        adventureId={selectedAdventureId}
        onDismiss={() => {
          setSelectedAdventureId(null)
          setShowAdventureModal(false)
        }}
      />
    </SafeAreaView>
  )
}

// Styles matching EXACT SwiftUI UmmayadDynastyEra implementation
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: ArchivesTheme.colors.creamWhite, // EXACT SwiftUI: Color("CreamWhite")
  },
  scrollView: {
    flex: 1,
  },
  mainContainer: {
    // EXACT SwiftUI: VStack(spacing: 40)
  },

  // Video Section - EXACT SwiftUI videoPlayerView
  videoSection: {
    marginHorizontal: 20, // EXACT SwiftUI: .padding(.horizontal, 20)
    marginTop: 60, // EXACT SwiftUI: .padding(.top, 60)
    marginBottom: 40, // VStack spacing: 40
  },
  video: {
    width: '100%',
    height: 200, // EXACT SwiftUI: .frame(height: 200)
    borderRadius: 20, // EXACT SwiftUI: .cornerRadius(20)
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  dynastyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dynastyIcon: {
    width: 80, // EXACT SwiftUI: .frame(width: 80, height: 80)
    height: 80,
    marginBottom: 8, // VStack spacing: 8
  },
  dynastyTitle: {
    fontFamily: 'Cormorant', // EXACT SwiftUI: .font(.custom("Cormorant", size: 30))
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4, // VStack spacing: 4
    textShadowColor: 'rgba(0, 0, 0, 0.8)', // EXACT SwiftUI shadow
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dynastySubtitle: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    fontWeight: '500', // .fontWeight(.medium)
    color: 'rgba(255,255,255,0.9)', // EXACT SwiftUI: .foregroundColor(.white.opacity(0.9))
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Adventure Map Section - EXACT SwiftUI adventureMapSection
  adventureMapSection: {
    // EXACT SwiftUI: VStack(spacing: 16)
  },
  adventureSection: {
    marginBottom: 40, // EXACT SwiftUI: VStack spacing in adventure maps: 40
  },

  // Adventure Header - EXACT SwiftUI structure
  adventureHeader: {
    paddingHorizontal: 20, // EXACT SwiftUI: .padding(.horizontal, 20)
    marginBottom: 16, // EXACT SwiftUI: VStack spacing: 16
  },
  adventureHeaderContent: {
    flexDirection: 'row', // HStack
    alignItems: 'flex-start',
  },
  adventureHeaderLeft: {
    flex: 1,
    // EXACT SwiftUI: VStack(alignment: .leading, spacing: 4)
  },
  eraAdventureLabel: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 12))
    fontSize: 12,
    fontWeight: '500', // .fontWeight(.medium)
    color: ArchivesTheme.colors.persianOrange, // EXACT SwiftUI: .foregroundColor(Color("PersianOrange"))
    letterSpacing: 1.5, // EXACT SwiftUI: .tracking(1.5)
    marginBottom: 4,
  },
  adventureTitle: {
    fontFamily: 'Cormorant', // EXACT SwiftUI: .font(.custom("Cormorant", size: 24))
    fontSize: 24,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy, // EXACT SwiftUI: .foregroundColor(Color("MutedNavy"))
  },
  adventureHeaderIcon: {
    // Spacer() handled by flex: 1 on left side
  },
  iconCircle: {
    width: 40, // EXACT SwiftUI: .frame(width: 40, height: 40)
    height: 40,
    borderRadius: 20,
    backgroundColor: ArchivesTheme.colors.persianOrange, // EXACT SwiftUI: .fill(Color("PersianOrange"))
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Adventure Map Container - EXACT SwiftUI ZStack structure
  adventureMapContainer: {
    height: 600, // Increased from 500 to show even more of the image
    borderRadius: 20, // EXACT SwiftUI: .cornerRadius(20)
    marginHorizontal: 20, // EXACT SwiftUI: .padding(.horizontal, 20)
    overflow: 'hidden', // .clipped()
    position: 'relative',
    backgroundColor: ArchivesTheme.colors.creamWhite, // Fallback background
  },
  adventureMapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover', // EXACT SwiftUI: .aspectRatio(contentMode: .fill)
    backgroundColor: ArchivesTheme.colors.creamWhite, // Fallback while loading
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)', // EXACT SwiftUI: Color.black.opacity(0.15)
    zIndex: 5, // Below icons but above map
  },

  // Module Icons - EXACT SwiftUI CGIconPositioner equivalent
  moduleIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80, // Container size
    height: 80,
    // Center the icon properly - adjust positioning offset
    marginLeft: -40, // Half width to center
    marginTop: -40, // Half height to center
    zIndex: 10, // Ensure icons appear above map overlay
    // Web-specific fix: ensure TouchableOpacity has no default styling
    ...(Platform.OS === 'web' && {
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
    }),
  },
  moduleIconContainer: {
    width: 80, // EXACT SwiftUI: iconSize CGSize(width: 80, height: 80)
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    // EXACT SwiftUI shadow: .shadow(color: Color.black.opacity(0.3), radius: 4, x: 0, y: -2)
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
    backgroundColor: 'transparent', // Ensure transparent background
    // Web-specific fix: disable shadows that might create square boxes
    ...(Platform.OS === 'web' && {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
      boxShadow: 'none',
    }),
  },
  moduleIconImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain', // Maintain aspect ratio
  },
  starRating: {
    position: 'absolute',
    top: -8, // Much closer to module icon (was -15)
    left: 0,
    right: 0,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    position: 'absolute',
  },
  leftStar: {
    position: 'absolute',
    left: 4, // Increased distance from center
    top: 5, // Closer to icon (was 8)
    transform: [{ rotate: '-15deg' }], // Angle to follow curve
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  middleStar: {
    position: 'absolute',
    left: '50%', // Perfectly centered horizontally
    marginLeft: -13, // Half of larger star size (26px) to center it exactly
    top: -3, // Closer to icon (was 0)
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  rightStar: {
    position: 'absolute',
    right: 4, // Increased distance from center
    top: 5, // Closer to icon (was 8)
    transform: [{ rotate: '15deg' }], // Angle to follow curve
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },

  // Back to Era Button - EXACT SwiftUI backToEraButton
  backToEraButton: {
    marginHorizontal: 20, // EXACT SwiftUI: .padding(.horizontal, 20)
    marginTop: 40, // EXACT SwiftUI: .padding(.top, 40)
    backgroundColor: ArchivesTheme.colors.mutedNavy, // EXACT SwiftUI: Color("MutedNavy")
    borderRadius: 30, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 30)
    paddingVertical: 20, // EXACT SwiftUI: .padding(.vertical, 20)
    alignItems: 'center',
    // EXACT SwiftUI shadow: .shadow(color: Color("MutedNavy").opacity(0.3), radius: 12, x: 0, y: 6)
    shadowColor: ArchivesTheme.colors.mutedNavy,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  backToEraText: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    fontWeight: '600', // .fontWeight(.semibold)
    color: 'white', // EXACT SwiftUI: .foregroundColor(.white)
  },

  // Bottom Spacer - EXACT SwiftUI: Spacer(minLength: 50)
  bottomSpacer: {
    height: 50,
  },
})