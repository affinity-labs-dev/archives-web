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
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Rive, { Alignment, Fit, RiveRef } from "rive-react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Import Rive animation from assets
const dailyStoryEndAnimation = require("../../../assets/rive/daily_story_end_screen_animation.riv");

// Theme styles
const themeStyles = ArchivesTheme.common.dailyStoryEnd;

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
        style={themeStyles.gradientBackground}
      >
        <SafeAreaView style={themeStyles.container}>
          {/* Close Button - Top Right */}
          <TouchableOpacity
            style={[
              themeStyles.closeButtonTopRight,
              { top: SCREEN_HEIGHT * 0.07 },
            ]}
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
          <View style={themeStyles.animationContainer}>
            <Rive
              ref={riveRef}
              source={dailyStoryEndAnimation}
              autoplay={true}
              fit={Fit.Contain}
              alignment={Alignment.Center}
              style={{
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT * 0.7,
                backgroundColor: "transparent",
              }}
            />
          </View>

          {/* Messages above button */}
          <View
            style={[
              themeStyles.messageContainer,
              { bottom: SCREEN_HEIGHT * 0.18 },
            ]}
          >
            <Text style={themeStyles.completedText}>
              Today's story completed!
            </Text>
            <Text style={themeStyles.heroicText}>
              That's heroic, just like our{" "}
              <Text style={themeStyles.ibuText}>Ibu</Text>
            </Text>
          </View>

          {/* ALL DONE Button - Bottom with 3D depth effect */}
          <View
            style={[
              themeStyles.allDoneButtonContainer,
              {
                bottom: SCREEN_HEIGHT * 0.06,
                left: (SCREEN_WIDTH - 340) / 2,
              },
            ]}
          >
            {/* Shadow layer for 3D effect */}
            <View style={themeStyles.allDoneButtonShadow} />
            {/* Main button */}
            <TouchableOpacity
              style={themeStyles.allDoneButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={themeStyles.allDoneButtonText}>ALL DONE!</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}
