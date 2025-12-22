// AIChatModal.tsx - AI chat interface (Ibu - AI Assistant)
import ArchivesTheme from '@/constants/ArchivesTheme';
import { useAI } from '@/context/AIContext';
import { aiService } from '@/services/AIService';
import { aiStorageService, StoredMessage } from '@/services/AIStorageService';
import { analyticsService } from '@/services/AnalyticsService';
import { useUser } from '@clerk/clerk-expo';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { Ionicons } from '@expo/vector-icons';
import {
  cacheDirectory,
  writeAsStringAsync,
  deleteAsync,
} from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
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
import { renderMarkdownText } from '@/utils/markdownText';

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
  // Optional image data for generated images (assistant) or uploaded images (user)
  image?: {
    base64: string;
    mimeType: string;
  };
  // URL for persisted images (loaded from storage)
  imageUrl?: string;
  // Flag to indicate if this is an uploaded image (user) vs generated (assistant)
  isUploadedImage?: boolean;
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image viewer state
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Image upload state
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; uri: string } | null>(null);

  // Header menu state
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const { getUserProgressSummary, getKnowledgeContextForPrompt } = useAI();
  const { user } = useUser();
  const { isSubscribed } = useRevenueCat();
  const insets = useSafeAreaInsets();

  // Get user's first name for personalized greeting
  const userName = user?.firstName || 'Explorer';
  const userId = user?.id;

  // Load persisted messages when modal opens
  useEffect(() => {
    const loadMessages = async () => {
      if (!userId) return;

      setIsLoadingHistory(true);
      try {
        const userData = await aiStorageService.loadUserData(userId);
        if (userData?.messages && userData.messages.length > 0) {
          const loadedMessages: ChatMessage[] = userData.messages.map((msg: StoredMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(loadedMessages);
          console.log('📚 [AIChatModal] Loaded', loadedMessages.length, 'messages from history');
        }
      } catch (err) {
        console.error('❌ [AIChatModal] Failed to load history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    if (visible && userId && messages.length === 0) {
      loadMessages();
    }
  }, [visible, userId, messages.length]);

  // Save messages to storage
  const saveMessages = async (updatedMessages: ChatMessage[]) => {
    if (!userId || updatedMessages.length === 0) return;

    // Convert to storage format (Date -> string, remove base64 if we have URL)
    const storedMessages: StoredMessage[] = updatedMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      imageUrl: msg.imageUrl,
      isUploadedImage: msg.isUploadedImage,
    }));

    await aiStorageService.saveMessages(userId, storedMessages);
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      // Auto-save messages when they change (skip initial load)
      if (!isLoadingHistory) {
        saveMessages(messages);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    if (visible) {
      analyticsService.trackCustomEvent('ai_chat_opened', {
        era_id: context?.eraId || 'unknown_era',
        message_count: messages.length,
      });
    }
  }, [visible]);

  // Share image (allows saving to photos, sharing to apps, etc.)
  const handleShareImage = async () => {
    if (!selectedImage) return;

    // Sharing is only supported on iOS and Android
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Sharing images is only available on mobile devices.');
      return;
    }

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Not Available', 'Sharing is not available on this device.');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Create a temporary file - cacheDirectory is guaranteed on iOS/Android
      const filename = `archives_ai_${Date.now()}.png`;
      const fileUri = cacheDirectory + filename;

      // Write base64 to file
      await writeAsStringAsync(fileUri, selectedImage.base64, {
        encoding: 'base64',
      });

      // Open share sheet - user can save to photos, share to apps, etc.
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: 'Share or Save Image',
      });

      // Clean up temp file after sharing
      await deleteAsync(fileUri, { idempotent: true });

      analyticsService.trackCustomEvent('ai_image_shared', {
        era_id: context?.eraId || 'unknown_era',
      });
    } catch (err) {
      console.error('❌ [AIChatModal] Error sharing image:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to share image. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Pick image from library
  const handlePickImage = async () => {
    setShowActionMenu(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setPendingImage({
            base64: asset.base64,
            mimeType: asset.mimeType || 'image/jpeg',
            uri: asset.uri,
          });
          analyticsService.trackCustomEvent('ai_image_selected', {
            era_id: context?.eraId || 'unknown_era',
            source: 'library',
          });
        }
      }
    } catch (err) {
      console.error('❌ [AIChatModal] Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Clear pending image
  const handleClearPendingImage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingImage(null);
  };

  // Handle quick prompt from action menu
  const handleQuickPrompt = (prompt: string) => {
    setShowActionMenu(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSend(prompt);
  };

  // Handle clear chat history
  const handleClearHistory = () => {
    setShowHeaderMenu(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all messages? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            if (userId) {
              await aiStorageService.clearMessages(userId);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  // Helper to check quota and show error if exceeded
  const checkQuotaBeforeRequest = async (
    requestType: 'chat' | 'image_generate' | 'image_edit' | 'image_analyze'
  ): Promise<boolean> => {
    if (!userId) return true; // Allow if no user (shouldn't happen)

    const quotaCheck = await aiStorageService.checkQuota(userId, requestType, isSubscribed);

    if (!quotaCheck.allowed) {
      const typeLabel = requestType === 'chat' ? 'messages' :
                        requestType === 'image_generate' ? 'image generations' :
                        requestType === 'image_edit' ? 'image edits' : 'image analyses';

      setError(
        `You have reached your monthly limit of ${quotaCheck.limit} ${typeLabel}. ` +
        `Your quota resets on ${quotaCheck.resetDate}. ` +
        (isSubscribed ? '' : 'Upgrade to Premium for higher limits!')
      );

      analyticsService.trackCustomEvent('ai_quota_exceeded', {
        request_type: requestType,
        limit: quotaCheck.limit,
        is_subscriber: isSubscribed,
      });

      return false;
    }

    return true;
  };

  const handleSend = async (messageToSend?: string) => {
    const userMessage = (messageToSend || inputText).trim();
    const hasImage = pendingImage !== null;

    // Need either a message or an image to send
    if ((!userMessage && !hasImage) || isLoading) return;

    setInputText('');
    setError(null);

    // Create user message with optional image
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage || 'What can you tell me about this image?',
      timestamp: new Date(),
      ...(hasImage && {
        image: {
          base64: pendingImage.base64,
          mimeType: pendingImage.mimeType,
        },
        isUploadedImage: true,
      }),
    };

    // Clear pending image before async operations
    const imageToAnalyze = pendingImage;
    setPendingImage(null);

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // If user uploaded an image, check if they want editing or analysis
      if (imageToAnalyze) {
        const isEditRequest = userMessage && aiService.isImageEditRequest(userMessage);

        if (isEditRequest) {
          // Check quota before image edit
          if (!await checkQuotaBeforeRequest('image_edit')) {
            setIsLoading(false);
            return;
          }

          // User wants to edit/transform their photo
          setIsGeneratingImage(true);
          console.log('✏️ [AIChatModal] Image edit request detected');

          const editResult = await aiService.editImage({
            imageBase64: imageToAnalyze.base64,
            mimeType: imageToAnalyze.mimeType,
            editPrompt: userMessage,
            context: {
              eraName: context.eraName,
              adventureId: context.adventureId,
            },
          });

          if (editResult) {
            const aiMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: editResult.caption || 'Here is your transformed image:',
              timestamp: new Date(),
              image: {
                base64: editResult.imageBase64,
                mimeType: editResult.mimeType,
              },
            };

            // Show image immediately
            setMessages((prev) => [...prev, aiMsg]);
            analyticsService.trackCustomEvent('ai_image_edited', {
              era_id: context?.eraId || 'unknown_era',
            });

            // Background: Upload image, save URL, and track usage
            if (userId) {
              const messageId = aiMsg.id;
              aiStorageService.uploadImage(userId, editResult.imageBase64, 'edited').then((imageUrl) => {
                if (imageUrl) {
                  // Update message with URL so it persists
                  setMessages((prev) => prev.map((m) =>
                    m.id === messageId ? { ...m, imageUrl } : m
                  ));
                }
              }).catch(console.error);
              aiStorageService.trackUsage(userId, 'image_edit').catch(console.error);
            }
          } else {
            throw new Error('Failed to edit image');
          }
        } else {
          // Check quota before image analysis
          if (!await checkQuotaBeforeRequest('image_analyze')) {
            setIsLoading(false);
            return;
          }

          // User wants to analyze/ask about the image
          setIsAnalyzingImage(true);
          console.log('🔍 [AIChatModal] Analyzing uploaded image...');

          const response = await aiService.analyzeImage({
            imageBase64: imageToAnalyze.base64,
            mimeType: imageToAnalyze.mimeType,
            userMessage: userMessage || undefined,
            context: {
              eraName: context.eraName,
              adventureId: context.adventureId,
            },
          });

          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response,
            timestamp: new Date(),
          };

          // Show response immediately
          setMessages((prev) => [...prev, aiMsg]);
          analyticsService.trackCustomEvent('ai_image_analyzed', {
            era_id: context?.eraId || 'unknown_era',
            has_question: !!userMessage,
          });

          // Background: Track usage (non-blocking)
          if (userId) {
            aiStorageService.trackUsage(userId, 'image_analyze').catch(console.error);
          }
        }
      }
      // Check if user is requesting image generation
      else if (aiService.isImageRequest(userMessage)) {
        // Check quota before image generation
        if (!await checkQuotaBeforeRequest('image_generate')) {
          setIsLoading(false);
          return;
        }

        setIsGeneratingImage(true);
        console.log('🎨 [AIChatModal] Image generation request detected');

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

          // Show image immediately
          setMessages((prev) => [...prev, aiMsg]);
          analyticsService.trackCustomEvent('ai_image_generated', {
            era_id: context?.eraId || 'unknown_era',
          });

          // Background: Upload image, save URL, and track usage
          if (userId) {
            const messageId = aiMsg.id;
            aiStorageService.uploadImage(userId, imageResult.imageBase64, 'generated').then((imageUrl) => {
              if (imageUrl) {
                // Update message with URL so it persists
                setMessages((prev) => prev.map((m) =>
                  m.id === messageId ? { ...m, imageUrl } : m
                ));
              }
            }).catch(console.error);
            aiStorageService.trackUsage(userId, 'image_generate').catch(console.error);
          }
        } else {
          throw new Error('Failed to generate image');
        }
      }
      // Regular text chat
      else {
        // Check quota before chat
        if (!await checkQuotaBeforeRequest('chat')) {
          setIsLoading(false);
          return;
        }

        const progressSummary = getUserProgressSummary();
        const knowledgeContext = getKnowledgeContextForPrompt();
        const response = await aiService.getChatResponse({
          userMessage,
          conversationHistory: messages,
          context: {
            eraName: context.eraName || 'Islamic History',
            adventureId: context.adventureId,
            currentScreen: context.currentScreen,
          },
          userProgress: progressSummary,
          knowledgeContext,
        });

        // Track usage
        if (userId) {
          await aiStorageService.trackUsage(userId, 'chat');
        }

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
      setIsAnalyzingImage(false);
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
    Keyboard.dismiss(); // Dismiss keyboard before opening image viewer
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

          {/* Menu button - only show if there are messages */}
          {messages.length > 0 && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowHeaderMenu(true);
              }}
              activeOpacity={0.6}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color={ArchivesTheme.colors.shoeBrown} />
            </TouchableOpacity>
          )}
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
            {isLoadingHistory ? (
              <View style={styles.loadingHistoryContainer}>
                <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
                <Text style={styles.loadingHistoryText}>Loading your chat history...</Text>
              </View>
            ) : messages.length === 0 ? (
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
                      {/* Show uploaded image above text for user messages */}
                      {(message.image || message.imageUrl) && message.isUploadedImage && (
                        <TouchableOpacity
                          onPress={() => message.image && handleImagePress(message.image)}
                          activeOpacity={0.9}
                          style={styles.uploadedImageContainer}
                        >
                          <Image
                            source={{ uri: message.image ? `data:${message.image.mimeType};base64,${message.image.base64}` : message.imageUrl }}
                            style={styles.uploadedImage}
                            contentFit="cover"
                          />
                        </TouchableOpacity>
                      )}
                      <Text style={styles.userText}>{message.content}</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.assistantContent}>
                        {renderMarkdownText(message.content, styles.assistantText)}
                      </View>
                      {/* Render generated image if present - full width, tappable for full view */}
                      {(message.image || message.imageUrl) && (
                        <TouchableOpacity
                          onPress={() => message.image && handleImagePress(message.image)}
                          activeOpacity={0.9}
                          style={styles.generatedImageContainer}
                        >
                          <Image
                            source={{ uri: message.image ? `data:${message.image.mimeType};base64,${message.image.base64}` : message.imageUrl }}
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
                    {isAnalyzingImage ? 'Analyzing image...' : isGeneratingImage ? 'Generating image...' : 'Thinking...'}
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

          {/* Pending Image Preview */}
          {pendingImage && (
            <View style={styles.pendingImageContainer}>
              <Image
                source={{ uri: pendingImage.uri }}
                style={styles.pendingImagePreview}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.pendingImageRemove}
                onPress={handleClearPendingImage}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.pendingImageHint}>Add a message or tap send</Text>
            </View>
          )}

          {/* Input Bar */}
          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.inputRow}>
              {/* Plus button - opens action menu */}
              <TouchableOpacity
                style={styles.plusButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowActionMenu(true);
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
                  placeholder={pendingImage ? 'Ask about this image...' : 'What are you curious about?'}
                  placeholderTextColor="#9A8B7A"
                  multiline
                  maxLength={500}
                  onSubmitEditing={() => handleSend()}
                  returnKeyType="send"
                  blurOnSubmit={false}
                />
                {/* Send button inside input - enabled if text OR pending image */}
                <TouchableOpacity
                  style={[styles.sendButton, (!inputText.trim() && !pendingImage || isLoading) && styles.sendButtonDisabled]}
                  onPress={() => handleSend()}
                  disabled={(!inputText.trim() && !pendingImage) || isLoading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-up" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            {/* AI Disclaimer */}
            <Text style={styles.aiDisclaimer}>Beta feature – AI responses may be inaccurate</Text>
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

          {/* Share button */}
          <TouchableOpacity
            style={styles.saveToPhotosButton}
            onPress={handleShareImage}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="share-outline" size={24} color="white" />
                <Text style={styles.saveToPhotosText}>Share</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Action Menu Modal */}
      <Modal
        visible={showActionMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableOpacity
          style={styles.actionMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <View style={[styles.actionMenuContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.actionMenuHandle} />

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              <View style={styles.actionMenuIconContainer}>
                <Ionicons name="images-outline" size={24} color={ArchivesTheme.colors.persianOrange} />
              </View>
              <View style={styles.actionMenuTextContainer}>
                <Text style={styles.actionMenuTitle}>Upload Image</Text>
                <Text style={styles.actionMenuSubtitle}>Choose from your photo library</Text>
              </View>
            </TouchableOpacity>

            {/* Quick Prompts Divider */}
            <View style={styles.actionMenuDivider} />

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => handleQuickPrompt('Test me with harder questions')}
              activeOpacity={0.7}
            >
              <View style={styles.actionMenuIconContainer}>
                <Ionicons name="school-outline" size={24} color={ArchivesTheme.colors.mossGreen} />
              </View>
              <View style={styles.actionMenuTextContainer}>
                <Text style={styles.actionMenuTitle}>Test me with harder questions</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => handleQuickPrompt('Give me more details on the last topic')}
              activeOpacity={0.7}
            >
              <View style={styles.actionMenuIconContainer}>
                <Ionicons name="information-circle-outline" size={24} color={ArchivesTheme.colors.mossGreen} />
              </View>
              <View style={styles.actionMenuTextContainer}>
                <Text style={styles.actionMenuTitle}>Give me more details on the last topic</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => handleQuickPrompt('Where can I learn more on the last topic')}
              activeOpacity={0.7}
            >
              <View style={styles.actionMenuIconContainer}>
                <Ionicons name="book-outline" size={24} color={ArchivesTheme.colors.mossGreen} />
              </View>
              <View style={styles.actionMenuTextContainer}>
                <Text style={styles.actionMenuTitle}>Where can I learn more on the last topic</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuCancel}
              onPress={() => setShowActionMenu(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Header Menu Modal */}
      <Modal
        visible={showHeaderMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowHeaderMenu(false)}
      >
        <TouchableOpacity
          style={styles.headerMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowHeaderMenu(false)}
        >
          <View style={[styles.headerMenuContainer, { marginTop: insets.top + 50 }]}>
            <TouchableOpacity
              style={styles.headerMenuItem}
              onPress={handleClearHistory}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#E74C3C" />
              <Text style={styles.headerMenuItemText}>Clear Chat History</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    paddingHorizontal: 12,
    paddingTop: 12,
    // paddingBottom is set dynamically using insets.bottom
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiDisclaimer: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: '#9A8B7A',
    textAlign: 'center',
    marginTop: 8,
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

  // Uploaded image in user messages
  uploadedImageContainer: {
    width: '100%',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: 150,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  // Pending image preview above input
  pendingImageContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    position: 'relative',
  },
  pendingImagePreview: {
    width: '100%',
    height: 120,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  pendingImageRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  pendingImageHint: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: '#9A8B7A',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Action menu styles
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionMenuContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  actionMenuHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0D5C5',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  actionMenuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ArchivesTheme.colors.creamWhite,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionMenuTextContainer: {
    flex: 1,
  },
  actionMenuTitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 2,
  },
  actionMenuSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: '#9A8B7A',
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: '#E0D5C5',
    marginVertical: 8,
  },
  actionMenuCancel: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  actionMenuCancelText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: '#9A8B7A',
  },

  // Menu button in header
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },

  // Loading history state
  loadingHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingHistoryText: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    color: ArchivesTheme.colors.mutedNavy,
    marginTop: 16,
  },

  // Header menu styles
  headerMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerMenuContainer: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  headerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  headerMenuItemText: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    fontWeight: '500',
    color: '#E74C3C',
    marginLeft: 10,
  },
});
