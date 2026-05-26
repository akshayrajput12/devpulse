
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  reviews_used_this_month INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pr_url TEXT NOT NULL,
  repo_owner TEXT,
  repo_name TEXT,
  pr_number INT,
  pr_title TEXT,
  pr_author TEXT,
  branch_from TEXT,
  branch_to TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | complete | failed
  error_message TEXT,
  health_score INT,
  summary TEXT,
  files_changed INT,
  additions INT,
  deletions INT,
  share_token TEXT UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_own_all" ON public.reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_public_share" ON public.reviews FOR SELECT USING (is_public = true AND share_token IS NOT NULL);

-- Findings
CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  severity TEXT NOT NULL, -- crit | high | med | low | ok
  category TEXT, -- security | bug | performance | style | tests
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
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "findings_select_own" ON public.findings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id = auth.uid())
);
CREATE POLICY "findings_select_public" ON public.findings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.is_public = true)
);
CREATE POLICY "findings_insert_own" ON public.findings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id = auth.uid())
);

CREATE INDEX idx_reviews_user_created ON public.reviews(user_id, created_at DESC);
CREATE INDEX idx_findings_review ON public.findings(review_id);
CREATE INDEX idx_reviews_share_token ON public.reviews(share_token) WHERE share_token IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime for reviews + findings
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.findings;
