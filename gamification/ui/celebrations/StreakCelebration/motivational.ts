// Streak-count → motivational message mapping. Pure function.

export const getMotivationalQuote = (streak: number): string => {
  if (streak === 1)
    return 'Great start! The journey of a thousand miles begins with a single step.';
  if (streak < 7) return 'Keep it up! Consistency is the key to mastery.';
  if (streak === 7) return 'One week strong! The scholars of old learned a little every day too.';
  if (streak < 30)
    return 'Great scholars and travelers learned a little every day too. Just like you!';
  if (streak === 30) return 'One month of dedication! You are building an incredible habit.';
  if (streak < 100) return 'Your commitment is inspiring! The path to wisdom is walked daily.';
  return 'Legendary dedication! You are truly embodying the spirit of lifelong learning.';
};
