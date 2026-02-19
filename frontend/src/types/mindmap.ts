// Mind map-related TypeScript types matching api.yaml schemas

import type { User } from './auth'

// MindMap schema (lines 671-705)
export interface MindMap {
  id: string
  title: string
  owner_id: string
  created_at: string
  updated_at: string
}

// MindMapDetail schema (lines 707-725) - extends MindMap
export interface MindMapDetail extends MindMap {
  owner: User
  collaborators_count: number
  yjs_state: string | null
}

// Collaborator schema (lines 727-767)
export interface Collaborator {
  id: string
  mindmap_id: string
  user_id: string
  user?: User
  permission: 'view' | 'edit' | 'admin'
  joined_at: string
}

// CreateMindMapRequest schema (lines 832-842)
export interface CreateMindMapRequest {
  title: string
}

// UpdateMindMapRequest schema (lines 844-852)
export interface UpdateMindMapRequest {
  title?: string
}

// AddCollaboratorRequest schema (lines 854-869)
export interface AddCollaboratorRequest {
  user_email: string
  permission: 'view' | 'edit' | 'admin'
}

// UpdateCollaboratorPermissionRequest
export interface UpdateCollaboratorPermissionRequest {
  permission: 'view' | 'edit' | 'admin'
}

// Pagination schema (lines 871-899)
export interface Pagination {
  page: number
  limit: number
  total: number
  total_pages: number
}

// Response wrapper for mind maps list
export interface MindMapsListResponse {
  data: MindMap[]
  pagination: Pagination
}
