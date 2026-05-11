"""
Learn Flow Dashboard

Streamlit page for visualizing the Learn funnel in the Archives app.
Maps all events and analysis questions from the Learn Flow Spec (AFF-844).

Run:
    cd analytics && streamlit run app.py
"""

import os
import sys

import pandas as pd
import streamlit as st

# Allow imports from the analytics package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data.posthog import (
    CARD_CSS,
    hogql_query,
    get_unique_users,
    get_event_count,
    get_property_breakdown,
    get_avg_property,
    get_median_property,
    get_daily_trend,
    render_funnel,
    setup_sidebar,
    safe_pct,
    safe_delta,
)

# ── Page config ─────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Learn -- Archives Analytics",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(CARD_CSS, unsafe_allow_html=True)

# ── Sidebar ─────────────────────────────────────────────────────────────

date_from, date_to, refresh = setup_sidebar("Learn Funnel", spec_ref="AFF-844")

# ── Cached query helpers ────────────────────────────────────────────────


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_lesson_funnel_counts(date_from: str, date_to: str) -> dict:
    """Counts for each step in the lesson funnel."""
    q = f"""
        SELECT
            countDistinctIf(distinct_id, event = 'lesson_started') as started,
            countDistinctIf(distinct_id, event = 'video_played') as video_played,
            countDistinctIf(distinct_id, event = 'video_completed') as video_completed,
            countDistinctIf(distinct_id, event = 'reading_card_expanded') as reading_expanded,
            countDistinctIf(distinct_id, event = 'lesson_completed') as completed
        FROM events
        WHERE event IN (
            'lesson_started', 'video_played', 'video_completed',
            'reading_card_expanded', 'lesson_completed'
        )
          AND timestamp >= '{date_from}' AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return {
            "started": rows[0].get("started", 0),
            "video_played": rows[0].get("video_played", 0),
            "video_completed": rows[0].get("video_completed", 0),
            "reading_expanded": rows[0].get("reading_expanded", 0),
            "completed": rows[0].get("completed", 0),
        }
    return {
        "started": 0, "video_played": 0, "video_completed": 0,
        "reading_expanded": 0, "completed": 0,
    }


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_quiz_summary(date_from: str, date_to: str) -> dict:
    """Quiz KPIs: started, completed, avg score, star distribution."""
    q = f"""
        SELECT
            countDistinctIf(distinct_id, event = 'quiz_started') as started,
            countDistinctIf(distinct_id, event = 'quiz_completed') as completed,
            avgIf(toFloat(properties.quiz_score), event = 'quiz_completed') as avg_score,
            avgIf(toFloat(properties.correct_answers), event = 'quiz_completed') as avg_correct,
            avgIf(toFloat(properties.time_spent_seconds), event = 'quiz_completed') as avg_time,
            countDistinctIf(distinct_id, event = 'quiz_completed'
                AND toInt(properties.star_rating) = 1) as star_1,
            countDistinctIf(distinct_id, event = 'quiz_completed'
                AND toInt(properties.star_rating) = 2) as star_2,
            countDistinctIf(distinct_id, event = 'quiz_completed'
                AND toInt(properties.star_rating) = 3) as star_3
        FROM events
        WHERE event IN ('quiz_started', 'quiz_completed')
          AND timestamp >= '{date_from}' AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return {
            "started": rows[0].get("started", 0),
            "completed": rows[0].get("completed", 0),
            "avg_score": rows[0].get("avg_score"),
            "avg_correct": rows[0].get("avg_correct"),
            "avg_time": rows[0].get("avg_time"),
            "star_1": rows[0].get("star_1", 0),
            "star_2": rows[0].get("star_2", 0),
            "star_3": rows[0].get("star_3", 0),
        }
    return {
        "started": 0, "completed": 0, "avg_score": None,
        "avg_correct": None, "avg_time": None,
        "star_1": 0, "star_2": 0, "star_3": 0,
    }


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_lesson_type_breakdown(date_from: str, date_to: str) -> list[dict]:
    """Lesson started & completed counts by lesson_type."""
    q = f"""
        SELECT
            toString(properties.lesson_type) as lesson_type,
            countIf(event = 'lesson_started') as started,
            countIf(event = 'lesson_completed') as completed,
            count(DISTINCT distinct_id) as users,
            avgIf(toFloat(properties.time_spent_seconds),
                  event = 'lesson_completed') as avg_time
        FROM events
        WHERE event IN ('lesson_started', 'lesson_completed')
          AND timestamp >= '{date_from}' AND timestamp < '{date_to}'
        GROUP BY lesson_type
        ORDER BY started DESC
    """
    return hogql_query(q)


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_era_breakdown(date_from: str, date_to: str) -> list[dict]:
    """Lesson and quiz counts broken down by era."""
    q = f"""
        SELECT
            toString(properties.era_name) as era_name,
            countDistinctIf(distinct_id, event = 'lesson_started') as lessons_started,
            countDistinctIf(distinct_id, event = 'lesson_completed') as lessons_completed,
            countDistinctIf(distinct_id, event = 'quiz_started') as quizzes_started,
            countDistinctIf(distinct_id, event = 'quiz_completed') as quizzes_completed,
            countDistinctIf(distinct_id, event = 'module_completed') as modules_completed
        FROM events
        WHERE event IN (
            'lesson_started', 'lesson_completed',
            'quiz_started', 'quiz_completed', 'module_completed'
        )
          AND timestamp >= '{date_from}' AND timestamp < '{date_to}'
        GROUP BY era_name
        ORDER BY lessons_started DESC
    """
    return hogql_query(q)


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_adventure_breakdown(date_from: str, date_to: str) -> list[dict]:
    """Module and lesson counts broken down by adventure_id."""
    q = f"""
        SELECT
            toString(properties.adventure_id) as adventure_id,
            countDistinctIf(distinct_id, event = 'lesson_started') as lessons_started,
            countDistinctIf(distinct_id, event = 'lesson_completed') as lessons_completed,
            countDistinctIf(distinct_id, event = 'module_completed') as modules_completed
        FROM events
        WHERE event IN ('lesson_started', 'lesson_completed', 'module_completed')
          AND timestamp >= '{date_from}' AND timestamp < '{date_to}'
        GROUP BY adventure_id
        ORDER BY lessons_started DESC
    """
    return hogql_query(q)


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_full_learn_funnel(date_from: str, date_to: str) -> dict:
    """Full learn flow funnel from Eras Tab to Era Completed."""
    q = f"""
        SELECT
            countDistinctIf(distinct_id,
                event = 'page_view' AND properties.page_name = 'era_selection_onboarding'
            ) as eras_tab,
            countDistinctIf(distinct_id, event = 'era_selected') as era_selected,
            countDistinctIf(distinct_id, event = 'era_started') as era_started,
            countDistinctIf(distinct_id, event = 'adventure_started') as adventure_opened,
            countDistinctIf(distinct_id, event = 'module_started') as module_tapped,
            countDistinctIf(distinct_id, event = 'lesson_started') as lesson_started,
            countDistinctIf(distinct_id, event = 'lesson_completed') as lesson_completed,
            countDistinctIf(distinct_id, event = 'quiz_started') as quiz_started,
            countDistinctIf(distinct_id, event = 'quiz_completed') as quiz_completed,
            countDistinctIf(distinct_id, event = 'module_completed') as module_completed,
            countDistinctIf(distinct_id,
                event = 'adventure_complete_continue'
            ) as adventure_completed,
            countDistinctIf(distinct_id, event = 'era_completed') as era_completed
        FROM events
        WHERE event IN (
            'page_view', 'era_selected', 'era_started', 'adventure_started',
            'module_started', 'lesson_started', 'lesson_completed',
            'quiz_started', 'quiz_completed', 'module_completed',
            'adventure_complete_continue', 'era_completed'
        )
          AND timestamp >= '{date_from}' AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return rows[0]
    return {}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_quiz_first_attempt_vs_retake(date_from: str, date_to: str) -> dict:
    """Users who completed quiz on first attempt vs retake."""
    q = f"""
        SELECT
            countDistinctIf(distinct_id,
                event = 'quiz_completed' AND toString(properties.is_retake) != 'true'
            ) as first_attempt,
            countDistinctIf(distinct_id,
                event = 'quiz_completed' AND toString(properties.is_retake) = 'true'
            ) as retake,
            countDistinctIf(distinct_id, event = 'quiz_retake') as retake_initiated
        FROM events
        WHERE event IN ('quiz_completed', 'quiz_retake')
          AND timestamp >= '{date_from}' AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return {
            "first_attempt": rows[0].get("first_attempt", 0),
            "retake": rows[0].get("retake", 0),
            "retake_initiated": rows[0].get("retake_initiated", 0),
        }
    return {"first_attempt": 0, "retake": 0, "retake_initiated": 0}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_quiz_score_distribution(date_from: str, date_to: str) -> dict:
    """Users by quiz score bucket: 100%, 40-80%, below 40%."""
    q = f"""
        SELECT
            countDistinctIf(distinct_id,
                toInt(properties.correct_answers) = toInt(properties.total_questions)
            ) as perfect,
            countDistinctIf(distinct_id,
                toFloat(properties.correct_answers) / toFloat(properties.total_questions) >= 0.4
                AND toFloat(properties.correct_answers) / toFloat(properties.total_questions) < 1.0
            ) as mid_range,
            countDistinctIf(distinct_id,
                toFloat(properties.correct_answers) / toFloat(properties.total_questions) < 0.4
            ) as low
        FROM events
        WHERE event = 'quiz_completed'
          AND timestamp >= '{date_from}' AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return {
            "perfect": rows[0].get("perfect", 0),
            "mid_range": rows[0].get("mid_range", 0),
            "low": rows[0].get("low", 0),
        }
    return {"perfect": 0, "mid_range": 0, "low": 0}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_video_buffering_stats(date_from: str, date_to: str) -> dict:
    """Users who experience buffering, and those with >3s buffer."""
    q = f"""
        SELECT
            count(DISTINCT distinct_id) as total_users,
            countIf(toFloat(properties.buffer_time_ms) > 3000) as long_buffer_events,
            count(DISTINCT
                if(toFloat(properties.buffer_time_ms) > 3000, distinct_id, NULL)
            ) as long_buffer_users,
            avg(toFloat(properties.buffer_time_ms)) as avg_buffer_ms
        FROM events
        WHERE event = 'video_buffering'
          AND timestamp >= '{date_from}' AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return {
            "total_users": rows[0].get("total_users", 0),
            "long_buffer_events": rows[0].get("long_buffer_events", 0),
            "long_buffer_users": rows[0].get("long_buffer_users", 0),
            "avg_buffer_ms": rows[0].get("avg_buffer_ms"),
        }
    return {
        "total_users": 0, "long_buffer_events": 0,
        "long_buffer_users": 0, "avg_buffer_ms": None,
    }


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_quiz_results_actions(date_from: str, date_to: str) -> dict:
    """Actions taken on the Quiz Results screen."""
    q = f"""
        SELECT
            countDistinctIf(distinct_id, event = 'quiz_results_viewed') as viewed,
            countDistinctIf(distinct_id, event = 'quiz_results_continue_tapped') as continued,
            countDistinctIf(distinct_id,
                event = 'quiz_results_chat_to_learn_tapped') as chat_to_learn,
            countDistinctIf(distinct_id, event = 'quiz_retake') as retake,
            countDistinctIf(distinct_id,
                event = 'ai_quiz_explanation_requested') as ai_explanation
        FROM events
        WHERE event IN (
            'quiz_results_viewed', 'quiz_results_continue_tapped',
            'quiz_results_chat_to_learn_tapped', 'quiz_retake',
            'ai_quiz_explanation_requested'
        )
          AND timestamp >= '{date_from}' AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return {
            "viewed": rows[0].get("viewed", 0),
            "continued": rows[0].get("continued", 0),
            "chat_to_learn": rows[0].get("chat_to_learn", 0),
            "retake": rows[0].get("retake", 0),
            "ai_explanation": rows[0].get("ai_explanation", 0),
        }
    return {"viewed": 0, "continued": 0, "chat_to_learn": 0, "retake": 0, "ai_explanation": 0}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_avg_modules_per_user(date_from: str, date_to: str) -> float | None:
    """Average number of modules completed per user."""
    q = f"""
        SELECT avg(modules) as avg_modules
        FROM (
            SELECT distinct_id, count() as modules
            FROM events
            WHERE event = 'module_completed'
              AND timestamp >= '{date_from}' AND timestamp < '{date_to}'
            GROUP BY distinct_id
        )
    """
    rows = hogql_query(q)
    if rows and rows[0].get("avg_modules") is not None:
        return float(rows[0]["avg_modules"])
    return None


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_chat_to_learn_paywall(date_from: str, date_to: str) -> dict:
    """Chat to Learn paywall hits."""
    q = f"""
        SELECT
            countDistinctIf(distinct_id,
                event = 'quiz_results_chat_to_learn_tapped') as tapped,
            countDistinctIf(distinct_id,
                event = 'chat_to_learn_paywall_shown') as paywall_shown
        FROM events
        WHERE event IN ('quiz_results_chat_to_learn_tapped', 'chat_to_learn_paywall_shown')
          AND timestamp >= '{date_from}' AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return {
            "tapped": rows[0].get("tapped", 0),
            "paywall_shown": rows[0].get("paywall_shown", 0),
        }
    return {"tapped": 0, "paywall_shown": 0}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_daily_lesson_trend(date_from: str, date_to: str) -> pd.DataFrame:
    """Daily lesson started and completed counts."""
    q = f"""
        SELECT
            toDate(timestamp) as day,
            countIf(event = 'lesson_started') as started,
            countIf(event = 'lesson_completed') as completed
        FROM events
        WHERE event IN ('lesson_started', 'lesson_completed')
          AND timestamp >= '{date_from}' AND timestamp < '{date_to}'
        GROUP BY day
        ORDER BY day
    """
    rows = hogql_query(q)
    if not rows:
        return pd.DataFrame(columns=["day", "started", "completed"])
    df = pd.DataFrame(rows)
    df["day"] = pd.to_datetime(df["day"])
    return df


# ── Dashboard ───────────────────────────────────────────────────────────

st.title("Learn Funnel")
st.caption(f"Date range: {date_from} to {date_to}")

# ═══════════════════════════════════════════════════════════════════════
# Section 1: Top KPI Row
# ═══════════════════════════════════════════════════════════════════════

st.header("Lesson Overview")

try:
    funnel = get_lesson_funnel_counts(date_from, date_to)
    lessons_started = funnel["started"]
    lessons_completed = funnel["completed"]
    completion_rate = (
        round(lessons_completed / lessons_started * 100, 1)
        if lessons_started > 0 else 0
    )
    avg_time = get_avg_property(
        "lesson_completed", "time_spent_seconds", date_from, date_to
    )

    k1, k2, k3, k4 = st.columns(4)
    with k1:
        st.metric("Lessons Started (users)", f"{lessons_started:,}")
    with k2:
        st.metric("Lessons Completed (users)", f"{lessons_completed:,}")
    with k3:
        st.metric("Completion Rate", f"{completion_rate}%")
    with k4:
        avg_display = f"{avg_time:.0f}s" if avg_time else "-"
        st.metric("Avg Time per Lesson", avg_display)
except Exception as e:
    st.error(f"Failed to load lesson KPIs: {e}")

# ═══════════════════════════════════════════════════════════════════════
# Section 2: Full Learn Flow Funnel (Checkpoint Validation)
# ═══════════════════════════════════════════════════════════════════════

st.markdown("---")
st.header("Learn Flow Funnel")
st.caption(
    "End-to-end user journey: Eras Tab -> Era -> Adventure -> Module "
    "-> Lesson -> Quiz -> Module Complete -> Adventure Complete -> Era Complete"
)

try:
    ff = get_full_learn_funnel(date_from, date_to)
    if ff:
        funnel_steps = [
            ("Eras Tab", ff.get("eras_tab", 0)),
            ("Era Selected", ff.get("era_selected", 0)),
            ("Era View / Adventures", ff.get("era_started", 0)),
            ("Adventure Card Opened", ff.get("adventure_opened", 0)),
            ("Module Tapped", ff.get("module_tapped", 0)),
            ("Lesson Started", ff.get("lesson_started", 0)),
            ("Lesson Completed", ff.get("lesson_completed", 0)),
            ("Quiz Started", ff.get("quiz_started", 0)),
            ("Quiz Completed", ff.get("quiz_completed", 0)),
            ("Module Completed", ff.get("module_completed", 0)),
            ("Adventure Completed", ff.get("adventure_completed", 0)),
            ("Era Completed", ff.get("era_completed", 0)),
        ]
        render_funnel(funnel_steps, title="")

        # Drop-off summary
        if funnel_steps[0][1] > 0:
            biggest_drop_label = ""
            biggest_drop_pct = 0.0
            for i in range(1, len(funnel_steps)):
                prev = funnel_steps[i - 1][1]
                curr = funnel_steps[i][1]
                if prev > 0:
                    drop = (prev - curr) / prev * 100
                    if drop > biggest_drop_pct:
                        biggest_drop_pct = drop
                        biggest_drop_label = (
                            f"{funnel_steps[i-1][0]} -> {funnel_steps[i][0]}"
                        )
            if biggest_drop_label:
                st.info(
                    f"Biggest drop-off: **{biggest_drop_label}** "
                    f"({biggest_drop_pct:.1f}% lost)"
                )
    else:
        st.info("No learn flow events in this date range.")
except Exception as e:
    st.error(f"Failed to load learn funnel: {e}")

# ═══════════════════════════════════════════════════════════════════════
# Section 3: Lesson Funnel (detailed)
# ═══════════════════════════════════════════════════════════════════════

st.markdown("---")
st.header("Lesson Engagement Funnel")
st.caption(
    "Reel lesson path: Started -> Video Played -> Video Completed "
    "-> Reading Expanded -> Lesson Completed"
)

try:
    lesson_steps = [
        ("Lesson Started", funnel["started"]),
        ("Video Played", funnel["video_played"]),
        ("Video Completed", funnel["video_completed"]),
        ("Reading Card Expanded", funnel["reading_expanded"]),
        ("Lesson Completed", funnel["completed"]),
    ]
    render_funnel(lesson_steps, title="")
except Exception as e:
    st.error(f"Failed to load lesson funnel: {e}")

# ═══════════════════════════════════════════════════════════════════════
# Section 4: Daily Trend
# ═══════════════════════════════════════════════════════════════════════

st.markdown("---")
st.header("Daily Lesson Trend")

try:
    trend_df = get_daily_lesson_trend(date_from, date_to)
    if not trend_df.empty:
        st.line_chart(trend_df.set_index("day")[["started", "completed"]])
    else:
        st.info("No lesson events in this date range.")
except Exception as e:
    st.error(f"Failed to load daily trend: {e}")

# ═══════════════════════════════════════════════════════════════════════
# Section 5: Quiz Section
# ═══════════════════════════════════════════════════════════════════════

st.markdown("---")
st.header("Quiz Performance")

try:
    quiz = get_quiz_summary(date_from, date_to)

    q1, q2, q3, q4 = st.columns(4)
    with q1:
        st.metric("Quiz Started (users)", f"{quiz['started']:,}")
    with q2:
        st.metric(
            "Quiz Completed (users)",
            f"{quiz['completed']:,}",
            delta=safe_delta(quiz["completed"], quiz["started"]),
        )
    with q3:
        avg_score = (
            f"{quiz['avg_correct']:.1f}/{5}" if quiz["avg_correct"] else "-"
        )
        st.metric("Avg Correct Answers", avg_score)
    with q4:
        avg_quiz_time = (
            f"{quiz['avg_time']:.0f}s" if quiz["avg_time"] else "-"
        )
        st.metric("Avg Quiz Time", avg_quiz_time)

    # Star distribution
    st.subheader("Star Rating Distribution")
    star_total = quiz["star_1"] + quiz["star_2"] + quiz["star_3"]
    if star_total > 0:
        sc1, sc2, sc3 = st.columns(3)
        with sc1:
            st.metric(
                "1 Star (1-2 correct)",
                f"{quiz['star_1']:,}",
                delta=f"{quiz['star_1'] / star_total * 100:.0f}%",
            )
        with sc2:
            st.metric(
                "2 Stars (3-4 correct)",
                f"{quiz['star_2']:,}",
                delta=f"{quiz['star_2'] / star_total * 100:.0f}%",
            )
        with sc3:
            st.metric(
                "3 Stars (5/5 correct)",
                f"{quiz['star_3']:,}",
                delta=f"{quiz['star_3'] / star_total * 100:.0f}%",
            )
    else:
        st.info("No quiz completions with star ratings in this date range.")
except Exception as e:
    st.error(f"Failed to load quiz data: {e}")

# ── Quiz: First Attempt vs Retake ──────────────────────────────────────

try:
    retake_data = get_quiz_first_attempt_vs_retake(date_from, date_to)

    st.subheader("First Attempt vs Retake")
    r1, r2, r3 = st.columns(3)
    with r1:
        st.metric("First Attempt Completions", f"{retake_data['first_attempt']:,}")
    with r2:
        st.metric("Retake Completions", f"{retake_data['retake']:,}")
    with r3:
        st.metric("Retakes Initiated", f"{retake_data['retake_initiated']:,}")
except Exception as e:
    st.error(f"Failed to load retake data: {e}")

# ── Quiz: Score Distribution ───────────────────────────────────────────

try:
    score_dist = get_quiz_score_distribution(date_from, date_to)

    st.subheader("Quiz Score Buckets")
    sd1, sd2, sd3 = st.columns(3)
    with sd1:
        st.metric("100% (Perfect)", f"{score_dist['perfect']:,}")
    with sd2:
        st.metric("40-80% (Mid Range)", f"{score_dist['mid_range']:,}")
    with sd3:
        st.metric("Below 40%", f"{score_dist['low']:,}")
except Exception as e:
    st.error(f"Failed to load score distribution: {e}")

# ── Quiz Results Actions ───────────────────────────────────────────────

try:
    qr = get_quiz_results_actions(date_from, date_to)

    st.subheader("Quiz Results Screen Actions")
    qa1, qa2, qa3, qa4 = st.columns(4)
    with qa1:
        st.metric("Results Viewed", f"{qr['viewed']:,}")
    with qa2:
        st.metric("Continue Tapped", f"{qr['continued']:,}")
    with qa3:
        st.metric("Chat to Learn Tapped", f"{qr['chat_to_learn']:,}")
    with qa4:
        st.metric("AI Explanation Requested", f"{qr['ai_explanation']:,}")
except Exception as e:
    st.error(f"Failed to load quiz results actions: {e}")

# ═══════════════════════════════════════════════════════════════════════
# Section 6: Breakdown by Lesson Type
# ═══════════════════════════════════════════════════════════════════════

st.markdown("---")
st.header("Breakdown by Lesson Type")
st.caption("Which lesson type has the highest completion rate?")

try:
    lt_data = get_lesson_type_breakdown(date_from, date_to)
    if lt_data:
        df_lt = pd.DataFrame(lt_data)
        df_lt["completion_rate"] = df_lt.apply(
            lambda r: f"{r['completed'] / r['started'] * 100:.1f}%"
            if r["started"] > 0 else "-",
            axis=1,
        )
        df_lt["avg_time_display"] = df_lt["avg_time"].apply(
            lambda v: f"{v:.0f}s" if v else "-"
        )
        st.dataframe(
            df_lt[["lesson_type", "started", "completed", "completion_rate",
                    "users", "avg_time_display"]].rename(columns={
                "lesson_type": "Lesson Type",
                "started": "Events Started",
                "completed": "Events Completed",
                "completion_rate": "Completion Rate",
                "users": "Unique Users",
                "avg_time_display": "Avg Time",
            }),
            use_container_width=True,
            hide_index=True,
        )
    else:
        st.info("No lesson type data in this date range.")
except Exception as e:
    st.error(f"Failed to load lesson type breakdown: {e}")

# ═══════════════════════════════════════════════════════════════════════
# Section 7: Breakdown by Era
# ═══════════════════════════════════════════════════════════════════════

st.markdown("---")
st.header("Breakdown by Era")

try:
    era_data = get_era_breakdown(date_from, date_to)
    if era_data:
        df_era = pd.DataFrame(era_data)
        df_era["lesson_completion_rate"] = df_era.apply(
            lambda r: f"{r['lessons_completed'] / r['lessons_started'] * 100:.1f}%"
            if r["lessons_started"] > 0 else "-",
            axis=1,
        )
        df_era["quiz_completion_rate"] = df_era.apply(
            lambda r: f"{r['quizzes_completed'] / r['quizzes_started'] * 100:.1f}%"
            if r["quizzes_started"] > 0 else "-",
            axis=1,
        )
        st.dataframe(
            df_era[[
                "era_name", "lessons_started", "lessons_completed",
                "lesson_completion_rate", "quizzes_started", "quizzes_completed",
                "quiz_completion_rate", "modules_completed",
            ]].rename(columns={
                "era_name": "Era",
                "lessons_started": "Lessons Started",
                "lessons_completed": "Lessons Completed",
                "lesson_completion_rate": "Lesson Completion %",
                "quizzes_started": "Quizzes Started",
                "quizzes_completed": "Quizzes Completed",
                "quiz_completion_rate": "Quiz Completion %",
                "modules_completed": "Modules Completed",
            }),
            use_container_width=True,
            hide_index=True,
        )
    else:
        st.info("No era data in this date range.")
except Exception as e:
    st.error(f"Failed to load era breakdown: {e}")

# ═══════════════════════════════════════════════════════════════════════
# Section 8: Breakdown by Adventure
# ═══════════════════════════════════════════════════════════════════════

st.markdown("---")
st.header("Breakdown by Adventure")

try:
    adv_data = get_adventure_breakdown(date_from, date_to)
    if adv_data:
        df_adv = pd.DataFrame(adv_data)
        df_adv["completion_rate"] = df_adv.apply(
            lambda r: f"{r['lessons_completed'] / r['lessons_started'] * 100:.1f}%"
            if r["lessons_started"] > 0 else "-",
            axis=1,
        )
        st.dataframe(
            df_adv[[
                "adventure_id", "lessons_started", "lessons_completed",
                "completion_rate", "modules_completed",
            ]].rename(columns={
                "adventure_id": "Adventure ID",
                "lessons_started": "Lessons Started",
                "lessons_completed": "Lessons Completed",
                "completion_rate": "Completion Rate",
                "modules_completed": "Modules Completed",
            }),
            use_container_width=True,
            hide_index=True,
        )
    else:
        st.info("No adventure data in this date range.")
except Exception as e:
    st.error(f"Failed to load adventure breakdown: {e}")

# ═══════════════════════════════════════════════════════════════════════
# Section 9: Analysis Questions (from spec)
# ═══════════════════════════════════════════════════════════════════════

st.markdown("---")
st.header("Analysis Deep Dives")

# ── Strategic Questions ────────────────────────────────────────────────

with st.expander("Strategic Questions", expanded=False):

    # Q: Average modules per user before leaving
    try:
        avg_modules = get_avg_modules_per_user(date_from, date_to)
        st.metric(
            "Avg Modules Completed per User",
            f"{avg_modules:.1f}" if avg_modules else "-",
        )
    except Exception as e:
        st.error(f"Failed to load avg modules: {e}")

    st.markdown("---")

    # Q: How many users complete an entire adventure?
    try:
        adv_complete = get_unique_users(
            "adventure_complete_continue", date_from, date_to
        )
        st.metric("Users Completing an Adventure", f"{adv_complete:,}")
    except Exception as e:
        st.error(f"Failed to load adventure completion: {e}")

    # Q: How many users complete an entire era?
    try:
        era_complete = get_unique_users("era_completed", date_from, date_to)
        st.metric("Users Completing an Era", f"{era_complete:,}")
    except Exception as e:
        st.error(f"Failed to load era completion: {e}")

# ── Behavioral Insights ───────────────────────────────────────────────

with st.expander("Behavioral Insights", expanded=False):

    st.subheader("Checkpoint User Counts")
    try:
        bc1, bc2 = st.columns(2)

        with bc1:
            # Users who open the Eras Tab
            eras_tab_users = get_unique_users(
                "page_view", date_from, date_to,
                extra_where="properties.page_name = 'era_selection_onboarding'",
            )
            st.metric("Eras Tab Opened", f"{eras_tab_users:,}")

            # Users who select an era
            era_sel_users = get_unique_users("era_selected", date_from, date_to)
            st.metric("Era Selected", f"{era_sel_users:,}")

            # Users who open an Adventure Card
            adv_started_users = get_unique_users(
                "adventure_started", date_from, date_to
            )
            st.metric("Adventure Card Opened", f"{adv_started_users:,}")

            # Users who tap a module
            module_tapped_users = get_unique_users(
                "module_started", date_from, date_to
            )
            st.metric("Module Tapped", f"{module_tapped_users:,}")

        with bc2:
            # Video completed in reel
            video_complete_users = get_unique_users(
                "video_completed", date_from, date_to
            )
            st.metric("Video Completed (Reel)", f"{video_complete_users:,}")

            # Reading card expanded
            reading_users = get_unique_users(
                "reading_card_expanded", date_from, date_to
            )
            st.metric("Reading Card Expanded", f"{reading_users:,}")

            # First lesson ever
            first_lesson_users = get_unique_users(
                "first_lesson", date_from, date_to
            )
            st.metric("First Lesson Ever (lifetime)", f"{first_lesson_users:,}")

            # Lesson dismissed
            dismissed_users = get_unique_users(
                "lesson_dismissed", date_from, date_to
            )
            st.metric("Lesson Dismissed (drop-off)", f"{dismissed_users:,}")

    except Exception as e:
        st.error(f"Failed to load behavioral insights: {e}")

    st.markdown("---")

    # Video buffering > 3s
    st.subheader("Video Buffering")
    try:
        buf = get_video_buffering_stats(date_from, date_to)
        vb1, vb2, vb3 = st.columns(3)
        with vb1:
            st.metric("Users with Buffering", f"{buf['total_users']:,}")
        with vb2:
            st.metric(
                "Users with >3s Buffer",
                f"{buf['long_buffer_users']:,}",
            )
        with vb3:
            avg_buf = (
                f"{buf['avg_buffer_ms']:.0f}ms"
                if buf["avg_buffer_ms"] else "-"
            )
            st.metric("Avg Buffer Time", avg_buf)
    except Exception as e:
        st.error(f"Failed to load buffering data: {e}")

    st.markdown("---")

    # Chat to Learn paywall
    st.subheader("Chat to Learn Paywall")
    try:
        ctl = get_chat_to_learn_paywall(date_from, date_to)
        cp1, cp2 = st.columns(2)
        with cp1:
            st.metric("Chat to Learn Tapped", f"{ctl['tapped']:,}")
        with cp2:
            st.metric(
                "Paywall Shown (non-subscribers)",
                f"{ctl['paywall_shown']:,}",
            )
    except Exception as e:
        st.error(f"Failed to load Chat to Learn data: {e}")

# ── Completion Milestones ─────────────────────────────────────────────

with st.expander("Completion Milestones", expanded=False):
    try:
        total_lessons_events = get_event_count(
            "lesson_completed", date_from, date_to
        )
        total_quiz_events = get_event_count(
            "quiz_completed", date_from, date_to
        )
        total_module_events = get_event_count(
            "module_completed", date_from, date_to
        )

        cm1, cm2, cm3 = st.columns(3)
        with cm1:
            st.metric("Total Lesson Completions", f"{total_lessons_events:,}")
        with cm2:
            st.metric("Total Quiz Completions", f"{total_quiz_events:,}")
        with cm3:
            st.metric("Total Module Completions", f"{total_module_events:,}")

        st.markdown("---")

        # Median lesson time
        med_lesson_time = get_median_property(
            "lesson_completed", "time_spent_seconds", date_from, date_to
        )
        med_quiz_time = get_median_property(
            "quiz_completed", "time_spent_seconds", date_from, date_to
        )
        mt1, mt2 = st.columns(2)
        with mt1:
            st.metric(
                "Median Lesson Time",
                f"{med_lesson_time:.0f}s" if med_lesson_time else "-",
            )
        with mt2:
            st.metric(
                "Median Quiz Time",
                f"{med_quiz_time:.0f}s" if med_quiz_time else "-",
            )
    except Exception as e:
        st.error(f"Failed to load completion milestones: {e}")

# ── Performance tier breakdown ────────────────────────────────────────

with st.expander("Quiz Performance Tier (from quiz_results_viewed)", expanded=False):
    try:
        tier_data = get_property_breakdown(
            "quiz_results_viewed", "performance_tier", date_from, date_to
        )
        if tier_data:
            df_tier = pd.DataFrame(
                [{"Tier": k, "Users": v} for k, v in tier_data.items()]
            )
            st.dataframe(df_tier, use_container_width=True, hide_index=True)
        else:
            st.info("No performance tier data in this date range.")
    except Exception as e:
        st.error(f"Failed to load performance tiers: {e}")
