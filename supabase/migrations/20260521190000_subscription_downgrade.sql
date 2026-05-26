-- ==============================================================================
-- DevPulse: Subscription Downgrade Policy, Review Type Cleansing & Admin RLS fixes
-- Filename: 20260521190000_subscription_downgrade.sql
-- ==============================================================================

-- PART 1: Restructure check_and_renew_profile_limits with immediate expiry check
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

  -- 1. Check if paid plan subscription has expired (IMMEDIATE GATE)
  IF p_rec.plan <> 'free' AND p_rec.subscription_expires_at IS NOT NULL AND now() > p_rec.subscription_expires_at THEN
    v_was_renewed := true;
    v_plan_after := 'free';
    v_credits_after := 10;

    UPDATE public.profiles
    SET 
      plan = 'free',
      review_credits = 10,
      subscription_expires_at = NULL,
      last_reset_at = now(),
      reviews_used_this_month = 0,
      updated_at = now()
    WHERE id = profile_id;

  -- 2. Else check standard 30-day cycle renewal
  ELSIF now() >= COALESCE(p_rec.last_reset_at, now() - INTERVAL '31 days') + reset_interval THEN
    v_was_renewed := true;

    IF COALESCE(p_rec.plan, 'free') = 'free' THEN
      v_credits_after := 10;
      v_plan_after := 'free';
    ELSIF p_rec.subscription_expires_at IS NOT NULL AND now() > p_rec.subscription_expires_at THEN
      v_credits_after := 10;
      v_plan_after := 'free';
      
      UPDATE public.profiles 
      SET subscription_expires_at = NULL 
      WHERE id = profile_id;
    ELSE
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


-- PART 2: Database Sanitization & Constraint Recreation

-- A. Sanitizing public.reviews table constraints
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_review_type_check;

-- Clean review_type inputs: trim and force lowercase
UPDATE public.reviews
SET review_type = LOWER(TRIM(review_type))
WHERE review_type IS NOT NULL;

-- Map fuzzy matching entries to exact allowed types
UPDATE public.reviews
SET review_type = 
  CASE 
    WHEN review_type LIKE 'api%' THEN 'api_analysis'
    WHEN review_type LIKE 'code%' THEN 'codebase_audit'
    WHEN review_type LIKE 'fold%' THEN 'folder_analysis'
    WHEN review_type LIKE 'pr%' THEN 'pr_review'
    ELSE 'pr_review'
  END
WHERE review_type IS NOT NULL;

UPDATE public.reviews
SET review_type = 'pr_review'
WHERE review_type IS NULL OR review_type = '';

ALTER TABLE public.reviews
  ALTER COLUMN review_type SET NOT NULL,
  ALTER COLUMN review_type SET DEFAULT 'pr_review';

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_review_type_check
  CHECK (review_type IN ('pr_review', 'codebase_audit', 'api_analysis', 'folder_analysis'));


-- B. Sanitizing public.review_queue table constraints
ALTER TABLE public.review_queue DROP CONSTRAINT IF EXISTS review_queue_review_type_check;

-- Clean review_queue review_type inputs
UPDATE public.review_queue
SET review_type = LOWER(TRIM(review_type))
WHERE review_type IS NOT NULL;

UPDATE public.review_queue
SET review_type = 
  CASE 
    WHEN review_type LIKE 'api%' THEN 'api_analysis'
    WHEN review_type LIKE 'code%' THEN 'codebase_audit'
    WHEN review_type LIKE 'fold%' THEN 'folder_analysis'
    WHEN review_type LIKE 'pr%' THEN 'pr_review'
    ELSE 'pr_review'
  END
WHERE review_type IS NOT NULL;

ALTER TABLE public.review_queue
  ADD CONSTRAINT review_queue_review_type_check
  CHECK (review_type IN ('pr_review', 'codebase_audit', 'api_analysis', 'folder_analysis'));


-- PART 3: Admin profiles DELETE RLS policy

DROP POLICY IF EXISTS profiles_admin_delete ON public.profiles;

CREATE POLICY profiles_admin_delete ON public.profiles
  FOR DELETE USING (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));


-- PART 4: Verification Statement
SELECT 'Subscription Expiry Gate and RLS Admin fixes applied cleanly!' as status;
