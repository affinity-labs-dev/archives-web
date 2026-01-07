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
    completedAt: string;
    isCompleted: boolean;
    quizCompleted: boolean;
  }>;
  // Current selected era
  selectedEra?: string;
  // Total XP (pre-calculated)
  totalXP: number;
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
    description: 'Get the user\'s most recently completed module with its FULL lesson content. Use this when the user asks about their last lesson, recent learning, or wants a recap. Examples: "What was my last lesson about?", "What did I learn yesterday?", "Remind me what I studied last", "Can you recap my recent lesson?"',
    parameters: {
      type: Type.OBJECT,
      properties: {},
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
    description: 'Search across all lessons the user has completed for specific topics, people, places, or events. Use this when the user asks if they learned about something specific. Examples: "Did I learn about Damascus?", "What do I know about Khalid ibn al-Walid?", "Have I studied the Byzantine Empire?"',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'The search query - a topic, person, place, or event (e.g., "Damascus", "Umar", "Battle of Yarmouk")',
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
          result = await this.getLastCompletedModule();
          break;
        case 'getModuleContent':
          result = await this.getModuleContent(args.eraId, args.adventureId, args.moduleId);
          break;
        case 'searchLessons':
          result = await this.searchLessons(args.query);
          break;
        case 'getEraOverview':
          result = await this.getEraOverview(args.eraId);
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

    // Calculate per-era breakdown
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

    // Get recent completions (sorted by date, newest first)
    const recentCompletions = completedModules
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 5)
      .map(p => ({
        eraId: p.era_id,
        adventureId: String(p.adventureId),
        moduleId: String(p.moduleId),
        quizScore: p.quizScore,
        completedAt: p.completedAt,
      }));

    return {
      success: true,
      data: {
        totalModulesCompleted: completedModules.length,
        totalXP: this.context.totalXP || totalXP,
        averageQuizScore: Math.round(avgQuizScore * 10) / 10,
        currentEra: this.context.selectedEra || 'Not selected',
        eraBreakdown,
        recentCompletions,
        summary: `User has completed ${completedModules.length} modules with ${this.context.totalXP || totalXP} XP total. Average quiz score: ${Math.round(avgQuizScore * 10) / 10}/5.`,
      },
    };
  }

  /**
   * Tool 2: Get the most recently completed module with full content
   */
  private async getLastCompletedModule(): Promise<ToolResult> {
    if (!this.context) {
      return { success: false, error: 'No user context available. User may not be signed in.' };
    }

    // Find completed modules sorted by completion date
    const completedModules = this.context.progress
      .filter(p => p.isCompleted && p.quizCompleted && p.completedAt)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

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
        completedAt: lastModule.completedAt,
        completedAtFormatted: new Date(lastModule.completedAt).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
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
          hasQuiz: module.quiz && module.quiz.length > 0,
          quizQuestionsCount: module.quiz?.length || 0,
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
   */
  private async searchLessons(query: string): Promise<ToolResult> {
    if (!this.context) {
      return { success: false, error: 'No user context available. User may not be signed in.' };
    }

    if (!query || query.trim().length < 2) {
      return { success: false, error: 'Search query must be at least 2 characters.' };
    }

    const completedModules = this.context.progress.filter(p => p.isCompleted);

    if (completedModules.length === 0) {
      return {
        success: true,
        data: {
          query,
          resultsCount: 0,
          results: [],
          message: 'The user has not completed any modules yet, so there is no content to search.',
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
        resultsCount: searchResults.length,
        results: topResults,
        message: searchResults.length === 0
          ? `No lessons found matching "${query}". The user may not have learned about this topic yet, or it might be covered in modules they haven't completed.`
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

  // ========== UTILITY METHODS ==========

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
