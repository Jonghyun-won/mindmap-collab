-- Collaboration features: comments, change history, invite links
-- Migration: 004_collaboration_features.sql

-- Comments on nodes
CREATE TABLE IF NOT EXISTS public.node_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mindmap_id UUID NOT NULL REFERENCES public.mindmaps(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_node_comments_mindmap_node ON public.node_comments(mindmap_id, node_id);

-- Change history
CREATE TABLE IF NOT EXISTS public.mindmap_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mindmap_id UUID NOT NULL REFERENCES public.mindmaps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    action VARCHAR(50) NOT NULL,
    node_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mindmap_changes_mindmap ON public.mindmap_changes(mindmap_id, created_at DESC);

-- Invite links
CREATE TABLE IF NOT EXISTS public.invite_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mindmap_id UUID NOT NULL REFERENCES public.mindmaps(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    permission VARCHAR(20) NOT NULL DEFAULT 'view',
    created_by UUID NOT NULL REFERENCES public.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invite_links_token ON public.invite_links(token);

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE 'Migration 004_collaboration_features.sql completed successfully';
END $$;
