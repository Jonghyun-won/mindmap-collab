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

// MVP Node Style Types (api.yaml MindMapNode schema)
export interface TextFormat {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  link?: string | null
}

export type MarkerType = "priority" | "progress" | "flag"

export interface Marker {
  type: MarkerType
  value: string  // priority: high/medium/low, progress: 0-100, flag: true/false
}

export type NodeShape = "rectangle" | "circle" | "rounded" | "diamond"

export interface MindMapNode {
  id: string
  label: string
  position: { x: number; y: number }
  level: number
  parentId?: string | null
  color?: string | null
  // MVP fields:
  icon?: string | null  // Lucide icon name (e.g., "lightbulb") - kept for data compatibility
  shape?: NodeShape
  collapsed?: boolean
  textFormat?: TextFormat | null
  marker?: Marker | null
  note?: string | null
  borderColor?: string
  media?: {
    type: 'image' | 'video'
    url: string
    width?: number
    height?: number
  } | null
}

export interface MindMapEdge {
  id: string
  source: string
  target: string
  type?: "bezier" | "straight" | "step" | "smoothstep"
  animated?: boolean
  label?: string | null
}

export type LayoutAlgorithm = "tree" | "horizontal" | "manual"
export type LayoutDirection = 'TB' | 'LR' | 'RL' | 'BI'
export type EdgeType = "bezier" | "straight" | "step" | "smoothstep"

export interface MindMapSettings {
  layout_algorithm?: LayoutAlgorithm
  edge_type?: EdgeType
  auto_layout?: boolean
  spacing_x?: number
  spacing_y?: number
}

export interface MindMapExportData {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  settings: MindMapSettings
  version?: string
  exported_at?: string
}

export interface AutoLayoutRequest {
  layout_algorithm: "tree"
  spacing_x?: number
  spacing_y?: number
}

export interface ImportRequest {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  settings?: MindMapSettings
  mode?: "replace" | "merge"
}

// Chapter type for multi-chapter mindmaps
export interface Chapter {
  id: string
  mindmap_id: string
  title: string
  position: number
  created_at: string
  updated_at: string
}

// Comment type for node-level comments
export interface Comment {
  id: string
  mindmap_id: string
  node_id: string
  user_id: string
  user_name?: string
  user_email?: string
  content: string
  created_at: string
  updated_at: string
}

// InviteLink type for shareable collaboration links
export interface InviteLink {
  id: string
  mindmap_id: string
  token: string
  permission: string
  created_by: string
  expires_at?: string | null
  max_uses?: number | null
  use_count: number
  created_at: string
}

// ChangeRecord type for tracking mindmap history
export interface ChangeRecord {
  id: string
  mindmap_id: string
  user_id: string
  user_name?: string
  action: string
  node_id?: string
  details?: Record<string, any>
  created_at: string
}
