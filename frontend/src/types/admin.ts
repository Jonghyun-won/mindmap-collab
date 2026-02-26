export interface AdminUser {
  id: string
  email: string
  name: string | null
  team: string | null
  phone: string | null
  role: string
  email_verified: boolean
  is_active: boolean
  created_at: string
  mindmap_count: number
  last_activity: string | null
}

export interface AdminDashboardStats {
  total_users: number
  verified_users: number
  unverified_users: number
  active_users: number
  inactive_users: number
  total_mindmaps: number
}

export interface AdminUserListResponse {
  users: AdminUser[]
  total: number
  page: number
  limit: number
}

export interface AdminMindMap {
  id: string
  title: string
  owner_id: string
  owner_email: string
  owner_name: string | null
  collaborators_count: number
  created_at: string
  updated_at: string
}

export interface AdminMindMapListResponse {
  mindmaps: AdminMindMap[]
  total: number
  page: number
  limit: number
}
