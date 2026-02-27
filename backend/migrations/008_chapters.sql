-- Chapters table: multi-chapter support for mindmaps
-- Migration: 008_chapters.sql

-- Create chapters table
CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mindmap_id UUID NOT NULL REFERENCES public.mindmaps(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    yjs_state BYTEA,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mindmap_id, position)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chapters_mindmap ON public.chapters(mindmap_id);
CREATE INDEX IF NOT EXISTS idx_chapters_position ON public.chapters(mindmap_id, position);

-- Enable Row Level Security
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view chapters of accessible mindmaps
-- (owner or collaborator with any permission)
CREATE POLICY IF NOT EXISTS select_chapters ON public.chapters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.mindmaps m
            WHERE m.id = chapters.mindmap_id
            AND (
                m.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.collaborators c
                    WHERE c.mindmap_id = m.id AND c.user_id = auth.uid()
                )
            )
        )
    );

-- RLS Policy: Users with edit/admin permission can insert chapters
CREATE POLICY IF NOT EXISTS insert_chapters ON public.chapters
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.mindmaps m
            WHERE m.id = chapters.mindmap_id
            AND (
                m.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.collaborators c
                    WHERE c.mindmap_id = m.id
                    AND c.user_id = auth.uid()
                    AND c.permission IN ('edit', 'admin')
                )
            )
        )
    );

-- RLS Policy: Users with edit/admin permission can update chapters
CREATE POLICY IF NOT EXISTS update_chapters ON public.chapters
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.mindmaps m
            WHERE m.id = chapters.mindmap_id
            AND (
                m.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.collaborators c
                    WHERE c.mindmap_id = m.id
                    AND c.user_id = auth.uid()
                    AND c.permission IN ('edit', 'admin')
                )
            )
        )
    );

-- RLS Policy: Users with edit/admin permission can delete chapters
CREATE POLICY IF NOT EXISTS delete_chapters ON public.chapters
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.mindmaps m
            WHERE m.id = chapters.mindmap_id
            AND (
                m.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.collaborators c
                    WHERE c.mindmap_id = m.id
                    AND c.user_id = auth.uid()
                    AND c.permission IN ('edit', 'admin')
                )
            )
        )
    );

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE 'Migration 008_chapters.sql completed successfully';
END $$;
