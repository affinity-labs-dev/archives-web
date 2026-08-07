// Scoring helper for both quiz flows.
//
// getRewardVideo() and getResultMessage() lived here too and are gone with the
// score screen they fed: the celebration picks its own copy and assets per
// tier in js/celebration/tiers.js. getStars stays - it is what gets PERSISTED,
// for adventures via markComplete and for the daily story via
// setDailyStepComplete, and adventure-detail.js reads it back.

export function getStars(score, total) {
  if (total === 0) return 0;
  var pct = score / total;
  if (pct >= 1) return 3;
  if (pct >= 0.66) return 2;
  if (pct >= 0.33) return 1;
  return 0;
}
