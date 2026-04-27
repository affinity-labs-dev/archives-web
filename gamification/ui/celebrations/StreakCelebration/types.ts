// Public + internal type contracts for the streak celebration screen.

export interface WeekDay {
  day: string;
  completed: boolean;
  missed: boolean;
  isToday: boolean;
}

export interface StreakCelebrationScreenProps {
  visible: boolean;
  streakCount: number;
  weekData: WeekDay[]; // 7 days (Mo-Su) with completion status
  onContinue: () => void;
}
