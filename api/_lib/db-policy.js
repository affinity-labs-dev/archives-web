// The policy layer for the PostgREST proxy.
//
// The web build runs the mobile app's own data modules unchanged - they still
// call `supabase.from('gamification_data').select(...)` - but the client they
// talk to points at /api/db instead of Supabase, and holds no credential. This
// module decides what that proxy is allowed to forward.
//
// It is deliberately pure: every function here takes a request description and
// returns a rewritten one or throws. No I/O, no env, no fetch. That is what
// makes the rules exhaustively testable, and the reason the whole design is a
// proxy rather than eighteen hand-written endpoints - one place to get right
// instead of eighteen places to forget `requireUser`.
//
// The threat model is a signed-in user forging requests for someone else's
// data. Everything below exists to make that impossible, not merely unlikely.

/** A request the policy refuses. `status` is what the client should see. */
export class PolicyError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.status = status;
  }
}

// Table classes.
//
// PUBLIC_READ  - the CMS content. Identical for everyone, so no scoping, but
//                GET only: write access would hand a browser the CMS.
// SCOPED_READ  - the caller's own rows, read only.
// SCOPED_RW    - the caller's own rows, read and write.
export const PUBLIC_READ = 'public-read';
export const SCOPED_READ = 'scoped-read';
export const SCOPED_RW = 'scoped-rw';

/**
 * Every table the web app may reach, and how.
 *
 * Anything absent is refused. That default matters more than the entries: a
 * table added to Supabase later is unreachable from a browser until someone
 * makes a deliberate decision here.
 *
 * Derived from the ten modules that import the Supabase client - the complete
 * set, verified by grep, not by memory.
 */
export const TABLE_POLICY = {
  // Content. AdventuresContentService, useEras, useTodayQuest, useTodayHistory.
  eras: PUBLIC_READ,
  content: PUBLIC_READ,
  daily_content: PUBLIC_READ,
  unlockable_items: PUBLIC_READ,

  // GamifiedProgress.tsx:848 reads this to migrate pre-gamification progress
  // forward. It never writes, so neither may the proxy.
  user_data: SCOPED_READ,

  // The user's own state.
  gamification_data: SCOPED_RW,
  user_daily_quest_progress: SCOPED_RW,
  ai_user_data: SCOPED_RW,
  user_unlockables: SCOPED_RW,
};

/**
 * The column every scoped table is keyed by. It is the same everywhere, which
 * is why forced scoping can be one rule rather than a per-table config.
 */
const SCOPE_COLUMN = 'user_id';

/**
 * Methods allowed per class.
 *
 * DELETE is absent on purpose: no module deletes anything. Adding it later is
 * one line, but shipping it now would mean shipping an untested destructive
 * path for no caller.
 */
const ALLOWED_METHODS = {
  [PUBLIC_READ]: ['GET', 'HEAD'],
  [SCOPED_READ]: ['GET', 'HEAD'],
  [SCOPED_RW]: ['GET', 'HEAD', 'POST', 'PATCH'],
};

/** PostgREST query params that are not column filters. */
const RESERVED_PARAMS = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);

/** PostgREST refuses to return more than this anyway; the cap makes it explicit. */
const MAX_LIMIT = 1000;

// A bare column, or an embedded reference like `daily_content.date`
// (useTodayHistory.ts:105 filters on a joined column that way).
const FILTER_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

// What a `select=` may contain. Anything outside this is refused rather than
// parsed: the parser below only has to be correct for inputs it accepts.
const SELECT_CHARSET_RE = /^[A-Za-z0-9_,:!*().\s-]*$/;

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Pulls the table names out of a PostgREST `select=`.
 *
 * Embeds are the subtle hole in a proxy like this. `select=*,other_table(*)`
 * returns rows from a table that never appears in the path, so validating the
 * path alone would let a caller read anything joinable. Both real embeds look
 * like this:
 *
 *   item:unlockable_items(*)                    RewardsContext.tsx:107
 *   daily_content!fk_daily_quest!inner(date)    useTodayHistory.ts:99
 *
 * so the parser has to see through an alias prefix and a `!hint!modifier`
 * suffix, and has to keep working when embeds nest.
 */
export function embeddedTables(select) {
  if (!select) return [];
  if (!SELECT_CHARSET_RE.test(select)) {
    throw new PolicyError('Unsupported characters in select', 400);
  }

  const tables = [];
  for (let i = 0; i < select.length; i++) {
    if (select[i] !== '(') continue;

    // Walk back over the token immediately before the paren - that token is
    // the embed spec. Scanning the whole string rather than only the top level
    // is what makes nested embeds fall out for free.
    let start = i;
    while (start > 0 && /[A-Za-z0-9_!:.]/.test(select[start - 1])) start--;
    let spec = select.slice(start, i);
    if (!spec) continue;

    // `alias:table` -> table, then `table!hint!inner` -> table.
    const colon = spec.indexOf(':');
    if (colon !== -1) spec = spec.slice(colon + 1);
    spec = spec.split('!')[0];
    // A dotted spec would be a schema-qualified name; we serve one schema.
    if (spec.includes('.')) throw new PolicyError('Qualified names are not allowed', 400);
    if (!spec || !IDENT_RE.test(spec)) throw new PolicyError('Unparsable select', 400);

    tables.push(spec);
  }
  return tables;
}

/**
 * Validates the query string and returns it with scoping applied.
 *
 * Scoping is an *append*, never a replace. PostgREST ANDs repeated top-level
 * params, so a forged `user_id=eq.someone_else` becomes
 * `user_id = 'someone_else' AND user_id = '<caller>'` and matches nothing.
 * Replacing instead would be equally correct here but would quietly break the
 * legitimate two-filter reads (RewardsContext.tsx:346 filters user_id AND
 * item_id), and would fail open the moment a caller found a filter form the
 * replace missed.
 */
export function scopeSearch(searchParams, { policy, userId }) {
  const out = new URLSearchParams();

  for (const [key, value] of searchParams) {
    if (RESERVED_PARAMS.has(key)) {
      if (key === 'select') {
        for (const table of embeddedTables(value)) {
          // An embed of a scoped table would return other users' rows: the
          // top-level user_id filter constrains the parent, not the join. Only
          // public content may be embedded, which covers both real cases.
          if (TABLE_POLICY[table] !== PUBLIC_READ) {
            throw new PolicyError(`Cannot embed ${table}`);
          }
        }
      }
      if (key === 'limit') {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 0) throw new PolicyError('Invalid limit', 400);
        out.append('limit', String(Math.min(n, MAX_LIMIT)));
        continue;
      }
      out.append(key, value);
      continue;
    }

    if (!FILTER_KEY_RE.test(key)) {
      throw new PolicyError(`Unsupported query parameter: ${key}`, 400);
    }
    // A filter on an embedded column can only target public content, for the
    // same reason the embed itself can.
    const dot = key.indexOf('.');
    if (dot !== -1) {
      const table = key.slice(0, dot);
      if (TABLE_POLICY[table] !== PUBLIC_READ) {
        throw new PolicyError(`Cannot filter on ${table}`);
      }
    }
    out.append(key, value);
  }

  if (policy === SCOPED_READ || policy === SCOPED_RW) {
    out.append(SCOPE_COLUMN, `eq.${userId}`);
  }
  return out;
}

/**
 * Stamps the caller's id onto a write body.
 *
 * Overwrite rather than validate-and-reject: there is no case where the client
 * knows better than the verified token who it is, so silently correcting is
 * both safer and simpler than a 403 the app would have to handle.
 *
 * Arrays are the case that bites - RewardsContext.tsx:480 inserts a batch, and
 * a loop that only handled objects would let every element through unstamped.
 */
export function scopeBody(body, { userId }) {
  const stamp = (row) => {
    // Not recursive on purpose: a nested array would recurse into something
    // PostgREST cannot accept anyway, and a stamping rule that walks arbitrary
    // depth is a rule whose behaviour nobody can state precisely.
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new PolicyError('Write body must be an object or array of objects', 400);
    }
    return { ...row, [SCOPE_COLUMN]: userId };
  };
  return Array.isArray(body) ? body.map(stamp) : stamp(body);
}

/**
 * The whole policy, as one call.
 *
 * `path` is the PostgREST path segments after /rest/v1 - so `['gamification_data']`
 * for a table, `['rpc', 'name']` for a function. Returns the request to forward,
 * or throws PolicyError.
 */
export function authorize({ method, path, searchParams, body, userId }) {
  if (!userId) throw new PolicyError('Not signed in', 401);

  if (!Array.isArray(path) || path.length !== 1) {
    // rpc/ lives at length 2 and is handled by its own route, not here: the one
    // function we expose takes a caller-supplied number that has nothing to do
    // with the caller, so proxying it verbatim would be an oracle.
    throw new PolicyError('Unsupported path', 404);
  }

  const table = path[0];
  const policy = TABLE_POLICY[table];
  if (!policy) throw new PolicyError(`Unknown table: ${table}`, 404);

  const upper = String(method || '').toUpperCase();
  if (!ALLOWED_METHODS[policy].includes(upper)) {
    throw new PolicyError(`${upper} not allowed on ${table}`, 405);
  }

  const search = scopeSearch(searchParams, { policy, userId });

  const isWrite = upper === 'POST' || upper === 'PATCH';
  let outBody = body;
  if (isWrite) {
    if (policy !== SCOPED_RW) throw new PolicyError(`${upper} not allowed on ${table}`, 405);
    // PATCH bodies are partial updates, so stamping user_id is redundant - but
    // harmless, and it keeps one rule instead of two.
    outBody = scopeBody(body, { userId });
  }

  return { table, method: upper, search, body: outBody };
}
