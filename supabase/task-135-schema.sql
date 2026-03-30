-- TASK-135: Payment Flow & Launch Readiness — Schema Migrations
-- Run in Supabase SQL Editor (or via CLI migration)

-- 1. Add LemonSqueezy tracking columns to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS ls_order_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS ls_subscription_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure email has a unique constraint for upsert support
-- (Skip if already exists — will error harmlessly if duplicate)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_email_key'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_email_key UNIQUE (email);
  END IF;
END $$;

-- 2. Create solve_usage table for server-side trial enforcement
CREATE TABLE IF NOT EXISTS solve_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  solve_count integer DEFAULT 0,
  trial_started_at timestamptz DEFAULT now(),
  last_solve_at timestamptz,
  UNIQUE(email)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_solve_usage_email ON solve_usage(email);

-- 3. RLS policies

-- solve_usage: service role can read/write, anon cannot
ALTER TABLE solve_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Service role full access on solve_usage"
  ON solve_usage
  FOR ALL
  USING (auth.role() = 'service_role');

-- subscriptions: allow service role full access for webhook writes
-- (Keep existing RLS policies; add service role if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subscriptions' AND policyname = 'Service role full access on subscriptions'
  ) THEN
    CREATE POLICY "Service role full access on subscriptions"
      ON subscriptions
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;
