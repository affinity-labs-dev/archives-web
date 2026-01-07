// AIToolsService.ts - RAG (Retrieval Augmented Generation) tools for AI chat
// Enables the AI to dynamically fetch user progress and content from Supabase
//
// SECURITY: All tools are READ-ONLY
// - No write functions are exposed
// - No Supabase insert/update/delete operations
// - AI receives data snapshots, not live state references

import { FunctionDeclaration, Type } from '@google/genai';
import { adventuresContentService } from '@/services/AdventuresContentService';
import type { Adventure, ContentItem } from '@/components/shared/types';

// ========== TYPE DEFINITIONS ==========

// Context passed from AIContext (READ-ONLY snapshot of progress)
export interface AIToolsContext {
  // User progress array (from GamifiedProgress state.progress)
  progress: Array<{
    era_id: string;
    adventureId: string | number;
    moduleId: string | number;
    lessonsCompleted: string[];
    quizScore: number;
    quizCorrectAnswers: number;
    isCompleted: boolean;
    quizCompleted: boolean;
    // Enhanced timestamps for accurate context
    firstAttemptAt: string;   // When user first started this module
    completedAt?: string;     // When module was completed (quiz passed) - undefined if not completed
  }>;
  // Current selected era
  selectedEra?: string;
  // Total XP (pre-calculated)
  totalXP: number;
  // XP breakdown by era
  xpByEra?: Record<string, number>;
  // Streak data for engagement context
  streak?: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string;
  };
  // Timeline context
  firstActivityAt?: string;   // User's first ever learning activity
  lastActiveAt?: string;      // User's most recent activity
}

// Tool execution result
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

// ========== TOOL DECLARATIONS FOR GEMINI ==========
// These tell Gemini what tools are available and how to use them

export const AI_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'getUserProgress',
    description: 'Get the user\'s learning progress including completed modules, XP earned, and quiz scores. Use this when the user asks about their progress, stats, achievements, or learning history. Examples: "How am I doing?", "What\'s my XP?", "How many modules have I completed?"',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eraId: {
          type: Type.STRING,
          description: 'Optional: Filter progress by era ID (e.g., "umayyad", "rise_of_islam"). Leave empty to get progress across all eras.',
        },
      },
      required: [],
    },
  },
  {
    name: 'getLastCompletedModule',
    description: 'Get the user\'s most recently completed module with its FULL lesson content. IMPORTANT: Always use the current era ID to get progress for the era the user is currently viewing. Use this when the user asks about their last lesson, recent learning, or wants a recap. Examples: "What was my last lesson about?", "What did I learn yesterday?", "Remind me what I studied last", "Can you recap my recent lesson?"',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eraId: {
          type: Type.STRING,
          description: 'The era ID to filter by (e.g., "umayyad", "rise_of_islam", "women_of_islam"). IMPORTANT: Always pass the current era ID from the context to get era-specific progress. Only omit this to get the last module across ALL eras.',
        },
      },
      required: [],
    },
  },
  {
    name: 'getModuleContent',
    description: 'Fetch the full content of a specific module including the complete lesson text. Use this when you need detailed information about a specific lesson, or after searching to get full content. Examples: "Tell me more about the Damascus module", "What was in Adventure 2 Module 1?"',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eraId: {
          type: Type.STRING,
          description: 'The era ID (e.g., "umayyad", "rise_of_islam")',
        },
        adventureId: {
          type: Type.STRING,
          description: 'The adventure ID (e.g., "adventure_1", "roi_adventure_1")',
        },
        moduleId: {
          type: Type.STRING,
          description: 'The module ID (e.g., "module_1", "module_2")',
        },
      },
      required: ['eraId', 'adventureId', 'moduleId'],
    },
  },
  {
    name: 'searchLessons',
    description: 'Search across lessons the user has completed for specific topics, people, places, or events. Use this when the user asks if they learned about something specific. Examples: "Did I learn about Damascus?", "What do I know about Khalid ibn al-Walid?", "Have I studied the Byzantine Empire?"',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'The search query - a topic, person, place, or event (e.g., "Damascus", "Umar", "Battle of Yarmouk")',
        },
        eraId: {
          type: Type.STRING,
          description: 'Optional: Filter search to a specific era (e.g., "umayyad", "women_of_islam"). Pass the current era ID to search within that era only.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'getEraOverview',
    description: 'Get a complete overview of an era including all adventures, modules, and the user\'s completion status. Use this when the user asks about available content or what they haven\'t completed yet. Examples: "What\'s in Era 2?", "What topics are available?", "What haven\'t I completed?"',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eraId: {
          type: Type.STRING,
          description: 'The era ID (e.g., "umayyad", "rise_of_islam")',
        },
      },
      required: ['eraId'],
    },
  },
  {
    name: 'getLearningTimeline',
    description: 'Get the user\'s chronological learning journey showing when they started, what they completed, and their activity pattern. Use this when the user asks about their learning history, timeline, or activity. Examples: "When did I start learning?", "Show my learning timeline", "What did I do last week?", "How active have I been?"',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eraId: {
          type: Type.STRING,
          description: 'Optional: Filter timeline to a specific era. Omit to get timeline across all eras.',
        },
        limit: {
          type: Type.NUMBER,
          description: 'Maximum number of timeline entries to return (default: 10, max: 20)',
        },
      },
      required: [],
    },
  },
];

// ========== AI TOOLS SERVICE CLASS ==========

class AIToolsService {
  // READ-ONLY context snapshot (no write functions)
  private context: AIToolsContext | null = null;

  // Content cache to avoid repeated Supabase fetches
  private contentCache: Map<string, Adventure[]> = new Map();

  /**
   * Set the current context (called when chat opens)
   * This receives a READ-ONLY snapshot of user progress
   */
  setContext(context: AIToolsContext): void {
    this.context = context;
    console.log('🔧 [AIToolsService] Context set:', {
      progressItems: context.progress.length,
      totalXP: context.totalXP,
      selectedEra: context.selectedEra,
    });
  }

  /**
   * Get the tool declarations for Gemini
   */
  getToolDeclarations(): FunctionDeclaration[] {
    return AI_TOOL_DECLARATIONS;
  }

  /**
   * Execute a tool call from Gemini
   * Routes to the appropriate handler based on tool name
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<ToolResult> {
    console.log('🔧 [AIToolsService] Executing tool:', toolName);
    console.log('   Args:', JSON.stringify(args));

    const startTime = Date.now();

    try {
      let result: ToolResult;

      switch (toolName) {
        case 'getUserProgress':
          result = await this.getUserProgress(args.eraId);
          break;
        case 'getLastCompletedModule':
          result = await this.getLastCompletedModule(args.eraId);
          break;
        case 'getModuleContent':
          result = await this.getModuleContent(args.eraId, args.adventureId, args.moduleId);
          break;
        case 'searchLessons':
          result = await this.searchLessons(args.query, args.eraId);
          break;
        case 'getEraOverview':
          result = await this.getEraOverview(args.eraId);
          break;
        case 'getLearningTimeline':
          result = await this.getLearningTimeline(args.eraId, args.limit);
          break;
        default:
          result = { success: false, error: `Unknown tool: ${toolName}` };
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [AIToolsService] Tool ${toolName} completed in ${duration}ms`);

      return result;
    } catch (error) {
      console.error('❌ [AIToolsService] Tool execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ========== TOOL IMPLEMENTATIONS (ALL READ-ONLY) ==========

  /**
   * Tool 1: Get user's learning progress
   */
  private async getUserProgress(eraId?: string): Promise<ToolResult> {
    if (!this.context) {
      return { success: false, error: 'No user context available. User may not be signed in.' };
    }

    let progress = [...this.context.progress]; // Read-only copy

    // Filter by era if specified
    if (eraId) {
      progress = progress.filter(p => p.era_id === eraId);
    }

    // Calculate stats from progress
    const completedModules = progress.filter(p => p.isCompleted && p.quizCompleted);
    const totalXP = progress.reduce((sum, p) => sum + (p.quizCorrectAnswers || 0) * 10, 0);
    const quizScores = completedModules.map(p => p.quizScore || 0).filter(s => s > 0);
    const avgQuizScore = quizScores.length > 0
      ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length
      : 0;

    // Calculate per-era breakdown (use xpByEra if available for accuracy)
    const eraBreakdown: Record<string, { completed: number; xp: number }> = {};
    progress.forEach(p => {
      if (!eraBreakdown[p.era_id]) {
        eraBreakdown[p.era_id] = { completed: 0, xp: 0 };
      }
      if (p.isCompleted && p.quizCompleted) {
        eraBreakdown[p.era_id].completed += 1;
        eraBreakdown[p.era_id].xp += (p.quizCorrectAnswers || 0) * 10;
      }
    });

    // Override with actual xpByEra if available (more accurate)
    if (this.context.xpByEra) {
      Object.entries(this.context.xpByEra).forEach(([era, xp]) => {
        if (eraBreakdown[era]) {
          eraBreakdown[era].xp = xp;
        }
      });
    }

    // Get recent completions (sorted by date, newest first) with relative times
    const recentCompletions = completedModules
      .filter(p => p.completedAt) // Only include modules with completion dates
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      .slice(0, 5)
      .map(p => ({
        eraId: p.era_id,
        adventureId: String(p.adventureId),
        moduleId: String(p.moduleId),
        quizScore: p.quizScore,
        completedAt: p.completedAt,
        completedAgo: this.getRelativeTime(p.completedAt!),
      }));

    // Build streak info if available
    const streakInfo = this.context.streak ? {
      currentStreak: this.context.streak.currentStreak,
      longestStreak: this.context.streak.longestStreak,
      lastActiveDate: this.context.streak.lastActiveDate,
      lastActiveAgo: this.getRelativeTime(this.context.streak.lastActiveDate),
    } : null;

    // Calculate journey duration
    const firstActivity = this.context.firstActivityAt;
    const journeyDuration = firstActivity ? this.getRelativeTime(firstActivity) : null;

    return {
      success: true,
      data: {
        totalModulesCompleted: completedModules.length,
        totalXP: this.context.totalXP || totalXP,
        averageQuizScore: Math.round(avgQuizScore * 10) / 10,
        currentEra: this.context.selectedEra || 'Not selected',
        eraBreakdown,
        recentCompletions,
        streak: streakInfo,
        journeyStarted: firstActivity ? {
          date: firstActivity,
          ago: journeyDuration,
        } : null,
        lastActivity: this.context.lastActiveAt ? {
          date: this.context.lastActiveAt,
          ago: this.getRelativeTime(this.context.lastActiveAt),
        } : null,
        summary: `User has completed ${completedModules.length} modules with ${this.context.totalXP || totalXP} XP total. Average quiz score: ${Math.round(avgQuizScore * 10) / 10}/5.${streakInfo ? ` Current streak: ${streakInfo.currentStreak} days.` : ''}`,
      },
    };
  }

  /**
   * Tool 2: Get the most recently completed module with full content
   * @param eraId - Optional era ID to filter by (recommended: always pass current era)
   */
  private async getLastCompletedModule(eraId?: string): Promise<ToolResult> {
    if (!this.context) {
      return { success: false, error: 'No user context available. User may not be signed in.' };
    }

    // Use provided eraId or fall back to selectedEra from context
    const filterEraId = eraId || this.context.selectedEra;

    // Find completed modules sorted by completion date
    let completedModules = this.context.progress
      .filter(p => p.isCompleted && p.quizCompleted && p.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

    // Filter by era if specified
    if (filterEraId) {
      const eraFilteredModules = completedModules.filter(p => p.era_id === filterEraId);

      if (eraFilteredModules.length === 0) {
        return {
          success: true,
          data: {
            hasCompletedModules: false,
            eraId: filterEraId,
            message: `The user has not completed any modules in the "${filterEraId}" era yet. They may have progress in other eras.`,
            // Also provide info about other eras with progress
            otherErasWithProgress: [...new Set(completedModules.map(p => p.era_id))],
          },
        };
      }

      completedModules = eraFilteredModules;
    }

    if (completedModules.length === 0) {
      return {
        success: true,
        data: {
          hasCompletedModules: false,
          message: 'The user has not completed any modules yet. They are just getting started with their learning journey.',
        },
      };
    }

    const lastModule = completedModules[0];

    // Fetch the full content for this module
    const contentResult = await this.getModuleContent(
      lastModule.era_id,
      String(lastModule.adventureId),
      String(lastModule.moduleId)
    );

    if (!contentResult.success) {
      // Return basic info even if content fetch fails
      return {
        success: true,
        data: {
          hasCompletedModules: true,
          eraId: lastModule.era_id,
          adventureId: String(lastModule.adventureId),
          moduleId: String(lastModule.moduleId),
          quizScore: lastModule.quizScore,
          quizCorrectAnswers: lastModule.quizCorrectAnswers,
          completedAt: lastModule.completedAt,
          xpEarned: (lastModule.quizCorrectAnswers || 0) * 10,
          contentAvailable: false,
          message: 'Found the last completed module but could not fetch its content.',
        },
      };
    }

    // Combine progress data with content
    return {
      success: true,
      data: {
        hasCompletedModules: true,
        isLastCompleted: true,
        ...contentResult.data,
        quizScore: lastModule.quizScore,
        quizCorrectAnswers: lastModule.quizCorrectAnswers,
        xpEarned: (lastModule.quizCorrectAnswers || 0) * 10,
        // Enhanced timestamp information
        startedAt: lastModule.firstAttemptAt,
        startedAgo: this.getRelativeTime(lastModule.firstAttemptAt),
        completedAt: lastModule.completedAt,
        completedAgo: lastModule.completedAt ? this.getRelativeTime(lastModule.completedAt) : null,
        completedAtFormatted: lastModule.completedAt
          ? new Date(lastModule.completedAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'Not yet completed',
      },
    };
  }

  /**
   * Tool 3: Fetch full content for a specific module
   */
  private async getModuleContent(
    eraId: string,
    adventureId: string,
    moduleId: string
  ): Promise<ToolResult> {
    if (!eraId || !adventureId || !moduleId) {
      return { success: false, error: 'Missing required parameters: eraId, adventureId, and moduleId are all required.' };
    }

    try {
      // Get adventures for this era (use cache if available)
      let adventures = this.contentCache.get(eraId);

      if (!adventures) {
        console.log(`📚 [AIToolsService] Fetching adventures for era: ${eraId}`);
        adventures = await adventuresContentService.loadAdventures(eraId);

        if (adventures && adventures.length > 0) {
          this.contentCache.set(eraId, adventures);
        }
      }

      if (!adventures || adventures.length === 0) {
        return { success: false, error: `No adventures found for era: ${eraId}` };
      }

      // Find the adventure (handle both numeric and string IDs)
      const adventure = adventures.find(a => {
        const readableId = String(a.readable_id);
        const searchId = String(adventureId);
        return readableId === searchId ||
               readableId === `adventure_${searchId}` ||
               a.readable_id === adventureId;
      });

      if (!adventure) {
        return {
          success: false,
          error: `Adventure not found: ${adventureId} in era ${eraId}. Available adventures: ${adventures.map(a => a.readable_id).join(', ')}`
        };
      }

      // Find the module
      const module = adventure.content_list?.find(m => {
        const mId = String(m.id);
        const searchId = String(moduleId);
        return mId === searchId ||
               mId === `module_${searchId}` ||
               m.id === moduleId;
      });

      if (!module) {
        return {
          success: false,
          error: `Module not found: ${moduleId} in adventure ${adventureId}. Available modules: ${adventure.content_list?.map(m => m.id).join(', ')}`
        };
      }

      // Extract and clean the content
      const readingText = module.bottom_content?.reading_text || '';
      const fullContent = this.stripHtml(readingText);

      return {
        success: true,
        data: {
          eraId,
          adventureId: adventure.readable_id,
          adventureTitle: adventure.adventure_title,
          adventureDescription: adventure.adventure_description,
          moduleId: module.id,
          moduleTitle: module.thumbnail_title || module.id,
          lessonsCount: module.media_url?.length || 0,
          hasQuiz: module.questions && module.questions.length > 0,
          quizQuestionsCount: module.questions?.length || 0,
          fullContent,
          contentLength: fullContent.length,
          contentPreview: fullContent.length > 500
            ? fullContent.substring(0, 500) + '...'
            : fullContent,
        },
      };
    } catch (error) {
      console.error('❌ [AIToolsService] Error fetching module content:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch module content'
      };
    }
  }

  /**
   * Tool 4: Search across completed lessons for topics
   * @param query - The search query
   * @param eraId - Optional era ID to filter search results
   */
  private async searchLessons(query: string, eraId?: string): Promise<ToolResult> {
    if (!this.context) {
      return { success: false, error: 'No user context available. User may not be signed in.' };
    }

    if (!query || query.trim().length < 2) {
      return { success: false, error: 'Search query must be at least 2 characters.' };
    }

    // Use provided eraId or fall back to selectedEra from context
    const filterEraId = eraId || this.context.selectedEra;

    let completedModules = this.context.progress.filter(p => p.isCompleted);

    // Filter by era if specified
    if (filterEraId) {
      completedModules = completedModules.filter(p => p.era_id === filterEraId);
    }

    if (completedModules.length === 0) {
      return {
        success: true,
        data: {
          query,
          eraId: filterEraId,
          resultsCount: 0,
          results: [],
          message: filterEraId
            ? `The user has not completed any modules in the "${filterEraId}" era yet, so there is no content to search in this era.`
            : 'The user has not completed any modules yet, so there is no content to search.',
        },
      };
    }

    const searchResults: Array<{
      eraId: string;
      adventureId: string;
      adventureTitle: string;
      moduleId: string;
      moduleTitle: string;
      matchedContent: string;
      relevanceScore: number;
    }> = [];

    const queryLower = query.toLowerCase().trim();

    // Search through each completed module
    for (const moduleProgress of completedModules) {
      const contentResult = await this.getModuleContent(
        moduleProgress.era_id,
        String(moduleProgress.adventureId),
        String(moduleProgress.moduleId)
      );

      if (contentResult.success && contentResult.data) {
        const content = (contentResult.data.fullContent || '').toLowerCase();
        const title = (contentResult.data.moduleTitle || '').toLowerCase();
        const adventureTitle = (contentResult.data.adventureTitle || '').toLowerCase();

        // Check if query matches content or titles
        const contentMatch = content.includes(queryLower);
        const titleMatch = title.includes(queryLower);
        const adventureTitleMatch = adventureTitle.includes(queryLower);

        if (contentMatch || titleMatch || adventureTitleMatch) {
          // Extract matching snippet from content
          let matchedContent = '';
          if (contentMatch) {
            const matchIndex = content.indexOf(queryLower);
            const start = Math.max(0, matchIndex - 100);
            const end = Math.min(content.length, matchIndex + query.length + 150);
            matchedContent = '...' + contentResult.data.fullContent.substring(start, end).trim() + '...';
          } else {
            // Use content preview if match is in title
            matchedContent = contentResult.data.contentPreview || '';
          }

          // Calculate relevance score
          let relevanceScore = 0;
          if (titleMatch) relevanceScore += 3;
          if (adventureTitleMatch) relevanceScore += 2;
          if (contentMatch) relevanceScore += 1;

          searchResults.push({
            eraId: moduleProgress.era_id,
            adventureId: String(contentResult.data.adventureId),
            adventureTitle: contentResult.data.adventureTitle,
            moduleId: String(contentResult.data.moduleId),
            moduleTitle: contentResult.data.moduleTitle,
            matchedContent,
            relevanceScore,
          });
        }
      }
    }

    // Sort by relevance (highest first)
    searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Return top 5 results
    const topResults = searchResults.slice(0, 5);

    return {
      success: true,
      data: {
        query,
        eraId: filterEraId,
        resultsCount: searchResults.length,
        results: topResults,
        message: searchResults.length === 0
          ? filterEraId
            ? `No lessons found matching "${query}" in the "${filterEraId}" era. The user may not have learned about this topic yet in this era.`
            : `No lessons found matching "${query}". The user may not have learned about this topic yet, or it might be covered in modules they haven't completed.`
          : filterEraId
            ? `Found ${searchResults.length} lesson(s) matching "${query}" in the "${filterEraId}" era.`
            : `Found ${searchResults.length} lesson(s) matching "${query}".`,
      },
    };
  }

  /**
   * Tool 5: Get overview of an era
   */
  private async getEraOverview(eraId: string): Promise<ToolResult> {
    if (!eraId) {
      return { success: false, error: 'Era ID is required.' };
    }

    try {
      // Load adventures for this era
      let adventures = this.contentCache.get(eraId);

      if (!adventures) {
        console.log(`📚 [AIToolsService] Fetching era overview for: ${eraId}`);
        adventures = await adventuresContentService.loadAdventures(eraId);

        if (adventures && adventures.length > 0) {
          this.contentCache.set(eraId, adventures);
        }
      }

      if (!adventures || adventures.length === 0) {
        return {
          success: false,
          error: `No content found for era: ${eraId}. This era may not exist or may not have any published content yet.`
        };
      }

      // Get user progress for this era
      const eraProgress = this.context?.progress.filter(p => p.era_id === eraId) || [];

      // Build adventure structure with completion status
      const adventureList = adventures.map(adv => {
        const modules = (adv.content_list || []).map(m => {
          const moduleProgress = eraProgress.find(
            p => String(p.adventureId) === String(adv.readable_id) &&
                 String(p.moduleId) === String(m.id)
          );

          return {
            moduleId: m.id,
            title: m.thumbnail_title || m.id,
            lessonsCount: m.media_url?.length || 0,
            isCompleted: moduleProgress?.isCompleted && moduleProgress?.quizCompleted || false,
            quizScore: moduleProgress?.quizScore,
          };
        });

        const completedCount = modules.filter(m => m.isCompleted).length;

        return {
          adventureId: adv.readable_id,
          title: adv.adventure_title,
          description: adv.adventure_description,
          modulesCount: modules.length,
          completedModules: completedCount,
          isComplete: completedCount === modules.length && modules.length > 0,
          modules,
        };
      });

      // Calculate overall era stats
      const totalModules = adventureList.reduce((sum, a) => sum + a.modulesCount, 0);
      const completedModules = adventureList.reduce((sum, a) => sum + a.completedModules, 0);
      const totalXP = eraProgress.reduce((sum, p) => sum + (p.quizCorrectAnswers || 0) * 10, 0);

      return {
        success: true,
        data: {
          eraId,
          totalAdventures: adventures.length,
          totalModules,
          completedModules,
          completionPercentage: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
          totalXP,
          adventures: adventureList,
          summary: `Era "${eraId}" has ${adventures.length} adventures with ${totalModules} total modules. User has completed ${completedModules}/${totalModules} (${totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0}%) with ${totalXP} XP earned.`,
        },
      };
    } catch (error) {
      console.error('❌ [AIToolsService] Error getting era overview:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get era overview'
      };
    }
  }

  /**
   * Tool 6: Get user's learning timeline
   * Shows chronological learning journey with timestamps
   */
  private async getLearningTimeline(eraId?: string, limit?: number): Promise<ToolResult> {
    if (!this.context) {
      return { success: false, error: 'No user context available. User may not be signed in.' };
    }

    const maxLimit = Math.min(limit || 10, 20);
    let progress = [...this.context.progress];

    // Filter by era if specified
    if (eraId) {
      progress = progress.filter(p => p.era_id === eraId);
    }

    if (progress.length === 0) {
      return {
        success: true,
        data: {
          hasActivity: false,
          eraId: eraId || 'all',
          message: eraId
            ? `No learning activity found in the "${eraId}" era yet.`
            : 'No learning activity found yet. The user is just getting started!',
        },
      };
    }

    // Build timeline events from progress
    type TimelineEvent = {
      type: 'started' | 'completed';
      date: string;
      dateFormatted: string;
      ago: string;
      eraId: string;
      adventureId: string;
      moduleId: string;
      details?: {
        quizScore?: number;
        xpEarned?: number;
      };
    };

    const events: TimelineEvent[] = [];

    progress.forEach(p => {
      // Add "started" event
      if (p.firstAttemptAt) {
        events.push({
          type: 'started',
          date: p.firstAttemptAt,
          dateFormatted: new Date(p.firstAttemptAt).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          ago: this.getRelativeTime(p.firstAttemptAt),
          eraId: p.era_id,
          adventureId: String(p.adventureId),
          moduleId: String(p.moduleId),
        });
      }

      // Add "completed" event if module is done
      if (p.isCompleted && p.quizCompleted && p.completedAt) {
        events.push({
          type: 'completed',
          date: p.completedAt,
          dateFormatted: new Date(p.completedAt).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          ago: this.getRelativeTime(p.completedAt),
          eraId: p.era_id,
          adventureId: String(p.adventureId),
          moduleId: String(p.moduleId),
          details: {
            quizScore: p.quizScore,
            xpEarned: (p.quizCorrectAnswers || 0) * 10,
          },
        });
      }
    });

    // Sort by date (newest first)
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Limit results
    const timelineEvents = events.slice(0, maxLimit);

    // Calculate activity stats
    const completedModules = progress.filter(p => p.isCompleted && p.quizCompleted);
    const inProgressModules = progress.filter(p => !p.isCompleted && p.lessonsCompleted.length > 0);

    // Find first and last activity dates
    const allDates = events.map(e => new Date(e.date).getTime()).filter(d => !isNaN(d));
    const firstActivityDate = allDates.length > 0 ? new Date(Math.min(...allDates)) : null;
    const lastActivityDate = allDates.length > 0 ? new Date(Math.max(...allDates)) : null;

    // Calculate unique active days
    const uniqueDays = new Set(events.map(e => e.date.split('T')[0])).size;

    return {
      success: true,
      data: {
        hasActivity: true,
        eraId: eraId || 'all',
        timeline: timelineEvents,
        stats: {
          totalModulesStarted: progress.length,
          totalModulesCompleted: completedModules.length,
          modulesInProgress: inProgressModules.length,
          uniqueActiveDays: uniqueDays,
        },
        journeySpan: firstActivityDate && lastActivityDate ? {
          firstActivity: {
            date: firstActivityDate.toISOString(),
            formatted: firstActivityDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            ago: this.getRelativeTime(firstActivityDate.toISOString()),
          },
          lastActivity: {
            date: lastActivityDate.toISOString(),
            formatted: lastActivityDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            ago: this.getRelativeTime(lastActivityDate.toISOString()),
          },
        } : null,
        streak: this.context.streak || null,
        summary: `User has been learning for ${uniqueDays} day(s), started ${progress.length} module(s), and completed ${completedModules.length}.${this.context.streak ? ` Current streak: ${this.context.streak.currentStreak} days.` : ''}`,
      },
    };
  }

  // ========== UTILITY METHODS ==========

  /**
   * Convert ISO date string to relative time (e.g., "3 days ago", "just now")
   */
  private getRelativeTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30);

      if (diffSeconds < 60) return 'just now';
      if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      if (diffDays === 1) return 'yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffWeeks === 1) return 'last week';
      if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
      if (diffMonths === 1) return 'last month';
      if (diffMonths < 12) return `${diffMonths} months ago`;
      return 'over a year ago';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Strip HTML tags and decode entities from text
   */
  private stripHtml(html: string): string {
    if (!html) return '';

    return html
      .replace(/<[^>]*>/g, ' ')      // Remove HTML tags
      .replace(/&nbsp;/g, ' ')        // Decode &nbsp;
      .replace(/&amp;/g, '&')         // Decode &amp;
      .replace(/&lt;/g, '<')          // Decode &lt;
      .replace(/&gt;/g, '>')          // Decode &gt;
      .replace(/&quot;/g, '"')        // Decode &quot;
      .replace(/&#39;/g, "'")         // Decode &#39;
      .replace(/&apos;/g, "'")        // Decode &apos;
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .trim();
  }

  /**
   * Clear content cache (call when user logs out or era changes)
   */
  clearCache(): void {
    this.contentCache.clear();
    console.log('🔧 [AIToolsService] Cache cleared');
  }

  /**
   * Check if context is available
   */
  hasContext(): boolean {
    return this.context !== null;
  }
}

// Export singleton instance
export const aiToolsService = new AIToolsService();
