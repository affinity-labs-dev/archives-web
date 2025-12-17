// AIContext.tsx - Global AI chat state management
// Manages floating button, chat modal, message history, and context awareness

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from '@/components/ai/AIChatModal';
import { useProgress } from './ProgressContext';
import { aiContextService, type AIKnowledgeContext } from '@/services/AIContextService';

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

  // Knowledge context (lesson content the user has learned)
  knowledgeContext: AIKnowledgeContext | null;
  getKnowledgeContextForPrompt: () => string;
  refreshKnowledgeContext: () => Promise<void>;

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
  const [knowledgeContext, setKnowledgeContext] = useState<AIKnowledgeContext | null>(null);

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

  // Update context (memoized to prevent infinite loops in useEffect dependencies)
  const updateContext = useCallback((newContext: Partial<AIContextType['currentContext']>) => {
    setCurrentContext((prev) => ({
      ...prev,
      ...newContext,
    }));
    console.log('📍 [AIContext] Context updated:', newContext);
  }, []);

  // Get user progress summary for AI personalization
  const getUserProgressSummary = () => {
    // Defensive null check to prevent crashes on Android
    const safeModuleProgress = moduleProgress || [];

    // Calculate total XP (works for both legacy and new eras)
    const totalXP = calculateTotalXP(safeModuleProgress, []);

    // Get completed modules count
    const completedModules = safeModuleProgress.filter(m => m.isCompleted).length;

    // Get quiz performance stats
    const quizScores = safeModuleProgress
      .filter(m => m.quizScore !== undefined)
      .map(m => m.quizScore || 0);
    const averageQuizScore = quizScores.length > 0
      ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length
      : 0;

    // Get recent completions (last 5)
    const recentCompletions = safeModuleProgress
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
      totalModulesAttempted: safeModuleProgress.length,
    };
  };

  // Refresh knowledge context (fetches content for completed modules)
  const refreshKnowledgeContext = useCallback(async () => {
    try {
      console.log('🧠 [AIContext] Refreshing knowledge context...');

      // Convert moduleProgress to the format AIContextService expects
      const userProgressItems = (moduleProgress || []).map(m => ({
        adventureId: m.adventureId,
        moduleId: m.moduleId,
        era_id: m.eraId || currentContext.eraId || '',
        isCompleted: m.isCompleted || false,
        quizCompleted: m.quizCompleted || false,
        quizScore: m.quizScore,
        quizCorrectAnswers: m.quizCorrectAnswers,
      }));

      const context = await aiContextService.buildContext({
        userProgress: userProgressItems,
        currentEraId: currentContext.eraId,
        currentEraName: currentContext.eraName,
      });

      setKnowledgeContext(context);
      console.log('✅ [AIContext] Knowledge context refreshed');
    } catch (error) {
      console.error('❌ [AIContext] Error refreshing knowledge context:', error);
    }
  }, [moduleProgress, currentContext.eraId, currentContext.eraName]);

  // Get formatted knowledge context for AI prompt
  const getKnowledgeContextForPrompt = useCallback(() => {
    if (!knowledgeContext) {
      return '';
    }
    return aiContextService.formatForPrompt(knowledgeContext);
  }, [knowledgeContext]);

  // Refresh knowledge context when chat opens or progress changes
  useEffect(() => {
    if (isChatOpen && moduleProgress && moduleProgress.length > 0) {
      refreshKnowledgeContext();
    }
  }, [isChatOpen, moduleProgress, refreshKnowledgeContext]);

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
    knowledgeContext,
    getKnowledgeContextForPrompt,
    refreshKnowledgeContext,
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
