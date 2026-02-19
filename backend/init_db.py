#!/usr/bin/env python3
"""Initialize database schema"""
from conn import get_db_connection

SQL = """
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mindmaps table
CREATE TABLE IF NOT EXISTS public.mindmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    yjs_state BYTEA,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collaborators table
CREATE TABLE IF NOT EXISTS public.collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mindmap_id UUID NOT NULL REFERENCES public.mindmaps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL DEFAULT 'view',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mindmap_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mindmaps_owner ON public.mindmaps(owner_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_mindmap ON public.collaborators(mindmap_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON public.collaborators(user_id);
"""

def main():
    print("Initializing database...")
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(SQL)
        conn.commit()
        print("✅ Database schema created successfully!")
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
