// Profile Tab - EXACT replica of SwiftUI Profile.swift
// Matches the exact structure: historical avatars + stats + badges + achievements + settings

import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Image, Modal, Dimensions } from 'react-native'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import ArchivesTheme from '@/constants/ArchivesTheme'

const { width: screenWidth } = Dimensions.get('window')

// Historical Avatars - EXACT SwiftUI data
const HISTORICAL_AVATARS = [
  {
    id: 'al-khwarizmi',
    name: 'Al-Khwarizmi',
    title: 'Father of Algebra',
    image: require('@/assets/images/avatars/Al-Khwarizmi.png')
  },
  {
    id: 'fatima-al-fihri',
    name: 'Fatima al-Fihri', 
    title: 'Founder of the World\'s First University',
    image: require('@/assets/images/avatars/Fatima-al-Fihri.png')
  },
  {
    id: 'ibn-sina',
    name: 'Ibn Sina',
    title: 'Philosopher-physician',
    image: require('@/assets/images/avatars/Ibn-Sina-Avicenna.png')
  },
  {
    id: 'ziryab',
    name: 'Ziryab',
    title: 'Cultural innovator and musician',
    image: require('@/assets/images/avatars/Ziryab.png')
  },
  {
    id: 'al-razi',
    name: 'Al-Razi',
    title: 'Early medical pioneer',
    image: require('@/assets/images/avatars/Al-Razi.png')
  },
  {
    id: 'ibn-battuta',
    name: 'Ibn Battuta',
    title: 'World traveler',
    image: require('@/assets/images/avatars/Ibn-Battuta.png')
  },
  {
    id: 'lubna-cordoba',
    name: 'Lubna of Córdoba',
    title: 'Scholar and secretary',
    image: require('@/assets/images/avatars/Lubna-of-Cordoba.png')
  },
  {
    id: 'mariam-asturlabi',
    name: 'Mariam al-Asturlabi',
    title: 'Astrolabe maker and scientist',
    image: require('@/assets/images/avatars/Mariam-al-Asturlabi.png')
  },
  {
    id: 'zaynab-shahda',
    name: 'Zaynab al-Shahda',
    title: 'Scholar and teacher',
    image: require('@/assets/images/avatars/Zaynab-al-Shahda.png')
  }
]

// XP Achievements - EXACT SwiftUI data
const XP_ACHIEVEMENTS = [
  { id: '100xp', image: require('@/assets/images/badges/100XP.png') },
  { id: '250xp', image: require('@/assets/images/badges/250XP.png') },
  { id: '400xp', image: require('@/assets/images/badges/400XP.png') },
  { id: '550xp', image: require('@/assets/images/badges/550XP.png') }
]

// Monthly Badges - EXACT SwiftUI data  
const MONTHLY_BADGES = [
  { id: 'august', name: 'August', image: require('@/assets/images/badges/August Badge.png') },
  { id: 'september', name: 'September', image: require('@/assets/images/badges/September Badge.png') },
  { id: 'october', name: 'October', image: require('@/assets/images/badges/October Badge.png') }
]

export default function ProfileTab() {
  const { signOut } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  
  // Profile state - EXACT SwiftUI values
  const [selectedAvatar, setSelectedAvatar] = useState(HISTORICAL_AVATARS[0])
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  
  // Stats - EXACT SwiftUI values
  const stats = {
    dayStreak: 13,
    totalXP: 24,  
    modules: 14
  }
  
  // Learning preferences - EXACT SwiftUI values
  const preferences = {
    dailyGoal: 13, // minutes
    reminderTime: '7:00 PM',
    difficulty: 3 // out of 4 levels
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.replace('/landing')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleAvatarSelection = (avatar: typeof HISTORICAL_AVATARS[0]) => {
    setSelectedAvatar(avatar)
    setShowAvatarModal(false)
  }


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Header with Profile Title */}
        <View style={styles.header}>
          <Text style={styles.profileTitle}>Profile</Text>
        </View>
        
        {/* Avatar Section - EXACT SwiftUI */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => setShowAvatarModal(true)}
          >
            <Image source={selectedAvatar.image} style={styles.avatarImage} />
          </TouchableOpacity>
          
          <Text style={styles.avatarName}>{selectedAvatar.name}</Text>
          <Text style={styles.avatarTitle}>{selectedAvatar.title}</Text>
          
        </View>

        {/* Stats Cards - EXACT SwiftUI */}
        <View style={styles.statsSection}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.dayStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalXP}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.modules}</Text>
              <Text style={styles.statLabel}>Modules</Text>
            </View>
          </View>
        </View>

        {/* Monthly Badges - EXACT SwiftUI */}
        <View style={styles.badgesSection}>
          <Text style={styles.sectionTitle}>Monthly Badges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
            {MONTHLY_BADGES.map((badge) => (
              <View key={badge.id} style={styles.badgeContainer}>
                <Image source={badge.image} style={styles.badgeImage} />
                <Text style={styles.badgeLabel}>{badge.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Achievements - EXACT SwiftUI */}
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
            {XP_ACHIEVEMENTS.map((achievement) => (
              <View key={achievement.id} style={styles.achievementContainer}>
                <Image source={achievement.image} style={styles.achievementImage} />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Learning Preferences - Card Style */}
        <View style={styles.preferencesSection}>
          <Text style={styles.sectionTitle}>Learning Preferences</Text>
          
          <View style={styles.preferenceCard}>
            <View style={styles.preferenceIcon}>
              <Ionicons name="target" size={24} color={ArchivesTheme.colors.persianOrange} />
            </View>
            <Text style={styles.preferenceLabel}>Daily goal</Text>
            <Text style={styles.preferenceValue}>{preferences.dailyGoal} mins</Text>
          </View>
          
          <View style={styles.preferenceCard}>
            <View style={styles.preferenceIcon}>
              <Ionicons name="notifications" size={24} color={ArchivesTheme.colors.persianOrange} />
            </View>
            <Text style={styles.preferenceLabel}>Reminders</Text>
            <Text style={styles.preferenceValue}>{preferences.reminderTime}</Text>
          </View>
          
          <View style={styles.preferenceCard}>
            <View style={styles.preferenceIcon}>
              <Ionicons name="bar-chart" size={24} color={ArchivesTheme.colors.persianOrange} />
            </View>
            <Text style={styles.preferenceLabel}>Difficulty</Text>
            <Text style={styles.preferenceValue}>3rd level</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Avatar Selection Modal - EXACT SwiftUI bottom sheet */}
      <Modal
        visible={showAvatarModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowAvatarModal(false)}
              >
                <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Choose Your Avatar</Text>
              <View style={styles.closeButtonPlaceholder} />
            </View>

            {/* Avatar Grid */}
            <ScrollView style={styles.avatarGrid} showsVerticalScrollIndicator={false}>
              <View style={styles.avatarGridContainer}>
                {HISTORICAL_AVATARS.map((avatar, index) => (
                  <TouchableOpacity
                    key={avatar.id}
                    style={styles.avatarGridItem}
                    onPress={() => handleAvatarSelection(avatar)}
                  >
                    <View style={[
                      styles.avatarGridImageContainer,
                      avatar.id === selectedAvatar.id && styles.avatarGridSelected
                    ]}>
                      <Image source={avatar.image} style={styles.avatarGridImage} />
                    </View>
                    <Text style={styles.avatarGridName}>{avatar.name}</Text>
                    <Text style={styles.avatarGridTitle}>{avatar.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

// Styles matching EXACT SwiftUI Profile implementation
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  scrollView: {
    flex: 1,
  },
  
  // Header - Updated with Profile title
  header: {
    paddingHorizontal: 20,
    paddingTop: 20, // Increased top padding
    paddingBottom: 10, // Added bottom padding
    alignItems: 'flex-start', // Left aligned
  },
  profileTitle: {
    fontFamily: 'DM Sans',
    fontSize: 24,
    fontWeight: '600', // SemiBold
    color: '#41425E', // Exact color from gradient
    textAlign: 'left',
    lineHeight: 28, // Increased to 117% line height (24px * 1.17) to prevent clipping
    letterSpacing: 0, // 0% letter spacing
    marginBottom: 4,
    paddingVertical: 2, // Added vertical padding to ensure text isn't clipped
    paddingLeft: 8, // Added left padding like subscription text
  },
  
  // Avatar Section - EXACT SwiftUI
  avatarSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  avatarContainer: {
    width: 190, // Increased size to 190
    height: 190,
    borderRadius: 95, // Updated border radius to match new size
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    // EXACT SwiftUI shadow: .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 4)
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 190, // Increased size to 190
    height: 190,
    resizeMode: 'contain',
  },
  avatarName: {
    fontFamily: 'Cormorant', // EXACT SwiftUI: .font(.custom("Cormorant", size: 24))
    fontSize: 24,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginBottom: 4,
  },
  avatarTitle: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    color: ArchivesTheme.colors.persianOrange, // EXACT SwiftUI: .foregroundColor(Color("PersianOrange"))
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Stats Section - EXACT SwiftUI
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row', // HStack
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white', // EXACT SwiftUI: .background(Color.white)
    borderRadius: 16, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 16)
    padding: 20, // EXACT SwiftUI: .padding(20)
    alignItems: 'center',
    // EXACT SwiftUI shadow: .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 4)
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontFamily: 'Cormorant', // EXACT SwiftUI: .font(.custom("Cormorant", size: 28))
    fontSize: 28,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 12))
    fontSize: 12,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy,
    opacity: 0.7,
    textAlign: 'center',
  },
  
  // Sections - EXACT SwiftUI
  badgesSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  achievementsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18,
    fontWeight: '600', // .fontWeight(.semibold)
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 16,
  },
  
  // Badges - EXACT SwiftUI
  badgesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  badgeContainer: {
    alignItems: 'center',
    marginRight: 20,
  },
  badgeImage: {
    width: 140, // Set to 140
    height: 140,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  badgeLabel: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 11))
    fontSize: 11,
    color: ArchivesTheme.colors.mutedNavy,
    opacity: 0.7,
  },
  
  // Achievements - EXACT SwiftUI
  achievementsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  achievementContainer: {
    marginRight: 16,
  },
  achievementImage: {
    width: 140, // Set to 140
    height: 140,
    resizeMode: 'contain',
  },
  
  // Learning Preferences - Card Style
  preferencesSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  preferenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ArchivesTheme.colors.persianOrange + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  preferenceLabel: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy,
    flex: 1,
  },
  preferenceValue: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy,
    opacity: 0.6,
  },
  
  // Sign Out Button
  signOutButton: {
    marginHorizontal: 20,
    backgroundColor: ArchivesTheme.colors.persianOrange, // Persian orange color
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  signOutText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  
  bottomSpacer: {
    height: 40,
  },

  // Avatar Selection Modal - EXACT SwiftUI bottom sheet
  modalSafeArea: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: ArchivesTheme.colors.mutedNavy + '20',
    marginBottom: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButtonPlaceholder: {
    width: 32,
    height: 32,
  },
  modalTitle: {
    fontFamily: 'Cormorant',
    fontSize: 24,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
  },
  avatarGrid: {
    flex: 1,
  },
  avatarGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  avatarGridItem: {
    width: (screenWidth - 60) / 2, // 2 columns with padding and gap
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarGridImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  avatarGridSelected: {
    borderWidth: 3,
    borderColor: ArchivesTheme.colors.persianOrange,
    shadowColor: ArchivesTheme.colors.persianOrange,
    shadowOpacity: 0.3,
  },
  avatarGridImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  avatarGridName: {
    fontFamily: 'Cormorant',
    fontSize: 16,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginBottom: 4,
  },
  avatarGridTitle: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: ArchivesTheme.colors.persianOrange,
    textAlign: 'center',
    lineHeight: 16,
  },
})