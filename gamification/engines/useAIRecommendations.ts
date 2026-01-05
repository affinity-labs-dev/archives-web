// useAIRecommendations.ts - Smart AI-powered recommendations
import { useState, useEffect } from 'react';
import { useGamifiedProgress } from './GamifiedProgress';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'ai_recommendations_cache';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

export interface AIRecommendation {
  id: string;
  type: 'next_adventure' | 'strengthen_knowledge' | 'explore_new' | 'achievement';
  title: string;
  description: string;
  actionText: string;
  actionTarget: {
    eraId?: string;
    adventureId?: string;
    moduleId?: string;
  };
  priority: number;
  reason: string;
  icon: string;
}

interface CachedRecommendations {
  recommendations: AIRecommendation[];
  timestamp: number;
}

export function useAIRecommendations() {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { moduleProgress, calculateTotalXP } = useGamifiedProgress();

  useEffect(() => {
    generateRecommendations();
  }, [moduleProgress]);

  const generateRecommendations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const cached = await loadFromCache();
      if (cached) {
        setRecommendations(cached);
        setIsLoading(false);
        return;
      }

      const newRecommendations = await generateSmartRecommendations();
      await saveToCache(newRecommendations);
      setRecommendations(newRecommendations);
      setIsLoading(false);
    } catch (err) {
      console.error('❌ [useAIRecommendations] Error:', err);
      setError('Could not generate recommendations');
      setIsLoading(false);
      setRecommendations(generateBasicRecommendations());
    }
  };

  const loadFromCache = async (): Promise<AIRecommendation[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const parsed: CachedRecommendations = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        return parsed.recommendations;
      }
      return null;
    } catch {
      return null;
    }
  };

  const saveToCache = async (recs: AIRecommendation[]) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        recommendations: recs,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('❌ [useAIRecommendations] Cache error:', error);
    }
  };

  const clearCache = async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      generateRecommendations();
    } catch (error) {
      console.error('❌ [useAIRecommendations] Clear cache error:', error);
    }
  };

  const generateSmartRecommendations = async (): Promise<AIRecommendation[]> => {
    const recs: AIRecommendation[] = [];
    // Defensive null check to prevent crashes on Android
    const safeModuleProgress = moduleProgress || [];
    const totalXP = calculateTotalXP(safeModuleProgress, []);
    const completedModules = safeModuleProgress.filter(m => m.isCompleted).length;

    // 1. Next Adventure
    if (completedModules > 0) {
      const lastCompleted = safeModuleProgress.filter(m => m.isCompleted)[0];

      if (lastCompleted) {
        recs.push({
          id: 'next_adventure',
          type: 'next_adventure',
          title: 'Continue Your Journey',
          description: `You completed Adventure ${lastCompleted.adventureId}! Ready for the next chapter?`,
          actionText: 'Start Next Adventure',
          actionTarget: { eraId: 'rise_of_islam' },
          priority: 10,
          reason: 'Based on recent completion',
          icon: 'arrow-forward-circle',
        });
      }
    } else {
      recs.push({
        id: 'start_journey',
        type: 'explore_new',
        title: 'Begin Your Learning Journey',
        description: 'Start with the Rise of Islam - discover the origins of Islamic civilization',
        actionText: 'Start Learning',
        actionTarget: { eraId: 'rise_of_islam' },
        priority: 10,
        reason: 'Perfect starting point',
        icon: 'rocket',
      });
    }

    // 2. Strengthen Knowledge
    const weakModules = safeModuleProgress.filter(m => m.quizScore !== undefined && m.quizScore < 2);
    if (weakModules.length > 0) {
      const weakest = weakModules[0];
      recs.push({
        id: 'strengthen_knowledge',
        type: 'strengthen_knowledge',
        title: 'Strengthen Your Knowledge',
        description: `Retake Module ${weakest.moduleId} quiz to improve your score!`,
        actionText: 'Retry Quiz',
        actionTarget: { adventureId: String(weakest.adventureId), moduleId: String(weakest.moduleId) },
        priority: 8,
        reason: 'Low quiz score detected',
        icon: 'school',
      });
    }

    // 3. Achievement
    if (totalXP >= 500 && completedModules >= 5) {
      recs.push({
        id: 'achievement_unlock',
        type: 'achievement',
        title: '🎉 You\'re on Fire!',
        description: `${totalXP} XP earned! You\'re in the top tier of learners. Challenge yourself with advanced topics!`,
        actionText: 'Explore Advanced',
        actionTarget: {},
        priority: 7,
        reason: 'High achievement level',
        icon: 'trophy',
      });
    }

    return recs.sort((a, b) => b.priority - a.priority);
  };

  const generateBasicRecommendations = (): AIRecommendation[] => {
    const safeModuleProgress = moduleProgress || [];
    const completedModules = safeModuleProgress.filter(m => m.isCompleted).length;

    if (completedModules === 0) {
      return [{
        id: 'start_basic',
        type: 'explore_new',
        title: 'Start Your Journey',
        description: 'Begin with Rise of Islam',
        actionText: 'Start Learning',
        actionTarget: { eraId: 'rise_of_islam' },
        priority: 10,
        reason: 'New user',
        icon: 'rocket',
      }];
    }

    return [{
      id: 'continue_basic',
      type: 'next_adventure',
      title: 'Continue Learning',
      description: 'Keep exploring Islamic history',
      actionText: 'Continue',
      actionTarget: {},
      priority: 5,
      reason: 'Progress detected',
      icon: 'play-circle',
    }];
  };

  return {
    recommendations,
    isLoading,
    error,
    refreshRecommendations: generateRecommendations,
    clearCache,
  };
}
