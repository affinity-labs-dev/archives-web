import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useFonts } from 'expo-font';
import ColorsSection from './sections/ColorsSection';
import TypographySection from './sections/TypographySection';
import ButtonsSection from './sections/ButtonsSection';
import SpacingSection from './sections/SpacingSection';
import ComponentsSection from './sections/ComponentsSection';
import SVGAssetsSection from './sections/SVGAssetsSection';

/**
 * Design Playground — developer reference screen.
 *
 * Renders the full design system in a scrollable view:
 * typography, colors, buttons, and component previews.
 *
 * Usage:
 *   import PlaygroundScreen from '@/DesignPlayground/PlaygroundScreen';
 *   <PlaygroundScreen />
 */
export default function PlaygroundScreen() {
  const [fontsLoaded] = useFonts({
    'Bounded-Black': require('./assets/fonts/Bounded-Black.ttf'),
    'Onest-Black': require('./assets/fonts/Onest-Black.ttf'),
    'Onest-Bold': require('./assets/fonts/Onest-Bold.ttf'),
    'Onest-SemiBold': require('./assets/fonts/Onest-SemiBold.ttf'),
    'Onest-Medium': require('./assets/fonts/Onest-Medium.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={[styles.safe, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#1E3C88" />
        <Text style={styles.loadingText}>Loading playground fonts...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TypographySection />

        <View style={styles.sectionGap} />

        <ColorsSection />

        <View style={styles.sectionGap} />

        <ButtonsSection />

        <View style={styles.sectionGap} />

        <SpacingSection />

        <View style={styles.sectionGap} />

        <ComponentsSection />

        <View style={styles.sectionGap} />

        <SVGAssetsSection />

        <View style={styles.sectionGap} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  sectionGap: {
    height: 56,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
  },
});
