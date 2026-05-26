-- Migration: Dynamic Configuration Seed for Parallel Slicing Engine
-- Date: 2026-05-24

-- Seed dynamic parallel engine toggle configuration to enable it by default
INSERT INTO public.system_settings (key, value, updated_at)
VALUES ('parallel_engine_enabled', 'true', timezone('utc'::text, now()))
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = timezone('utc'::text, now());
