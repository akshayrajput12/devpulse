-- ============================================================
-- DevPulse: API & Backend Analyser — Database Migration (Fixed)
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Ensure review_type column exists on public.reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS review_type TEXT DEFAULT 'pr_review';

-- 2. Drop the check constraint if it exists, so we can clean up the data safely
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_review_type_check;

-- 3. Standardize and clean up any existing NULL or empty review_type values
UPDATE public.reviews
  SET review_type = 'pr_review'
  WHERE review_type IS NULL OR review_type = '';

-- 4. Update existing codebase audit reviews based on pr_url pattern
UPDATE public.reviews
  SET review_type = 'codebase_audit'
  WHERE pr_url LIKE '%/workspace%'
    AND review_type = 'pr_review';

-- 5. Update existing API analysis reviews based on pr_title or search parameters pattern
UPDATE public.reviews
  SET review_type = 'api_analysis'
  WHERE (
    pr_title ILIKE 'API & Backend Audit%'
    OR pr_title ILIKE 'API&Backend Audit%'
    OR pr_url LIKE '%type=api%'
  )
  AND review_type != 'api_analysis';

-- 6. Update existing folder analysis reviews based on patterns if any
UPDATE public.reviews
  SET review_type = 'folder_analysis'
  WHERE pr_url LIKE '%type=folder%'
    AND review_type = 'pr_review';

-- 7. Now enforce NOT NULL and the updated check constraint (supporting folder_analysis)
ALTER TABLE public.reviews
  ALTER COLUMN review_type SET NOT NULL,
  ALTER COLUMN review_type SET DEFAULT 'pr_review';

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_review_type_check
  CHECK (review_type IN ('pr_review', 'codebase_audit', 'api_analysis', 'folder_analysis'));

-- 8. Create index for filtering by review_type
CREATE INDEX IF NOT EXISTS idx_reviews_review_type
  ON public.reviews (review_type);

-- ============================================================
-- Verify the migration
-- ============================================================
SELECT 
  review_type,
  COUNT(*) as count
FROM public.reviews
GROUP BY review_type
ORDER BY review_type;
