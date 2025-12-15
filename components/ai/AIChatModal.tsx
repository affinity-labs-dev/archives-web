// AIChatModal.tsx - AI chat interface
import ArchivesTheme from '@/constants/ArchivesTheme';
import { useAI } from '@/context/AIContext';
import { aiService } from '@/services/AIService';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
  const [error, setError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const { getUserProgressSummary } = useAI();

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  useEffect(() => {
    if (visible) {
      analyticsService.trackCustomEvent('ai_chat_opened', {
        era_id: context.eraId,
        message_count: messages.length,
      });
    }
  }, [visible]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
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
        era_id: context.eraId,
        response_length: response.length,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError('Sorry, I could not process that. Please try again.');
      analyticsService.trackCustomEvent('ai_chat_error', { era_id: context.eraId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analyticsService.trackCustomEvent('ai_chat_closed', {
      era_id: context.eraId,
      message_count: messages.length,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.6}>
            <Ionicons name="close-circle" size={36} color={ArchivesTheme.colors.shoeBrown} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>AI Learning Assistant</Text>
            <Text style={styles.headerSubtitle}>Ask me about {context.eraName || 'Islamic history'}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.welcomeContainer}>
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={20} color="white" />
                </View>
                <Text style={styles.welcomeText}>
                  Hi! I'm your AI learning companion. I know about {context.eraName || 'Islamic history'} and your progress. Ask me anything!
                </Text>
                <View style={styles.suggestionsContainer}>
                  {['What should I learn next?', 'Explain this era to me', 'Quiz me on what I learned'].map((q) => (
                    <TouchableOpacity
                      key={q}
                      style={styles.suggestionChip}
                      onPress={() => {
                        setInputText(q);
                        handleSend();
                      }}
                    >
                      <Text style={styles.suggestionText}>{q}</Text>
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
                  {message.role === 'assistant' && (
                    <View style={styles.aiAvatar}>
                      <Ionicons name="sparkles" size={16} color="white" />
                    </View>
                  )}
                  <View style={[styles.messageContent, message.role === 'user' ? styles.userContent : styles.assistantContent]}>
                    <Text style={[styles.messageText, message.role === 'user' ? styles.userText : styles.assistantText]}>
                      {message.content}
                    </Text>
                  </View>
                </View>
              ))
            )}

            {isLoading && (
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={16} color="white" />
                </View>
                <View style={styles.loadingBubble}>
                  <ActivityIndicator size="small" color={ArchivesTheme.colors.persianOrange} />
                  <Text style={styles.loadingText}>Thinking...</Text>
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

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask me anything..."
                placeholderTextColor="#999"
                multiline
                maxLength={500}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim() || isLoading}
              >
                <Ionicons name="send" size={20} color={inputText.trim() ? 'white' : '#CCC'} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'white',
  },
  closeButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
  },
  headerSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: ArchivesTheme.colors.shoeBrown,
    marginTop: 2,
  },
  headerSpacer: {
    width: 44,
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
  welcomeContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  welcomeText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  suggestionsContainer: {
    width: '100%',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ArchivesTheme.colors.persianOrange,
  },
  suggestionText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.persianOrange,
    textAlign: 'center',
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  assistantBubble: {
    justifyContent: 'flex-start',
  },
  messageContent: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userContent: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    borderBottomRightRadius: 4,
  },
  assistantContent: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  messageText: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  assistantText: {
    color: ArchivesTheme.colors.mutedNavy,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ArchivesTheme.colors.persianOrange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  loadingText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
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
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: ArchivesTheme.colors.creamWhite,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: ArchivesTheme.colors.mutedNavy,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ArchivesTheme.colors.persianOrange,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
});
