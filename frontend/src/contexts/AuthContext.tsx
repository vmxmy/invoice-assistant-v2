/**
 * 认证Context - 使用最佳实践
 * 提供全局认证状态管理
 */
import React, { createContext, useContext } from 'react'
import { useAuth, UseAuthReturn } from '../hooks/useAuth'

const AuthContext = createContext<UseAuthReturn | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}