// React 路由保护组件
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { ProtectedRouteProps } from '../types'

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireProfile = false 
}) => {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  // 计算派生状态
  const isAuthenticated = !!user
  const hasProfile = !!profile

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-base-200">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
          <p className="text-base-content/70">验证用户身份中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // 保存用户尝试访问的页面，登录后重定向
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireProfile && !hasProfile) {
    return <Navigate to="/setup-profile" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute