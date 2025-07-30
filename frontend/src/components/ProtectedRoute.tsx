/**
 * 受保护路由组件 - 使用最佳实践
 * 简洁的权限控制
 */
import React from 'react'
import { useAuthContext } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="card w-96 bg-base-200 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">🔐 需要登录</h2>
            <p>请先登录以访问此页面</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}