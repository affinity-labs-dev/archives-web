// Shape checks for progress payloads.
//
// These bodies are written straight into JSONB columns, so without a check the
// endpoint would happily store arbitrary user-supplied JSON of unbounded size
// under a real user's row. The caps are generous relative to real data (49
// adventures, ~5 modules each, one daily entry per day) but bounded.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAILY_STEPS = new Set(['watch', 'explore', 'questions']);

const MAX_ADVENTURES = 500;
const MAX_MODULES_PER_ADVENTURE = 200;
const MAX_DAILY_ENTRIES = 1000;

/** `{ [adventureId]: { [moduleId]: 0-3 } }` */
export function validAdventureProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const adventures = Object.keys(value);
  if (adventures.length > MAX_ADVENTURES) return false;

  for (const advId of adventures) {
    const modules = value[advId];
    if (!modules || typeof modules !== 'object' || Array.isArray(modules)) return false;

    const moduleIds = Object.keys(modules);
    if (moduleIds.length > MAX_MODULES_PER_ADVENTURE) return false;

    for (const modId of moduleIds) {
      const stars = modules[modId];
      // Star counts only. Rejects strings, floats, and negatives, any of which
      // would corrupt the best-score-wins merge on the way back out.
      if (!Number.isInteger(stars) || stars < 0 || stars > 3) return false;
    }
  }
  return true;
}

/** `{ 'YYYY-MM-DD': { watch|explore|questions: value } }` */
export function validDailyProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const dates = Object.keys(value);
  if (dates.length > MAX_DAILY_ENTRIES) return false;

  for (const date of dates) {
    if (!DATE_RE.test(date)) return false;

    const steps = value[date];
    if (!steps || typeof steps !== 'object' || Array.isArray(steps)) return false;

    for (const step of Object.keys(steps)) {
      if (!DAILY_STEPS.has(step)) return false;
    }
  }
  return true;
}
