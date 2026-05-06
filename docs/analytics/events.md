# Archives Analytics: Event Design Checklist

**Project:** Archives (PostHog ID: 93650) | **Org:** Affinity Labs
**Ticket:** AFF-844
**Source:** `services/AnalyticsService.ts`

---

## Summary

| Flow | Wired | Unwired | Missing | Total |
|------|-------|---------|---------|-------|
| Onboarding | 11 | 2 | 20 | 33 |
| Daily Story | 18 | 1 | 8 | 27 |
| Learn | 29 | 3 | 4 | 36 |
| Profile | 4 | 0 | 28 | 32 |
| Subscribe | 15 | 0 | 10 | 25 |
| AI Chat | 18 | 0 | 8 | 26 |
| **Total** | **95** | **6** | **78** | **179** |

---

## 1. Onboarding

| Event | Properties | Status | Screen |
|-------|-----------|--------|--------|
| `app_entry_point` | screen, is_signed_in, is_loaded | Wired | App Opened |
| `auth_state_change` | previous_state, new_state, user_id, app_state | Wired | App Opened |
| `welcome_back_viewed` | remembered_method (apple / google / email) | Missing | Welcome Back |
| `welcome_back_tapped` | action (continue_as / sign_out) | Missing | Welcome Back |
| `onboarding_step_viewed` | screen: hero | Missing | Hero Screen |
| `onboarding_step_viewed` | screen: meet_ibu | Missing | Meet Ibu |
| `onboarding_login_shortcut_tapped` | screen: meet_ibu, destination: create_account | Missing | Meet Ibu |
| `onboarding_step_viewed` | screen: name_input | Missing | Name Input |
| `onboarding_name_entered` | name_length | Missing | Name Input |
| `onboarding_skipped` | screen: name_input, action: skip, destination: create_account | Missing | Name Input |
| `onboarding_back_tapped` | screen: name_input | Missing | Name Input |
| `onboarding_step_viewed` | screen: welcome_celebration | Missing | Welcome Celebration |
| `onboarding_step_viewed` | screen: interests | Missing | Interests Selection |
| `onboarding_interests_selected` | interests: string[], count: number | Missing | Interests Selection |
| `onboarding_skipped` | screen: interests, action: skip, destination: create_account | Missing | Interests Selection |
| `onboarding_back_tapped` | screen: interests | Missing | Interests Selection |
| `onboarding_step_viewed` | screen: social_proof | Missing | Social Proof |
| `onboarding_back_tapped` | screen: social_proof | Missing | Social Proof |
| `onboarding_step_viewed` | screen: create_account | Missing | Create Account |
| `auth_method_selected` | method (apple / google / email), screen | Wired | Create Account |
| `auth_succeeded` | method, is_new_user, screen | Wired | Create Account |
| `auth_failed` | method, error_message, screen | Wired | Create Account |
| `user_signed_up` | sign_up_method | Wired | Create Account |
| `user_session_in` | login_method | Wired | Create Account |
| `onboarding_back_tapped` | screen: create_account | Missing | Create Account |
| `auth_screen_viewed` | screen: onboarding_auth, mode (signin / signup) | Unwired | Email Auth Form |
| `user_signed_up` | sign_up_method: email | Wired | Email Auth Form |
| `user_session_in` | login_method: email | Wired | Email Auth Form |
| `onboarding_back_tapped` | screen: email_auth | Missing | Email Auth Form |
| `onboarding_step_viewed` | screen: post_signup_celebration | Missing | Post-Signup Celebration |
| `permission_requested` | permission_type: push_notifications, screen, result, platform | Wired | Notification Permission |
| `push_notifications_enabled` | permission_type, screen, result, platform | Wired | Notification Permission |
| `push_notifications_declined` | permission_type, screen, result, platform | Wired | Notification Permission |
| `onboarding_back_tapped` | screen: notification_permission | Missing | Notification Permission |
| `onboarding_step_viewed` | screen: daily_goal | Missing | Daily Goal |
| `onboarding_daily_goal_selected` | daily_goal_minutes: 5 / 10 / 15 / 20 | Missing | Daily Goal |
| `onboarding_skipped` | screen: daily_goal, action: skip, destination: loading | Missing | Daily Goal |
| `onboarding_back_tapped` | screen: daily_goal | Missing | Daily Goal |
| `onboarding_step_viewed` | screen: age_group | Missing | Age Group |
| `onboarding_age_group_selected` | age_group: 13-17 / 18-24 / 25-34 / 35-44 / 45+ | Missing | Age Group |
| `onboarding_skipped` | screen: age_group, action: skip, destination: loading | Missing | Age Group |
| `onboarding_back_tapped` | screen: age_group | Missing | Age Group |
| `onboarding_step_viewed` | screen: loading | Missing | Loading |
| `onboarding_step_viewed` | screen: learning_path | Missing | Learning Path Overview |
| `onboarding_completed` | time_to_complete_seconds, onboarding_q1, onboarding_q2, onboarding_q3, onboarding_q4 | Unwired | Learning Path Overview |
| `onboarding_back_tapped` | screen: learning_path | Missing | Learning Path Overview |
| `paywall_viewed` | screen: onboarding_paywall, source: onboarding / sign_in | Missing | Soft Paywall |
| `paywall_cta_tapped` | action: see_free_offer | Missing | Soft Paywall |
| `onboarding_back_tapped` | screen: soft_paywall | Missing | Soft Paywall |
| `custom_paywall_viewed` | screen: onboarding_custom_paywall, source: onboarding / sign_in | Missing | Custom Paywall |
| `custom_paywall_plan_selected` | plan: monthly / yearly / lifetime | Missing | Custom Paywall |
| `custom_paywall_subscribe_tapped` | plan: monthly / yearly / lifetime | Missing | Custom Paywall |
| `custom_paywall_subscribe_success` | plan, transaction_id | Missing | Custom Paywall |
| `custom_paywall_subscribe_failed` | plan, error | Missing | Custom Paywall |
| `custom_paywall_dismissed` | screen: onboarding_custom_paywall, action: dismiss / back | Missing | Custom Paywall |
| `app_opened` | (PostHog auto-capture) | Wired | Main App |

---

## 2. Daily Story

| Event | Properties | Status | Screen |
|-------|-----------|--------|--------|
| `$pageview` | pageName: today, screenUrl: /(tabs)/today | Wired | Today Tab Opened |
| `daily_story_viewed` | story_id, story_date, story_title, entry_source, is_today | Wired | Today Tab Opened |
| `daily_story_calendar_swiped` | direction: prev_week / current_week | Missing | Calendar Week View |
| `daily_story_card_swiped` | from_card, to_card, direction: left / right | Missing | Today's Story Home |
| `daily_story_card_viewed` | story_id, card_index: 1 | Wired | START MY DAY Tapped |
| `daily_story_started` | story_id, story_date, entry_source, is_replay | Missing | START MY DAY Tapped |
| `daily_story_watch_viewed` | story_id, section: watch | Missing | WATCH - Video Lesson |
| `daily_story_media_played` | story_id, media_type: video, media_id | Wired | WATCH - Video Lesson |
| `video_load_attempted` | video_url, content_type, cdn_domain, trigger: auto | Wired | WATCH - Video Lesson |
| `video_load_time` | load_time_ms, video_url, content_type, cdn_domain | Wired | WATCH - Video Lesson |
| `daily_story_reading_expanded` | story_id | Missing | Reading Sheet Expanded |
| `daily_story_card_viewed` | story_id, card_index: 2 | Wired | EXPLORE - Scrollable Lesson |
| `daily_story_media_played` | story_id, media_type: audio, media_id | Wired | EXPLORE - Scrollable Lesson |
| `daily_story_card_viewed` | story_id, card_index: 3 | Wired | QUESTIONS - Quiz |
| `quiz_started` | adventureId: daily_quest, moduleId: quest.id, eraId: daily_quest | Wired | QUESTIONS - Quiz |
| `quiz_answer_selected` | question_index, selected_answer, is_correct | Wired | QUESTIONS - Quiz |
| `quiz_completed` | score, correct_answers, total_questions, adventureId: daily_quest | Wired | QUESTIONS - Quiz |
| `daily_story_quiz_score` | story_id, story_date, score, correct_answers, total_questions | Missing | Quiz Results |
| `daily_story_completed` | story_id, story_date, time_spent_seconds, entry_source | Wired | Story Completed |
| `daily_story_streak_incremented` | story_id, current_streak, is_first_action_today | Unwired | Story Completed |
| `daily_story_celebration_shown` | story_id, story_date, xp_earned | Missing | Celebration Screen |
| `daily_story_celebration_dismissed` | story_id, dismiss_method: continue / close | Missing | Celebration Screen |
| `daily_story_dismissed` | story_id, time_spent_seconds, scroll_depth_pct, cards_seen, completed | Wired | Dismiss / Back |
| `daily_story_rewind_tapped` | story_date, is_subscribed: true, days_ago | Wired | Historical Story Loaded |
| `daily_story_viewed` | story_id, story_date, entry_source: rewind, is_today: false | Wired | Historical Story Loaded |
| `daily_story_rewind_tapped` | story_date, is_subscribed: false, days_ago | Wired | Rewind Blocked - Paywall |
| `daily_story_rewind_blocked` | story_date, days_ago | Wired | Rewind Blocked - Paywall |
| `subscribe_screen_viewed` | trigger: daily_story_rewind | Wired | Rewind Blocked - Paywall |
| `subscribe_purchase_completed` | trigger: daily_story_rewind, plan: yearly | Wired | Rewind Blocked - Paywall |
| `subscribe_purchase_cancelled` | trigger: daily_story_rewind | Wired | Rewind Blocked - Paywall |
| `subscribe_purchase_failed` | trigger: daily_story_rewind, error_code | Wired | Rewind Blocked - Paywall |
| `subscribe_restore_success` | trigger: daily_story_rewind | Wired | Rewind Blocked - Paywall |

---

## 3. Learn

| Event | Properties | Status | Screen |
|-------|-----------|--------|--------|
| `page_view` | page_name: era_selection_onboarding / era, time_spent_seconds, clicks | Wired | Eras Tab |
| `era_selected` | era_name, era_id, screen, context: onboarding / era_switch, selection_order | Wired | Era Selected |
| `subscribe_screen_viewed` | trigger: era_locked, era_id, era_name | Wired | Era Selected |
| `page_view` | page_name: adventures, time_spent_seconds, clicks | Wired | Era View / Adventures |
| `era_started` | era_id, era_name, screen: era_view | Wired | Era View / Adventures |
| `era_completed` | era_id, era_name, total_adventures, total_xp | Wired | Era View / Adventures |
| `adventure_started` | era_id, era_name, adventure_id, adventure_number, adventure_title, screen: home | Wired | Adventure Card Opened |
| `adventure_card_dismissed` | adventure_id, time_on_card_seconds | Missing | Adventure Card Opened |
| `module_started` | era_id, era_name, adventure_id, adventure_number, module_id, module_number, module_title | Wired | Module Tapped |
| `first_lesson` | first_era_number, first_module_number | Wired | Module Tapped |
| `lesson_started` | adventure_id, module_id, lesson_id, lesson_type, era_id, era_name, adventure_number, module_number | Wired | Module Tapped |
| `video_played` | adventure_id, module_id, lesson_id, lesson_title, video_duration_seconds, era_id, era_name | Wired | Reel Lesson |
| `video_paused` | video_progress (%), position_seconds, duration_seconds, era_id, era_name | Wired | Reel Lesson |
| `video_completed` | video_duration_seconds, completion_time_seconds, era_id, era_name | Wired | Reel Lesson |
| `reading_card_expanded` | adventure_id, module_id, lesson_id, era_id, era_name | Wired | Reel Lesson |
| `video_buffering` | buffer_time_ms, video_url, era_id, era_name | Wired | Reel Lesson |
| `lesson_dismissed` | adventure_id, module_id, lesson_id, video_progress, time_spent_seconds | Missing | Reel Lesson |
| `carousel_image_view` | image_index, time_spent_seconds, total_images, era_id, era_name | Wired | Image Carousel |
| `screen_press` | interaction_type: tap / swipe, target, era_id, era_name | Wired | Image Carousel |
| `lesson_dismissed` | adventure_id, module_id, lesson_id, images_viewed, time_spent_seconds | Missing | Image Carousel |
| `video_played` | adventure_id, module_id, lesson_id, lesson_title, era_id, era_name | Wired | Video Carousel |
| `video_paused` | video_progress, position_seconds, duration_seconds, era_id, era_name | Wired | Video Carousel |
| `video_completed` | video_duration_seconds, completion_time_seconds, era_id, era_name | Wired | Video Carousel |
| `lesson_dismissed` | adventure_id, module_id, lesson_id, videos_watched, time_spent_seconds | Missing | Video Carousel |
| `screen_press` | interaction_type: tap / swipe, target, era_id, era_name | Wired | Scrollable Media |
| `lesson_dismissed` | adventure_id, module_id, lesson_id, scroll_depth_pct, time_spent_seconds | Missing | Scrollable Media |
| `lesson_completed` | adventure_id, module_id, lesson_id, time_spent_seconds, era_id, era_name, adventure_number, module_number | Wired | Lesson Completed |
| `quiz_started` | adventure_id, module_id, total_questions, era_id, era_name, quiz_id, quiz_title | Wired | Quiz |
| `quiz_question_answered` | question_number, is_correct, time_taken_seconds, xp_earned, current_total_xp, era_id | Wired | Quiz |
| `quiz_completed` | quiz_score, correct_answers, total_questions, time_spent_seconds, is_retake, xp_earned, total_xp_before, total_xp_after | Wired | Quiz |
| `module_completed` | adventure_id, module_id, quiz_score, era_id, era_name | Wired | Quiz |
| `quiz_abandoned` | adventure_id, module_id, questions_answered, total_questions, time_spent_seconds | Missing | Quiz |
| `quiz_results_viewed` | correct_answers, total_questions, percentage, total_points, performance_tier, era_id, era_name | Wired | Quiz Results |
| `quiz_results_continue_tapped` | adventure_id, module_id, era_id, era_name | Wired | Quiz Results |
| `quiz_results_chat_to_learn_tapped` | adventure_id, module_id, era_id | Wired | Quiz Results |
| `quiz_retake` | adventure_id, module_id, previous_score, era_id, era_name | Wired | Quiz Results |
| `quiz_results_continue_tapped` | adventure_id, module_id, era_id | Wired | Continue |
| `learn_flow_completed` | adventure_id, module_id, had_quiz, total_time_seconds, era_id | Missing | Back to Adventures |
| `adventure_complete_continue` | adventure_id, adventure_title, era_id, era_name, total_xp_earned | Wired | Adventure Completed |
| `era_completed` | era_id, era_name, total_adventures, total_xp | Wired | Era Completed |
| `ai_quiz_explanation_requested` | adventure_id, module_id | Wired | AI Quiz Explanation |
| `ai_quiz_explanation_generated` | adventure_id, module_id | Wired | AI Quiz Explanation |
| `quiz_results_chat_to_learn_tapped` | adventure_id, module_id, era_id | Wired | Chat to Learn |
| `chat_to_learn_paywall_shown` | adventure_id, module_id | Wired | Chat to Learn |

---

## 4. Profile

| Event | Properties | Status | Screen |
|-------|-----------|--------|--------|
| `page_view` | page_name: profile, time_spent_seconds, clicks | Wired | Profile Tab Viewed |
| `$set` | email, firstName, lastName, username | Wired | Profile Tab Viewed |
| `profile_tab_viewed` | screen: profile, total_xp, streak, longest_streak, lessons_completed, achievements_unlocked | Missing | Profile Tab Viewed |
| `profile_avatar_tapped` | current_avatar_id, screen: profile | Missing | Avatar |
| `profile_avatar_selector_viewed` | current_avatar_id, total_avatars: 19, screen: avatar_selector | Missing | Avatar |
| `profile_avatar_selected` | previous_avatar_id, new_avatar_id, screen: avatar_selector | Missing | Avatar |
| `profile_avatar_selector_dismissed` | had_preview_change, screen: avatar_selector | Missing | Avatar |
| `profile_stats_expanded` | screen: profile | Missing | Stat Grid |
| `profile_stats_collapsed` | screen: profile | Missing | Stat Grid |
| `profile_weekly_xp_viewed` | weekly_xp_total, screen: profile | Missing | XP This Week Chart |
| `profile_badge_tapped` | badge_month, is_earned, screen: profile_preview / monthly_badges_full | Missing | Badges |
| `profile_badge_detail_viewed` | badge_month, badge_label, is_earned, screen: profile | Missing | Badges |
| `profile_badge_detail_dismissed` | badge_month, screen: profile | Missing | Badges |
| `profile_monthly_badges_viewed` | total_earned, screen: monthly_badges | Missing | Badges |
| `profile_monthly_badges_dismissed` | screen: monthly_badges | Missing | Badges |
| `profile_achievement_tapped` | achievement_id, is_unlocked, screen: profile_preview / achievements_full | Missing | Achievements |
| `profile_achievement_detail_viewed` | achievement_id, achievement_name, is_unlocked, screen: profile | Missing | Achievements |
| `profile_achievement_detail_dismissed` | achievement_id, screen: profile | Missing | Achievements |
| `profile_achievements_viewed` | total_unlocked, total_achievements: 20, screen: achievements | Missing | Achievements |
| `profile_achievements_dismissed` | screen: achievements | Missing | Achievements |
| `profile_learning_preferences_viewed` | daily_goal_minutes, screen: profile | Missing | Learning Preferences |
| `profile_settings_viewed` | screen: profile | Missing | Settings |
| `profile_settings_dismissed` | screen: settings | Missing | Settings |
| `profile_setting_toggled` | setting: background_music, new_value, screen: settings | Missing | Toggle Background Music |
| `profile_setting_toggled` | setting: sound_effects, new_value, screen: settings | Missing | Toggle Sound Effects |
| `profile_setting_toggled` | setting: haptics, new_value, screen: settings | Missing | Toggle Vibration |
| `profile_nav_tapped` | destination: privacy_policy, screen: settings | Missing | Privacy Policy |
| `profile_nav_tapped` | destination: support, screen: settings | Missing | Support |
| `profile_nav_tapped` | destination: faq, screen: settings | Missing | FAQ |
| `profile_manage_subscription_tapped` | screen: settings | Missing | Manage Subscription |
| `profile_delete_account_tapped` | screen: settings | Missing | Delete Account |
| `profile_delete_account_cancelled` | screen: settings | Missing | Delete Confirmation Alert |
| `profile_delete_account_confirmed` | screen: settings | Missing | Delete Confirmation Alert |
| `user_session_out` | trigger: account_deleted, session_duration_seconds, had_selected_era | Wired | Account Deleted + Redirect |
| `user_account_deleted` | account_age_days, total_xp, adventures_completed | Wired | Account Deleted + Redirect |
| `profile_sign_out_tapped` | screen: profile | Missing | Sign Out |
| `user_session_out` | trigger: manual_profile, session_duration_seconds, had_selected_era | Wired | Sign Out |

---

## 5. Subscribe

| Event | Properties | Status | Screen |
|-------|-----------|--------|--------|
| `subscribe_tab_viewed` | paywall_type: embedded | Missing | Subscribe Tab |
| `$pageview` | page: subscription, url: /subscribe | Wired | Subscribe Tab |
| `onboarding_paywall_viewed` | paywall_type: custom | Missing | Onboarding Paywall |
| `onboarding_paywall_cta_tapped` | (no properties) | Missing | Onboarding Paywall |
| `daily_story_rewind_tapped` | story_date, is_subscribed, days_ago | Wired | Daily Story Rewind |
| `daily_story_rewind_blocked` | story_date, days_ago | Wired | Daily Story Rewind |
| `rewind_paywall_viewed` | paywall_type: revenuecat_modal, story_date, days_ago | Missing | Daily Story Rewind |
| `era_selected` | era_id, era_name, context: era_switch | Wired | Locked Era |
| `era_paywall_viewed` | paywall_type: revenuecat_modal, era_id, era_name | Missing | Locked Era |
| `ai_quiz_explanation_requested` | adventure_id, module_id | Wired | AI Quiz Explanation |
| `quiz_explanation_paywall_viewed` | paywall_type: inline_card, adventure_id, module_id | Missing | AI Quiz Explanation |
| `quiz_results_chat_to_learn_tapped` | adventure_id, module_id, era_id | Wired | Chat to Learn |
| `chat_to_learn_paywall_viewed` | paywall_type: revenuecat_modal, adventure_id, module_id | Missing | Chat to Learn |
| `subscribe_screen_viewed` | trigger, paywall_type (embedded / custom / revenuecat_modal / inline_card) | Wired | Paywall Presented |
| `paywall_plan_viewed` | (not tracked, RevenueCat UI handles internally) | Missing | Paywall Presented |
| `paywall_plan_selected` | (not tracked, RevenueCat UI handles internally) | Missing | Plan Selected |
| `subscribe_purchase_completed` | trigger, plan, era_id?, era_name? | Wired | Purchase Completed |
| `subscription_purchased` | product_id, plan_type, price_usd, currency, offering_id, is_trial | Wired | Purchase Completed |
| `$set` | rc_subscription_status: active, subscription_product_id, subscription_billing_cycle | Wired | Purchase Completed |
| `subscribe_purchase_cancelled` | trigger, era_id?, era_name? | Wired | Purchase Cancelled |
| `subscribe_purchase_failed` | trigger, error_code?, era_id?, era_name? | Wired | Purchase Failed |
| `subscribe_restore_tapped` | trigger: subscribe_tab | Wired | Restore Tapped |
| `subscribe_restore_success` | trigger, era_id?, era_name? | Wired | Restore Success |
| `$set` | rc_subscription_status: active, subscription_product_id, subscription_billing_cycle | Wired | Restore Success |
| `subscribe_restore_failed` | trigger: subscribe_tab | Wired | Restore Failed |
| `$set` | rc_subscription_status: active, subscription_product_id, subscription_billing_cycle | Wired | Subscriber Active |
| `subscription_activated` | (no properties) | Missing | Subscriber Active |

---

## 6. AI Chat

| Event | Properties | Status | Screen |
|-------|-----------|--------|--------|
| `ai_button_visible` | screen (current route pathname) | Missing | Floating Button |
| `ai_button_tapped` | screen (current route pathname) | Missing | Floating Button |
| `quiz_results_chat_to_learn_tapped` | adventure_id, module_id, previous_score, era_id, era_name | Wired | Quiz Results |
| `chat_to_learn_paywall_shown` | adventure_id, module_id, era_id, era_name, trigger: chat_to_learn | Wired | Quiz Results |
| `subscribe_purchase_completed` | trigger: chat_to_learn | Wired | Quiz Results |
| `subscribe_purchase_cancelled` | trigger: chat_to_learn | Wired | Quiz Results |
| `chat_to_learn_response` | era_id, response_length | Wired | Quiz Results |
| `ai_chat_viewed` | era_id, message_count | Wired | AI Chat Viewed |
| `ai_suggestion_tapped` | suggestion_text, era_id | Missing | Suggestion Tapped |
| `ai_chat_message_sent` | era_id, message_type (text / image), message_length, is_first_message | Wired | Message Sent |
| `ai_chat_response_received` | era_id, response_length, has_web_sources, web_sources_count | Wired | Text Response |
| `ai_chat_error` | era_id | Wired | Text Response |
| `ai_web_source_tapped` | source_url, source_title, era_id | Missing | Text Response |
| `ai_image_generated` | era_id | Wired | Image Generated |
| `ai_chat_error` | era_id | Wired | Image Generated |
| `ai_image_selected` | era_id, source: library | Wired | Upload Image |
| `ai_image_analyzed` | era_id, has_question | Wired | Image Analyzed |
| `ai_chat_error` | era_id | Wired | Image Analyzed |
| `ai_image_edited` | era_id | Wired | Image Edited |
| `ai_chat_error` | era_id | Wired | Image Edited |
| `ai_quota_exceeded` | request_type (chat / image_generate / image_edit / image_analyze), limit, is_subscriber | Wired | Quota Exceeded |
| `ai_action_menu_viewed` | era_id | Missing | Plus Menu |
| `ai_quick_prompt_tapped` | prompt_text, era_id | Missing | Plus Menu |
| `ai_image_shared` | era_id | Wired | Image Viewer |
| `ai_image_viewer_viewed` | era_id, image_type (generated / edited / uploaded) | Missing | Image Viewer |
| `ai_chat_history_cleared` | era_id, message_count (before clear) | Missing | Clear Chat |
| `ai_chat_dismissed` | era_id, message_count | Wired | Chat Dismissed |

---

## Global Events

### Onboarding Global

| Event | Properties | Status | Notes |
|-------|-----------|--------|-------|
| `onboarding_back_tapped` | screen | Missing | Needs implementation on every screen with a back button |
| `onboarding_skipped` | screen, action (skip / maybe_later) | Missing | Needs implementation on screens with Skip / Maybe later |
| `onboarding_app_backgrounded` | screen, time_on_screen_seconds | Missing | Needed to distinguish app-background from true drop-off |
| `onboarding_app_foregrounded` | screen, time_away_seconds | Missing | Needed to stitch resumed sessions |

### Learn Global

| Event | Properties | Status | Notes |
|-------|-----------|--------|-------|
| `lesson_dismissed` | adventure_id, module_id, lesson_id, time_spent_seconds, progress_at_exit | Missing | No analytics fire when user taps X to exit a lesson |
| `quiz_abandoned` | adventure_id, module_id, questions_answered, total_questions, time_spent_seconds | Missing | Quiz unmount logs to console but no PostHog event fires |
| `module_tracking` | era_number, adventure_number, module_number, lesson_type, time_spent_seconds, screen_presses, q1-q5 answers | Unwired | Exists in AnalyticsService (trackModuleEngagement) but not wired in current components |
| `drop_off` | screen_name, era_number, adventure_number, module_number, session_duration_seconds | Unwired | Exists in AnalyticsService (trackDropOff) but not wired in lesson/quiz components |
| `video_progress` | video_name, screen, progress_percent, duration_seconds | Unwired | Exists in AnalyticsService (trackVideoProgress) but not wired in lesson components |

### AI Chat Global

| Event | Properties | Status | Notes |
|-------|-----------|--------|-------|
| `ai_quiz_explanation_requested` | adventure_id, module_id, era_name, question_count | Wired | Wired in AIQuizExplanation.tsx |
| `ai_quiz_explanation_generated` | adventure_id, module_id, era_name, question_count, duration_ms | Wired | Wired in AIQuizExplanation.tsx |
