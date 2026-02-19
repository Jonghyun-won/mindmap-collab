import type {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
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
      const error = new Error(data.message || 'API request failed')
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
    name?: string
  ): Promise<LoginResponse> {
    const requestData: RegisterRequest = { email, password, name }
    const response = await this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestData),
    })

    this.setToken(response.token)
    return response
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
}

export const apiClient = new ApiClient()
