/**
 * 权限保护路由组件 - 增强版ProtectedRoute
 * 支持基于角色和权限的路由保护
 */
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../../contexts/AuthContext'

interface PermissionRouteProps {
  children: React.ReactNode
  roles?: string | string[]
  permissions?: string | string[]
  requireAll?: boolean // 是否需要所有角色/权限（默认只需要任一）
  fallbackPath?: string // 无权限时重定向的路径（默认回登录页）
}

export function PermissionRoute({ 
  children, 
  roles,
  permissions,
  requireAll = false,
  fallbackPath = '/login'
}: PermissionRouteProps) {
  const { user, loading, userPermissions, permissionsLoading } = useAuthContext()
  const location = useLocation()

  // 基础认证检查
  if (loading) {
    return (
      <div className="min-h-screen min-h-[100vh] min-h-[100dvh] flex items-center justify-center mobile-full-container">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }

  if (!user) {
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

  // 如果没有指定权限要求，直接返回内容
  if (!roles && !permissions) {
    return <>{children}</>
  }

  // 权限加载中
  if (permissionsLoading) {
    return (
      <div className="min-h-screen min-h-[100vh] min-h-[100dvh] flex items-center justify-center mobile-full-container">
        <div className="flex flex-col items-center space-y-4">
          <div className="loading loading-spinner loading-lg"></div>
          <p>正在验证权限...</p>
        </div>
      </div>
    )
  }

  // 如果没有权限信息，拒绝访问
  if (!userPermissions) {
    console.error('🚨 [Security] 无法获取用户权限信息，拒绝访问:', user.email)
    return <Navigate to={fallbackPath} state={{ 
      from: location,
      error: 'permission_check_failed'
    }} replace />
  }

  let hasAccess = true

  // 检查角色权限
  if (roles) {
    const roleList = Array.isArray(roles) ? roles : [roles]
    
    if (requireAll) {
      hasAccess = hasAccess && roleList.every(role => userPermissions.roles.includes(role))
    } else {
      hasAccess = hasAccess && roleList.some(role => userPermissions.roles.includes(role))
    }
  }

  // 检查具体权限
  if (permissions) {
    const permissionList = Array.isArray(permissions) ? permissions : [permissions]
    
    if (requireAll) {
      hasAccess = hasAccess && permissionList.every(permission => 
        userPermissions.permissions.includes(permission)
      )
    } else {
      hasAccess = hasAccess && permissionList.some(permission => 
        userPermissions.permissions.includes(permission)
      )
    }
  }

  if (!hasAccess) {
    console.warn('🚫 [Access Denied] 用户权限不足:', {
      user: user.email,
      userRoles: userPermissions.roles,
      userPermissions: userPermissions.permissions,
      requiredRoles: roles,
      requiredPermissions: permissions,
      path: location.pathname
    })

    return <Navigate to={fallbackPath} state={{ 
      from: location,
      error: 'insufficient_permissions'
    }} replace />
  }

  return <>{children}</>
}

// 预定义的权限路由组件
export const AdminRoute = ({ children, fallbackPath }: Omit<PermissionRouteProps, 'roles'>) => (
  <PermissionRoute roles={['admin', 'super_admin']} fallbackPath={fallbackPath}>
    {children}
  </PermissionRoute>
)

export const SuperAdminRoute = ({ children, fallbackPath }: Omit<PermissionRouteProps, 'roles'>) => (
  <PermissionRoute roles="super_admin" fallbackPath={fallbackPath}>
    {children}
  </PermissionRoute>
)

export const ModeratorRoute = ({ children, fallbackPath }: Omit<PermissionRouteProps, 'roles'>) => (
  <PermissionRoute roles={['moderator', 'admin', 'super_admin']} fallbackPath={fallbackPath}>
    {children}
  </PermissionRoute>
)