// Authentication-related TypeScript types matching api.yaml schemas

// User schema
export interface User {
  id: string
  email: string
  name: string | null
  team: string | null
  email_verified: boolean
  role: string
  created_at: string
}

// LoginRequest schema
export interface LoginRequest {
  email: string
  password: string
}

// RegisterRequest schema
export interface RegisterRequest {
  email: string
  password: string
  name?: string | null
  team?: string | null
}

// LoginResponse schema
export interface LoginResponse {
  token: string
  token_type: string
  user: User
}

// RegisterResponse schema
export interface RegisterResponse {
  message: string
  user: User
}

// ConfirmEmailRequest schema
export interface ConfirmEmailRequest {
  email: string
  confirmation_code: string
}

// ResendConfirmationRequest schema
export interface ResendConfirmationRequest {
  email: string
}

// ResendConfirmationResponse schema
export interface ResendConfirmationResponse {
  message: string
}
