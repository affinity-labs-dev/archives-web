// Native subscription implementation for iOS/Android - Rich UI with Original Design
import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SubscribeContent() {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [loading, setLoading] = useState(false);

  // Simple subscription state - can be controlled manually for testing
  const [isSubscribed, setIsSubscribed] = useState(false);

  console.log('💎 SubscribeContent rendered with state:', {
    isSubscribed,
    selectedPlan,
    loading
  });

  // If user is already subscribed, show success state
  if (isSubscribed) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.subscribedContainer}>
            <Ionicons
              name="checkmark-circle"
              size={80}
              color={ArchivesTheme.colors.mossGreen}
              style={styles.subscribedIcon}
            />
            <Text style={styles.subscribedTitle}>Archives Explorer Pass Active!</Text>
            <Text style={styles.subscribedMessage}>
              You have unlimited access to all historical eras and adventures!
            </Text>

            <View style={styles.explorerPassSection}>
              <Text style={styles.featuresHeader}>
                Your Explorer Pass includes:
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={ArchivesTheme.colors.persianOrange}
                  />
                  <Text style={styles.featureText}>
                    All Historical Eras & Adventures
                  </Text>
                </View>

                <View style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={ArchivesTheme.colors.persianOrange}
                  />
                  <Text style={styles.featureText}>New Learning Modules</Text>
                </View>

                <View style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={ArchivesTheme.colors.persianOrange}
                  />
                  <Text style={styles.featureText}>Exclusive Badges</Text>
                </View>

                <View style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={ArchivesTheme.colors.persianOrange}
                  />
                  <Text style={styles.featureText}>Early Access to New Eras</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const handleSubscribe = async () => {
    try {
      setLoading(true);

      console.log('🎯 Subscribe button pressed for plan:', selectedPlan);

      // Show "Coming Soon" alert instead of processing payment
      Alert.alert(
        "Subscription Coming Soon!",
        `Thank you for your interest in the ${selectedPlan} Archives Explorer Pass! \n\nSubscription features will be available in the next update. Stay tuned for premium content and exclusive features!`,
        [
          {
            text: "Got it!",
            style: "default"
          },
          {
            text: "Preview Premium (Demo)",
            style: "default",
            onPress: () => {
              // For demo purposes, temporarily set subscribed state
              setIsSubscribed(true);
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('❌ Subscribe error:', error);
      Alert.alert(
        "Error",
        "Something went wrong. Please try again later.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Header with Character Illustration - Original Rich Design */}
        <View style={styles.headerSection}>
          {/* Title and subtitle grouped together */}
          <View style={styles.titleGroup}>
            <Text style={styles.title}>Subscription</Text>
            <Text style={styles.unlockMessage}>
              Unlock the full Archives experience!
            </Text>
          </View>

          {/* Character Illustration Container - Overlap effect */}
          <View style={styles.characterSection}>
            <View style={styles.characterBackground} />
            <Image
              source={require("@/assets/images/Explorer.png")}
              style={styles.explorerImage}
            />
          </View>
        </View>

        {/* Pricing Options - Interactive Selection */}
        <View style={styles.pricingContainer}>
          {/* Monthly Plan */}
          <TouchableOpacity
            style={[
              styles.pricingOption,
              selectedPlan === "monthly" && styles.pricingOptionSelected,
            ]}
            onPress={() => setSelectedPlan("monthly")}
          >
            <View style={styles.priceDisplayRow}>
              <Text style={styles.priceMain}>£4</Text>
              <Text style={styles.priceDecimal}>.99</Text>
            </View>
            <Text style={styles.originalPrice}>£9.99</Text>
            <Text style={styles.planDuration}>Monthly</Text>
            {selectedPlan === "monthly" && (
              <View style={styles.selectedIndicator}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={ArchivesTheme.colors.mossGreen}
                />
              </View>
            )}
          </TouchableOpacity>

          {/* Vertical Separator */}
          <View style={styles.pricingSeparator} />

          {/* Yearly Plan */}
          <TouchableOpacity
            style={[
              styles.pricingOption,
              selectedPlan === "yearly" && styles.pricingOptionSelected,
            ]}
            onPress={() => setSelectedPlan("yearly")}
          >
            <View style={styles.priceDisplayRow}>
              <Text style={styles.priceMain}>£49</Text>
              <Text style={styles.priceDecimal}>.99</Text>
            </View>
            <Text style={styles.originalPrice}>£89.99</Text>
            <Text style={styles.planDuration}>Yearly</Text>
            {selectedPlan === "yearly" && (
              <View style={styles.selectedIndicator}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={ArchivesTheme.colors.mossGreen}
                />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Explorer Pass Features Card - Original Design */}
        <View style={styles.explorerPassSection}>
          <Text style={styles.featuresHeader}>
            With the EXPLORER PASS, you get:
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={ArchivesTheme.colors.persianOrange}
              />
              <Text style={styles.featureText}>
                All Historical Eras & Adventures
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={ArchivesTheme.colors.persianOrange}
              />
              <Text style={styles.featureText}>New Learning Modules</Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={ArchivesTheme.colors.persianOrange}
              />
              <Text style={styles.featureText}>Exclusive Badges</Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={ArchivesTheme.colors.persianOrange}
              />
              <Text style={styles.featureText}>Early Access to New Eras</Text>
            </View>
          </View>
        </View>

        {/* More Eras Section - Original Design */}
        <View style={styles.moreErasSection}>
          <Text style={styles.moreErasTitle}>More Eras!</Text>
          <Text style={styles.moreErasDescription}>
            More Eras are on the way! Your Explorer Pass includes all upcoming
            content at no extra cost.
          </Text>

          {/* Era Preview Cards - Scrollable */}
          <ScrollView
            horizontal
            style={styles.eraCardsScrollView}
            contentContainerStyle={styles.eraCardsContainer}
            showsHorizontalScrollIndicator={false}
          >
            <View style={styles.eraCard}>
              <Image
                source={require("@/assets/images/eras/umayyad-bg.png")}
                style={styles.eraCardImage}
              />
              <LinearGradient
                colors={[
                  "rgba(0,0,0,0)", // Top: 0% opacity
                  "rgba(0,0,0,0.65)", // Medium: 65% opacity
                  "rgba(0,0,0,0.7)", // Bottom: 70% opacity
                ]}
                locations={[0, 0.5, 1.0]}
                style={styles.eraCardGradient}
              />
              <View style={styles.eraCardOverlay}>
                <Text style={styles.eraCardTitle}>Rise of Islam</Text>
                <Text style={styles.eraCardSubtitle}>(570-632 CE)</Text>
              </View>
            </View>

            <View style={styles.eraCard}>
              <Image
                source={require("@/assets/images/eras/era3-bg.jpg")}
                style={styles.eraCardImage}
              />
              <LinearGradient
                colors={[
                  "rgba(0,0,0,0)", // Top: 0% opacity
                  "rgba(0,0,0,0.65)", // Medium: 65% opacity
                  "rgba(0,0,0,0.7)", // Bottom: 70% opacity
                ]}
                locations={[0, 0.5, 1.0]}
                style={styles.eraCardGradient}
              />
              <View style={styles.eraCardOverlay}>
                <Text style={styles.eraCardTitle}>Abbasid Golden Age</Text>
                <Text style={styles.eraCardSubtitle}>(750-1258 CE)</Text>
              </View>
            </View>

            <View style={styles.eraCard}>
              <Image
                source={require("@/assets/images/eras/era1-bg.jpg")}
                style={styles.eraCardImage}
              />
              <LinearGradient
                colors={[
                  "rgba(0,0,0,0)", // Top: 0% opacity
                  "rgba(0,0,0,0.65)", // Medium: 65% opacity
                  "rgba(0,0,0,0.7)", // Bottom: 70% opacity
                ]}
                locations={[0, 0.5, 1.0]}
                style={styles.eraCardGradient}
              />
              <View style={styles.eraCardOverlay}>
                <Text style={styles.eraCardTitle}>Ottoman Empire</Text>
                <Text style={styles.eraCardSubtitle}>(1299-1922 CE)</Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Subscribe Button - Original Design with Enhanced Styling */}
        <TouchableOpacity
          style={
            loading ? styles.subscribeButtonDisabled : styles.subscribeButton
          }
          onPress={handleSubscribe}
          disabled={loading}
        >
          <Text style={loading ? styles.buttonTextDisabled : styles.buttonText}>
            {loading ? "Processing..." : "Get Access"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimerText}>
          Cancel anytime. Terms and privacy policy apply.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles matching EXACT SwiftUI SubscriptionView implementation
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Header Section - Original Design
  headerSection: {
    marginBottom: 30,
  },
  titleGroup: {
    alignItems: "flex-start", // Left align the title group
    marginBottom: 20,
    paddingLeft: 8, // Added left padding to move text slightly right
  },
  title: {
    fontFamily: "DM Sans",
    fontSize: 24,
    fontWeight: "600", // SemiBold
    color: "#41425E", // Exact color from gradient
    textAlign: "left",
    lineHeight: 28, // Increased to 117% line height (24px * 1.17) to prevent clipping
    letterSpacing: 0, // 0% letter spacing
    marginBottom: 4,
    paddingVertical: 2, // Added vertical padding to ensure text isn't clipped
  },

  // Character Illustration - Original Overlap Effect
  characterSection: {
    alignItems: "center",
    marginBottom: 20,
    height: 140, // Increased height to accommodate overlap
  },
  characterBackground: {
    position: "absolute",
    top: 40, // Moved further down for more overlap
    width: 200, // Increased width for longer rectangle
    height: 112,
    borderRadius: 15, // Same as quiz system - rounded corners
    backgroundColor: "white",
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  explorerImage: {
    position: "absolute",
    top: 0, // Position to overlap the background
    width: 180, // Slightly larger to extend beyond background
    height: 140, // Taller to create overlap effect
    resizeMode: "contain",
    zIndex: 1, // Ensure image is above background
  },
  unlockMessage: {
    fontFamily: "DM Sans", // DM Sans as requested
    fontSize: 18,
    fontWeight: "500",
    color: ArchivesTheme.colors.persianOrange,
    textAlign: "left", // Left aligned to match title
  },

  // Pricing Container - Original Design
  pricingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30, // More space before white box
    paddingHorizontal: 20, // Reduced padding for more spacing
  },
  pricingOption: {
    alignItems: "center", // Center align within each column
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  pricingOptionSelected: {
    borderColor: ArchivesTheme.colors.mossGreen,
    backgroundColor: "rgba(149, 156, 0, 0.05)", // Very light moss green background
  },
  selectedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 2,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  pricingSeparator: {
    width: 1,
    height: 100, // Even taller separator
    backgroundColor: ArchivesTheme.colors.mutedNavy,
    opacity: 0.2,
    marginHorizontal: 20, // Reduced margin to bring options closer
  },
  priceDisplayRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  priceMain: {
    fontFamily: "DM Sans",
    fontSize: 36, // Larger to match image
    fontWeight: "700", // Bolder
    color: ArchivesTheme.colors.mutedNavy,
  },
  priceDecimal: {
    fontFamily: "DM Sans",
    fontSize: 20, // Slightly larger
    fontWeight: "400", // Lighter weight
    color: ArchivesTheme.colors.mutedNavy,
    opacity: 0.6, // More muted
  },
  originalPrice: {
    fontFamily: "DM Sans",
    fontSize: 16, // Slightly larger
    fontWeight: "400",
    color: ArchivesTheme.colors.mutedNavy,
    opacity: 0.4, // More muted
    textDecorationLine: "line-through",
    marginBottom: 12, // Reduced space before plan duration
  },
  planDuration: {
    fontFamily: "DM Sans",
    fontSize: 16, // Larger
    fontWeight: "600", // Bolder
    color: ArchivesTheme.colors.mutedNavy,
  },

  // Explorer Pass Section - Original Design
  explorerPassSection: {
    backgroundColor: "#F8F9FA", // Light gray background like in image
    borderRadius: 16, // Slightly less rounded
    padding: 20, // Adjusted padding
    marginHorizontal: 16, // Add horizontal margin
    // Updated shadow to match the image
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuresHeader: {
    fontFamily: "DM Sans",
    fontSize: 16, // Slightly larger
    fontWeight: "600",
    color: "#41425E", // Darker color to match image
    textAlign: "left", // Left aligned like in image
    marginBottom: 16,
    marginTop: 0, // No top margin since it's the first element
  },
  featuresList: {
    // EXACT SwiftUI: VStack(alignment: .leading, spacing: 12)
  },
  featureItem: {
    flexDirection: "row", // HStack
    alignItems: "center",
    marginBottom: 14, // Slightly more spacing
    paddingVertical: 2, // Add vertical padding
  },
  featureText: {
    fontFamily: "DM Sans",
    fontSize: 15, // Slightly larger to match image
    fontWeight: "500", // Medium weight
    color: "#41425E", // Darker color to match image
    marginLeft: 12, // HStack spacing
  },

  // More Eras Section - Original Design
  moreErasSection: {
    marginTop: 40, // Increased space after white box
    marginBottom: 24,
    paddingHorizontal: 20, // Added horizontal padding
  },
  moreErasTitle: {
    fontFamily: "DM Sans",
    fontSize: 24, // Updated to 24px
    fontWeight: "600", // Updated to SemiBold (600)
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: "center",
    lineHeight: 20, // Updated to 20px line height
    letterSpacing: -0.24, // -1% letter spacing (24px * -0.01)
    marginBottom: 12, // Increased space below title
    paddingVertical: 4, // Added vertical padding around title
  },
  moreErasDescription: {
    fontFamily: "DM Sans",
    fontSize: 14, // Updated to 14px
    fontWeight: "500", // Updated to Medium (500)
    color: ArchivesTheme.colors.mutedNavy,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 14, // 100% line height (14px * 1.0)
    letterSpacing: -0.14, // -1% letter spacing (14px * -0.01)
    marginBottom: 20, // Increased space before era cards
    paddingHorizontal: 8,
  },
  eraCardsScrollView: {
    marginHorizontal: -16, // Extend to edges
  },
  eraCardsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 16, // More spacing between cards
  },
  eraCard: {
    width: 180, // Fixed width for scrollable cards (bigger)
    height: 200, // Increased height to accommodate larger text
    borderRadius: 16, // More rounded corners
    overflow: "hidden",
    position: "relative",
    // Add shadow like era selection
    shadowColor: "black",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  eraCardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  eraCardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  eraCardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16, // More padding for bigger cards
    // Removed backgroundColor since we have gradient
  },
  eraCardTitle: {
    fontFamily: "Cormorant-Bold", // Updated to Cormorant
    fontSize: 30, // Updated to 30px
    color: "white",
    lineHeight: 34, // Increased to 113% line height (30px * 1.13) to prevent clipping
    letterSpacing: -0.3, // -1% letter spacing (30px * -0.01 = -0.3)
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  eraCardSubtitle: {
    fontFamily: "DM Sans",
    fontSize: 12, // Slightly larger
    fontWeight: "500", // Medium weight
    color: "white",
    opacity: 0.9,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Subscribe Button - EXACT SwiftUI styling
  subscribeButton: {
    backgroundColor: ArchivesTheme.colors.mossGreen, // EXACT SwiftUI: Color("MossGreen")
    borderRadius: 16, // EXACT SwiftUI: RoundedRectangle(cornerRadius: 16)
    paddingVertical: 16, // EXACT SwiftUI: .padding(.vertical, 16)
    alignItems: "center",
    // EXACT SwiftUI shadow: .shadow(color: Color("MossGreen").opacity(0.3), radius: 8, x: 0, y: 4)
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  subscribeButtonDisabled: {
    backgroundColor: "#CCCCCC", // Gray disabled state
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    // No shadow for disabled state
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  buttonText: {
    fontFamily: "DM Sans", // EXACT SwiftUI: .font(.custom("DM Sans", size: 18))
    fontSize: 18, // Back to original size for better readability
    fontWeight: "600", // .fontWeight(.semibold)
    color: "white", // EXACT SwiftUI: .foregroundColor(.white)
  },
  buttonTextDisabled: {
    fontFamily: "DM Sans",
    fontSize: 18, // Back to original size to match active button
    fontWeight: "600",
    color: "#999999", // Darker gray text for disabled state
  },
  disclaimerText: {
    fontFamily: "DM Sans",
    fontSize: 12,
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: "center",
    lineHeight: 18,
  },

  // Subscribed state styles
  subscribedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  subscribedIcon: {
    marginBottom: 24,
  },
  subscribedTitle: {
    fontFamily: "DM Sans",
    fontSize: 28,
    fontWeight: "600",
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: "center",
    marginBottom: 12,
  },
  subscribedMessage: {
    fontFamily: "DM Sans",
    fontSize: 16,
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
    opacity: 0.8,
  },
});