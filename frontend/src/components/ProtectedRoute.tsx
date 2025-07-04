// React 路由保护组件
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireProfile?: boolean
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireProfile = false 
}) => {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    )
  }

  if (!user) {
    // 保存用户尝试访问的页面，登录后重定向
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireProfile && !profile) {
    return <Navigate to="/setup-profile" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute