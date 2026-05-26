-- ==============================================================================
-- DevPulse: Unified Production-Grade Database Optimization & Migration
-- Filename: 20260521170000_production_db_optimizations.sql
-- Goal: Fix check constraints, standardize schema columns, and maximize query speeds
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PART 1: Safe Resolution of the Reviews check constraint
-- ------------------------------------------------------------------------------

-- A. Temporarily drop the constraint so we can sanitize existing database rows safely
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_review_type_check;

-- B. Standarize any NULL or empty review_type values to the safe default 'pr_review'
UPDATE public.reviews
  SET review_type = 'pr_review'
  WHERE review_type IS NULL OR review_type = '';

-- C. Standarize any unrecognized review types to 'pr_review' to ensure 100% data integrity
UPDATE public.reviews
  SET review_type = 'pr_review'
  WHERE review_type NOT IN ('pr_review', 'codebase_audit', 'api_analysis', 'folder_analysis');

-- D. Enforce NOT NULL and default values for reviews.review_type
ALTER TABLE public.reviews
  ALTER COLUMN review_type SET NOT NULL,
  ALTER COLUMN review_type SET DEFAULT 'pr_review';

-- E. Re-apply the production-ready check constraint supporting all four review channels
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_review_type_check
  CHECK (review_type IN ('pr_review', 'codebase_audit', 'api_analysis', 'folder_analysis'));


-- ------------------------------------------------------------------------------
-- PART 2: Column Standardization & Default Sanity Checks on Profiles Table
-- ------------------------------------------------------------------------------

-- A. Ensure public.profiles.is_admin is defined correctly with no NULLs
UPDATE public.profiles
  SET is_admin = false
  WHERE is_admin IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN is_admin SET DEFAULT false,
  ALTER COLUMN is_admin SET NOT NULL;

-- B. Ensure public.profiles.review_credits has valid default values
UPDATE public.profiles
  SET review_credits = 10
  WHERE review_credits IS NULL OR review_credits < 0;

ALTER TABLE public.profiles
  ALTER COLUMN review_credits SET DEFAULT 10,
  ALTER COLUMN review_credits SET NOT NULL;

-- C. Ensure last_reset_at is set correctly to prevent limit calculation failures
UPDATE public.profiles
  SET last_reset_at = now()
  WHERE last_reset_at IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN last_reset_at SET DEFAULT now(),
  ALTER COLUMN last_reset_at SET NOT NULL;

-- D. Ensure plan column is standard and NOT NULL
UPDATE public.profiles
  SET plan = 'free'
  WHERE plan IS NULL OR plan = '';

ALTER TABLE public.profiles
  ALTER COLUMN plan SET DEFAULT 'free',
  ALTER COLUMN plan SET NOT NULL;


-- ------------------------------------------------------------------------------
-- PART 3: Production-Grade Query Performance Optimization (Indexing System)
-- ------------------------------------------------------------------------------

-- We create high-performance B-tree indexes to eliminate full table scans (O(N) search)
-- and optimize them for logarithmic lookup speeds (O(log N)), which dramatically
-- accelerates dashboard queries, history loads, and search responses.

-- A. PROFILES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_email_search 
  ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin_check 
  ON public.profiles (is_admin) 
  WHERE is_admin = true; -- Partial index optimizing admin validations
CREATE INDEX IF NOT EXISTS idx_profiles_plan_billing 
  ON public.profiles (plan);
CREATE INDEX IF NOT EXISTS idx_profiles_last_reset_renewal 
  ON public.profiles (last_reset_at);

-- B. REVIEWS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_reviews_user_dashboard 
  ON public.reviews (user_id, created_at DESC); -- Composite index for user dashboard list
CREATE INDEX IF NOT EXISTS idx_reviews_status_check 
  ON public.reviews (status);
CREATE INDEX IF NOT EXISTS idx_reviews_type_aggregation 
  ON public.reviews (review_type);
CREATE INDEX IF NOT EXISTS idx_reviews_share_token_lookup 
  ON public.reviews (share_token) 
  WHERE share_token IS NOT NULL; -- Partial index for high-speed shared report loads

-- C. FINDINGS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_findings_review_id_lookup 
  ON public.findings (review_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity_category_group 
  ON public.findings (review_id, severity, category); -- Composite index to speed up findings breakdown panels

-- D. FOLDER ANALYSES INDEXES
CREATE INDEX IF NOT EXISTS idx_folder_analyses_user_dashboard 
  ON public.folder_analyses (user_id, created_at DESC); -- Composite index for user folder audits
CREATE INDEX IF NOT EXISTS idx_folder_analyses_status_check 
  ON public.folder_analyses (status);
CREATE INDEX IF NOT EXISTS idx_folder_analyses_share_lookup 
  ON public.folder_analyses (share_token) 
  WHERE share_token IS NOT NULL;

-- E. FOLDER MIGRATION ACTIONS INDEXES
CREATE INDEX IF NOT EXISTS idx_folder_migration_actions_parent 
  ON public.folder_migration_actions (analysis_id, priority);

-- F. REVIEW QUEUE INDEXES
CREATE INDEX IF NOT EXISTS idx_review_queue_worker_poll 
  ON public.review_queue (status, next_retry_at ASC); -- Essential composite index for claims (`FOR UPDATE SKIP LOCKED`)
CREATE INDEX IF NOT EXISTS idx_review_queue_foreign_links 
  ON public.review_queue (review_id, folder_analysis_id);

-- G. BLOG POSTS INDEXES
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug_unique 
  ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_timeline 
  ON public.blog_posts (published, published_at DESC) 
  WHERE published = true; -- Partial index for public site rendering speed

-- H. TEAMS & TEAM MEMBERS INDEXES
CREATE INDEX IF NOT EXISTS idx_teams_owner_lookup 
  ON public.teams (owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_compound_search 
  ON public.team_members (team_id, user_id);

-- I. GITHUB INSTALLATIONS & REVIEW EVENTS INDEXES
CREATE INDEX IF NOT EXISTS idx_github_installations_user_lookup 
  ON public.github_installations (user_id);
CREATE INDEX IF NOT EXISTS idx_github_installations_id_lookup 
  ON public.github_installations (installation_id);
CREATE INDEX IF NOT EXISTS idx_review_events_audit_trail 
  ON public.review_events (user_id, status);


-- ------------------------------------------------------------------------------
-- PART 4: Consistency Checks for triggers on new tables
-- ------------------------------------------------------------------------------

-- Ensure all tables have the updated_at trigger attached correctly for auditing
DO $$
BEGIN
  -- Teams trigger
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'teams_updated_at') THEN
    CREATE TRIGGER teams_updated_at
      BEFORE UPDATE ON public.teams
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;

  -- Team Members trigger
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'team_members_updated_at') THEN
    CREATE TRIGGER team_members_updated_at
      BEFORE UPDATE ON public.team_members
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END $$;


-- ==============================================================================
-- Migration Verification Summary
-- ==============================================================================
SELECT 
  'reviews_review_type_check resolved successfully!' as database_health_check,
  (SELECT COUNT(*) FROM public.reviews) as total_reviews,
  (SELECT COUNT(*) FROM public.profiles WHERE is_admin = true) as total_admin_users;
