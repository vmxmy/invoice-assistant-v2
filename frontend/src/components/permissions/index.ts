/**
 * 权限管理组件导出
 * 统一导出所有权限相关的组件和工具
 */

// 角色守护组件
export {
  RoleGuard,
  AdminOnly,
  SuperAdminOnly,
  ModeratorOnly,
  StaffOnly
} from './RoleGuard'

// 权限守护组件
export {
  PermissionGuard,
  CanManageUsers,
  CanViewSystemLogs,
  CanManageInvoices,
  CanDeleteInvoices
} from './PermissionGuard'

// 权限保护路由
export {
  PermissionRoute,
  AdminRoute,
  SuperAdminRoute,
  ModeratorRoute
} from './PermissionRoute'

// 类型导出
export type { UserPermissions } from '../../hooks/useAuth'