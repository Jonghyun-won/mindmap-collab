export interface MindMap {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  ydoc_snapshot?: Uint8Array;
}

export interface MindMapCollaborator {
  mind_map_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface NodeData {
  label: string;
  color?: string;
}
