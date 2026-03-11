// Home Tab - Shows era-specific content based on user's selected era
// Data-driven: content comes from Supabase, no hardcoded era handling

import React from 'react'
import { View } from 'react-native'
import AdventuresScreen from './era-view'

// Home tab now simply renders AdventuresScreen
// All era logic (selection, loading, coming soon) is handled in AdventuresScreen
export default function HomeTab() {
  return (
    <View style={{ flex: 1 }}>
      <AdventuresScreen />
    </View>
  )
}
