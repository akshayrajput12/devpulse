-- ============================================================
-- DevPulse: Recursion-Free Admin Checker & Master RLS Policies
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create a recursion-free Admin checker function
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Security Definer bypasses RLS, avoiding infinite recursion when checking profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;

-- 2. Clean up any existing policies to prevent duplicate constraint conflicts
DROP POLICY IF EXISTS profiles_admin_select ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
DROP POLICY IF EXISTS reviews_admin_all ON public.reviews;
DROP POLICY IF EXISTS folder_analyses_admin_all ON public.folder_analyses;
DROP POLICY IF EXISTS findings_admin_all ON public.findings;
DROP POLICY IF EXISTS folder_migration_actions_admin_all ON public.folder_migration_actions;
DROP POLICY IF EXISTS review_queue_admin_all ON public.review_queue;
DROP POLICY IF EXISTS blog_posts_admin_write ON public.blog_posts;

-- 3. Add clean, recursion-free policies for public.profiles table
-- Allows administrators to read and update any user profile
CREATE POLICY profiles_admin_select ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));

CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE USING (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));

-- 4. Add master override policies for reviews, audits, and findings
CREATE POLICY reviews_admin_all ON public.reviews
  FOR ALL USING (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));

CREATE POLICY folder_analyses_admin_all ON public.folder_analyses
  FOR ALL USING (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));

CREATE POLICY findings_admin_all ON public.findings
  FOR ALL USING (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));

CREATE POLICY folder_migration_actions_admin_all ON public.folder_migration_actions
  FOR ALL USING (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));

-- 5. Recreate queue and blog policies using our super-fast is_admin helper
CREATE POLICY review_queue_admin_all ON public.review_queue
  FOR ALL USING (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));

CREATE POLICY blog_posts_admin_write ON public.blog_posts
  FOR ALL USING (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));
