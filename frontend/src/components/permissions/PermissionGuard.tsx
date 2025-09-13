/**
 * 权限守护组件 - 基于具体权限控制内容显示
 * 支持单个权限或多个权限检查
 */
import React from 'react'
import { useAuthContext } from '../../contexts/AuthContext'

interface PermissionGuardProps {
  children: React.ReactNode
  permissions: string | string[]
  requireAll?: boolean // 是否需要所有权限（默认只需要任一权限）
  fallback?: React.ReactNode // 无权限时显示的内容
  loading?: React.ReactNode // 权限加载时显示的内容
}

export function PermissionGuard({ 
  children, 
  permissions, 
  requireAll = false, 
  fallback = null,
  loading = null 
}: PermissionGuardProps) {
  const { userPermissions, permissionsLoading } = useAuthContext()

  // 权限加载中
  if (permissionsLoading && loading) {
    return <>{loading}</>
  }

  // 如果没有权限信息，拒绝访问
  if (!userPermissions) {
    return <>{fallback}</>
  }

  const permissionList = Array.isArray(permissions) ? permissions : [permissions]
  
  let hasAccess = false
  
  if (requireAll) {
    // 需要所有权限
    hasAccess = permissionList.every(permission => 
      userPermissions.permissions.includes(permission)
    )
  } else {
    // 只需要任一权限
    hasAccess = permissionList.some(permission => 
      userPermissions.permissions.includes(permission)
    )
  }

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// 预定义的常用权限守护组件
export const CanManageUsers = ({ children, fallback, loading }: Omit<PermissionGuardProps, 'permissions'>) => (
  <PermissionGuard permissions="manage_users" fallback={fallback} loading={loading}>
    {children}
  </PermissionGuard>
)

export const CanViewSystemLogs = ({ children, fallback, loading }: Omit<PermissionGuardProps, 'permissions'>) => (
  <PermissionGuard permissions="view_audit_logs" fallback={fallback} loading={loading}>
    {children}
  </PermissionGuard>
)

export const CanManageInvoices = ({ children, fallback, loading }: Omit<PermissionGuardProps, 'permissions'>) => (
  <PermissionGuard permissions="manage_invoices" fallback={fallback} loading={loading}>
    {children}
  </PermissionGuard>
)

export const CanDeleteInvoices = ({ children, fallback, loading }: Omit<PermissionGuardProps, 'permissions'>) => (
  <PermissionGuard permissions="delete_invoices" fallback={fallback} loading={loading}>
    {children}
  </PermissionGuard>
)