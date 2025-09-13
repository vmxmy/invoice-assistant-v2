/**
 * 权限管理Hook - 提供便捷的权限检查函数
 * 封装常用的权限检查逻辑，简化组件中的权限验证
 */
import { useAuthContext } from '../contexts/AuthContext'

export function usePermissions() {
  const { userPermissions, permissionsLoading, hasPermission, hasRole, hasAnyRole } = useAuthContext()

  // 是否为管理员（admin 或 super_admin）
  const isAdmin = userPermissions?.is_admin || false

  // 是否为超级管理员
  const isSuperAdmin = userPermissions?.is_super_admin || false

  // 是否为版主（包括更高权限）
  const isModerator = userPermissions?.is_moderator || false

  // 是否为工作人员（版主、管理员或超级管理员）
  const isStaff = isModerator || isAdmin || isSuperAdmin

  // 获取用户的最高权限级别
  const permissionLevel = userPermissions?.permission_level || 'user'

  // 检查是否可以管理用户
  const canManageUsers = userPermissions?.can_manage_users || false

  // 检查是否可以查看系统日志
  const canViewSystemLogs = userPermissions?.can_view_system_logs || false

  // 检查用户是否有足够的权限级别
  const hasPermissionLevel = (level: 'user' | 'moderator' | 'admin' | 'super_admin'): boolean => {
    if (!userPermissions) return false

    const levels = ['user', 'moderator', 'admin', 'super_admin']
    const userLevelIndex = levels.indexOf(userPermissions.permission_level)
    const requiredLevelIndex = levels.indexOf(level)

    return userLevelIndex >= requiredLevelIndex
  }

  // 检查是否可以编辑特定用户（不能编辑权限更高的用户）
  const canEditUser = (targetUserLevel: string): boolean => {
    if (!userPermissions) return false

    // 超级管理员可以编辑所有用户
    if (isSuperAdmin) return true

    // 管理员不能编辑超级管理员
    if (isAdmin && targetUserLevel !== 'super_admin') return true

    // 版主只能编辑普通用户
    if (isModerator && targetUserLevel === 'user') return true

    return false
  }

  // 检查是否可以删除发票
  const canDeleteInvoices = hasPermission('delete_invoices') || isAdmin

  // 检查是否可以管理发票
  const canManageInvoices = hasPermission('manage_invoices') || isStaff

  // 检查是否可以查看所有发票（不仅仅是自己的）
  const canViewAllInvoices = hasPermission('view_all_invoices') || isStaff

  // 检查是否可以导出数据
  const canExportData = hasPermission('export_data') || isAdmin

  // 检查是否可以管理系统设置
  const canManageSettings = hasPermission('manage_settings') || isAdmin

  // 高级权限检查：组合多个条件
  const checkComplexPermission = (config: {
    roles?: string[]
    permissions?: string[]
    permissionLevel?: 'user' | 'moderator' | 'admin' | 'super_admin'
    requireAll?: boolean
  }): boolean => {
    if (!userPermissions) return false

    let hasAccess = true

    // 检查角色
    if (config.roles && config.roles.length > 0) {
      if (config.requireAll) {
        hasAccess = hasAccess && config.roles.every(role => hasRole(role))
      } else {
        hasAccess = hasAccess && hasAnyRole(config.roles)
      }
    }

    // 检查权限
    if (config.permissions && config.permissions.length > 0) {
      if (config.requireAll) {
        hasAccess = hasAccess && config.permissions.every(permission => hasPermission(permission))
      } else {
        hasAccess = hasAccess && config.permissions.some(permission => hasPermission(permission))
      }
    }

    // 检查权限级别
    if (config.permissionLevel) {
      hasAccess = hasAccess && hasPermissionLevel(config.permissionLevel)
    }

    return hasAccess
  }

  return {
    // 基础状态
    userPermissions,
    permissionsLoading,
    
    // 角色检查
    isAdmin,
    isSuperAdmin,
    isModerator,
    isStaff,
    permissionLevel,
    
    // 基础权限检查函数
    hasPermission,
    hasRole,
    hasAnyRole,
    hasPermissionLevel,
    
    // 常用权限检查
    canManageUsers,
    canViewSystemLogs,
    canDeleteInvoices,
    canManageInvoices,
    canViewAllInvoices,
    canExportData,
    canManageSettings,
    canEditUser,
    
    // 高级权限检查
    checkComplexPermission,
  }
}