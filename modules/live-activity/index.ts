export {
  areActivitiesEnabled,
  listActiveActivities,
  startStreakGuard,
  updateStreakGuard,
  endStreakGuard,
  startDailyStory,
  updateDailyStory,
  endDailyStory,
  endAllActivities,
  registerPushToStartTokens,
  addPushToStartTokenListener,
} from './src/LiveActivityModule';

export type {
  StreakState,
  ActivityId,
  ActiveActivityRef,
  StreakGuardStartParams,
  StreakGuardUpdateParams,
  DailyStoryStartParams,
  DailyStoryUpdateParams,
  PushToStartTokenEvent,
} from './src/LiveActivityModule';
