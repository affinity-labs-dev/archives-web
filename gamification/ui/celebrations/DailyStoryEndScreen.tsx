// Daily Story End Screen - Celebration after completing Today's daily quest
// Shows Rive animation before streak celebration
// Full screen modal with close button and continue button

import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Rive, { Alignment, Fit, RiveRef } from "rive-react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Import Rive animation from assets
const dailyStoryEndAnimation = require("../../../assets/rive/daily_story_end_screen_animation.riv");

interface DailyStoryEndScreenProps {
  visible: boolean;
  onContinue: () => void;
}

export default function DailyStoryEndScreen({
  visible,
  onContinue,
}: DailyStoryEndScreenProps) {
  const riveRef = useRef<RiveRef>(null);

  // Track Rive animation loading
  useEffect(() => {
    if (visible && riveRef.current) {
      console.log("🎬 [DailyStoryEnd] Rive animation loaded successfully");
    }
  }, [visible, riveRef.current]);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onContinue();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <LinearGradient
        colors={["#72C7FF", "#FFFFFF", "#FFFFFF"]}
        locations={[0, 0.8, 1]}
        style={styles.gradientBackground}
      >
        <SafeAreaView style={styles.container}>
          {/* Close Button - Top Right */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onContinue();
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close"
              size={32}
              color={ArchivesTheme.colors.shoeBrown}
            />
          </TouchableOpacity>

          {/* Rive Animation - Centered */}
          <View style={styles.animationContainer}>
            <Rive
              ref={riveRef}
              source={dailyStoryEndAnimation}
              autoplay={true}
              fit={Fit.Contain}
              alignment={Alignment.Center}
              style={styles.riveAnimation}
            />
          </View>

          {/* Messages above button */}
          <View style={styles.messageContainer}>
            <Text style={styles.completedText}>Today's story completed!</Text>
            <Text style={styles.heroicText}>
              That's heroic, just like our{" "}
              <Text style={styles.ibuText}>Ibu</Text>
            </Text>
          </View>

          {/* Continue Button - Bottom */}
          <View style={styles.continueButton}>
            <TouchableOpacity
              style={styles.continueButtonInner}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>ALL DONE!</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const BUTTON_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 400);

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
    zIndex: 2000, // Ensure above all other UI
    elevation: 2000, // Android layering
  },
  closeButton: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.07,
    right: 24,
    zIndex: 100, // Above all content
    elevation: 100, // Android
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  animationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  riveAnimation: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    backgroundColor: "transparent",
  },
  messageContainer: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.18,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    alignItems: "center",
    zIndex: 25,
    elevation: 25,
  },
  completedText: {
    fontFamily: "DM Sans",
    fontSize: 16,
    fontWeight: "600",
    color: ArchivesTheme.colors.persianOrange,
    textAlign: "center",
    letterSpacing: 0,
    marginBottom: 4,
  },
  heroicText: {
    fontFamily: "DM Sans",
    fontSize: 16,
    fontWeight: "600",
    color: ArchivesTheme.colors.persianOrange,
    textAlign: "center",
    letterSpacing: 0,
  },
  ibuText: {
    fontFamily: "DM Sans",
    fontSize: 16,
    fontWeight: "700",
    color: ArchivesTheme.colors.persianOrange,
    letterSpacing: 0,
  },
  continueButton: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.06,
    left: (SCREEN_WIDTH - BUTTON_WIDTH) / 2,
    width: BUTTON_WIDTH,
    height: 52,
    zIndex: 30, // Above everything
    elevation: 30, // Android
  },
  continueButtonInner: {
    flex: 1,
    borderRadius: 26,
    backgroundColor: "#959C00",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6E7300",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  continueButtonText: {
    fontFamily: "DM Sans",
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.18,
  },
});
