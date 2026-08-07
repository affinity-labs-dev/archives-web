// Parsing for /api/ai/explain responses.
//
// Gemini is asked for a JSON array via responseSchema, which makes fences and
// preambles rare - but rare is not never, and the mobile backend's history
// with this exact call shows every failure shape below occurring in the wild.
//
// The contract with the route: this function never throws, and it returns an
// array of exactly `count` entries, each `{ explanation: string }` or `null`.
// A null means "no usable explanation for this question" - the client keeps
// the authored lesson text it already renders and shows a retry, so a partial
// parse is strictly better than a rejected one.
//
// What it deliberately does NOT do is the mobile fallback of returning the
// whole raw blob as Q1's explanation (backend/src/gemini.ts:357). That puts
// model preamble on screen as if it were history.

/** Strip a leading/trailing markdown fence, tolerating a language tag. */
function stripFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
}

/**
 * The last-resort extraction: first `[` to last `]`, then parse.
 *
 * Slicing, not a regex. An explanation containing bracketed text - "the
 * [caliph]", an editorial "[sic]" - breaks any lazy bracket-matching pattern,
 * and a greedy one is this slice anyway.
 */
function sliceArray(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** One entry: accept `{explanation}` objects or bare strings, else null. */
function normalizeEntry(entry) {
  let text = null;
  if (typeof entry === 'string') text = entry;
  else if (entry && typeof entry.explanation === 'string') text = entry.explanation;
  if (text === null) return null;
  const trimmed = text.trim();
  return trimmed ? { explanation: trimmed } : null;
}

/**
 * Parse a model response into exactly `count` explanations.
 *
 * @param {string} raw    the model's text output
 * @param {number} count  how many questions were asked about
 * @returns {Array<{explanation: string}|null>} always length `count`
 */
export function parseExplanations(raw, count) {
  const padded = new Array(count).fill(null);
  if (typeof raw !== 'string' || !raw.trim() || !Number.isInteger(count) || count <= 0) {
    return count > 0 ? padded : [];
  }

  const cleaned = stripFences(raw);

  let parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = sliceArray(cleaned);
  }
  if (!Array.isArray(parsed)) return padded;

  // Slice over-long, pad short. The model occasionally merges two answers or
  // invents an extra; index alignment with the questions matters more than
  // salvaging every string, because explanation N renders under question N.
  return padded.map((_, i) => normalizeEntry(parsed[i]));
}
