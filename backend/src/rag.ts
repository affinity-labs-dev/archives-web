// rag.ts - RAG tool execution (ported from AIToolsService.ts)
// All tools are READ-ONLY — operate on context snapshot from client

import { supabase } from './auth.js';
import type { ToolsContext } from './types.js';

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export async function executeRAGTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolsContext
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'getUserProgress':
        return getUserProgress(context, args.eraId);
      case 'getLastCompletedModule':
        return getLastCompletedModule(context, args.eraId);
      case 'getModuleContent':
        return getModuleContent(args.eraId, args.adventureId, args.moduleId);
      case 'getEraOverview':
        return getEraOverview(context, args.eraId);
      case 'searchLessons':
        return searchLessons(context, args.query, args.eraId);
      case 'getLearningTimeline':
        return getLearningTimeline(context, args.eraId, args.limit);
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function getUserProgress(context: ToolsContext, eraId?: string): ToolResult {
  let progress = [...context.progress];
  if (eraId) progress = progress.filter(p => p.era_id === eraId);

  const completed = progress.filter(p => p.isCompleted && p.quizCompleted);
  const totalXP = progress.reduce((sum, p) => sum + (p.quizCorrectAnswers || 0) * 10, 0);
  const scores = completed.map(p => p.quizScore || 0).filter(s => s > 0);
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const eraBreakdown: Record<string, { completed: number; xp: number }> = {};
  progress.forEach(p => {
    if (!eraBreakdown[p.era_id]) eraBreakdown[p.era_id] = { completed: 0, xp: 0 };
    if (p.isCompleted && p.quizCompleted) {
      eraBreakdown[p.era_id].completed += 1;
      eraBreakdown[p.era_id].xp += (p.quizCorrectAnswers || 0) * 10;
    }
  });

  if (context.xpByEra) {
    Object.entries(context.xpByEra).forEach(([era, xp]) => {
      if (eraBreakdown[era]) eraBreakdown[era].xp = xp;
    });
  }

  const recent = completed
    .filter(p => p.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 5)
    .map(p => ({
      eraId: p.era_id,
      adventureId: String(p.adventureId),
      moduleId: String(p.moduleId),
      quizScore: p.quizScore,
      completedAt: p.completedAt,
      completedAgo: getRelativeTime(p.completedAt!),
    }));

  return {
    success: true,
    data: {
      totalModulesCompleted: completed.length,
      totalXP: context.totalXP || totalXP,
      averageQuizScore: Math.round(avg * 10) / 10,
      currentEra: context.selectedEra || 'Not selected',
      eraBreakdown,
      recentCompletions: recent,
      streak: context.streak ? {
        currentStreak: context.streak.currentStreak,
        longestStreak: context.streak.longestStreak,
        lastActiveAgo: getRelativeTime(context.streak.lastActiveDate),
      } : null,
      journeyDuration: context.firstActivityAt ? getRelativeTime(context.firstActivityAt) : null,
    },
  };
}

async function getLastCompletedModule(context: ToolsContext, eraId?: string): Promise<ToolResult> {
  let progress = [...context.progress];
  if (eraId) progress = progress.filter(p => p.era_id === eraId);

  const completed = progress
    .filter(p => p.isCompleted && p.quizCompleted && p.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  if (completed.length === 0) {
    return { success: true, data: { message: 'No completed modules found.' } };
  }

  const last = completed[0];

  // Fetch module content from Supabase
  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('era_id', last.era_id)
    .eq('adventure_id', String(last.adventureId));

  const module = content?.find((c: any) =>
    c.content_list?.some((item: any) => item.module_id === String(last.moduleId))
  );

  return {
    success: true,
    data: {
      eraId: last.era_id,
      adventureId: String(last.adventureId),
      moduleId: String(last.moduleId),
      quizScore: last.quizScore,
      completedAt: last.completedAt,
      completedAgo: getRelativeTime(last.completedAt!),
      content: module || null,
    },
  };
}

async function getModuleContent(eraId: string, adventureId: string, moduleId: string): Promise<ToolResult> {
  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('era_id', eraId)
    .eq('adventure_id', adventureId);

  if (!content || content.length === 0) {
    return { success: false, error: `No content found for era ${eraId}, adventure ${adventureId}` };
  }

  const module = content[0]?.content_list?.find((item: any) => item.module_id === moduleId);
  if (!module) {
    return { success: false, error: `Module ${moduleId} not found` };
  }

  return { success: true, data: module };
}

async function getEraOverview(context: ToolsContext, eraId: string): Promise<ToolResult> {
  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('era_id', eraId);

  if (!content || content.length === 0) {
    return { success: false, error: `No content found for era ${eraId}` };
  }

  const progress = context.progress.filter(p => p.era_id === eraId);

  return {
    success: true,
    data: {
      eraId,
      adventures: content.map((adv: any) => ({
        adventureId: adv.adventure_id,
        title: adv.title,
        modules: adv.content_list?.map((m: any) => {
          const prog = progress.find(p => String(p.moduleId) === m.module_id && String(p.adventureId) === adv.adventure_id);
          return {
            moduleId: m.module_id,
            title: m.title,
            isCompleted: prog?.isCompleted && prog?.quizCompleted,
            quizScore: prog?.quizScore,
          };
        }) || [],
      })),
    },
  };
}

async function searchLessons(context: ToolsContext, query: string, eraId?: string): Promise<ToolResult> {
  let progress = [...context.progress];
  if (eraId) progress = progress.filter(p => p.era_id === eraId);

  const completedModules = progress.filter(p => p.isCompleted && p.quizCompleted);
  if (completedModules.length === 0) {
    return { success: true, data: { results: [], message: 'No completed lessons to search.' } };
  }

  // Fetch content for completed modules
  const eraIds = [...new Set(completedModules.map(p => p.era_id))];
  const { data: content } = await supabase
    .from('content')
    .select('*')
    .in('era_id', eraIds);

  if (!content) {
    return { success: true, data: { results: [] } };
  }

  const lowerQuery = query.toLowerCase();
  const results: any[] = [];

  for (const adv of content) {
    for (const module of adv.content_list || []) {
      const text = JSON.stringify(module).toLowerCase();
      if (text.includes(lowerQuery)) {
        results.push({
          eraId: adv.era_id,
          adventureId: adv.adventure_id,
          moduleId: module.module_id,
          title: module.title,
          matchSnippet: text.substring(Math.max(0, text.indexOf(lowerQuery) - 50), text.indexOf(lowerQuery) + 100),
        });
      }
    }
  }

  return { success: true, data: { results: results.slice(0, 5), query } };
}

function getLearningTimeline(context: ToolsContext, eraId?: string, limit?: number): ToolResult {
  let progress = [...context.progress];
  if (eraId) progress = progress.filter(p => p.era_id === eraId);

  const maxEntries = Math.min(limit || 10, 20);

  const timeline = progress
    .filter(p => p.firstAttemptAt || p.completedAt)
    .sort((a, b) => {
      const dateA = new Date(a.completedAt || a.firstAttemptAt).getTime();
      const dateB = new Date(b.completedAt || b.firstAttemptAt).getTime();
      return dateB - dateA;
    })
    .slice(0, maxEntries)
    .map(p => ({
      eraId: p.era_id,
      adventureId: String(p.adventureId),
      moduleId: String(p.moduleId),
      status: p.isCompleted && p.quizCompleted ? 'completed' : 'in_progress',
      startedAt: p.firstAttemptAt,
      startedAgo: p.firstAttemptAt ? getRelativeTime(p.firstAttemptAt) : null,
      completedAt: p.completedAt,
      completedAgo: p.completedAt ? getRelativeTime(p.completedAt) : null,
      quizScore: p.quizScore,
    }));

  return { success: true, data: { timeline, totalEntries: progress.length } };
}
