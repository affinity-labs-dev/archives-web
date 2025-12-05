// Exact replica of Archives Affinity Labs SwiftUI LandingPage
// Pixel-perfect conversion with video background and feature cards

import ArchivesTheme from "../constants/ArchivesTheme";
import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAnalytics } from "@/hooks/useAnalytics";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function LandingPage() {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { trackScreenView, trackAppOpened, trackVideoPlayed } = useAnalytics();

  console.log('🎬 [LandingPage] Component initializing...');
  console.log('🎬 [LandingPage] Platform:', Platform.OS);
  console.log('🎬 [LandingPage] Screen dimensions:', { screenWidth, screenHeight });

  // Create video player for background video
  const player = useVideoPlayer(require("@/assets/videos/archives_intro.mp4"), player => {
    console.log('🎬 [Video Player] Initialization callback called');
    console.log('🎬 [Video Player] Player object:', !!player);
    
    try {
      player.loop = true;
      console.log('🎬 [Video Player] Loop enabled');
      
      player.muted = true;
      console.log('🎬 [Video Player] Muted enabled');
      
      player.play();
      console.log('🎬 [Video Player] Play() called');
    } catch (error) {
      console.error('🎬 [Video Player] Error during setup:', error);
    }
  });

  console.log('🎬 [Video Player] useVideoPlayer completed, player:', !!player);

  // Simple video control - no aggressive cleanup
  // Let React Native and expo-video handle their own lifecycle

  // Add a timeout to check if video loading is stuck
  useEffect(() => {
    console.log('🎬 [Timeout] Setting up video loading timeout check...');
    
    const timeout = setTimeout(() => {
      if (!videoLoaded) {
        console.warn('🎬 [Timeout] Video not loaded after 10 seconds - possible issue');
        console.log('🎬 [Timeout] Current player state:', !!player);
        console.log('🎬 [Timeout] Platform:', Platform.OS);
        
        // Try to get player status if available
        try {
          if (player && player.status) {
            console.log('🎬 [Timeout] Player status:', player.status);
          }
        } catch (error) {
          console.error('🎬 [Timeout] Error checking player status:', error);
        }
      }
    }, 10000); // 10 second timeout

    return () => {
      console.log('🎬 [Timeout] Clearing timeout...');
      clearTimeout(timeout);
    };
  }, [videoLoaded, player]);

  // Track screen view and app opened when component mounts
  useEffect(() => {
    trackScreenView('Landing Page');
    trackAppOpened();
  }, [trackScreenView, trackAppOpened]);

  // If already signed in, redirect to era selection
  useEffect(() => {
    if (isSignedIn) {
      console.log("LandingPage - User signed in, redirecting to era selection");
      router.replace("/(tabs)/eras?mode=onboarding");
    }
  }, [isSignedIn, router]);

  // Handle video loading state and track video play
  useEffect(() => {
    if (!player) {
      return;
    }

    try {
      const subscription = player.addListener('statusChange', (status) => {
        if (status.status === 'readyToPlay' && !videoLoaded) {
          console.log('🎬 Video ready to play');
          trackVideoPlayed("archives_intro.mp4");
          setVideoLoaded(true);
        }
      });

      return () => {
        subscription?.remove();
      };
    } catch (error) {
      console.warn('🎬 Video status listener error:', error);
    }
  }, [player, videoLoaded, trackVideoPlayed]);

  // Simple focus-based video control
  useEffect(() => {
    // Auto-play video when component mounts (if loaded)
    if (player && videoLoaded) {
      try {
        player.play();
        console.log('🎬 Video started playing on mount');
      } catch (error) {
        console.warn('🎬 Could not auto-play video:', error);
      }
    }
  }, [player, videoLoaded]);

  const handleGetStarted = () => {
    router.push("/archives-auth?mode=signup");
  };

  const handleSignIn = () => {
    router.push("/archives-auth?mode=signin");
  };

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <View style={styles.container}>
        {/* Background Video or Fallback Gradient */}
        <LinearGradient
          colors={[
            ArchivesTheme.colors.shoeBrown,
            ArchivesTheme.colors.mutedNavy,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fallbackGradient}
        />
        
        {/* Video View - Render when loaded */}
        {videoLoaded && (
          <VideoView
            player={player}
            style={styles.backgroundVideo}
            contentFit="cover"
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
        )}

        {/* Dark Overlay - 75% opacity */}
        <View
          style={[
            styles.backgroundVideo,
            { backgroundColor: "rgba(0,0,0,0.75)" },
          ]}
        />

        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Top Spacer - 120px */}
          <View style={styles.topSpacer} />

          {/* Archives Logo - Height 60px, Bottom Margin 20px */}
          <Image
            source={require("@/assets/images/logos/archives-logo-light.png")}
            style={styles.archivesLogo}
            resizeMode="contain"
          />

          {/* Subtitle Section - Spacing 5px between lines */}
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitleText}>Islamic History</Text>
            <Text style={styles.subtitleText}>5 Minutes At A Time</Text>
          </View>

          {/* Flexible Spacer */}
          <View style={styles.flexSpacer} />

          {/* Feature Cards - Exact widths: 102, 126, 108 */}
          <View style={styles.featureCardsContainer}>
            <FeatureCard
              icon={require("@/assets/images/icons/map.png")}
              title={"Pick" + "\n" + "An Era"}
              width={102}
            />
            <FeatureCard
              icon={require("@/assets/images/icons/treasure-chest.png")}
              title={"Unlock" + "\n" + "Quests"}
              width={126}
            />
            <FeatureCard
              icon={require("@/assets/images/icons/token.png")}
              title={"Earn" + "\n" + "Badges"}
              width={108}
            />
          </View>

          {/* Flexible Spacer */}
          <View style={styles.flexSpacer} />

          {/* Sign In Button */}
          <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
            <Text style={styles.signInText}>SIGN IN</Text>
          </TouchableOpacity>

          {/* Get Started Button */}
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
          >
            <Text style={styles.getStartedText}>GET STARTED</Text>
          </TouchableOpacity>

          {/* Bottom Spacer - 60px */}
          <View style={styles.bottomSpacer} />
        </View>
      </View>
    </>
  );
}

// Feature Card Component - Exact replica
interface FeatureCardProps {
  icon: any;
  title: string;
  width: number;
}

function FeatureCard({ icon, title, width }: FeatureCardProps) {
  return (
    <View style={styles.featureCardContainer}>
      {/* Icon - 60x60 */}
      <Image source={icon} style={styles.featureIcon} resizeMode="contain" />

      {/* Title Container - Exact width, height 50px */}
      <View style={[styles.featureTitleContainer, { width }]}>
        <Text style={styles.featureTitleText}>{title}</Text>
      </View>
    </View>
  );
}

// EXACT REPLICA STYLES - Pixel-perfect match to SwiftUI
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundVideo: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: screenWidth,
    height: screenHeight,
  },
  fallbackGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    opacity: 0.8,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    zIndex: 1,
  },

  // Spacing (exact match)
  topSpacer: {
    height: 120,
  },
  flexSpacer: {
    flex: 1,
  },
  bottomSpacer: {
    height: 60,
  },

  // Archives Logo (exact match)
  archivesLogo: {
    height: 60,
    marginBottom: 20,
  },

  // Subtitle Section (exact match)
  subtitleContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  subtitleText: {
    ...ArchivesTheme.typography.bodyLarge,
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
    lineHeight: 25,
    marginVertical: 2.5, // 5px spacing / 2
  },

  // Feature Cards (exact match)
  featureCardsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  featureCardContainer: {
    alignItems: "center",
  },
  featureIcon: {
    width: 60,
    height: 60,
    marginBottom: 5,
  },
  featureTitleContainer: {
    height: 50,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  featureTitleText: {
    ...ArchivesTheme.typography.body,
    fontWeight: "500",
    color: "white",
    textAlign: "center",
    lineHeight: 18,
  },

  // Get Started Button (exact match)
  getStartedButton: {
    width: 345,
    height: 48,
    backgroundColor: ArchivesTheme.colors.mossGreenShadow,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  getStartedText: {
    ...ArchivesTheme.typography.buttonLarge,
    fontSize: 20,
    fontWeight: "600",
    color: "white",
  },

  // Sign In Button (exact match)
  signInButton: {
    width: 345,
    height: 45,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 26.5,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.persianOrange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  signInText: {
    ...ArchivesTheme.typography.buttonLarge,
    fontSize: 20,
    fontWeight: "600",
    color: ArchivesTheme.colors.creamWhite,
  },
});
