-- Migration: System Settings for AI Providers
-- Date: 2026-05-22

CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed dynamic provider configuration
INSERT INTO public.system_settings (key, value)
VALUES ('ai_provider', 'both')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow reading system settings for all authenticated users
CREATE POLICY "Allow reading system settings for all authenticated users"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow modifying system settings only for admin profiles
CREATE POLICY "Allow modifying system settings only for admin profiles"
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
