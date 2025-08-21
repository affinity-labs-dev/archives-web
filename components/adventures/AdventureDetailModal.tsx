// AdventureDetailModal.tsx - EXACT replica of SwiftUI AdventureDetailView.swift
// Information-only modal (no start adventure button to prevent cheating)

import React from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { Adventure, AdventureData } from '@/constants/AdventureData'

const { width: screenWidth } = Dimensions.get('window')

interface AdventureDetailModalProps {
  isVisible: boolean
  adventureId: number | null
  onDismiss: () => void
}

export default function AdventureDetailModal({ 
  isVisible, 
  adventureId, 
  onDismiss 
}: AdventureDetailModalProps) {
  const adventure = adventureId ? AdventureData.getAdventure(adventureId) : null

  if (!adventure) {
    return null
  }

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onDismiss()
  }

  const getAdventureHeroImage = () => {
    switch (adventure.id) {
      case 1: return require('@/assets/images/adventure-backgrounds/Adventure-1-bg.png')
      case 2: return require('@/assets/images/adventure-backgrounds/Adventure-2-bg.png')
      case 3: return require('@/assets/images/adventure-backgrounds/Adventure-3-bg.png')
      default: return null
    }
  }

  const getDifficultyColor = () => {
    switch (adventure.difficulty) {
      case 'Beginner': return ArchivesTheme.colors.mossGreen
      case 'Intermediate': return ArchivesTheme.colors.persianOrange
      case 'Advanced': return ArchivesTheme.colors.shoeBrown
      default: return ArchivesTheme.colors.mutedNavy
    }
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Hero Header Section - EXACT SwiftUI structure */}
          <View style={styles.heroSection}>
            {/* Hero Image */}
            <View style={styles.heroImageContainer}>
              {getAdventureHeroImage() ? (
                <Image 
                  source={getAdventureHeroImage()!}
                  style={styles.heroImage}
                />
              ) : (
                <LinearGradient
                  colors={[ArchivesTheme.colors.persianOrange, ArchivesTheme.colors.mutedNavy]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.heroImage}
                />
              )}
              
              {/* Swipe indicator bar */}
              <View style={styles.swipeIndicator} />
              
              {/* Dark overlay for text readability - EXACT SwiftUI */}
              <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
                start={{x: 0, y: 0}}
                end={{x: 0, y: 1}}
                style={styles.heroOverlay}
              />
              
              {/* Header Content */}
              <View style={styles.heroContent}>
                <View style={styles.spacer} />

                {/* Adventure Title and Era Info */}
                <View style={styles.titleSection}>
                  {/* Era Badge */}
                  <View style={styles.eraBadge}>
                    <Text style={styles.eraBadgeText}>
                      ERA 1, ADVENTURE {adventure.id}
                    </Text>
                  </View>

                  {/* Adventure Title */}
                  <Text style={styles.adventureTitle}>
                    {adventure.title}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Content Section - EXACT SwiftUI structure */}
          <View style={styles.contentSection}>
            {/* Short Description - Overview */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.descriptionText}>{adventure.description}</Text>
            </View>

            {/* Long Description - Adventure Story */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Adventure Story</Text>
              <Text style={styles.storyText}>
                {AdventureData.getAdventureLongDescription(adventure.id)}
              </Text>
            </View>

            {/* Adventure Details Card - EXACT SwiftUI structure */}
            <View style={styles.detailsCard}>
              <Text style={styles.detailsCardTitle}>Adventure Details</Text>
              
              <View style={styles.detailsRow}>
                {/* Time */}
                <View style={styles.detailItem}>
                  <Ionicons 
                    name="time" 
                    size={20} 
                    color={ArchivesTheme.colors.persianOrange} 
                  />
                  <Text style={styles.detailValue}>{adventure.estimatedTime}</Text>
                  <Text style={styles.detailLabel}>Duration</Text>
                </View>

                {/* XP Reward */}
                <View style={styles.detailItem}>
                  <Ionicons 
                    name="star" 
                    size={20} 
                    color={ArchivesTheme.colors.persianOrange} 
                  />
                  <Text style={styles.detailValue}>+{adventure.xpReward}</Text>
                  <Text style={styles.detailLabel}>XP Reward</Text>
                </View>

                {/* Modules Count */}
                <View style={styles.detailItem}>
                  <Ionicons 
                    name="book" 
                    size={20} 
                    color={ArchivesTheme.colors.persianOrange} 
                  />
                  <Text style={styles.detailValue}>{adventure.modules.length}</Text>
                  <Text style={styles.detailLabel}>Modules</Text>
                </View>
              </View>

            </View>

            {/* Note about starting adventure */}
            <View style={styles.noteContainer}>
              <Ionicons 
                name="information-circle" 
                size={20} 
                color={ArchivesTheme.colors.persianOrange} 
              />
              <Text style={styles.noteText}>
                To start this adventure, complete the modules in order on the adventure map in the previous page.
              </Text>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

// Styles matching EXACT SwiftUI AdventureDetailView implementation
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  scrollView: {
    flex: 1,
  },

  // Hero Section - EXACT SwiftUI heroHeaderSection
  heroSection: {
    // No spacing here, handled by inner components
  },
  heroImageContainer: {
    height: 280, // EXACT SwiftUI: .frame(height: 280)
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  swipeIndicator: {
    position: 'absolute',
    top: 12,
    left: '50%',
    marginLeft: -35, // Half of width (70px) to center
    width: 70,
    height: 5,
    backgroundColor: 'rgba(195, 195, 195, 1)',
    borderRadius: 2.5,
    zIndex: 2,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8, // EXACT SwiftUI: .padding(.top, 8)
    paddingRight: 20, // EXACT SwiftUI: .padding(.trailing, 20)
  },
  spacer: {
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)', // EXACT SwiftUI: Color.black.opacity(0.3)
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    paddingBottom: 30, // EXACT SwiftUI: .padding(.bottom, 30)
    paddingHorizontal: 20,
  },
  eraBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', // EXACT SwiftUI: Color.white.opacity(0.2)
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 12,
  },
  eraBadgeText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.9)', // EXACT SwiftUI: .white.opacity(0.9)
  },
  adventureTitle: {
    fontFamily: 'Cormorant', // EXACT SwiftUI: .font(.custom("Cormorant", size: 26))
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },

  // Content Section - EXACT SwiftUI contentSection
  contentSection: {
    paddingTop: 30, // Spacing between hero and content
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24, // EXACT SwiftUI: VStack spacing: 24
  },
  sectionTitle: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy, // EXACT SwiftUI: Color("MutedNavy")
    marginBottom: 16,
  },
  descriptionText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '500', // EXACT SwiftUI: .fontWeight(.medium)
    color: ArchivesTheme.colors.shoeBrown, // EXACT SwiftUI: Color("ShoeBrown")
    lineHeight: 20, // EXACT SwiftUI: .lineSpacing(4)
  },
  storyText: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    fontWeight: '400', // EXACT SwiftUI: .fontWeight(.regular)
    color: ArchivesTheme.colors.shoeBrown,
    lineHeight: 21, // EXACT SwiftUI: .lineSpacing(6)
  },

  // Adventure Details Card - EXACT SwiftUI adventureDetailsCard
  detailsCard: {
    marginHorizontal: 20,
    padding: 24, // EXACT SwiftUI: .padding(24)
    backgroundColor: 'rgba(255,255,255,0.8)', // EXACT SwiftUI: Color.white.opacity(0.8)
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${ArchivesTheme.colors.persianOrange}33`, // EXACT SwiftUI: .stroke(Color("PersianOrange").opacity(0.2))
    // EXACT SwiftUI shadow: .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
    shadowColor: 'black',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 24,
  },
  detailsCardTitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 20,
  },
  detailsRow: {
    flexDirection: 'row', // EXACT SwiftUI: HStack(spacing: 20)
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8, // EXACT SwiftUI: VStack spacing: 8
  },
  detailValue: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
  },
  detailLabel: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '500',
    color: ArchivesTheme.colors.shoeBrown,
  },


  // Note Container
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${ArchivesTheme.colors.persianOrange}10`,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  noteText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '500',
    color: ArchivesTheme.colors.shoeBrown,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 15, // Further reduced to move Back to Era button up more
  },
})