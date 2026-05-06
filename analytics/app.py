"""
Archives Analytics Dashboard

Multi-page Streamlit app for visualizing PostHog analytics
across all Archives app flows.

Run:
    cd analytics && streamlit run app.py
"""

import streamlit as st

st.set_page_config(
    page_title="Archives Analytics",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("Archives Analytics Dashboard")
st.markdown("""
Welcome to the Archives analytics dashboard. Use the sidebar to navigate between flows.

**Available dashboards:**
- **Onboarding** - User signup and onboarding funnel
- **Learn** - Lesson and quiz engagement
- **Daily Story** - Today tab and streak engagement
- **Profile** - Profile section interactions
- **Subscribe** - Subscription and paywall funnel
- **AI Chat** - AI assistant usage and engagement

Each dashboard pulls live data from PostHog via HogQL queries.

---
*Configure your PostHog API key in `analytics/.env`*
""")
