-- ==============================================================================
-- DEVPULSE — MASTER IDEMPOTENT DATABASE SCHEMA, RLS, RPCS & REPAIR SCRIPT (V2.4)
-- ==============================================================================
-- SAFE TO RUN ON ANY DATABASE (EMPTY, PARTIAL, OR ALREADY MIGRATED):
--   • Uses CREATE TABLE IF NOT EXISTS & ALTER TABLE ... ADD COLUMN IF NOT EXISTS
--   • Uses DROP POLICY IF EXISTS before every CREATE POLICY (no duplicate errors)
--   • Uses CREATE OR REPLACE FUNCTION & DROP TRIGGER IF EXISTS
--   • Uses non-recursive SECURITY DEFINER helpers (is_admin, is_team_member)
--   • Fixes SQLSTATE 42501 ("permission denied for table review_queue")
--   • Fixes system_ai_keys, system_settings, findings, folder_analyses & billing RLS
--   • Cleans up invalid health_score values on failed / pending / processing rows
--   • Enables Supabase Realtime publication safely on reviews & findings
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard -> SQL Editor -> New Query
--   2. Paste this entire file and click "Run"
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- 1. CORE HELPER TRIGGER FUNCTION (updated_at)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ==============================================================================
-- 2. ALL 17 TABLES + SAFE COLUMN UPGRADES
-- ==============================================================================

-- 2.1 profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  reviews_used_this_month INT NOT NULL DEFAULT 0,
  review_credits INT NOT NULL DEFAULT 10,
  last_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscription_expires_at TIMESTAMPTZ,
  github_username TEXT,
  github_access_token TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  has_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reviews_used_this_month INT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS review_credits INT NOT NULL DEFAULT 10;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_access_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_password BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2.2 reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pr_url TEXT NOT NULL,
  review_type TEXT NOT NULL DEFAULT 'pr_review',
  repo_owner TEXT,
  repo_name TEXT,
  pr_number INT,
  pr_title TEXT,
  pr_author TEXT,
  branch_from TEXT,
  branch_to TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  health_score INT DEFAULT NULL,
  summary TEXT,
  files_changed INT,
  additions INT,
  deletions INT,
  share_token TEXT UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS review_type TEXT DEFAULT 'pr_review';
ALTER TABLE public.reviews ALTER COLUMN health_score SET DEFAULT NULL;

-- Normalize legacy review_type values cleanly before adding constraint
UPDATE public.reviews SET review_type = 'pr_review' WHERE review_type IS NULL OR review_type = '';
UPDATE public.reviews SET review_type = 'codebase_audit' WHERE pr_url LIKE '%/workspace%' AND review_type = 'pr_review';
UPDATE public.reviews SET review_type = 'api_analysis'
  WHERE (pr_title ILIKE 'API & Backend Audit%' OR pr_title ILIKE 'API&Backend Audit%' OR pr_url LIKE '%type=api%')
    AND review_type <> 'api_analysis';
UPDATE public.reviews SET review_type = 'folder_analysis' WHERE pr_url LIKE '%type=folder%' AND review_type = 'pr_review';

ALTER TABLE public.reviews ALTER COLUMN review_type SET NOT NULL;
ALTER TABLE public.reviews ALTER COLUMN review_type SET DEFAULT 'pr_review';
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_review_type_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_review_type_check
  CHECK (review_type IN ('pr_review', 'codebase_audit', 'api_analysis', 'folder_analysis'));

-- Clean up any bogus health scores on failed / pending / processing reviews
UPDATE public.reviews
SET health_score = NULL
WHERE status IN ('failed', 'pending', 'processing')
  AND health_score IS NOT NULL;

-- 2.3 findings
CREATE TABLE IF NOT EXISTS public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  severity TEXT NOT NULL,
  category TEXT,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  line_start INT,
  line_end INT,
  bad_code TEXT,
  suggested_fix TEXT,
  confidence INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 teams
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 team_members
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(team_id, user_id)
);

-- 2.6 github_installations (nullable user_id so unclaimed webhook installs never error)
CREATE TABLE IF NOT EXISTS public.github_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  installation_id BIGINT NOT NULL UNIQUE,
  account_login TEXT NOT NULL,
  account_type TEXT,
  repository_selection TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.github_installations ALTER COLUMN user_id DROP NOT NULL;

-- 2.7 review_events
CREATE TABLE IF NOT EXISTS public.review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  installation_id BIGINT,
  pr_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  review_id UUID,
  status TEXT NOT NULL DEFAULT 'queued',
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 folder_analyses
CREATE TABLE IF NOT EXISTS public.folder_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  organization_score INT CHECK (organization_score >= 0 AND organization_score <= 100),
  grade TEXT CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  stack_detected TEXT,
  strengths JSONB NOT NULL DEFAULT '[]',
  weaknesses JSONB NOT NULL DEFAULT '[]',
  critical_issues JSONB NOT NULL DEFAULT '[]',
  ideal_description TEXT,
  ideal_tree TEXT,
  ideal_key_decisions JSONB NOT NULL DEFAULT '[]',
  folder_annotations JSONB NOT NULL DEFAULT '{}',
  file_tree JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.9 folder_migration_actions
CREATE TABLE IF NOT EXISTS public.folder_migration_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.folder_analyses(id) ON DELETE CASCADE,
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  action TEXT NOT NULL,
  from_path TEXT NOT NULL DEFAULT '',
  to_path TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.10 review_queue
CREATE TABLE IF NOT EXISTS public.review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  folder_analysis_id UUID REFERENCES public.folder_analyses(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL CHECK (review_type IN ('pr_review', 'codebase_audit', 'api_analysis', 'folder_analysis')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.11 blog_posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.12 system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.13 system_ai_keys
CREATE TABLE IF NOT EXISTS public.system_ai_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('gemini', 'openai')),
  api_key_encrypted TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.14 review_api_logs
CREATE TABLE IF NOT EXISTS public.review_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.15 pricing_plans
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL,
  price_annual_monthly INTEGER NOT NULL,
  credits INTEGER NOT NULL,
  max_files_per_pr INTEGER NOT NULL,
  features TEXT[] NOT NULL,
  recommended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.16 payment_transactions
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  billing_cycle TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.17 user_feedback
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  selected_tags TEXT[],
  review_id UUID,
  review_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. SECURITY DEFINER HELPERS (Prevent Infinite RLS Recursion)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = p_user_id LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(_team_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members WHERE team_id = _team_id AND user_id = _user_id
    UNION
    SELECT 1 FROM public.teams WHERE id = _team_id AND owner_id = _user_id
  );
$$;

-- ==============================================================================
-- 4. CORE RPC FUNCTIONS & AUTOMATION TRIGGERS
-- ==============================================================================

-- 4.1 Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, plan, review_credits, last_reset_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'free',
    10,
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4.2 updated_at triggers
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS reviews_updated_at ON public.reviews;
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_folder_analyses ON public.folder_analyses;
CREATE TRIGGER set_updated_at_folder_analyses BEFORE UPDATE ON public.folder_analyses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_review_queue ON public.review_queue;
CREATE TRIGGER set_updated_at_review_queue BEFORE UPDATE ON public.review_queue FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_blog_posts ON public.blog_posts;
CREATE TRIGGER set_updated_at_blog_posts BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4.3 30-day credit renewal & Pro expiry check
CREATE OR REPLACE FUNCTION public.check_and_renew_profile_limits(profile_id UUID)
RETURNS TABLE(
  credits_before INTEGER,
  credits_after INTEGER,
  plan_before TEXT,
  plan_after TEXT,
  was_renewed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_rec RECORD;
  reset_interval INTERVAL := INTERVAL '30 days';
  v_was_renewed BOOLEAN := false;
  v_credits_before INTEGER;
  v_credits_after INTEGER;
  v_plan_before TEXT;
  v_plan_after TEXT;
BEGIN
  SELECT * INTO p_rec FROM public.profiles WHERE id = profile_id FOR UPDATE SKIP LOCKED;
  IF p_rec.id IS NULL THEN
    RETURN QUERY SELECT 0, 0, 'unknown'::TEXT, 'unknown'::TEXT, false;
    RETURN;
  END IF;

  v_credits_before := COALESCE(p_rec.review_credits, 10);
  v_plan_before := COALESCE(p_rec.plan, 'free');
  v_credits_after := v_credits_before;
  v_plan_after := v_plan_before;

  IF now() >= COALESCE(p_rec.last_reset_at, now() - INTERVAL '31 days') + reset_interval THEN
    v_was_renewed := true;
    IF v_plan_before = 'free' THEN
      v_credits_after := 10;
      v_plan_after := 'free';
    ELSIF p_rec.subscription_expires_at IS NOT NULL AND now() > p_rec.subscription_expires_at THEN
      v_credits_after := 10;
      v_plan_after := 'free';
    ELSIF v_plan_before = 'pro' THEN
      v_credits_after := 150;
      v_plan_after := 'pro';
    ELSE
      v_credits_after := 10;
      v_plan_after := 'free';
    END IF;

    UPDATE public.profiles
    SET plan = v_plan_after,
        review_credits = v_credits_after,
        last_reset_at = now(),
        reviews_used_this_month = 0,
        updated_at = now()
    WHERE id = profile_id;
  END IF;

  RETURN QUERY SELECT v_credits_before, v_credits_after, v_plan_before, v_plan_after, v_was_renewed;
END;
$$;

-- 4.4 Atomic Pro plan upgrade
CREATE OR REPLACE FUNCTION public.upgrade_user_plan(
  p_user_id UUID,
  p_plan TEXT,
  p_duration_days INTEGER DEFAULT 30
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  CASE p_plan
    WHEN 'pro' THEN v_credits := 150;
    WHEN 'free' THEN v_credits := 10;
    ELSE RAISE EXCEPTION 'Unknown or unsupported plan: %', p_plan;
  END CASE;

  UPDATE public.profiles
  SET plan = p_plan,
      review_credits = v_credits,
      last_reset_at = now(),
      subscription_expires_at = CASE WHEN p_plan = 'free' THEN NULL ELSE now() + (p_duration_days || ' days')::INTERVAL END,
      reviews_used_this_month = 0,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- 4.5 Queue Claim RPC v1 & v3 (SECURITY DEFINER + FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.claim_next_queue_item(p_worker_id TEXT DEFAULT '')
RETURNS TABLE (
  q_id UUID,
  q_review_id UUID,
  q_folder_analysis_id UUID,
  q_review_type TEXT,
  q_attempts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.review_queue
    WHERE status = 'pending'
       OR (status = 'failed' AND attempts < max_attempts AND next_retry_at <= now())
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.review_queue
    SET status = 'processing', attempts = attempts + 1, updated_at = now()
    WHERE id = r.id
    RETURNING id, review_id, folder_analysis_id, review_type, attempts
    INTO q_id, q_review_id, q_folder_analysis_id, q_review_type, q_attempts;
    RETURN NEXT;
    RETURN;
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.claim_next_queue_item_v3(TEXT);
CREATE OR REPLACE FUNCTION public.claim_next_queue_item_v3(p_worker_id TEXT DEFAULT '')
RETURNS TABLE (
  q_id UUID,
  q_review_id UUID,
  q_folder_analysis_id UUID,
  q_review_type TEXT,
  q_attempts INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_calls INT;
  v_claimed_id UUID;
  v_active_keys INT;
  v_rpm_limit INT;
BEGIN
  SELECT COUNT(*) INTO v_active_keys FROM public.system_ai_keys WHERE is_active = TRUE;
  SELECT COALESCE(
    (SELECT value::INT FROM public.system_settings WHERE key = 'global_rpm_limit'),
    GREATEST(v_active_keys * 100, 100),
    100
  ) INTO v_rpm_limit;

  SELECT COUNT(*) INTO v_recent_calls
  FROM public.review_api_logs
  WHERE created_at >= now() - INTERVAL '60 seconds';

  IF v_recent_calls < v_rpm_limit THEN
    UPDATE public.review_queue
    SET status = 'processing',
        attempts = attempts + 1,
        updated_at = now()
    WHERE id = (
      SELECT id FROM public.review_queue
      WHERE status = 'pending'
         OR (status = 'failed' AND attempts < max_attempts AND next_retry_at <= now())
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id INTO v_claimed_id;

    IF v_claimed_id IS NOT NULL THEN
      INSERT INTO public.review_api_logs (id) VALUES (gen_random_uuid());
      RETURN QUERY
      SELECT id, review_id, folder_analysis_id, review_type, attempts
      FROM public.review_queue
      WHERE id = v_claimed_id;
    END IF;
  END IF;
END;
$$;

-- 4.6 Log & Queue Cleanup Triggers
CREATE OR REPLACE FUNCTION public.purge_old_api_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.review_api_logs WHERE created_at < now() - INTERVAL '1 hour';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_purge_old_api_logs ON public.review_api_logs;
CREATE TRIGGER trig_purge_old_api_logs
  AFTER INSERT ON public.review_api_logs
  FOR EACH ROW EXECUTE FUNCTION public.purge_old_api_logs();

CREATE OR REPLACE FUNCTION public.purge_completed_queue_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    DELETE FROM public.review_queue WHERE id = NEW.id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trig_purge_completed_queue_item ON public.review_queue;
CREATE TRIGGER trig_purge_completed_queue_item
  AFTER UPDATE OF status ON public.review_queue
  FOR EACH ROW EXECUTE FUNCTION public.purge_completed_queue_item();

CREATE OR REPLACE FUNCTION public.archive_old_detailed_findings()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_review_limit INT := 20;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.findings
    SET bad_code = NULL,
        suggested_fix = NULL,
        description = 'Detailed code snippet archived to preserve database limits. Metrics retained.'
    WHERE review_id IN (
      SELECT id FROM public.reviews
      WHERE user_id = NEW.user_id
      ORDER BY created_at DESC
      OFFSET v_review_limit
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_archive_old_detailed_findings ON public.reviews;
CREATE TRIGGER trig_archive_old_detailed_findings
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.archive_old_detailed_findings();

-- 4.7 Credit Summary View
CREATE OR REPLACE VIEW public.profiles_credit_summary AS
SELECT
  id, email, display_name, plan, review_credits, reviews_used_this_month,
  last_reset_at, subscription_expires_at,
  CASE WHEN plan = 'pro' THEN 150 ELSE 10 END AS plan_total_credits,
  ROUND(
    CASE WHEN plan = 'pro' THEN (review_credits::numeric / 150) * 100
         ELSE (review_credits::numeric / 10) * 100 END, 1
  ) AS credits_remaining_pct,
  (last_reset_at + INTERVAL '30 days') AS next_renewal_at,
  created_at, updated_at
FROM public.profiles;

-- ==============================================================================
-- 5. ENABLE RLS & CLEAN NON-RECURSIVE POLICIES ON ALL 17 TABLES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_migration_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_ai_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_admin_all" ON public.profiles FOR DELETE USING (public.is_admin(auth.uid()));

-- reviews
DROP POLICY IF EXISTS "reviews_own_all" ON public.reviews;
DROP POLICY IF EXISTS "reviews_public_share" ON public.reviews;
DROP POLICY IF EXISTS "reviews_admin_select" ON public.reviews;
CREATE POLICY "reviews_own_all" ON public.reviews FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "reviews_public_share" ON public.reviews FOR SELECT USING (is_public = true AND share_token IS NOT NULL);

-- findings
DROP POLICY IF EXISTS "findings_select_own" ON public.findings;
DROP POLICY IF EXISTS "findings_select_public" ON public.findings;
DROP POLICY IF EXISTS "findings_insert_own" ON public.findings;
DROP POLICY IF EXISTS "findings_delete_own" ON public.findings;
CREATE POLICY "findings_select_own" ON public.findings FOR SELECT USING (
  public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id = auth.uid())
);
CREATE POLICY "findings_select_public" ON public.findings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.is_public = true)
);
CREATE POLICY "findings_insert_own" ON public.findings FOR INSERT WITH CHECK (
  public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id = auth.uid())
);
CREATE POLICY "findings_delete_own" ON public.findings FOR DELETE USING (
  public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id = auth.uid())
);

-- teams & team_members
DROP POLICY IF EXISTS "teams_owner_all" ON public.teams;
DROP POLICY IF EXISTS "teams_member_select" ON public.teams;
CREATE POLICY "teams_owner_all" ON public.teams FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "teams_member_select" ON public.teams FOR SELECT USING (public.is_team_member(id, auth.uid()));

DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
DROP POLICY IF EXISTS "team_members_owner_manage" ON public.team_members;
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "team_members_owner_manage" ON public.team_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()));

-- github_installations & review_events
DROP POLICY IF EXISTS "gh_inst_own_all" ON public.github_installations;
CREATE POLICY "gh_inst_own_all" ON public.github_installations FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "review_events_select_own" ON public.review_events;
CREATE POLICY "review_events_select_own" ON public.review_events FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- folder_analyses & folder_migration_actions
DROP POLICY IF EXISTS "fa_select_own" ON public.folder_analyses;
DROP POLICY IF EXISTS "fa_insert_own" ON public.folder_analyses;
DROP POLICY IF EXISTS "fa_update_own" ON public.folder_analyses;
DROP POLICY IF EXISTS "fa_delete_own" ON public.folder_analyses;
DROP POLICY IF EXISTS "fa_select_by_token" ON public.folder_analyses;
CREATE POLICY "fa_select_own" ON public.folder_analyses FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "fa_insert_own" ON public.folder_analyses FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "fa_update_own" ON public.folder_analyses FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "fa_delete_own" ON public.folder_analyses FOR DELETE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "fa_select_by_token" ON public.folder_analyses FOR SELECT USING (share_token IS NOT NULL);

DROP POLICY IF EXISTS "fma_select_own" ON public.folder_migration_actions;
DROP POLICY IF EXISTS "fma_insert_own" ON public.folder_migration_actions;
DROP POLICY IF EXISTS "fma_delete_own" ON public.folder_migration_actions;
DROP POLICY IF EXISTS "fma_select_public" ON public.folder_migration_actions;
CREATE POLICY "fma_select_own" ON public.folder_migration_actions FOR SELECT USING (
  analysis_id IN (SELECT id FROM public.folder_analyses WHERE user_id = auth.uid())
);
CREATE POLICY "fma_insert_own" ON public.folder_migration_actions FOR INSERT WITH CHECK (
  analysis_id IN (SELECT id FROM public.folder_analyses WHERE user_id = auth.uid())
);
CREATE POLICY "fma_delete_own" ON public.folder_migration_actions FOR DELETE USING (
  analysis_id IN (SELECT id FROM public.folder_analyses WHERE user_id = auth.uid())
);
CREATE POLICY "fma_select_public" ON public.folder_migration_actions FOR SELECT USING (
  analysis_id IN (SELECT id FROM public.folder_analyses WHERE share_token IS NOT NULL)
);

-- review_queue (permissive for workers + explicit table grants below fix 42501 permanently)
DROP POLICY IF EXISTS review_queue_admin_all ON public.review_queue;
DROP POLICY IF EXISTS review_queue_select_own ON public.review_queue;
DROP POLICY IF EXISTS review_queue_public_insert ON public.review_queue;
DROP POLICY IF EXISTS review_queue_public_select ON public.review_queue;
DROP POLICY IF EXISTS review_queue_public_update ON public.review_queue;
DROP POLICY IF EXISTS review_queue_public_delete ON public.review_queue;
CREATE POLICY review_queue_public_select ON public.review_queue FOR SELECT USING (true);
CREATE POLICY review_queue_public_insert ON public.review_queue FOR INSERT WITH CHECK (true);
CREATE POLICY review_queue_public_update ON public.review_queue FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY review_queue_public_delete ON public.review_queue FOR DELETE USING (true);

-- blog_posts
DROP POLICY IF EXISTS blog_posts_select ON public.blog_posts;
DROP POLICY IF EXISTS blog_posts_admin_write ON public.blog_posts;
CREATE POLICY blog_posts_select ON public.blog_posts FOR SELECT USING (published = true OR public.is_admin(auth.uid()));
CREATE POLICY blog_posts_admin_write ON public.blog_posts FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- system_settings
DROP POLICY IF EXISTS "Allow select system_settings for all authenticated users" ON public.system_settings;
DROP POLICY IF EXISTS "Allow admin adjustments on system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_read_all" ON public.system_settings;
CREATE POLICY "system_settings_read_all" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Allow admin adjustments on system_settings" ON public.system_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- system_ai_keys (strictly admin or service_role)
DROP POLICY IF EXISTS "Allow select for authenticated admins" ON public.system_ai_keys;
DROP POLICY IF EXISTS "Allow insert for authenticated admins" ON public.system_ai_keys;
DROP POLICY IF EXISTS "Allow update for authenticated admins" ON public.system_ai_keys;
DROP POLICY IF EXISTS "Allow delete for authenticated admins" ON public.system_ai_keys;
CREATE POLICY "Allow select for authenticated admins" ON public.system_ai_keys FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Allow insert for authenticated admins" ON public.system_ai_keys FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Allow update for authenticated admins" ON public.system_ai_keys FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Allow delete for authenticated admins" ON public.system_ai_keys FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- review_api_logs
DROP POLICY IF EXISTS "review_api_logs_all" ON public.review_api_logs;
CREATE POLICY "review_api_logs_all" ON public.review_api_logs FOR ALL USING (true) WITH CHECK (true);

-- pricing_plans
DROP POLICY IF EXISTS "Allow reading pricing plans for all" ON public.pricing_plans;
CREATE POLICY "Allow reading pricing plans for all" ON public.pricing_plans FOR SELECT USING (true);

-- payment_transactions
DROP POLICY IF EXISTS "Allow users to read their own payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Allow service_role to manage payment transactions" ON public.payment_transactions;
CREATE POLICY "Allow users to read their own payment transactions" ON public.payment_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Allow service_role to manage payment transactions" ON public.payment_transactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- user_feedback
DROP POLICY IF EXISTS "Allow select for own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Allow insert for own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Allow admin read all feedback" ON public.user_feedback;
CREATE POLICY "Allow select for own feedback" ON public.user_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Allow insert for own feedback" ON public.user_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 6. EXPLICIT TABLE, SEQUENCE & RPC GRANTS (Fixes SQLSTATE 42501 Everywhere)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON public.pricing_plans, public.blog_posts, public.system_settings, public.reviews, public.findings, public.folder_analyses, public.folder_migration_actions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_queue, public.review_api_logs TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_team_member(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_and_renew_profile_limits(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upgrade_user_plan(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_next_queue_item(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_next_queue_item_v3(TEXT) TO anon, authenticated, service_role;

-- ==============================================================================
-- 7. INDEXES & REALTIME PUBLICATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON public.profiles(is_blocked);
CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON public.reviews(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_review_type ON public.reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_reviews_share_token ON public.reviews(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_findings_review ON public.findings(review_id);
CREATE INDEX IF NOT EXISTS idx_folder_analyses_user_created ON public.folder_analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_folder_analyses_share_token ON public.folder_analyses(share_token);
CREATE INDEX IF NOT EXISTS idx_review_queue_status_retry ON public.review_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_api_logs_created_at ON public.review_api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_active_ai_keys ON public.system_ai_keys(provider) WHERE is_active = TRUE;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.findings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.folder_analyses;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- 8. DEFAULT SEED DATA (Idempotent)
-- ==============================================================================
INSERT INTO public.system_settings (key, value, updated_at)
VALUES
  ('ai_provider', 'both', now()),
  ('parallel_engine_enabled', 'true', now()),
  ('queue_concurrency', '4', now()),
  ('global_rpm_limit', '100', now())
ON CONFLICT (key) DO NOTHING;

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

-- Verification summary
SELECT
  'DevPulse Master Schema & Repair Completed Successfully!' AS status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS public_tables_count;
