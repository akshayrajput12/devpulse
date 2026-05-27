-- 1. Create review_api_logs table to track rolling RPM window
CREATE TABLE IF NOT EXISTS review_api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for rolling computations
CREATE INDEX IF NOT EXISTS idx_review_api_logs_created_at ON review_api_logs(created_at);

-- Automatic hourly log purge function
CREATE OR REPLACE FUNCTION purge_old_api_logs() RETURNS trigger AS $$
BEGIN
    DELETE FROM review_api_logs WHERE created_at < now() - INTERVAL '1 hour';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for log purge
DROP TRIGGER IF EXISTS trig_purge_old_api_logs ON review_api_logs;
CREATE TRIGGER trig_purge_old_api_logs
    AFTER INSERT ON review_api_logs
    FOR EACH ROW
    EXECUTE FUNCTION purge_old_api_logs();

-- 2. Create system_ai_keys table for Admin credentials rotation
CREATE TABLE IF NOT EXISTS system_ai_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('gemini', 'openai')),
    api_key_encrypted TEXT NOT NULL, -- Encrypted or standard key string
    label TEXT,                       -- Display identifier
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index active keys for rapid selection
CREATE INDEX IF NOT EXISTS idx_active_ai_keys ON system_ai_keys(provider) WHERE is_active = TRUE;

-- Initialize default dynamic settings parameters
INSERT INTO system_settings (key, value, updated_at) 
VALUES 
    ('queue_concurrency', '4', timezone('utc'::text, now())),
    ('global_rpm_limit', '100', timezone('utc'::text, now()))
ON CONFLICT (key) DO NOTHING;

-- 3. High-Capacity claims RPC version 3
DROP FUNCTION IF EXISTS claim_next_queue_item_v3(text);
CREATE OR REPLACE FUNCTION claim_next_queue_item_v3(p_worker_id TEXT)
RETURNS TABLE (
    q_id UUID, -- Fixed: returns UUID to match review_queue.id type
    q_review_id UUID,
    q_folder_analysis_id UUID,
    q_review_type TEXT,
    q_attempts INT
) AS $$
DECLARE
    v_recent_calls INT;
    v_claimed_id UUID; -- Fixed: UUID type
    v_active_keys INT;
    v_rpm_limit INT;
BEGIN
    -- Count active keys in rotation pool
    SELECT COUNT(*) INTO v_active_keys 
    FROM system_ai_keys 
    WHERE is_active = TRUE;

    -- Dynamically resolve global limit (defaults to count * 100 or override setting)
    SELECT COALESCE(
        (SELECT value::INT FROM system_settings WHERE key = 'global_rpm_limit'),
        (v_active_keys * 100),
        100
    ) INTO v_rpm_limit;

    -- Calculate active rolling execution rate in last 60 seconds
    SELECT COUNT(*) INTO v_recent_calls 
    FROM review_api_logs 
    WHERE created_at >= now() - INTERVAL '60 seconds';

    -- Lock and retrieve next pending task if within limits
    IF v_recent_calls < v_rpm_limit THEN
        UPDATE review_queue
        SET status = 'processing',
            attempts = attempts + 1,
            updated_at = now()
        WHERE id = (
            SELECT id FROM review_queue
            WHERE status = 'pending'
               OR (status = 'failed' AND attempts < max_attempts AND next_retry_at <= now())
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED -- Enables instant concurrent scaling across multiple instances
        )
        RETURNING id INTO v_claimed_id;

        -- Record execution timestamp log
        IF v_claimed_id IS NOT NULL THEN
            INSERT INTO review_api_logs (id) VALUES (gen_random_uuid());
            
            RETURN QUERY 
            SELECT id, review_id, folder_analysis_id, review_type, attempts
            FROM review_queue
            WHERE id = v_claimed_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Enable Row Level Security and add Policies for Authenticated Admin authorization
ALTER TABLE system_ai_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for authenticated admins" ON system_ai_keys;
CREATE POLICY "Allow select for authenticated admins" ON system_ai_keys
    FOR SELECT TO authenticated
    USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);

DROP POLICY IF EXISTS "Allow insert for authenticated admins" ON system_ai_keys;
CREATE POLICY "Allow insert for authenticated admins" ON system_ai_keys
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);

DROP POLICY IF EXISTS "Allow update for authenticated admins" ON system_ai_keys;
CREATE POLICY "Allow update for authenticated admins" ON system_ai_keys
    FOR UPDATE TO authenticated
    USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true)
    WITH CHECK ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);

DROP POLICY IF EXISTS "Allow delete for authenticated admins" ON system_ai_keys;
CREATE POLICY "Allow delete for authenticated admins" ON system_ai_keys
    FOR DELETE TO authenticated
    USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);

-- Enable RLS and establish policies for system_settings parameters
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select system_settings for all authenticated users" ON system_settings;
CREATE POLICY "Allow select system_settings for all authenticated users" ON system_settings
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow admin adjustments on system_settings" ON system_settings;
CREATE POLICY "Allow admin adjustments on system_settings" ON system_settings
    FOR ALL TO authenticated
    USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true)
    WITH CHECK ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);
