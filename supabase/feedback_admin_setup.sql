-- stand-alone SQL script for User Feedback & Admin persistent setup
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    selected_tags TEXT[],     -- e.g. ['extremely_accurate', 'fast']
    review_id UUID,          -- Optional: reference to the completed review
    review_type TEXT,        -- Optional: 'pr', 'codebase', 'api', 'folder'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and add Policies
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for own feedback" ON user_feedback;
CREATE POLICY "Allow select for own feedback" ON user_feedback
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow insert for own feedback" ON user_feedback;
CREATE POLICY "Allow insert for own feedback" ON user_feedback
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow admin read all feedback" ON user_feedback;
CREATE POLICY "Allow admin read all feedback" ON user_feedback
    FOR SELECT TO authenticated
    USING (
        (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
    );
