"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { AdminRole } from "@/lib/auth/admin"

export interface AdminUser {
  id: string
  username: string
  name: string
  role: AdminRole
  must_change_password?: boolean
}

interface AdminAuthContextType {
  user: AdminUser | null
  token: string | null
  login: (username: string, password: string) => Promise<{ success: boolean; must_change_password?: boolean }>
  logout: () => void
  changePassword: (newPassword: string) => Promise<boolean>
  isLoading: boolean
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

const STORAGE_KEY = "admin-token"

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_KEY)
    if (savedToken) {
      // 토큰에서 유저 정보 복원 (브라우저 환경: atob 사용)
      try {
        const decoded = JSON.parse(atob(savedToken))
        if (decoded.exp > Date.now()) {
          setToken(savedToken)
          setUser({
            id: decoded.id,
            username: decoded.username,
            name: decoded.name,
            role: decoded.role,
            must_change_password: decoded.must_change_password,
          })
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      if (!response.ok) return { success: false }

      const data = await response.json()
      setToken(data.token)
      setUser(data.user)
      localStorage.setItem(STORAGE_KEY, data.token)
      return { success: true, must_change_password: data.must_change_password }
    } catch {
      return { success: false }
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const changePassword = async (newPassword: string): Promise<boolean> => {
    if (!token) return false
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_password: newPassword }),
      })
      if (!res.ok) return false
      // 토큰 갱신: must_change_password false로 업데이트
      if (user) {
        const updated = { ...user, must_change_password: false }
        setUser(updated)
      }
      return true
    } catch {
      return false
    }
  }

  return (
    <AdminAuthContext.Provider value={{ user, token, login, logout, changePassword, isLoading }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error("useAdminAuth must be used within AdminAuthProvider")
  return context
}
