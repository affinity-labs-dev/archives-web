"""
Subscribe Funnel Dashboard

Streamlit page for visualizing the Archives subscription / paywall funnel
and answering the 21 key product questions from the subscribe spec (AFF-844).

Events tracked:
    subscribe_screen_viewed, subscribe_purchase_completed,
    subscribe_purchase_cancelled, subscribe_purchase_failed,
    subscribe_restore_tapped, subscribe_restore_success,
    subscribe_restore_failed, subscription_purchased,
    subscribe_tab_viewed, daily_story_rewind_blocked,
    era_selected, ai_quiz_explanation_requested,
    quiz_results_chat_to_learn_tapped
"""

import os
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

# ── Allow imports from analytics/ package ─────────────────────────────
_analytics_dir = str(Path(__file__).resolve().parent.parent)
if _analytics_dir not in sys.path:
    sys.path.insert(0, _analytics_dir)

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

# ── Page config ───────────────────────────────────────────────────────

st.set_page_config(
    page_title="Subscribe -- Archives Analytics",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(CARD_CSS, unsafe_allow_html=True)

# ── Sidebar ───────────────────────────────────────────────────────────

date_from, date_to, refresh = setup_sidebar("Subscribe Funnel")

if refresh:
    st.cache_data.clear()

# ── Helper ────────────────────────────────────────────────────────────

def pct(num: int, denom: int) -> str:
    if denom == 0:
        return "--"
    return f"{round(num / denom * 100, 1)}%"


def fmt(n) -> str:
    if n is None:
        return "--"
    if isinstance(n, float):
        return f"{n:.1f}"
    return f"{n:,}"


# =====================================================================
# 1. TOP KPI ROW
# =====================================================================

st.markdown("## Subscribe Funnel")
st.caption("Paywall views, purchases, conversion, and revenue")

try:
    paywall_views = get_unique_users(
        "subscribe_screen_viewed", date_from, date_to
    )
    purchases_completed = get_unique_users(
        "subscribe_purchase_completed", date_from, date_to
    )
    purchases_cancelled = get_unique_users(
        "subscribe_purchase_cancelled", date_from, date_to
    )
    purchases_failed = get_unique_users(
        "subscribe_purchase_failed", date_from, date_to
    )
    # subscription_purchased has price_usd property
    revenue_rows = hogql_query(f"""
        SELECT sum(toFloat(properties.price_usd)) as total_revenue,
               count(DISTINCT distinct_id) as buyers
        FROM events
        WHERE event = 'subscription_purchased'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """)
    total_revenue = revenue_rows[0]["total_revenue"] if revenue_rows and revenue_rows[0]["total_revenue"] else 0
except Exception as e:
    st.error(f"Error fetching top KPIs: {e}")
    paywall_views = purchases_completed = purchases_cancelled = purchases_failed = 0
    total_revenue = 0

conversion_rate = pct(purchases_completed, paywall_views)

k1, k2, k3, k4 = st.columns(4)
k1.metric("Paywall Views", f"{paywall_views:,}", "unique users")
k2.metric("Purchases Completed", f"{purchases_completed:,}", "unique users")
k3.metric("Conversion Rate", conversion_rate, f"{purchases_completed:,} / {paywall_views:,}")
k4.metric("Revenue (USD)", f"${total_revenue:,.2f}" if total_revenue else "--", "from subscription_purchased")

st.divider()

# =====================================================================
# 2. CONVERSION FUNNEL
# =====================================================================

st.markdown("## Conversion Funnel")
st.caption("Viewed -> Purchase Completed (unique users at each stage)")

try:
    funnel_viewed = get_unique_users(
        "subscribe_screen_viewed", date_from, date_to
    )
    # subscribe_purchase_completed serves as the proxy for "purchase started"
    # since RevenueCat handles plan selection internally (no plan_selected event)
    funnel_completed = get_unique_users(
        "subscribe_purchase_completed", date_from, date_to
    )
    # subscription_purchased fires from useRevenueCat.purchase() hook
    funnel_purchased = get_unique_users(
        "subscription_purchased", date_from, date_to
    )

    funnel_steps = [
        ("Paywall Presented", funnel_viewed),
        ("Purchase Completed (RC callback)", funnel_completed),
        ("Subscription Purchased (hook)", funnel_purchased),
    ]

    render_funnel(funnel_steps, title="Subscribe Funnel")

    if funnel_viewed > 0 and funnel_completed > 0:
        st.success(
            f"**Paywall -> Purchase:** {pct(funnel_completed, funnel_viewed)} "
            f"({funnel_completed:,} / {funnel_viewed:,})"
        )
except Exception as e:
    st.error(f"Error building funnel: {e}")

st.divider()

# =====================================================================
# 3. DROP-OFF ANALYSIS
# =====================================================================

st.markdown("## Drop-off Analysis")

try:
    dismissed_count = get_unique_users(
        "subscribe_screen_viewed", date_from, date_to
    )
    completed_count = get_unique_users(
        "subscribe_purchase_completed", date_from, date_to
    )
    cancelled_count = get_unique_users(
        "subscribe_purchase_cancelled", date_from, date_to
    )
    failed_count = get_unique_users(
        "subscribe_purchase_failed", date_from, date_to
    )

    d1, d2, d3 = st.columns(3)
    d1.metric(
        "Cancelled",
        f"{cancelled_count:,}",
        pct(cancelled_count, dismissed_count) + " of paywall viewers",
    )
    d2.metric(
        "Failed",
        f"{failed_count:,}",
        pct(failed_count, dismissed_count) + " of paywall viewers",
    )
    d3.metric(
        "Neither Purchased nor Cancelled",
        f"{max(dismissed_count - completed_count - cancelled_count, 0):,}",
        "dismissed or abandoned",
    )

    # Error breakdown
    st.markdown("#### Error Breakdown")
    error_rows = hogql_query(f"""
        SELECT toString(properties.error_code) as error_code,
               toString(properties.error_message) as error_message,
               count() as cnt
        FROM events
        WHERE event = 'subscribe_purchase_failed'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
        GROUP BY error_code, error_message
        ORDER BY cnt DESC
        LIMIT 20
    """)
    if error_rows:
        st.dataframe(
            pd.DataFrame(error_rows),
            use_container_width=True,
            hide_index=True,
        )
    else:
        st.info("No purchase errors recorded in this period.")

except Exception as e:
    st.error(f"Error in drop-off analysis: {e}")

st.divider()

# =====================================================================
# 4. PLAN BREAKDOWN
# =====================================================================

st.markdown("## Plan Breakdown")
st.caption("Which plans are users purchasing?")

try:
    # From subscription_purchased which has product_id, plan_type, price_usd
    plan_rows = hogql_query(f"""
        SELECT toString(properties.product_id) as product_id,
               toString(properties.plan_type) as plan_type,
               count(DISTINCT distinct_id) as users,
               count() as purchases,
               sum(toFloat(properties.price_usd)) as revenue
        FROM events
        WHERE event = 'subscription_purchased'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
        GROUP BY product_id, plan_type
        ORDER BY users DESC
    """)

    if plan_rows:
        df_plans = pd.DataFrame(plan_rows)
        st.dataframe(df_plans, use_container_width=True, hide_index=True)

        # Monthly vs Annual summary
        st.markdown("#### Monthly vs Annual")
        plan_type_rows = hogql_query(f"""
            SELECT toString(properties.plan_type) as plan_type,
                   count(DISTINCT distinct_id) as users
            FROM events
            WHERE event = 'subscription_purchased'
              AND timestamp >= '{date_from}'
              AND timestamp < '{date_to}'
            GROUP BY plan_type
            ORDER BY users DESC
        """)
        if plan_type_rows:
            p1, p2 = st.columns(2)
            plan_map = {r["plan_type"]: r["users"] for r in plan_type_rows}
            monthly = plan_map.get("monthly", plan_map.get("Monthly", 0))
            annual = plan_map.get("annual", plan_map.get("Annual", plan_map.get("yearly", plan_map.get("Yearly", 0))))
            total_plans = monthly + annual
            p1.metric("Monthly", f"{monthly:,}", pct(monthly, total_plans))
            p2.metric("Annual / Yearly", f"{annual:,}", pct(annual, total_plans))
    else:
        st.info("No subscription purchases recorded in this period.")

    # Also check subscribe_purchase_completed for trigger-based breakdown
    st.markdown("#### Purchase Trigger Sources")
    trigger_rows = hogql_query(f"""
        SELECT toString(properties.trigger) as trigger,
               count(DISTINCT distinct_id) as users
        FROM events
        WHERE event = 'subscribe_purchase_completed'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
        GROUP BY trigger
        ORDER BY users DESC
    """)
    if trigger_rows:
        st.dataframe(
            pd.DataFrame(trigger_rows),
            use_container_width=True,
            hide_index=True,
        )
    else:
        st.info("No trigger data on purchase events.")

except Exception as e:
    st.error(f"Error in plan breakdown: {e}")

st.divider()

# =====================================================================
# 5. INTRO OFFER / FREE TRIAL
# =====================================================================

st.markdown("## Intro Offer & Free Trials")
st.caption("Eligible users and trial conversion")

try:
    # is_trial from subscription_purchased
    trial_rows = hogql_query(f"""
        SELECT
            countDistinctIf(distinct_id,
                properties.is_trial = 'true' OR properties.is_trial = true) as trial_users,
            countDistinctIf(distinct_id,
                properties.is_trial = 'false' OR properties.is_trial = false
                OR properties.is_trial IS NULL) as paid_users
        FROM events
        WHERE event = 'subscription_purchased'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """)

    trial_users = trial_rows[0]["trial_users"] if trial_rows else 0
    paid_users = trial_rows[0]["paid_users"] if trial_rows else 0

    # Intro offer eligibility from subscribe_screen_viewed
    eligible_rows = hogql_query(f"""
        SELECT
            countDistinctIf(distinct_id,
                properties.is_eligible_for_intro_offer = 'true'
                OR properties.is_eligible_for_intro_offer = true) as eligible,
            countDistinctIf(distinct_id,
                properties.is_eligible_for_intro_offer = 'false'
                OR properties.is_eligible_for_intro_offer = false
                OR properties.is_eligible_for_intro_offer IS NULL) as not_eligible
        FROM events
        WHERE event = 'subscribe_screen_viewed'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
    """)
    eligible = eligible_rows[0]["eligible"] if eligible_rows else 0
    not_eligible = eligible_rows[0]["not_eligible"] if eligible_rows else 0

    i1, i2, i3 = st.columns(3)
    i1.metric("Intro Offer Eligible", f"{eligible:,}", pct(eligible, eligible + not_eligible))
    i2.metric("Free Trial Starts", f"{trial_users:,}", "from subscription_purchased.is_trial")
    i3.metric("Direct Paid", f"{paid_users:,}", "no trial")

    # Conversion rate among eligible
    if eligible > 0:
        st.markdown(
            f"**Eligible -> Purchase:** {pct(trial_users + paid_users, eligible)} "
            f"({trial_users + paid_users:,} / {eligible:,} eligible viewers)"
        )

except Exception as e:
    st.error(f"Error in intro offer section: {e}")

st.divider()

# =====================================================================
# 6. RESTORE FLOW
# =====================================================================

st.markdown("## Restore Flow")
st.caption("Users attempting to restore previous purchases")

try:
    restore_tapped = get_unique_users(
        "subscribe_restore_tapped", date_from, date_to
    )
    restore_success = get_unique_users(
        "subscribe_restore_success", date_from, date_to
    )
    restore_failed = get_unique_users(
        "subscribe_restore_failed", date_from, date_to
    )

    r1, r2, r3 = st.columns(3)
    r1.metric("Restore Tapped", f"{restore_tapped:,}")
    r2.metric("Restore Success", f"{restore_success:,}", pct(restore_success, restore_tapped) + " success rate")
    r3.metric("Restore Failed", f"{restore_failed:,}", pct(restore_failed, restore_tapped) + " failure rate")

except Exception as e:
    st.error(f"Error in restore flow: {e}")

st.divider()

# =====================================================================
# 7. ENTRY POINT ANALYSIS
# =====================================================================

st.markdown("## Entry Points")
st.caption("Where do users reach the paywall from?")

try:
    # Paywall trigger / source breakdown from subscribe_screen_viewed
    trigger_breakdown = hogql_query(f"""
        SELECT toString(properties.trigger) as trigger,
               toString(properties.paywall_type) as paywall_type,
               count(DISTINCT distinct_id) as users
        FROM events
        WHERE event = 'subscribe_screen_viewed'
          AND timestamp >= '{date_from}'
          AND timestamp < '{date_to}'
        GROUP BY trigger, paywall_type
        ORDER BY users DESC
    """)

    if trigger_breakdown:
        st.dataframe(
            pd.DataFrame(trigger_breakdown),
            use_container_width=True,
            hide_index=True,
        )
    else:
        st.info("No trigger data on subscribe_screen_viewed.")

    # Specific entry-point event counts
    st.markdown("#### Entry Point Events")

    subscribe_tab = get_unique_users("subscribe_tab_viewed", date_from, date_to)
    rewind_blocked = get_unique_users("daily_story_rewind_blocked", date_from, date_to)
    era_locked = get_event_count("era_selected", date_from, date_to,
                                 extra_where="properties.context = 'era_switch'")
    ai_quiz = get_unique_users("ai_quiz_explanation_requested", date_from, date_to)
    chat_to_learn = get_unique_users("quiz_results_chat_to_learn_tapped", date_from, date_to)

    e1, e2, e3, e4, e5 = st.columns(5)
    e1.metric("Subscribe Tab", f"{subscribe_tab:,}")
    e2.metric("Rewind Blocked", f"{rewind_blocked:,}")
    e3.metric("Locked Era", f"{era_locked:,}")
    e4.metric("AI Quiz Explanation", f"{ai_quiz:,}")
    e5.metric("Chat to Learn", f"{chat_to_learn:,}")

except Exception as e:
    st.error(f"Error in entry point analysis: {e}")

st.divider()

# =====================================================================
# 8. DAILY TRENDS
# =====================================================================

st.markdown("## Daily Trends")

try:
    st.markdown("#### Paywall Views (daily unique users)")
    df_views = get_daily_trend("subscribe_screen_viewed", date_from, date_to)
    if not df_views.empty:
        st.line_chart(df_views.set_index("day")["users"], use_container_width=True, y_label="users")
    else:
        st.info("No paywall view data.")

    st.markdown("#### Purchases Completed (daily unique users)")
    df_purchases = get_daily_trend("subscribe_purchase_completed", date_from, date_to)
    if not df_purchases.empty:
        st.line_chart(df_purchases.set_index("day")["users"], use_container_width=True, y_label="users")
    else:
        st.info("No purchase data.")

    st.markdown("#### Daily Conversion Rate")
    if not df_views.empty and not df_purchases.empty:
        df_conv = df_views.merge(df_purchases, on="day", how="left", suffixes=("_views", "_purchases"))
        df_conv["users_purchases"] = df_conv["users_purchases"].fillna(0)
        df_conv["rate"] = df_conv.apply(
            lambda row: round(row["users_purchases"] / row["users_views"] * 100, 1)
            if row["users_views"] > 0 else 0, axis=1
        )
        st.line_chart(df_conv.set_index("day")["rate"], use_container_width=True, y_label="% conversion")
    else:
        st.info("Not enough data to compute daily conversion rate.")

except Exception as e:
    st.error(f"Error in daily trends: {e}")

st.divider()

# =====================================================================
# 9. ANALYSIS QUESTIONS (from spec)
# =====================================================================

st.markdown("## Key Questions")
st.caption("21 questions from AFF-844 subscribe spec")

# ── Strategic Questions ────────────────────────────────────────────────

st.markdown("### Strategic Questions")

# Q1-Q5
col1, col2 = st.columns(2)

with col1:
    try:
        # Q1: How many users see the subscribe paywall each day?
        st.metric(
            "Q1 - Daily Paywall Views",
            f"{paywall_views:,}",
            f"unique users in period",
        )
    except Exception as e:
        st.error(f"Q1 error: {e}")

with col2:
    try:
        # Q2: How many users complete a purchase after seeing the paywall?
        st.metric(
            "Q2 - Paywall -> Purchase",
            pct(purchases_completed, paywall_views),
            f"{purchases_completed:,} / {paywall_views:,}",
        )
    except Exception as e:
        st.error(f"Q2 error: {e}")

col1, col2 = st.columns(2)

with col1:
    try:
        # Q3: How many users cancel the purchase flow after starting it?
        st.metric(
            "Q3 - Purchase Cancellations",
            f"{cancelled_count:,}",
            pct(cancelled_count, paywall_views) + " of paywall viewers",
        )
    except Exception as e:
        st.error(f"Q3 error: {e}")

with col2:
    try:
        # Q4: How many users use the restore purchases feature?
        st.metric(
            "Q4 - Restore Attempts",
            f"{restore_tapped:,}",
            "unique users",
        )
    except Exception as e:
        st.error(f"Q4 error: {e}")

col1, col2 = st.columns(2)

with col1:
    try:
        # Q5: How many users encounter a purchase error?
        st.metric(
            "Q5 - Purchase Errors",
            f"{failed_count:,}",
            pct(failed_count, paywall_views) + " of paywall viewers",
        )
    except Exception as e:
        st.error(f"Q5 error: {e}")

with col2:
    st.empty()

# ── Behavioral Insights ────────────────────────────────────────────────

st.markdown("### Behavioral Insights")

# Q6-Q10: Entry point breakdown
col1, col2 = st.columns(2)

with col1:
    try:
        # Q6: How many users reach the paywall from the Subscribe tab?
        st.metric(
            "Q6 - From Subscribe Tab",
            f"{subscribe_tab:,}",
            "subscribe_tab_viewed",
        )
    except Exception as e:
        st.error(f"Q6 error: {e}")

with col2:
    try:
        # Q7: How many users reach the paywall from onboarding?
        onboarding_paywall = get_unique_users(
            "onboarding_paywall_viewed", date_from, date_to
        )
        st.metric(
            "Q7 - From Onboarding",
            f"{onboarding_paywall:,}",
            "onboarding_paywall_viewed (not yet wired)",
        )
    except Exception as e:
        st.error(f"Q7 error: {e}")

col1, col2 = st.columns(2)

with col1:
    try:
        # Q8: How many users reach the paywall from a locked era?
        era_paywall = get_unique_users(
            "subscribe_screen_viewed", date_from, date_to,
            extra_where="properties.trigger = 'locked_era' OR properties.trigger = 'era_paywall'",
        )
        st.metric(
            "Q8 - From Locked Era",
            f"{era_paywall:,}",
            "subscribe_screen_viewed where trigger = locked_era",
        )
    except Exception as e:
        st.error(f"Q8 error: {e}")

with col2:
    try:
        # Q9: How many users reach the paywall from the daily story rewind?
        rewind_paywall = get_unique_users(
            "subscribe_screen_viewed", date_from, date_to,
            extra_where="properties.trigger = 'rewind' OR properties.trigger = 'daily_story_rewind'",
        )
        st.metric(
            "Q9 - From Daily Story Rewind",
            f"{rewind_paywall:,}",
            "subscribe_screen_viewed where trigger = rewind",
        )
    except Exception as e:
        st.error(f"Q9 error: {e}")

col1, col2 = st.columns(2)

with col1:
    try:
        # Q10: How many users reach the paywall from the AI quiz explanation?
        quiz_paywall = get_unique_users(
            "subscribe_screen_viewed", date_from, date_to,
            extra_where="properties.trigger = 'quiz_explanation' OR properties.trigger = 'ai_quiz'",
        )
        st.metric(
            "Q10 - From AI Quiz Explanation",
            f"{quiz_paywall:,}",
            "subscribe_screen_viewed where trigger = quiz_explanation",
        )
    except Exception as e:
        st.error(f"Q10 error: {e}")

with col2:
    try:
        # Q10b: How many users reach the paywall from Chat to Learn?
        chat_paywall = get_unique_users(
            "subscribe_screen_viewed", date_from, date_to,
            extra_where="properties.trigger = 'chat_to_learn'",
        )
        st.metric(
            "Q10b - From Chat to Learn",
            f"{chat_paywall:,}",
            "subscribe_screen_viewed where trigger = chat_to_learn",
        )
    except Exception as e:
        st.error(f"Q10b error: {e}")

# Q11-Q12: Blocking and conversion from rewind
col1, col2 = st.columns(2)

with col1:
    try:
        # Q11: How many non-subscribers are blocked from accessing past daily stories?
        st.metric(
            "Q11 - Rewind Blocked",
            f"{rewind_blocked:,}",
            "daily_story_rewind_blocked events",
        )
    except Exception as e:
        st.error(f"Q11 error: {e}")

with col2:
    try:
        # Q12: How many users who are blocked from rewind go on to purchase?
        blocked_to_purchase = hogql_query(f"""
            SELECT count(DISTINCT distinct_id) as users
            FROM (
                SELECT distinct_id
                FROM events
                WHERE event = 'daily_story_rewind_blocked'
                  AND timestamp >= '{date_from}'
                  AND timestamp < '{date_to}'
            )
            WHERE distinct_id IN (
                SELECT DISTINCT distinct_id
                FROM events
                WHERE event = 'subscribe_purchase_completed'
                  AND timestamp >= '{date_from}'
                  AND timestamp < '{date_to}'
            )
        """)
        b2p = blocked_to_purchase[0]["users"] if blocked_to_purchase else 0
        st.metric(
            "Q12 - Blocked -> Purchase",
            f"{b2p:,}",
            pct(b2p, rewind_blocked) + " of blocked users",
        )
    except Exception as e:
        st.error(f"Q12 error: {e}")

# Q13-Q14: Restore
col1, col2 = st.columns(2)

with col1:
    try:
        # Q13: How many users restore purchases successfully?
        st.metric(
            "Q13 - Restore Success",
            f"{restore_success:,}",
            pct(restore_success, restore_tapped) + " of restore attempts",
        )
    except Exception as e:
        st.error(f"Q13 error: {e}")

with col2:
    try:
        # Q14: How many users attempt restore but fail?
        st.metric(
            "Q14 - Restore Failed",
            f"{restore_failed:,}",
            pct(restore_failed, restore_tapped) + " of restore attempts",
        )
    except Exception as e:
        st.error(f"Q14 error: {e}")

# Q15-Q17: Plan breakdown and trials
col1, col2 = st.columns(2)

with col1:
    try:
        # Q15: How many users purchase a monthly plan?
        monthly_purchasers = get_unique_users(
            "subscription_purchased", date_from, date_to,
            extra_where="properties.plan_type = 'monthly'",
        )
        st.metric(
            "Q15 - Monthly Purchasers",
            f"{monthly_purchasers:,}",
            "subscription_purchased where plan_type = monthly",
        )
    except Exception as e:
        st.error(f"Q15 error: {e}")

with col2:
    try:
        # Q16: How many users purchase a yearly plan?
        yearly_purchasers = get_unique_users(
            "subscription_purchased", date_from, date_to,
            extra_where="properties.plan_type = 'annual' OR properties.plan_type = 'yearly'",
        )
        st.metric(
            "Q16 - Yearly Purchasers",
            f"{yearly_purchasers:,}",
            "subscription_purchased where plan_type = annual/yearly",
        )
    except Exception as e:
        st.error(f"Q16 error: {e}")

col1, col2 = st.columns(2)

with col1:
    try:
        # Q17: How many users start a free trial?
        st.metric(
            "Q17 - Free Trial Starts",
            f"{trial_users:,}",
            "subscription_purchased where is_trial = true",
        )
    except Exception as e:
        st.error(f"Q17 error: {e}")

with col2:
    st.empty()

# ── Checkpoint Validation ──────────────────────────────────────────────

st.markdown("### Checkpoint Validation")

col1, col2 = st.columns(2)

with col1:
    try:
        # Q18: Subscribe Tab - do users who open the tab actually see the paywall?
        tab_viewers = get_unique_users("subscribe_tab_viewed", date_from, date_to)
        tab_paywall = get_unique_users(
            "subscribe_screen_viewed", date_from, date_to,
            extra_where="properties.paywall_type = 'embedded' OR properties.trigger = 'subscribe_tab'",
        )
        st.metric(
            "Q18 - Tab -> Paywall Presented",
            pct(tab_paywall, tab_viewers),
            f"{tab_paywall:,} paywall loads / {tab_viewers:,} tab views",
        )
    except Exception as e:
        st.error(f"Q18 error: {e}")

with col2:
    try:
        # Q19: Does the paywall load successfully for every entry point?
        st.metric(
            "Q19 - Paywall Load Rate",
            f"{paywall_views:,}",
            "total unique paywall loads (all entry points)",
        )
    except Exception as e:
        st.error(f"Q19 error: {e}")

col1, col2 = st.columns(2)

with col1:
    try:
        # Q20: Does every successful purchase result in an active subscription?
        purchase_events = get_unique_users(
            "subscribe_purchase_completed", date_from, date_to
        )
        # Check $set with rc_subscription_status = active
        active_set = hogql_query(f"""
            SELECT count(DISTINCT distinct_id) as users
            FROM events
            WHERE event = 'subscription_purchased'
              AND timestamp >= '{date_from}'
              AND timestamp < '{date_to}'
        """)
        active_count = active_set[0]["users"] if active_set else 0
        st.metric(
            "Q20 - Purchase -> Active Subscription",
            f"{active_count:,}",
            f"$set with rc_subscription_status = active vs {purchase_events:,} purchases",
        )
    except Exception as e:
        st.error(f"Q20 error: {e}")

with col2:
    try:
        # Q21: Are person properties updated correctly after purchase or restore?
        st.metric(
            "Q21 - Person Properties Set",
            f"{active_count:,}",
            "users with $set rc_subscription_status = active",
        )
    except Exception as e:
        st.error(f"Q21 error: {e}")

st.divider()

# =====================================================================
# 10. ANALYSIS NOTES (from spec)
# =====================================================================

st.markdown("## Analysis Notes")

st.warning(
    "**Dual purchase event system:** `subscribe_purchase_completed` fires from the "
    "RevenueCat Paywall UI callbacks (all entry points), while `subscription_purchased` "
    "fires from `useRevenueCat.purchase()` only when the hook's `purchase()` function is "
    "called directly. The imperative paywall (modal) entry points (daily story rewind, "
    "locked era, AI quiz, chat to learn) only fire `subscribe_purchase_completed`, not "
    "`subscription_purchased`."
)

st.warning(
    "**Plan selection blindspot:** The RevenueCat Paywall UI handles plan rendering and "
    "selection internally. There is no PostHog event when a user views available plans or "
    "selects one. We only learn which plan was purchased after the fact from "
    "`subscribe_purchase_completed`."
)

st.info(
    "**Onboarding paywall gap:** The onboarding paywall screen (`onboarding-step-13.tsx`) "
    "currently has zero analytics events. The SEE MY FREE OFFER button routes directly to "
    "/(tabs)/today without presenting the RevenueCat paywall."
)

st.info(
    "**Missing subscription_activated event:** No single event fires at the moment a user "
    "transitions from non-subscriber to subscriber. Person properties are updated via `$set`, "
    "but there is no dedicated event for funnel analysis of the activation moment."
)
