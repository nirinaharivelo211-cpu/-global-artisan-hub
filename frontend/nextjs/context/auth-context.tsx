// @ts-nocheck
"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { authApi, profileApi } from "@/lib/api-client"
import { setAuthToken, removeAuthToken, getAuthToken, setRefreshToken, removeRefreshToken } from "@/lib/api-config"

export type UserRole = "admin" | "manager" | "artisan" | "client" | "livreur"

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: UserRole
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; forcePasswordChange?: boolean }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  getDashboardPath: () => string
}

interface RegisterData {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  role: UserRole
  region?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored token and user on mount
    const token = getAuthToken()
    const storedUser = localStorage.getItem("e-artisan-user")
    if (token && storedUser) {
      try {
        const raw = JSON.parse(storedUser)
        const normalized = raw.firstName && raw.lastName ? raw : {
          id: raw.id || raw.pk || "",
          email: raw.email,
          firstName: raw.prenom || raw.firstName || "",
          lastName: raw.nom || raw.lastName || "",
          phone: raw.telephone || raw.phone || "",
          role: raw.role || "client",
          avatar: raw.photo_de_profil || raw.avatar || "",
        }
        setUser(normalized)
      } catch {
        localStorage.removeItem("e-artisan-user")
        removeAuthToken()
      }
    }
    setIsLoading(false)
  }, [])

  const getDashboardPath = useCallback(() => {
    if (!user) return "/login"
    // Managers share the admin dashboard
    if (user.role === 'manager') return '/dashboard/admin'
    return `/dashboard/${user.role}`
  }, [user])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; forcePasswordChange?: boolean }> => {
    const response = await authApi.login({ email, password })
    if (response.success && response.data) {
      const { access, refresh, force_password_change } = response.data
      setAuthToken(access)
      setRefreshToken(refresh)
      // Fetch user profile after login
      const profileResponse = await profileApi.fetchProfile()
      if (profileResponse.success && profileResponse.data) {
        const p = profileResponse.data as any
        const normalized = {
          id: p.id || p.pk || "",
          email: p.email,
          firstName: p.prenom || p.firstName || "",
          lastName: p.nom || p.lastName || "",
          phone: p.telephone || p.phone || "",
          role: p.role || "client",
          avatar: p.photo_de_profil || p.avatar || "",
        }
        setUser(normalized)
        localStorage.setItem("e-artisan-user", JSON.stringify(normalized))
      }
      return { success: true, forcePasswordChange: !!force_password_change }
    }
    return { success: false, error: response.error || "Erreur de connexion" }
  }

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    const response = await authApi.register(data)
    if (response.success) {
      // After successful registration, login automatically
      return login(data.email, data.password)
    }
    return { success: false, error: response.error || "Erreur d'inscription" }
  }

  const logout = () => {
    authApi.logout()
    setUser(null)
    localStorage.removeItem("e-artisan-user")
    removeAuthToken()
    removeRefreshToken()
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout, getDashboardPath }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

