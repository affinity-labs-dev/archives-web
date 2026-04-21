// Profile Tab - EXACT replica of SwiftUI Profile.swift
// Matches the exact structure: historical avatars + stats + badges + achievements + settings

import ArchivesTheme from '@/constants/ArchivesTheme'
import { usePreferences } from '@/context/PreferencesContext'
import { useGamificationOrchestrator, useGamifiedProgress, useRewards } from '@/gamification'
import { AchievementDetailModal, AchievementUnlockAnimation } from '@/gamification/ui/achievement/AchievementGrid'
import { GrayscaleImage } from '@/gamification/ui/achievement/GrayscaleImage'
import AdventureCompleteScreen from '@/gamification/ui/celebrations/AdventureCompleteScreen'
import XPMilestoneScreen from '@/gamification/ui/celebrations/XPMilestoneScreen'
import GameHub from '@/gamification/ui/games/GameHub'
import { useAdventures } from '@/hooks/useAdventures'
import { analyticsService } from '@/services/AnalyticsService'
import { liveActivityManager } from '@/services/LiveActivityManager'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import React, { Fragment, useState } from 'react'
import { Alert, Dimensions, Image, Linking, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'

// Avatar image imports
import AlKhwarizmiAvatar from '@/assets/images/avatars/Al-Khwarizmi.png'
import FatimaAlFihriAvatar from '@/assets/images/avatars/Fatima-al-Fihri.png'
import IbnSinaAvicennaAvatar from '@/assets/images/avatars/Ibn-Sina-Avicenna.png'
import ZiryabAvatar from '@/assets/images/avatars/Ziryab.png'
import AlRaziAvatar from '@/assets/images/avatars/Al-Razi.png'
import IbnBattutaAvatar from '@/assets/images/avatars/Ibn-Battuta.png'
import LubnaOfCordobaAvatar from '@/assets/images/avatars/Lubna-of-Cordoba.png'
import MariamAlAsturlabiAvatar from '@/assets/images/avatars/Mariam-al-Asturlabi.png'
import ZaynabAlShahdaAvatar from '@/assets/images/avatars/Zaynab-al-Shahda.png'

// Badge image imports (XP badges)
import AchEarnedXP1 from '@/assets/images/badges/ACH_EarnedXP_1.png'
import AchEarnedXP2 from '@/assets/images/badges/ACH_EarnedXP_2.png'
import AchEarnedXP3 from '@/assets/images/badges/ACH_EarnedXP_3.png'
import AchEarnedXP4 from '@/assets/images/badges/ACH_EarnedXP_4.png'

// Monthly badge image imports (quiz images)
import MapImage from '@/assets/images/quiz-images/Map.png'
import EngineersImage from '@/assets/images/quiz-images/engineers.png'
import ExplorerImage from '@/assets/images/quiz-images/explorer.png'
import MosqueImage from '@/assets/images/quiz-images/mosque.png'
import NavigationImage from '@/assets/images/quiz-images/navigation.png'
import ScrollImage from '@/assets/images/quiz-images/scroll.png'
import TokenImage from '@/assets/images/quiz-images/token.png'
import WriterImage from '@/assets/images/quiz-images/writer.png'
import BilingualImage from '@/assets/images/quiz-images/Bilingual.png'
import ShipImage from '@/assets/images/quiz-images/ship.png'
import ReaderImage from '@/assets/images/quiz-images/Reader.png'
import BooksImage from '@/assets/images/quiz-images/books.png'

// Other image imports
import CamelImage from '@/assets/images/quiz-images/Camel.png'
import ModulesIconImage from '@/assets/images/icons/modules-icon.png'

const { width: screenWidth } = Dimensions.get('window')

// Helper to get avatar image - static mapping (database image_url → actual file)
const AVATAR_IMAGE_MAP: Record<string, any> = {
  'avatars/Al-Khwarizmi.png': AlKhwarizmiAvatar,
  'avatars/Fatima-al-Fihri.png': FatimaAlFihriAvatar,
  'avatars/ibn-sina-avicenna.png': IbnSinaAvicennaAvatar,
  'avatars/Ziryab.png': ZiryabAvatar,
  'avatars/Al-Razi.png': AlRaziAvatar,
  'avatars/Ibn-Battuta.png': IbnBattutaAvatar,
  'avatars/Lubna-of-Cordoba.png': LubnaOfCordobaAvatar,
  'avatars/Mariam-al-Asturlabi.png': MariamAlAsturlabiAvatar,
  'avatars/Zaynab-al-Shahda.png': ZaynabAlShahdaAvatar,
}

const getAvatarImage = (imageUrl: string) => {
  return AVATAR_IMAGE_MAP[imageUrl] || AVATAR_IMAGE_MAP['avatars/Al-Khwarizmi.png']
}

// Helper to get badge image - static mapping for require()
const BADGE_IMAGE_MAP: Record<string, any> = {
  'ACH_EarnedXP_1.png': AchEarnedXP1,
  'ACH_EarnedXP_2.png': AchEarnedXP2,
  'ACH_EarnedXP_3.png': AchEarnedXP3,
  'ACH_EarnedXP_4.png': AchEarnedXP4,
  // Monthly badges: 1-9 use quiz images, 10-12 use original Oct/Nov/Dec badges
  'ACH_MonthlyActive_1.png': MapImage,
  'ACH_MonthlyActive_2.png': EngineersImage,
  'ACH_MonthlyActive_3.png': ExplorerImage,
  'ACH_MonthlyActive_4.png': MosqueImage,
  'ACH_MonthlyActive_5.png': NavigationImage,
  'ACH_MonthlyActive_6.png': ScrollImage,
  'ACH_MonthlyActive_7.png': TokenImage,
  'ACH_MonthlyActive_8.png': WriterImage,
  'ACH_MonthlyActive_9.png': BilingualImage,
  'ACH_MonthlyActive_10.png': ShipImage,
  'ACH_MonthlyActive_11.png': ReaderImage,
  'ACH_MonthlyActive_12.png': BooksImage,
}

const getBadgeImage = (imagePath: string) => {
  return BADGE_IMAGE_MAP[imagePath]
}

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
    answer: "We're launching our beta version in Q4 2025. Join our waitlist to get early access and be among the first to experience gamified Islamic history!"
  },
  {
    id: 2,
    question: "Is it free?",
    answer: "Archives will offer a freemium model with core lessons available for free. Premium features like advanced quests, detailed progress tracking, and exclusive historical content will be available through a subscription plan."
  },
  {
    id: 3,
    question: "Who is Archives designed for?",
    answer: "Archives is designed for anyone curious about Islamic history, from students and educators to history enthusiasts of all ages. Our content is carefully crafted to be engaging and educational while remaining historically accurate."
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

// User progress type for Era 2+ (matching new_user_progress structure)
interface NewUserProgress {
  adventureId: string;
  moduleId: string;
  quizScore: number;
  quizCorrectAnswers?: number; // Actual correct answers (for XP calculation)
  isCompleted: boolean;
  quizCompleted: boolean;
  completedAt: string;
  era_id: number;
}

export default function ProfileTab() {
  const { signOut } = useAuth()
  const { user, isSignedIn } = useUser()
  const router = useRouter()
  const { moduleProgress, calculateTotalXP, calculateModulesCompleted, selectedEra } = useGamifiedProgress()
  const { backgroundMusicEnabled, soundEffectsEnabled, hapticsEnabled, setBackgroundMusicEnabled, setSoundEffectsEnabled, setHapticsEnabled } = usePreferences()

  // Fallback: Ensure Clerk user ID is set in PostHog (production safety)
  React.useEffect(() => {
    if (isSignedIn && user) {
      analyticsService.setUserProperties(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      });
      console.log('✅ [ProfileTab] User properties set for Clerk ID:', user.id);
    }
  }, [isSignedIn, user]);
  const {
    avatars,
    badges,
    unlockedAvatars,
    unlockedBadges,
    selectedAvatar,
    setSelectedAvatar,
    isUnlocked,
    loading: rewardsLoading
  } = useRewards()
  const {
    achievements,
    unlockedCount,
    totalCount,
    getProgress,
    simulateNextDay, // TEST FUNCTION
  } = useGamificationOrchestrator()

  // Achievement detail modal state
  const [selectedAchievement, setSelectedAchievement] = React.useState<(typeof achievements)[0] | null>(null)
  const [showUnlockAnimation, setShowUnlockAnimation] = React.useState(false)
  const [unlockAchievement, setUnlockAchievement] = React.useState<(typeof achievements)[0] | null>(null)
  const [showBadgesModal, setShowBadgesModal] = React.useState(false)


  // Load Era 2+ progress from AsyncStorage
  const [newUserProgress, setNewUserProgress] = React.useState<NewUserProgress[]>([])

  // Reload progress every time screen is focused (to reflect debug panel changes)
  useFocusEffect(
    React.useCallback(() => {
      const loadNewProgress = async () => {
        try {
          const data = await AsyncStorage.getItem('new_user_progress')
          if (data) {
            const parsed: NewUserProgress[] = JSON.parse(data)
            setNewUserProgress(parsed)
            console.log('📊 [Profile] Loaded Era 2+ progress:', parsed.length, 'modules')
          }
        } catch (error) {
          console.error('❌ [Profile] Error loading Era 2+ progress:', error)
        }
      }
      loadNewProgress()
    }, [])
  )

  // Load stored totalXP from AsyncStorage (optimized to avoid recalculation)
  const [storedTotalXP, setStoredTotalXP] = React.useState<number | null>(null)

  // Reload totalXP when screen is focused or progress changes
  React.useEffect(() => {
    async function loadTotalXP() {
      try {
        const xpData = await AsyncStorage.getItem('totalXP')
        if (xpData) {
          const parsed = JSON.parse(xpData)
          setStoredTotalXP(parsed)
          console.log(`✅ [Profile] Loaded stored totalXP: ${parsed}`)
        } else {
          console.log('⚠️ [Profile] No stored totalXP found, will calculate')
        }
      } catch (error) {
        console.error('❌ [Profile] Error loading stored totalXP:', error)
      }
    }
    loadTotalXP()
  }, [moduleProgress, newUserProgress]) // Reload when progress changes

  // Use stored totalXP if available, otherwise calculate (backwards compatibility)
  const totalXP = React.useMemo(() => {
    if (storedTotalXP !== null) {
      return storedTotalXP
    }
    // Hook function uses internal state - no arguments needed
    return calculateTotalXP() || 0
  }, [storedTotalXP, moduleProgress, newUserProgress, calculateTotalXP])

  // Get current avatar (use first avatar as default if none selected)
  const currentAvatar = selectedAvatar || avatars[0]

  // Calculate modules finished using centralized function (BOTH Era 1 and Era 2+)
  const modulesFinished = React.useMemo(() => {
    // Hook function uses internal state - no arguments needed
    return calculateModulesCompleted()
  }, [moduleProgress, newUserProgress, calculateModulesCompleted])

  // Get user's display name from Clerk (firstName + first letter of lastName)
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName.charAt(0)}.`
    : user?.firstName || 'User'

  // Get joined year from Clerk
  const joinedYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear()

  // Get XP badges from database - Calculate earned status locally based on totalXP
  // Get ALL XP badges - filter by unlock_metric (dynamic, works with any number of badges)
  const xpBadges = badges
    .filter(b => b.unlock_metric === 'xp')
    .map(b => {
      // Calculate earned status locally based on totalXP (single source of truth)
      const earned = totalXP >= (b.unlock_threshold || 0)

      return {
        ...b,
        earned: earned,
        imagePath: b.image_url
      }
    })
    .sort((a, b) => (a.unlock_threshold || 0) - (b.unlock_threshold || 0)) // Sort by THRESHOLD (dynamic!)

  // Calculate XP progress - show position on FULL scale (matches node positioning)
  const maxThreshold = xpBadges[xpBadges.length - 1]?.unlock_threshold || 1
  const xpProgress = Math.min((totalXP / maxThreshold) * 100, 100)

  // Monthly badges - Hardcoded (no Supabase dependency)
  // Order: Oct-Dec (last year) first, then Jan-Sep (current year)
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const currentYear = new Date().getFullYear()
  const monthlyBadges = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(month => {
    // Check if user completed a quiz in this specific month+year
    // Oct/Nov/Dec = last year, Jan-Sep = current year (dynamic)
    const badgeYear = month >= 10 ? currentYear - 1 : currentYear

    const earned = moduleProgress.some(m => {
      if (!m.quizScore || !m.unlockedAt) return false
      const completionYear = parseInt(m.unlockedAt.substring(0, 4), 10)
      const completionMonth = parseInt(m.unlockedAt.substring(5, 7), 10)
      const matches = completionYear === badgeYear && completionMonth === month

      if (matches) {
        console.log(`✅ Badge ${month} earned! Quiz completed: ${m.unlockedAt}`)
      }

      return matches
    })

    // Extra check for January - log if earned without any modules
    if (month === 1 && earned && moduleProgress.length === 0) {
      console.error('🚨 ISSUE: January badge earned but NO modules in progress!')
    }

    if (month === 1 || month === 10 || month === 11 || month === 12) {
      console.log(`📅 Month ${month} badge - Looking for ${badgeYear}-${String(month).padStart(2, '0')}, found: ${earned}`)
    }

    if (month === 10) {
      console.log(`📊 All timestamps in moduleProgress:`, moduleProgress.map(m => m.unlockedAt))
    }

    return {
      id: `monthly_${month}`,
      month,
      display_text: MONTH_NAMES[month - 1],  // Display month name only (no year)
      imagePath: `ACH_MonthlyActive_${month}.png`,
      earned,
      level: month
    }
  })

  console.log('📛 [Profile] Monthly badges count:', monthlyBadges.length)

  // Profile state - EXACT SwiftUI values
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showFAQModal, setShowFAQModal] = useState(false)
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  // Temporary test screen states
  const [showXPTest, setShowXPTest] = useState(false)
  const [showAdventureTest, setShowAdventureTest] = useState(false)
  const [testAdventureIndex, setTestAdventureIndex] = useState(0)
  const [showGameHub, setShowGameHub] = useState(false)

  // Map context era to Supabase era_id format for test button
  const ERA_ID_MAP: Record<string, string> = {
    'riseOfIslam': 'rise_of_islam',
    'umayyad': 'umayyad',
    'abbasid': 'abbasid',
    'ottoman': 'ottoman',
    'fatimid': 'fatimid',
  }
  const supabaseEraId = selectedEra ? (ERA_ID_MAP[selectedEra] || selectedEra) : ''

  // Fetch adventures from ALL eras for test button
  const { adventures: riseOfIslamAdv } = useAdventures('rise_of_islam')
  const { adventures: umayyadAdv } = useAdventures('umayyad')
  const { adventures: womenOfIslamAdv } = useAdventures('women_of_islam')

  // Combine all adventures from all eras
  const testAdventures = [
    ...riseOfIslamAdv,
    ...umayyadAdv,
    ...womenOfIslamAdv,
  ]
  const adventuresLoading = testAdventures.length === 0

  // Track page views with focus/blur
  useFocusEffect(
    React.useCallback(() => {
      console.log('📊 [ProfileTab] Screen focused - starting page view tracking')
      analyticsService.startPageView('profile', '/profile')

      return () => {
        console.log('📊 [ProfileTab] Screen blurred - ending page view tracking')
        analyticsService.endPageView('profile')
      }
    }, [])
  )

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      console.log('👋 User logging out - clearing all local data...')

      // AFF-151: Track session out BEFORE clearing data (so event is attributed to the user)
      const hadSelectedEra = !!(await AsyncStorage.getItem('selected_era'))
      analyticsService.trackUserSessionOut({
        trigger: 'manual_profile',
        session_duration_seconds: null,
        had_selected_era: hadSelectedEra,
      })

      // AFF-151: Prevent _layout.tsx from firing a duplicate clerk_session_ended event
      analyticsService.manualSignOutInProgress = true

      await liveActivityManager.forceEndAll()

      // AFF-309: Sign out via Clerk FIRST (needs token from AsyncStorage to revoke session on server),
      // THEN clear local data. Previous order (clear → signOut) wiped the token before Clerk could use it.
      await signOut()
      console.log('✅ Clerk sign out complete')

      // Wait for React to finish the re-render cascade triggered by signOut().
      // Without this delay, AsyncStorage.clear() races with provider unmount/remount
      // on Android Fabric, causing "child already has a parent" IllegalStateException
      // when Modal components get re-parented during rapid state changes.
      await new Promise(resolve => setTimeout(resolve, 300))

      // Now safe to clear all local data (token already revoked)
      await AsyncStorage.clear()
      console.log('✅ All local data cleared')
      router.replace('/onboarding-video')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleAvatarSelection = (avatar: any) => {
    Haptics.selectionAsync()
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
        'new_user_progress',      // Rise of Islam progress
        'totalXP',                 // XP cache
        'user_preferences',
        'user_unlockables_data',   // Rewards/badges
      ])
    } catch (error) {
      console.error('Error clearing user data:', error)
    }
  }

  // DEV HELPER: Clear streak + Today screen AsyncStorage for testing
  const clearStreakAsyncStorage = async () => {
    try {
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys()

      // Filter for Today screen progress keys (format: @today_progress_${questId})
      const todayProgressKeys = allKeys.filter(key => key.startsWith('@today_progress_'))

      // Filter for adventure complete celebration flags (format: hasSeenAdventureComplete_${adventureId})
      const adventureCompleteKeys = allKeys.filter(key => key.startsWith('hasSeenAdventureComplete_'))

      // Remove streak data + all Today screen progress + celebration flags
      const keysToRemove = [
        '@last_streak_completion_date',
        '@frozen_streak_data',
        '@daily_story_end_shown_date',
        ...todayProgressKeys,
        ...adventureCompleteKeys
      ]

      await AsyncStorage.multiRemove(keysToRemove)
      console.log('✅ Streak + Today screen AsyncStorage cleared!', {
        streakKeys: ['@last_streak_completion_date', '@frozen_streak_data'],
        celebrationKeys: ['@daily_story_end_shown_date'],
        todayKeys: todayProgressKeys,
        adventureKeys: adventureCompleteKeys
      })
      Alert.alert('Dev Helper', `Cleared ${keysToRemove.length} keys:\n- Streak data\n- Celebration flags\n- Today progress (${todayProgressKeys.length} quests)\n- Adventure complete flags (${adventureCompleteKeys.length})`)
    } catch (error) {
      console.error('Error clearing streak data:', error)
      Alert.alert('Error', 'Failed to clear async storage')
    }
  }

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
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
              // Calculate account age in days
              const accountAgeDays = user.createdAt
                ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                : undefined

              // Calculate total adventures completed
              // Umayyad Dynasty: Adventure is complete when all 3 modules are done
              const umayyedAdventuresComplete = [1, 2, 3, 4, 5].filter(advId => {
                const modulesForAdventure = moduleProgress.filter(m => m.adventureId === advId)
                return modulesForAdventure.length === 3 && modulesForAdventure.every(m => m.isCompleted)
              }).length

              // ROI: Adventure is complete when module is completed
              const roiAdventuresComplete = newUserProgress.filter(m => m.isCompleted).length

              const totalAdventuresCompleted = umayyedAdventuresComplete + roiAdventuresComplete

              // AFF-151: Track session out for account deletion
              const hadSelectedEra = !!(await AsyncStorage.getItem('selected_era'))
              analyticsService.trackUserSessionOut({
                trigger: 'account_deleted',
                session_duration_seconds: null,
                had_selected_era: hadSelectedEra,
              })

              // AFF-151: Prevent _layout.tsx from firing a duplicate clerk_session_ended event
              analyticsService.manualSignOutInProgress = true

              // Track account deletion event BEFORE clearing data
              analyticsService.trackUserAccountDeleted({
                account_age_days: accountAgeDays,
                total_xp: totalXP,
                adventures_completed: totalAdventuresCompleted,
              })

              console.log('📊 [Analytics] User Account Deleted:', {
                account_age_days: accountAgeDays,
                total_xp: totalXP,
                adventures_completed: totalAdventuresCompleted,
              })

              await liveActivityManager.forceEndAll()

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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
    Haptics.selectionAsync()
    setExpandedFAQ(expandedFAQ === id ? null : id)
  }

  const renderTestButtons = () => {
    if (!__DEV__) return null

    return (
      <Fragment>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => setShowXPTest(true)}
        >
          <Text style={styles.testButtonText}>XP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.testButton, adventuresLoading && styles.testButtonDisabled]}
          onPress={() => setShowAdventureTest(true)}
          disabled={adventuresLoading}
        >
          <Text style={styles.testButtonText}>ADV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => setShowGameHub(true)}
        >
          <Text style={styles.testButtonText}>GAME</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => router.push('/live-activity-test')}
        >
          <Text style={styles.testButtonText}>LA</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => clearStreakAsyncStorage()}
        >
          <Ionicons name="trash-outline" size={24} color={ArchivesTheme.colors.creamWhite} />
        </TouchableOpacity>
      </Fragment>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: 20 }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Header with Profile Title and Settings Button */}
        <View style={styles.header}>
          <Text style={styles.profileTitle} allowFontScaling={false}>Profile</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Temporary test buttons */}
            {renderTestButtons()}
            
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setShowSettingsModal(true)
            }}
            >
              <Ionicons name="settings-outline" size={28} color={ArchivesTheme.colors.persianOrange} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Avatar Section - EXACT SwiftUI */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            setShowAvatarModal(true)
          }}
          >
            <Image source={getAvatarImage(currentAvatar?.image_url || '')} style={styles.avatarImage} />
            {/* Edit Icon Overlay */}
            <View style={styles.editIconContainer}>
              <MaterialIcons name="edit" size={20} color={ArchivesTheme.colors.creamWhite} />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName} allowFontScaling={false}>{displayName}</Text>
          <Text style={styles.avatarSubtitle} allowFontScaling={false}>{currentAvatar?.display_text} • {currentAvatar?.subtitle}</Text>
          <Text style={styles.joinedText} allowFontScaling={false}>Joined {joinedYear}</Text>

        </View>

        {/* Modules Achievement Card */}
        <View style={styles.achievementsSection}>
          <View style={styles.moduleAchievementCard}>
            <View style={styles.achievementBadge}>
              <Text style={styles.achievementNumber} allowFontScaling={false}>{modulesFinished}</Text>
            </View>
            <Text style={styles.achievementText} allowFontScaling={false}>Modules finished!</Text>
            <View style={styles.achievementIcons}>
              <Image source={ModulesIconImage} style={styles.largeModuleIcon} />
            </View>
          </View>
        </View>

        {/* Monthly Badges - EXACT SwiftUI */}
        <View style={styles.badgesSection}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>Monthly Badges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
            {monthlyBadges.map((badge) => {
              return (
                <View key={badge.id} style={styles.badgeContainer}>
                  <View style={styles.badgeImageContainer}>
                    <View style={styles.badgeWhiteBg} />
                    <GrayscaleImage
                      source={getBadgeImage(badge.imagePath)}
                      style={styles.badgeImage}
                      width={styles.badgeImage.width}
                      height={styles.badgeImage.height}
                      resizeMode="contain"
                      grayscale={!badge.earned}
                    />
                  </View>
                  <View style={badge.earned ? styles.badgeLabelContainerEarned : styles.badgeLabelContainerLocked}>
                    <Text style={styles.badgeLabel} allowFontScaling={false}>{badge.display_text}</Text>
                  </View>
                </View>
              )
            })}
          </ScrollView>
        </View>


        {/* Achievements Section */}
        <View style={styles.achievementsSection}>
          <TouchableOpacity
            style={styles.achievementsHeader}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Clear any existing achievement modal states before opening
              setSelectedAchievement(null);
              setUnlockAchievement(null);
              setShowUnlockAnimation(false);
              setShowBadgesModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]} allowFontScaling={false}>Achievements</Text>
            <Text style={styles.achievementsCount} allowFontScaling={false}>{unlockedCount}/{totalCount}</Text>
          </TouchableOpacity>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.achievementsScroll}
            contentContainerStyle={styles.achievementsScrollContent}
          >
            {achievements.map((achievement) => (
              <TouchableOpacity
                key={achievement.id}
                style={styles.achievementCard}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Clear all states first to prevent showing wrong achievement
                  setSelectedAchievement(null);
                  setUnlockAchievement(null);
                  setShowUnlockAnimation(false);

                  // Then set the correct achievement after a brief delay
                  setTimeout(() => {
                    if (achievement.unlocked) {
                      setUnlockAchievement(achievement);
                      setShowUnlockAnimation(true);
                    } else {
                      setSelectedAchievement(achievement);
                    }
                  }, 50);
                }}
              >
                <View style={styles.achievementIconContainer}>
                  <GrayscaleImage
                    source={achievement.image || CamelImage}
                    style={styles.achievementImage}
                    width={styles.achievementImage.width}
                    height={styles.achievementImage.height}
                    resizeMode="contain"
                    grayscale={!achievement.unlocked}
                  />
                </View>
                <Text style={[
                  styles.achievementName,
                  !achievement.unlocked && styles.achievementNameLocked
                ]} allowFontScaling={false}>
                  {achievement.name}
                </Text>
                {/* {achievement.unlocked ? (
                  <View style={[styles.achievementUnlockedBadge, { backgroundColor: achievement.color }]}>
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                ) : (
                  <View style={styles.achievementProgressContainer}>
                    <View style={styles.achievementProgressBar}>
                      <View style={[
                        styles.achievementProgressFill,
                        { width: `${getProgress(achievement.id)}%`, backgroundColor: achievement.color }
                      ]} />
                    </View>
                  </View>
                )} */}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Learning Preferences */}
        <View style={styles.preferencesSection}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>Learning Preferences</Text>

          {/* Daily Goal - Locked */}
          <View style={styles.preferenceCard}>
            <View style={styles.preferenceLeft}>
              <MaterialIcons name="schedule" size={24} color={ArchivesTheme.colors.persianOrange} />
              <Text style={styles.preferenceLabel} allowFontScaling={false}>Daily goal</Text>
            </View>
            <View style={styles.preferenceRight}>
              <Text style={styles.preferenceValue} allowFontScaling={false}>10 mins</Text>
              <MaterialIcons name="lock" size={20} color={ArchivesTheme.colors.mutedNavy} opacity={0.3} />
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText} allowFontScaling={false}>Sign Out</Text>
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
                style={styles.backButton}
                onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setShowAvatarModal(false)
              }}
              >
                <Ionicons name="chevron-back" size={28} color={ArchivesTheme.colors.mutedNavy} />
              </TouchableOpacity>
              <Text style={styles.modalTitle} allowFontScaling={false}>Profile</Text>
              <View style={styles.closeButtonPlaceholder} />
            </View>

            {/* Avatar Grid */}
            <ScrollView style={styles.avatarGrid} showsVerticalScrollIndicator={false}>
              <View style={styles.avatarGridContainer}>
                {avatars.map((avatar) => {
                  const isLocked = !isUnlocked(avatar.id)

                  return (
                    <TouchableOpacity
                      key={avatar.id}
                      style={styles.avatarGridItem}
                      onPress={() => {
                        if (!isLocked) {
                          handleAvatarSelection(avatar)
                        } else {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
                        }
                      }}
                      disabled={isLocked}
                    >
                      {/* Unlock message above avatar */}
                      {isLocked && (
                        <Text style={styles.unlockMessage} allowFontScaling={false}>{avatar.unlock_condition}</Text>
                      )}

                      <View style={[
                        styles.avatarGridImageContainer,
                        avatar.id === currentAvatar?.id && styles.avatarGridSelected,
                        isLocked && styles.avatarGridLocked
                      ]}>
                        <Image
                          source={getAvatarImage(avatar.image_url)}
                          style={[
                            styles.avatarGridImage,
                            isLocked && styles.avatarGridImageLocked
                          ]}
                        />

                        {/* Lock icon overlay */}
                        {isLocked && (
                          <View style={styles.lockIconContainer}>
                            <Ionicons name="lock-closed" size={32} color={ArchivesTheme.colors.mutedNavy} />
                          </View>
                        )}
                      </View>

                      <Text style={[
                        styles.avatarGridName,
                        isLocked && styles.avatarGridNameLocked
                      ]} allowFontScaling={false}>{avatar.display_text}</Text>
                      <Text style={[
                        styles.avatarGridTitle,
                        isLocked && styles.avatarGridTitleLocked
                      ]} allowFontScaling={false}>{avatar.subtitle}</Text>
                    </TouchableOpacity>
                  )
                })}
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
                onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setShowSettingsModal(false)
              }}
              >
                <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
              </TouchableOpacity>
              <Text style={styles.modalTitle} allowFontScaling={false}>Settings</Text>
              <View style={styles.closeButtonPlaceholder} />
            </View>

            {/* Settings Options */}
            <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
              <View style={styles.settingsOptionsContainer}>

                {/* Background Music Toggle */}
                <View style={styles.settingsToggleRow}>
                  <View style={styles.settingsOptionIcon}>
                    <Ionicons name="musical-notes" size={24} color={ArchivesTheme.colors.persianOrange} />
                  </View>
                  <View style={styles.settingsToggleTextContainer}>
                    <Text style={styles.settingsOptionText} allowFontScaling={false}>Background Music</Text>
                    <Text style={styles.settingsOptionSubtext} allowFontScaling={false}>Ambient music during lessons</Text>
                  </View>
                  <Switch
                    value={backgroundMusicEnabled}
                    onValueChange={setBackgroundMusicEnabled}
                    trackColor={{ false: '#E0E0E0', true: ArchivesTheme.colors.persianOrange }}
                    ios_backgroundColor="#E0E0E0"
                  />
                </View>

                {/* Sound Effects Toggle */}
                <View style={styles.settingsToggleRow}>
                  <View style={styles.settingsOptionIcon}>
                    <Ionicons name="volume-high" size={24} color={ArchivesTheme.colors.persianOrange} />
                  </View>
                  <View style={styles.settingsToggleTextContainer}>
                    <Text style={styles.settingsOptionText} allowFontScaling={false}>Sound Effects</Text>
                    <Text style={styles.settingsOptionSubtext} allowFontScaling={false}>Quiz feedback and celebrations</Text>
                  </View>
                  <Switch
                    value={soundEffectsEnabled}
                    onValueChange={setSoundEffectsEnabled}
                    trackColor={{ false: '#E0E0E0', true: ArchivesTheme.colors.persianOrange }}
                    ios_backgroundColor="#E0E0E0"
                  />
                </View>

                {/* Vibration Toggle */}
                <View style={styles.settingsToggleRow}>
                  <View style={styles.settingsOptionIcon}>
                    <Ionicons name="phone-portrait" size={24} color={ArchivesTheme.colors.persianOrange} />
                  </View>
                  <View style={styles.settingsToggleTextContainer}>
                    <Text style={styles.settingsOptionText} allowFontScaling={false}>Vibration</Text>
                    <Text style={styles.settingsOptionSubtext} allowFontScaling={false}>Haptic feedback</Text>
                  </View>
                  <Switch
                    value={hapticsEnabled}
                    onValueChange={setHapticsEnabled}
                    trackColor={{ false: '#E0E0E0', true: ArchivesTheme.colors.persianOrange }}
                    ios_backgroundColor="#E0E0E0"
                  />
                </View>

                {/* Divider */}
                <View style={styles.settingsDivider} />

                {/* TEST BUTTON - Dev mode only */}
                {__DEV__ && (
                  <TouchableOpacity
                    style={[styles.settingsOption, { backgroundColor: '#FFF9E6' }]}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      console.log('🧪 [BUTTON] Test button pressed! Starting streak test...')
                      await simulateNextDay()
                    }}
                  >
                    <View style={styles.settingsOptionIcon}>
                      <Ionicons name="flask" size={24} color="#FFA500" />
                    </View>
                    <Text style={[styles.settingsOptionText, { color: '#FFA500' }]}>TEST: Simulate Next Day (Increment Streak)</Text>
                    <Ionicons name="chevron-forward" size={20} color="#FFA500" opacity={0.5} />
                  </TouchableOpacity>
                )}

                {/* Design Playground - Dev mode only */}
                {__DEV__ && (
                  <TouchableOpacity
                    style={[styles.settingsOption, { backgroundColor: '#F0EAFF' }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setShowSettingsModal(false)
                      setTimeout(() => router.push('/playground'), 300)
                    }}
                  >
                    <View style={styles.settingsOptionIcon}>
                      <Ionicons name="color-palette" size={24} color="#3E2368" />
                    </View>
                    <Text style={[styles.settingsOptionText, { color: '#3E2368' }]}>Design Playground</Text>
                    <Ionicons name="chevron-forward" size={20} color="#3E2368" opacity={0.5} />
                  </TouchableOpacity>
                )}

                {/* UI Primitives Playground - Dev mode only */}
                {__DEV__ && (
                  <TouchableOpacity
                    style={[styles.settingsOption, { backgroundColor: '#E5F0FF' }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setShowSettingsModal(false)
                      setTimeout(() => router.push('/ui-playground'), 300)
                    }}
                  >
                    <View style={styles.settingsOptionIcon}>
                      <Ionicons name="cube" size={24} color="#1E3C88" />
                    </View>
                    <Text style={[styles.settingsOptionText, { color: '#1E3C88' }]}>UI Primitives Playground</Text>
                    <Ionicons name="chevron-forward" size={20} color="#1E3C88" opacity={0.5} />
                  </TouchableOpacity>
                )}

                {/* Onboarding V2 — Phase 2 - Dev mode only */}
                {__DEV__ && (
                  <TouchableOpacity
                    style={[styles.settingsOption, { backgroundColor: '#FFF0E5' }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setShowSettingsModal(false)
                      setTimeout(() => router.push('/onboarding-step-1' as never), 300)
                    }}
                  >
                    <View style={styles.settingsOptionIcon}>
                      <Ionicons name="rocket" size={24} color="#C99151" />
                    </View>
                    <Text style={[styles.settingsOptionText, { color: '#C99151' }]}>Onboarding V2 — Hero</Text>
                    <Ionicons name="chevron-forward" size={20} color="#C99151" opacity={0.5} />
                  </TouchableOpacity>
                )}

                {/* Privacy Policy */}
                <TouchableOpacity 
                  style={styles.settingsOption} 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setShowSettingsModal(false)
                    setTimeout(() => handlePrivacyPolicy(), 300) // Small delay for smooth transition
                  }}
                >
                  <View style={styles.settingsOptionIcon}>
                    <Ionicons name="shield-checkmark" size={24} color={ArchivesTheme.colors.persianOrange} />
                  </View>
                  <Text style={styles.settingsOptionText} allowFontScaling={false}>Privacy Policy</Text>
                  <Ionicons name="chevron-forward" size={20} color={ArchivesTheme.colors.mutedNavy} opacity={0.5} />
                </TouchableOpacity>

                {/* Support */}
                <TouchableOpacity 
                  style={styles.settingsOption} 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setShowSettingsModal(false)
                    handleSupport()
                  }}
                >
                  <View style={styles.settingsOptionIcon}>
                    <Ionicons name="help-circle" size={24} color={ArchivesTheme.colors.persianOrange} />
                  </View>
                  <Text style={styles.settingsOptionText} allowFontScaling={false}>Support</Text>
                  <Ionicons name="chevron-forward" size={20} color={ArchivesTheme.colors.mutedNavy} opacity={0.5} />
                </TouchableOpacity>

                {/* FAQ */}
                <TouchableOpacity 
                  style={styles.settingsOption} 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setShowSettingsModal(false)
                    handleFAQ()
                  }}
                >
                  <View style={styles.settingsOptionIcon}>
                    <Ionicons name="chatbubbles" size={24} color={ArchivesTheme.colors.persianOrange} />
                  </View>
                  <Text style={styles.settingsOptionText} allowFontScaling={false}>FAQ</Text>
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
                  <Text style={styles.settingsOptionText} allowFontScaling={false}>
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
                  ]} allowFontScaling={false}>
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
                onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setShowPrivacyModal(false)
              }}
              >
                <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
              </TouchableOpacity>
              <Text style={styles.modalTitle} allowFontScaling={false}>Privacy Policy</Text>
              <View style={styles.closeButtonPlaceholder} />
            </View>

            {/* Privacy Policy Content */}
            <ScrollView style={styles.privacyContent} showsVerticalScrollIndicator={true}>
              <Text style={styles.privacyText} allowFontScaling={false}>{PRIVACY_POLICY_CONTENT}</Text>
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
                onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setShowFAQModal(false)
              }}
              >
                <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
              </TouchableOpacity>
              <Text style={styles.modalTitle} allowFontScaling={false}>FAQ</Text>
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
                    <Text style={styles.faqQuestionText} allowFontScaling={false}>{faq.question}</Text>
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
                      <Text style={styles.faqAnswerText} allowFontScaling={false}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              ))}
              
              <View style={styles.faqFooter}>
                <Text style={styles.faqFooterText} allowFontScaling={false}>
                  Have more questions?{' '}
                  <Text
                    style={styles.faqEmailLink}
                    allowFontScaling={false}
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

      {/* All Badges Modal */}
      <Modal
        visible={showBadgesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowBadgesModal(false);
          setSelectedAchievement(null);
          setUnlockAchievement(null);
          setShowUnlockAnimation(false);
        }}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowBadgesModal(false);
                  setSelectedAchievement(null);
                  setUnlockAchievement(null);
                  setShowUnlockAnimation(false);
                }}
              >
                <Ionicons name="chevron-back" size={28} color={ArchivesTheme.colors.mutedNavy} />
              </TouchableOpacity>
              <Text style={styles.modalTitle} allowFontScaling={false}>Achievements</Text>
              <View style={styles.closeButtonPlaceholder} />
            </View>

            {/* Badges Grid */}
            <ScrollView style={styles.badgesModalGrid} showsVerticalScrollIndicator={false}>
              <View style={styles.badgesModalContainer}>
                {achievements
                  .sort((a, b) => {
                    // Sort: unlocked first, then by unlock order
                    if (a.unlocked && !b.unlocked) return -1;
                    if (!a.unlocked && b.unlocked) return 1;
                    return 0;
                  })
                  .map((achievement) => (
                  <TouchableOpacity
                    key={achievement.id}
                    style={styles.badgeModalWrapper}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      // Clear all states first to prevent showing wrong achievement
                      setSelectedAchievement(null);
                      setUnlockAchievement(null);
                      setShowUnlockAnimation(false);

                      // Then set the correct achievement after a brief delay
                      setTimeout(() => {
                        if (achievement.unlocked) {
                          setUnlockAchievement(achievement);
                          setShowUnlockAnimation(true);
                        } else {
                          setSelectedAchievement(achievement);
                        }
                      }, 50);
                    }}
                  >
                    <View style={styles.badgeModalIconContainer} pointerEvents="none">
                      <GrayscaleImage
                        source={achievement.image || CamelImage}
                        style={styles.badgeModalImage}
                        width={100}
                        height={100}
                        resizeMode="contain"
                        grayscale={!achievement.unlocked}
                      />
                    </View>
                    <View style={styles.badgeModalItem} pointerEvents="none">
                      <Text style={[
                        styles.badgeModalName,
                        !achievement.unlocked && styles.badgeModalNameLocked
                      ]} allowFontScaling={false}>
                        {achievement.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Achievement modals - rendered inside All Achievements grid */}
          <AchievementDetailModal
            visible={selectedAchievement !== null}
            achievement={selectedAchievement}
            progress={selectedAchievement ? getProgress(selectedAchievement.id) : 0}
            onClose={() => setSelectedAchievement(null)}
          />

          {unlockAchievement && (
            <AchievementUnlockAnimation
              visible={showUnlockAnimation}
              achievement={unlockAchievement}
              autoDismiss={false}
              onDismiss={() => {
                setShowUnlockAnimation(false);
                setUnlockAchievement(null);
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Achievement modals - rendered for profile section (when grid is closed) */}
      {!showBadgesModal && (
        <>
          <AchievementDetailModal
            visible={selectedAchievement !== null}
            achievement={selectedAchievement}
            progress={selectedAchievement ? getProgress(selectedAchievement.id) : 0}
            onClose={() => setSelectedAchievement(null)}
          />

          {unlockAchievement && (
            <AchievementUnlockAnimation
              visible={showUnlockAnimation}
              achievement={unlockAchievement}
              autoDismiss={false}
              onDismiss={() => {
                setShowUnlockAnimation(false);
                setUnlockAchievement(null);
              }}
            />
          )}
        </>
      )}


      {/* Temporary Test Screens */}
      {showXPTest && (
        <Modal visible={showXPTest} animationType="slide" presentationStyle="fullScreen">
          <XPMilestoneScreen />
          <TouchableOpacity
            style={{ position: 'absolute', top: 50, right: 20, backgroundColor: 'white', padding: 10, borderRadius: 8 }}
            onPress={() => setShowXPTest(false)}
          >
            <Text allowFontScaling={false}>Close</Text>
          </TouchableOpacity>
        </Modal>
      )}

      {showAdventureTest && testAdventures.length > 0 && (
        <Modal visible={showAdventureTest} animationType="slide" presentationStyle="fullScreen">
          <View style={{ flex: 1 }}>
            <AdventureCompleteScreen
              adventure={testAdventures[testAdventureIndex]}
              totalBadges={3}
              onContinue={() => setShowAdventureTest(false)}
              onClose={() => setShowAdventureTest(false)}
            />

            {/* Navigation Overlay */}
            <View style={{
              position: 'absolute',
              bottom: 30,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 20,
              zIndex: 1000,
            }}>
              <TouchableOpacity
                onPress={() => setTestAdventureIndex(prev => Math.max(0, prev - 1))}
                disabled={testAdventureIndex === 0}
                style={{
                  backgroundColor: testAdventureIndex === 0 ? '#CCC' : ArchivesTheme.colors.persianOrange,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }} allowFontScaling={false}>← Previous</Text>
              </TouchableOpacity>

              <View style={{
                backgroundColor: 'white',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                alignItems: 'center',
              }}>
                <Text style={{
                  fontFamily: 'DM Sans',
                  fontSize: 16,
                  fontWeight: '600',
                  color: ArchivesTheme.colors.mutedNavy,
                }} allowFontScaling={false}>
                  {testAdventureIndex + 1} / {testAdventures.length}
                </Text>
                <Text style={{
                  fontFamily: 'DM Sans',
                  fontSize: 11,
                  fontWeight: '500',
                  color: ArchivesTheme.colors.persianOrange,
                }} allowFontScaling={false}>
                  {testAdventures[testAdventureIndex]?.era_id || 'Unknown'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setTestAdventureIndex(prev => Math.min(testAdventures.length - 1, prev + 1))}
                disabled={testAdventureIndex === testAdventures.length - 1}
                style={{
                  backgroundColor: testAdventureIndex === testAdventures.length - 1 ? '#CCC' : ArchivesTheme.colors.persianOrange,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }} allowFontScaling={false}>Next →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* GameHub Modal */}
      <GameHub
        visible={showGameHub}
        onClose={() => setShowGameHub(false)}
        initialGameType="jigsaw"
      />

      {/* Floating game controller button - Commented out for release */}
      {/* <View style={styles.floatingButtonContainer}>
        <TouchableOpacity
          style={styles.floatingGameButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowGameHub(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="game-controller" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View> */}
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
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'left',
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
    ...ArchivesTheme.common.iconContainer,
    ...ArchivesTheme.common.circularIcon,
    width: 280, // Even bigger circle for more breathing room
    height: 280,
    borderRadius: 140, // Updated border radius to match new size
    marginBottom: 16,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
  },
  avatarImage: {
    width: 230, // Increased scale while keeping breathing room
    height: 230,
    borderRadius: 115,
    resizeMode: 'contain',
  },
  editIconContainer: {
    ...ArchivesTheme.common.circularIcon,
    position: 'absolute',
    bottom: 50, // Position on circumference (bottom-right edge)
    right: 50,  // Position on circumference (bottom-right edge)
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ArchivesTheme.colors.persianOrange,
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
    marginTop: -5, // Move name slightly up
    marginBottom: 4,
  },
  userName: {
    fontFamily: 'Cormorant-Bold',
    fontSize: 28,
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  avatarSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    color: ArchivesTheme.colors.persianOrange,
    textAlign: 'center',
    marginBottom: 4,
  },
  joinedText: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: ArchivesTheme.colors.mutedNavy,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarTitle: {
    fontFamily: 'DM Sans', // EXACT SwiftUI: .font(.custom("DM Sans", size: 14))
    fontSize: 14,
    color: ArchivesTheme.colors.persianOrange, // EXACT SwiftUI: .foregroundColor(Color("PersianOrange"))
    textAlign: 'center',
    marginBottom: 20,
  },
  
  
  // Sections - EXACT SwiftUI
  badgesSection: ArchivesTheme.common.sectionContainer,
  sectionTitle: ArchivesTheme.common.sectionTitle,
  
  // Badges - EXACT SwiftUI
  badgesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  badgeContainer: {
    alignItems: 'center',
    marginRight: 20,
  },
  badgeImageContainer: {
    ...ArchivesTheme.common.iconContainer,
    width: 140,
    height: 140,
    marginBottom: 8,
    shadowOpacity: 0, // No shadow for badges
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeWhiteBg: {
    position: 'absolute',
    width: 120,
    height: 70,
    backgroundColor: 'white',
    borderRadius: 18,
    bottom: 10,
  },
  badgeImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  badgeImageGrey: {
    opacity: 0.5,
  },
  badgeLabelContainerEarned: {
    backgroundColor: ArchivesTheme.colors.shoeBrown,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  badgeLabelContainerLocked: {
    backgroundColor: ArchivesTheme.colors.mutedNavy,
    opacity: 0.3,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  badgeLabel: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Modules Achievement Card
  moduleAchievementCard: {
    ...ArchivesTheme.common.whiteCard,
    width: '100%',
    height: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    paddingLeft: 16,
    paddingRight: 4,
  },
  achievementBadge: {
    ...ArchivesTheme.common.circularIcon,
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: ArchivesTheme.colors.mossGreen,
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

  // Achievements Timeline Design - Matching Screenshot
  achievementsTimelineSection: ArchivesTheme.common.sectionContainer,
  timelineProgressContainer: {
    marginBottom: 24,
    paddingVertical: 8, // Add vertical padding for node space
    overflow: 'visible', // Ensure nodes aren't clipped
  },
  timelineProgressBar: {
    height: 8,
    backgroundColor: ArchivesTheme.colors.mutedNavy + '30',
    borderRadius: 4,
    position: 'relative',
    zIndex: 1,
    overflow: 'visible', // Ensure nodes aren't clipped
  },
  timelineProgressFill: {
    height: '100%',
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderRadius: 4,
    zIndex: 1,
  },
  timelineNode: {
    position: 'absolute',
    top: '50%',
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ArchivesTheme.colors.mutedNavy + '30',
    borderWidth: 3,
    borderColor: ArchivesTheme.colors.creamWhite,
    marginLeft: -12,
    zIndex: 2,
  },
  timelineNodeEarned: {
    backgroundColor: ArchivesTheme.colors.mossGreen,
  },
  timelineBadgesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  timelineScrollContent: {
    paddingRight: 20,
    paddingVertical: 8, // Add vertical padding for nodes
  },
  timelineContainer: {
    flexDirection: 'column',
    overflow: 'visible', // Ensure nodes aren't clipped
  },
  timelineBadgesRow: {
    flexDirection: 'row',
  },
  timelineBadgeContainer: {
    marginRight: 16,
    alignItems: 'center',
  },
  timelineBadgeImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  timelineBadgeImageLocked: {
    opacity: 0.3,
  },
  timelineBadgeText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 22,
    fontWeight: '700',
    color: ArchivesTheme.colors.persianOrange,
    textAlign: 'center',
  },
  timelineBadgeTextLocked: {
    color: ArchivesTheme.colors.mutedNavy,
    opacity: 0.5,
  },
  
  
  // Learning Preferences Section
  preferencesSection: ArchivesTheme.common.sectionContainer,
  preferenceCard: {
    ...ArchivesTheme.common.whiteCard,
    ...ArchivesTheme.common.rowBetween,
    marginBottom: 12,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferenceLabel: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy,
  },
  preferenceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preferenceValue: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.persianOrange,
  },

  // Sign Out Button
  signOutButton: {
    marginHorizontal: 20,
    backgroundColor: ArchivesTheme.colors.persianOrange, // Persian orange color
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 100, // Ensure button is above other elements
    elevation: 5, // Android elevation for touch handling
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
  modalHeader: ArchivesTheme.common.modalHeader,
  closeButton: ArchivesTheme.common.closeButton,
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPlaceholder: ArchivesTheme.common.closeButtonPlaceholder,
  modalTitle: ArchivesTheme.common.modalTitle,
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
    ...ArchivesTheme.common.iconContainer,
    ...ArchivesTheme.common.circularIcon,
    width: 130, // Increased for more breathing room
    height: 130,
    borderRadius: 65,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  avatarGridSelected: {
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOpacity: 0.3,
  },
  avatarGridImage: {
    width: 130, // Increased for more breathing room
    height: 130,
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
  unlockMessage: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  lockIconContainer: {
    ...ArchivesTheme.common.columnCenter,
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -16,
    marginLeft: -16,
    width: 32,
    height: 32,
  },
  avatarGridLocked: {
    opacity: 0.5,
  },
  avatarGridImageLocked: {
    opacity: 0.4,
  },
  avatarGridNameLocked: {
    opacity: 0.5,
  },
  avatarGridTitleLocked: {
    opacity: 0.5,
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
    ...ArchivesTheme.common.whiteCard,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 12,
  },
  settingsOptionDanger: {
    backgroundColor: '#FFF5F5', // Light red background
  },
  settingsOptionDisabled: {
    backgroundColor: '#F5F5F5', // Gray background for disabled state
    opacity: 0.6,
  },
  settingsOptionIcon: {
    ...ArchivesTheme.common.circularIcon,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ArchivesTheme.colors.persianOrange + '20',
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
  settingsToggleRow: {
    ...ArchivesTheme.common.whiteCard,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingsToggleTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  settingsOptionSubtext: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: ArchivesTheme.colors.shoeBrown,
    opacity: 0.6,
    marginTop: 2,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
    marginHorizontal: 0,
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
    ...ArchivesTheme.common.circularIcon,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ArchivesTheme.colors.persianOrange,
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

  // Temporary Test Button Styles
  testButton: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.5,
  },
  testButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '700',
    color: ArchivesTheme.colors.creamWhite,
  },

  // Achievements Section Styles
  achievementsSection: ArchivesTheme.common.sectionContainer,
  achievementsHeader: {
    ...ArchivesTheme.common.rowBetween,
    marginBottom: 16,
  },
  achievementsCount: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.persianOrange,
  },
  achievementsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  achievementsScrollContent: {
    paddingRight: 20,
  },
  achievementCard: {
    ...ArchivesTheme.common.achievementCardBase,
    width: 110,
    justifyContent: 'flex-start',  // Keep icons aligned at top regardless of text wrapping
  },
  achievementIconContainer: {
    ...ArchivesTheme.common.iconContainer,
    width: 125,
    height: 125,
    marginBottom: 8,  // ⭐ Reduced from 8 to decrease space between icon and name
    shadowColor: 'black',
    shadowOpacity: 0.1,
  },
  achievementImage: {
    width: 100,  // Single source of truth for achievement icon dimensions
    height: 100,
  },
  achievementName: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementNameLocked: {
    color: '#95A5A6',
  },
  achievementUnlockedBadge: {
    ...ArchivesTheme.common.circularIcon,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  achievementProgressContainer: {
    width: '100%',
    paddingHorizontal: 8,
  },
  achievementProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // All Badges Modal Styles
  badgesModalGrid: {
    flex: 1,
    // overflow removed - ScrollView should clip properly for scrolling
  },
  badgesModalContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',  // Force 2 per row with even spacing
    paddingHorizontal: 12,
    // paddingTop: 10,  // Add top padding to make space for icons
    paddingBottom: 40,
    rowGap: 8,
  },
  badgeModalWrapper: {
    width: '47%',  // Responsive width - always fits 2 per row
    maxWidth: 152,  // Cap at original size on larger screens
    alignItems: 'center',
  },
  badgeModalIconContainer: {
    ...ArchivesTheme.common.columnCenter,
    width: 100,
    height: 140,
    zIndex: 10,
    elevation: 10,
  },
  badgeModalItem: {
    width: '100%',  // Fill the wrapper width (responsive)
    height: 92,
    marginTop: -65,  // Pull card up behind the icon
    backgroundColor: 'white',
    borderRadius: 20,
    paddingTop: 50,
    paddingBottom: 15,  // Reduced from 25 to give text more room
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  badgeModalImage: {
    width: 150,
    height: 180,
  },
  badgeModalName: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: 'bold',
    // lineHeight: 25,
    paddingTop: 4,
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
  },
  badgeModalNameLocked: {
    color: '#C3C3C3',
  },
  badgeModalDescription: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: ArchivesTheme.colors.mutedNavy,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  badgeModalDescriptionLocked: {
    color: '#95A5A6',
  },
  badgeModalUnlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  badgeModalUnlockedText: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  badgeModalProgressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  badgeModalProgressBarWrapper: {
    flex: 1,
    maxWidth: '75%',
  },
  badgeModalProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 12.5,
    overflow: 'hidden',
  },
  badgeModalProgressFill: {
    height: '100%',
    borderRadius: 12.5,
  },
  badgeModalProgressText: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '700',
    color: ArchivesTheme.colors.mutedNavy,
    width: 40,
    textAlign: 'left',
  },

  // Floating Game Button
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 999,
  },
  floatingGameButton: {
    ...ArchivesTheme.common.circularIcon,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#C99151', // Persian Orange
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
})