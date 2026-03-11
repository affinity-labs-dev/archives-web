// Home Tab - Shows era-specific content based on user's selected era
// Data-driven: content comes from Supabase, no hardcoded era handling

import React from 'react'
import { Animated, View } from 'react-native'
import AdventuresScreen from './era-view'

// Home tab now simply renders AdventuresScreen
// All era logic (selection, loading, coming soon) is handled in AdventuresScreen
export default function HomeTab() {
  return (
    <View style={{ flex: 1 }}>
      {/* TODO: Remove — temporary test for Animated.Text font scaling (AFF-331) */}
      <Animated.Text style={{ fontSize: 16, padding: 10, backgroundColor: 'yellow', textAlign: 'center' }}>
        Animated.Text font scaling test
      </Animated.Text>
      <AdventuresScreen />
    </View>
  )
}
