// Branded loading screen for Archives app
// Replaces all Expo default loading/error screens with branded experience

import React, { useEffect, useRef } from 'react'
import { View, Image, StyleSheet, Animated, Easing, Text } from 'react-native'
import ArchivesTheme from '@/constants/ArchivesTheme'

export default function LoadingScreen() {
  // Animated value for spinner rotation
  const spinValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Create infinite rotation animation
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )

    spinAnimation.start()

    return () => spinAnimation.stop()
  }, [spinValue])

  // Interpolate rotation
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <View style={styles.container}>
      {/* Archives Logo */}
      <Image
        source={require('@/assets/images/archives-logo-dark.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Loading Spinner */}
      <Animated.View
        style={[
          styles.spinner,
          { transform: [{ rotate: spin }] }
        ]}
      >
        <View style={styles.spinnerArc} />
      </Animated.View>

      {/* Loading Text */}
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  spinner: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  spinnerArc: {
    width: 40,
    height: 40,
    borderWidth: 3,
    borderRadius: 20,
    borderColor: 'transparent',
    borderTopColor: ArchivesTheme.colors.persianOrange,
    borderRightColor: ArchivesTheme.colors.persianOrange,
  },
  loadingText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '500',
    color: ArchivesTheme.colors.shoeBrown,
    marginTop: 0,
  },
})
