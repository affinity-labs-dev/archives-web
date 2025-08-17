// Main Tab Navigation - Exact replica of SwiftUI MainTabView
// 4 tabs: Home, Eras, Subscribe, Profile with Archives styling

import { Tabs } from 'expo-router'
import React from 'react'
import { Platform } from 'react-native'
import ArchivesTheme from '@/constants/ArchivesTheme'
import HomeIcon from '@/components/icons/HomeIcon'
import ErasIcon from '@/components/icons/ErasIcon'
import SubscribeIcon from '@/components/icons/SubscribeIcon'
import ProfileIcon from '@/components/icons/ProfileIcon'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ArchivesTheme.colors.persianOrange,
        tabBarInactiveTintColor: ArchivesTheme.colors.mutedNavy + '99', // 60% opacity
        tabBarStyle: {
          backgroundColor: ArchivesTheme.colors.creamWhite,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingBottom: Platform.OS === 'ios' ? 34 : 10,
          paddingTop: 8,
          // Subtle shadow matching SwiftUI
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'DM Sans',
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <HomeIcon 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="eras"
        options={{
          title: 'Eras',
          tabBarIcon: ({ color, focused }) => (
            <ErasIcon 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="subscribe"
        options={{
          title: 'Subscribe',
          tabBarIcon: ({ color, focused }) => (
            <SubscribeIcon 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <ProfileIcon 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  )
}
