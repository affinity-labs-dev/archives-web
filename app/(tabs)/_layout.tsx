// Main Tab Navigation - Native iOS Bottom Tabs with automatic iOS 18+ floating behavior
// 4 tabs: Home, Eras, Subscribe, Profile with Archives styling

import ErasIcon from '@/components/icons/ErasIcon'
import HomeIcon from '@/components/icons/HomeIcon'
import ProfileIcon from '@/components/icons/ProfileIcon'
import SubscribeIcon from '@/components/icons/SubscribeIcon'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs'
import { Tabs, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Use native bottom tabs only on iOS, fallback to Expo Router tabs on other platforms
const useNativeTabs = Platform.OS === 'ios'

// Import native tabs conditionally
let NativeBottomTabs: any = null
if (useNativeTabs) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BottomTabs } = require('@bottom-tabs/react-navigation')
    NativeBottomTabs = BottomTabs
  } catch {
    console.warn('Native bottom tabs not available, falling back to Expo Router tabs')
  }
}

// Common screen options for both native and standard tabs
// Now accepts insets parameter for dynamic safe area handling
const getScreenOptions = (bottomInset: number): BottomTabNavigationOptions => ({
  tabBarActiveTintColor: ArchivesTheme.colors.persianOrange,
  tabBarInactiveTintColor: ArchivesTheme.colors.mutedNavy + '99', // 60% opacity
  tabBarStyle: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    borderTopWidth: 0,
    // Dynamic height: 56px base + safe area bottom inset
    height: 56 + Math.max(bottomInset, 8),
    // Use actual safe area inset for bottom padding (minimum 8px fallback)
    paddingBottom: Math.max(bottomInset, 8),
    paddingTop: 8,
    // Subtle shadow matching SwiftUI (native tabs handle this automatically)
    ...(!useNativeTabs && {
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: -2 },
      elevation: 8,
    }),
  },
  tabBarLabelStyle: {
    fontFamily: 'DM Sans',
    fontSize: Platform.OS === 'web' ? 13 : 12,
    fontWeight: '700',
    // Web-specific font styling for proper text rendering
    ...(Platform.OS === 'web' && {
      lineHeight: 16,
      marginTop: 2,
    }),
  },
  tabBarIconStyle: {
    marginBottom: -2,
  },
  headerShown: false,
})

export default function TabLayout() {
  // Get safe area insets for dynamic tab bar padding
  const insets = useSafeAreaInsets()

  // Check if we're in onboarding mode (hide tab bar)
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const isOnboarding = mode === 'onboarding'

  // Use native tabs on iOS for automatic floating behavior, standard tabs elsewhere
  const TabComponent = useNativeTabs && NativeBottomTabs ? NativeBottomTabs : Tabs

  // Get screen options with optional tab bar hiding
  const screenOptions = {
    ...getScreenOptions(insets.bottom),
    ...(isOnboarding && {
      tabBarStyle: { display: 'none' as const },
    }),
  }

  return (
    <TabComponent
      screenOptions={screenOptions}
      // Native tabs specific options
      {...(useNativeTabs && {
        tabBarStyle: 'automatic', // Enables iOS 18+ floating behavior
        hapticFeedbackEnabled: true,
      })}
    >
      <TabComponent.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <HomeIcon
              size={24}
              color={color}
            />
          ),
        }}
      />
      <TabComponent.Screen
        name="eras"
        options={{
          title: 'Eras',
          headerShown: false,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <ErasIcon
              size={24}
              color={color}
            />
          ),
        }}
      />
      <TabComponent.Screen
        name="subscribe"
        options={{
          title: 'Subscribe',
          headerShown: false,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <SubscribeIcon
              size={24}
              color={color}
            />
          ),
        }}
      />
      <TabComponent.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <ProfileIcon
              size={24}
              color={color}
            />
          ),
        }}
      />
      <TabComponent.Screen
        name="roi-bento"
        options={{
          href: null, // Hide from tab bar
          headerShown: false,
        }}
      />
    </TabComponent>
  )
}
