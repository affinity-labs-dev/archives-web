"""
Onboarding Funnel Dashboard

Streamlit page for visualizing the Archives onboarding funnel and answering
the analysis questions from the onboarding spec (AFF-844).

Requires:
    POSTHOG_API_KEY  -- personal API key with read access

Run (from analytics/):
    streamlit run app.py
"""

import os
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

# Allow imports from the analytics package
_analytics_dir = str(Path(__file__).resolve().parent.parent)
if _analytics_dir not in sys.path:
    sys.path.insert(0, _analytics_dir)

from data.posthog import (
    CARD_CSS,
    hogql_query,
    setup_sidebar,
    render_funnel,
    get_unique_users,
    get_event_count,
    get_property_breakdown,
    get_avg_property,
    get_median_property,
    get_avg_seconds_between,
    get_daily_trend,
    safe_pct,
    safe_delta,
)

# ── Page config ─────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Onboarding -- Archives Analytics",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(CARD_CSS, unsafe_allow_html=True)

# ── Sidebar ─────────────────────────────────────────────────────────────

date_from, date_to, refresh = setup_sidebar("Onboarding Funnel", spec_ref="AFF-844")

if refresh:
    st.cache_data.clear()

# ── Formatting helpers ──────────────────────────────────────────────────


def pct(num: int, denom: int) -> str:
    """Return percentage string, or -- if denominator is 0."""
    if denom == 0:
        return "--"
    return f"{round(num / denom * 100, 1)}%"


def fmt(n) -> str:
    if n is None:
        return "--"
    if isinstance(n, float):
        return f"{n:.1f}"
    return f"{n:,}"


def fmt_duration(seconds: float | None) -> str:
    """Format seconds into a human-readable duration string."""
    if seconds is None:
        return "--"
    if seconds > 3600:
        return f"{seconds / 3600:.1f} hours"
    if seconds > 60:
        return f"{seconds / 60:.1f} min"
    return f"{seconds:.0f}s"


# ── Custom query helpers ────────────────────────────────────────────────


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_onboarding_step_users(screen: str, df: str, dt: str) -> int:
    """Count distinct users who viewed a specific onboarding screen."""
    q = f"""
        SELECT count(DISTINCT distinct_id) as cnt
        FROM events
        WHERE event = 'onboarding_step_viewed'
          AND properties.screen = '{screen}'
          AND timestamp >= '{df}'
          AND timestamp < '{dt}'
    """
    rows = hogql_query(q)
    return rows[0]["cnt"] if rows else 0


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_back_button_breakdown(df: str, dt: str) -> dict:
    """Breakdown of onboarding_back_tapped by screen."""
    q = f"""
        SELECT toString(properties.screen) as screen,
               count(DISTINCT distinct_id) as users,
               count() as taps
        FROM events
        WHERE event = 'onboarding_back_tapped'
          AND timestamp >= '{df}'
          AND timestamp < '{dt}'
        GROUP BY screen
        ORDER BY users DESC
    """
    rows = hogql_query(q)
    return rows


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_skip_breakdown(df: str, dt: str) -> list[dict]:
    """Breakdown of onboarding_skipped by screen."""
    q = f"""
        SELECT toString(properties.screen) as screen,
               count(DISTINCT distinct_id) as users
        FROM events
        WHERE event = 'onboarding_skipped'
          AND timestamp >= '{df}'
          AND timestamp < '{dt}'
        GROUP BY screen
        ORDER BY users DESC
    """
    return hogql_query(q)


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_notification_breakdown(df: str, dt: str) -> dict:
    """Breakdown of push notification permission results."""
    q = f"""
        SELECT toString(properties.result) as result,
               count(DISTINCT distinct_id) as users
        FROM events
        WHERE event = 'permission_requested'
          AND properties.permission_type = 'push_notifications'
          AND timestamp >= '{df}'
          AND timestamp < '{dt}'
        GROUP BY result
        ORDER BY users DESC
    """
    rows = hogql_query(q)
    return {r["result"]: r["users"] for r in rows}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_daily_goal_breakdown(df: str, dt: str) -> dict:
    """Breakdown of daily goal minutes selection."""
    q = f"""
        SELECT toString(properties.daily_goal_minutes) as goal,
               count(DISTINCT distinct_id) as users
        FROM events
        WHERE event = 'onboarding_daily_goal_selected'
          AND timestamp >= '{df}'
          AND timestamp < '{dt}'
        GROUP BY goal
        ORDER BY users DESC
    """
    rows = hogql_query(q)
    return {r["goal"]: r["users"] for r in rows}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_age_group_breakdown(df: str, dt: str) -> dict:
    """Breakdown of age group selections."""
    q = f"""
        SELECT toString(properties.age_group) as age_group,
               count(DISTINCT distinct_id) as users
        FROM events
        WHERE event = 'onboarding_age_group_selected'
          AND timestamp >= '{df}'
          AND timestamp < '{dt}'
        GROUP BY age_group
        ORDER BY users DESC
    """
    rows = hogql_query(q)
    return {r["age_group"]: r["users"] for r in rows}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_auth_method_breakdown(df: str, dt: str) -> dict:
    """Breakdown of auth_method_selected by method."""
    q = f"""
        SELECT toString(properties.method) as method,
               count(DISTINCT distinct_id) as users
        FROM events
        WHERE event = 'auth_method_selected'
          AND timestamp >= '{df}'
          AND timestamp < '{dt}'
        GROUP BY method
        ORDER BY users DESC
    """
    rows = hogql_query(q)
    return {r["method"]: r["users"] for r in rows}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_auth_failure_breakdown(df: str, dt: str) -> list[dict]:
    """Breakdown of auth_failed by method and error_message."""
    q = f"""
        SELECT toString(properties.method) as method,
               toString(properties.error_message) as error,
               count(DISTINCT distinct_id) as users,
               count() as occurrences
        FROM events
        WHERE event = 'auth_failed'
          AND timestamp >= '{df}'
          AND timestamp < '{dt}'
        GROUP BY method, error
        ORDER BY users DESC
        LIMIT 20
    """
    return hogql_query(q)


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_paywall_plan_breakdown(df: str, dt: str) -> dict:
    """Breakdown of custom_paywall_plan_selected by plan."""
    q = f"""
        SELECT toString(properties.plan) as plan,
               count(DISTINCT distinct_id) as users
        FROM events
        WHERE event = 'custom_paywall_plan_selected'
          AND timestamp >= '{df}'
          AND timestamp < '{dt}'
        GROUP BY plan
        ORDER BY users DESC
    """
    rows = hogql_query(q)
    return {r["plan"]: r["users"] for r in rows}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_interests_selection_users(df: str, dt: str) -> int:
    """Users who selected at least one interest."""
    q = f"""
        SELECT count(DISTINCT distinct_id) as cnt
        FROM events
        WHERE event = 'onboarding_interests_selected'
          AND toInt(properties.count) > 0
          AND timestamp >= '{df}'
          AND timestamp < '{dt}'
    """
    rows = hogql_query(q)
    return rows[0]["cnt"] if rows else 0


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_backgrounded_never_returned(df: str, dt: str) -> dict:
    """Users who backgrounded during onboarding and never came back vs returned."""
    q = f"""
        SELECT
            countIf(fg_count = 0) as never_returned,
            countIf(fg_count > 0) as returned
        FROM (
            SELECT
                distinct_id,
                countIf(event = 'onboarding_app_foregrounded') as fg_count
            FROM events
            WHERE event IN ('onboarding_app_backgrounded', 'onboarding_app_foregrounded')
              AND timestamp >= '{df}'
              AND timestamp < '{dt}'
            GROUP BY distinct_id
            HAVING countIf(event = 'onboarding_app_backgrounded') > 0
        )
    """
    rows = hogql_query(q)
    if rows:
        return {
            "never_returned": rows[0].get("never_returned", 0),
            "returned": rows[0].get("returned", 0),
        }
    return {"never_returned": 0, "returned": 0}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_weekly_onboarding_completion(df: str, dt: str) -> list[dict]:
    """Weekly onboarding completion rate (hero screen viewed -> onboarding_completed)."""
    q = f"""
        SELECT
            toStartOfWeek(timestamp, 1) as week,
            countDistinctIf(distinct_id,
                event = 'onboarding_step_viewed'
                AND properties.screen = 'hero') as started,
            countDistinctIf(distinct_id,
                event = 'onboarding_completed') as completed
        FROM events
        WHERE event IN ('onboarding_step_viewed', 'onboarding_completed')
          AND timestamp >= '{df}'
          AND timestamp < '{dt}'
        GROUP BY week
        ORDER BY week
    """
    return hogql_query(q)


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_personalization_completion(df: str, dt: str) -> dict:
    """Users who completed ALL personalization screens (interests + daily_goal + age_group)
    vs those who skipped at least one."""
    q = f"""
        SELECT
            countIf(has_interests = 1 AND has_goal = 1 AND has_age = 1) as all_completed,
            countIf(has_interests = 0 OR has_goal = 0 OR has_age = 0) as skipped_some
        FROM (
            SELECT
                distinct_id,
                max(if(event = 'onboarding_interests_selected', 1, 0)) as has_interests,
                max(if(event = 'onboarding_daily_goal_selected', 1, 0)) as has_goal,
                max(if(event = 'onboarding_age_group_selected', 1, 0)) as has_age
            FROM events
            WHERE event IN ('onboarding_interests_selected',
                            'onboarding_daily_goal_selected',
                            'onboarding_age_group_selected',
                            'onboarding_step_viewed')
              AND timestamp >= '{df}'
              AND timestamp < '{dt}'
            GROUP BY distinct_id
            HAVING countIf(event = 'onboarding_step_viewed'
                           AND properties.screen = 'interests') > 0
        )
    """
    rows = hogql_query(q)
    if rows:
        return {
            "all_completed": rows[0].get("all_completed", 0),
            "skipped_some": rows[0].get("skipped_some", 0),
        }
    return {"all_completed": 0, "skipped_some": 0}


# ══════════════════════════════════════════════════════════════════════════
# PAGE CONTENT
# ══════════════════════════════════════════════════════════════════════════

st.markdown("## Onboarding Funnel")
st.caption(f"AFF-844 | PostHog project 93650")

# ── Top KPI Row ─────────────────────────────────────────────────────────

# Gather core counts for KPIs and funnel
try:
    app_opened = get_unique_users("app_entry_point", date_from, date_to)
except Exception:
    app_opened = 0

try:
    hero_viewed = get_onboarding_step_users("hero", date_from, date_to)
except Exception:
    hero_viewed = 0

try:
    create_account_viewed = get_onboarding_step_users("create_account", date_from, date_to)
except Exception:
    create_account_viewed = 0

try:
    auth_succeeded = get_unique_users("auth_succeeded", date_from, date_to)
except Exception:
    auth_succeeded = 0

try:
    onboarding_completed = get_unique_users("onboarding_completed", date_from, date_to)
except Exception:
    onboarding_completed = 0

try:
    paywall_viewed = get_unique_users("paywall_viewed", date_from, date_to)
except Exception:
    paywall_viewed = 0

try:
    custom_paywall_viewed = get_unique_users("custom_paywall_viewed", date_from, date_to)
except Exception:
    custom_paywall_viewed = 0

kpi1, kpi2, kpi3, kpi4 = st.columns(4)

with kpi1:
    st.metric(
        "App Opened",
        f"{app_opened:,}",
        safe_delta(hero_viewed, app_opened),
    )

with kpi2:
    st.metric(
        "Auth Succeeded",
        f"{auth_succeeded:,}",
        safe_delta(auth_succeeded, create_account_viewed),
    )

with kpi3:
    st.metric(
        "Onboarding Completed",
        f"{onboarding_completed:,}",
        safe_delta(onboarding_completed, hero_viewed),
    )

with kpi4:
    try:
        avg_time = get_avg_property("onboarding_completed", "time_to_complete_seconds",
                                    date_from, date_to)
    except Exception:
        avg_time = None
    st.metric(
        "Avg Completion Time",
        fmt_duration(avg_time),
    )

st.divider()

# ── Funnel ──────────────────────────────────────────────────────────────

# Gather per-screen counts for the full funnel
try:
    welcome_back_viewed = get_unique_users("welcome_back_viewed", date_from, date_to)
except Exception:
    welcome_back_viewed = 0

try:
    meet_ibu_viewed = get_onboarding_step_users("meet_ibu", date_from, date_to)
except Exception:
    meet_ibu_viewed = 0

try:
    name_input_viewed = get_onboarding_step_users("name_input", date_from, date_to)
except Exception:
    name_input_viewed = 0

try:
    welcome_celebration = get_onboarding_step_users("welcome_celebration", date_from, date_to)
except Exception:
    welcome_celebration = 0

try:
    interests_viewed = get_onboarding_step_users("interests", date_from, date_to)
except Exception:
    interests_viewed = 0

try:
    social_proof_viewed = get_onboarding_step_users("social_proof", date_from, date_to)
except Exception:
    social_proof_viewed = 0

try:
    post_signup_viewed = get_onboarding_step_users("post_signup_celebration", date_from, date_to)
except Exception:
    post_signup_viewed = 0

try:
    notif_perm_viewed = get_unique_users("permission_requested", date_from, date_to,
                                         extra_where="properties.permission_type = 'push_notifications'")
except Exception:
    notif_perm_viewed = 0

try:
    daily_goal_viewed = get_onboarding_step_users("daily_goal", date_from, date_to)
except Exception:
    daily_goal_viewed = 0

try:
    age_group_viewed = get_onboarding_step_users("age_group", date_from, date_to)
except Exception:
    age_group_viewed = 0

try:
    loading_viewed = get_onboarding_step_users("loading", date_from, date_to)
except Exception:
    loading_viewed = 0

try:
    learning_path_viewed = get_onboarding_step_users("learning_path", date_from, date_to)
except Exception:
    learning_path_viewed = 0

try:
    main_app = get_unique_users("app_opened", date_from, date_to)
except Exception:
    main_app = 0

funnel_steps = [
    ("1. App Opened", app_opened),
    ("2. Welcome Back (returning)", welcome_back_viewed),
    ("3. Hero Screen", hero_viewed),
    ("4. Meet Ibu", meet_ibu_viewed),
    ("5. Name Input", name_input_viewed),
    ("6. Welcome Celebration", welcome_celebration),
    ("7. Interests Selection", interests_viewed),
    ("8. Social Proof", social_proof_viewed),
    ("9. Create Account", create_account_viewed),
    ("11. Post-Signup Celebration", post_signup_viewed),
    ("12. Notification Permission", notif_perm_viewed),
    ("13. Daily Goal", daily_goal_viewed),
    ("14. Age Group", age_group_viewed),
    ("15. Loading", loading_viewed),
    ("16. Learning Path Overview", learning_path_viewed),
    ("17. Soft Paywall", paywall_viewed),
    ("18. Custom Paywall", custom_paywall_viewed),
    ("19. Onboarding Completed", onboarding_completed),
]

# Filter out Welcome Back from the main new-user funnel path display
# but keep it available for returning-user analysis below
new_user_funnel = [s for s in funnel_steps if "Welcome Back" not in s[0]]

render_funnel(new_user_funnel, title="New User Onboarding Funnel")

# Overall conversion
if app_opened > 0 and onboarding_completed > 0:
    total_conv = round(onboarding_completed / app_opened * 100, 1)
    st.success(
        f"**App Opened -> Onboarding Completed:** {total_conv}% "
        f"({onboarding_completed:,} / {app_opened:,})"
    )
else:
    st.info("Not enough data to calculate end-to-end conversion.")

st.divider()

# ══════════════════════════════════════════════════════════════════════════
# STRATEGIC QUESTIONS (Spec Section 1)
# ══════════════════════════════════════════════════════════════════════════

st.markdown("## 1. Strategic Questions")

# ── Q1: Where is the major drop-off in the onboarding funnel? ───────────
st.markdown("### Q1: Where is the major drop-off?")

drop_off_data = []
for i in range(1, len(new_user_funnel)):
    prev_label, prev_count = new_user_funnel[i - 1]
    curr_label, curr_count = new_user_funnel[i]
    if prev_count > 0:
        drop = prev_count - curr_count
        drop_pct = round(drop / prev_count * 100, 1)
        drop_off_data.append({
            "From": prev_label,
            "To": curr_label,
            "Users Lost": drop,
            "Drop-off %": drop_pct,
        })

if drop_off_data:
    df_drop = pd.DataFrame(drop_off_data)
    df_drop = df_drop.sort_values("Drop-off %", ascending=False)
    st.dataframe(df_drop, use_container_width=True, hide_index=True)
    worst = df_drop.iloc[0]
    st.warning(
        f"Biggest drop-off: **{worst['From']}** -> **{worst['To']}** "
        f"({worst['Users Lost']:,.0f} users, {worst['Drop-off %']}%)"
    )
else:
    st.info("Not enough data for drop-off analysis.")


# ── Q2: Back button usage ──────────────────────────────────────────────
st.markdown("### Q2: How many users tap the back button?")

try:
    back_users = get_unique_users("onboarding_back_tapped", date_from, date_to)
    back_total = get_event_count("onboarding_back_tapped", date_from, date_to)
except Exception:
    back_users = 0
    back_total = 0

col1, col2 = st.columns(2)
with col1:
    st.metric("Users who tapped back", f"{back_users:,}",
              pct(back_users, hero_viewed) + " of onboarding starters")
with col2:
    st.metric("Total back taps", f"{back_total:,}",
              f"{round(back_total / back_users, 1) if back_users > 0 else 0} avg taps/user")


# ── Q3: Highest back-button screen ─────────────────────────────────────
st.markdown("### Q3: Which screen has the highest back-button rate?")

try:
    back_breakdown = get_back_button_breakdown(date_from, date_to)
except Exception:
    back_breakdown = []

if back_breakdown:
    df_back = pd.DataFrame(back_breakdown)
    st.bar_chart(df_back.set_index("screen")["users"], use_container_width=True)
    with st.expander("Detailed back-button breakdown"):
        st.dataframe(df_back, use_container_width=True, hide_index=True)
else:
    st.info("No back button data available.")


# ── Q4 & Q5: Backgrounded users ───────────────────────────────────────
st.markdown("### Q4-Q5: App backgrounding during onboarding")

try:
    bg_data = get_backgrounded_never_returned(date_from, date_to)
except Exception:
    bg_data = {"never_returned": 0, "returned": 0}

col1, col2 = st.columns(2)
with col1:
    st.metric(
        "Q4: Backgrounded & never returned",
        f"{bg_data['never_returned']:,}",
    )
with col2:
    st.metric(
        "Q5: Backgrounded but returned & finished",
        f"{bg_data['returned']:,}",
    )


# ── Q6: Average time to complete full onboarding ──────────────────────
st.markdown("### Q6: How long does onboarding take?")

col1, col2 = st.columns(2)
with col1:
    st.metric("Average completion time", fmt_duration(avg_time))

with col2:
    try:
        median_time = get_median_property("onboarding_completed", "time_to_complete_seconds",
                                          date_from, date_to)
    except Exception:
        median_time = None
    st.metric("Median completion time", fmt_duration(median_time))

try:
    avg_auth_to_complete = get_avg_seconds_between(
        "auth_succeeded", "onboarding_completed", date_from, date_to
    )
except Exception:
    avg_auth_to_complete = None

st.caption(f"Avg time from auth -> completion: {fmt_duration(avg_auth_to_complete)}")


# ── Q7 & Q8: Skip vs complete personalization ────────────────────────
st.markdown("### Q7-Q8: Personalization screen skip rates")

try:
    skip_breakdown = get_skip_breakdown(date_from, date_to)
except Exception:
    skip_breakdown = []

try:
    personalization = get_personalization_completion(date_from, date_to)
except Exception:
    personalization = {"all_completed": 0, "skipped_some": 0}

col1, col2 = st.columns(2)
with col1:
    total_pers = personalization["all_completed"] + personalization["skipped_some"]
    st.metric(
        "Q7: Users who skip 1+ personalization screen",
        f"{personalization['skipped_some']:,}",
        pct(personalization["skipped_some"], total_pers) + " skip rate",
    )
with col2:
    st.metric(
        "Q8: Users who complete ALL personalization",
        f"{personalization['all_completed']:,}",
        pct(personalization["all_completed"], total_pers) + " completion rate",
    )

if skip_breakdown:
    st.markdown("**Skip breakdown by screen:**")
    df_skip = pd.DataFrame(skip_breakdown)
    st.bar_chart(df_skip.set_index("screen")["users"], use_container_width=True)
    with st.expander("Detailed skip breakdown"):
        st.dataframe(df_skip, use_container_width=True, hide_index=True)

st.divider()

# ══════════════════════════════════════════════════════════════════════════
# BEHAVIORAL INSIGHTS (Spec Section 2)
# ══════════════════════════════════════════════════════════════════════════

st.markdown("## 2. Behavioral Insights")

# ── Q1: Hero Screen viewers ──────────────────────────────────────────
st.markdown("### B1: How many users see the Hero Screen?")
st.metric("Hero Screen viewers", f"{hero_viewed:,}",
          pct(hero_viewed, app_opened) + " of app openers")

# ── Q2: Interest selection ──────────────────────────────────────────
st.markdown("### B2: Interest selection at Interests screen")

try:
    interests_selected = get_interests_selection_users(date_from, date_to)
except Exception:
    interests_selected = 0

st.metric("Users who selected 1+ interest", f"{interests_selected:,}",
          pct(interests_selected, interests_viewed) + f" of {interests_viewed:,} who saw the screen")

try:
    avg_interests = get_avg_property("onboarding_interests_selected", "count",
                                     date_from, date_to)
except Exception:
    avg_interests = None

st.caption(f"Average interests selected: {fmt(avg_interests)}")


# ── Q3-Q5: Auth funnel ─────────────────────────────────────────────
st.markdown("### B3-B5: Create Account & Auth")

try:
    new_signups = get_unique_users("user_signed_up", date_from, date_to)
except Exception:
    new_signups = 0

try:
    returning_logins = get_unique_users("user_session_in", date_from, date_to)
except Exception:
    returning_logins = 0

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("B3: Reached Create Account", f"{create_account_viewed:,}",
              pct(create_account_viewed, hero_viewed) + " of hero viewers")
with col2:
    st.metric("B4: Successfully signed up (new)", f"{new_signups:,}",
              pct(new_signups, create_account_viewed) + " conversion")
with col3:
    st.metric("B5: Signed in (existing)", f"{returning_logins:,}")


# ── Q6-Q8: Auth method breakdown ─────────────────────────────────────
st.markdown("### B6-B8: Auth method breakdown")

try:
    auth_methods = get_auth_method_breakdown(date_from, date_to)
except Exception:
    auth_methods = {}

apple_users = auth_methods.get("apple", 0)
google_users = auth_methods.get("google", 0)
email_users = auth_methods.get("email", 0)
auth_total = apple_users + google_users + email_users

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("B6: Apple", f"{apple_users:,}",
              pct(apple_users, auth_total))
with col2:
    st.metric("B7: Google", f"{google_users:,}",
              pct(google_users, auth_total))
with col3:
    st.metric("B8: Email", f"{email_users:,}",
              pct(email_users, auth_total))

if auth_methods:
    df_auth = pd.DataFrame([
        {"Method": k, "Users": v} for k, v in auth_methods.items()
    ])
    st.bar_chart(df_auth.set_index("Method")["Users"], use_container_width=True)


# ── Q9: Auth failures ────────────────────────────────────────────────
st.markdown("### B9: Auth failures")

try:
    auth_failures = get_auth_failure_breakdown(date_from, date_to)
    auth_fail_total = get_unique_users("auth_failed", date_from, date_to)
except Exception:
    auth_failures = []
    auth_fail_total = 0

st.metric("Users who hit auth errors", f"{auth_fail_total:,}",
          pct(auth_fail_total, create_account_viewed) + " of users at Create Account")

if auth_failures:
    with st.expander("Auth failure details"):
        st.dataframe(pd.DataFrame(auth_failures), use_container_width=True, hide_index=True)


# ── Q10-Q12: Push notification permissions ───────────────────────────
st.markdown("### B10-B12: Push notification permissions")

try:
    notif_data = get_notification_breakdown(date_from, date_to)
except Exception:
    notif_data = {}

notif_enabled = 0
notif_declined = 0
notif_undetermined = 0
for k, v in notif_data.items():
    k_lower = str(k).lower() if k else ""
    if "grant" in k_lower or "enable" in k_lower or k_lower == "true":
        notif_enabled += v
    elif "den" in k_lower or "decline" in k_lower or k_lower == "false":
        notif_declined += v
    else:
        notif_undetermined += v

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("B10: Enabled notifications", f"{notif_enabled:,}")
with col2:
    st.metric("B11: Declined notifications", f"{notif_declined:,}")
with col3:
    st.metric("B12: Maybe later / undetermined", f"{notif_undetermined:,}")

if notif_data:
    with st.expander("Raw notification permission results"):
        df_notif = pd.DataFrame([
            {"Result": k, "Users": v} for k, v in notif_data.items()
        ])
        st.dataframe(df_notif, use_container_width=True, hide_index=True)


# ── Q13: Daily goal breakdown ────────────────────────────────────────
st.markdown("### B13: Daily learning goal selection")

try:
    goal_data = get_daily_goal_breakdown(date_from, date_to)
except Exception:
    goal_data = {}

if goal_data:
    # Sort by goal minutes
    sorted_goals = dict(sorted(goal_data.items(), key=lambda x: str(x[0])))
    df_goal = pd.DataFrame([
        {"Goal (minutes)": k, "Users": v} for k, v in sorted_goals.items()
    ])
    st.bar_chart(df_goal.set_index("Goal (minutes)")["Users"], use_container_width=True)
    with st.expander("Goal selection details"):
        st.dataframe(df_goal, use_container_width=True, hide_index=True)
else:
    st.info("No daily goal data available.")


# ── Q14: Age group breakdown ────────────────────────────────────────
st.markdown("### B14: Age group distribution")

try:
    age_data = get_age_group_breakdown(date_from, date_to)
except Exception:
    age_data = {}

if age_data:
    df_age = pd.DataFrame([
        {"Age Group": k, "Users": v} for k, v in age_data.items()
    ])
    st.bar_chart(df_age.set_index("Age Group")["Users"], use_container_width=True)
    with st.expander("Age group details"):
        st.dataframe(df_age, use_container_width=True, hide_index=True)
else:
    st.info("No age group data available.")


# ── Q15: Full onboarding completion ─────────────────────────────────
st.markdown("### B15: Complete the full onboarding (GET STARTED)")
st.metric("Users who completed onboarding", f"{onboarding_completed:,}",
          pct(onboarding_completed, learning_path_viewed) +
          f" of {learning_path_viewed:,} who saw Learning Path")


# ── Q16-Q17: Soft Paywall ──────────────────────────────────────────
st.markdown("### B16-B17: Soft Paywall")

try:
    paywall_cta = get_unique_users("paywall_cta_tapped", date_from, date_to)
except Exception:
    paywall_cta = 0

col1, col2 = st.columns(2)
with col1:
    st.metric("B16: Saw Soft Paywall", f"{paywall_viewed:,}",
              pct(paywall_viewed, onboarding_completed) + " of completers")
with col2:
    st.metric("B17: Tapped 'See my free offer'", f"{paywall_cta:,}",
              pct(paywall_cta, paywall_viewed) + " conversion")


# ── Q18-Q21: Custom Paywall ──────────────────────────────────────────
st.markdown("### B18-B21: Custom Paywall")

try:
    plan_selected = get_unique_users("custom_paywall_plan_selected", date_from, date_to)
except Exception:
    plan_selected = 0

try:
    subscribe_success = get_unique_users("custom_paywall_subscribe_success", date_from, date_to)
except Exception:
    subscribe_success = 0

try:
    paywall_dismissed = get_unique_users("custom_paywall_dismissed", date_from, date_to)
except Exception:
    paywall_dismissed = 0

col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("B18: Saw Custom Paywall", f"{custom_paywall_viewed:,}")
with col2:
    st.metric("B19: Selected a plan", f"{plan_selected:,}",
              pct(plan_selected, custom_paywall_viewed) + " select rate")
with col3:
    st.metric("B20: Subscribed", f"{subscribe_success:,}",
              pct(subscribe_success, custom_paywall_viewed) + " conversion")
with col4:
    st.metric("B21: Dismissed without subscribing", f"{paywall_dismissed:,}",
              pct(paywall_dismissed, custom_paywall_viewed) + " dismiss rate")

try:
    plan_breakdown = get_paywall_plan_breakdown(date_from, date_to)
except Exception:
    plan_breakdown = {}

if plan_breakdown:
    st.markdown("**Plan selection breakdown:**")
    df_plans = pd.DataFrame([
        {"Plan": k, "Users": v} for k, v in plan_breakdown.items()
    ])
    st.bar_chart(df_plans.set_index("Plan")["Users"], use_container_width=True)

try:
    subscribe_failed = get_unique_users("custom_paywall_subscribe_failed", date_from, date_to)
except Exception:
    subscribe_failed = 0

if subscribe_failed > 0:
    st.warning(f"{subscribe_failed:,} users hit subscription failures")


# ── Q22-Q23: Returning users (Welcome Back) ─────────────────────────
st.markdown("### B22-B23: Returning users")

try:
    welcome_back_tapped = get_unique_users("welcome_back_tapped", date_from, date_to)
except Exception:
    welcome_back_tapped = 0

col1, col2 = st.columns(2)
with col1:
    st.metric("B22: Returning users (Welcome Back)", f"{welcome_back_viewed:,}")
with col2:
    st.metric("B23: Re-authenticated via one-tap", f"{welcome_back_tapped:,}",
              pct(welcome_back_tapped, welcome_back_viewed) + " one-tap rate")

st.divider()

# ══════════════════════════════════════════════════════════════════════════
# CHECKPOINT VALIDATION (Spec Section 3)
# ══════════════════════════════════════════════════════════════════════════

st.markdown("## 3. Checkpoint Validation")

checkpoint_data = [
    ("1. App Opened (routing guard)", app_opened),
    ("2. Hero Screen (first onboarding screen)", hero_viewed),
    ("3. Name Input", name_input_viewed),
    ("4. Interests Selection", interests_viewed),
    ("5. Create Account", create_account_viewed),
    ("6. Notification Permission", notif_perm_viewed),
    ("7. Learning Path Overview", learning_path_viewed),
    ("8. Soft Paywall", paywall_viewed),
    ("9. Custom Paywall", custom_paywall_viewed),
    ("10. Main App (app_opened post-onboarding)", main_app),
]

for i, (label, count) in enumerate(checkpoint_data):
    prev_count = checkpoint_data[i - 1][1] if i > 0 else count
    conv = pct(count, prev_count) if i > 0 else ""
    step_info = f"  |  {conv} from prev" if conv else ""
    st.markdown(
        f"**{label}:** {count:,} users{step_info}"
    )

st.divider()

# ══════════════════════════════════════════════════════════════════════════
# TRENDS
# ══════════════════════════════════════════════════════════════════════════

st.markdown("## Trends")

# Weekly onboarding completion rate
st.markdown("#### Onboarding Completion Rate (weekly)")

try:
    weekly_data = get_weekly_onboarding_completion(date_from, date_to)
except Exception:
    weekly_data = []

if weekly_data:
    df_weekly = pd.DataFrame(weekly_data)
    df_weekly["week"] = pd.to_datetime(df_weekly["week"])
    df_weekly["rate"] = df_weekly.apply(
        lambda row: round(row["completed"] / row["started"] * 100, 1)
        if row["started"] > 0 else 0, axis=1
    )
    st.line_chart(df_weekly.set_index("week")["rate"],
                  use_container_width=True, y_label="% completion")
else:
    st.info("Not enough data for weekly trend.")


# Daily trend: hero screen views
st.markdown("#### Daily Hero Screen Views")
try:
    daily_hero = get_daily_trend("onboarding_step_viewed", date_from, date_to,
                                 extra_where="properties.screen = 'hero'")
except Exception:
    daily_hero = pd.DataFrame(columns=["day", "users"])

if not daily_hero.empty:
    st.line_chart(daily_hero.set_index("day")["users"],
                  use_container_width=True, y_label="Users")
else:
    st.info("No daily hero screen data.")


# Daily trend: onboarding completions
st.markdown("#### Daily Onboarding Completions")
try:
    daily_completed = get_daily_trend("onboarding_completed", date_from, date_to)
except Exception:
    daily_completed = pd.DataFrame(columns=["day", "users"])

if not daily_completed.empty:
    st.line_chart(daily_completed.set_index("day")["users"],
                  use_container_width=True, y_label="Users")
else:
    st.info("No daily completion data.")


# Daily trend: auth succeeded
st.markdown("#### Daily Auth Successes")
try:
    daily_auth = get_daily_trend("auth_succeeded", date_from, date_to)
except Exception:
    daily_auth = pd.DataFrame(columns=["day", "users"])

if not daily_auth.empty:
    st.line_chart(daily_auth.set_index("day")["users"],
                  use_container_width=True, y_label="Users")
else:
    st.info("No daily auth data.")

# ── Footer ──────────────────────────────────────────────────────────────

st.divider()
st.caption(
    "Archives Analytics | AFF-844 | Onboarding Funnel Dashboard | "
    "PostHog project 93650"
)
