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
} from './src/LiveActivityModule';

export type {
  StreakState,
  ActivityId,
  ActiveActivityRef,
  StreakGuardStartParams,
  StreakGuardUpdateParams,
  DailyStoryStartParams,
  DailyStoryUpdateParams,
} from './src/LiveActivityModule';
