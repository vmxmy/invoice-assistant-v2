/**
 * 受保护路由组件 - 使用最佳实践
 * 简洁的权限控制，未登录时重定向到登录页面
 */
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuthContext()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen min-h-[100vh] min-h-[100dvh] flex items-center justify-center mobile-full-container">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }

  if (!user) {
    // 保存当前路径，登录后可以重定向回来
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 🚨 安全检查：验证邮箱是否已确认
  if (!user.email_confirmed_at) {
    console.error('🚨 [Security] 未确认邮箱的用户尝试访问受保护页面:', user.email)
    return <Navigate to="/login" state={{ 
      from: location, 
      error: 'please_confirm_email' 
    }} replace />
  }

  return <>{children}</>
}