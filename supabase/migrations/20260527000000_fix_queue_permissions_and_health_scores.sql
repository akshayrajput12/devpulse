-- ==============================================================================
-- DevPulse: Fix review_queue table & RPC grants + sanitize invalid health scores
-- Filename: 20260527000000_fix_queue_permissions_and_health_scores.sql
-- ==============================================================================

-- 1. Grant explicit table privileges on public.review_queue so queue operations
--    never fail with SQLSTATE 42501 ("permission denied for table review_queue")
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_queue TO anon, authenticated, service_role;

-- 2. Grant execute on v3 (and v1) queue claim RPCs if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'claim_next_queue_item_v3'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.claim_next_queue_item_v3(text) TO anon, authenticated, service_role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'claim_next_queue_item'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.claim_next_queue_item(text) TO anon, authenticated, service_role';
  END IF;
END $$;

-- 3. Remove any bogus health_score values on failed / pending / processing reviews
--    so the Dashboard Average Health Score only reflects completed reviews.
UPDATE public.reviews
SET health_score = NULL
WHERE status IN ('failed', 'pending', 'processing')
  AND health_score IS NOT NULL;

-- 4. Ensure reviews.health_score defaults to NULL on new inserts
ALTER TABLE public.reviews
  ALTER COLUMN health_score SET DEFAULT NULL;

SELECT 'review_queue grants & review health_score cleanup applied cleanly!' AS status;
