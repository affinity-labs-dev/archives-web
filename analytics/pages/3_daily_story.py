"""
Daily Story Flow Dashboard

Streamlit page for visualizing the Archives Daily Story funnel,
streak engagement, and answering the key analysis questions from
the AFF-844 spec.

Events reference:
    daily_story_viewed      — Today tab loads story card
    daily_story_card_viewed  — Card opened (WATCH / EXPLORE / QUESTIONS)
    daily_story_started     — User taps START MY DAY
    daily_story_completed   — Full story finished (all 3 sections)
    daily_story_dismissed   — User leaves before completing
    daily_story_media_played — Video or audio played
    daily_story_rewind_tapped — Past date tapped on calendar
    daily_story_rewind_blocked — Non-subscriber blocked at paywall
    quiz_started / quiz_completed — Quiz within daily story
    daily_story_streak_incremented — Streak counter bumped
    $pageview               — Screen-level page views
"""

import os
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

# ── Path setup so `from data.posthog import ...` works ───────────────
_analytics_dir = str(Path(__file__).resolve().parent.parent)
if _analytics_dir not in sys.path:
    sys.path.insert(0, _analytics_dir)

from data.posthog import (  # noqa: E402
    CARD_CSS,
    hogql_query,
    setup_sidebar,
    render_funnel,
    safe_pct,
    get_unique_users,
    get_event_count,
    get_avg_property,
    get_median_property,
    get_daily_trend,
    get_property_breakdown,
    get_avg_seconds_between,
)

# ── Page config ──────────────────────────────────────────────────────
st.set_page_config(
    page_title="Daily Story \u2014 Archives Analytics",
    layout="wide",
    initial_sidebar_state="expanded",
)
st.markdown(CARD_CSS, unsafe_allow_html=True)

# ── Sidebar ──────────────────────────────────────────────────────────
date_from, date_to, refresh = setup_sidebar("Daily Story", spec_ref="AFF-844")

if refresh:
    st.cache_data.clear()

# ── Header ───────────────────────────────────────────────────────────
st.title("Daily Story Flow")
st.caption(f"PostHog data from {date_from} to {date_to}")

# =====================================================================
# 1. TOP KPI ROW
# =====================================================================
st.markdown("## Key Metrics")

try:
    stories_started = get_event_count(
        "daily_story_started", date_from, date_to,
    )
    stories_completed = get_event_count(
        "daily_story_completed", date_from, date_to,
    )
    users_started = get_unique_users(
        "daily_story_started", date_from, date_to,
    )
    users_completed = get_unique_users(
        "daily_story_completed", date_from, date_to,
    )
    avg_time_spent = get_avg_property(
        "daily_story_completed", "time_spent_seconds", date_from, date_to,
    )
    avg_time_fmt = (
        f"{avg_time_spent / 60:.1f} min" if avg_time_spent else "\u2014"
    )
    completion_rate = safe_pct(users_completed, users_started)

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Stories Started", f"{stories_started:,}", f"{users_started:,} users")
    k2.metric("Stories Completed", f"{stories_completed:,}", f"{users_completed:,} users")
    k3.metric("Completion Rate", completion_rate)
    k4.metric("Avg Time (completed)", avg_time_fmt)
except Exception as e:
    st.error(f"Error loading KPIs: {e}")

st.divider()

# =====================================================================
# 2. DAILY STORY FUNNEL
# =====================================================================
st.markdown("## Daily Story Funnel")
st.caption(
    "Today Tab Opened \u2192 Story Viewed \u2192 START MY DAY \u2192 "
    "WATCH \u2192 EXPLORE \u2192 QUESTIONS \u2192 Story Completed"
)

try:
    # Node 1 — Today Tab Opened ($pageview with screen = today)
    today_tab_rows = hogql_query(f"""
        SELECT count(DISTINCT distinct_id) as cnt
        FROM events
        WHERE event = '$pageview'
          AND properties.$screen_name = 'today'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """)
    today_tab = today_tab_rows[0]["cnt"] if today_tab_rows else 0

    # Node 1b — daily_story_viewed (story card loaded)
    story_viewed = get_unique_users("daily_story_viewed", date_from, date_to)

    # Node 4 — START MY DAY tapped (daily_story_started)
    start_my_day = get_unique_users("daily_story_started", date_from, date_to)

    # Node 5 — WATCH section (card_index = 1 i.e. video card)
    watch_rows = hogql_query(f"""
        SELECT count(DISTINCT distinct_id) as cnt
        FROM events
        WHERE event = 'daily_story_card_viewed'
          AND toString(properties.card_index) = '1'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """)
    watch_users = watch_rows[0]["cnt"] if watch_rows else 0

    # Node 7 — EXPLORE section (card_index = 2)
    explore_rows = hogql_query(f"""
        SELECT count(DISTINCT distinct_id) as cnt
        FROM events
        WHERE event = 'daily_story_card_viewed'
          AND toString(properties.card_index) = '2'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """)
    explore_users = explore_rows[0]["cnt"] if explore_rows else 0

    # Node 8 — QUESTIONS / Quiz (card_index = 3)
    quiz_rows = hogql_query(f"""
        SELECT count(DISTINCT distinct_id) as cnt
        FROM events
        WHERE event = 'daily_story_card_viewed'
          AND toString(properties.card_index) = '3'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """)
    quiz_users = quiz_rows[0]["cnt"] if quiz_rows else 0

    # Node 10 — Story Completed
    completed_users = get_unique_users("daily_story_completed", date_from, date_to)

    funnel_steps = [
        ("Today Tab Opened", today_tab),
        ("Story Viewed", story_viewed),
        ("START MY DAY Tapped", start_my_day),
        ("WATCH (Video)", watch_users),
        ("EXPLORE (Reading)", explore_users),
        ("QUESTIONS (Quiz)", quiz_users),
        ("Story Completed", completed_users),
    ]

    render_funnel(funnel_steps, title="Full Flow Funnel")

    # End-to-end conversion
    if today_tab > 0 and completed_users > 0:
        e2e = round(completed_users / today_tab * 100, 1)
        st.success(
            f"**Today Tab \u2192 Story Completed:** {e2e}% "
            f"({completed_users:,} / {today_tab:,})"
        )
    else:
        st.info("Not enough data to calculate end-to-end conversion.")

except Exception as e:
    st.error(f"Error loading funnel: {e}")

st.divider()

# =====================================================================
# 3. STREAK SECTION
# =====================================================================
st.markdown("## Streak Engagement")

try:
    col_s1, col_s2, col_s3 = st.columns(3)

    # Average current streak
    avg_streak = get_avg_property(
        "daily_story_streak_incremented", "current_streak", date_from, date_to,
    )
    col_s1.metric(
        "Avg Current Streak",
        f"{avg_streak:.1f} days" if avg_streak else "\u2014",
    )

    # Median streak
    med_streak = get_median_property(
        "daily_story_streak_incremented", "current_streak", date_from, date_to,
    )
    col_s2.metric(
        "Median Streak",
        f"{med_streak:.0f} days" if med_streak else "\u2014",
    )

    # Users with streak events
    streak_users = get_unique_users(
        "daily_story_streak_incremented", date_from, date_to,
    )
    col_s3.metric("Users with Streak Activity", f"{streak_users:,}")

    # Streak distribution (buckets)
    st.markdown("#### Streak Distribution")
    streak_dist_rows = hogql_query(f"""
        SELECT
            multiIf(
                toInt(properties.current_streak) = 1, '1 day',
                toInt(properties.current_streak) <= 3, '2-3 days',
                toInt(properties.current_streak) <= 7, '4-7 days',
                toInt(properties.current_streak) <= 14, '8-14 days',
                toInt(properties.current_streak) <= 30, '15-30 days',
                '30+ days'
            ) as bucket,
            count(DISTINCT distinct_id) as users
        FROM events
        WHERE event = 'daily_story_streak_incremented'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
        GROUP BY bucket
        ORDER BY
            multiIf(
                bucket = '1 day', 1,
                bucket = '2-3 days', 2,
                bucket = '4-7 days', 3,
                bucket = '8-14 days', 4,
                bucket = '15-30 days', 5,
                6
            )
    """)
    if streak_dist_rows:
        df_streak = pd.DataFrame(streak_dist_rows)
        st.bar_chart(df_streak.set_index("bucket")["users"], use_container_width=True)
    else:
        st.info("No streak data available yet.")

except Exception as e:
    st.error(f"Error loading streak data: {e}")

st.divider()

# =====================================================================
# 4. ENGAGEMENT METRICS
# =====================================================================
st.markdown("## Engagement Metrics")

try:
    e1, e2, e3, e4 = st.columns(4)

    # Dismiss rate (intentional only: completed = false AND time > 5s)
    dismissed_intentional_rows = hogql_query(f"""
        SELECT count(DISTINCT distinct_id) as cnt
        FROM events
        WHERE event = 'daily_story_dismissed'
          AND toString(properties.completed) = 'false'
          AND toFloat(properties.time_spent_seconds) > 5
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """)
    dismissed_intentional = (
        dismissed_intentional_rows[0]["cnt"] if dismissed_intentional_rows else 0
    )
    dismiss_rate = safe_pct(dismissed_intentional, users_started) if users_started else "\u2014"
    e1.metric("Intentional Dismiss Rate", dismiss_rate, f"{dismissed_intentional:,} users")

    # Replay rate (daily_story_started with is_replay = true)
    replay_rows = hogql_query(f"""
        SELECT count(DISTINCT distinct_id) as cnt
        FROM events
        WHERE event = 'daily_story_started'
          AND (toString(properties.is_replay) = 'true'
               OR properties.is_replay = true)
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """)
    replay_users = replay_rows[0]["cnt"] if replay_rows else 0
    e2.metric("Replay Users", f"{replay_users:,}", safe_pct(replay_users, users_started))

    # Avg time spent (dismissed users)
    avg_dismiss_time = get_avg_property(
        "daily_story_dismissed", "time_spent_seconds", date_from, date_to,
        extra_where="toString(properties.completed) = 'false' AND toFloat(properties.time_spent_seconds) > 5",
    )
    e3.metric(
        "Avg Time (dismissed)",
        f"{avg_dismiss_time:.0f}s" if avg_dismiss_time else "\u2014",
    )

    # Media plays
    media_plays = get_event_count("daily_story_media_played", date_from, date_to)
    e4.metric("Media Plays", f"{media_plays:,}")

    # ── Time spent distribution ──────────────────────────────────────
    st.markdown("#### Time Spent Distribution (completed stories)")
    time_dist_rows = hogql_query(f"""
        SELECT
            multiIf(
                toFloat(properties.time_spent_seconds) < 30, '<30s',
                toFloat(properties.time_spent_seconds) < 60, '30-60s',
                toFloat(properties.time_spent_seconds) < 120, '1-2 min',
                toFloat(properties.time_spent_seconds) < 300, '2-5 min',
                toFloat(properties.time_spent_seconds) < 600, '5-10 min',
                '10+ min'
            ) as bucket,
            count() as cnt
        FROM events
        WHERE event = 'daily_story_completed'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
        GROUP BY bucket
        ORDER BY
            multiIf(
                bucket = '<30s', 1,
                bucket = '30-60s', 2,
                bucket = '1-2 min', 3,
                bucket = '2-5 min', 4,
                bucket = '5-10 min', 5,
                6
            )
    """)
    if time_dist_rows:
        df_time = pd.DataFrame(time_dist_rows)
        st.bar_chart(df_time.set_index("bucket")["cnt"], use_container_width=True)
    else:
        st.info("No time distribution data available.")

except Exception as e:
    st.error(f"Error loading engagement metrics: {e}")

st.divider()

# =====================================================================
# 5. REWIND & PAYWALL
# =====================================================================
st.markdown("## Rewind & Paywall")

try:
    r1, r2, r3 = st.columns(3)

    rewind_tapped = get_unique_users("daily_story_rewind_tapped", date_from, date_to)
    r1.metric("Rewind Tapped", f"{rewind_tapped:,}")

    rewind_blocked = get_unique_users("daily_story_rewind_blocked", date_from, date_to)
    r2.metric("Rewind Blocked (non-sub)", f"{rewind_blocked:,}")

    # Paywall shown via subscribe_screen_viewed with trigger = daily_story_rewind
    paywall_rows = hogql_query(f"""
        SELECT count(DISTINCT distinct_id) as cnt
        FROM events
        WHERE event = 'subscribe_screen_viewed'
          AND properties.trigger = 'daily_story_rewind'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """)
    paywall_shown = paywall_rows[0]["cnt"] if paywall_rows else 0
    r3.metric("Paywall Shown", f"{paywall_shown:,}")

    # Subscription conversions from rewind paywall
    r4, r5, r6 = st.columns(3)

    purchase_rows = hogql_query(f"""
        SELECT count(DISTINCT distinct_id) as cnt
        FROM events
        WHERE event = 'subscribe_purchase_completed'
          AND properties.trigger = 'daily_story_rewind'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """)
    purchase_count = purchase_rows[0]["cnt"] if purchase_rows else 0
    r4.metric(
        "Rewind Purchases",
        f"{purchase_count:,}",
        safe_pct(purchase_count, paywall_shown) + " conversion" if paywall_shown else None,
    )

    cancel_rows = hogql_query(f"""
        SELECT count(DISTINCT distinct_id) as cnt
        FROM events
        WHERE event = 'subscribe_purchase_cancelled'
          AND properties.trigger = 'daily_story_rewind'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """)
    cancel_count = cancel_rows[0]["cnt"] if cancel_rows else 0
    r5.metric("Paywall Cancelled", f"{cancel_count:,}")

    restore_rows = hogql_query(f"""
        SELECT count(DISTINCT distinct_id) as cnt
        FROM events
        WHERE event = 'subscribe_restore_success'
          AND properties.trigger = 'daily_story_rewind'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """)
    restore_count = restore_rows[0]["cnt"] if restore_rows else 0
    r6.metric("Restore Success", f"{restore_count:,}")

except Exception as e:
    st.error(f"Error loading rewind/paywall data: {e}")

st.divider()

# =====================================================================
# 6. DAILY TREND
# =====================================================================
st.markdown("## Daily Trend")

try:
    tab_viewed, tab_started, tab_completed = st.tabs(
        ["Stories Viewed", "Stories Started", "Stories Completed"]
    )

    with tab_viewed:
        df_viewed = get_daily_trend("daily_story_viewed", date_from, date_to)
        if not df_viewed.empty:
            st.line_chart(df_viewed.set_index("day")["users"], use_container_width=True)
        else:
            st.info("No data for story views.")

    with tab_started:
        df_started = get_daily_trend("daily_story_started", date_from, date_to)
        if not df_started.empty:
            st.line_chart(df_started.set_index("day")["users"], use_container_width=True)
        else:
            st.info("No data for stories started.")

    with tab_completed:
        df_completed = get_daily_trend("daily_story_completed", date_from, date_to)
        if not df_completed.empty:
            st.line_chart(df_completed.set_index("day")["users"], use_container_width=True)
        else:
            st.info("No data for stories completed.")

except Exception as e:
    st.error(f"Error loading daily trend: {e}")

st.divider()

# =====================================================================
# 7. QUIZ PERFORMANCE
# =====================================================================
st.markdown("## Quiz Performance (Daily Story)")

try:
    q1, q2, q3 = st.columns(3)

    quiz_started = get_unique_users(
        "quiz_started", date_from, date_to,
        extra_where="properties.adventureId = 'daily_quest'",
    )
    q1.metric("Quiz Started", f"{quiz_started:,}")

    quiz_completed_cnt = get_unique_users(
        "quiz_completed", date_from, date_to,
        extra_where="properties.adventureId = 'daily_quest'",
    )
    q2.metric("Quiz Completed", f"{quiz_completed_cnt:,}")

    avg_score = get_avg_property(
        "quiz_completed", "correct_answers", date_from, date_to,
        extra_where="properties.adventureId = 'daily_quest'",
    )
    q3.metric(
        "Avg Correct Answers",
        f"{avg_score:.1f}" if avg_score else "\u2014",
    )

    # Score distribution
    st.markdown("#### Score Distribution")
    score_dist = hogql_query(f"""
        SELECT
            toString(toInt(properties.correct_answers)) as correct,
            count() as cnt
        FROM events
        WHERE event = 'quiz_completed'
          AND properties.adventureId = 'daily_quest'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
        GROUP BY correct
        ORDER BY correct
    """)
    if score_dist:
        df_score = pd.DataFrame(score_dist)
        st.bar_chart(
            df_score.set_index("correct")["cnt"],
            use_container_width=True,
        )
    else:
        st.info("No quiz score data available.")

except Exception as e:
    st.error(f"Error loading quiz data: {e}")

st.divider()

# =====================================================================
# 8. SECTION DROP-OFF ANALYSIS
# =====================================================================
st.markdown("## Section Drop-Off Analysis")

try:
    # Cards seen breakdown from daily_story_dismissed
    cards_seen_rows = hogql_query(f"""
        SELECT
            toString(properties.cards_seen) as cards_seen,
            count(DISTINCT distinct_id) as users
        FROM events
        WHERE event = 'daily_story_dismissed'
          AND toString(properties.completed) = 'false'
          AND toFloat(properties.time_spent_seconds) > 5
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
        GROUP BY cards_seen
        ORDER BY cards_seen
    """)
    if cards_seen_rows:
        st.markdown("#### Cards Seen Before Dismissal")
        df_cards = pd.DataFrame(cards_seen_rows)
        st.bar_chart(
            df_cards.set_index("cards_seen")["users"],
            use_container_width=True,
        )
    else:
        st.info("No drop-off data available.")

    # Scroll depth at dismissal
    avg_scroll = hogql_query(f"""
        SELECT avg(toFloat(properties.scroll_depth_pct)) as avg_scroll
        FROM events
        WHERE event = 'daily_story_dismissed'
          AND toString(properties.completed) = 'false'
          AND toFloat(properties.time_spent_seconds) > 5
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """)
    if avg_scroll and avg_scroll[0]["avg_scroll"] is not None:
        scroll_val = float(avg_scroll[0]["avg_scroll"])
        st.metric(
            "Avg Scroll Depth at Dismissal",
            f"{scroll_val:.0f}%",
        )

except Exception as e:
    st.error(f"Error loading drop-off analysis: {e}")

st.divider()

# =====================================================================
# 9. ANALYSIS QUESTIONS (from spec)
# =====================================================================
st.markdown("## Analysis Questions")
st.caption("Key product questions from the AFF-844 Daily Story spec")

try:
    # ── Strategic Questions ──────────────────────────────────────────
    with st.expander("Strategic Questions", expanded=True):

        # Q1: How many users open the Today tab each day?
        st.markdown("**Q1. How many users open the Today tab each day?**")
        df_today_tab = get_daily_trend(
            "$pageview", date_from, date_to,
            extra_where="properties.$screen_name = 'today'",
        )
        if not df_today_tab.empty:
            avg_daily = df_today_tab["users"].mean()
            st.metric("Avg Daily Today Tab Users", f"{avg_daily:.0f}")
            st.line_chart(df_today_tab.set_index("day")["users"], use_container_width=True)
        else:
            st.info("No Today tab page view data.")

        st.markdown("---")

        # Q2: How many users who open the Today tab tap START MY DAY?
        st.markdown("**Q2. How many users who open the Today tab tap START MY DAY?**")
        st.metric(
            "Today Tab \u2192 START MY DAY",
            safe_pct(start_my_day, today_tab),
            f"{start_my_day:,} of {today_tab:,} users",
        )

        st.markdown("---")

        # Q3: How many users complete the full daily story?
        st.markdown("**Q3. How many users complete the full daily story (all 3 sections)?**")
        st.metric(
            "Full Completion",
            f"{completed_users:,} users",
            safe_pct(completed_users, start_my_day) + " of starters",
        )

        st.markdown("---")

        # Q4: Drop off after WATCH without continuing to EXPLORE
        st.markdown("**Q4. How many users drop off after WATCH without continuing to EXPLORE?**")
        watch_only = max(watch_users - explore_users, 0)
        st.metric(
            "WATCH Drop-off",
            f"{watch_only:,} users",
            safe_pct(watch_only, watch_users) + " of WATCH viewers",
        )

        st.markdown("---")

        # Q5: Drop off after EXPLORE without starting QUESTIONS
        st.markdown("**Q5. How many users drop off after EXPLORE without starting QUESTIONS?**")
        explore_only = max(explore_users - quiz_users, 0)
        st.metric(
            "EXPLORE Drop-off",
            f"{explore_only:,} users",
            safe_pct(explore_only, explore_users) + " of EXPLORE viewers",
        )

        st.markdown("---")

        # Q6: How many users return to a completed story and replay it?
        st.markdown("**Q6. How many users return to a completed story and replay it?**")
        st.metric("Replay Users", f"{replay_users:,}")

        st.markdown("---")

        # Q7: How many users tap a past date on the calendar (rewind)?
        st.markdown("**Q7. How many users tap a past date on the calendar (rewind)?**")
        st.metric("Rewind Tapped", f"{rewind_tapped:,}")

        st.markdown("---")

        # Q8: How many non-subscribers hit the rewind paywall?
        st.markdown("**Q8. How many non-subscribers hit the rewind paywall?**")
        st.metric("Rewind Blocked", f"{rewind_blocked:,}")

        st.markdown("---")

        # Q9: How many purchase through the daily story rewind paywall?
        st.markdown("**Q9. How many purchase a subscription through the daily story rewind paywall?**")
        st.metric(
            "Rewind Paywall Purchases",
            f"{purchase_count:,}",
            safe_pct(purchase_count, paywall_shown) + " paywall conversion" if paywall_shown else None,
        )

    # ── Behavioral Insights ──────────────────────────────────────────
    with st.expander("Behavioral Insights", expanded=False):

        # B1: Reading sheet expansions during WATCH
        st.markdown("**B1. How many users expand the reading sheet during WATCH?**")
        reading_expanded = get_unique_users(
            "daily_story_reading_expanded", date_from, date_to,
        )
        st.metric("Reading Sheet Expanded", f"{reading_expanded:,}")

        st.markdown("---")

        # B2: Inner voice audio during EXPLORE
        st.markdown("**B2. How many users play the inner voice audio during EXPLORE?**")
        audio_rows = hogql_query(f"""
            SELECT count(DISTINCT distinct_id) as cnt
            FROM events
            WHERE event = 'daily_story_media_played'
              AND properties.media_type = 'audio'
              AND timestamp >= '{date_from}'
              AND timestamp < '{date_to}'
        """)
        audio_users = audio_rows[0]["cnt"] if audio_rows else 0
        st.metric("Audio Played", f"{audio_users:,}")

        st.markdown("---")

        # B4 & B5: Dismiss from WATCH vs EXPLORE
        st.markdown("**B4/B5. How many users dismiss the story from WATCH vs EXPLORE?**")
        dismiss_by_cards = hogql_query(f"""
            SELECT
                toString(properties.cards_seen) as cards_seen,
                count(DISTINCT distinct_id) as users
            FROM events
            WHERE event = 'daily_story_dismissed'
              AND toString(properties.completed) = 'false'
              AND toFloat(properties.time_spent_seconds) > 5
              AND timestamp >= '{date_from}'
              AND timestamp < '{date_to}'
            GROUP BY cards_seen
            ORDER BY cards_seen
        """)
        if dismiss_by_cards:
            for row in dismiss_by_cards:
                st.write(f"Cards seen: {row['cards_seen']} \u2014 {row['users']:,} users")
        else:
            st.info("No dismiss data by section.")

        st.markdown("---")

        # B6: Card swipes on home deck
        st.markdown("**B6. How many users swipe between cards on the home deck before starting?**")
        card_swipe_users = get_unique_users(
            "daily_story_card_swiped", date_from, date_to,
        )
        st.metric("Card Swipers", f"{card_swipe_users:,}")

        st.markdown("---")

        # B7 & B8: Celebration screen viewed / dismissed early
        st.markdown("**B7/B8. How many users view the celebration screen vs close it early?**")
        celeb_shown = get_unique_users(
            "daily_story_celebration_shown", date_from, date_to,
        )
        celeb_dismissed_rows = hogql_query(f"""
            SELECT
                toString(properties.dismiss_method) as method,
                count(DISTINCT distinct_id) as users
            FROM events
            WHERE event = 'daily_story_celebration_dismissed'
              AND timestamp >= '{date_from}'
              AND timestamp < '{date_to}'
            GROUP BY method
        """)
        st.metric("Celebration Shown", f"{celeb_shown:,}")
        if celeb_dismissed_rows:
            for row in celeb_dismissed_rows:
                st.write(f"Dismiss method: {row['method']} \u2014 {row['users']:,} users")

        st.markdown("---")

        # B9: How long do users who complete the story spend on it?
        st.markdown("**B9. How long do users who complete the story spend on it?**")
        median_complete_time = get_median_property(
            "daily_story_completed", "time_spent_seconds", date_from, date_to,
        )
        st.metric(
            "Median Time (completed)",
            f"{median_complete_time / 60:.1f} min" if median_complete_time else "\u2014",
        )

        st.markdown("---")

        # B10: How long do users who abandon the story spend before leaving?
        st.markdown("**B10. How long do users who abandon the story spend before leaving?**")
        median_dismiss_time = get_median_property(
            "daily_story_dismissed", "time_spent_seconds", date_from, date_to,
            extra_where="toString(properties.completed) = 'false' AND toFloat(properties.time_spent_seconds) > 5",
        )
        st.metric(
            "Median Time (abandoned)",
            f"{median_dismiss_time:.0f}s" if median_dismiss_time else "\u2014",
        )

        st.markdown("---")

        # B11: How many users have their video fail to load?
        st.markdown("**B11. How many users have their video fail to load?**")
        video_fail_rows = hogql_query(f"""
            SELECT count(DISTINCT distinct_id) as cnt
            FROM events
            WHERE event = 'video_load_attempted'
              AND timestamp >= '{date_from}'
              AND timestamp < '{date_to}'
        """)
        video_attempted = video_fail_rows[0]["cnt"] if video_fail_rows else 0
        # Cross-ref with video_load_time to find users who attempted but never loaded
        st.metric("Video Load Attempted", f"{video_attempted:,} users")

        avg_load_time_rows = hogql_query(f"""
            SELECT avg(toFloat(properties.load_time_ms)) as avg_ms
            FROM events
            WHERE event = 'video_load_time'
              AND timestamp >= '{date_from}'
              AND timestamp < '{date_to}'
        """)
        if avg_load_time_rows and avg_load_time_rows[0]["avg_ms"] is not None:
            avg_load = float(avg_load_time_rows[0]["avg_ms"])
            st.metric("Avg Video Load Time", f"{avg_load:.0f} ms")

    # ── Checkpoint Validation ────────────────────────────────────────
    with st.expander("Checkpoint Validation", expanded=False):
        st.markdown(
            "Verifying that key checkpoints in the daily story flow "
            "are firing correctly."
        )

        checkpoints = [
            ("Today Tab Opened", "$pageview", "properties.$screen_name = 'today'"),
            ("START MY DAY Tapped", "daily_story_started", ""),
            ("WATCH (Video)", "daily_story_card_viewed", "toString(properties.card_index) = '1'"),
            ("EXPLORE (Reading)", "daily_story_card_viewed", "toString(properties.card_index) = '2'"),
            ("QUESTIONS (Quiz)", "daily_story_card_viewed", "toString(properties.card_index) = '3'"),
            ("Story Completed", "daily_story_completed", ""),
        ]

        for label, event, extra in checkpoints:
            users = get_unique_users(event, date_from, date_to, extra_where=extra)
            events_total = get_event_count(event, date_from, date_to, extra_where=extra)
            st.write(
                f"**{label}** \u2014 {users:,} unique users, "
                f"{events_total:,} total events"
            )

except Exception as e:
    st.error(f"Error loading analysis questions: {e}")

# ── Footer ───────────────────────────────────────────────────────────
st.divider()
st.caption(
    "Daily Story Flow Dashboard \u00b7 AFF-844 \u00b7 "
    "Archives Analytics \u00b7 PostHog Project 93650"
)
