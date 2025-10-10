-- Badge System Schema

-- Badge definitions table (seeded with all available badges)
CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- ACH_EarnedXP, ACH_MonthlyActive, etc.
  level INTEGER NOT NULL,
  displayName TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, level)
);

-- User badges table (badges earned by users)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id UUID NOT NULL REFERENCES badge_definitions(id),
  user_id TEXT NOT NULL,
  receivedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Add totalXP to user_data table
ALTER TABLE user_data ADD COLUMN IF NOT EXISTS totalXP INTEGER DEFAULT 0;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_definitions_name_level ON badge_definitions(name, level);

-- Avatar system tables
CREATE TABLE IF NOT EXISTS avatar_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  unlock_message TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID NOT NULL REFERENCES avatar_types(id),
  user_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, avatar_id)
);

-- Indexes for avatar tables
CREATE INDEX IF NOT EXISTS idx_user_avatars_user_id ON user_avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_avatars_avatar_id ON user_avatars(avatar_id);

-- Seed initial badge definitions
INSERT INTO badge_definitions (name, level, displayName, threshold) VALUES
  -- EarnedXP badges
  ('ACH_EarnedXP', 1, '100 XP', 100),
  ('ACH_EarnedXP', 2, '250 XP', 250),
  ('ACH_EarnedXP', 3, '400 XP', 400),
  ('ACH_EarnedXP', 4, '550 XP', 550),

  -- MonthlyActive badges (threshold = number of months)
  ('ACH_MonthlyActive', 1, '1 Month Active', 1),
  ('ACH_MonthlyActive', 2, '2 Months Active', 2),
  ('ACH_MonthlyActive', 3, '3 Months Active', 3)
ON CONFLICT (name, level) DO NOTHING;

-- Seed avatar types (historical figures)
INSERT INTO avatar_types (name, role, unlock_message, image_url) VALUES
  ('Al-Khwarizmi', 'Father of Algebra', 'Complete your first module', 'avatars/Al-Khwarizmi.png'),
  ('Fatima al-Fihri', 'Founder of the world''s first university (Al-Qarawiyyin)', 'Complete your first module', 'avatars/Fatima-al-Fihri.png'),
  ('Ibn Sina (Avicenna)', 'Philosopher-physician', 'Complete your first module', 'avatars/Ibn-Sina-Avicenna.png'),
  ('Ziryab', 'Cultural icon and musician', 'Complete your first module', 'avatars/Ziryab.png'),
  ('Al-Razi', 'Early medical pioneer', 'Complete 5 modules', 'avatars/Al-Razi.png'),
  ('Ibn Battuta', 'World traveler', 'Complete 5 modules', 'avatars/Ibn-Battuta.png'),
  ('Lubna of Córdoba', 'Scholar and calligrapher', 'Complete 5 modules', 'avatars/Lubna-of-Cordoba.png'),
  ('Mariam al-Asturlabi', 'Astrolabe maker and scientist', 'Complete 10 modules', 'avatars/Mariam-al-Asturlabi.png'),
  ('Zaynab al-Shahda', 'Scholar and teacher', 'Complete 10 modules', 'avatars/Zaynab-al-Shahda.png')
ON CONFLICT (name) DO NOTHING;
