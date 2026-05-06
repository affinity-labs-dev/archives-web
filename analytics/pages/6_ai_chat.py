"""
AI Chat Analytics Dashboard

Streamlit page for visualizing the AI Chat flow from the Archives app.
Covers the full user journey: floating button / quiz results entry,
chat modal, messages, responses, image features, and quota.

Spec: AFF-844 — AI Chat Flow Spec
"""

import os
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

# ── Allow imports from analytics/ ──────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from data.posthog import (  # noqa: E402
    CARD_CSS,
    hogql_query,
    get_unique_users,
    get_event_count,
    get_property_breakdown,
    get_avg_property,
    get_median_property,
    get_daily_trend,
    render_funnel,
    safe_pct,
    setup_sidebar,
)

# ── Page config ────────────────────────────────────────────────────────
st.set_page_config(
    page_title="AI Chat — Archives Analytics",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(CARD_CSS, unsafe_allow_html=True)

# ── Sidebar ────────────────────────────────────────────────────────────
date_from, date_to, refresh = setup_sidebar("AI Chat", spec_ref="AFF-844")

if refresh:
    st.cache_data.clear()

# ── Cached query helpers ───────────────────────────────────────────────


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _chat_entry_points(date_from: str, date_to: str) -> dict:
    """Break down chat opens by entry point (floating button vs quiz results)."""
    q = f"""
        SELECT
            countDistinct(distinct_id) as total_viewers,
            countDistinctIf(distinct_id, event = 'ai_button_tapped') as from_button,
            countDistinctIf(distinct_id, event = 'quiz_results_chat_to_learn_tapped') as from_quiz
        FROM events
        WHERE event IN ('ai_button_tapped', 'quiz_results_chat_to_learn_tapped')
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return {
            "total": rows[0].get("total_viewers", 0),
            "floating_button": rows[0].get("from_button", 0),
            "quiz_results": rows[0].get("from_quiz", 0),
        }
    return {"total": 0, "floating_button": 0, "quiz_results": 0}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _message_type_breakdown(date_from: str, date_to: str) -> dict:
    """Break down messages by type (text vs image)."""
    q = f"""
        SELECT
            toString(properties.message_type) as msg_type,
            count() as cnt,
            count(DISTINCT distinct_id) as users
        FROM events
        WHERE event = 'ai_chat_message_sent'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
        GROUP BY msg_type
        ORDER BY cnt DESC
    """
    rows = hogql_query(q)
    return {r["msg_type"]: {"count": r["cnt"], "users": r["users"]} for r in rows}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _suggestion_vs_custom(date_from: str, date_to: str) -> dict:
    """Users who tapped a suggestion vs typed a custom first message."""
    q = f"""
        SELECT
            countDistinctIf(distinct_id, event = 'ai_suggestion_tapped') as suggestion_users,
            countDistinctIf(distinct_id, event = 'ai_chat_message_sent'
                AND (properties.is_first_message = 'true'
                     OR properties.is_first_message = true)) as first_msg_users
        FROM events
        WHERE event IN ('ai_suggestion_tapped', 'ai_chat_message_sent')
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        suggestion = rows[0].get("suggestion_users", 0)
        first_msg = rows[0].get("first_msg_users", 0)
        custom = max(first_msg - suggestion, 0)
        return {"suggestion": suggestion, "custom": custom}
    return {"suggestion": 0, "custom": 0}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _session_depth_distribution(date_from: str, date_to: str) -> list[dict]:
    """Distribution of message count per session (via ai_chat_dismissed)."""
    q = f"""
        SELECT
            toInt32(properties.message_count) as msg_count,
            count() as sessions
        FROM events
        WHERE event = 'ai_chat_dismissed'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
          AND properties.message_count IS NOT NULL
        GROUP BY msg_count
        ORDER BY msg_count
    """
    return hogql_query(q)


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _zero_message_sessions(date_from: str, date_to: str) -> dict:
    """Sessions where chat was opened then dismissed with zero messages."""
    q = f"""
        SELECT
            count() as total_dismissed,
            countIf(toInt32(properties.message_count) = 0
                     OR properties.message_count IS NULL
                     OR properties.message_count = '0') as zero_msg
        FROM events
        WHERE event = 'ai_chat_dismissed'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        total = rows[0].get("total_dismissed", 0)
        zero = rows[0].get("zero_msg", 0)
        return {"total": total, "zero": zero}
    return {"total": 0, "zero": 0}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _image_feature_stats(date_from: str, date_to: str) -> dict:
    """Aggregate stats across image generation, analysis, editing, uploads."""
    q = f"""
        SELECT
            countDistinctIf(distinct_id, event = 'ai_image_generated') as gen_users,
            countIf(event = 'ai_image_generated') as gen_count,
            countDistinctIf(distinct_id, event = 'ai_image_selected') as upload_users,
            countIf(event = 'ai_image_selected') as upload_count,
            countDistinctIf(distinct_id, event = 'ai_image_analyzed') as analyzed_users,
            countIf(event = 'ai_image_analyzed') as analyzed_count,
            countDistinctIf(distinct_id, event = 'ai_image_edited') as edited_users,
            countIf(event = 'ai_image_edited') as edited_count,
            countDistinctIf(distinct_id, event = 'ai_image_shared') as shared_users,
            countIf(event = 'ai_image_shared') as shared_count
        FROM events
        WHERE event IN (
            'ai_image_generated', 'ai_image_selected',
            'ai_image_analyzed', 'ai_image_edited', 'ai_image_shared'
        )
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return rows[0]
    return {}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _quota_stats(date_from: str, date_to: str) -> dict:
    """Quota exceeded events and subscriber breakdown."""
    q = f"""
        SELECT
            count() as total_hits,
            count(DISTINCT distinct_id) as unique_users,
            countIf(properties.is_subscriber = 'true'
                     OR properties.is_subscriber = true) as subscriber_hits,
            countIf(properties.is_subscriber = 'false'
                     OR properties.is_subscriber = false
                     OR properties.is_subscriber IS NULL) as free_hits
        FROM events
        WHERE event = 'ai_quota_exceeded'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return rows[0]
    return {}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _quota_request_type_breakdown(date_from: str, date_to: str) -> dict:
    """Break down quota hits by request type."""
    q = f"""
        SELECT
            toString(properties.request_type) as req_type,
            count() as cnt,
            count(DISTINCT distinct_id) as users
        FROM events
        WHERE event = 'ai_quota_exceeded'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
        GROUP BY req_type
        ORDER BY cnt DESC
    """
    rows = hogql_query(q)
    return {r["req_type"]: {"count": r["cnt"], "users": r["users"]} for r in rows}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _error_breakdown(date_from: str, date_to: str) -> dict:
    """Break down chat errors by era and frequency."""
    q = f"""
        SELECT
            count() as total_errors,
            count(DISTINCT distinct_id) as unique_users
        FROM events
        WHERE event = 'ai_chat_error'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return rows[0]
    return {}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _web_source_stats(date_from: str, date_to: str) -> dict:
    """Stats on web source responses and link taps."""
    q = f"""
        SELECT
            countDistinctIf(distinct_id, event = 'ai_chat_response_received'
                AND (properties.has_web_sources = 'true'
                     OR properties.has_web_sources = true)) as responses_with_sources,
            countDistinctIf(distinct_id, event = 'ai_web_source_tapped') as source_tappers
        FROM events
        WHERE event IN ('ai_chat_response_received', 'ai_web_source_tapped')
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return rows[0]
    return {}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _chat_to_learn_funnel(date_from: str, date_to: str) -> dict:
    """Chat to Learn funnel: quiz tap -> paywall -> purchase -> response."""
    q = f"""
        SELECT
            countDistinctIf(distinct_id, event = 'quiz_results_chat_to_learn_tapped')
                as tapped,
            countDistinctIf(distinct_id, event = 'chat_to_learn_paywall_shown')
                as paywall_shown,
            countDistinctIf(distinct_id, event = 'subscribe_purchase_completed'
                AND properties.trigger = 'chat_to_learn')
                as purchased,
            countDistinctIf(distinct_id, event = 'chat_to_learn_response')
                as response_received
        FROM events
        WHERE event IN (
            'quiz_results_chat_to_learn_tapped',
            'chat_to_learn_paywall_shown',
            'subscribe_purchase_completed',
            'chat_to_learn_response'
        )
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return rows[0]
    return {}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _action_menu_stats(date_from: str, date_to: str) -> dict:
    """Plus menu opens and quick prompt taps."""
    q = f"""
        SELECT
            countDistinctIf(distinct_id, event = 'ai_action_menu_viewed')
                as menu_openers,
            countIf(event = 'ai_action_menu_viewed') as menu_opens,
            countDistinctIf(distinct_id, event = 'ai_quick_prompt_tapped')
                as prompt_tappers,
            countIf(event = 'ai_quick_prompt_tapped') as prompt_taps
        FROM events
        WHERE event IN ('ai_action_menu_viewed', 'ai_quick_prompt_tapped')
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return rows[0]
    return {}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _clear_history_stats(date_from: str, date_to: str) -> dict:
    """Users who clear their chat history."""
    q = f"""
        SELECT
            count(DISTINCT distinct_id) as users,
            count() as total_clears
        FROM events
        WHERE event = 'ai_chat_history_cleared'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return rows[0]
    return {}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _weekly_chat_opens(date_from: str, date_to: str) -> list[dict]:
    """Weekly unique chat openers."""
    q = f"""
        SELECT
            toStartOfWeek(timestamp, 1) as week,
            count(DISTINCT distinct_id) as users
        FROM events
        WHERE event = 'ai_chat_viewed'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
        GROUP BY week
        ORDER BY week
    """
    return hogql_query(q)


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _heavy_users(date_from: str, date_to: str) -> int:
    """Users who open AI chat more than 5 times in a single day."""
    q = f"""
        SELECT count(DISTINCT distinct_id) as heavy_users
        FROM (
            SELECT distinct_id, toDate(timestamp) as day, count() as opens
            FROM events
            WHERE event = 'ai_chat_viewed'
              AND timestamp >= '{date_from}'
              AND timestamp < '{date_to}'
            GROUP BY distinct_id, day
            HAVING opens > 5
        )
    """
    rows = hogql_query(q)
    return rows[0]["heavy_users"] if rows else 0


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def _quiz_explanation_stats(date_from: str, date_to: str) -> dict:
    """AI Quiz Explanation usage (related but outside chat modal)."""
    q = f"""
        SELECT
            countDistinctIf(distinct_id, event = 'ai_quiz_explanation_requested')
                as requested_users,
            countIf(event = 'ai_quiz_explanation_requested') as requested_count,
            countDistinctIf(distinct_id, event = 'ai_quiz_explanation_generated')
                as generated_users,
            countIf(event = 'ai_quiz_explanation_generated') as generated_count
        FROM events
        WHERE event IN ('ai_quiz_explanation_requested', 'ai_quiz_explanation_generated')
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows:
        return rows[0]
    return {}


# ── Helper formatters ──────────────────────────────────────────────────

def fmt(n) -> str:
    if n is None:
        return "---"
    if isinstance(n, float):
        return f"{n:,.1f}"
    return f"{n:,}"


def pct(num: int, denom: int) -> str:
    if denom == 0:
        return "---"
    return f"{round(num / denom * 100, 1)}%"


# =====================================================================
#  DASHBOARD LAYOUT
# =====================================================================

st.title("AI Chat Analytics")
st.caption(f"PostHog events for the AI Chat flow | AFF-844")

# ── 1. Top KPI Row ────────────────────────────────────────────────────

st.markdown("## Overview")

try:
    chat_opens = get_event_count("ai_chat_viewed", date_from, date_to)
    chat_openers = get_unique_users("ai_chat_viewed", date_from, date_to)
    messages_sent = get_event_count("ai_chat_message_sent", date_from, date_to)
    message_senders = get_unique_users("ai_chat_message_sent", date_from, date_to)
    responses_received = get_event_count("ai_chat_response_received", date_from, date_to)
    sessions_dismissed = get_event_count("ai_chat_dismissed", date_from, date_to)
    avg_response_time = get_avg_property(
        "ai_chat_response_received", "response_time_ms", date_from, date_to
    )

    k1, k2, k3, k4 = st.columns(4)
    with k1:
        st.metric("Chat Opens", fmt(chat_opens), f"{chat_openers:,} unique users")
    with k2:
        st.metric("Messages Sent", fmt(messages_sent), f"{message_senders:,} unique users")
    with k3:
        st.metric("Sessions Dismissed", fmt(sessions_dismissed))
    with k4:
        rt_display = f"{avg_response_time:,.0f} ms" if avg_response_time else "---"
        st.metric("Avg Response Time", rt_display)
except Exception as e:
    st.error(f"Failed to load overview KPIs: {e}")

st.divider()

# ── 2. Engagement Funnel ──────────────────────────────────────────────

st.markdown("## Engagement Funnel")

try:
    funnel_viewed = get_unique_users("ai_chat_viewed", date_from, date_to)
    funnel_sent = get_unique_users("ai_chat_message_sent", date_from, date_to)
    funnel_response = get_unique_users("ai_chat_response_received", date_from, date_to)
    funnel_dismissed = get_unique_users("ai_chat_dismissed", date_from, date_to)

    render_funnel([
        ("Chat Viewed", funnel_viewed),
        ("Message Sent", funnel_sent),
        ("Response Received", funnel_response),
        ("Chat Dismissed", funnel_dismissed),
    ], title="Chat Engagement Funnel")

    if funnel_viewed > 0:
        st.success(
            f"**View-to-Message Rate:** {pct(funnel_sent, funnel_viewed)} "
            f"({funnel_sent:,} / {funnel_viewed:,} users)"
        )
except Exception as e:
    st.error(f"Failed to load funnel: {e}")

st.divider()

# ── 3. Entry Point Breakdown ─────────────────────────────────────────

st.markdown("## Entry Points")

try:
    entry = _chat_entry_points(date_from, date_to)

    e1, e2, e3 = st.columns(3)
    with e1:
        st.metric("Floating Button", fmt(entry["floating_button"]),
                  pct(entry["floating_button"], entry["total"]) + " of entries")
    with e2:
        st.metric("Quiz Results (Chat to Learn)", fmt(entry["quiz_results"]),
                  pct(entry["quiz_results"], entry["total"]) + " of entries")
    with e3:
        st.metric("Total Entry Users", fmt(entry["total"]))

    # Screen breakdown for floating button
    screen_breakdown = get_property_breakdown(
        "ai_button_tapped", "screen", date_from, date_to
    )
    if screen_breakdown:
        st.markdown("#### Floating Button - Screen Breakdown")
        df_screens = pd.DataFrame(
            list(screen_breakdown.items()), columns=["Screen", "Users"]
        ).sort_values("Users", ascending=False)
        st.dataframe(df_screens, use_container_width=True, hide_index=True)
except Exception as e:
    st.error(f"Failed to load entry points: {e}")

st.divider()

# ── 4. Chat to Learn Funnel ──────────────────────────────────────────

st.markdown("## Chat to Learn (Quiz Results)")
st.caption("Non-subscribers see a paywall when tapping Chat to Learn on quiz results")

try:
    ctl = _chat_to_learn_funnel(date_from, date_to)

    render_funnel([
        ("Chat to Learn Tapped", ctl.get("tapped", 0)),
        ("Paywall Shown", ctl.get("paywall_shown", 0)),
        ("Purchase Completed", ctl.get("purchased", 0)),
        ("AI Response Received", ctl.get("response_received", 0)),
    ], title="Chat to Learn Conversion")

    tapped = ctl.get("tapped", 0)
    purchased = ctl.get("purchased", 0)
    if tapped > 0:
        st.info(
            f"**Paywall Conversion:** {pct(purchased, ctl.get('paywall_shown', 0))} "
            f"of users shown paywall purchased"
        )
except Exception as e:
    st.error(f"Failed to load Chat to Learn funnel: {e}")

st.divider()

# ── 5. Session Metrics ────────────────────────────────────────────────

st.markdown("## Session Metrics")

try:
    # First message: suggestion vs custom
    sugg = _suggestion_vs_custom(date_from, date_to)

    # Zero-message sessions
    zero = _zero_message_sessions(date_from, date_to)

    # Session depth distribution
    depth_data = _session_depth_distribution(date_from, date_to)

    s1, s2, s3 = st.columns(3)
    with s1:
        avg_msgs = get_avg_property(
            "ai_chat_dismissed", "message_count", date_from, date_to
        )
        med_msgs = get_median_property(
            "ai_chat_dismissed", "message_count", date_from, date_to
        )
        st.metric("Avg Messages / Session", fmt(avg_msgs))
        st.metric("Median Messages / Session", fmt(med_msgs))

    with s2:
        st.metric("Suggestion First Message", fmt(sugg["suggestion"]),
                  pct(sugg["suggestion"], sugg["suggestion"] + sugg["custom"])
                  + " of first messages")
        st.metric("Custom First Message", fmt(sugg["custom"]))

    with s3:
        st.metric("Zero-Message Sessions", fmt(zero["zero"]),
                  pct(zero["zero"], zero["total"]) + " of all sessions")

    # Depth distribution chart
    if depth_data:
        st.markdown("#### Message Depth Distribution")
        df_depth = pd.DataFrame(depth_data)
        if "msg_count" in df_depth.columns and "sessions" in df_depth.columns:
            # Cap display at 20+ for readability
            df_depth["bucket"] = df_depth["msg_count"].apply(
                lambda x: str(x) if x < 20 else "20+"
            )
            df_grouped = df_depth.groupby("bucket", as_index=False)["sessions"].sum()
            st.bar_chart(df_grouped.set_index("bucket")["sessions"],
                         use_container_width=True, y_label="Sessions")
except Exception as e:
    st.error(f"Failed to load session metrics: {e}")

st.divider()

# ── 6. Response Quality ──────────────────────────────────────────────

st.markdown("## Response Quality")

try:
    errors = _error_breakdown(date_from, date_to)
    web_sources = _web_source_stats(date_from, date_to)

    avg_resp_len = get_avg_property(
        "ai_chat_response_received", "response_length", date_from, date_to
    )

    r1, r2, r3, r4 = st.columns(4)
    with r1:
        rt = avg_response_time
        st.metric("Avg Response Time",
                  f"{rt:,.0f} ms" if rt else "---")
    with r2:
        st.metric("Avg Response Length",
                  f"{avg_resp_len:,.0f} chars" if avg_resp_len else "---")
    with r3:
        err_total = errors.get("total_errors", 0)
        err_users = errors.get("unique_users", 0)
        err_rate = pct(err_total, responses_received) if responses_received else "---"
        st.metric("Errors", fmt(err_total), f"{err_rate} error rate")
    with r4:
        ws_users = web_sources.get("responses_with_sources", 0)
        ws_tappers = web_sources.get("source_tappers", 0)
        st.metric("Web Source Responses", fmt(ws_users),
                  f"{ws_tappers:,} tapped a link")
except Exception as e:
    st.error(f"Failed to load response quality metrics: {e}")

st.divider()

# ── 7. Image Features ────────────────────────────────────────────────

st.markdown("## Image Features")

try:
    img = _image_feature_stats(date_from, date_to)

    i1, i2, i3 = st.columns(3)
    with i1:
        st.metric("Images Generated", fmt(img.get("gen_count", 0)),
                  f"{img.get('gen_users', 0):,} users")
        st.metric("Images Uploaded", fmt(img.get("upload_count", 0)),
                  f"{img.get('upload_users', 0):,} users")
    with i2:
        st.metric("Images Analyzed", fmt(img.get("analyzed_count", 0)),
                  f"{img.get('analyzed_users', 0):,} users")
        st.metric("Images Edited", fmt(img.get("edited_count", 0)),
                  f"{img.get('edited_users', 0):,} users")
    with i3:
        st.metric("Images Shared", fmt(img.get("shared_count", 0)),
                  f"{img.get('shared_users', 0):,} users")

        # Image viewer
        viewer_users = get_unique_users("ai_image_viewer_viewed", date_from, date_to)
        st.metric("Image Viewer Opens", fmt(viewer_users), "unique users")
except Exception as e:
    st.error(f"Failed to load image feature stats: {e}")

st.divider()

# ── 8. Plus Menu & Quick Prompts ─────────────────────────────────────

st.markdown("## Plus Menu & Quick Prompts")

try:
    menu = _action_menu_stats(date_from, date_to)
    clears = _clear_history_stats(date_from, date_to)

    m1, m2, m3 = st.columns(3)
    with m1:
        st.metric("Menu Opens", fmt(menu.get("menu_opens", 0)),
                  f"{menu.get('menu_openers', 0):,} users")
    with m2:
        st.metric("Quick Prompt Taps", fmt(menu.get("prompt_taps", 0)),
                  f"{menu.get('prompt_tappers', 0):,} users")
    with m3:
        st.metric("History Cleared", fmt(clears.get("total_clears", 0)),
                  f"{clears.get('users', 0):,} users")

    # Quick prompt text breakdown
    prompt_breakdown = get_property_breakdown(
        "ai_quick_prompt_tapped", "prompt_text", date_from, date_to
    )
    if prompt_breakdown:
        st.markdown("#### Quick Prompt Popularity")
        df_prompts = pd.DataFrame(
            list(prompt_breakdown.items()), columns=["Prompt", "Users"]
        ).sort_values("Users", ascending=False)
        st.dataframe(df_prompts, use_container_width=True, hide_index=True)
except Exception as e:
    st.error(f"Failed to load menu stats: {e}")

st.divider()

# ── 9. Quota ──────────────────────────────────────────────────────────

st.markdown("## Quota")

try:
    quota = _quota_stats(date_from, date_to)
    quota_by_type = _quota_request_type_breakdown(date_from, date_to)

    q1, q2, q3 = st.columns(3)
    with q1:
        st.metric("Quota Exceeded Events", fmt(quota.get("total_hits", 0)),
                  f"{quota.get('unique_users', 0):,} unique users")
    with q2:
        st.metric("Free User Hits", fmt(quota.get("free_hits", 0)))
    with q3:
        st.metric("Subscriber Hits", fmt(quota.get("subscriber_hits", 0)))

    # Quota hit rate relative to all message senders
    quota_users = quota.get("unique_users", 0)
    if message_senders > 0:
        st.info(
            f"**Quota Hit Rate:** {pct(quota_users, message_senders)} "
            f"of message senders hit the quota limit"
        )

    # Breakdown by request type
    if quota_by_type:
        st.markdown("#### Quota Hits by Request Type")
        rows_display = []
        for req_type, data in quota_by_type.items():
            rows_display.append({
                "Request Type": req_type or "unknown",
                "Hits": data["count"],
                "Users": data["users"],
            })
        df_quota = pd.DataFrame(rows_display)
        st.dataframe(df_quota, use_container_width=True, hide_index=True)
except Exception as e:
    st.error(f"Failed to load quota metrics: {e}")

st.divider()

# ── 10. AI Quiz Explanation (Related Feature) ─────────────────────────

st.markdown("## AI Quiz Explanation")
st.caption("Related AI feature outside the chat modal (used in quiz results)")

try:
    quiz_ai = _quiz_explanation_stats(date_from, date_to)

    qe1, qe2 = st.columns(2)
    with qe1:
        st.metric("Explanations Requested",
                  fmt(quiz_ai.get("requested_count", 0)),
                  f"{quiz_ai.get('requested_users', 0):,} users")
    with qe2:
        st.metric("Explanations Generated",
                  fmt(quiz_ai.get("generated_count", 0)),
                  f"{quiz_ai.get('generated_users', 0):,} users")

    req_count = quiz_ai.get("requested_count", 0)
    gen_count = quiz_ai.get("generated_count", 0)
    if req_count > 0:
        st.info(
            f"**Generation Success Rate:** {pct(gen_count, req_count)} "
            f"of explanation requests completed"
        )
except Exception as e:
    st.error(f"Failed to load quiz explanation stats: {e}")

st.divider()

# ── 11. Trends ────────────────────────────────────────────────────────

st.markdown("## Trends")

try:
    # Weekly chat opens
    st.markdown("#### Weekly Chat Openers")
    weekly = _weekly_chat_opens(date_from, date_to)
    if weekly:
        df_weekly = pd.DataFrame(weekly)
        df_weekly["week"] = pd.to_datetime(df_weekly["week"])
        st.line_chart(df_weekly.set_index("week")["users"],
                      use_container_width=True, y_label="Unique users")
    else:
        st.info("Not enough data for weekly trend.")

    # Daily messages sent
    st.markdown("#### Daily Messages Sent (unique users)")
    daily_msgs = get_daily_trend("ai_chat_message_sent", date_from, date_to)
    if not daily_msgs.empty:
        st.line_chart(daily_msgs.set_index("day")["users"],
                      use_container_width=True, y_label="Unique users")
    else:
        st.info("Not enough data for daily message trend.")
except Exception as e:
    st.error(f"Failed to load trends: {e}")

st.divider()

# ── 12. Era Breakdown ─────────────────────────────────────────────────

st.markdown("## Era Breakdown")

try:
    era_breakdown = get_property_breakdown(
        "ai_chat_viewed", "era_id", date_from, date_to
    )
    if era_breakdown:
        df_era = pd.DataFrame(
            list(era_breakdown.items()), columns=["Era ID", "Users"]
        ).sort_values("Users", ascending=False)
        st.dataframe(df_era, use_container_width=True, hide_index=True)
    else:
        st.info("No era breakdown data available.")
except Exception as e:
    st.error(f"Failed to load era breakdown: {e}")

st.divider()

# ── 13. Analysis Questions ────────────────────────────────────────────

st.markdown("## Key Questions (from spec)")

try:
    heavy = _heavy_users(date_from, date_to)

    st.markdown("### Strategic Questions")

    aq1, aq2 = st.columns(2)
    with aq1:
        st.metric("Q1 - Weekly Chat Openers", fmt(chat_openers),
                  "unique users in selected range")
    with aq2:
        st.metric(
            "Q2 - Button vs Chat to Learn",
            f"{entry['floating_button']:,} button / {entry['quiz_results']:,} quiz",
        )

    aq3, aq4 = st.columns(2)
    with aq3:
        st.metric("Q3 - Quota Limit Users", fmt(quota.get("unique_users", 0)))
    with aq4:
        st.metric(
            "Q6 - Zero-Message Sessions",
            fmt(zero["zero"]),
            pct(zero["zero"], zero["total"]) + " of all sessions",
        )

    aq5, aq6 = st.columns(2)
    with aq5:
        total_image_users = (
            img.get("gen_users", 0)
            + img.get("upload_users", 0)
            + img.get("analyzed_users", 0)
            + img.get("edited_users", 0)
        )
        st.metric("Q7 - Image Feature Users", fmt(total_image_users),
                  "generation + upload + analysis + editing")
    with aq6:
        st.metric("Q8 - Heavy Users (>5 opens/day)", fmt(heavy))

    st.markdown("### Behavioral Insights")

    bq1, bq2 = st.columns(2)
    with bq1:
        st.metric("B1 - Suggestion as First Message",
                  fmt(sugg["suggestion"]),
                  pct(sugg["suggestion"], sugg["suggestion"] + sugg["custom"]))
    with bq2:
        st.metric("B2 - Custom First Message",
                  fmt(sugg["custom"]),
                  pct(sugg["custom"], sugg["suggestion"] + sugg["custom"]))

    bq3, bq4 = st.columns(2)
    with bq3:
        ws_resp = web_sources.get("responses_with_sources", 0)
        st.metric("B3 - Responses with Web Sources", fmt(ws_resp))
    with bq4:
        ws_tap = web_sources.get("source_tappers", 0)
        st.metric("B4 - Users Who Tapped a Source Link", fmt(ws_tap),
                  pct(ws_tap, ws_resp) + " of source viewers")

    bq5, bq6 = st.columns(2)
    with bq5:
        st.metric("B5 - Image Generation (text prompts)",
                  fmt(img.get("gen_count", 0)),
                  f"{img.get('gen_users', 0):,} users")
    with bq6:
        st.metric("B6 - Image Uploads (photo library)",
                  fmt(img.get("upload_count", 0)),
                  f"{img.get('upload_users', 0):,} users")

    bq7, bq8 = st.columns(2)
    with bq7:
        st.metric("B7 - Analyzed vs Edited",
                  f"{img.get('analyzed_count', 0):,} analyzed / "
                  f"{img.get('edited_count', 0):,} edited")
    with bq8:
        st.metric("B9 - Images Shared",
                  fmt(img.get("shared_count", 0)),
                  f"{img.get('shared_users', 0):,} users")

    bq9, bq10 = st.columns(2)
    with bq9:
        st.metric("B10 - Action Menu Opens",
                  fmt(menu.get("menu_opens", 0)),
                  f"{menu.get('menu_openers', 0):,} users")
    with bq10:
        st.metric("B12 - Chat History Cleared",
                  fmt(clears.get("total_clears", 0)),
                  f"{clears.get('users', 0):,} users")

    bq11, bq12 = st.columns(2)
    with bq11:
        st.metric("B13 - Users with Errors",
                  fmt(errors.get("unique_users", 0)),
                  f"{errors.get('total_errors', 0):,} total errors")
    with bq12:
        ctl_resp = ctl.get("response_received", 0)
        ctl_tapped = ctl.get("tapped", 0)
        st.metric("B14 - Chat to Learn Completion",
                  fmt(ctl_resp),
                  pct(ctl_resp, ctl_tapped) + " of taps led to response")

    st.markdown("### Checkpoint Validation")

    cp1, cp2, cp3, cp4, cp5 = st.columns(5)
    with cp1:
        st.metric("Chat Viewed", fmt(funnel_viewed))
    with cp2:
        st.metric("Message Sent", fmt(funnel_sent))
    with cp3:
        st.metric("Response Received", fmt(funnel_response))
    with cp4:
        img_gen_users = get_unique_users("ai_image_generated", date_from, date_to)
        st.metric("Image Generated", fmt(img_gen_users))
    with cp5:
        st.metric("Chat Dismissed", fmt(funnel_dismissed))
except Exception as e:
    st.error(f"Failed to load analysis questions: {e}")
