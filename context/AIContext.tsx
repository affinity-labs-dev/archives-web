// AIContext.tsx - Global AI chat state management
// Manages floating button, chat modal, message history, and context awareness

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from '@/components/ai/AIChatModal';
import { useProgress } from './ProgressContext';

const CHAT_HISTORY_KEY = 'ai_chat_history';
const MAX_STORED_MESSAGES = 50; // Limit stored messages to prevent storage bloat

interface UserProgressSummary {
  totalXP: number;
  completedModules: number;
  averageQuizScore: number;
  recentCompletions: Array<{
    adventureId: string;
    moduleId: string;
    quizScore?: number;
  }>;
  totalModulesAttempted: number;
}

interface AIContextType {
  // Chat state
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;

  // Messages
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearHistory: () => void;

  // Context awareness
  currentContext: {
    eraId?: string;
    eraName?: string;
    adventureId?: string;
    moduleId?: string;
    lessonId?: string;
    currentScreen?: string;
  };
  updateContext: (context: Partial<AIContextType['currentContext']>) => void;

  // User progress
  getUserProgressSummary: () => UserProgressSummary;

  // Floating button
  showFloatingButton: boolean;
  setShowFloatingButton: (show: boolean) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

interface AIProviderProps {
  children: ReactNode;
}

export function AIProvider({ children }: AIProviderProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const [currentContext, setCurrentContext] = useState<AIContextType['currentContext']>({});

  // Access user progress data
  const {
    moduleProgress,
    calculateTotalXP,
    getModuleProgress,
  } = useProgress();

  // Load chat history from AsyncStorage on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Save chat history to AsyncStorage when messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory();
    }
  }, [messages]);

  // Load chat history
  const loadChatHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
        console.log('📚 [AIContext] Loaded', messagesWithDates.length, 'messages from history');
      }
    } catch (error) {
      console.error('❌ [AIContext] Error loading chat history:', error);
    }
  };

  // Save chat history
  const saveChatHistory = async () => {
    try {
      // Keep only the last N messages
      const messagesToStore = messages.slice(-MAX_STORED_MESSAGES);
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messagesToStore));
      console.log('💾 [AIContext] Saved', messagesToStore.length, 'messages to history');
    } catch (error) {
      console.error('❌ [AIContext] Error saving chat history:', error);
    }
  };

  // Open chat
  const openChat = () => {
    console.log('🤖 [AIContext] Opening chat');
    setIsChatOpen(true);
  };

  // Close chat
  const closeChat = () => {
    console.log('🤖 [AIContext] Closing chat');
    setIsChatOpen(false);
  };

  // Add message
  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  // Clear history
  const clearHistory = async () => {
    console.log('🗑️ [AIContext] Clearing chat history');
    setMessages([]);
    try {
      await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
    } catch (error) {
      console.error('❌ [AIContext] Error clearing chat history:', error);
    }
  };

  // Update context
  const updateContext = (newContext: Partial<AIContextType['currentContext']>) => {
    setCurrentContext((prev) => ({
      ...prev,
      ...newContext,
    }));
    console.log('📍 [AIContext] Context updated:', newContext);
  };

  // Get user progress summary for AI personalization
  const getUserProgressSummary = () => {
    // Calculate total XP (works for both legacy and new eras)
    const totalXP = calculateTotalXP(moduleProgress, []);

    // Get completed modules count
    const completedModules = moduleProgress.filter(m => m.isCompleted).length;

    // Get quiz performance stats
    const quizScores = moduleProgress
      .filter(m => m.quizScore !== undefined)
      .map(m => m.quizScore || 0);
    const averageQuizScore = quizScores.length > 0
      ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length
      : 0;

    // Get recent completions (last 5)
    const recentCompletions = moduleProgress
      .filter(m => m.isCompleted)
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5)
      .map(m => ({
        adventureId: m.adventureId,
        moduleId: m.moduleId,
        quizScore: m.quizScore,
      }));

    return {
      totalXP,
      completedModules,
      averageQuizScore: Math.round(averageQuizScore),
      recentCompletions,
      totalModulesAttempted: moduleProgress.length,
    };
  };

  const value: AIContextType = {
    isChatOpen,
    openChat,
    closeChat,
    messages,
    addMessage,
    clearHistory,
    currentContext,
    updateContext,
    getUserProgressSummary,
    showFloatingButton,
    setShowFloatingButton,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

// Custom hook to use AI context
export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}
