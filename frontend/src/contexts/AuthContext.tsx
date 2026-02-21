import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient } from '@/lib/api-client'
import type { User, RegisterResponse, ResendConfirmationResponse } from '@/types/auth'

interface AuthContextValue {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string, team?: string) => Promise<RegisterResponse>
  confirmEmail: (email: string, code: string) => Promise<void>
  resendConfirmation: (email: string) => Promise<ResendConfirmationResponse>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const checkAuth = async () => {
    setLoading(true)
    setError(null)
    try {
      const userData = await apiClient.verifyToken()
      setUser(userData)
    } catch (err) {
      setUser(null)
      console.error('Token verification failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.login(email, password)
      setUser(response.user)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string, name?: string, team?: string): Promise<RegisterResponse> => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.register(email, password, name, team)
      return response
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const confirmEmail = async (email: string, code: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.confirmEmail(email, code)
      setUser(response.user)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Email confirmation failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const resendConfirmation = async (email: string): Promise<ResendConfirmationResponse> => {
    setError(null)
    try {
      return await apiClient.resendConfirmation(email)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend confirmation'
      setError(message)
      throw err
    }
  }

  const logout = async () => {
    setLoading(true)
    setError(null)
    try {
      await apiClient.logout()
      setUser(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const value: AuthContextValue = {
    user,
    loading,
    error,
    login,
    register,
    confirmEmail,
    resendConfirmation,
    logout,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
