// AIContext.tsx - Global AI chat state management
// Manages floating button, chat modal, message history, and context awareness
// Sessions are stored in Supabase `ai_user_data` table for cloud sync

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { supabase } from '@/hooks/lib/supabase';
import type { ChatMessage } from '@/gamification/ui/ai/AIChatModal';
import { useGamifiedProgress } from './GamifiedProgress';
import { aiContextService, type AIKnowledgeContext } from '@/gamification/services/AIContextService';
import { aiService } from '@/gamification/services/AIService';

const CHAT_HISTORY_KEY = 'ai_chat_history';
const AI_USER_DATA_TABLE = 'ai_user_data';
const SYNC_DEBOUNCE_MS = 1500;
const MAX_MESSAGES_PER_SESSION = 100; // Limit messages per session
const MAX_SESSIONS_STORED = 50; // Maximum number of sessions to keep

// ========== SESSION TYPES ==========

interface ChatSession {
  session_id: string;
  started_at: string;
  ended_at: string | null;
  messages: ChatMessage[];
}

interface SessionsData {
  sessions: ChatSession[];
  current_session_id: string | null;
}

// Generate a simple UUID-like ID
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Create a new session
const createNewSession = (): ChatSession => {
  return {
    session_id: generateSessionId(),
    started_at: new Date().toISOString(),
    ended_at: null,
    messages: [],
  };
};

// Get default sessions data structure
const getDefaultSessionsData = (): SessionsData => {
  const newSession = createNewSession();
  return {
    sessions: [newSession],
    current_session_id: newSession.session_id,
  };
};

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

export type AIChatTrigger = 'fab' | 'quiz_results' | 'profile' | 'today' | 'unknown';

interface AIContextType {
  // Chat state
  isChatOpen: boolean;
  openChat: (trigger?: AIChatTrigger) => void;
  closeChat: () => void;

  // Session metadata for analytics
  currentSessionId: string | null;
  chatTrigger: AIChatTrigger;

  // Chat to Learn (post-quiz deep dive)
  pendingHiddenMessage: string | null;
  openChatToLearn: (hiddenMessage: string) => void;
  clearPendingHiddenMessage: () => void;

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
  const [chatTrigger, setChatTrigger] = useState<AIChatTrigger>('unknown');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const [currentContext, setCurrentContext] = useState<AIContextType['currentContext']>({});
  const [pendingHiddenMessage, setPendingHiddenMessage] = useState<string | null>(null);
  const [knowledgeContext, setKnowledgeContext] = useState<AIKnowledgeContext | null>(null);
  const [newEraProgress, setNewEraProgress] = useState<any[]>([]);

  // Session-based storage state
  const [sessionsData, setSessionsData] = useState<SessionsData>(getDefaultSessionsData());
  const sessionsDataRef = useRef<SessionsData>(sessionsData);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);

  // Get user from Clerk for cloud sync
  const { user } = useUser();
  const userId = user?.id;

  // Get Clerk token getter for backend API authentication
  const { getToken } = useAuth();

  // Wire up AI service with Clerk token getter
  useEffect(() => {
    aiService.setTokenGetter(getToken);
  }, [getToken]);

  // Keep ref in sync with state (for async operations)
  useEffect(() => {
    sessionsDataRef.current = sessionsData;
  }, [sessionsData]);

  // Access user progress data
  const {
    moduleProgress,
    calculateTotalXP,
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

  // ========== CLOUD SYNC FUNCTIONS ==========

  // Fetch sessions data from Supabase
  const fetchFromCloud = useCallback(async (): Promise<SessionsData | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from(AI_USER_DATA_TABLE)
        .select('messages')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No row found - that's fine, user just hasn't used AI chat yet
          return null;
        }
        console.error('❌ [AIContext] Error fetching from cloud:', error);
        return null;
      }

      // Parse the messages JSONB field as SessionsData
      if (data?.messages && typeof data.messages === 'object') {
        const cloudData = data.messages as SessionsData;
        // Validate structure
        if (Array.isArray(cloudData.sessions)) {
          console.log(`☁️ [AIContext] Fetched ${cloudData.sessions.length} sessions from cloud`);
          return cloudData;
        }
      }

      return null;
    } catch (error) {
      console.error('❌ [AIContext] Error fetching from cloud:', error);
      return null;
    }
  }, [userId]);

  // Save sessions data to Supabase (debounced)
  const saveToCloud = useCallback(async (data: SessionsData) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from(AI_USER_DATA_TABLE)
        .upsert({
          user_id: userId,
          messages: data,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('❌ [AIContext] Error saving to cloud:', error);
        return;
      }

      console.log(`☁️ [AIContext] Saved ${data.sessions.length} sessions to cloud`);
    } catch (error) {
      console.error('❌ [AIContext] Error saving to cloud:', error);
    }
  }, [userId]);

  // Trigger debounced cloud sync
  const triggerCloudSync = useCallback(() => {
    if (!userId) return;

    // Clear existing timer
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    // Set new timer for debounced sync
    syncTimerRef.current = setTimeout(() => {
      saveToCloud(sessionsDataRef.current);
    }, SYNC_DEBOUNCE_MS);
  }, [userId, saveToCloud]);

  // ========== LOAD/SAVE FUNCTIONS ==========

  // Load chat history from cloud (with local fallback for migration)
  const loadChatHistory = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      // Try to load from cloud first (if user is logged in)
      if (userId) {
        const cloudData = await fetchFromCloud();
        if (cloudData && cloudData.sessions.length > 0) {
          // Restore sessions from cloud
          setSessionsData(cloudData);

          // Get current session messages for display
          const currentSession = cloudData.sessions.find(
            s => s.session_id === cloudData.current_session_id
          );
          if (currentSession) {
            // Convert timestamp strings back to Date objects
            const messagesWithDates = currentSession.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }));
            setMessages(messagesWithDates);
            console.log(`📚 [AIContext] Loaded ${messagesWithDates.length} messages from cloud (session: ${currentSession.session_id})`);
          }
          isLoadingRef.current = false;
          return;
        }
      }

      // Fallback: Try to migrate from old AsyncStorage format
      const stored = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));

        // Migrate old flat messages to session format
        const migratedSession: ChatSession = {
          session_id: generateSessionId(),
          started_at: messagesWithDates.length > 0
            ? messagesWithDates[0].timestamp.toISOString()
            : new Date().toISOString(),
          ended_at: null,
          messages: messagesWithDates,
        };

        const migratedData: SessionsData = {
          sessions: [migratedSession],
          current_session_id: migratedSession.session_id,
        };

        setSessionsData(migratedData);
        setMessages(messagesWithDates);
        console.log(`📚 [AIContext] Migrated ${messagesWithDates.length} messages to session format`);

        // Save migrated data to cloud
        if (userId) {
          await saveToCloud(migratedData);
          // Clean up old local storage after successful migration
          await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
          console.log('✅ [AIContext] Migration to cloud complete');
        }
      }
    } catch (error) {
      console.error('❌ [AIContext] Error loading chat history:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [userId, fetchFromCloud, saveToCloud]);

  // Save current session messages (updates state and triggers cloud sync)
  const saveCurrentSession = useCallback((newMessages: ChatMessage[]) => {
    setSessionsData(prev => {
      const updatedSessions = prev.sessions.map(session => {
        if (session.session_id === prev.current_session_id) {
          // Limit messages per session
          const limitedMessages = newMessages.slice(-MAX_MESSAGES_PER_SESSION);
          return { ...session, messages: limitedMessages };
        }
        return session;
      });

      return { ...prev, sessions: updatedSessions };
    });

    // Trigger cloud sync
    triggerCloudSync();
  }, [triggerCloudSync]);

  // Load chat history and new era progress on mount
  useEffect(() => {
    loadChatHistory();
    loadNewEraProgress();
  }, [loadNewEraProgress, loadChatHistory]);

  // Reload from cloud when user signs in
  useEffect(() => {
    if (userId) {
      loadChatHistory();
    }
  }, [userId, loadChatHistory]);

  // Save to cloud when messages change (with debouncing)
  useEffect(() => {
    if (messages.length > 0 && !isLoadingRef.current) {
      saveCurrentSession(messages);
    }
  }, [messages, saveCurrentSession]);

  // Open chat
  const openChat = (trigger: AIChatTrigger = 'unknown') => {
    console.log('🤖 [AIContext] Opening chat, trigger:', trigger);
    setChatTrigger(trigger);
    setIsChatOpen(true);
  };

  // Open chat with a hidden message (Chat to Learn - post-quiz deep dive)
  // The hidden message is sent to the AI but not shown in the chat UI
  const openChatToLearn = (hiddenMessage: string) => {
    console.log('🤖 [AIContext] Opening Chat to Learn');
    setChatTrigger('quiz_results');
    setPendingHiddenMessage(hiddenMessage);
  };

  // Clear pending hidden message (called by AIChatModal after processing)
  const clearPendingHiddenMessage = () => {
    setPendingHiddenMessage(null);
  };

  // Close chat
  const closeChat = () => {
    console.log('🤖 [AIContext] Closing chat');
    setPendingHiddenMessage(null);
    setIsChatOpen(false);
  };

  // Add message
  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  // Clear history - ends current session and starts a new one (preserves history in cloud)
  const clearHistory = async () => {
    console.log('🗑️ [AIContext] Starting new chat session (preserving history)');

    // Clear current messages display
    setMessages([]);

    // End current session and start a new one
    setSessionsData(prev => {
      // End the current session
      const updatedSessions = prev.sessions.map(session => {
        if (session.session_id === prev.current_session_id) {
          return { ...session, ended_at: new Date().toISOString() };
        }
        return session;
      });

      // Create a new session
      const newSession = createNewSession();

      // Keep only the most recent sessions
      const trimmedSessions = [...updatedSessions, newSession].slice(-MAX_SESSIONS_STORED);

      const newData: SessionsData = {
        sessions: trimmedSessions,
        current_session_id: newSession.session_id,
      };

      // Immediately save to cloud
      if (userId) {
        saveToCloud(newData);
      }

      console.log(`✨ [AIContext] Created new session: ${newSession.session_id} (total: ${trimmedSessions.length} sessions)`);
      return newData;
    });
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

  // Refresh knowledge context when chat opens or progress changes.
  // RAG tools context is now handled by the backend.
  // Also fires when a Chat-to-Learn session is queued via pendingHiddenMessage, since
  // those sessions no longer flip isChatOpen (AFF-626 renders AIChatModal inside
  // QuizResults without going through the global chat-open flow).
  useEffect(() => {
    const hasProgress = (moduleProgress && moduleProgress.length > 0) || (newEraProgress && newEraProgress.length > 0);
    if ((isChatOpen || pendingHiddenMessage) && hasProgress) {
      refreshKnowledgeContext();
    }
  }, [isChatOpen, pendingHiddenMessage, moduleProgress, newEraProgress, refreshKnowledgeContext]);

  const value: AIContextType = {
    isChatOpen,
    openChat,
    closeChat,
    currentSessionId: sessionsData.current_session_id,
    chatTrigger,
    pendingHiddenMessage,
    openChatToLearn,
    clearPendingHiddenMessage,
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
