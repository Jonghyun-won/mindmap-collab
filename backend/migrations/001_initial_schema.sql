-- Initial Schema: Collaborators Table
-- Migration: 001_initial_schema.sql

-- Create collaborators table
CREATE TABLE IF NOT EXISTS public.collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mindmap_id UUID NOT NULL REFERENCES public.mindmaps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mindmap_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_collaborators_mindmap ON public.collaborators(mindmap_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON public.collaborators(user_id);

-- Enable Row Level Security
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view collaborators on mindmaps they own or collaborate on
CREATE POLICY IF NOT EXISTS select_collaborators ON public.collaborators
    FOR SELECT USING (
        mindmap_id IN (
            SELECT id FROM public.mindmaps WHERE owner_id = auth.uid()
            UNION
            SELECT mindmap_id FROM public.collaborators WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Only mindmap owners can add collaborators
CREATE POLICY IF NOT EXISTS insert_collaborators ON public.collaborators
    FOR INSERT WITH CHECK (
        mindmap_id IN (SELECT id FROM public.mindmaps WHERE owner_id = auth.uid())
    );

-- RLS Policy: Only mindmap owners can update collaborator permissions
CREATE POLICY IF NOT EXISTS update_collaborators ON public.collaborators
    FOR UPDATE USING (
        mindmap_id IN (SELECT id FROM public.mindmaps WHERE owner_id = auth.uid())
    );

-- RLS Policy: Only mindmap owners can delete collaborators
CREATE POLICY IF NOT EXISTS delete_collaborators ON public.collaborators
    FOR DELETE USING (
        mindmap_id IN (SELECT id FROM public.mindmaps WHERE owner_id = auth.uid())
    );

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE 'Migration 001_initial_schema.sql completed successfully';
END $$;
