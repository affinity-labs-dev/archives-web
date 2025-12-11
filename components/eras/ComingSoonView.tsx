// ComingSoonView Component - Exact replica of SwiftUI version
// Professional placeholder for eras not yet implemented

import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Animated,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import ArchivesTheme from '@/constants/ArchivesTheme'

// Era types that show "coming soon"
type EraType = 'umayyad' | 'riseOfIslam' | 'abbasid' | 'ottoman' | 'fatimid'

interface EraInfo {
  title: string
  subtitle: string
  expectedRelease: string
  description: string
}

// Era-specific data matching SwiftUI SelectedEra enum
const ERA_INFO: Record<EraType, EraInfo> = {
  umayyad: {
    title: 'Umayyad Dynasty',
    subtitle: 'The first hereditary Islamic caliphate (661-750 CE)',
    expectedRelease: 'Coming Soon',
    description: 'Explore the golden age of Islamic expansion from Damascus to the gates of Constantinople and across North Africa to Spain.',
  },
  riseOfIslam: {
    title: 'Rise of Islam',
    subtitle: 'The life of Prophet Muhammad ﷺ and the birth of Islam',
    expectedRelease: 'Q4 2025',
    description: 'Journey through the life of Prophet Muhammad ﷺ and witness the birth of Islam that would transform the world.',
  },
  abbasid: {
    title: 'Abbasid Caliphate',
    subtitle: 'Golden age of Islamic civilization (750-1258 CE)',
    expectedRelease: 'Q1 2026',
    description: 'Explore the House of Wisdom and the scientific achievements that defined the Islamic Golden Age.',
  },
  ottoman: {
    title: 'Ottoman Empire',
    subtitle: 'One of the longest-lasting empires (1299-1922 CE)',
    expectedRelease: 'Q2 2026',
    description: 'Discover the rise and expansion of an empire that spanned three continents for over 600 years.',
  },
  fatimid: {
    title: 'Fatimid Caliphate',
    subtitle: 'Shia Islamic caliphate in North Africa (909-1171 CE)',
    expectedRelease: 'Q3 2026',
    description: 'Learn about the Shia caliphate that established Cairo as a center of learning and culture.',
  },
}

// Feature list for upcoming eras
const UPCOMING_FEATURES = [
  { icon: 'map', title: 'Interactive Maps', description: 'Explore historical territories' },
  { icon: 'book', title: 'Video Lessons', description: 'Immersive historical content' },
  { icon: 'help-circle', title: 'Quizzes & Tests', description: 'Test your knowledge' },
  { icon: 'star', title: 'Achievements', description: 'Earn badges and rewards' },
]

interface ComingSoonViewProps {
  era: EraType
  onBack: () => void
}

export default function ComingSoonView({ era, onBack }: ComingSoonViewProps) {
  const [isNotifyPressed, setIsNotifyPressed] = useState(false)
  const scaleAnim = new Animated.Value(1)

  const eraInfo = ERA_INFO[era]

  const handleNotifyPress = () => {
    setIsNotifyPressed(!isNotifyPressed)
    
    // Spring animation like SwiftUI
    Animated.spring(scaleAnim, {
      toValue: isNotifyPressed ? 1 : 0.95,
      useNativeDriver: true,
      tension: 100,
      friction: 3,
    }).start()

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  const handleBackPress = () => {
    onBack()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Icon with Gradient Circles */}
        <View style={styles.iconSection}>
          <View style={styles.gradientCircleContainer}>
            {/* Background gradient circles */}
            <View style={styles.gradientCircle1} />
            <View style={styles.gradientCircle2} />
            
            {/* Main hourglass icon */}
            <View style={styles.mainIconContainer}>
              <Ionicons 
                name="hourglass" 
                size={48} 
                color={ArchivesTheme.colors.persianOrange} 
              />
            </View>
          </View>
        </View>

        {/* Era Information */}
        <View style={styles.eraInfoSection}>
          <Text style={styles.eraTitle}>{eraInfo.title}</Text>
          
          {/* Coming Soon Badge */}
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
          
          <Text style={styles.eraSubtitle}>{eraInfo.subtitle}</Text>
        </View>

        {/* Welcome Message */}
        <View style={styles.messageSection}>
          <Text style={styles.welcomeTitle}>
            We&apos;re working hard to bring you this era!
          </Text>
          <Text style={styles.welcomeMessage}>
            {eraInfo.description}
          </Text>
        </View>

        {/* Release Timeline */}
        <View style={styles.releaseSection}>
          <Text style={styles.releaseTitle}>Expected Release</Text>
          <View style={styles.releaseContainer}>
            <View style={styles.releaseGradient}>
              <Ionicons name="calendar" size={20} color="white" />
              <Text style={styles.releaseText}>{eraInfo.expectedRelease}</Text>
            </View>
          </View>
        </View>

        {/* Notify Button */}
        <View style={styles.notifySection}>
          <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity 
              style={[
                styles.notifyButton,
                isNotifyPressed && styles.notifyButtonPressed
              ]}
              onPress={handleNotifyPress}
            >
              <View style={styles.notifyButtonContent}>
                <Ionicons 
                  name={isNotifyPressed ? "checkmark-circle" : "notifications"} 
                  size={20} 
                  color={isNotifyPressed ? ArchivesTheme.colors.mossGreen : ArchivesTheme.colors.persianOrange} 
                />
                <Text style={[
                  styles.notifyButtonText,
                  isNotifyPressed && styles.notifyButtonTextPressed
                ]}>
                  {isNotifyPressed ? 'You&apos;ll be notified!' : 'Notify me when ready'}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What to expect:</Text>
          
          {UPCOMING_FEATURES.map((feature, index) => (
            <View key={feature.title} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons 
                  name={feature.icon as any} 
                  size={20} 
                  color={ArchivesTheme.colors.persianOrange} 
                />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
        <View style={styles.backButtonContent}>
          <Ionicons name="chevron-back" size={20} color={ArchivesTheme.colors.creamWhite} />
          <Text style={styles.backButtonText}>Back to Eras</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

// Styles matching SwiftUI design
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 120, // Space for floating back button
  },

  // Icon Section
  iconSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  gradientCircleContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gradientCircle1: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ArchivesTheme.colors.persianOrange + '20',
    top: 20,
    left: 20,
  },
  gradientCircle2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ArchivesTheme.colors.mossGreen + '15',
    top: 10,
    right: 15,
  },
  mainIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  // Era Information
  eraInfoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  eraTitle: {
    ...ArchivesTheme.typography.h1,
    fontSize: 32,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginBottom: 16,
  },
  comingSoonBadge: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  comingSoonText: {
    ...ArchivesTheme.typography.bodyLarge,
    color: 'white',
    fontWeight: '600',
  },
  eraSubtitle: {
    ...ArchivesTheme.typography.bodyLarge,
    color: ArchivesTheme.colors.mutedNavy,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },

  // Message Section
  messageSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeTitle: {
    ...ArchivesTheme.typography.h3,
    fontSize: 20,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeMessage: {
    ...ArchivesTheme.typography.body,
    color: ArchivesTheme.colors.mutedNavy,
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Release Section
  releaseSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  releaseTitle: {
    ...ArchivesTheme.typography.bodyLarge,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 12,
  },
  releaseContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  releaseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: ArchivesTheme.colors.persianOrange,
  },
  releaseText: {
    ...ArchivesTheme.typography.buttonLarge,
    color: 'white',
    fontWeight: '600',
  },

  // Notify Section
  notifySection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  notifyButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.persianOrange,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  notifyButtonPressed: {
    backgroundColor: ArchivesTheme.colors.mossGreen + '10',
    borderColor: ArchivesTheme.colors.mossGreen,
  },
  notifyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifyButtonText: {
    ...ArchivesTheme.typography.buttonLarge,
    color: ArchivesTheme.colors.persianOrange,
    fontWeight: '600',
  },
  notifyButtonTextPressed: {
    color: ArchivesTheme.colors.mossGreen,
  },

  // Features Section
  featuresSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuresTitle: {
    ...ArchivesTheme.typography.h3,
    fontSize: 18,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 20,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ArchivesTheme.colors.persianOrange + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...ArchivesTheme.typography.bodyLarge,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 4,
  },
  featureDescription: {
    ...ArchivesTheme.typography.body,
    color: ArchivesTheme.colors.mutedNavy,
    opacity: 0.7,
    lineHeight: 20,
  },

  // Floating Back Button
  backButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderRadius: 16,
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  backButtonText: {
    ...ArchivesTheme.typography.buttonLarge,
    color: ArchivesTheme.colors.creamWhite,
    fontWeight: '600',
  },
})