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
  RefreshControl,
} from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useProgress } from '@/context/ProgressContext'
import { useBackgroundSync } from '@/context/BackgroundSyncProvider'
import ArchivesTheme from '@/constants/ArchivesTheme'
import ROIModuleModal from '@/components/modules/ROIModuleModal'
import AdventureDetailModal from '@/components/adventures/AdventureDetailModal'
import Adventure6Icon from '@/components/icons/Adventure6Icon'
import Adventure7Icon from '@/components/icons/Adventure7Icon'
import Adventure8Icon from '@/components/icons/Adventure8Icon'
import Adventure9Icon from '@/components/icons/Adventure9Icon'
import Adventure10Icon from '@/components/icons/Adventure10Icon'

const { width: screenWidth } = Dimensions.get('window')

// Adventure data for Rise of Islam era (NEW ROI_Adv1_M1 ID system)
const RISE_OF_ISLAM_ADVENTURES = [
  {
    id: 1, // NEW: Adventure 1 (was 6)
    title: "The Early Years",
    headerIcon: "custom", // Custom SVG icon
    iconLibrary: "CustomSVG" as const,
    mapImage: require('@/assets/images/adventure-maps/ROIADVMAP1.jpg'),
    iconPositions: [
      { id: "ROI_Adv1_M1", x: 0.4, y: 0.22 }, // NEW ID format
      { id: "ROI_Adv1_M2", x: 0.5, y: 0.5 },
      { id: "ROI_Adv1_M3", x: 0.40, y: 0.8 }
    ]
  },
  {
    id: 2, // NEW: Adventure 2 (was 7)
    title: "First Revelations",
    headerIcon: "custom", // Custom SVG icon
    iconLibrary: "CustomSVG" as const,
    mapImage: require('@/assets/images/adventure-maps/ROIADVMAP2.jpg'),
    iconPositions: [
      { id: "ROI_Adv2_M1", x: 0.83, y: 0.3 }, // NEW ID format
      { id: "ROI_Adv2_M2", x: 0.6, y: 0.5 },
      { id: "ROI_Adv2_M3", x: 0.30, y: 0.89 }
    ]
  },
  {
    id: 3, // NEW: Adventure 3 (was 8)
    title: "The Hijra",
    headerIcon: "custom", // Custom SVG icon
    iconLibrary: "CustomSVG" as const,
    mapImage: require('@/assets/images/adventure-maps/ROIADVMAP3.jpg'),
    iconPositions: [
      { id: "ROI_Adv3_M1", x: 0.6, y: 0.23 }, // NEW ID format
      { id: "ROI_Adv3_M2", x: 0.45, y: 0.5 },
      { id: "ROI_Adv3_M3", x: 0.33, y: 0.85 }
    ]
  },
  {
    id: 4, // NEW: Adventure 4 (was 9)
    title: "Building the Community",
    headerIcon: "custom", // Custom SVG icon
    iconLibrary: "CustomSVG" as const,
    mapImage: require('@/assets/images/adventure-maps/ROIADVMAP4.jpg'),
    iconPositions: [
      { id: "ROI_Adv4_M1", x: 0.5, y: 0.3 }, // NEW ID format
      { id: "ROI_Adv4_M2", x: 0.6, y: 0.6 },
      { id: "ROI_Adv4_M3", x: 0.4, y: 0.8 }
    ]
  },
  {
    id: 5, // NEW: Adventure 5 (was 10)
    title: "The Final Years",
    headerIcon: "custom", // Custom SVG icon
    iconLibrary: "CustomSVG" as const,
    mapImage: require('@/assets/images/adventure-maps/ROIADVMAP5.jpg'),
    iconPositions: [
      { id: "ROI_Adv5_M1", x: 0.45, y: 0.25 }, // NEW ID format
      { id: "ROI_Adv5_M2", x: 0.55, y: 0.55 },
      { id: "ROI_Adv5_M3", x: 0.35, y: 0.75 }
    ]
  },
]

interface RiseOfIslamEraProps {
  onBackToEra?: () => void
}

const RiseOfIslamEra = React.memo(function RiseOfIslamEra({ onBackToEra }: RiseOfIslamEraProps) {
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
    // ROI-specific functions (NEW system)
    getRoiAdventureProgress,
    isRoiModuleUnlocked,
    getRoiModuleProgress,
    getRoiModuleStarCount,
    roiModuleProgress,

    // Legacy functions for backwards compatibility
    getAdventureProgress,
    isModuleUnlocked,
    getModuleProgress,
    moduleProgress,
    getModuleStarCount,
    reloadProgressData
  } = useProgress()

  const { manualSync, syncStatus } = useBackgroundSync()
  const [refreshing, setRefreshing] = useState(false)

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true)
    console.log('🔄 Pull-to-refresh triggered (Rise of Islam)')

    try {
      // First sync with cloud
      await manualSync()
      // Then reload progress data
      await reloadProgressData()
      console.log('✅ Refresh complete (Rise of Islam)')
    } catch (error) {
      console.error('❌ Refresh error:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Removed AppState auto-refresh to prevent excessive refreshing
  // Users can still manually refresh using pull-to-refresh

  // Check if we should show the bouncing animation (first module not completed)
  useEffect(() => {
    // NEW ROI SYSTEM: Check ROI_Adv1_M1 completion
    const firstRoiModuleProgress = getRoiModuleProgress('ROI_Adv1_M1')
    const isFirstRoiModuleCompleted = firstRoiModuleProgress?.isCompleted || false

    setShouldShowBounce(!isFirstRoiModuleCompleted)
  }, [roiModuleProgress, getRoiModuleProgress])

  // Start bouncing animation when shouldShowBounce is true
  useEffect(() => {
    if (shouldShowBounce) {
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

  // Force component re-render when ROI moduleProgress changes
  useEffect(() => {
    // This effect runs whenever roiModuleProgress changes, forcing icon re-renders
  }, [roiModuleProgress])

  // Android navigation bar restoration on screen focus
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setHidden(false);
        StatusBar.setBackgroundColor(ArchivesTheme.colors.creamWhite, true);
        StatusBar.setBarStyle('dark-content', true);
      }

      // Video continues playing in background - no restart on focus
      // This prevents the video from restarting when checking notifications
    }, [])
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
    // NEW ROI SYSTEM: Handle ROI_Adv1_M1 format
    console.log('🎯 ROI Module pressed:', moduleId)

    // Stop bounce animation when first module is tapped
    if (moduleId === 'ROI_Adv1_M1' && shouldShowBounce) {
      console.log('🎯 First ROI module tapped - stopping bounce animation')
      setShouldShowBounce(false)
    }

    // Check if ROI module is unlocked
    if (!isRoiModuleUnlocked(moduleId)) {
      console.log('🔒 ROI Module is locked:', moduleId)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      return
    }

    setSelectedModuleId(moduleId)
    setShowModuleModal(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  const renderModuleIcon = (iconPosition: any) => {
    // NEW ROI SYSTEM: Parse ROI_Adv1_M1 format
    const roiModuleId = iconPosition.id // e.g., "ROI_Adv1_M1"
    const isUnlocked = isRoiModuleUnlocked(roiModuleId)
    const moduleProgress = getRoiModuleProgress(roiModuleId)
    const isCompleted = moduleProgress?.isCompleted || false

    const isFirstModule = roiModuleId === 'ROI_Adv1_M1'
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
            const starCount = getRoiModuleStarCount(roiModuleId)

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
                RISE OF ISLAM, ADVENTURE {adventure.id}
              </Text>
              <Text style={styles.adventureTitle}>
                {adventure.title}
              </Text>
            </View>

            <View style={styles.adventureHeaderIcon}>
              <View style={styles.iconCircle}>
                {adventure.iconLibrary === "CustomSVG" && adventure.id === 1 ? (
                  <Adventure6Icon
                    size={24}
                    color="white"
                  />
                ) : adventure.iconLibrary === "CustomSVG" && adventure.id === 2 ? (
                  <Adventure7Icon
                    size={24}
                    color="white"
                  />
                ) : adventure.iconLibrary === "CustomSVG" && adventure.id === 3 ? (
                  <Adventure8Icon
                    size={24}
                    color="white"
                  />
                ) : adventure.iconLibrary === "CustomSVG" && adventure.id === 4 ? (
                  <Adventure9Icon
                    size={24}
                    color="white"
                  />
                ) : adventure.iconLibrary === "CustomSVG" && adventure.id === 5 ? (
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

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ArchivesTheme.colors.shoeBrown}
            colors={[ArchivesTheme.colors.shoeBrown]} // Android
          />
        }
      >
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

      {/* ROI ModuleModal - Dedicated for Rise of Islam Era */}
      <ROIModuleModal
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
})

export default RiseOfIslamEra

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