-- Metering for AI features called from the web backend.
--
-- /api/ai/explain is callable by any signed-in free user and spends Gemini
-- quota shared with paid chat, so free calls are counted per user per month
-- against a limit. The count must live where no browser can touch it: this
-- table is deliberately NOT in the web backend's /api/db proxy policy
-- (api/_lib/db-policy.js), which 404s unknown tables by construction, and
-- has no RLS grants to anon or authenticated at all. Only the service role -
-- i.e. the serverless functions - can reach it.
--
-- The function is the only writer, and it is atomic: check-and-increment in
-- one statement, so two tabs racing under the limit cannot both slip through
-- a read-then-write gap. It increments BEFORE the model call by design; the
-- route treats "allowed" as spend-then-call. A unit spent on a call that then
-- fails costs one tenth of a soft monthly allowance, which is cheaper than
-- the race.

create table if not exists public.ai_usage (
  user_id text not null,
  feature text not null,
  month   text not null,  -- UTC month bucket, e.g. '2026-08'
  used    integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, feature, month)
);

alter table public.ai_usage enable row level security;
-- No policies on purpose: RLS with no policies denies everything except the
-- service role, which bypasses RLS. The web proxy cannot name this table and
-- PostgREST's anon/authenticated roles have no grant either way.
revoke all on table public.ai_usage from public;
revoke all on table public.ai_usage from anon;
revoke all on table public.ai_usage from authenticated;

-- Spend one unit of a user's monthly allowance, atomically.
--
-- Returns {allowed, used}. When the limit is already reached, used stays at
-- the limit and allowed is false - the caller gets a verdict, never an error.
-- The increment-with-cap happens in a single INSERT ... ON CONFLICT UPDATE
-- with a guarded SET, so concurrent calls serialise on the row.
create or replace function public.consume_ai_quota(
  p_user_id text,
  p_feature text,
  p_month   text,
  p_limit   integer
)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  if p_user_id is null or p_user_id = '' or p_feature is null or p_feature = ''
     or p_month is null or p_month !~ '^\d{4}-\d{2}$' or p_limit is null or p_limit < 0 then
    raise exception 'consume_ai_quota: invalid arguments';
  end if;

  -- A zero limit means the feature has no free allowance at all; without this
  -- guard the fresh-row INSERT below would hand out one call per month.
  if p_limit = 0 then
    return query select false, 0;
    return;
  end if;

  -- The WHERE on the DO UPDATE is the whole mechanism: the increment happens
  -- only while under the limit, and when it does not happen RETURNING yields
  -- nothing - which is how "exhausted" is told apart from "spent", with no
  -- read-then-write gap for a second tab to slip through.
  insert into ai_usage as u (user_id, feature, month, used, updated_at)
  values (p_user_id, p_feature, p_month, 1, now())
  on conflict (user_id, feature, month)
  do update set used = u.used + 1, updated_at = now()
  where u.used < p_limit
  returning u.used into v_used;

  if v_used is not null then
    return query select true, v_used;
  else
    select u.used into v_used from ai_usage u
      where u.user_id = p_user_id and u.feature = p_feature and u.month = p_month;
    return query select false, coalesce(v_used, p_limit);
  end if;
end;
$$;

revoke all on function public.consume_ai_quota(text, text, text, integer) from public;
revoke all on function public.consume_ai_quota(text, text, text, integer) from anon;
revoke all on function public.consume_ai_quota(text, text, text, integer) from authenticated;
grant execute on function public.consume_ai_quota(text, text, text, integer) to service_role;
