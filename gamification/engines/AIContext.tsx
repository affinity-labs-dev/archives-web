// AIContext.tsx - Global AI chat state management
// Manages floating button, chat modal, message history, and context awareness

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from '@/gamification/ui/ai/AIChatModal';
import { useGamifiedProgress } from './GamifiedProgress';
import { aiContextService, type AIKnowledgeContext } from '@/gamification/services/AIContextService';
import { aiToolsService, type AIToolsContext } from '@/gamification/services/AIToolsService';

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
  const [newEraProgress, setNewEraProgress] = useState<any[]>([]);

  // Access user progress data
  const {
    moduleProgress,
    calculateTotalXP,
    getModuleProgress,
  } = useGamifiedProgress();

  // Load new era progress (Era 2+) from AsyncStorage
  const loadNewEraProgress = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('new_user_progress');
      if (stored) {
        const parsed = JSON.parse(stored);
        setNewEraProgress(parsed);
        console.log('📚 [AIContext] Loaded new era progress:', parsed.length, 'modules');
      }
    } catch (error) {
      console.error('❌ [AIContext] Error loading new era progress:', error);
    }
  }, []);

  // Load chat history and new era progress from AsyncStorage on mount
  useEffect(() => {
    loadChatHistory();
    loadNewEraProgress();
  }, [loadNewEraProgress]);

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
    const safeNewEraProgress = newEraProgress || [];

    // Calculate total XP (works for both legacy and new eras)
    const totalXP = calculateTotalXP();

    // Get completed modules count from both eras
    // Era 1 (legacy): quizScore >= 2 counts as completed
    const legacyCompleted = safeModuleProgress.filter(m => m.quizScore && m.quizScore >= 2).length;
    // Era 2+: isCompleted flag
    const newEraCompleted = safeNewEraProgress.filter(m => m.isCompleted).length;
    const completedModules = legacyCompleted + newEraCompleted;

    // Get quiz performance stats from both eras
    const legacyScores = safeModuleProgress
      .filter(m => m.quizScore !== undefined)
      .map(m => m.quizScore || 0);
    const newEraScores = safeNewEraProgress
      .filter(m => m.quizScore !== undefined)
      .map(m => m.quizScore || 0);
    const allQuizScores = [...legacyScores, ...newEraScores];
    const averageQuizScore = allQuizScores.length > 0
      ? allQuizScores.reduce((a, b) => a + b, 0) / allQuizScores.length
      : 0;

    // Get recent completions from both eras (last 5)
    const legacyCompletions = safeModuleProgress
      .filter(m => m.quizScore && m.quizScore >= 2)
      .map(m => ({
        adventureId: String(m.adventureId),
        moduleId: String(m.moduleId),
        quizScore: m.quizScore,
        unlockedAt: m.unlockedAt,
        era: 'umayyad',
      }));

    const newEraCompletions = safeNewEraProgress
      .filter(m => m.isCompleted)
      .map(m => ({
        adventureId: String(m.adventureId),
        moduleId: String(m.moduleId),
        quizScore: m.quizScore,
        unlockedAt: m.completedAt || m.unlockedAt,
        era: m.era_id || 'unknown', // era_id should always be present in new era progress
      }));

    const recentCompletions = [...legacyCompletions, ...newEraCompletions]
      .sort((a, b) => {
        const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5)
      .map(m => ({
        adventureId: m.adventureId,
        moduleId: m.moduleId,
        quizScore: m.quizScore,
      }));

    console.log(`📊 [AIContext] Progress summary: ${totalXP} XP, ${completedModules} modules (${legacyCompleted} legacy + ${newEraCompleted} new era)`);

    return {
      totalXP,
      completedModules,
      averageQuizScore: Math.round(averageQuizScore),
      recentCompletions,
      totalModulesAttempted: safeModuleProgress.length + safeNewEraProgress.length,
    };
  };

  // Refresh knowledge context (fetches content for completed modules)
  const refreshKnowledgeContext = useCallback(async () => {
    try {
      console.log('🧠 [AIContext] Refreshing knowledge context...');

      // Reload new era progress before building context
      let freshNewEraProgress: any[] = [];
      try {
        const stored = await AsyncStorage.getItem('new_user_progress');
        if (stored) {
          freshNewEraProgress = JSON.parse(stored);
        }
      } catch (e) {
        console.error('❌ [AIContext] Error loading new era progress for context:', e);
      }

      // Convert legacy moduleProgress (Era 1 - Umayyad) to the format AIContextService expects
      const legacyProgressItems = (moduleProgress || []).map(m => ({
        adventureId: String(m.adventureId),
        moduleId: String(m.moduleId),
        era_id: 'umayyad', // All legacy modules are Era 1 (Umayyad)
        isCompleted: m.quizScore !== undefined && m.quizScore >= 2, // Era 1 rule: quizScore >= 2
        quizCompleted: m.quizCompleted || false,
        quizScore: m.quizScore,
        quizCorrectAnswers: m.quizScore, // In Era 1, quizScore IS the correct answers count
      }));

      // Convert new era progress (Era 2+) - these have proper era_id
      const newEraProgressItems = freshNewEraProgress.map(m => ({
        adventureId: String(m.adventureId),
        moduleId: String(m.moduleId),
        era_id: m.era_id || 'unknown', // era_id should always be present in stored progress
        isCompleted: m.isCompleted || false,
        quizCompleted: m.quizCompleted || false,
        quizScore: m.quizScore,
        quizCorrectAnswers: m.quizCorrectAnswers,
      }));

      // Combine both era progress items
      const userProgressItems = [...legacyProgressItems, ...newEraProgressItems];

      console.log(`🧠 [AIContext] Building context with ${legacyProgressItems.length} legacy + ${newEraProgressItems.length} new era items`);

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

  // Set up RAG tools context when chat opens
  // This provides aiToolsService with user progress data for function calling
  const setupRAGContext = useCallback(async () => {
    try {
      console.log('🔧 [AIContext] Setting up RAG tools context...');

      // Reload new era progress to ensure fresh data
      let freshNewEraProgress: any[] = [];
      try {
        const stored = await AsyncStorage.getItem('new_user_progress');
        if (stored) {
          freshNewEraProgress = JSON.parse(stored);
        }
      } catch (e) {
        console.error('❌ [AIContext] Error loading new era progress for RAG:', e);
      }

      // Convert legacy moduleProgress (Era 1 - Umayyad) to AIToolsContext format
      const legacyProgressItems = (moduleProgress || []).map(m => ({
        era_id: 'umayyad', // All legacy modules are Era 1 (Umayyad)
        adventureId: String(m.adventureId),
        moduleId: String(m.moduleId),
        lessonsCompleted: m.lessonsCompleted || [],
        quizScore: m.quizScore || 0,
        quizCorrectAnswers: m.quizScore || 0, // In Era 1, quizScore IS the correct answers count
        completedAt: m.unlockedAt || new Date().toISOString(),
        isCompleted: m.quizScore !== undefined && m.quizScore >= 2,
        quizCompleted: m.quizCompleted || false,
      }));

      // Convert new era progress (Era 2+)
      const newEraProgressItems = freshNewEraProgress.map(m => ({
        era_id: m.era_id || 'unknown',
        adventureId: String(m.adventureId),
        moduleId: String(m.moduleId),
        lessonsCompleted: m.lessonsCompleted || [],
        quizScore: m.quizScore || 0,
        quizCorrectAnswers: m.quizCorrectAnswers || 0,
        completedAt: m.completedAt || m.unlockedAt || new Date().toISOString(),
        isCompleted: m.isCompleted || false,
        quizCompleted: m.quizCompleted || false,
      }));

      // Combine all progress
      const allProgress = [...legacyProgressItems, ...newEraProgressItems];

      // Build context for AIToolsService
      const ragContext: AIToolsContext = {
        progress: allProgress,
        selectedEra: currentContext.eraId,
        totalXP: calculateTotalXP(),
      };

      // Set the context for RAG tools
      aiToolsService.setContext(ragContext);
      console.log(`✅ [AIContext] RAG context set with ${allProgress.length} progress items`);
    } catch (error) {
      console.error('❌ [AIContext] Error setting up RAG context:', error);
    }
  }, [moduleProgress, currentContext.eraId, calculateTotalXP]);

  // Refresh knowledge context and set up RAG tools when chat opens or progress changes
  useEffect(() => {
    const hasProgress = (moduleProgress && moduleProgress.length > 0) || (newEraProgress && newEraProgress.length > 0);
    if (isChatOpen && hasProgress) {
      refreshKnowledgeContext();
      setupRAGContext(); // Set up RAG tools context when chat opens
    }
  }, [isChatOpen, moduleProgress, newEraProgress, refreshKnowledgeContext, setupRAGContext]);

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
