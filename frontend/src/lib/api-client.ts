import type {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  RegisterResponse,
  ConfirmEmailRequest,
  ResendConfirmationRequest,
  ResendConfirmationResponse,
  User,
} from '@/types/auth'

import type {
  MindMap,
  MindMapDetail,
  CreateMindMapRequest,
  UpdateMindMapRequest,
  MindMapsListResponse,
  Collaborator,
  AddCollaboratorRequest,
  UpdateCollaboratorPermissionRequest,
} from '@/types/mindmap'

const TOKEN_KEY = 'auth_token'

class ApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  }

  // Token management
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  }

  private clearToken(): void {
    localStorage.removeItem(TOKEN_KEY)
  }

  // HTTP request helper
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    })

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    const data = await response.json()

    if (!response.ok) {
      const error = new Error(data.detail || data.message || 'API request failed')
      ;(error as any).status = response.status
      ;(error as any).details = data.details
      throw error
    }

    return data
  }

  // ========== Auth Methods ==========

  async register(
    email: string,
    password: string,
    name?: string,
    team?: string,
    phone?: string
  ): Promise<RegisterResponse> {
    const requestData: RegisterRequest = { email, password, name, team, phone }
    return this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestData),
    })
  }

  async confirmEmail(
    email: string,
    confirmationCode: string
  ): Promise<LoginResponse> {
    const requestData: ConfirmEmailRequest = {
      email,
      confirmation_code: confirmationCode,
    }
    const response = await this.request<LoginResponse>('/auth/confirm-email', {
      method: 'POST',
      body: JSON.stringify(requestData),
    })

    this.setToken(response.token)
    return response
  }

  async resendConfirmation(email: string): Promise<ResendConfirmationResponse> {
    const requestData: ResendConfirmationRequest = { email }
    return this.request<ResendConfirmationResponse>(
      '/auth/resend-confirmation',
      {
        method: 'POST',
        body: JSON.stringify(requestData),
      }
    )
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const requestData: LoginRequest = { email, password }
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(requestData),
    })

    this.setToken(response.token)
    return response
  }

  async logout(): Promise<void> {
    try {
      await this.request<{ message: string }>('/auth/logout', {
        method: 'POST',
      })
    } finally {
      this.clearToken()
    }
  }

  async verifyToken(): Promise<User> {
    return this.request<User>('/auth/me', {
      method: 'GET',
    })
  }

  // ========== Mind Maps Methods ==========

  async getMindMaps(
    page: number = 1,
    limit: number = 20,
    sort:
      | 'created_asc'
      | 'created_desc'
      | 'updated_asc'
      | 'updated_desc'
      | 'title_asc'
      | 'title_desc' = 'updated_desc'
  ): Promise<MindMapsListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort,
    })

    return this.request<MindMapsListResponse>(`/mindmaps?${params}`, {
      method: 'GET',
    })
  }

  async createMindMap(title: string): Promise<MindMap> {
    const requestData: CreateMindMapRequest = { title }
    return this.request<MindMap>('/mindmaps', {
      method: 'POST',
      body: JSON.stringify(requestData),
    })
  }

  async getMindMap(id: string): Promise<MindMapDetail> {
    return this.request<MindMapDetail>(`/mindmaps/${id}`, {
      method: 'GET',
    })
  }

  async updateMindMap(id: string, title: string): Promise<MindMap> {
    const requestData: UpdateMindMapRequest = { title }
    return this.request<MindMap>(`/mindmaps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestData),
    })
  }

  async deleteMindMap(id: string): Promise<void> {
    return this.request<void>(`/mindmaps/${id}`, {
      method: 'DELETE',
    })
  }

  async duplicateMindMap(id: string): Promise<MindMap> {
    return this.request<MindMap>(`/mindmaps/${id}/duplicate`, {
      method: 'POST',
    })
  }

  // ========== Collaborators Methods ==========

  async getCollaborators(mindMapId: string): Promise<Collaborator[]> {
    return this.request<Collaborator[]>(`/mindmaps/${mindMapId}/collaborators`, {
      method: 'GET',
    })
  }

  async addCollaborator(
    mindMapId: string,
    userEmail: string,
    permission: 'view' | 'edit' | 'admin'
  ): Promise<Collaborator> {
    const requestData: AddCollaboratorRequest = { user_email: userEmail, permission }
    return this.request<Collaborator>(`/mindmaps/${mindMapId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    })
  }

  async updateCollaboratorPermission(
    mindMapId: string,
    userId: string,
    permission: 'view' | 'edit' | 'admin'
  ): Promise<Collaborator> {
    const requestData: UpdateCollaboratorPermissionRequest = { permission }
    return this.request<Collaborator>(
      `/mindmaps/${mindMapId}/collaborators/${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify(requestData),
      }
    )
  }

  async removeCollaborator(mindMapId: string, userId: string): Promise<void> {
    return this.request<void>(`/mindmaps/${mindMapId}/collaborators/${userId}`, {
      method: 'DELETE',
    })
  }

  // ========== Comments Methods ==========

  async getNodeComments(mindmapId: string, nodeId: string) {
    return this.request<{ comments: any[]; total: number }>(
      `/mindmaps/${mindmapId}/nodes/${nodeId}/comments`
    )
  }

  async createNodeComment(mindmapId: string, nodeId: string, content: string) {
    return this.request<any>(`/mindmaps/${mindmapId}/nodes/${nodeId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
  }

  async deleteNodeComment(mindmapId: string, nodeId: string, commentId: string) {
    return this.request<any>(
      `/mindmaps/${mindmapId}/nodes/${nodeId}/comments/${commentId}`,
      {
        method: 'DELETE',
      }
    )
  }

  // ========== Change History Methods ==========

  async getChangeHistory(mindmapId: string, page: number = 1, limit: number = 50) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })
    return this.request<{ changes: any[]; total: number; page: number; limit: number }>(
      `/mindmaps/${mindmapId}/history?${params}`
    )
  }

  async recordChange(
    mindmapId: string,
    action: string,
    nodeId?: string,
    details?: Record<string, any>
  ) {
    return this.request<any>(`/mindmaps/${mindmapId}/history`, {
      method: 'POST',
      body: JSON.stringify({ action, node_id: nodeId, details }),
    })
  }

  // ========== Invite Links Methods ==========

  async createInviteLink(
    mindmapId: string,
    permission: string = 'view',
    expiresInHours?: number,
    maxUses?: number
  ) {
    return this.request<{ invite: any; url: string }>(`/mindmaps/${mindmapId}/invites`, {
      method: 'POST',
      body: JSON.stringify({
        permission,
        expires_in_hours: expiresInHours,
        max_uses: maxUses,
      }),
    })
  }

  async getInviteLinks(mindmapId: string) {
    return this.request<{ invites: any[] }>(`/mindmaps/${mindmapId}/invites`)
  }

  async revokeInviteLink(mindmapId: string, inviteId: string) {
    return this.request<any>(`/mindmaps/${mindmapId}/invites/${inviteId}`, {
      method: 'DELETE',
    })
  }

  async acceptInviteLink(inviteToken: string) {
    return this.request<{ mindmap_id: string; permission: string }>(
      `/invites/${inviteToken}/accept`,
      {
        method: 'POST',
      }
    )
  }

  // ========== Users Methods ==========

  async searchUsers(query: string, limit: number = 5): Promise<{ users: Array<{ id: string; email: string; name: string | null; team: string | null }> }> {
    const params = new URLSearchParams({ q: query, limit: limit.toString() })
    return this.request<{ users: Array<{ id: string; email: string; name: string | null; team: string | null }> }>(
      `/users/search?${params}`
    )
  }

  // ========== Admin Methods ==========

  async getAdminStats(): Promise<any> {
    return this.request<any>('/admin/stats')
  }

  async getAdminUsers(page: number = 1, limit: number = 20, search?: string): Promise<any> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
    if (search) params.set('search', search)
    return this.request<any>(`/admin/users?${params}`)
  }

  async updateUserRole(userId: string, role: string): Promise<any> {
    return this.request<any>(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    })
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<any> {
    return this.request<any>(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
    })
  }

  async verifyUser(userId: string): Promise<any> {
    return this.request<any>(`/admin/users/${userId}/verify`, {
      method: 'PUT',
    })
  }
}

export const apiClient = new ApiClient()
