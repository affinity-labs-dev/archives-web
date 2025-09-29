// Profile Tab - EXACT replica of SwiftUI Profile.swift
// Matches the exact structure: historical avatars + stats + badges + achievements + settings

import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Image, Modal, Dimensions, Alert, Linking, Platform } from 'react-native'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ArchivesTheme from '@/constants/ArchivesTheme'

const { width: screenWidth } = Dimensions.get('window')

// Privacy Policy Content
const PRIVACY_POLICY_CONTENT = `Privacy Policy
Archives - Operated by Affinity Labs Ltd

Overview
How we collect, use, and protect your personal data

This Privacy Policy outlines how personal data is collected, used, and protected when you access or use the Archives mobile application, website, or any related services (collectively referred to as the "Archives"). Archives is operated by Affinity Labs Ltd ("we," "us," "our," "Affinity Labs," or "Archives"), the company that develops and manages the Archives platform.

We understand the importance of your privacy and are committed to maintaining the confidentiality and security of your information. This document is designed to help you understand the types of information we collect, how we use it, with whom it may be shared, and your rights relating to that information.

User Accounts and Collection of Information
What information we collect when you register and use our services

You are not required to create a user account or submit personal information in order to visit the Archives website. However, in order to access and use the Archives mobile or web application, you must register for an account.

During the account creation process, we will request certain authentication information such as your name, date of birth, a valid email address, and a secure password. This information allows us to establish and authenticate your account, communicate with you about service updates or account-related matters, and provide a personalised experience within the app.

If you make use of the application's sharing features, for example, to send quests, articles, or historical content to others, we may request that you provide contact details, such as an email address, for the intended recipient. This information is used exclusively to facilitate the delivery of your shared content and is not retained or repurposed for any unrelated use.

Collection of Information Through App Usage
Technical and usage data collected automatically

Beyond the personal data you provide directly, Archives automatically collects various technical and usage-related information when you interact with our application or website. This includes details such as your browser type, device model, operating system version, IP address, screen resolution, language preferences, and time zone.

We also collect behavioural data tied to your use of Archives. This may include the pages or quests you access, your quiz results, which content is saved or shared, how frequently you use the app, and which features are used most often.

We use cookies and similar technologies (such as device identifiers and local storage) to support login functionality, store user preferences, and collect analytics about how Archives is used. On mobile platforms, we may also collect and process advertising identifiers, such as Apple's IDFA or Google's GAID.

Use of Information
How we use your data and legal bases for processing

We use the information we collect to deliver and improve Archives, fulfil our contractual obligations to you, provide technical support, and respond to your inquiries. We may also use your information to communicate with you about service updates, new features, content recommendations, or promotional campaigns.

Legal Bases for Processing (For EU and UK Users): We process your personal data when necessary for the performance of our contract with you, based on our legitimate interests, with your consent where required, or where necessary to comply with legal obligations.

Sharing of Information
When and with whom we share your data

Public content: If you make your profile or historical content publicly available within Archives, other users may be able to view your name.

Trusted service providers: We may share limited data with third-party vendors and service providers who assist us in delivering Archives. This includes partners who provide cloud hosting, payment processing, customer support infrastructure, and analytics services.

Legal obligations and business transfers: In limited circumstances, we may disclose your information if required by law or in response to a valid legal request. We also reserve the right to transfer user data as part of a merger, acquisition, financing, or sale of company assets.

Data Retention and Security
How long we keep your data and how we protect it

We retain your personal data for as long as your account is active, and for a reasonable period thereafter to support customer service, account reactivation, or legal compliance. If you delete your account, we will remove your personal data from active systems within a short time frame.

We use a range of technical and organisational safeguards to protect the confidentiality and integrity of your information. These include encryption in transit and at rest, firewalls, secure access controls, and regular vulnerability scanning.

Your Rights and Choices
Your data protection rights and how to exercise them

Depending on your jurisdiction, you may have the right to access the personal data we hold about you, request corrections or deletions, restrict or object to certain forms of processing, and request a copy of your data in a portable format.

Account Deletion: You may delete your account through the app by going to Profile > Settings > Delete account on mobile.

California Residents: You have the right to know what personal information we collect, request access or deletion, and opt out of the sale or sharing of your personal information. We do not currently sell personal information as defined under the California Consumer Privacy Act (CCPA).

Children's Privacy
Age restrictions and parental consent

Archives is not intended for use by children under the age of 13, or below the age threshold in your country that requires parental consent for data processing. We do not knowingly collect personal information from children without appropriate consent.

Security and Phishing
Protecting your account from unauthorized access

We are committed to helping protect you from identity theft and unauthorised access. We will never ask for your password, payment information, or national ID number through unsolicited emails, messages, or phone calls.

Changes to This Policy
How we notify you of updates

We may update this Privacy Policy from time to time as our practices evolve or as legal requirements change. When we make material changes, we will post the revised version on our website or notify you through the Archives application.

Contact Information
Get in touch with any privacy questions

If you have any questions about this Privacy Policy or our data handling practices, please contact us at:

Email: support@affinitylabs.ai

Address:
Affinity Labs Ltd
2nd Floor College House
17 King Edwards Road
London, HA4 7AE
United Kingdom`

// FAQ Data - Interactive expandable cards
const FAQ_DATA = [
  {
    id: 1,
    question: "When will Archives be available?",
    answer: "We're launching our beta version in Q4 2025. Join our waitlist to get early access and be among the first to experience gamified Middle Eastern history!"
  },
  {
    id: 2,
    question: "Is it free?",
    answer: "Archives will offer a freemium model with core lessons available for free. Premium features like advanced quests, detailed progress tracking, and exclusive historical content will be available through a subscription plan."
  },
  {
    id: 3,
    question: "Who is Archives designed for?",
    answer: "Archives is designed for anyone curious about Middle Eastern history, from students and educators to history enthusiasts of all ages. Our content is carefully crafted to be engaging and educational while remaining historically accurate."
  },
  {
    id: 4,
    question: "How long are the daily lessons?",
    answer: "Each lesson is designed to be bite-sized and takes about 5-10 minutes to complete. Perfect for your commute, coffee break, or whenever you have a few spare minutes to dive into history."
  },
  {
    id: 5,
    question: "What devices can I use Archives on?",
    answer: "Archives is available on iOS and Android devices, with plans to expand to web browsers. Your progress syncs seamlessly across all your devices, so you can learn anywhere, anytime."
  }
]

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
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showFAQModal, setShowFAQModal] = useState(false)
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  

  const handleSignOut = async () => {
    try {
      await signOut()
      router.replace('/onboarding-video')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleAvatarSelection = (avatar: typeof HISTORICAL_AVATARS[0]) => {
    setSelectedAvatar(avatar)
    setShowAvatarModal(false)
  }

  const clearUserData = async () => {
    try {
      // Clear all AsyncStorage data related to user progress and settings
      await AsyncStorage.multiRemove([
        'selected_era',
        'adventure_progress',
        'module_progress',
        'user_preferences'
      ])
    } catch (error) {
      console.error('Error clearing user data:', error)
    }
  }

  const handleDeleteAccount = () => {
    if (isDeletingAccount) return // Prevent multiple deletion attempts
    
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your progress.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) {
              Alert.alert('Error', 'No user account found to delete.')
              return
            }

            setIsDeletingAccount(true)
            setShowSettingsModal(false) // Close settings modal

            try {
              // Clear local user data first
              await clearUserData()
              
              // Delete the user account through Clerk
              await user.delete()
              
              // Navigate to onboarding for fresh start
              router.replace('/onboarding-video')
              
            } catch (error) {
              setIsDeletingAccount(false)
              console.error('Account deletion error:', error)
              
              // Show appropriate error message
              const errorMessage = error instanceof Error 
                ? error.message 
                : 'An unexpected error occurred while deleting your account.'
              
              Alert.alert(
                'Account Deletion Failed',
                `${errorMessage}\n\nPlease try again or contact support if the problem persists.`,
                [
                  {
                    text: 'OK',
                    style: 'default'
                  },
                  {
                    text: 'Contact Support',
                    style: 'default',
                    onPress: () => {
                      const supportURL = 'https://archiveszone.app/support'
                      Linking.openURL(supportURL).catch(() => {
                        Alert.alert('Error', 'Could not open support page')
                      })
                    }
                  }
                ]
              )
            }
          }
        }
      ]
    )
  }

  const handleManageSubscription = async () => {
    if (isLoadingPortal) return // Prevent multiple portal creation attempts
    
    // For now, show information about subscription management
    Alert.alert(
      'Manage Subscription',
      'To cancel or modify your subscription:\n\n1. Go to your email receipt from Archives\n2. Click "Manage Subscription" in the email\n3. Or contact support for assistance',
      [
        {
          text: 'Contact Support',
          onPress: () => {
            const supportURL = 'https://archiveszone.app/support'
            Linking.openURL(supportURL).catch(() => {
              Alert.alert('Error', 'Could not open support page')
            })
          }
        },
        {
          text: 'OK',
          style: 'cancel'
        }
      ]
    )
    
    // TODO: Implement full customer portal integration
    // This requires storing customer ID in user session during subscription creation
    /*
    try {
      setIsLoadingPortal(true)
      
      // Get customer ID from user metadata or database
      const customerId = user?.publicMetadata?.revenueCatCustomerId
      
      if (!customerId) {
        Alert.alert(
          'No Subscription Found',
          'You don\'t have an active subscription to manage.',
          [{ text: 'OK' }]
        )
        return
      }

      // Call customer portal API
      const response = await fetch('/api/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }
      
      const { url } = await response.json()
      
      // Close settings modal and open portal
      setShowSettingsModal(false)
      await Linking.openURL(url)
      
    } catch (error) {
      console.error('Portal creation error:', error)
      Alert.alert(
        'Error',
        'Unable to open subscription management. Please try again or contact support.',
        [{ text: 'OK' }]
      )
    } finally {
      setIsLoadingPortal(false)
    }
    */
  }

  const handlePrivacyPolicy = () => {
    setShowPrivacyModal(true)
  }

  const handleSupport = () => {
    const supportURL = 'https://archiveszone.app/support'
    Linking.openURL(supportURL).catch(() => {
      Alert.alert('Error', 'Could not open support page')
    })
  }

  const handleFAQ = () => {
    setShowFAQModal(true)
  }

  const toggleFAQ = (id: number) => {
    setExpandedFAQ(expandedFAQ === id ? null : id)
  }


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Header with Profile Title and Settings Button */}
        <View style={styles.header}>
          <Text style={styles.profileTitle}>Profile</Text>
          <TouchableOpacity 
            style={styles.settingsButton} 
            onPress={() => setShowSettingsModal(true)}
          >
            <MaterialIcons name="settings" size={24} color={ArchivesTheme.colors.mutedNavy} />
          </TouchableOpacity>
        </View>
        
        {/* Avatar Section - EXACT SwiftUI */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => setShowAvatarModal(true)}
          >
            <Image source={selectedAvatar.image} style={styles.avatarImage} />
            {/* Edit Icon Overlay */}
            <View style={styles.editIconContainer}>
              <MaterialIcons name="edit" size={20} color={ArchivesTheme.colors.creamWhite} />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.avatarName}>{selectedAvatar.name}</Text>
          <Text style={styles.avatarTitle}>{selectedAvatar.title}</Text>
          
        </View>

        {/* Modules Achievement Card */}
        {/* <View style={styles.achievementsSection}>
          <View style={styles.moduleAchievementCard}>
            <View style={styles.achievementBadge}>
              <Text style={styles.achievementNumber}>14</Text>
            </View>
            <Text style={styles.achievementText}>Modules finished!</Text>
            <View style={styles.achievementIcons}>
              <Image source={require('@/assets/images/icons/modules icon.png')} style={styles.largeModuleIcon} />
            </View>
          </View>
        </View> */}

        {/* Monthly Badges - EXACT SwiftUI */}
        {/* <View style={styles.badgesSection}>
          <Text style={styles.sectionTitle}>Monthly Badges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
            {MONTHLY_BADGES.map((badge) => (
              <View key={badge.id} style={styles.badgeContainer}>
                <Image source={badge.image} style={styles.badgeImage} />
                <Text style={styles.badgeLabel}>{badge.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View> */}

        {/* XP Achievements - EXACT SwiftUI */}
        {/* <View style={styles.xpAchievementsSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
            {XP_ACHIEVEMENTS.map((achievement) => (
              <View key={achievement.id} style={styles.achievementContainer}>
                <Image source={achievement.image} style={styles.achievementImage} />
              </View>
            ))}
          </ScrollView>
        </View> */}


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

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalContainer}>
            {/* Settings Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowSettingsModal(false)}
              >
                <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Settings</Text>
              <View style={styles.closeButtonPlaceholder} />
            </View>

            {/* Settings Options */}
            <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
              <View style={styles.settingsOptionsContainer}>
                
                {/* Privacy Policy */}
                <TouchableOpacity 
                  style={styles.settingsOption} 
                  onPress={() => {
                    setShowSettingsModal(false)
                    setTimeout(() => handlePrivacyPolicy(), 300) // Small delay for smooth transition
                  }}
                >
                  <View style={styles.settingsOptionIcon}>
                    <Ionicons name="shield-checkmark" size={24} color={ArchivesTheme.colors.persianOrange} />
                  </View>
                  <Text style={styles.settingsOptionText}>Privacy Policy</Text>
                  <Ionicons name="chevron-forward" size={20} color={ArchivesTheme.colors.mutedNavy} opacity={0.5} />
                </TouchableOpacity>

                {/* Support */}
                <TouchableOpacity 
                  style={styles.settingsOption} 
                  onPress={() => {
                    setShowSettingsModal(false)
                    handleSupport()
                  }}
                >
                  <View style={styles.settingsOptionIcon}>
                    <Ionicons name="help-circle" size={24} color={ArchivesTheme.colors.persianOrange} />
                  </View>
                  <Text style={styles.settingsOptionText}>Support</Text>
                  <Ionicons name="chevron-forward" size={20} color={ArchivesTheme.colors.mutedNavy} opacity={0.5} />
                </TouchableOpacity>

                {/* FAQ */}
                <TouchableOpacity 
                  style={styles.settingsOption} 
                  onPress={() => {
                    setShowSettingsModal(false)
                    handleFAQ()
                  }}
                >
                  <View style={styles.settingsOptionIcon}>
                    <Ionicons name="chatbubbles" size={24} color={ArchivesTheme.colors.persianOrange} />
                  </View>
                  <Text style={styles.settingsOptionText}>FAQ</Text>
                  <Ionicons name="chevron-forward" size={20} color={ArchivesTheme.colors.mutedNavy} opacity={0.5} />
                </TouchableOpacity>

                {/* Manage Subscription */}
                <TouchableOpacity 
                  style={styles.settingsOption} 
                  onPress={handleManageSubscription}
                >
                  <View style={styles.settingsOptionIcon}>
                    <MaterialIcons 
                      name="payment" 
                      size={24} 
                      color={ArchivesTheme.colors.persianOrange} 
                    />
                  </View>
                  <Text style={styles.settingsOptionText}>
                    Manage Subscription
                  </Text>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={ArchivesTheme.colors.mutedNavy} 
                    opacity={0.5} 
                  />
                </TouchableOpacity>

                {/* Delete Account */}
                <TouchableOpacity 
                  style={[
                    styles.settingsOption, 
                    styles.settingsOptionDanger,
                    isDeletingAccount && styles.settingsOptionDisabled
                  ]} 
                  onPress={() => {
                    if (!isDeletingAccount) {
                      handleDeleteAccount()
                    }
                  }}
                  disabled={isDeletingAccount}
                >
                  <View style={styles.settingsOptionIcon}>
                    <Ionicons 
                      name={isDeletingAccount ? "hourglass" : "trash"} 
                      size={24} 
                      color={isDeletingAccount ? "#999" : "#D32F2F"} 
                    />
                  </View>
                  <Text style={[
                    styles.settingsOptionText, 
                    styles.settingsOptionDangerText,
                    isDeletingAccount && styles.settingsOptionDisabledText
                  ]}>
                    {isDeletingAccount ? "Deleting Account..." : "Delete Account"}
                  </Text>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={isDeletingAccount ? "#999" : "#D32F2F"} 
                    opacity={0.5} 
                  />
                </TouchableOpacity>

              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalContainer}>
            {/* Privacy Policy Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowPrivacyModal(false)}
              >
                <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Privacy Policy</Text>
              <View style={styles.closeButtonPlaceholder} />
            </View>

            {/* Privacy Policy Content */}
            <ScrollView style={styles.privacyContent} showsVerticalScrollIndicator={true}>
              <Text style={styles.privacyText}>{PRIVACY_POLICY_CONTENT}</Text>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* FAQ Modal */}
      <Modal
        visible={showFAQModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFAQModal(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalContainer}>
            {/* FAQ Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowFAQModal(false)}
              >
                <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>FAQ</Text>
              <View style={styles.closeButtonPlaceholder} />
            </View>

            {/* FAQ Content */}
            <ScrollView style={styles.faqContainer} showsVerticalScrollIndicator={true}>
              {FAQ_DATA.map((faq, index) => (
                <View key={faq.id} style={styles.faqItem}>
                  <TouchableOpacity 
                    style={[
                      styles.faqQuestion,
                      expandedFAQ === faq.id && styles.faqQuestionExpanded
                    ]}
                    onPress={() => toggleFAQ(faq.id)}
                  >
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <View style={[
                      styles.faqToggle,
                      expandedFAQ === faq.id && styles.faqToggleExpanded
                    ]}>
                      <Ionicons 
                        name="chevron-down" 
                        size={16} 
                        color={ArchivesTheme.colors.mutedNavy}
                        style={{
                          transform: [{ rotate: expandedFAQ === faq.id ? '180deg' : '0deg' }]
                        }}
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {expandedFAQ === faq.id && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              ))}
              
              <View style={styles.faqFooter}>
                <Text style={styles.faqFooterText}>
                  Have more questions?{' '}
                  <Text 
                    style={styles.faqEmailLink}
                    onPress={() => {
                      const supportURL = 'https://archiveszone.app/support'
                      Linking.openURL(supportURL).catch(() => {
                        Alert.alert('Error', 'Could not open support page')
                      })
                    }}
                  >
                    Contact us here
                  </Text>
                </Text>
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
  
  // Header - Updated with Profile title and settings button
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20, // Increased top padding
    paddingBottom: 10, // Added bottom padding
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
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  avatarImage: {
    width: 190, // Increased size to 190
    height: 190,
    borderRadius: 95,
    resizeMode: 'cover',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ArchivesTheme.colors.persianOrange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarName: {
    fontFamily: 'Cormorant-Bold', // EXACT SwiftUI: .font(.custom("Cormorant", size: 24))
    fontSize: 24,
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
  
  // Modules Achievement Card
  moduleAchievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 0,
    paddingLeft: 16,
    paddingRight: 4,
    marginHorizontal: 10,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  achievementBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: ArchivesTheme.colors.mossGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  achievementNumber: {
    fontFamily: 'DM Sans',
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
  },
  achievementText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '500',
    color: ArchivesTheme.colors.persianOrange,
    flex: 1,
  },
  achievementIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 4,
  },
  moduleIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  largeModuleIcon: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },

  // XP Achievements - EXACT SwiftUI
  xpAchievementsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  achievementsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  achievementContainer: {
    marginRight: 16,
  },
  achievementImage: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
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
    fontFamily: 'Cormorant-Bold',
    fontSize: 24,
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
    fontFamily: 'Cormorant-Bold',
    fontSize: 16,
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

  // Settings Modal Styles
  settingsContent: {
    flex: 1,
    paddingTop: 10,
  },
  settingsOptionsContainer: {
    paddingHorizontal: 0,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingsOptionDanger: {
    backgroundColor: '#FFF5F5', // Light red background
  },
  settingsOptionDisabled: {
    backgroundColor: '#F5F5F5', // Gray background for disabled state
    opacity: 0.6,
  },
  settingsOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ArchivesTheme.colors.persianOrange + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingsOptionText: {
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy,
  },
  settingsOptionDangerText: {
    color: '#D32F2F', // Red text for danger option
  },
  settingsOptionDisabledText: {
    color: '#999', // Gray text for disabled state
  },

  // Privacy Policy Modal Styles
  privacyContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  privacyText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 22,
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'left',
    paddingBottom: 40,
  },

  // FAQ Modal Styles
  faqContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  faqItem: {
    marginBottom: 16,
  },
  faqQuestion: {
    backgroundColor: '#2A3441',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A4551',
  },
  faqQuestionExpanded: {
    backgroundColor: '#2A3441',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  faqQuestionText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    paddingRight: 16,
    lineHeight: 24,
  },
  faqToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ArchivesTheme.colors.persianOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqToggleExpanded: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
  },
  faqAnswer: {
    backgroundColor: '#2A3441',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#3A4551',
    padding: 20,
    paddingTop: 0,
  },
  faqAnswerText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 22,
    color: '#B8C5D1',
    textAlign: 'left',
  },
  faqFooter: {
    marginTop: 24,
    marginBottom: 40,
    padding: 20,
    backgroundColor: 'rgba(65, 66, 94, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(65, 66, 94, 0.2)',
  },
  faqFooterText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  faqEmailLink: {
    fontFamily: 'DM Sans',
    color: ArchivesTheme.colors.persianOrange,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
})