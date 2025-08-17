// Adventure1_Module3_Lesson1.tsx - Trade Routes Through Damascus
// Static map view with Read modal showing Damascus trade routes and cultural exchange

import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Adventure1_Module3_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
}

export default function Adventure1_Module3_Lesson1({
  onContinue,
  onDismiss,
}: Adventure1_Module3_Lesson1Props) {
  const [showReadContent, setShowReadContent] = useState(false);

  const handleContinue = () => {
    console.log("🔄 Continue button pressed in Module3 Lesson1");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onContinue();
  };

  const handleReadPress = () => {
    console.log("📖 Read button pressed in Module3 Lesson1");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowReadContent(true);
  };

  return (
    <>
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Main Damascus map - completely full screen */}
        <Image 
          source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Interactive+map.jpg" }}
          style={styles.mapImage}
          resizeMode="cover"
        />
        
        {/* Text overlay at the top */}
        <View style={styles.textOverlay}>
          <Text style={styles.overlayText}>
            Trade Routes Through Damascus
          </Text>
        </View>
        
        {/* Bottom overlay with buttons */}
        <View style={styles.bottomOverlay}>
          <View style={styles.buttonRow}>
            {/* Read button - left */}
            <TouchableOpacity 
              style={styles.readButton}
              onPress={handleReadPress}
            >
              <Ionicons name="reader-outline" size={18} color="white" />
              <Text style={styles.buttonText}>Read</Text>
            </TouchableOpacity>
            
            {/* Continue button - right */}
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Back Button - Top Left */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={onDismiss}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Read content modal sheet */}
        <Modal
          visible={showReadContent}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowReadContent(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalDragIndicatorContainer}
                onPress={() => setShowReadContent(false)}
                activeOpacity={0.7}
              >
                <View style={styles.modalDragIndicator} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.modalBody}>
                {/* Title Section */}
                <View style={styles.titleSection}>
                  <Text style={styles.readTitle}>Trade Routes Through Damascus</Text>
                  <Text style={styles.readSubtitle}>Module 3 • Lesson 1</Text>
                </View>

                {/* Historical Content */}
                <View style={styles.contentSection}>
                  <Text style={styles.sectionTitle}>Historical Context</Text>
                  <Text style={styles.bodyText}>
                    Damascus was more than a capital - it was a crossroads. Caravans came from Arabia, Persia, and Byzantium, carrying goods, ideas, and languages. Traders brought glass from Sasanian workshops, silks from the east, and spices from the south. All of it passed through Damascus, where markets buzzed and cultures mixed. With Arabic rising as the common language, trade became faster - and friendships crossed borders.
                  </Text>
                </View>

                {/* Key Terms Section */}
                <View style={styles.keyTermsSection}>
                  <Text style={styles.sectionTitle}>Key Terms</Text>
                  <View style={styles.keyTermsContainer}>
                    <View style={styles.keyTermRow}>
                      <Text style={styles.keyTermTitle}>Trade Routes</Text>
                      <Text style={styles.keyTermDefinition}>Ancient paths connecting Arabia, Persia, and Byzantium through Damascus</Text>
                    </View>
                    <View style={styles.keyTermRow}>
                      <Text style={styles.keyTermTitle}>Caravans</Text>
                      <Text style={styles.keyTermDefinition}>Groups of merchants traveling together for safety and trade</Text>
                    </View>
                    <View style={styles.keyTermRow}>
                      <Text style={styles.keyTermTitle}>Crossroads</Text>
                      <Text style={styles.keyTermDefinition}>A place where different trade routes and cultures meet</Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },

  // Main map image - full screen
  mapImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
  },

  // Text overlay at the top
  textOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  overlayText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    lineHeight: 26,
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    shadowColor: 'black',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },

  // Bottom overlay with buttons
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
  },
  
  // Button row at bottom
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  // Read button - left side
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginLeft: 8,
  },
  
  // Continue button - right side
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderRadius: 20,
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  continueButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginRight: 8,
  },

  // Back Button - Top Left
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 20,
    paddingTop: 8,
    paddingLeft: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalDragIndicatorContainer: {
    paddingVertical: 8,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  modalDragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 2,
  },
  
  modalContent: {
    flex: 1,
  },
  modalBody: {
    padding: 16,
  },
  
  // Title section
  titleSection: {
    marginBottom: 24,
  },
  readTitle: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 8,
  },
  readSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  
  // Content sections
  contentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 12,
  },
  bodyText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: ArchivesTheme.colors.shoeBrown,
    lineHeight: 24,
  },
  
  // Key terms section
  keyTermsSection: {
    marginBottom: 24,
  },
  keyTermsContainer: {
    backgroundColor: 'rgba(31, 81, 101, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  keyTermRow: {
    marginBottom: 12,
  },
  keyTermTitle: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 4,
  },
  keyTermDefinition: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
  },
});