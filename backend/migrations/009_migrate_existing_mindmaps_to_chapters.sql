-- Migrate existing mindmaps to chapters
-- Migration: 009_migrate_existing_mindmaps_to_chapters.sql
-- Each existing mindmap gets a default chapter

-- Insert default "챕터 1" for all existing mindmaps that don't have chapters yet
INSERT INTO public.chapters (mindmap_id, title, position, created_at, updated_at)
SELECT
    id,
    '챕터 1',
    1,
    created_at,
    updated_at
FROM public.mindmaps
WHERE NOT EXISTS (
    SELECT 1 FROM public.chapters WHERE public.chapters.mindmap_id = public.mindmaps.id
);

-- Verify: every mindmap must have at least one chapter
DO $$
DECLARE
    mindmap_count INTEGER;
    chapter_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mindmap_count FROM public.mindmaps;
    SELECT COUNT(DISTINCT mindmap_id) INTO chapter_count FROM public.chapters;

    IF mindmap_count != chapter_count THEN
        RAISE EXCEPTION 'Migration failed: % mindmaps exist but only % have chapters', mindmap_count, chapter_count;
    END IF;

    RAISE NOTICE 'Migration 009 successful: % mindmaps migrated to chapters', mindmap_count;
END $$;
