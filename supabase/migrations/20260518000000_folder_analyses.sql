-- Folder Structure Analysis tables
-- Stores results from the DevPulse AI folder analyzer

-- Main analysis record (mirrors structure of public.reviews)
CREATE TABLE public.folder_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Repository info
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,

  -- Shareable token (like reviews.share_token)
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),

  -- Status
  status TEXT NOT NULL DEFAULT 'complete', -- complete | failed
  error_message TEXT,

  -- AI scores
  organization_score INT CHECK (organization_score >= 0 AND organization_score <= 100),
  grade TEXT CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  stack_detected TEXT,

  -- Current analysis (arrays stored as JSONB)
  strengths JSONB NOT NULL DEFAULT '[]',
  weaknesses JSONB NOT NULL DEFAULT '[]',
  critical_issues JSONB NOT NULL DEFAULT '[]',

  -- Ideal structure output
  ideal_description TEXT,
  ideal_tree TEXT,                          -- full ASCII tree from Gemini
  ideal_key_decisions JSONB NOT NULL DEFAULT '[]',

  -- Per-folder annotations map { "src/lib": { status, note } }
  folder_annotations JSONB NOT NULL DEFAULT '{}',

  -- Raw GitHub git tree items for re-rendering [{ path, type }]
  file_tree JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.folder_analyses ENABLE ROW LEVEL SECURITY;

-- Owners can do everything
CREATE POLICY "fa_select_own" ON public.folder_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "fa_insert_own" ON public.folder_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fa_update_own" ON public.folder_analyses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "fa_delete_own" ON public.folder_analyses
  FOR DELETE USING (auth.uid() = user_id);

-- Anyone can view via share_token (public share link)
CREATE POLICY "fa_select_by_token" ON public.folder_analyses
  FOR SELECT USING (share_token IS NOT NULL);


-- Migration actions (one row per action item)
CREATE TABLE public.folder_migration_actions (
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

ALTER TABLE public.folder_migration_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fma_select_own" ON public.folder_migration_actions
  FOR SELECT USING (
    analysis_id IN (SELECT id FROM public.folder_analyses WHERE user_id = auth.uid())
  );

CREATE POLICY "fma_insert_own" ON public.folder_migration_actions
  FOR INSERT WITH CHECK (
    analysis_id IN (SELECT id FROM public.folder_analyses WHERE user_id = auth.uid())
  );

CREATE POLICY "fma_delete_own" ON public.folder_migration_actions
  FOR DELETE USING (
    analysis_id IN (SELECT id FROM public.folder_analyses WHERE user_id = auth.uid())
  );

-- Anyone with share link can see actions for that analysis
CREATE POLICY "fma_select_public" ON public.folder_migration_actions
  FOR SELECT USING (
    analysis_id IN (SELECT id FROM public.folder_analyses WHERE share_token IS NOT NULL)
  );


-- Auto-update updated_at trigger (reuse existing function)
CREATE TRIGGER set_updated_at_folder_analyses
  BEFORE UPDATE ON public.folder_analyses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


-- Index for dashboard listing (user's recent analyses)
CREATE INDEX idx_folder_analyses_user_created
  ON public.folder_analyses (user_id, created_at DESC);

-- Index for share link lookup
CREATE INDEX idx_folder_analyses_share_token
  ON public.folder_analyses (share_token);
