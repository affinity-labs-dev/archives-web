// AdventureCard.tsx - Adventure detail modal for all eras
// Displays adventure info from card_content JSONB field (static) + calculated values (dynamic)

import React from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import ArchivesTheme from '@/constants/ArchivesTheme'
import type { Adventure } from '@/components/shared/types'

interface AdventureCardProps {
  isVisible: boolean
  adventure: Adventure | null
  onDismiss: () => void
}

export default function AdventureCard({
  isVisible,
  adventure,
  onDismiss
}: AdventureCardProps) {
  if (!adventure || !adventure.card_content) {
    return null
  }

  const cardContent = adventure.card_content

  // Calculate modules count from content_list
  const modulesCount = adventure.content_list?.length || 0

  // Calculate XP reward: number of quizzes × 10 XP per quiz
  // Each module with questions = 1 quiz
  const quizCount = adventure.content_list?.filter(item =>
    item.questions && item.questions.length > 0
  ).length || 0;
  const xpReward = quizCount * 10

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onDismiss()
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? "pageSheet" : "fullScreen"}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={Platform.OS === 'ios'}
          bounces={Platform.OS === 'ios'}
        >
          {/* Hero Header Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroImageContainer}>
              {/* Background Image */}
              <Image
                source={{ uri: cardContent.background_image }}
                style={styles.heroImage}
                contentFit="cover"
                placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
                transition={300}
              />

              {/* Swipe indicator bar */}
              <View style={styles.swipeIndicator} />

              {/* Close button for Android */}
              {Platform.OS === 'android' && (
                <TouchableOpacity style={styles.androidCloseButton} onPress={handleClose}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              )}

              {/* Dark overlay for text readability */}
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
                      {cardContent.era_name.toUpperCase()}, ADVENTURE {adventure.order_by}
                    </Text>
                  </View>

                  {/* Adventure Title */}
                  <Text style={styles.adventureTitle}>
                    {adventure.adventure_title}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Content Section */}
          <View style={styles.contentSection}>
            {/* Overview */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.descriptionText}>{cardContent.overview_text}</Text>
            </View>

            {/* Adventure Story */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Adventure Story</Text>
              <Text style={styles.storyText}>
                {cardContent.adventure_story}
              </Text>
            </View>

            {/* Adventure Details Card */}
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
                  <Text style={styles.detailValue}>{cardContent.estimated_time}</Text>
                  <Text style={styles.detailLabel}>Duration</Text>
                </View>

                {/* XP Reward (calculated) */}
                <View style={styles.detailItem}>
                  <Ionicons
                    name="star"
                    size={20}
                    color={ArchivesTheme.colors.persianOrange}
                  />
                  <Text style={styles.detailValue}>+{xpReward}</Text>
                  <Text style={styles.detailLabel}>XP Reward</Text>
                </View>

                {/* Modules Count (calculated) */}
                <View style={styles.detailItem}>
                  <Ionicons
                    name="book"
                    size={20}
                    color={ArchivesTheme.colors.persianOrange}
                  />
                  <Text style={styles.detailValue}>{modulesCount}</Text>
                  <Text style={styles.detailLabel}>Modules</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

// Styles matching AdventureDetailModal
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'android' ? 50 : 15,
  },

  // Hero Section
  heroSection: {},
  heroImageContainer: {
    height: 280,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  swipeIndicator: {
    position: 'absolute',
    top: 12,
    left: '50%',
    marginLeft: -35,
    width: 70,
    height: 5,
    backgroundColor: 'rgba(195, 195, 195, 1)',
    borderRadius: 2.5,
    zIndex: 2,
  },
  androidCloseButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
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
  spacer: {
    flex: 1,
  },
  titleSection: {
    alignItems: 'center',
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  eraBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 12,
  },
  eraBadgeText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.9)',
  },
  adventureTitle: {
    fontFamily: 'Cormorant-Bold',
    fontSize: 26,
    color: 'white',
    textAlign: 'center',
  },

  // Content Section
  contentSection: {
    paddingTop: 30,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 16,
  },
  descriptionText: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    fontWeight: '400',
    color: ArchivesTheme.colors.shoeBrown,
    lineHeight: 20,
  },
  storyText: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    fontWeight: '400',
    color: ArchivesTheme.colors.shoeBrown,
    lineHeight: 21,
  },

  // Adventure Details Card
  detailsCard: {
    marginHorizontal: 20,
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${ArchivesTheme.colors.persianOrange}33`,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
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
    height: Platform.OS === 'android' ? 30 : 15,
  },
})
