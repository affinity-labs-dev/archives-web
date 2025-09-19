// Main Tab Navigation - Native iOS Bottom Tabs with automatic iOS 18+ floating behavior
// 4 tabs: Home, Eras, Subscribe, Profile with Archives styling

import React from 'react'
import { Platform } from 'react-native'
import { Tabs } from 'expo-router'
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs'
import ArchivesTheme from '@/constants/ArchivesTheme'
import HomeIcon from '@/components/icons/HomeIcon'
import ErasIcon from '@/components/icons/ErasIcon'
import SubscribeIcon from '@/components/icons/SubscribeIcon'
import ProfileIcon from '@/components/icons/ProfileIcon'

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
const getScreenOptions = (): BottomTabNavigationOptions => ({
  tabBarActiveTintColor: ArchivesTheme.colors.persianOrange,
  tabBarInactiveTintColor: ArchivesTheme.colors.mutedNavy + '99', // 60% opacity
  tabBarStyle: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 88 : Platform.OS === 'web' ? 75 : 65,
    paddingBottom: Platform.OS === 'ios' ? 34 : Platform.OS === 'web' ? 15 : 10,
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
  // Use native tabs on iOS for automatic floating behavior, standard tabs elsewhere
  const TabComponent = useNativeTabs && NativeBottomTabs ? NativeBottomTabs : Tabs

  return (
    <TabComponent
      screenOptions={getScreenOptions}
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
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <ProfileIcon
              size={24}
              color={color}
            />
          ),
        }}
      />
    </TabComponent>
  )
}
