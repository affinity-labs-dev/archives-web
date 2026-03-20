export function getStars(score, total) {
  if (total === 0) return 0;
  var pct = score / total;
  if (pct >= 1) return 3;
  if (pct >= 0.66) return 2;
  if (pct >= 0.33) return 1;
  return 0;
}

export function getRewardVideo(percentage) {
  if (percentage >= 70) return 'assets/videos/quiz_reward/quiz-reward3.mp4';
  if (percentage >= 34) return 'assets/videos/quiz_reward/quiz-reward2.mp4';
  return 'assets/videos/quiz_reward/quiz-reward1.mp4';
}

export function getResultMessage(percentage) {
  if (percentage >= 70) return { title: 'Brilliant Effort!', subtitle: "You're getting better every time" };
  return { title: "You've Got This!", subtitle: 'Revisit the lessons & try again' };
}
