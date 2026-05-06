"""
Profile Flow Dashboard

Streamlit page for visualizing profile tab engagement, avatar usage,
achievement/badge browsing, settings interactions, and account actions.

Events sourced from the Archives Profile Flow Spec (AFF-844).
"""

import os
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

# ── Allow imports from analytics/ ──────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from data.posthog import (
    CARD_CSS,
    hogql_query,
    setup_sidebar,
    render_funnel,
    safe_pct,
    get_unique_users,
    get_event_count,
    get_property_breakdown,
    get_daily_trend,
    get_avg_property,
    get_median_property,
)

# ── Page config ────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Profile -- Archives Analytics",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(CARD_CSS, unsafe_allow_html=True)

# ── Sidebar ────────────────────────────────────────────────────────────

date_from, date_to, refresh = setup_sidebar("Profile")

if refresh:
    st.cache_data.clear()

# ── Helpers ────────────────────────────────────────────────────────────

def fmt(n) -> str:
    """Format a number for display."""
    if n is None:
        return "--"
    if isinstance(n, float):
        return f"{n:.1f}"
    return f"{n:,}"


def pct(num: int, denom: int) -> str:
    """Return a percentage string, or -- if denominator is 0."""
    if denom == 0:
        return "--"
    return f"{round(num / denom * 100, 1)}%"


# =====================================================================
#  1. TOP KPI ROW
# =====================================================================

st.markdown("## Profile Overview")

try:
    kpi_profile_views = get_event_count(
        "profile_tab_viewed", date_from, date_to
    )
    kpi_unique_viewers = get_unique_users(
        "profile_tab_viewed", date_from, date_to
    )
    kpi_page_views = get_event_count(
        "page_view", date_from, date_to,
        extra_where="properties.page_name = 'profile'",
    )
    kpi_stats_expanded = get_unique_users(
        "profile_stats_expanded", date_from, date_to
    )
    kpi_avatar_selected = get_unique_users(
        "profile_avatar_selected", date_from, date_to
    )
    kpi_settings_opened = get_unique_users(
        "profile_settings_viewed", date_from, date_to
    )
except Exception as e:
    st.error(f"Error fetching KPIs: {e}")
    kpi_profile_views = kpi_unique_viewers = kpi_page_views = 0
    kpi_stats_expanded = kpi_avatar_selected = kpi_settings_opened = 0

c1, c2, c3, c4 = st.columns(4)
with c1:
    st.metric("Profile Views", fmt(kpi_profile_views),
              f"{fmt(kpi_unique_viewers)} unique users")
with c2:
    st.metric("Page Views (page_view)", fmt(kpi_page_views))
with c3:
    st.metric("Stats Expanded", fmt(kpi_stats_expanded),
              pct(kpi_stats_expanded, kpi_unique_viewers) + " of viewers")
with c4:
    st.metric("Avatar Changes", fmt(kpi_avatar_selected),
              pct(kpi_avatar_selected, kpi_unique_viewers) + " of viewers")

st.divider()

# =====================================================================
#  2. PROFILE ENGAGEMENT FUNNEL
# =====================================================================

st.markdown("## Profile Engagement Funnel")

try:
    funnel_tab_viewed = get_unique_users("profile_tab_viewed", date_from, date_to)
    funnel_stats_expanded = get_unique_users("profile_stats_expanded", date_from, date_to)
    funnel_achievement_tapped = get_unique_users("profile_achievement_tapped", date_from, date_to)
    funnel_badge_tapped = get_unique_users("profile_badge_tapped", date_from, date_to)
    funnel_avatar_tapped = get_unique_users("profile_avatar_tapped", date_from, date_to)
    funnel_settings_viewed = get_unique_users("profile_settings_viewed", date_from, date_to)
    funnel_sign_out = get_unique_users("profile_sign_out_tapped", date_from, date_to)

    funnel_steps = [
        ("Profile Tab Viewed", funnel_tab_viewed),
        ("Stats Expanded", funnel_stats_expanded),
        ("Achievement Tapped", funnel_achievement_tapped),
        ("Badge Tapped", funnel_badge_tapped),
        ("Avatar Tapped", funnel_avatar_tapped),
        ("Settings Opened", funnel_settings_viewed),
        ("Sign Out Tapped", funnel_sign_out),
    ]
    render_funnel(funnel_steps, title="Profile Interaction Depth")
except Exception as e:
    st.error(f"Error building funnel: {e}")

st.divider()

# =====================================================================
#  3. DAILY PROFILE VIEWERS TREND
# =====================================================================

st.markdown("## Daily Profile Viewers")

try:
    trend_df = get_daily_trend("profile_tab_viewed", date_from, date_to)
    if not trend_df.empty:
        st.line_chart(trend_df.set_index("day")["users"],
                      use_container_width=True, y_label="Unique users")
    else:
        st.info("No trend data available for this period.")
except Exception as e:
    st.error(f"Error fetching trend: {e}")

st.divider()

# =====================================================================
#  4. STAT GRID ENGAGEMENT
# =====================================================================

st.markdown("## Stat Grid Engagement")

try:
    stats_expanded_users = get_unique_users(
        "profile_stats_expanded", date_from, date_to
    )
    stats_collapsed_users = get_unique_users(
        "profile_stats_collapsed", date_from, date_to
    )
    stats_expanded_count = get_event_count(
        "profile_stats_expanded", date_from, date_to
    )

    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Users Who Expanded Stats", fmt(stats_expanded_users))
    with c2:
        st.metric("Total Expand Taps", fmt(stats_expanded_count))
    with c3:
        st.metric("Users Who Collapsed", fmt(stats_collapsed_users))

except Exception as e:
    st.error(f"Error fetching stat grid data: {e}")

st.divider()

# =====================================================================
#  5. XP THIS WEEK CHART
# =====================================================================

st.markdown("## XP This Week Chart")

try:
    xp_chart_viewers = get_unique_users(
        "profile_weekly_xp_viewed", date_from, date_to
    )
    st.metric("Users Who Viewed Weekly XP Chart", fmt(xp_chart_viewers),
              pct(xp_chart_viewers, kpi_unique_viewers) + " of profile viewers")
except Exception as e:
    st.error(f"Error fetching XP chart data: {e}")

st.divider()

# =====================================================================
#  6. ACHIEVEMENTS SECTION
# =====================================================================

st.markdown("## Achievements")

try:
    ach_tapped_users = get_unique_users(
        "profile_achievement_tapped", date_from, date_to
    )
    ach_tapped_count = get_event_count(
        "profile_achievement_tapped", date_from, date_to
    )
    ach_detail_viewed = get_unique_users(
        "profile_achievement_detail_viewed", date_from, date_to
    )
    ach_full_grid = get_unique_users(
        "profile_achievements_viewed", date_from, date_to
    )
    ach_dismissed = get_unique_users(
        "profile_achievements_dismissed", date_from, date_to
    )

    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Achievement Tile Taps (users)", fmt(ach_tapped_users),
                  f"{fmt(ach_tapped_count)} total taps")
    with c2:
        st.metric("Detail Card Viewed", fmt(ach_detail_viewed))
    with c3:
        st.metric("Full Grid Opened", fmt(ach_full_grid),
                  pct(ach_full_grid, kpi_unique_viewers) + " of viewers")

    # Breakdown by achievement_id
    st.markdown("#### Most Viewed Achievements")
    ach_breakdown = get_property_breakdown(
        "profile_achievement_detail_viewed", "achievement_id",
        date_from, date_to
    )
    if ach_breakdown:
        df_ach = pd.DataFrame(
            [{"Achievement ID": k, "Unique Viewers": v}
             for k, v in ach_breakdown.items()]
        ).head(10)
        st.dataframe(df_ach, use_container_width=True, hide_index=True)
    else:
        st.info("No achievement detail views in this period.")

except Exception as e:
    st.error(f"Error fetching achievement data: {e}")

st.divider()

# =====================================================================
#  7. BADGES SECTION
# =====================================================================

st.markdown("## Monthly Badges")

try:
    badge_tapped_users = get_unique_users(
        "profile_badge_tapped", date_from, date_to
    )
    badge_tapped_count = get_event_count(
        "profile_badge_tapped", date_from, date_to
    )
    badge_detail_viewed = get_unique_users(
        "profile_badge_detail_viewed", date_from, date_to
    )
    badge_full_grid = get_unique_users(
        "profile_monthly_badges_viewed", date_from, date_to
    )
    badge_full_dismissed = get_unique_users(
        "profile_monthly_badges_dismissed", date_from, date_to
    )

    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Badge Tile Taps (users)", fmt(badge_tapped_users),
                  f"{fmt(badge_tapped_count)} total taps")
    with c2:
        st.metric("Badge Detail Viewed", fmt(badge_detail_viewed))
    with c3:
        st.metric("Monthly Badges Grid Opened", fmt(badge_full_grid),
                  pct(badge_full_grid, kpi_unique_viewers) + " of viewers")

    # Breakdown by badge_month
    st.markdown("#### Badge Taps by Month")
    badge_month_breakdown = get_property_breakdown(
        "profile_badge_tapped", "badge_month",
        date_from, date_to
    )
    if badge_month_breakdown:
        df_badge = pd.DataFrame(
            [{"Badge Month": k, "Unique Users": v}
             for k, v in badge_month_breakdown.items()]
        )
        st.dataframe(df_badge, use_container_width=True, hide_index=True)
    else:
        st.info("No badge tap data in this period.")

except Exception as e:
    st.error(f"Error fetching badge data: {e}")

st.divider()

# =====================================================================
#  8. AVATAR SECTION
# =====================================================================

st.markdown("## Avatar Selector")

try:
    avatar_tapped = get_unique_users(
        "profile_avatar_tapped", date_from, date_to
    )
    avatar_selector_viewed = get_unique_users(
        "profile_avatar_selector_viewed", date_from, date_to
    )
    avatar_selected = get_unique_users(
        "profile_avatar_selected", date_from, date_to
    )
    avatar_selected_count = get_event_count(
        "profile_avatar_selected", date_from, date_to
    )
    avatar_dismissed = get_unique_users(
        "profile_avatar_selector_dismissed", date_from, date_to
    )

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.metric("Avatar Area Tapped", fmt(avatar_tapped))
    with c2:
        st.metric("Selector Opened", fmt(avatar_selector_viewed))
    with c3:
        st.metric("Avatar Saved", fmt(avatar_selected),
                  f"{fmt(avatar_selected_count)} total saves")
    with c4:
        st.metric("Dismissed Without Saving", fmt(avatar_dismissed),
                  pct(avatar_dismissed, avatar_selector_viewed) + " dismiss rate")

    # Avatar selector funnel
    render_funnel([
        ("Avatar Tapped", avatar_tapped),
        ("Selector Opened", avatar_selector_viewed),
        ("Avatar Saved", avatar_selected),
    ], title="Avatar Selection Funnel")

    # Most popular avatars
    st.markdown("#### Most Popular Avatars")
    avatar_breakdown = get_property_breakdown(
        "profile_avatar_selected", "new_avatar_id",
        date_from, date_to
    )
    if avatar_breakdown:
        df_avatar = pd.DataFrame(
            [{"Avatar ID": k, "Times Selected": v}
             for k, v in avatar_breakdown.items()]
        ).head(15)
        st.bar_chart(
            df_avatar.set_index("Avatar ID")["Times Selected"],
            use_container_width=True,
        )
        st.dataframe(df_avatar, use_container_width=True, hide_index=True)
    else:
        st.info("No avatar selection data in this period.")

except Exception as e:
    st.error(f"Error fetching avatar data: {e}")

st.divider()

# =====================================================================
#  9. LEARNING PREFERENCES
# =====================================================================

st.markdown("## Learning Preferences")

try:
    prefs_viewed = get_unique_users(
        "profile_learning_preferences_viewed", date_from, date_to
    )
    st.metric("Users Who Viewed Learning Preferences", fmt(prefs_viewed),
              pct(prefs_viewed, kpi_unique_viewers) + " of profile viewers")
except Exception as e:
    st.error(f"Error fetching learning preferences data: {e}")

st.divider()

# =====================================================================
#  10. SETTINGS & ACCOUNT ACTIONS
# =====================================================================

st.markdown("## Settings & Account Actions")

try:
    settings_viewed = get_unique_users(
        "profile_settings_viewed", date_from, date_to
    )
    sign_out_tapped = get_unique_users(
        "profile_sign_out_tapped", date_from, date_to
    )
    delete_tapped = get_unique_users(
        "profile_delete_account_tapped", date_from, date_to
    )
    delete_cancelled = get_unique_users(
        "profile_delete_account_cancelled", date_from, date_to
    )
    delete_confirmed = get_unique_users(
        "profile_delete_account_confirmed", date_from, date_to
    )
    manage_sub = get_unique_users(
        "profile_manage_subscription_tapped", date_from, date_to
    )
    account_deleted = get_unique_users(
        "user_account_deleted", date_from, date_to
    )

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.metric("Settings Opened", fmt(settings_viewed),
                  pct(settings_viewed, kpi_unique_viewers) + " of viewers")
    with c2:
        st.metric("Sign Out Tapped", fmt(sign_out_tapped))
    with c3:
        st.metric("Manage Subscription", fmt(manage_sub))
    with c4:
        st.metric("Accounts Deleted", fmt(account_deleted))

    # Settings toggles
    st.markdown("#### Settings Toggles")
    toggle_breakdown = get_property_breakdown(
        "profile_setting_toggled", "setting",
        date_from, date_to
    )
    if toggle_breakdown:
        df_toggles = pd.DataFrame(
            [{"Setting": k, "Unique Users": v}
             for k, v in toggle_breakdown.items()]
        )
        st.dataframe(df_toggles, use_container_width=True, hide_index=True)
    else:
        st.info("No settings toggle data in this period.")

    # Settings navigation taps
    st.markdown("#### Settings Navigation Taps")
    nav_breakdown = get_property_breakdown(
        "profile_nav_tapped", "destination",
        date_from, date_to
    )
    if nav_breakdown:
        df_nav = pd.DataFrame(
            [{"Destination": k, "Unique Users": v}
             for k, v in nav_breakdown.items()]
        )
        st.dataframe(df_nav, use_container_width=True, hide_index=True)
    else:
        st.info("No navigation tap data in this period.")

    # Delete account funnel
    st.markdown("#### Delete Account Funnel")
    render_funnel([
        ("Delete Account Tapped", delete_tapped),
        ("Confirmation Alert Shown", delete_tapped),
        ("Delete Cancelled", delete_cancelled),
        ("Delete Confirmed", delete_confirmed),
        ("Account Deleted", account_deleted),
    ], title="Account Deletion Flow")

except Exception as e:
    st.error(f"Error fetching settings/account data: {e}")

st.divider()

# =====================================================================
#  11. DELETED ACCOUNT INSIGHTS
# =====================================================================

st.markdown("## Deleted Account Insights")

try:
    avg_account_age = get_avg_property(
        "user_account_deleted", "account_age_days",
        date_from, date_to
    )
    avg_xp_deleted = get_avg_property(
        "user_account_deleted", "total_xp",
        date_from, date_to
    )
    avg_adventures = get_avg_property(
        "user_account_deleted", "adventures_completed",
        date_from, date_to
    )

    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Avg Account Age (days)", fmt(avg_account_age))
    with c2:
        st.metric("Avg Total XP at Deletion", fmt(avg_xp_deleted))
    with c3:
        st.metric("Avg Adventures Completed", fmt(avg_adventures))

except Exception as e:
    st.error(f"Error fetching deleted account insights: {e}")

st.divider()

# =====================================================================
#  12. SIGN OUT INSIGHTS
# =====================================================================

st.markdown("## Sign Out Insights")

try:
    sign_out_events = get_event_count(
        "profile_sign_out_tapped", date_from, date_to
    )
    sign_out_users = get_unique_users(
        "profile_sign_out_tapped", date_from, date_to
    )

    # Session duration for sign-out users
    avg_session_duration = get_avg_property(
        "user_session_out", "session_duration_seconds",
        date_from, date_to,
        extra_where="properties.trigger = 'manual_profile'",
    )

    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Sign Out Events", fmt(sign_out_events))
    with c2:
        st.metric("Unique Users", fmt(sign_out_users))
    with c3:
        if avg_session_duration is not None:
            minutes = avg_session_duration / 60
            st.metric("Avg Session Before Sign-Out", f"{minutes:.1f} min")
        else:
            st.metric("Avg Session Before Sign-Out", "--")

    # Sign-out trigger breakdown
    signout_trigger_breakdown = get_property_breakdown(
        "user_session_out", "trigger",
        date_from, date_to
    )
    if signout_trigger_breakdown:
        st.markdown("#### Session End Triggers")
        df_triggers = pd.DataFrame(
            [{"Trigger": k, "Unique Users": v}
             for k, v in signout_trigger_breakdown.items()]
        )
        st.dataframe(df_triggers, use_container_width=True, hide_index=True)

except Exception as e:
    st.error(f"Error fetching sign-out insights: {e}")

st.divider()

# =====================================================================
#  13. ANALYSIS QUESTIONS (from spec)
# =====================================================================

st.markdown("## Key Questions")
st.caption("Answers to the strategic and behavioral questions from the Profile Flow Spec.")

try:
    # ── Strategic Questions ────────────────────────────────────────────

    st.markdown("### Strategic Questions")

    # S1: How many users visit the Profile tab per session?
    # S2: How long do users spend on the Profile tab?
    col1, col2 = st.columns(2)

    with col1:
        profile_views_total = get_event_count("profile_tab_viewed", date_from, date_to)
        profile_viewers = get_unique_users("profile_tab_viewed", date_from, date_to)
        avg_visits = round(profile_views_total / profile_viewers, 1) if profile_viewers else 0
        st.metric(
            "S1 - Profile Visits per User",
            fmt(avg_visits),
            f"{fmt(profile_views_total)} views / {fmt(profile_viewers)} users",
        )

    with col2:
        avg_time = get_avg_property(
            "page_view", "time_spent_seconds",
            date_from, date_to,
            extra_where="properties.page_name = 'profile'",
        )
        if avg_time is not None:
            st.metric("S2 - Avg Time on Profile", f"{avg_time:.1f}s")
        else:
            st.metric("S2 - Avg Time on Profile", "--")

    # S3: Settings opened / S4: Sign out / S5: Delete account
    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric(
            "S3 - Settings Opened",
            fmt(settings_viewed),
            pct(settings_viewed, profile_viewers) + " of profile viewers",
        )

    with col2:
        st.metric(
            "S4 - Sign Out from Profile",
            fmt(sign_out_users),
            pct(sign_out_users, profile_viewers) + " of profile viewers",
        )

    with col3:
        st.metric(
            "S5 - Accounts Deleted",
            fmt(account_deleted),
            pct(account_deleted, profile_viewers) + " of profile viewers",
        )

    # S6: Stats interaction / S7: Full achievements / S8: Full badges
    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric(
            "S6 - Stats Grid Interaction",
            fmt(stats_expanded_users),
            pct(stats_expanded_users, profile_viewers) + " of profile viewers",
        )

    with col2:
        st.metric(
            "S7 - Full Achievements Screen",
            fmt(ach_full_grid),
            pct(ach_full_grid, profile_viewers) + " of profile viewers",
        )

    with col3:
        st.metric(
            "S8 - Full Monthly Badges Screen",
            fmt(badge_full_grid),
            pct(badge_full_grid, profile_viewers) + " of profile viewers",
        )

    st.markdown("---")

    # ── Behavioral Insights ────────────────────────────────────────────

    st.markdown("### Behavioral Insights")

    # B1: See more tap / B2-B3: Achievement taps
    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric(
            "B1 - See More (Stats) Taps",
            fmt(stats_expanded_users),
        )

    with col2:
        ach_preview_taps = get_unique_users(
            "profile_achievement_tapped", date_from, date_to,
            extra_where="properties.screen = 'profile_preview'",
        )
        st.metric(
            "B2 - Achievement Tap (Preview Row)",
            fmt(ach_preview_taps),
        )

    with col3:
        ach_full_taps = get_unique_users(
            "profile_achievement_tapped", date_from, date_to,
            extra_where="properties.screen = 'achievements_full'",
        )
        st.metric(
            "B3 - Achievement Tap (Full Grid)",
            fmt(ach_full_taps),
        )

    # B4-B5: Badge taps
    col1, col2 = st.columns(2)

    with col1:
        badge_preview_taps = get_unique_users(
            "profile_badge_tapped", date_from, date_to,
            extra_where="properties.screen = 'profile_preview'",
        )
        st.metric(
            "B4 - Badge Tap (Preview Row)",
            fmt(badge_preview_taps),
        )

    with col2:
        badge_full_taps = get_unique_users(
            "profile_badge_tapped", date_from, date_to,
            extra_where="properties.screen = 'monthly_badges_full'",
        )
        st.metric(
            "B5 - Badge Tap (Full Grid)",
            fmt(badge_full_taps),
        )

    # B6-B9: Avatar flow
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("B6 - Avatar Area Tapped", fmt(avatar_tapped))

    with col2:
        st.metric("B7 - Selector Opened", fmt(avatar_selector_viewed))

    with col3:
        st.metric("B8 - New Avatar Saved", fmt(avatar_selected))

    with col4:
        st.metric("B9 - Selector Dismissed", fmt(avatar_dismissed))

    # B10: Most popular avatars (already shown above)
    st.markdown("**B10 - Most Popular Avatars:** See the Avatar Selector section above.")

    # B11-B13: Toggle settings
    st.markdown("#### B11-B13: Settings Toggles (users who toggled OFF)")

    toggle_off_music = get_unique_users(
        "profile_setting_toggled", date_from, date_to,
        extra_where="properties.setting = 'background_music' AND (properties.new_value = 'false' OR properties.new_value = false)",
    )
    toggle_off_sfx = get_unique_users(
        "profile_setting_toggled", date_from, date_to,
        extra_where="properties.setting = 'sound_effects' AND (properties.new_value = 'false' OR properties.new_value = false)",
    )
    toggle_off_haptics = get_unique_users(
        "profile_setting_toggled", date_from, date_to,
        extra_where="properties.setting = 'haptics' AND (properties.new_value = 'false' OR properties.new_value = false)",
    )

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("B11 - Music Off", fmt(toggle_off_music))
    with col2:
        st.metric("B12 - Sound Effects Off", fmt(toggle_off_sfx))
    with col3:
        st.metric("B13 - Vibration Off", fmt(toggle_off_haptics))

    # B14-B17: Settings nav taps
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("B14 - Manage Subscription", fmt(manage_sub))

    with col2:
        nav_support = get_unique_users(
            "profile_nav_tapped", date_from, date_to,
            extra_where="properties.destination = 'support'",
        )
        st.metric("B15 - Support Tapped", fmt(nav_support))

    with col3:
        nav_privacy = get_unique_users(
            "profile_nav_tapped", date_from, date_to,
            extra_where="properties.destination = 'privacy_policy'",
        )
        st.metric("B16 - Privacy Policy Tapped", fmt(nav_privacy))

    with col4:
        nav_faq = get_unique_users(
            "profile_nav_tapped", date_from, date_to,
            extra_where="properties.destination = 'faq'",
        )
        st.metric("B17 - FAQ Tapped", fmt(nav_faq))

    # B18-B19: Delete flow
    col1, col2 = st.columns(2)

    with col1:
        started_delete = delete_tapped
        cancelled_delete = delete_cancelled
        st.metric(
            "B18 - Started Delete but Cancelled",
            fmt(cancelled_delete),
            pct(cancelled_delete, started_delete) + " cancel rate" if started_delete else "",
        )

    with col2:
        st.metric(
            "B19 - Delete Confirmation Follow-Through",
            fmt(delete_confirmed),
            pct(delete_confirmed, started_delete) + " of starters" if started_delete else "",
        )

    # B22-B23: Deleted account stats
    col1, col2 = st.columns(2)

    with col1:
        st.metric("B22 - Avg Account Age at Deletion (days)", fmt(avg_account_age))

    with col2:
        st.metric("B23 - Avg XP at Deletion", fmt(avg_xp_deleted))

    st.markdown("---")

    # ── Checkpoint Validation ──────────────────────────────────────────

    st.markdown("### Checkpoint Validation")

    cp_tab_viewed = get_unique_users("profile_tab_viewed", date_from, date_to)
    cp_badge_detail = get_unique_users("profile_badge_detail_viewed", date_from, date_to)
    cp_monthly_badges = get_unique_users("profile_monthly_badges_viewed", date_from, date_to)
    cp_ach_detail = get_unique_users("profile_achievement_detail_viewed", date_from, date_to)
    cp_ach_full = get_unique_users("profile_achievements_viewed", date_from, date_to)
    cp_avatar_selector = get_unique_users("profile_avatar_selector_viewed", date_from, date_to)
    cp_settings = get_unique_users("profile_settings_viewed", date_from, date_to)
    cp_delete_confirm_alert = get_unique_users("profile_delete_account_tapped", date_from, date_to)
    cp_account_deleted = get_unique_users("user_account_deleted", date_from, date_to)
    cp_sign_out = get_unique_users("profile_sign_out_tapped", date_from, date_to)

    checkpoint_data = [
        ("1. Profile Tab Viewed", cp_tab_viewed),
        ("2. Badge Detail", cp_badge_detail),
        ("3. Monthly Badges", cp_monthly_badges),
        ("4. Achievement Detail", cp_ach_detail),
        ("5. Achievements (Full Grid)", cp_ach_full),
        ("6. Avatar Selector Viewed", cp_avatar_selector),
        ("7. Settings", cp_settings),
        ("8. Delete Confirmation Alert", cp_delete_confirm_alert),
        ("9. Account Deleted + Redirect", cp_account_deleted),
        ("10. Sign Out", cp_sign_out),
    ]

    df_checkpoints = pd.DataFrame(
        [{"Checkpoint": label, "Unique Users": count} for label, count in checkpoint_data]
    )
    st.dataframe(df_checkpoints, use_container_width=True, hide_index=True)

except Exception as e:
    st.error(f"Error computing analysis questions: {e}")

st.divider()

# ── Footer ─────────────────────────────────────────────────────────────

st.caption("Profile Flow Dashboard | AFF-844 spec | PostHog HogQL")
