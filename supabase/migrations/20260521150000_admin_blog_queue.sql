-- ============================================================
-- DevPulse: Admin Dashboard, Review Queue & Blog System Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Ensure is_admin exists on profiles (default false)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Drop NOT NULL on user_id in github_installations if table exists
-- This resolves webhook errors when Git installations are received but no account claims them yet
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'github_installations') THEN
    ALTER TABLE public.github_installations ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- 3. Create review_queue table to process heavy operations in the background
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

-- 4. Enable Row Level Security (RLS) on review_queue
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security policies for review_queue
-- Admin has full master control
CREATE POLICY review_queue_admin_all ON public.review_queue
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Authenticated users can view queue progress linked to their own reviews or folder analyses
CREATE POLICY review_queue_select_own ON public.review_queue
  FOR SELECT USING (
    (review_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id = auth.uid()))
    OR
    (folder_analysis_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.folder_analyses fa WHERE fa.id = folder_analysis_id AND fa.user_id = auth.uid()))
  );

-- 6. Create public blog_posts table
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

-- 7. Enable RLS on blog_posts
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 8. Policies for blog_posts
-- Select: Public users can read published, admins can read drafts too
CREATE POLICY blog_posts_select ON public.blog_posts
  FOR SELECT USING (
    published = true 
    OR (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  );

-- Write Operations: Admin only
CREATE POLICY blog_posts_admin_write ON public.blog_posts
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 9. Setup triggers for updated_at auto-updates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_review_queue') THEN
    CREATE TRIGGER set_updated_at_review_queue
      BEFORE UPDATE ON public.review_queue
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_blog_posts') THEN
    CREATE TRIGGER set_updated_at_blog_posts
      BEFORE UPDATE ON public.blog_posts
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END $$;

-- 10. Thread-safe Queue Lock Handler Function (FOR UPDATE SKIP LOCKED)
-- Claims next available job atomically in concurrent environments
CREATE OR REPLACE FUNCTION public.claim_next_queue_item(p_worker_id text DEFAULT '')
RETURNS TABLE (
  q_id uuid,
  q_review_id uuid,
  q_folder_analysis_id uuid,
  q_review_type text,
  q_attempts integer
) AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id
    FROM public.review_queue
    WHERE status = 'pending' 
       OR (status = 'failed' AND attempts < max_attempts AND next_retry_at <= now())
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.review_queue
    SET 
      status = 'processing',
      attempts = attempts + 1,
      updated_at = now()
    WHERE id = r.id
    RETURNING id, review_id, folder_analysis_id, review_type, attempts 
    INTO q_id, q_review_id, q_folder_analysis_id, q_review_type, q_attempts;
    
    RETURN NEXT;
    RETURN;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.claim_next_queue_item(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_queue_item(text) TO service_role;

-- 11. Useful indexing
CREATE INDEX IF NOT EXISTS idx_review_queue_status_retry ON public.review_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(published, published_at DESC);
