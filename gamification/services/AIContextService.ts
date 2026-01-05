// AIContextService.ts - Builds personalized AI context from user progress and content
// Phase 1: Uses existing content table
// Phase 2 (Future): Will integrate with dedicated knowledge/summaries table

import { adventuresContentService } from './AdventuresContentService';
import type { Adventure, ContentItem } from '@/components/shared/types';

// User progress item structure (from AsyncStorage)
interface UserProgressItem {
  adventureId: string;
  moduleId: string;
  era_id: string;
  isCompleted: boolean;
  quizCompleted: boolean;
  quizScore?: number;
  quizCorrectAnswers?: number;
}

// Structured knowledge context for AI
export interface AIKnowledgeContext {
  // Completed content summaries
  completedAdventures: {
    adventureId: string;
    title: string;
    description?: string;
    modules: {
      moduleId: string;
      title: string;
      contentSummary: string; // Extracted from reading_text
      quizScore?: number;
    }[];
  }[];

  // Current era info
  currentEra?: {
    eraId: string;
    eraName: string;
    totalAdventures: number;
    completedAdventures: number;
  };

  // Quick stats
  stats: {
    totalModulesCompleted: number;
    averageQuizScore: number;
    strongTopics: string[];    // Topics with high quiz scores
    weakTopics: string[];      // Topics needing review
  };
}

class AIContextService {
  /**
   * Build comprehensive AI context from user progress
   * This is the main function called when AI chat opens
   */
  async buildContext(params: {
    userProgress: UserProgressItem[];
    currentEraId?: string;
    currentEraName?: string;
  }): Promise<AIKnowledgeContext> {
    const { userProgress, currentEraId, currentEraName } = params;

    console.log('🧠 [AIContextService] Building AI context...');
    console.log(`📊 User has ${userProgress.length} progress items`);

    // Get unique era IDs from progress
    const eraIds = [...new Set(userProgress.map(p => p.era_id).filter(Boolean))];

    // Fetch content for all eras the user has progress in
    const allAdventures: Adventure[] = [];
    for (const eraId of eraIds) {
      try {
        const adventures = await adventuresContentService.loadAdventures(eraId);
        allAdventures.push(...adventures);
      } catch (error) {
        console.error(`❌ [AIContextService] Error loading era ${eraId}:`, error);
      }
    }

    console.log(`📚 Loaded ${allAdventures.length} adventures from ${eraIds.length} eras`);

    // Build completed adventures context
    const completedAdventures = this.buildCompletedAdventuresContext(
      userProgress,
      allAdventures
    );

    // Calculate stats
    const stats = this.calculateStats(userProgress, completedAdventures);

    // Build current era info
    let currentEra;
    if (currentEraId) {
      const eraAdventures = allAdventures.filter(a => a.era_id === currentEraId);
      const completedInEra = completedAdventures.filter(
        ca => eraAdventures.some(a => a.readable_id === ca.adventureId)
      );

      currentEra = {
        eraId: currentEraId,
        eraName: currentEraName || currentEraId,
        totalAdventures: eraAdventures.length,
        completedAdventures: completedInEra.length,
      };
    }

    const context: AIKnowledgeContext = {
      completedAdventures,
      currentEra,
      stats,
    };

    console.log('✅ [AIContextService] Context built successfully');
    console.log(`   - ${completedAdventures.length} adventures with content`);
    console.log(`   - ${stats.totalModulesCompleted} modules completed`);
    console.log(`   - ${stats.averageQuizScore}% average quiz score`);

    return context;
  }

  /**
   * Build context for completed adventures and their modules
   */
  private buildCompletedAdventuresContext(
    userProgress: UserProgressItem[],
    allAdventures: Adventure[]
  ): AIKnowledgeContext['completedAdventures'] {
    const result: AIKnowledgeContext['completedAdventures'] = [];

    // Group progress by adventure
    const progressByAdventure = new Map<string, UserProgressItem[]>();
    for (const progress of userProgress) {
      if (!progress.isCompleted) continue;

      const existing = progressByAdventure.get(progress.adventureId) || [];
      existing.push(progress);
      progressByAdventure.set(progress.adventureId, existing);
    }

    // Build context for each adventure with progress
    for (const [adventureId, moduleProgress] of progressByAdventure) {
      const adventure = allAdventures.find(a => a.readable_id === adventureId);
      if (!adventure) continue;

      const modules: AIKnowledgeContext['completedAdventures'][0]['modules'] = [];

      for (const progress of moduleProgress) {
        const module = adventure.content_list?.find(m => m.id === progress.moduleId);
        if (!module) continue;

        // Extract summary from reading_text (strip HTML, limit length)
        const contentSummary = this.extractContentSummary(module);

        modules.push({
          moduleId: progress.moduleId,
          title: module.thumbnail_title || progress.moduleId,
          contentSummary,
          quizScore: progress.quizScore,
        });
      }

      if (modules.length > 0) {
        result.push({
          adventureId,
          title: adventure.adventure_title,
          description: adventure.adventure_description,
          modules,
        });
      }
    }

    return result;
  }

  /**
   * Extract a summary from module content (reading_text)
   * Strips HTML and limits to first ~200 chars
   */
  private extractContentSummary(module: ContentItem): string {
    const readingText = module.bottom_content?.reading_text;
    if (!readingText) {
      return module.thumbnail_title || 'No content available';
    }

    // Strip HTML tags
    let plainText = readingText
      .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
      .replace(/&nbsp;/g, ' ')   // Replace &nbsp;
      .replace(/&amp;/g, '&')    // Replace &amp;
      .replace(/&lt;/g, '<')     // Replace &lt;
      .replace(/&gt;/g, '>')     // Replace &gt;
      .replace(/&quot;/g, '"')   // Replace &quot;
      .replace(/&#39;/g, "'")    // Replace &#39;
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim();

    // Limit to ~300 chars, ending at word boundary
    if (plainText.length > 300) {
      plainText = plainText.substring(0, 300);
      const lastSpace = plainText.lastIndexOf(' ');
      if (lastSpace > 200) {
        plainText = plainText.substring(0, lastSpace) + '...';
      }
    }

    return plainText;
  }

  /**
   * Calculate learning stats from progress
   */
  private calculateStats(
    userProgress: UserProgressItem[],
    completedAdventures: AIKnowledgeContext['completedAdventures']
  ): AIKnowledgeContext['stats'] {
    const completedModules = userProgress.filter(p => p.isCompleted && p.quizCompleted);
    const totalModulesCompleted = completedModules.length;

    // Calculate average quiz score
    const quizScores = completedModules
      .filter(p => p.quizScore !== undefined)
      .map(p => p.quizScore!);

    const averageQuizScore = quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : 0;

    // Identify strong and weak topics based on quiz scores
    const strongTopics: string[] = [];
    const weakTopics: string[] = [];

    for (const adventure of completedAdventures) {
      for (const module of adventure.modules) {
        const topicName = `${adventure.title} - ${module.title}`;
        if (module.quizScore !== undefined) {
          if (module.quizScore >= 80) {
            strongTopics.push(topicName);
          } else if (module.quizScore < 60) {
            weakTopics.push(topicName);
          }
        }
      }
    }

    return {
      totalModulesCompleted,
      averageQuizScore,
      strongTopics: strongTopics.slice(0, 5), // Limit to top 5
      weakTopics: weakTopics.slice(0, 5),     // Limit to top 5
    };
  }

  /**
   * Format context for injection into AI system prompt
   * Returns a string ready to be added to the prompt
   */
  formatForPrompt(context: AIKnowledgeContext): string {
    const lines: string[] = [];

    lines.push('=== USER LEARNING HISTORY ===');
    lines.push('');

    // Current era progress
    if (context.currentEra) {
      lines.push(`CURRENT ERA: ${context.currentEra.eraName}`);
      lines.push(`Progress: ${context.currentEra.completedAdventures}/${context.currentEra.totalAdventures} adventures completed`);
      lines.push('');
    }

    // Stats
    lines.push('LEARNING STATS:');
    lines.push(`- Modules Completed: ${context.stats.totalModulesCompleted}`);
    lines.push(`- Average Quiz Score: ${context.stats.averageQuizScore}%`);

    if (context.stats.strongTopics.length > 0) {
      lines.push(`- Strong Topics: ${context.stats.strongTopics.join(', ')}`);
    }
    if (context.stats.weakTopics.length > 0) {
      lines.push(`- Topics Needing Review: ${context.stats.weakTopics.join(', ')}`);
    }
    lines.push('');

    // Completed content summaries
    if (context.completedAdventures.length > 0) {
      lines.push('CONTENT THE USER HAS LEARNED:');
      lines.push('');

      for (const adventure of context.completedAdventures) {
        lines.push(`📚 ${adventure.title}`);
        if (adventure.description) {
          lines.push(`   ${adventure.description}`);
        }

        for (const module of adventure.modules) {
          const scoreText = module.quizScore !== undefined
            ? ` (Quiz: ${module.quizScore}%)`
            : '';
          lines.push(`   ├─ ${module.title}${scoreText}`);
          lines.push(`   │  ${module.contentSummary}`);
        }
        lines.push('');
      }
    }

    lines.push('=== END LEARNING HISTORY ===');

    return lines.join('\n');
  }
}

// Export singleton instance
export const aiContextService = new AIContextService();
