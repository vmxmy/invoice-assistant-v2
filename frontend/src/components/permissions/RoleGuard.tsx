/**
 * 角色守护组件 - 基于用户角色控制内容显示
 * 支持单个角色或多个角色检查
 */
import React from 'react'
import { useAuthContext } from '../../contexts/AuthContext'

interface RoleGuardProps {
  children: React.ReactNode
  roles: string | string[]
  requireAll?: boolean // 是否需要所有角色（默认只需要任一角色）
  fallback?: React.ReactNode // 无权限时显示的内容
  loading?: React.ReactNode // 权限加载时显示的内容
}

export function RoleGuard({ 
  children, 
  roles, 
  requireAll = false, 
  fallback = null,
  loading = null 
}: RoleGuardProps) {
  const { userPermissions, permissionsLoading } = useAuthContext()

  // 权限加载中
  if (permissionsLoading && loading) {
    return <>{loading}</>
  }

  // 如果没有权限信息，拒绝访问
  if (!userPermissions) {
    return <>{fallback}</>
  }

  const roleList = Array.isArray(roles) ? roles : [roles]
  
  let hasAccess = false
  
  if (requireAll) {
    // 需要所有角色
    hasAccess = roleList.every(role => userPermissions.roles.includes(role))
  } else {
    // 只需要任一角色
    hasAccess = roleList.some(role => userPermissions.roles.includes(role))
  }

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// 预定义的常用角色守护组件
export const AdminOnly = ({ children, fallback, loading }: Omit<RoleGuardProps, 'roles'>) => (
  <RoleGuard roles={['admin', 'super_admin']} fallback={fallback} loading={loading}>
    {children}
  </RoleGuard>
)

export const SuperAdminOnly = ({ children, fallback, loading }: Omit<RoleGuardProps, 'roles'>) => (
  <RoleGuard roles="super_admin" fallback={fallback} loading={loading}>
    {children}
  </RoleGuard>
)

export const ModeratorOnly = ({ children, fallback, loading }: Omit<RoleGuardProps, 'roles'>) => (
  <RoleGuard roles={['moderator', 'admin', 'super_admin']} fallback={fallback} loading={loading}>
    {children}
  </RoleGuard>
)

export const StaffOnly = ({ children, fallback, loading }: Omit<RoleGuardProps, 'roles'>) => (
  <RoleGuard roles={['moderator', 'admin', 'super_admin']} fallback={fallback} loading={loading}>
    {children}
  </RoleGuard>
)