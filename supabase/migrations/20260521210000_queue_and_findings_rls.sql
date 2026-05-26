-- ==============================================================================
-- DevPulse: review_queue permissive policies & findings delete access
-- Filename: 20260521210000_queue_and_findings_rls.sql
-- ==============================================================================

-- 1. Drop existing restrictive policies on public.review_queue
DROP POLICY IF EXISTS review_queue_admin_all ON public.review_queue;
DROP POLICY IF EXISTS review_queue_select_own ON public.review_queue;
DROP POLICY IF EXISTS review_queue_public_insert ON public.review_queue;
DROP POLICY IF EXISTS review_queue_public_select ON public.review_queue;
DROP POLICY IF EXISTS review_queue_public_update ON public.review_queue;
DROP POLICY IF EXISTS review_queue_public_delete ON public.review_queue;

-- 2. Make public.review_queue completely permissive for all (authenticated and anonymous background processes)
-- This ensures queue insertions, claims, status updates, and deletes succeed seamlessly.
CREATE POLICY review_queue_public_insert ON public.review_queue
  FOR INSERT WITH CHECK (true);

CREATE POLICY review_queue_public_select ON public.review_queue
  FOR SELECT USING (true);

CREATE POLICY review_queue_public_update ON public.review_queue
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY review_queue_public_delete ON public.review_queue
  FOR DELETE USING (true);

-- 3. Grant claim_next_queue_item RPC execution to anon & authenticated
-- This permits the anonymous local background worker to claim/lock jobs atomically.
GRANT EXECUTE ON FUNCTION public.claim_next_queue_item(text) TO anon;
GRANT EXECUTE ON FUNCTION public.claim_next_queue_item(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_queue_item(text) TO service_role;

-- 4. Add DELETE policy on findings table to allow users to purge/retry their own findings
DROP POLICY IF EXISTS findings_delete_own ON public.findings;

CREATE POLICY findings_delete_own ON public.findings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_id AND r.user_id = auth.uid()
    )
  );

-- 5. Verification statement
SELECT 'review_queue and findings RLS migration applied cleanly!' as status;
