// AchievementGrid.tsx - Achievement display components
// Contains: AchievementDetailModal (detail view), AchievementUnlockAnimation (celebration), and NotificationPermissionModal
import ArchivesTheme from "@/constants/ArchivesTheme";
import type { Achievement } from "@/gamification/engines/GamificationOrchestrator";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GrayscaleImage } from "./GrayscaleImage";

// Dynamic card width for responsive design
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 328); // 90% of screen width, max 328

// ============================================================
// SHARED UTILITIES
// ============================================================

// const getRarityColor = (rarity: Achievement['rarity']) => {
//   switch (rarity) {
//     case 'common': return '#95A5A6';
//     case 'rare': return '#3498DB';
//     case 'epic': return '#9B59B6';
//     case 'legendary': return '#F39C12';
//     default: return '#95A5A6';
//   }
// };

// const getRarityLabel = (rarity: Achievement['rarity']) => {
//   return rarity.charAt(0).toUpperCase() + rarity.slice(1);
// };

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Lighten a hex color by a percentage (0-1)
const lightenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(
    255,
    Math.floor((num >> 16) + (255 - (num >> 16)) * percent),
  );
  const g = Math.min(
    255,
    Math.floor(((num >> 8) & 0x00ff) + (255 - ((num >> 8) & 0x00ff)) * percent),
  );
  const b = Math.min(
    255,
    Math.floor((num & 0x0000ff) + (255 - (num & 0x0000ff)) * percent),
  );
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

// Generate consistent color from 4-color palette based on achievement ID
const getAchievementGradientColor = (achievementId: string): string => {
  const colors = ["#ADB84B", "#FFD162", "#F9AE4A", "#A3D9FA"];

  // Simple hash: sum of character codes for deterministic randomness
  const hash = achievementId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return colors[hash % colors.length];
};

// Render badge component (shared across modals)
const renderAchievementBadge = (
  type: "unlocked" | "locked" | "date",
  text: string,
  styles: { badge: any; badgeText: any },
  icon?: keyof typeof Ionicons.glyphMap,
  additionalStyle?: any,
) => {
  const bgColor =
    type === "unlocked"
      ? ArchivesTheme.colors.mossGreen
      : ArchivesTheme.colors.persianOrange;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, additionalStyle]}>
      {icon && <Ionicons name={icon} size={18} color="white" />}
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
};

// Render close button component (shared across modals)
const renderModalCloseButton = (
  onPress: () => void,
  styles: { closeButton: any; closeButtonInner: any },
  withHaptics: boolean = false,
) => {
  const handlePress = () => {
    if (withHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.closeButton}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.closeButtonInner}>
        <Ionicons
          name="close"
          size={24}
          color={ArchivesTheme.colors.mutedNavy}
        />
      </View>
    </TouchableOpacity>
  );
};

// Render progress bar component (shared, currently used in detail modal)
const renderAchievementProgressBar = (
  progress: number,
  styles: {
    progressContainer: any;
    progressLabel: any;
    progressBar: any;
    progressFill: any;
  },
  color: string = ArchivesTheme.colors.mossGreen,
) => {
  return (
    <View style={styles.progressContainer}>
      <Text style={styles.progressLabel}>{Math.round(progress)}%</Text>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
};

// Render achievement title and description (shared across modals)
const renderAchievementText = (
  title: string,
  description: string,
  styles: { achievementName: any; description: any },
  isLocked: boolean = false,
) => {
  return (
    <>
      {/* Achievement Title */}
      <Text style={[styles.achievementName, isLocked && { color: "#C3C3C3" }]}>
        {title}
      </Text>

      {/* Description */}
      <Text style={[styles.description, isLocked && { color: "#C3C3C3" }]}>
        {description}
      </Text>
    </>
  );
};

// Render achievement card with image and gradient (shared across modals)
const renderAchievementCard = (
  achievement: Achievement,
  isUnlocked: boolean,
  gradientColors: readonly [string, string],
  gradientConfig: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    locations: [number, number];
  },
  styles: {
    cardContainer: any;
    imageWrapper: any;
    achievementImage: any;
    card: any;
  },
  imageConfig: { useGrayscale: boolean; width?: number; height?: number },
  children: React.ReactNode,
) => {
  return (
    <View style={styles.cardContainer}>
      {/* Achievement Image - Overlapping card top */}
      <View style={styles.imageWrapper}>
        {imageConfig.useGrayscale ? (
          <GrayscaleImage
            source={
              achievement.image ||
              require("@/assets/images/quiz-images/Camel.png")
            }
            style={styles.achievementImage}
            width={imageConfig.width || 234}
            height={imageConfig.height || 234}
            resizeMode="contain"
            grayscale={!isUnlocked}
          />
        ) : (
          <Image
            source={
              achievement.image ||
              require("@/assets/images/quiz-images/Camel.png")
            }
            style={styles.achievementImage}
            resizeMode="contain"
          />
        )}
      </View>

      {/* Gradient Card */}
      <LinearGradient
        colors={gradientColors}
        start={gradientConfig.start}
        end={gradientConfig.end}
        locations={gradientConfig.locations}
        style={styles.card}
      >
        {children}
      </LinearGradient>
    </View>
  );
};

// Render modal wrapper with dark overlay (shared across modals)
const renderAchievementModalWrapper = (
  visible: boolean,
  onRequestClose: () => void,
  containerStyle: any,
  children: React.ReactNode,
  backdropProps?: { style: any; onPress: () => void },
) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onRequestClose}
    >
      <View style={containerStyle}>
        {backdropProps && (
          <TouchableOpacity
            style={backdropProps.style}
            activeOpacity={1}
            onPress={backdropProps.onPress}
          />
        )}
        {children}
      </View>
    </Modal>
  );
};

// ============================================================
// ACHIEVEMENT DETAIL MODAL
// Shows detailed info when user taps an achievement
// ============================================================

interface AchievementDetailModalProps {
  visible: boolean;
  achievement:
    | (Achievement & { unlocked: boolean; unlockedAt?: string })
    | null;
  progress: number;
  onClose: () => void;
}

export function AchievementDetailModal({
  visible,
  achievement,
  progress,
  onClose,
}: AchievementDetailModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && achievement) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, achievement]);

  // Don't render content if no achievement selected, but keep Modal mounted
  if (!achievement) return null;

  // Dynamic gradient: colored when unlocked, grey when locked
  const baseColor = getAchievementGradientColor(achievement.id);
  const lightColor = achievement.unlocked
    ? lightenColor(baseColor, 0.6)
    : "#b4b4b4ff"; // Lighter grey for locked (decreased grayscale intensity)
  const gradientColors: readonly [string, string] = [lightColor, "#FFFFFF"];

  return renderAchievementModalWrapper(
    visible,
    onClose,
    unlockStyles.container,
    <>
      {/* Close Button - Top Right */}
      {renderModalCloseButton(onClose, detailStyles)}

      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {renderAchievementCard(
          achievement,
          achievement.unlocked,
          gradientColors,
          {
            start: { x: 0.7, y: 0.04 },
            end: { x: 0.3, y: 0.96 },
            locations: [0.027, 0.393],
          },
          unlockStyles,
          { useGrayscale: true, width: 234, height: 234 },
          <>
            {renderAchievementText(
              achievement.name,
              achievement.description,
              unlockStyles,
              !achievement.unlocked,
            )}

            {/* Status Badge and Progress */}
            {achievement.unlocked ? (
              <View style={unlockStyles.badgesRow}>
                {renderAchievementBadge(
                  "unlocked",
                  "Unlocked",
                  unlockStyles,
                  "checkmark-circle",
                )}
                {achievement.unlockedAt &&
                  renderAchievementBadge(
                    "date",
                    formatDate(achievement.unlockedAt),
                    unlockStyles,
                  )}
              </View>
            ) : (
              <View style={unlockStyles.lockedContainer}>
                {/* Locked badge on its own line */}
                {renderAchievementBadge(
                  "locked",
                  "Locked",
                  unlockStyles,
                  "lock-closed",
                  { alignSelf: "flex-start" },
                )}
                {/* Progress section - full width */}
                {/* {renderAchievementProgressBar(progress, unlockStyles)} */}
              </View>
            )}
          </>,
        )}
      </Animated.View>
    </>,
    { style: unlockStyles.backdrop, onPress: onClose },
  );
}

// ============================================================
// ACHIEVEMENT UNLOCK ANIMATION
// Celebration animation when an achievement is unlocked
// ============================================================

interface AchievementUnlockAnimationProps {
  visible: boolean;
  achievement: Achievement & { unlockedAt?: string };
  onDismiss: () => void;
  autoDismiss?: boolean; // If true, auto-dismiss after 3s (for unlock flow). If false, user must close manually (for profile)
}

export function AchievementUnlockAnimation({
  visible,
  achievement,
  onDismiss,
  autoDismiss = true, // Default: auto-dismiss for unlock flow
}: AchievementUnlockAnimationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Scale animation for card
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Auto-dismiss after 5 seconds (only if autoDismiss is true)
      if (autoDismiss) {
        const timer = setTimeout(onDismiss, 5000);
        return () => clearTimeout(timer);
      }
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, onDismiss, autoDismiss]);

  // Dynamic gradient based on achievement color
  const baseColor = getAchievementGradientColor(achievement.id);
  const lightColor = lightenColor(baseColor, 0.6); // 60% lighter
  const gradientColors: readonly [string, string] = [lightColor, "#FFFFFF"];

  return renderAchievementModalWrapper(
    visible,
    onDismiss,
    unlockStyles.container,
    <>
      {/* Close Button - Top Right */}
      {renderModalCloseButton(onDismiss, unlockStyles, true)}

      {/* Main Card with Gradient */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {renderAchievementCard(
          achievement,
          true, // Always unlocked in unlock animation
          gradientColors,
          {
            start: { x: 1, y: 0.15 },
            end: { x: 0.9, y: 0.6 },
            locations: [0.25, 0.75],
          },
          unlockStyles,
          { useGrayscale: false, width: 234, height: 234 },
          <>
            {renderAchievementText(
              achievement.name,
              achievement.description,
              unlockStyles,
            )}

            {/* Bottom Badges Row */}
            <View style={unlockStyles.badgesRow}>
              {renderAchievementBadge(
                "unlocked",
                "Unlocked",
                unlockStyles,
                "checkmark-circle",
              )}
              {renderAchievementBadge(
                "date",
                formatDate(achievement.unlockedAt || new Date().toISOString()),
                unlockStyles,
              )}
            </View>
          </>,
        )}
      </Animated.View>
    </>,
    { style: unlockStyles.backdrop, onPress: onDismiss },
  );
}

// ============================================================
// NOTIFICATION PERMISSION MODAL
// Celebration modal that requests push notification permission
// Triggered after streak milestone
// ============================================================

interface NotificationPermissionModalProps {
  visible: boolean;
  heading?: string; // Optional custom heading
  description?: string; // Optional custom description
  buttonText?: string; // Optional custom button text
  imageSource?: any; // Optional image source (require() or {uri: ''})
  gradientColors?: readonly [string, string]; // Optional gradient colors [top, bottom]
  onEnableNotifications: () => void;
  onDismiss: () => void;
}

// Base gradient colors (these get lightened by 60% like achievement popups)
const NOTIFICATION_BASE_YELLOW_GREEN = "#959C00"; // Yellow-green (for most variants)
const NOTIFICATION_BASE_ORANGE = "#D48034"; // Burnt orange (for iOS re-permission)
const NOTIFICATION_BASE_NAVY = "#41425E"; // Dark navy/blue (for daily story)

// Apply same lightening as achievement popups (60% lighter for subtle gradient)
const NOTIFICATION_LIGHT_YELLOW_GREEN = lightenColor(NOTIFICATION_BASE_YELLOW_GREEN, 0.6);
const NOTIFICATION_LIGHT_ORANGE = lightenColor(NOTIFICATION_BASE_ORANGE, 0.6);
const NOTIFICATION_LIGHT_NAVY = lightenColor(NOTIFICATION_BASE_NAVY, 0.6);

// Default copy variants
const NOTIFICATION_COPY = {
  // Module Complete - After completing a module
  module: {
    heading: "Mabrouk on the streak!",
    description:
      "You just got closer to your roots. Want me to remind you when it's time for more?",
    buttonText: "ENABLE NOTIFICATIONS",
    image: require("@/assets/images/ibu-star.png"),
    gradient: [NOTIFICATION_LIGHT_YELLOW_GREEN, "#FFFFFF"] as const, // Subtle yellow-green → white
  },
  // Daily Story Complete - After finishing today's quest
  dailyStory: {
    heading: "The story continues tomorrow!",
    description: "Let Ibu remind you when it's time",
    buttonText: "ENABLE NOTIFICATIONS",
    image: require("@/assets/images/desert-sunset.png"),
    gradient: [NOTIFICATION_LIGHT_NAVY, "#FFFFFF"] as const, // EXCEPTION: Subtle navy → white
  },
  // Streak Milestone - After hitting 3/7/14 day streak
  streak: {
    heading: "Don't let this streak slip!",
    description:
      "Ibu can remind you before the day ends so you never miss one.",
    buttonText: "ENABLE NOTIFICATIONS",
    image: require("@/assets/images/ibu-flame.png"),
    gradient: [NOTIFICATION_LIGHT_YELLOW_GREEN, "#FFFFFF"] as const, // Subtle yellow-green → white
  },
  // Return from Lapse - User comes back after 7+ days
  lapse: {
    heading: "Welcome back!",
    description: "Turn on reminders so Ibu can keep you on track.",
    buttonText: "ENABLE NOTIFICATIONS",
    image: require("@/assets/images/ibu-sun.png"),
    gradient: [NOTIFICATION_LIGHT_YELLOW_GREEN, "#FFFFFF"] as const, // Subtle yellow-green → white
  },
  // iOS Re-permission - User denied permission, now has 3+ day streak
  iosRepermission: {
    heading: "You're a regular now!",
    description:
      "Turn on notifications in Settings so you never miss a day.",
    buttonText: "OPEN NOTIFICATION SETTINGS",
    image: require("@/assets/images/ibu-calender.png"),
    gradient: [NOTIFICATION_LIGHT_ORANGE, "#FFFFFF"] as const, // EXCEPTION: Subtle orange → white
  },
};

export function NotificationPermissionModal({
  visible,
  heading = NOTIFICATION_COPY.module.heading,
  description = NOTIFICATION_COPY.module.description,
  buttonText = NOTIFICATION_COPY.module.buttonText,
  imageSource = NOTIFICATION_COPY.module.image,
  gradientColors = NOTIFICATION_COPY.module.gradient,
  onEnableNotifications,
  onDismiss,
}: NotificationPermissionModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Light haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Scale animation for card
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  return renderAchievementModalWrapper(
    visible,
    onDismiss,
    unlockStyles.container,
    <>
      {/* Close Button - Top Right */}
      {renderModalCloseButton(onDismiss, unlockStyles, true)}
      {/* Main Card with Gradient */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={unlockStyles.cardContainer}>
          {/* Notification Illustration - Overlapping card top */}
          <View style={notificationStyles.imageWrapper}>
            <Image
              source={imageSource}
              style={notificationStyles.desertImage}
              resizeMode="contain"
            />
          </View>
          {/* White Card with Content */}
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0.7, y: 0.04 }}
            end={{ x: 0.3, y: 0.96 }}
            locations={[0.027, 0.393]}
            style={notificationStyles.card}
          >
            {/* Heading */}
            <Text style={notificationStyles.heading}>{heading}</Text>

            {/* Description */}
            <Text style={notificationStyles.description}>{description}</Text>

            {/* Enable Notifications Button */}
            <TouchableOpacity
              style={notificationStyles.enableButton}
              onPress={onEnableNotifications}
              activeOpacity={0.8}
            >
              <Text style={notificationStyles.enableButtonText}>
                {buttonText}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Animated.View>
    </>,
    { style: unlockStyles.backdrop, onPress: onDismiss }, // ✅ Reuse existing style
  );
}

// ============================================================
// IOS RE-PERMISSION MODAL
// For users who previously declined iOS notification permission
// Takes them to iOS Settings
// ============================================================

interface IOSRepermissionModalProps {
  visible: boolean;
  onOpenSettings: () => void;
  onDismiss: () => void;
}

export function IOSRepermissionModal({
  visible,
  onOpenSettings,
  onDismiss,
}: IOSRepermissionModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const gradientColors: readonly [string, string] = ["#FFF4E6", "#FFFFFF"];

  return renderAchievementModalWrapper(
    visible,
    onDismiss,
    unlockStyles.container,
    <>
      {renderModalCloseButton(onDismiss, unlockStyles, true)}

      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={unlockStyles.cardContainer}>
          {/* Desert Sunset Illustration */}
          <View style={notificationStyles.imageWrapper}>
            <Image
              source={require("@/assets/images/desert-sunset.png")}
              style={notificationStyles.desertImage}
              resizeMode="contain"
            />
          </View>

          {/* White Card with Content */}
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0.7, y: 0.04 }}
            end={{ x: 0.3, y: 0.96 }}
            locations={[0.027, 0.393]}
            style={iosRepermissionStyles.card}
          >
            {/* Heading */}
            <Text style={notificationStyles.heading}>
              Don't lose your streak!
            </Text>

            {/* Description */}
            <Text style={notificationStyles.description}>
              Turn on notifications in Settings to get reminders and protect
              your progress.
            </Text>

            {/* Enable in Settings Button */}
            <TouchableOpacity
              style={notificationStyles.enableButton}
              onPress={onOpenSettings}
              activeOpacity={0.8}
            >
              <Text style={notificationStyles.enableButtonText}>
                ENABLE IN SETTINGS
              </Text>
            </TouchableOpacity>

            {/* Not Now Link */}
            <TouchableOpacity
              style={iosRepermissionStyles.notNowButton}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={iosRepermissionStyles.notNowText}>Not now</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Animated.View>
    </>,
    { style: unlockStyles.backdrop, onPress: onDismiss },
  );
}

// ============================================================
// EXPORTS - Copy variants for external use
// ============================================================

export { NOTIFICATION_COPY };

// ============================================================
// DEFAULT EXPORT (backwards compatibility)
// ============================================================

export default AchievementDetailModal;

// ============================================================
// STYLES - Close Button (used by detail modal)
// ============================================================

const detailStyles = StyleSheet.create({
  closeButton: {
    position: "absolute",
    top: 100, // Positioned above the card for better spacing
    right: 28,
    zIndex: 100,
  },
  closeButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    ...ArchivesTheme.shadows.small,
  },
});

// ============================================================
// STYLES - Unlock Animation (New Figma Design)
// ============================================================

const unlockStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)", // Increased from 0.7 to 0.85 (85% opacity)
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ArchivesTheme.spacing.lg,
    zIndex: 2000, // Ensure modal appears above All Achievements sheet
    elevation: 2000, // Android layering
  },
  closeButton: {
    position: "absolute",
    top: 100, // Positioned above the card for better spacing
    right: 28,
    zIndex: 100,
  },
  closeButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    ...ArchivesTheme.shadows.small,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  cardContainer: {
    alignItems: "center",
    width: CARD_WIDTH,
    zIndex: 10,
    elevation: 10, // Android layering
  },
  imageWrapper: {
    position: "absolute",
    top: -150, // Adjusted for larger image size (234px)
    zIndex: 10,
    elevation: 10, // Android layering - ensures image stays above card
    right: 20,
    alignItems: "center",
  },
  achievementImage: {
    width: 234, // Increased for better image quality
    height: 234,
  },
  card: {
    width: CARD_WIDTH,
    minHeight: 222, // Changed from fixed height to minHeight for dynamic content
    borderRadius: 25,
    paddingTop: 90, // Reduced from 120 to close gap between image and text
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: "flex-start", // Left align content to match text alignment
    ...ArchivesTheme.shadows.medium,
  },
  achievementName: {
    fontFamily: "DM Sans",
    fontSize: 35,
    fontWeight: "700", // Bold (700)
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: "left", // Left align per Figma
    lineHeight: 37.5, // 90% of 35px
    // marginBottom: 5,
  },
  description: {
    fontFamily: "DM Sans",
    fontSize: 16,
    fontWeight: "600", // SemiBold (600)
    color: ArchivesTheme.colors.persianOrange,
    textAlign: "left", // Left align per Figma
    lineHeight: 20, // Reduced from 30 to 20 for tighter multi-line spacing
    marginBottom: 16,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap", // Allow badges to wrap on smaller screens
    gap: 12,
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 17,
    height: 30,
  },
  badgeText: {
    fontFamily: "DM Sans",
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  lockedContainer: {
    width: "100%",
    gap: 8,
  },
  progressLabel: {
    fontFamily: "DM Sans",
    fontSize: 16,
    fontWeight: "700",
    color: ArchivesTheme.colors.mossGreen,
    textAlign: "right",
    width: "100%",
    marginBottom: 4,
  },
  progressContainer: {
    width: "100%",
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#C3C3C3",
    borderRadius: 12.5,
    overflow: "visible",
    position: "relative",
    justifyContent: "center",
  },
  progressFill: {
    height: 8,
    borderRadius: 12.5,
    position: "absolute",
    top: -2,
    left: -7,
  },
});

// ============================================================
// STYLES - Notification Permission Modal (Only unique styles)
// Reuses unlockStyles for: container, closeButton, backdrop, cardContainer
// ============================================================

// Notification image dimensions - scales with card width for responsive design
const NOTIFICATION_IMAGE_WIDTH = CARD_WIDTH * 0.85; // 85% of card width
const NOTIFICATION_IMAGE_HEIGHT = NOTIFICATION_IMAGE_WIDTH * 0.64; // Maintain 280:180 aspect ratio (0.64)
const NOTIFICATION_IMAGE_SPACING = SCREEN_WIDTH * 0.05; // 5% of screen width (scales with device)

// Calculated values for perfect half-overlap
const NOTIFICATION_IMAGE_HALF = NOTIFICATION_IMAGE_HEIGHT / 2;
const NOTIFICATION_IMAGE_TOP = -NOTIFICATION_IMAGE_HALF; // Exactly half outside
const NOTIFICATION_CARD_PADDING_TOP = NOTIFICATION_IMAGE_HALF + NOTIFICATION_IMAGE_SPACING; // Half inside + spacing

// Card styling dimensions - all scale proportionally with card width
const NOTIFICATION_CARD_PADDING_HORIZONTAL = CARD_WIDTH * 0.073; // ~7.3% of card width (~24px on 328px)
const NOTIFICATION_CARD_PADDING_BOTTOM = CARD_WIDTH * 0.073; // Same as horizontal
const NOTIFICATION_CARD_BORDER_RADIUS = CARD_WIDTH * 0.076; // ~7.6% of card width (~25px on 328px)
const NOTIFICATION_CARD_MIN_HEIGHT = CARD_WIDTH * 0.79; // ~79% of card width (~260px on 328px)

// Text sizing - scales with card width
const NOTIFICATION_HEADING_SIZE = CARD_WIDTH * 0.085; // ~8.5% of card width (~28px on 328px)
const NOTIFICATION_DESCRIPTION_SIZE = CARD_WIDTH * 0.049; // ~4.9% of card width (~16px on 328px)
const NOTIFICATION_BUTTON_HEIGHT = CARD_WIDTH * 0.152; // ~15.2% of card width (~50px on 328px)
const NOTIFICATION_BUTTON_BORDER_RADIUS = NOTIFICATION_BUTTON_HEIGHT / 2; // Perfect pill shape

const notificationStyles = StyleSheet.create({
  imageWrapper: {
    position: "absolute",
    top: NOTIFICATION_IMAGE_TOP, // Auto-calculated: exactly half outside, half inside
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
    alignItems: "center", // Centers image horizontally within wrapper
  },
  desertImage: {
    width: NOTIFICATION_IMAGE_WIDTH,
    height: NOTIFICATION_IMAGE_HEIGHT,
  },
  card: {
    width: CARD_WIDTH,
    minHeight: NOTIFICATION_CARD_MIN_HEIGHT, // Scales with card width
    borderRadius: NOTIFICATION_CARD_BORDER_RADIUS, // Scales with card width
    paddingTop: NOTIFICATION_CARD_PADDING_TOP, // Auto-calculated: half image + spacing
    paddingHorizontal: NOTIFICATION_CARD_PADDING_HORIZONTAL, // Scales with card width
    paddingBottom: NOTIFICATION_CARD_PADDING_BOTTOM, // Scales with card width
    alignItems: "center",
    ...ArchivesTheme.shadows.medium,
  },
  heading: {
    fontFamily: "DM Sans",
    fontSize: NOTIFICATION_HEADING_SIZE, // Scales with card width
    fontWeight: "700",
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: "center",
    lineHeight: NOTIFICATION_HEADING_SIZE * 1.21, // 121% of font size (~34px from 28px)
    marginBottom: CARD_WIDTH * 0.037, // ~3.7% of card width (~12px on 328px)
  },
  description: {
    fontFamily: "DM Sans",
    fontSize: NOTIFICATION_DESCRIPTION_SIZE, // Scales with card width
    fontWeight: "500",
    color: ArchivesTheme.colors.persianOrange,
    textAlign: "center",
    lineHeight: NOTIFICATION_DESCRIPTION_SIZE * 1.375, // 137.5% of font size (~22px from 16px)
    marginBottom: CARD_WIDTH * 0.073, // ~7.3% of card width (~24px on 328px)
  },
  enableButton: {
    width: "100%",
    height: NOTIFICATION_BUTTON_HEIGHT, // Scales with card width
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderRadius: NOTIFICATION_BUTTON_BORDER_RADIUS, // Perfect pill shape
    alignItems: "center",
    justifyContent: "center",
    ...ArchivesTheme.shadows.small, // Use theme's shadow for consistency
  },
  enableButtonText: {
    fontFamily: "DM Sans",
    fontSize: NOTIFICATION_DESCRIPTION_SIZE, // Same as description (16px)
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});

// ============================================================
// STYLES - iOS Re-Permission Modal (Extends notification styles)
// ============================================================

const iosRepermissionStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    minHeight: 280, // Slightly taller for "Not now" link
    borderRadius: 25,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
    ...ArchivesTheme.shadows.medium,
  },
  notNowButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  notNowText: {
    fontFamily: "DM Sans",
    fontSize: 14,
    fontWeight: "600",
    color: ArchivesTheme.colors.dullBeige,
    textDecorationLine: "underline",
  },
});
