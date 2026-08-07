import { describe, it, expect } from 'vitest';
import {
  authorize,
  scopeSearch,
  scopeBody,
  embeddedTables,
  PolicyError,
  TABLE_POLICY,
  PUBLIC_READ,
  SCOPED_RW,
} from '../db-policy.js';

const USER = 'user_2abcDEF';
const OTHER = 'user_9zzzXXX';

/** Shorthand: run a request through the policy and return the outcome. */
function run({ method = 'GET', table = 'gamification_data', query = '', body, userId = USER } = {}) {
  return authorize({
    method,
    path: [table],
    searchParams: new URLSearchParams(query),
    body,
    userId,
  });
}

function refusal(args) {
  try {
    run(args);
  } catch (err) {
    if (err instanceof PolicyError) return err;
    throw err;
  }
  throw new Error('expected a PolicyError, got none');
}

describe('the table allowlist', () => {
  it('refuses a table that is not listed', () => {
    // The default matters more than the entries: a table added to Supabase
    // later must be unreachable from a browser until someone decides otherwise.
    expect(refusal({ table: 'users' }).status).toBe(404);
    expect(refusal({ table: 'billing_events' }).status).toBe(404);
    expect(refusal({ table: 'pg_catalog' }).status).toBe(404);
  });

  it('refuses ai_usage in particular - the quota counter must stay unreachable', () => {
    // The /api/ai/explain monthly allowance is stored there. If this table
    // ever appears in TABLE_POLICY, any signed-in user can PATCH their own
    // counter to zero and the quota is theatre; that is why it was not put in
    // ai_user_data, which is SCOPED_RW. This pin exists so adding it fails a
    // test instead of passing review.
    expect(refusal({ table: 'ai_usage' }).status).toBe(404);
    expect(Object.keys(TABLE_POLICY)).not.toContain('ai_usage');
  });

  it('covers exactly the tables the mobile modules use', () => {
    // Guards against a table quietly appearing in the allowlist without a
    // caller, which is how a proxy grows into a general database gateway.
    expect(Object.keys(TABLE_POLICY).sort()).toEqual([
      'ai_user_data',
      'content',
      'daily_content',
      'eras',
      'gamification_data',
      'unlockable_items',
      'user_daily_quest_progress',
      'user_data',
      'user_unlockables',
    ]);
  });

  it('refuses every scoped table when there is no verified user', () => {
    // Called directly rather than through `run`, whose default would paper
    // over an absent userId - exactly the case being tested.
    const noUser = (userId, table) =>
      authorize({ method: 'GET', path: [table], searchParams: new URLSearchParams(), userId });

    for (const userId of [null, undefined, '']) {
      for (const table of Object.keys(TABLE_POLICY)) {
        if (TABLE_POLICY[table] === PUBLIC_READ) continue;
        // Without a verified subject there is nothing to scope to, so the only
        // safe answer is no.
        expect(
          () => noUser(userId, table),
          `${table} was served to an anonymous caller`
        ).toThrow(PolicyError);
      }
    }
  });

  it('serves public content without a session', () => {
    // The content providers and RewardsContext read these at startup, before
    // anyone signs in, exactly as mobile does with the anon key. Refusing them
    // left the engines with no data and they crashed on it - so this is app
    // behaviour, not a relaxation for convenience.
    for (const table of ['eras', 'content', 'daily_content', 'unlockable_items']) {
      const out = authorize({
        method: 'GET',
        path: [table],
        searchParams: new URLSearchParams('select=*'),
        userId: null,
      });
      expect(out.table).toBe(table);
      // Still unscoped, because there is nobody to scope to.
      expect(out.search.has('user_id')).toBe(false);
    }
  });

  it('still refuses writes to public tables without a session', () => {
    expect(() =>
      authorize({
        method: 'POST',
        path: ['content'],
        searchParams: new URLSearchParams(),
        body: {},
        userId: null,
      })
    ).toThrow(PolicyError);
  });
});

describe('method limits', () => {
  it('makes content read-only', () => {
    for (const table of ['eras', 'content', 'daily_content', 'unlockable_items']) {
      expect(run({ table }).method).toBe('GET');
      // Writable content tables would hand a browser the CMS.
      expect(refusal({ method: 'POST', table, body: {} }).status).toBe(405);
      expect(refusal({ method: 'PATCH', table, body: {} }).status).toBe(405);
    }
  });

  it('makes the legacy user_data table read-only', () => {
    // GamifiedProgress.tsx:848 reads it to migrate old progress forward and
    // never writes, so neither may the proxy.
    expect(run({ table: 'user_data' }).method).toBe('GET');
    expect(refusal({ method: 'POST', table: 'user_data', body: {} }).status).toBe(405);
  });

  it('refuses DELETE everywhere', () => {
    // No module deletes anything. Shipping an untested destructive path for no
    // caller is strictly downside.
    for (const table of Object.keys(TABLE_POLICY)) {
      expect(refusal({ method: 'DELETE', table }).status).toBe(405);
    }
  });

  it('refuses methods PostgREST would otherwise accept', () => {
    expect(refusal({ method: 'PUT', body: {} }).status).toBe(405);
    expect(refusal({ method: 'OPTIONS' }).status).toBe(405);
  });
});

describe('forced scoping on reads', () => {
  it('appends the caller to every scoped read', () => {
    const { search } = run({ table: 'gamification_data', query: 'select=data' });
    expect(search.getAll('user_id')).toEqual([`eq.${USER}`]);
  });

  it('leaves public content unscoped', () => {
    const { search } = run({ table: 'eras', query: 'select=*&order=order_by.asc' });
    expect(search.has('user_id')).toBe(false);
    expect(search.get('order')).toBe('order_by.asc');
  });

  it('cannot be escaped by supplying a different user_id', () => {
    // Append, not replace: PostgREST ANDs repeated top-level params, so the
    // forged filter and the real one are both applied and nothing matches.
    const { search } = run({ query: `user_id=eq.${OTHER}` });
    expect(search.getAll('user_id')).toEqual([`eq.${OTHER}`, `eq.${USER}`]);
  });

  it('cannot be escaped by an or= group', () => {
    // `or` is ANDed with the top-level filters, so `(user_id.eq.OTHER)` still
    // has to satisfy `user_id = USER` and matches nothing.
    const { search } = run({ query: `or=(user_id.eq.${OTHER},user_id.not.is.null)` });
    expect(search.get('or')).toBe(`(user_id.eq.${OTHER},user_id.not.is.null)`);
    expect(search.getAll('user_id')).toEqual([`eq.${USER}`]);
  });

  it('cannot be escaped by a not.in or a wildcard operator', () => {
    for (const q of [`user_id=not.in.(${USER})`, 'user_id=like.*', 'user_id=neq.null']) {
      const { search } = run({ query: q });
      expect(search.getAll('user_id').at(-1)).toBe(`eq.${USER}`);
    }
  });

  it('keeps the caller-supplied filters that legitimately narrow a read', () => {
    // RewardsContext.tsx:346 filters user_id AND item_id.
    const { search } = run({ table: 'user_unlockables', query: 'item_id=eq.avatar_7&select=id' });
    expect(search.get('item_id')).toBe('eq.avatar_7');
    expect(search.getAll('user_id')).toEqual([`eq.${USER}`]);
  });
});

describe('forced scoping on writes', () => {
  it('overwrites a forged user_id in an insert body', () => {
    const { body } = run({
      method: 'POST',
      table: 'user_unlockables',
      body: { item_id: 'avatar_7', user_id: OTHER, is_selected: true },
    });
    expect(body.user_id).toBe(USER);
    expect(body.item_id).toBe('avatar_7');
  });

  it('overwrites user_id in every element of an array body', () => {
    // RewardsContext.tsx:480 inserts a batch. A loop that only handled objects
    // would let every element through unstamped.
    const { body } = run({
      method: 'POST',
      table: 'user_unlockables',
      body: [
        { item_id: 'a', user_id: OTHER },
        { item_id: 'b' },
        { item_id: 'c', user_id: OTHER },
      ],
    });
    expect(body.map((r) => r.user_id)).toEqual([USER, USER, USER]);
    expect(body.map((r) => r.item_id)).toEqual(['a', 'b', 'c']);
  });

  it('scopes the query as well as the body on a write', () => {
    // RewardsContext.tsx:395 is `.update({is_selected:false}).eq('user_id', ...)`
    // with no other filter. Miss the scoping and one call unselects every
    // avatar for every user.
    const { search, body } = run({
      method: 'PATCH',
      table: 'user_unlockables',
      query: `user_id=eq.${OTHER}`,
      body: { is_selected: false },
    });
    expect(search.getAll('user_id')).toEqual([`eq.${OTHER}`, `eq.${USER}`]);
    expect(body.user_id).toBe(USER);
  });

  it('refuses a write body that is not an object', () => {
    for (const body of [null, undefined, 'x', 42, true]) {
      expect(() => run({ method: 'POST', body })).toThrow(PolicyError);
    }
  });

  it('refuses an array containing a non-object', () => {
    expect(() => run({ method: 'POST', body: [{ item_id: 'a' }, 'nope'] })).toThrow(PolicyError);
  });

  it('does not mutate the caller-supplied body', () => {
    const original = { item_id: 'a', user_id: OTHER };
    run({ method: 'POST', table: 'user_unlockables', body: original });
    expect(original.user_id).toBe(OTHER);
  });
});

describe('select= embeds', () => {
  it('parses the two embeds the app actually uses', () => {
    // RewardsContext.tsx:101
    expect(
      embeddedTables('id,item_id,user_id,unlocked_at,is_selected,item:unlockable_items(*)')
    ).toEqual(['unlockable_items']);
    // useTodayHistory.ts:99
    expect(
      embeddedTables(
        'daily_quest_id,daily_content!fk_daily_quest!inner(date),watch_completed,explore_completed,score'
      )
    ).toEqual(['daily_content']);
  });

  it('sees through nesting', () => {
    // Outer first, since the scan is left to right. Order does not matter to
    // the caller - every name returned is checked - but pinning it keeps the
    // test honest about what the parser does.
    expect(embeddedTables('*,user_unlockables(item:unlockable_items(*))')).toEqual([
      'user_unlockables',
      'unlockable_items',
    ]);
  });

  it('allows embedding public content', () => {
    expect(() =>
      run({ table: 'user_unlockables', query: 'select=id,item:unlockable_items(*)' })
    ).not.toThrow();
  });

  it('refuses embedding a scoped table', () => {
    // The top-level user_id filter constrains the parent, not the join - so an
    // embed of a scoped table returns other users' rows. This is the hole a
    // path-only check would leave wide open.
    expect(refusal({ table: 'daily_content', query: 'select=*,user_daily_quest_progress(*)' }).status).toBe(403);
    expect(refusal({ table: 'eras', query: 'select=*,gamification_data(data)' }).status).toBe(403);
    expect(refusal({ table: 'eras', query: 'select=*,alias:ai_user_data(*)' }).status).toBe(403);
    expect(refusal({ table: 'eras', query: 'select=*,user_data!inner(data)' }).status).toBe(403);
  });

  it('refuses embedding a table that is not in the allowlist at all', () => {
    expect(refusal({ table: 'eras', query: 'select=*,users(email)' }).status).toBe(403);
  });

  it('refuses a select it cannot parse rather than forwarding it', () => {
    expect(() => embeddedTables('*,weird->>(x)')).toThrow(PolicyError);
    expect(() => embeddedTables('*,public.users(*)')).toThrow(PolicyError);
  });

  it('accepts a select with no embeds', () => {
    expect(embeddedTables('*')).toEqual([]);
    expect(embeddedTables('data')).toEqual([]);
    expect(embeddedTables('')).toEqual([]);
    expect(embeddedTables(undefined)).toEqual([]);
  });
});

describe('query parameters', () => {
  it('allows a filter on an embedded public column', () => {
    // useTodayHistory.ts:105 filters on the joined daily_content.date.
    const { search } = run({
      table: 'user_daily_quest_progress',
      query: 'daily_content.date=gte.2026-08-01',
    });
    expect(search.get('daily_content.date')).toBe('gte.2026-08-01');
  });

  it('refuses a filter that reaches into a scoped table', () => {
    expect(refusal({ table: 'eras', query: 'gamification_data.user_id=eq.' + OTHER }).status).toBe(403);
  });

  it('refuses a parameter that is not a column filter', () => {
    // Unknown params are refused rather than passed through, so a PostgREST
    // feature nobody reviewed cannot arrive by accident.
    expect(refusal({ query: 'on_conflict%20;drop=1' }).status).toBe(400);
    expect(refusal({ query: '$$=1' }).status).toBe(400);
    expect(refusal({ query: '1abc=eq.1' }).status).toBe(400);
  });

  it('caps limit', () => {
    expect(run({ query: 'limit=999999' }).search.get('limit')).toBe('1000');
    expect(run({ query: 'limit=10' }).search.get('limit')).toBe('10');
    expect(refusal({ query: 'limit=-1' }).status).toBe(400);
    expect(refusal({ query: 'limit=abc' }).status).toBe(400);
  });

  it('passes the reserved params the modules use', () => {
    const { search } = run({
      table: 'user_daily_quest_progress',
      method: 'POST',
      query: 'on_conflict=user_id,daily_quest_id',
      body: {},
    });
    expect(search.get('on_conflict')).toBe('user_id,daily_quest_id');
  });
});

describe('paths', () => {
  const call = (path) =>
    authorize({ method: 'GET', path, searchParams: new URLSearchParams(), userId: USER });

  it('refuses anything that is not a single table segment', () => {
    // rpc/ has its own route: the one function we expose takes a number
    // unrelated to the caller, so proxying it verbatim would be an oracle.
    expect(() => call(['rpc', 'get_xp_percentile'])).toThrow(PolicyError);
    expect(() => call([])).toThrow(PolicyError);
    expect(() => call(['eras', 'extra'])).toThrow(PolicyError);
    expect(() => call('eras')).toThrow(PolicyError);
  });
});

describe('the helpers, directly', () => {
  it('scopeSearch leaves public policy untouched', () => {
    const out = scopeSearch(new URLSearchParams('select=*'), {
      policy: PUBLIC_READ,
      userId: USER,
    });
    expect(out.has('user_id')).toBe(false);
  });

  it('scopeSearch scopes read-write policy', () => {
    const out = scopeSearch(new URLSearchParams(''), { policy: SCOPED_RW, userId: USER });
    expect(out.get('user_id')).toBe(`eq.${USER}`);
  });

  it('scopeBody handles the nested-array case defensively', () => {
    expect(() => scopeBody([[{ a: 1 }]], { userId: USER })).toThrow(PolicyError);
  });
});
