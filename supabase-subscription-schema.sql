-- Subscription Management Table for Stripe Webhooks
-- This table tracks user subscriptions and their status

CREATE TABLE user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Stripe identifiers
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  
  -- User identification (links to Clerk user ID)
  user_id TEXT, -- Will be populated when user links subscription to account
  
  -- Subscription details
  status TEXT NOT NULL, -- 'incomplete', 'active', 'past_due', 'canceled', 'unpaid'
  plan_interval TEXT NOT NULL, -- 'month' or 'year'
  plan_amount INTEGER NOT NULL, -- Amount in cents (499 for £4.99)
  
  -- Billing periods
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  
  -- Lifecycle timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  canceled_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_user_subscriptions_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_stripe_customer_id ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- Row Level Security (RLS)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can update their own subscriptions (for linking accounts)
CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Allow service role to manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage all subscriptions" ON user_subscriptions
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- View for active subscriptions (useful for access control)
CREATE VIEW active_subscriptions AS 
SELECT 
    user_id,
    stripe_subscription_id,
    stripe_customer_id,
    plan_interval,
    plan_amount,
    current_period_start,
    current_period_end,
    created_at
FROM user_subscriptions 
WHERE status = 'active' AND current_period_end > NOW();

-- Grant permissions for the view
ALTER TABLE active_subscriptions OWNER TO postgres;

-- Comments for documentation
COMMENT ON TABLE user_subscriptions IS 'Tracks user subscription status from Stripe webhooks';
COMMENT ON COLUMN user_subscriptions.stripe_subscription_id IS 'Stripe subscription ID (e.g., sub_1S5...)';
COMMENT ON COLUMN user_subscriptions.stripe_customer_id IS 'Stripe customer ID (e.g., cus_1S5...)';
COMMENT ON COLUMN user_subscriptions.user_id IS 'Clerk user ID - linked when user signs in';
COMMENT ON COLUMN user_subscriptions.status IS 'Stripe subscription status';
COMMENT ON COLUMN user_subscriptions.plan_amount IS 'Amount in cents (499 for £4.99/month)';
COMMENT ON VIEW active_subscriptions IS 'View of currently active subscriptions for access control';