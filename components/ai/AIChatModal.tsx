// AIChatModal.tsx - AI chat interface (Ibu - AI Assistant)
import ArchivesTheme from '@/constants/ArchivesTheme';
import { useAI } from '@/context/AIContext';
import { aiService } from '@/services/AIService';
import { analyticsService } from '@/services/AnalyticsService';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import {
  cacheDirectory,
  EncodingType,
  writeAsStringAsync,
  deleteAsync,
} from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// Character image for welcome screen
const HelloCharacter = require('@/assets/images/ai-images/hellocharacter.png');
// AI avatar for chat messages
const AIChatIcon = require('@/assets/images/ai-images/sayhi.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // Optional image data for generated images
  image?: {
    base64: string;
    mimeType: string;
  };
}

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
  initialMessages?: ChatMessage[];
  context?: {
    eraId?: string;
    eraName?: string;
    adventureId?: string;
    currentScreen?: string;
  };
}

export default function AIChatModal({
  visible,
  onClose,
  initialMessages = [],
  context = {},
}: AIChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image viewer state
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const { getUserProgressSummary } = useAI();
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  // Get user's first name for personalized greeting
  const userName = user?.firstName || 'Explorer';

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  useEffect(() => {
    if (visible) {
      analyticsService.trackCustomEvent('ai_chat_opened', {
        era_id: context?.eraId || 'unknown_era',
        message_count: messages.length,
      });
    }
  }, [visible]);

  // Save image to device photos
  const handleSaveToPhotos = async () => {
    if (!selectedImage) return;

    // Saving to photos is only supported on iOS and Android
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Saving images is only available on mobile devices.');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to save images to your photo library.');
        setIsSaving(false);
        return;
      }

      // Create a temporary file - cacheDirectory is guaranteed on iOS/Android
      const filename = `archives_ai_${Date.now()}.png`;
      const fileUri = cacheDirectory + filename;

      // Write base64 to file
      await writeAsStringAsync(fileUri, selectedImage.base64, {
        encoding: EncodingType.Base64,
      });

      // Save to media library
      await MediaLibrary.saveToLibraryAsync(fileUri);

      // Clean up temp file
      await deleteAsync(fileUri, { idempotent: true });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved!', 'Image saved to your photo library.');
      analyticsService.trackCustomEvent('ai_image_saved', {
        era_id: context?.eraId || 'unknown_era',
      });
    } catch (err) {
      console.error('❌ [AIChatModal] Error saving image:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save image. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async (messageToSend?: string) => {
    const userMessage = (messageToSend || inputText).trim();
    if (!userMessage || isLoading) return;

    setInputText('');
    setError(null);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Check if user is requesting an image
      const isImageRequest = aiService.isImageRequest(userMessage);

      if (isImageRequest) {
        // Generate image
        setIsGeneratingImage(true);
        console.log('🎨 [AIChatModal] Image request detected');
        const imageResult = await aiService.generateImage({
          prompt: userMessage,
          context: {
            eraName: context.eraName,
            adventureId: context.adventureId,
          },
        });

        if (imageResult) {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: imageResult.caption || 'Here is the generated image:',
            timestamp: new Date(),
            image: {
              base64: imageResult.imageBase64,
              mimeType: imageResult.mimeType,
            },
          };

          setMessages((prev) => [...prev, aiMsg]);
          analyticsService.trackCustomEvent('ai_image_generated', {
            era_id: context?.eraId || 'unknown_era',
          });
        } else {
          throw new Error('Failed to generate image');
        }
      } else {
        // Regular text chat
        const progressSummary = getUserProgressSummary();
        const response = await aiService.getChatResponse({
          userMessage,
          conversationHistory: messages,
          context: {
            eraName: context.eraName || 'Islamic History',
            adventureId: context.adventureId,
            currentScreen: context.currentScreen,
          },
          userProgress: progressSummary,
        });

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMsg]);
        analyticsService.trackCustomEvent('ai_chat_response_received', {
          era_id: context?.eraId || 'unknown_era',
          response_length: response.length,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('❌ [AIChatModal] Error:', err);
      setError('Sorry, I could not process that. Please try again.');
      analyticsService.trackCustomEvent('ai_chat_error', { era_id: context?.eraId || 'unknown_era' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
      setIsGeneratingImage(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analyticsService.trackCustomEvent('ai_chat_closed', {
      era_id: context?.eraId || 'unknown_era',
      message_count: messages.length,
    });
    onClose();
  };

  // Open image in full screen viewer
  const handleImagePress = (image: { base64: string; mimeType: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedImage(image);
  };

  // Handle suggestion button press
  const handleSuggestionPress = (suggestion: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSend(suggestion);
  };

  // Suggestion buttons for welcome screen
  const suggestions = [
    'What should I learn next?',
    'Explain this era to me',
    "Quiz me on what I've learned",
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleClose} activeOpacity={0.6}>
            <Ionicons name="chevron-back" size={28} color={ArchivesTheme.colors.shoeBrown} />
          </TouchableOpacity>

          {/* Title with avatar and pill */}
          <View style={styles.titleContainer}>
            <Image source={AIChatIcon} style={styles.titleAvatar} contentFit="cover" />
            <View style={styles.titlePill}>
              <Text style={styles.titleText}>
                <Text style={styles.titleTextBold}>Ibu, </Text>
                your AI learning buddy
              </Text>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <View style={styles.welcomeContainer}>
                {/* Speech Bubble */}
                <View style={styles.speechBubble}>
                  <Text style={styles.speechText}>
                    Hi {userName}, I&apos;m Ibu, your{' '}
                    <Text style={styles.speechTextBold}>AI learning buddy</Text>
                    . I know Islamic history &amp; your progress. Ask me anything!
                  </Text>
                  {/* Speech bubble pointer with border - SVG arrow */}
                  <View style={styles.speechPointer}>
                    <Svg width="36" height="18" viewBox="0 0 36 18" style={{ position: 'absolute' }}>
                      {/* White filled triangle (no stroke) */}
                      <Path
                        d="M18 18 L0 0 L36 0 Z"
                        fill="white"
                      />
                      {/* Green line on left diagonal edge */}
                      <Path
                        d="M18 18 L0 0"
                        stroke={ArchivesTheme.colors.mossGreen}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      {/* Green line on right diagonal edge */}
                      <Path
                        d="M18 18 L36 0"
                        stroke={ArchivesTheme.colors.mossGreen}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      {/* White line on horizontal base (top) - blends with background */}
                      <Path
                        d="M0 0 L36 0"
                        stroke="white"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </Svg>
                  </View>
                </View>

                {/* Character Image */}
                <View style={styles.characterContainer}>
                  <Image source={HelloCharacter} style={styles.characterImage} contentFit="contain" />
                </View>

                {/* Suggestion Buttons */}
                <View style={styles.suggestionsContainer}>
                  {suggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion}
                      style={styles.suggestionButton}
                      onPress={() => handleSuggestionPress(suggestion)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.suggestionShadow} />
                      <View style={styles.suggestionInner}>
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              messages.map((message) => (
                <View
                  key={message.id}
                  style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}
                >
                  {message.role === 'user' ? (
                    <View style={styles.userContent}>
                      <Text style={styles.userText}>{message.content}</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.assistantContent}>
                        <Text style={styles.assistantText}>{message.content}</Text>
                      </View>
                      {/* Render generated image if present - full width, tappable for full view */}
                      {message.image && (
                        <TouchableOpacity
                          onPress={() => handleImagePress(message.image!)}
                          activeOpacity={0.9}
                          style={styles.generatedImageContainer}
                        >
                          <Image
                            source={{ uri: `data:${message.image.mimeType};base64,${message.image.base64}` }}
                            style={styles.generatedImage}
                            contentFit="cover"
                          />
                          <View style={styles.tapToViewHint}>
                            <Ionicons name="expand-outline" size={14} color="white" />
                            <Text style={styles.tapToViewText}>Tap to expand</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              ))
            )}

            {isLoading && (
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={ArchivesTheme.colors.persianOrange} />
                  <Text style={styles.loadingText}>
                    {isGeneratingImage ? 'Generating image...' : 'Thinking...'}
                  </Text>
                </View>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#E74C3C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Input Bar */}
          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Plus button for image generation */}
            <TouchableOpacity
              style={styles.plusButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setInputText('Generate an image of ');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={24} color="#9A8B7A" />
            </TouchableOpacity>

            {/* Text Input with Send Button inside */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="What are you curious about?"
                placeholderTextColor="#9A8B7A"
                multiline
                maxLength={500}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
                blurOnSubmit={false}
              />
              {/* Send button inside input */}
              <TouchableOpacity
                style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-up" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Full-screen Image Viewer Modal */}
      <Modal
        visible={selectedImage !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageViewerContainer}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.imageViewerCloseButton}
            onPress={() => setSelectedImage(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={40} color="white" />
          </TouchableOpacity>

          {/* Full-screen image */}
          {selectedImage && (
            <Image
              source={{ uri: `data:${selectedImage.mimeType};base64,${selectedImage.base64}` }}
              style={styles.fullScreenImage}
              contentFit="contain"
            />
          )}

          {/* Save to Photos button */}
          <TouchableOpacity
            style={styles.saveToPhotosButton}
            onPress={handleSaveToPhotos}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="download-outline" size={24} color="white" />
                <Text style={styles.saveToPhotosText}>Save to Photos</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  titleAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  titlePill: {
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderRadius: 55,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  titleText: {
    fontFamily: 'DM Sans SemiBold',
    fontSize: 14,
    color: 'white',
    letterSpacing: -0.16,
  },
  titleTextBold: {
    fontFamily: 'DM Sans Bold',
    fontWeight: '700',
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },

  // Welcome Screen Styles
  welcomeContainer: {
    flex: 1,
    paddingTop: 0,
    alignItems: 'center',
  },
  speechBubble: {
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: ArchivesTheme.colors.mossGreen,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 8,
    width: SCREEN_WIDTH - 80,
    maxWidth: 300,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1,
  },
  speechPointer: {
    position: 'absolute',
    bottom: -17.5,
    left: 40,
    width: 36,
    height: 18,
  },
  speechText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '400',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    lineHeight: 22,
  },
  speechTextBold: {
    fontWeight: '700',
  },
  characterContainer: {
    alignItems: 'center',
    marginTop: 5,
  },
  characterImage: {
    width: 140,
    height: 200,
  },

  // Suggestion Buttons
  suggestionsContainer: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 30,
  },
  suggestionButton: {
    position: 'relative',
    height: 48,
  },
  suggestionShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 7,
    height: 41,
    backgroundColor: ArchivesTheme.colors.shoeBrown,
    borderRadius: 27,
  },
  suggestionInner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 45,
    backgroundColor: 'white',
    borderRadius: 26.5,
    borderWidth: 1,
    borderColor: ArchivesTheme.colors.shoeBrown,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionText: {
    fontFamily: 'DM Sans SemiBold',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
    letterSpacing: -0.14,
  },

  // Message Bubbles
  messageBubble: {
    marginBottom: 16,
  },
  userBubble: {
    alignItems: 'flex-end',
  },
  assistantBubble: {
    alignItems: 'flex-start',
  },
  userContent: {
    maxWidth: '75%',
    backgroundColor: 'white',
    borderRadius: 20,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: '#E0D5C5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  assistantContent: {
    maxWidth: '85%',
  },
  userText: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    lineHeight: 22,
    color: ArchivesTheme.colors.mutedNavy,
  },
  assistantText: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    lineHeight: 22,
    color: ArchivesTheme.colors.mutedNavy,
  },
  generatedImageContainer: {
    width: '100%',
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  generatedImage: {
    width: '100%',
    height: 220,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  tapToViewHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  tapToViewText: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: 'white',
    marginLeft: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    color: ArchivesTheme.colors.mutedNavy,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#E74C3C',
    marginLeft: 8,
    flex: 1,
  },

  // Input Bar
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    // paddingBottom is set dynamically using insets.bottom
    gap: 8,
  },
  plusButton: {
    width: 47,
    height: 47,
    borderRadius: 23.5,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 47,
  },
  input: {
    flex: 1,
    fontFamily: 'DM Sans Medium',
    fontSize: 14,
    color: ArchivesTheme.colors.mutedNavy,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
    marginRight: 8,
  },
  sendButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: ArchivesTheme.colors.mossGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C5C5C5',
  },

  // Full-screen image viewer styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    right: 20,
    zIndex: 10,
  },
  fullScreenImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.7,
  },
  saveToPhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
  },
  saveToPhotosText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
});
