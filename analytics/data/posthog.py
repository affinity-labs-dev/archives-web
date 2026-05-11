"""
Shared PostHog query helpers for all Analytics dashboards.

Centralises config loading, HogQL query execution, and reusable
aggregation helpers so individual page files stay focused on layout.
"""

import os
import re
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import requests
import streamlit as st
from dotenv import load_dotenv

# ── Load .env from analytics/ directory ────────────────────────────────
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)

# ── Config ─────────────────────────────────────────────────────────────
POSTHOG_API_KEY = os.environ.get("POSTHOG_API_KEY", "")
POSTHOG_PROJECT_ID = os.environ.get("POSTHOG_PROJECT_ID", "93650")
POSTHOG_HOST = os.environ.get("POSTHOG_HOST", "https://eu.i.posthog.com")

HEADERS = {"Authorization": f"Bearer {POSTHOG_API_KEY}"}
BASE_URL = f"{POSTHOG_HOST}/api/projects/{POSTHOG_PROJECT_ID}"

# ── Common CSS for dark KPI cards ──────────────────────────────────────
CARD_CSS = """
<style>
div[data-testid="stMetric"] {
    background: #1e1e2e;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 12px 16px;
}
div[data-testid="stMetric"] label {
    font-size: 0.85rem !important;
    color: #ccc !important;
}
div[data-testid="stMetric"] [data-testid="stMetricValue"] {
    color: #fff !important;
}
div[data-testid="stMetric"] [data-testid="stMetricDelta"] {
    color: #aaa !important;
}
.funnel-step {
    border: 1px solid #444;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 8px;
    background: #1a1a2e;
}
.funnel-bar {
    background: linear-gradient(90deg, #C99151, #E6B980);
    border-radius: 4px;
    height: 28px;
    display: flex;
    align-items: center;
    padding-left: 12px;
    color: #fff;
    font-weight: 600;
    font-size: 13px;
    min-width: 40px;
}
</style>
"""


# ── Core query function ────────────────────────────────────────────────

def hogql_query(query: str) -> list[dict]:
    """Run a HogQL query and return rows as list of dicts."""
    if not POSTHOG_API_KEY:
        st.error("Set `POSTHOG_API_KEY` in analytics/.env")
        return []
    try:
        resp = requests.post(
            f"{BASE_URL}/query/",
            headers=HEADERS,
            json={"query": {"kind": "HogQLQuery", "query": query}},
            timeout=30,
        )
    except requests.RequestException as e:
        st.error(f"PostHog request failed: {e}")
        return []
    if resp.status_code != 200:
        st.error(f"PostHog API error {resp.status_code}: {resp.text[:300]}")
        return []
    try:
        data = resp.json()
    except ValueError:
        st.error("PostHog returned invalid JSON")
        return []
    columns = data.get("columns", [])
    rows = data.get("results", [])
    return [dict(zip(columns, row)) for row in rows]


# ── Reusable aggregation helpers ───────────────────────────────────────

def _build_where(*clauses: str) -> str:
    """Combine non-empty WHERE clause fragments with AND."""
    parts = [c for c in clauses if c]
    return " AND ".join(parts) + " AND " if parts else ""


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_unique_users(event_name: str, date_from: str, date_to: str,
                     extra_where: str = "") -> int:
    """Count distinct users who fired a given event."""
    where = _build_where(extra_where)
    q = f"""
        SELECT count(DISTINCT distinct_id) as cnt
        FROM events
        WHERE event = '{event_name}'
          AND {where}timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    return rows[0]["cnt"] if rows else 0


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_event_count(event_name: str, date_from: str, date_to: str,
                    extra_where: str = "") -> int:
    """Count total occurrences of an event."""
    where = _build_where(extra_where)
    q = f"""
        SELECT count() as cnt
        FROM events
        WHERE event = '{event_name}'
          AND {where}timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    return rows[0]["cnt"] if rows else 0


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_property_breakdown(event_name: str, property_name: str,
                           date_from: str, date_to: str) -> dict:
    """Break down an event by a property value -> {value: count}."""
    q = f"""
        SELECT toString(properties.{property_name}) as val,
               count(DISTINCT distinct_id) as cnt
        FROM events
        WHERE event = '{event_name}'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
        GROUP BY val
        ORDER BY cnt DESC
    """
    rows = hogql_query(q)
    return {r["val"]: r["cnt"] for r in rows}


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_avg_property(event_name: str, property_name: str,
                     date_from: str, date_to: str,
                     extra_where: str = "") -> float | None:
    """Average of a numeric event property."""
    where = _build_where(extra_where)
    q = f"""
        SELECT avg(toFloat(properties.{property_name})) as avg_val
        FROM events
        WHERE event = '{event_name}'
          AND {where}timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows and rows[0]["avg_val"] is not None:
        return float(rows[0]["avg_val"])
    return None


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_median_property(event_name: str, property_name: str,
                        date_from: str, date_to: str,
                        extra_where: str = "") -> float | None:
    """Median of a numeric event property."""
    where = _build_where(extra_where)
    q = f"""
        SELECT median(toInt(properties.{property_name})) as med_val
        FROM events
        WHERE event = '{event_name}'
          AND {where}timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """
    rows = hogql_query(q)
    if rows and rows[0]["med_val"] is not None:
        return float(rows[0]["med_val"])
    return None


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_avg_seconds_between(event_a: str, event_b: str,
                            date_from: str, date_to: str) -> float | None:
    """Average seconds between two events per user."""
    q = f"""
        SELECT avg(secs) as avg_secs
        FROM (
            SELECT
                distinct_id,
                dateDiff('second',
                    argMin(timestamp, if(event = '{event_a}', timestamp, toDateTime('2099-01-01'))),
                    argMin(timestamp, if(event = '{event_b}', timestamp, toDateTime('2099-01-01')))
                ) as secs
            FROM events
            WHERE event IN ('{event_a}', '{event_b}')
              AND timestamp >= '{date_from}'
              AND timestamp < '{date_to}'
            GROUP BY distinct_id
            HAVING
                countIf(event = '{event_a}') > 0
                AND countIf(event = '{event_b}') > 0
                AND secs > 0
        )
    """
    rows = hogql_query(q)
    if rows and rows[0]["avg_secs"] is not None:
        return float(rows[0]["avg_secs"])
    return None


@st.cache_data(ttl=300, show_spinner="Querying PostHog...")
def get_daily_trend(event_name: str, date_from: str, date_to: str,
                    extra_where: str = "") -> pd.DataFrame:
    """Daily unique users for an event over time."""
    where = _build_where(extra_where)
    q = f"""
        SELECT toDate(timestamp) as day,
               count(DISTINCT distinct_id) as users
        FROM events
        WHERE event = '{event_name}'
          AND {where}timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
        GROUP BY day
        ORDER BY day
    """
    rows = hogql_query(q)
    if not rows:
        return pd.DataFrame(columns=["day", "users"])
    df = pd.DataFrame(rows)
    df["day"] = pd.to_datetime(df["day"])
    return df


# ── Sidebar boilerplate ────────────────────────────────────────────────

def setup_sidebar(title: str, spec_ref: str = "AFF-844"):
    """Render the common sidebar: title, date picker, refresh button.
    Returns (date_from, date_to, refresh_clicked).
    """
    st.sidebar.title(title)
    st.sidebar.caption(f"{spec_ref} | PostHog project {POSTHOG_PROJECT_ID}")

    if not POSTHOG_API_KEY:
        st.sidebar.error(
            "Set `POSTHOG_API_KEY` in analytics/.env\n\n"
            "Get one from PostHog -> Settings -> Personal API Keys."
        )
        st.stop()

    today = datetime.now().date()
    default_start = today - timedelta(days=30)
    date_start = st.sidebar.date_input("From", value=default_start)
    date_end = st.sidebar.date_input("To", value=today)

    if date_start > date_end:
        st.sidebar.error("Start date must be before end date.")
        st.stop()

    date_from = str(date_start)
    date_to = str(date_end + timedelta(days=1))

    st.sidebar.markdown("---")
    refresh = st.sidebar.button("Refresh data")

    return date_from, date_to, refresh


# ── Funnel renderer ───────────────────────────────────────────────────

def render_funnel(steps: list[tuple[str, int]], title: str = "Funnel"):
    """Render a horizontal bar funnel from a list of (label, count) tuples."""
    if not steps:
        st.info("No funnel data available.")
        return

    st.subheader(title)
    max_count = max(c for _, c in steps) or 1

    for i, (label, count) in enumerate(steps):
        pct_of_top = count / steps[0][1] * 100 if steps[0][1] else 0
        bar_width = max(count / max_count * 100, 5)
        step_pct = ""
        if i > 0 and steps[i - 1][1] > 0:
            step_pct = f" ({count / steps[i - 1][1] * 100:.0f}% of prev)"

        st.markdown(f"""
        <div class="funnel-step">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                <span style="color:#eee;font-weight:600;font-size:14px">{label}</span>
                <span style="color:#999;font-size:12px">{count:,} users ({pct_of_top:.0f}%){step_pct}</span>
            </div>
            <div class="funnel-bar" style="width:{bar_width}%">{count:,}</div>
        </div>
        """, unsafe_allow_html=True)


def safe_pct(numerator: int, denominator: int) -> str:
    """Return percentage string, or '-' if denominator is 0."""
    if denominator == 0:
        return "-"
    return f"{numerator / denominator * 100:.1f}%"


def safe_delta(numerator: int, denominator: int) -> str:
    """Return delta string for st.metric, or None if denominator is 0."""
    if denominator == 0:
        return None
    return f"{numerator / denominator * 100:.0f}%"
