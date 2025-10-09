-- Add foreign key relationship between notification_preferences and clerk_user
-- This enables the JOIN query in the edge function

-- Add the foreign key constraint
-- clerk_user table has 'user_id' column as primary key matching notification_preferences.user_id
ALTER TABLE notification_preferences
  ADD CONSTRAINT fk_notification_preferences_clerk_user
  FOREIGN KEY (user_id)
  REFERENCES clerk_user(user_id)
  ON DELETE CASCADE; -- If Clerk user deleted, remove their notification preferences

-- Add comment explaining the relationship
COMMENT ON CONSTRAINT fk_notification_preferences_clerk_user ON notification_preferences
  IS 'Links notification preferences to Clerk user for accessing last_active_at and other user data';
