-- ============================================================
-- DevPulse: Indian Tech Market Pricing & Cost Safeguards SQL
-- Date: 2026-05-23
-- ============================================================

-- 1. Create the pricing_plans metadata table
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_monthly integer NOT NULL, -- in INR, e.g. 0, 999
  price_annual_monthly integer NOT NULL, -- in INR, e.g. 0, 799
  credits integer NOT NULL, -- e.g. 10, 150
  max_files_per_pr integer NOT NULL, -- e.g. 5, 35
  features text[] NOT NULL,
  recommended boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Seed Free Forever and Developer Pro plans (strict Indian Market Pricing)
INSERT INTO public.pricing_plans (id, name, price_monthly, price_annual_monthly, credits, max_files_per_pr, features, recommended)
VALUES 
('free', 'Free Forever', 0, 0, 10, 5, ARRAY['10 Monthly Credits', 'Max 5 files/PR', 'Gemini-Only', 'No CC Required'], false),
('pro', 'Developer Pro', 999, 799, 150, 35, ARRAY['150 Monthly Credits', 'Max 35 files/PR', 'OpenAI Fallback', 'Direct Priority Support'], true)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    price_annual_monthly = EXCLUDED.price_annual_monthly,
    credits = EXCLUDED.credits,
    max_files_per_pr = EXCLUDED.max_files_per_pr,
    features = EXCLUDED.features,
    recommended = EXCLUDED.recommended;

-- 3. Enable RLS on pricing_plans table
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- 4. Enable public read access for all users (anon or authenticated)
DROP POLICY IF EXISTS "Allow reading pricing plans for all" ON public.pricing_plans;
CREATE POLICY "Allow reading pricing plans for all"
  ON public.pricing_plans
  FOR SELECT
  USING (true);

-- 5. Auto-downgrade any old "team" plan users in the profiles table to "pro"
UPDATE public.profiles
SET plan = 'pro', review_credits = 150, updated_at = now()
WHERE plan = 'team';

-- 6. Re-define check_and_renew_profile_limits trigger to map strictly to Free (10) and Pro (150)
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
      v_credits_after := 10;
      v_plan_after := 'free';
    ELSIF p_rec.subscription_expires_at IS NOT NULL AND now() > p_rec.subscription_expires_at THEN
      -- Paid plan subscription has expired: downgrade to free
      v_credits_after := 10;
      v_plan_after := 'free';
    ELSE
      -- Active paid pro plan: renew credits to 150
      IF COALESCE(p_rec.plan, 'free') = 'pro' THEN
        v_credits_after := 150;
        v_plan_after := 'pro';
      ELSE
        -- Fallback or other plan is mapped to free
        v_credits_after := 10;
        v_plan_after := 'free';
      END IF;
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

-- 7. Re-define upgrade_user_plan trigger to map strictly to Pro (150)
CREATE OR REPLACE FUNCTION upgrade_user_plan(
  p_user_id uuid,
  p_plan text,          -- 'pro'
  p_duration_days integer DEFAULT 30
)
RETURNS void AS $$
DECLARE
  v_credits integer;
BEGIN
  -- Compute credit allocation for the plan
  CASE p_plan
    WHEN 'pro' THEN v_credits := 150;
    ELSE RAISE EXCEPTION 'Unknown or unsupported plan: %', p_plan;
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

-- 8. Re-define profiles_credit_summary view to map Free (10) and Pro (150)
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
    WHEN plan = 'pro'  THEN 150
    ELSE 10
  END AS plan_total_credits,
  ROUND(
    CASE
      WHEN plan = 'free' THEN (review_credits::numeric / 10) * 100
      WHEN plan = 'pro'  THEN (review_credits::numeric / 150) * 100
      ELSE (review_credits::numeric / 10) * 100
    END, 1
  ) AS credits_remaining_pct,
  (last_reset_at + INTERVAL '30 days') AS next_renewal_at,
  created_at,
  updated_at
FROM public.profiles;

-- 9. Create payment_transactions table to log transaction status and prevent multiple billing upgrades
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id text PRIMARY KEY, -- razorpay_payment_id
  order_id text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL, -- in Paise
  billing_cycle text NOT NULL, -- 'monthly' | 'annual'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Allow reading payment transactions only for the user
DROP POLICY IF EXISTS "Allow users to read their own payment transactions" ON public.payment_transactions;
CREATE POLICY "Allow users to read their own payment transactions"
  ON public.payment_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow service_role key to manage transactions (internal backend triggers)
DROP POLICY IF EXISTS "Allow service_role to manage payment transactions" ON public.payment_transactions;
CREATE POLICY "Allow service_role to manage payment transactions"
  ON public.payment_transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

