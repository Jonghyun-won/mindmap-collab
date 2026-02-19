// Authentication-related TypeScript types matching api.yaml schemas

// User schema (lines 643-669)
export interface User {
  id: string
  email: string
  name: string | null
  created_at: string
}

// LoginRequest schema (lines 769-785)
export interface LoginRequest {
  email: string
  password: string
}

// RegisterRequest schema (lines 787-810)
export interface RegisterRequest {
  email: string
  password: string
  name?: string | null
}

// LoginResponse schema (lines 812-830)
export interface LoginResponse {
  token: string
  token_type: string
  user: User
}
