-- One universal streak, shared between the mobile app and the web app.
--
-- The streak has always lived in gamification_data.data.streak, and the mobile
-- app bumps it on ANY completion: reportQuizComplete for adventure quizzes and
-- reportTodayComplete for the daily story. The web app never read it. It
-- derived its own number from the browser's daily-story progress, so adventure
-- work counted for nothing and a user's streak differed between their phone and
-- their browser. Half the web users (22 of 44) already have a mobile row, so
-- that divergence is live, not theoretical.
--
-- WHY A FUNCTION RATHER THAN A READ-MODIFY-WRITE FROM THE API
--
-- `data` is one json column holding the whole GamifiedProgressState, and the
-- mobile app upserts ALL of it. If the web read the row, changed the streak and
-- wrote the row back, it would race the phone and could clobber progress, XP or
-- achievements that arrived in between. This touches data->'streak' and nothing
-- else, under a row lock, in one statement. It cannot lose a neighbouring key.
--
-- WHY THE RULES BELOW MATTER
--
-- The app's reconcileStreak() treats `lastActiveDate` as the SOLE freshness
-- key: whichever side has the later date wins currentStreak, streakShields and
-- shieldedDates outright, without also having to have a higher streak. So a
-- streak written here with today's date is taken as truth by every device on
-- the user's next launch. Getting this wrong does not produce a wrong number on
-- the web; it rewrites the streak on the phone too.
--
-- The rules are therefore a direct port of GamificationOrchestrator.tsx
-- (~line 2090), including its STRICT NO-SUBTRACT policy: an unexpected
-- lastActiveDate maintains the streak rather than resetting it. Resets are the
-- app's business - it owns shield consumption and gap processing, which this
-- deliberately does not implement. The web can only ever hold a streak level or
-- raise it.

create or replace function public.bump_streak(p_user_id text, p_today date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data          jsonb;
  v_streak        jsonb;
  v_current       int;
  v_longest       int;
  v_last          date;
  v_shields       int;
  v_new           int;
  v_new_longest   int;
  v_longest_date  text;
  v_today_text    text := to_char(p_today, 'YYYY-MM-DD');
begin
  if p_user_id is null or length(p_user_id) = 0 then
    raise exception 'bump_streak: user id is required';
  end if;

  -- FOR UPDATE: two tabs finishing a quiz at once must not both read the same
  -- streak and both write current+1.
  -- NOTE the cast. The column is `json`, not `jsonb`, so none of the operators
  -- below (jsonb_set, ||, ?) apply to it directly; it is read as jsonb and
  -- written back as json.
  select data::jsonb into v_data
    from public.gamification_data
   where user_id = p_user_id
     for update;

  if v_data is null then
    -- No mobile row yet. Seed the same shape the app creates on first launch,
    -- so a user who later installs it does not land on a row it cannot read.
    -- adventureProgress carries the app's INITIAL_ADVENTURE_DATA verbatim; an
    -- empty array here would show them every adventure locked.
    v_data := jsonb_build_object(
      'user_id', p_user_id,
      'progress', '[]'::jsonb,
      'adventureProgress', '[
        {"adventureId":1,"isUnlocked":true,"modulesCompleted":0,"totalModules":3},
        {"adventureId":2,"isUnlocked":true,"modulesCompleted":0,"totalModules":3},
        {"adventureId":3,"isUnlocked":true,"modulesCompleted":0,"totalModules":3},
        {"adventureId":4,"isUnlocked":true,"modulesCompleted":0,"totalModules":3},
        {"adventureId":5,"isUnlocked":true,"modulesCompleted":0,"totalModules":3}
      ]'::jsonb,
      'selectedEra', '',
      'totalXP', 0,
      'xp_by_era', '{}'::jsonb,
      'xp_by_source', jsonb_build_object('lessons', 0, 'quizzes', 0, 'games', 0),
      'streak', jsonb_build_object(
        'currentStreak', 0,
        'longestStreak', 0,
        'lastActiveDate', '',
        'longestStreakDate', '',
        'streakShields', 0,
        'shieldedDates', '[]'::jsonb
      ),
      'milestones', '[]'::jsonb,
      'achievements_unlocked', '[]'::jsonb,
      'behavior', jsonb_build_object(
        'session_style', 'moderate',
        'avg_attempts_per_visit', 0,
        'engagement_trend', 'stable',
        'weak_modules', '[]'::jsonb,
        'strong_modules', '[]'::jsonb,
        'last_computed', '',
        'mastery_percentage', 0,
        'mastered_modules', 0,
        'total_modules', 0,
        'active_days', 0
      ),
      'metadata', jsonb_build_object(
        'created_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'last_updated', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'migration_completed', true,
        'migration_source', 'web_streak',
        'total_quiz_attempts', 0,
        'total_modules_attempted', 0
      )
    );
  end if;

  v_streak  := coalesce(v_data -> 'streak', '{}'::jsonb);
  v_current := coalesce((v_streak ->> 'currentStreak')::int, 0);
  v_longest := coalesce((v_streak ->> 'longestStreak')::int, 0);
  v_shields := coalesce((v_streak ->> 'streakShields')::int, 0);
  v_longest_date := coalesce(v_streak ->> 'longestStreakDate', '');

  -- An empty or malformed date is "never active", not an error.
  begin
    v_last := nullif(v_streak ->> 'lastActiveDate', '')::date;
  exception when others then
    v_last := null;
  end;

  if v_last = p_today then
    -- Already counted today. Only the very first completion of a brand-new
    -- account promotes 0 to 1.
    v_new := greatest(v_current, 1);
  elsif v_last = p_today - 1 then
    v_new := v_current + 1;
  else
    -- A gap, a future date, or no history. STRICT NO-SUBTRACT: hold what they
    -- have. Only the app resets a streak, because only the app knows whether a
    -- shield covered the gap.
    v_new := greatest(v_current, 1);
  end if;

  -- A shield every seventh day, capped at three, and only when the streak
  -- actually advanced. Mirrors the app so a week completed on the web earns
  -- what a week completed on the phone earns.
  if v_new > v_current and v_new % 7 = 0 and v_shields < 3 then
    v_shields := v_shields + 1;
  end if;

  v_new_longest := greatest(v_new, v_longest);
  if v_new > v_longest then
    v_longest_date := v_today_text;
  end if;

  v_streak := v_streak
    || jsonb_build_object(
         'currentStreak', v_new,
         'longestStreak', v_new_longest,
         'lastActiveDate', v_today_text,
         'longestStreakDate', v_longest_date,
         'streakShields', v_shields
       );
  -- Preserve shieldedDates untouched: the app owns them, and dropping them
  -- would silently consume shields the user paid attention to earn.
  if not (v_streak ? 'shieldedDates') then
    v_streak := v_streak || jsonb_build_object('shieldedDates', '[]'::jsonb);
  end if;

  v_data := jsonb_set(v_data, '{streak}', v_streak, true);
  v_data := jsonb_set(
    v_data,
    '{metadata,last_updated}',
    to_jsonb(to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    true
  );

  insert into public.gamification_data (user_id, data, updated_at)
       values (p_user_id, v_data::json, now())
  on conflict (user_id) do update
          set data = excluded.data,
              updated_at = excluded.updated_at;

  return v_streak;
end;
$$;

-- Service role only. The web reaches this through /api/progress/streak, which
-- takes the user id from a verified Clerk token - never from the request body.
-- Exposing it to anon or authenticated would let any caller set any user's
-- streak, since the id is just an argument.
revoke all on function public.bump_streak(text, date) from public;
revoke all on function public.bump_streak(text, date) from anon;
revoke all on function public.bump_streak(text, date) from authenticated;
grant execute on function public.bump_streak(text, date) to service_role;

comment on function public.bump_streak(text, date) is
  'Advance a user''s universal streak for one local date. Touches data->streak only. Never subtracts - the app owns resets and shield consumption. Called by /api/progress/streak.';
