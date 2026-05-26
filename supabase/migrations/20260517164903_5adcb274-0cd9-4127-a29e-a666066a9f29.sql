
-- TEAMS
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'member',
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(team_id, user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Security definer helper to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members WHERE team_id = _team_id AND user_id = _user_id
    UNION
    SELECT 1 FROM public.teams WHERE id = _team_id AND owner_id = _user_id
  )
$$;

CREATE POLICY "teams_owner_all" ON public.teams FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "teams_member_select" ON public.teams FOR SELECT USING (public.is_team_member(id, auth.uid()));

CREATE POLICY "team_members_select" ON public.team_members FOR SELECT USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "team_members_owner_manage" ON public.team_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()));

-- GITHUB APP INSTALLATIONS
CREATE TABLE public.github_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  installation_id bigint NOT NULL UNIQUE,
  account_login text NOT NULL,
  account_type text,
  repository_selection text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.github_installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gh_inst_own_all" ON public.github_installations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REVIEW EVENTS (webhook queue audit)
CREATE TABLE public.review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  installation_id bigint,
  pr_url text NOT NULL,
  event_type text NOT NULL,
  review_id uuid,
  status text NOT NULL DEFAULT 'queued',
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_events_select_own" ON public.review_events FOR SELECT
  USING (auth.uid() = user_id);

-- Optional GitHub OAuth token storage on profiles (for repo access)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_access_token text;
