-- ============================================================
-- DevPulse: Complete Credit & Subscription System Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Ensure review_credits and last_reset_at exist on profiles
-- (safe to run even if 20260521090000 migration already ran)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS review_credits integer NOT NULL DEFAULT 10;
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS last_reset_at timestamptz NOT NULL DEFAULT now();

-- 2. Ensure new users get the right defaults
UPDATE public.profiles 
  SET review_credits = 10 
  WHERE review_credits IS NULL OR review_credits < 0;
UPDATE public.profiles 
  SET last_reset_at = now() 
  WHERE last_reset_at IS NULL;

-- 3. Add subscription_expires_at column to track when a paid plan expires
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

-- 4. Add review_type to reviews table for credit cost tracking
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS review_type TEXT;

-- 5. Create index for faster credit queries
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_last_reset ON public.profiles(last_reset_at);
CREATE INDEX IF NOT EXISTS idx_reviews_type ON public.reviews(review_type);

-- 6. Drop and recreate the renewal function with full logic
DROP FUNCTION IF EXISTS check_and_renew_profile_limits(uuid);

CREATE OR REPLACE FUNCTION check_and_renew_profile_limits(profile_id uuid)
RETURNS TABLE(
  credits_before integer,
  credits_after integer,
  plan_before text,
  plan_after text,
  was_renewed boolean
) AS $$
DECLARE
  p_rec RECORD;
  reset_interval INTERVAL := INTERVAL '30 days';
  v_was_renewed boolean := false;
  v_credits_before integer;
  v_credits_after integer;
  v_plan_before text;
  v_plan_after text;
BEGIN
  -- Lock row to prevent race conditions on concurrent requests
  SELECT * INTO p_rec 
  FROM public.profiles 
  WHERE id = profile_id 
  FOR UPDATE SKIP LOCKED;
  
  -- Profile not found or locked by another transaction, return safely
  IF p_rec.id IS NULL THEN
    RETURN QUERY SELECT 0, 0, 'unknown'::text, 'unknown'::text, false;
    RETURN;
  END IF;

  v_credits_before := p_rec.review_credits;
  v_plan_before := COALESCE(p_rec.plan, 'free');
  v_credits_after := v_credits_before;
  v_plan_after := v_plan_before;

  -- Check if 30 days have elapsed since the last reset
  IF now() >= COALESCE(p_rec.last_reset_at, now() - INTERVAL '31 days') + reset_interval THEN
    v_was_renewed := true;

    IF COALESCE(p_rec.plan, 'free') = 'free' THEN
      -- Free plan: renew credits back to 10
      v_credits_after := 10;
      v_plan_after := 'free';
    ELSIF p_rec.subscription_expires_at IS NOT NULL AND now() > p_rec.subscription_expires_at THEN
      -- Paid plan subscription has expired: downgrade to free
      v_credits_after := 10;
      v_plan_after := 'free';
    ELSE
      -- Active paid plan: renew credits for their tier
      -- Pro = 100 credits, Team = 500 credits per cycle
      CASE COALESCE(p_rec.plan, 'free')
        WHEN 'pro'  THEN v_credits_after := 100;
        WHEN 'team' THEN v_credits_after := 500;
        ELSE             v_credits_after := 10;
      END CASE;
    END IF;

    UPDATE public.profiles
    SET 
      plan = v_plan_after,
      review_credits = v_credits_after,
      last_reset_at = now(),
      reviews_used_this_month = 0,
      updated_at = now()
    WHERE id = profile_id;
  END IF;

  RETURN QUERY SELECT 
    v_credits_before, 
    v_credits_after, 
    v_plan_before, 
    v_plan_after, 
    v_was_renewed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_and_renew_profile_limits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_renew_profile_limits(uuid) TO service_role;

-- 8. Create a helper function to upgrade a user to a paid plan
CREATE OR REPLACE FUNCTION upgrade_user_plan(
  p_user_id uuid,
  p_plan text,          -- 'pro' | 'team'
  p_duration_days integer DEFAULT 30
)
RETURNS void AS $$
DECLARE
  v_credits integer;
BEGIN
  -- Compute credit allocation for the plan
  CASE p_plan
    WHEN 'pro'  THEN v_credits := 100;
    WHEN 'team' THEN v_credits := 500;
    ELSE RAISE EXCEPTION 'Unknown plan: %', p_plan;
  END CASE;

  UPDATE public.profiles
  SET
    plan = p_plan,
    review_credits = v_credits,
    last_reset_at = now(),
    subscription_expires_at = now() + (p_duration_days || ' days')::interval,
    reviews_used_this_month = 0,
    updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upgrade_user_plan(uuid, text, integer) TO service_role;

-- 9. Create a function to deduct credits atomically (prevents double-spend)
CREATE OR REPLACE FUNCTION deduct_review_credits(
  p_user_id uuid,
  p_cost integer,
  p_review_type text DEFAULT 'pr_review'
)
RETURNS TABLE(
  success boolean,
  credits_remaining integer,
  error_message text
) AS $$
DECLARE
  p_rec RECORD;
BEGIN
  -- Lock row for atomic deduction
  SELECT review_credits, plan INTO p_rec
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Profile not found'::text;
    RETURN;
  END IF;

  IF p_rec.review_credits < p_cost THEN
    RETURN QUERY SELECT 
      false, 
      p_rec.review_credits, 
      format(
        'Insufficient credits. You need %s credits but have %s. Upgrade your plan or wait for renewal.',
        p_cost, p_rec.review_credits
      )::text;
    RETURN;
  END IF;

  -- Deduct atomically
  UPDATE public.profiles
  SET 
    review_credits = review_credits - p_cost,
    reviews_used_this_month = reviews_used_this_month + 1,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN QUERY SELECT 
    true, 
    p_rec.review_credits - p_cost,
    NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION deduct_review_credits(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_review_credits(uuid, integer, text) TO service_role;

-- 10. Update handle_new_user trigger to include credits + reset date
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, display_name, avatar_url,
    plan, review_credits, last_reset_at, reviews_used_this_month
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    'free',
    10,
    now(),
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

-- 11. Add a view for admin monitoring of credit usage
CREATE OR REPLACE VIEW public.profiles_credit_summary AS
SELECT
  id,
  email,
  display_name,
  plan,
  review_credits,
  reviews_used_this_month,
  last_reset_at,
  subscription_expires_at,
  CASE
    WHEN plan = 'free' THEN 10
    WHEN plan = 'pro'  THEN 100
    WHEN plan = 'team' THEN 500
    ELSE 10
  END AS plan_total_credits,
  ROUND(
    CASE
      WHEN plan = 'free' THEN (review_credits::numeric / 10) * 100
      WHEN plan = 'pro'  THEN (review_credits::numeric / 100) * 100
      WHEN plan = 'team' THEN (review_credits::numeric / 500) * 100
      ELSE (review_credits::numeric / 10) * 100
    END, 1
  ) AS credits_remaining_pct,
  (last_reset_at + INTERVAL '30 days') AS next_renewal_at,
  created_at,
  updated_at
FROM public.profiles;
