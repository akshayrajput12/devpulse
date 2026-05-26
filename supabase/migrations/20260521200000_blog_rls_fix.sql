-- ==============================================================================
-- DevPulse: Recursion-Free RLS Policies for blog_posts Table
-- Filename: 20260521200000_blog_rls_fix.sql
-- ==============================================================================

-- 1. Drop old select policy that references profiles table directly (causing RLS recursion/violations)
DROP POLICY IF EXISTS blog_posts_select ON public.blog_posts;

-- 2. Recreate blog_posts_select using the recursion-free is_admin security-definer helper
CREATE POLICY blog_posts_select ON public.blog_posts
  FOR SELECT USING (
    published = true 
    OR (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  );

-- 3. Ensure the admin write policy is perfectly clean and has explicit WITH CHECK
DROP POLICY IF EXISTS blog_posts_admin_write ON public.blog_posts;

CREATE POLICY blog_posts_admin_write ON public.blog_posts
  FOR ALL USING (
    auth.uid() IS NOT NULL AND public.is_admin(auth.uid())
  ) WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_admin(auth.uid())
  );

-- 4. Verification Statement
SELECT 'Blog posts recursion-free RLS policies applied cleanly!' as status;
