-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Mind maps table
CREATE TABLE IF NOT EXISTS mind_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ydoc_snapshot TEXT  -- Store as base64 string
);

-- Collaborators table
CREATE TABLE IF NOT EXISTS mind_map_collaborators (
  mind_map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'editor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (mind_map_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mind_maps_owner_id ON mind_maps(owner_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_updated_at ON mind_maps(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON mind_map_collaborators(user_id);

-- Row Level Security policies
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_collaborators ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view mind maps they own or collaborate on" ON mind_maps;
DROP POLICY IF EXISTS "Users can create mind maps" ON mind_maps;
DROP POLICY IF EXISTS "Users can update mind maps they own" ON mind_maps;
DROP POLICY IF EXISTS "Users can delete mind maps they own" ON mind_maps;
DROP POLICY IF EXISTS "Users can view collaborators of their mind maps" ON mind_map_collaborators;
DROP POLICY IF EXISTS "Mind map owners can manage collaborators" ON mind_map_collaborators;

-- Mind maps policies
CREATE POLICY "Users can view mind maps they own or collaborate on"
  ON mind_maps FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM mind_map_collaborators
      WHERE mind_map_id = mind_maps.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mind maps"
  ON mind_maps FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update mind maps they own"
  ON mind_maps FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete mind maps they own"
  ON mind_maps FOR DELETE
  USING (auth.uid() = owner_id);

-- Collaborators policies
CREATE POLICY "Users can view collaborators of their mind maps"
  ON mind_map_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mind_maps
      WHERE id = mind_map_id AND (owner_id = auth.uid() OR id IN (
        SELECT mind_map_id FROM mind_map_collaborators WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Mind map owners can manage collaborators"
  ON mind_map_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM mind_maps
      WHERE id = mind_map_id AND owner_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_mind_maps_updated_at ON mind_maps;

CREATE TRIGGER update_mind_maps_updated_at
  BEFORE UPDATE ON mind_maps
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
