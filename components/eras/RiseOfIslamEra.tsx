// RiseOfIslamEra Component - EXACT replica of SwiftUI pattern adapted for Rise of Islam
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
  StatusBar,
} from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useProgress } from '@/context/ProgressContext'
import ArchivesTheme from '@/constants/ArchivesTheme'
import ModuleModal from '@/components/modules/ModuleModal'
import AdventureDetailModal from '@/components/adventures/AdventureDetailModal'
import Adventure6Icon from '@/components/icons/Adventure6Icon'
import Adventure7Icon from '@/components/icons/Adventure7Icon'
import Adventure8Icon from '@/components/icons/Adventure8Icon'
import Adventure9Icon from '@/components/icons/Adventure9Icon'
import Adventure10Icon from '@/components/icons/Adventure10Icon'

const { width: screenWidth } = Dimensions.get('window')

// Adventure data for Rise of Islam era
const RISE_OF_ISLAM_ADVENTURES = [
  {
    id: 6,
    title: "The Early Years",
    headerIcon: "custom", // Custom SVG icon
    iconLibrary: "CustomSVG" as const,
    mapImage: require('@/assets/images/adventure-maps/ROIADVMAP1.jpg'),
    iconPositions: [
      { id: "adv6_mod1", x: 0.4, y: 0.22 },
      { id: "adv6_mod2", x: 0.5, y: 0.5 },
      { id: "adv6_mod3", x: 0.40, y: 0.8 }
    ]
  },
  {
    id: 7,
    title: "First Revelations",
    headerIcon: "custom", // Custom SVG icon
    iconLibrary: "CustomSVG" as const,
    mapImage: require('@/assets/images/adventure-maps/ROIADVMAP2.jpg'),
    iconPositions: [
      { id: "adv7_mod1", x: 0.83, y: 0.3 },
      { id: "adv7_mod2", x: 0.6, y: 0.5 },
      { id: "adv7_mod3", x: 0.30, y: 0.89 }
    ]
  },
  {
    id: 8,
    title: "The Hijra",
    headerIcon: "custom", // Custom SVG icon
    iconLibrary: "CustomSVG" as const,
    mapImage: require('@/assets/images/adventure-maps/ROIADVMAP3.jpg'),
    iconPositions: [
      { id: "adv8_mod1", x: 0.6, y: 0.23 },
      { id: "adv8_mod2", x: 0.45, y: 0.5 },
      { id: "adv8_mod3", x: 0.33, y: 0.85 }
    ]
  },
  {
    id: 9,
    title: "Building the Community",
    headerIcon: "custom", // Custom SVG icon
    iconLibrary: "CustomSVG" as const,
    mapImage: require('@/assets/images/adventure-maps/ROIADVMAP4.jpg'),
    iconPositions: [
      { id: "adv9_mod1", x: 0.5, y: 0.3 },
      { id: "adv9_mod2", x: 0.6, y: 0.6 },
      { id: "adv9_mod3", x: 0.4, y: 0.8 }
    ]
  },
  {
    id: 10,
    title: "The Final Years",
    headerIcon: "custom", // Custom SVG icon
    iconLibrary: "CustomSVG" as const,
    mapImage: require('@/assets/images/adventure-maps/ROIADVMAP5.jpg'),
    iconPositions: [
      { id: "adv10_mod1", x: 0.45, y: 0.25 },
      { id: "adv10_mod2", x: 0.55, y: 0.55 },
      { id: "adv10_mod3", x: 0.35, y: 0.75 }
    ]
  },
]

interface RiseOfIslamEraProps {
  onBackToEra?: () => void
}

export default function RiseOfIslamEra({ onBackToEra }: RiseOfIslamEraProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(true)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [selectedAdventureId, setSelectedAdventureId] = useState<number | null>(null)
  const [showAdventureModal, setShowAdventureModal] = useState(false)

  // Bouncing animation for first module (new user guidance)
  const bounceY = useRef(new Animated.Value(0)).current
  const [shouldShowBounce, setShouldShowBounce] = useState(false)

  // Create video player with expo-video
  const player = useVideoPlayer(require('@/assets/videos/adventures/RiseOfIslamIntro.mp4'), player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const {
    getAdventureProgress,
    isModuleUnlocked,
    getModuleProgress,
    setSelectedEra,
    moduleProgress,
    getModuleStarCount
  } = useProgress()

  // Check if we should show the bouncing animation (first module not completed)
  useEffect(() => {
    const firstModuleProgress = getModuleProgress(6, 1) // Adventure 6, Module 1
    const isFirstModuleCompleted = firstModuleProgress?.isCompleted || false

    console.log('🎯 First module bounce check for Rise of Islam:', {
      firstModuleProgress,
      isCompleted: isFirstModuleCompleted,
      shouldShowBounce: !isFirstModuleCompleted
    })

    setShouldShowBounce(!isFirstModuleCompleted)

    if (isFirstModuleCompleted && shouldShowBounce) {
      console.log('🎯 First module completed - stopping bounce animation')
      setShouldShowBounce(false)
    }
  }, [getModuleProgress, shouldShowBounce])

  // Start bouncing animation when shouldShowBounce is true
  useEffect(() => {
    if (shouldShowBounce) {
      console.log('🎯 Starting bounce animation for Rise of Islam first module')

      const bounceSequence = Animated.sequence([
        Animated.timing(bounceY, {
          toValue: -15,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(bounceY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])

      const loopAnimation = Animated.loop(bounceSequence, {
        iterations: -1,
      })

      loopAnimation.start()

      return () => {
        loopAnimation.stop()
      }
    } else {
      bounceY.setValue(0)
    }
  }, [shouldShowBounce, bounceY])

  // Set selected era on mount
  useEffect(() => {
    setSelectedEra('riseOfIslam')
  }, [setSelectedEra])

  // Force component re-render when moduleProgress changes
  useEffect(() => {
    // This effect runs whenever moduleProgress changes, forcing icon re-renders
  }, [moduleProgress])

  // Handle video playback and Android navigation bar restoration on screen focus
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setHidden(false);
        StatusBar.setBackgroundColor(ArchivesTheme.colors.creamWhite, true);
        StatusBar.setBarStyle('dark-content', true);
      }

      try {
        if (player) {
          player.play();
          setIsVideoPlaying(true);
        }
      } catch (error) {
        console.warn('Failed to play video on focus:', error);
      }

      return () => {
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
    const adventureId = parseInt(moduleId.split('_')[0].replace('adv', ''))
    const modId = parseInt(moduleId.split('_')[1].replace('mod', ''))

    // Stop bounce animation when first module is tapped
    if (moduleId === 'adv6_mod1' && shouldShowBounce) {
      console.log('🎯 First Rise of Islam module tapped - stopping bounce animation')
      setShouldShowBounce(false)
    }

    // Check if module is unlocked
    if (!isModuleUnlocked(adventureId, modId)) {
      console.log('🔒 Module is locked')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      return
    }

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

    const isFirstModule = iconPosition.id === 'adv6_mod1'
    const showBounceForThisIcon = isFirstModule && shouldShowBounce && isUnlocked

    const mapWidth = screenWidth - 40
    const mapHeight = 600
    const iconX = iconPosition.x * mapWidth
    const iconY = iconPosition.y * mapHeight

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
        <IconContainer style={iconContainerStyle}>
          <Image
            source={isUnlocked
              ? require('@/assets/images/icons/Era 1 Icon.png') // TODO: Create Era 2 specific icon
              : require('@/assets/images/icons/Module locked.png')
            }
            style={styles.moduleIconImage}
          />

          {/* Star rating for quiz performance */}
          {isCompleted && (() => {
            const starCount = getModuleStarCount(adventureId, moduleId)

            if (starCount > 0) {
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
            }
            return null
          })()}
        </IconContainer>
      </TouchableOpacity>
    )
  }

  const renderAdventureSection = (adventure: any, isFirst: boolean = false) => {
    return (
      <View key={adventure.id} style={styles.adventureSection}>
        <TouchableOpacity
          style={styles.adventureHeader}
          onPress={() => handleAdventurePress(adventure.id)}
        >
          <View style={styles.adventureHeaderContent}>
            <View style={styles.adventureHeaderLeft}>
              <Text style={styles.eraAdventureLabel}>
                RISE OF ISLAM, ADVENTURE {adventure.id - 5}
              </Text>
              <Text style={styles.adventureTitle}>
                {adventure.title}
              </Text>
            </View>

            <View style={styles.adventureHeaderIcon}>
              <View style={styles.iconCircle}>
                {adventure.iconLibrary === "CustomSVG" && adventure.id === 6 ? (
                  <Adventure6Icon
                    size={24}
                    color="white"
                  />
                ) : adventure.iconLibrary === "CustomSVG" && adventure.id === 7 ? (
                  <Adventure7Icon
                    size={24}
                    color="white"
                  />
                ) : adventure.iconLibrary === "CustomSVG" && adventure.id === 8 ? (
                  <Adventure8Icon
                    size={24}
                    color="white"
                  />
                ) : adventure.iconLibrary === "CustomSVG" && adventure.id === 9 ? (
                  <Adventure9Icon
                    size={24}
                    color="white"
                  />
                ) : adventure.iconLibrary === "CustomSVG" && adventure.id === 10 ? (
                  <Adventure10Icon
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
          />

          {/* Black overlay - Removed for Rise of Islam to show images more clearly */}
          {/* <View style={styles.mapOverlay} /> */}

          {/* Module Icons positioned on the map */}
          {adventure.iconPositions.map((iconPosition: any) => renderModuleIcon(iconPosition))}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.background} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.mainContainer}>
          {/* Video Player Section */}
          <View style={styles.videoSection}>
            <VideoView
              player={player}
              style={styles.video}
              contentFit="cover"
              nativeControls={false}
              allowsFullscreen={false}
              allowsPictureInPicture={false}
            />

            {/* Dark overlay for better text readability */}
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)']}
              start={{x: 0, y: 0}}
              end={{x: 0, y: 1}}
              style={styles.videoOverlay}
            />

            {/* Overlay content */}
            <View style={styles.dynastyHeader}>
              <Image
                source={require('@/assets/images/icons/adventures/Rise_of_Islam_Icon.png')}
                style={styles.dynastyIcon}
              />
              <Text style={styles.dynastyTitle}>Rise of Islam</Text>
              <Text style={styles.dynastySubtitle}>570-632 CE</Text>
            </View>
          </View>

          {/* Adventure Map Section */}
          <View style={styles.adventureMapSection}>
            {RISE_OF_ISLAM_ADVENTURES.map((adventure, index) =>
              renderAdventureSection(adventure, index === 0)
            )}

            {/* Back to Era Button */}
            {onBackToEra && (
              <TouchableOpacity style={styles.backToEraButton} onPress={onBackToEra}>
                <Text style={styles.backToEraText}>Back to Eras</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Spacer */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* ModuleModal */}
      <ModuleModal
        isVisible={showModuleModal}
        moduleId={selectedModuleId}
        onDismiss={() => {
          setSelectedModuleId(null)
          setShowModuleModal(false)
        }}
      />

      {/* AdventureDetailModal */}
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

// Styles matching EXACT SwiftUI implementation with Rise of Islam branding
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
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  scrollView: {
    flex: 1,
  },
  mainContainer: {
    // VStack spacing: 40
  },

  // Video Section
  videoSection: {
    marginHorizontal: 20,
    marginTop: 60,
    marginBottom: 40,
  },
  video: {
    width: '100%',
    height: 200,
    borderRadius: 20,
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
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  dynastyTitle: {
    fontFamily: 'Cormorant-Bold',
    fontSize: 30,
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dynastySubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Adventure Map Section
  adventureMapSection: {
    // VStack spacing: 16
  },
  adventureSection: {
    marginBottom: 40,
  },

  // Adventure Header
  adventureHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  adventureHeaderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  adventureHeaderLeft: {
    flex: 1,
  },
  eraAdventureLabel: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '500',
    color: ArchivesTheme.colors.persianOrange,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  adventureTitle: {
    fontFamily: 'Cormorant-Bold',
    fontSize: 24,
    color: ArchivesTheme.colors.mutedNavy,
  },
  adventureHeaderIcon: {
    // Spacer() handled by flex: 1 on left side
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ArchivesTheme.colors.persianOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Adventure Map Container
  adventureMapContainer: {
    height: 600,
    borderRadius: 20,
    marginHorizontal: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  adventureMapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
    zIndex: 5,
  },

  // Module Icons
  moduleIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    marginLeft: -40,
    marginTop: -40,
    zIndex: 10,
    ...(Platform.OS === 'web' && {
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
    }),
  },
  moduleIconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
    backgroundColor: 'transparent',
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
    resizeMode: 'contain',
  },
  starRating: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftStar: {
    position: 'absolute',
    left: 4,
    top: 5,
    transform: [{ rotate: '-15deg' }],
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
    left: '50%',
    marginLeft: -13,
    top: -3,
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
    right: 4,
    top: 5,
    transform: [{ rotate: '15deg' }],
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },

  // Back to Era Button
  backToEraButton: {
    marginHorizontal: 20,
    marginTop: 40,
    backgroundColor: ArchivesTheme.colors.mutedNavy,
    borderRadius: 30,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: ArchivesTheme.colors.mutedNavy,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  backToEraText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 50,
  },
})