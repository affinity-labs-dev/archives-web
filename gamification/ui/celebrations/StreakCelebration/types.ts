// Public + internal type contracts for the streak celebration screen.

export interface WeekDay {
  day: string;
  completed: boolean;
  missed: boolean;
  isToday: boolean;
  shielded?: boolean; // Day was saved by a streak freeze shield
}

export interface StreakCelebrationScreenProps {
  visible: boolean;
  streakCount: number;
  weekData: WeekDay[]; // 7 days (Mo-Su) with completion status
  onContinue: () => void;
}
