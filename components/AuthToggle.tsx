// Shared Auth Toggle Component - Used in both archives-auth and email-details screens
// Segmented control style toggle between Sign Up and Sign In modes

import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import ArchivesTheme from '@/constants/ArchivesTheme'

interface AuthToggleProps {
  isSignInMode: boolean
  onToggle: (mode: 'signup' | 'signin') => void
}

export function AuthToggle({ isSignInMode, onToggle }: AuthToggleProps) {
  return (
    <View style={styles.toggleContainer}>
      {/* Sign Up Card */}
      <TouchableOpacity
        style={[
          styles.toggleCard,
          !isSignInMode && styles.toggleCardActive
        ]}
        onPress={() => onToggle('signup')}
      >
        <MaterialIcons
          name="person-add"
          size={24}
          color={!isSignInMode ? ArchivesTheme.colors.persianOrange : ArchivesTheme.colors.mutedNavy + '80'}
          style={styles.toggleIcon}
        />
        <Text style={[
          styles.toggleText,
          { color: !isSignInMode ? ArchivesTheme.colors.mutedNavy : ArchivesTheme.colors.mutedNavy + '80' }
        ]}>
          Sign Up
        </Text>
      </TouchableOpacity>

      {/* Sign In Card */}
      <TouchableOpacity
        style={[
          styles.toggleCard,
          isSignInMode && styles.toggleCardActive
        ]}
        onPress={() => onToggle('signin')}
      >
        <MaterialIcons
          name="how-to-reg"
          size={24}
          color={isSignInMode ? ArchivesTheme.colors.persianOrange : ArchivesTheme.colors.mutedNavy + '80'}
          style={styles.toggleIcon}
        />
        <Text style={[
          styles.toggleText,
          { color: isSignInMode ? ArchivesTheme.colors.mutedNavy : ArchivesTheme.colors.mutedNavy + '80' }
        ]}>
          Sign In
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 12,
    paddingHorizontal: 20,
  },
  toggleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleCardActive: {
    borderColor: ArchivesTheme.colors.persianOrange,
    backgroundColor: 'white',
    shadowColor: ArchivesTheme.colors.persianOrange,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  toggleIcon: {
    marginRight: 8,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
})
