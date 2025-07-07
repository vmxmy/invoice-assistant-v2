// 统一类型定义 - 替换项目中的any类型使用
// 为前端应用提供完整的类型安全基础

// Supabase用户类型
export interface User {
  id: string
  email: string
  email_confirmed_at?: string
  phone?: string
  phone_confirmed_at?: string
  user_metadata?: Record<string, any>
  app_metadata?: Record<string, any>
  created_at: string
  updated_at: string
  last_sign_in_at?: string
}

// 用户Profile类型
export interface Profile {
  id: string
  user_id: string
  display_name: string
  bio?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// 活动项目类型
export interface ActivityItem {
  id: string
  type: 'invoice_created' | 'file_uploaded' | 'invoice_verified' | 'profile_updated'
  title: string
  description: string
  timestamp: string
  metadata?: {
    invoiceNumber?: string
    fileName?: string
    amount?: number
    status?: string
    [key: string]: any
  }
}

// 图表数据类型
export interface MonthlyData {
  month: string
  invoices: number
  amount: number
}

export interface CategoryData {
  name: string
  value: number
  color: string
}

// 仪表盘统计数据类型
export interface DashboardStats {
  totalInvoices: number
  pendingInvoices: number
  completedInvoices: number
  totalAmount: number
  monthlyGrowth: number
  recentActivity: ActivityItem[]
  monthlyData: MonthlyData[]
  categoryData: CategoryData[]
}

// 认证相关类型
export interface AuthError {
  message: string
  status?: number
  code?: string
}

export interface AuthResponse<T = any> {
  data: T | null
  error: AuthError | null
}

// API响应类型
export interface ApiResponse<T = any> {
  data: T
  message?: string
  status: 'success' | 'error'
}

// 表单数据类型
export interface SignUpFormData {
  email: string
  password: string
  confirmPassword: string
  displayName: string
}

export interface SignInFormData {
  email: string
  password: string
  rememberMe?: boolean
}

export interface ProfileFormData {
  display_name: string
  bio?: string
  avatar_url?: string
}

// 路由和导航类型
export interface RouteConfig {
  path: string
  element: React.ReactNode
  requireAuth?: boolean
  requireProfile?: boolean
}

// 组件Props类型
export interface ProtectedRouteProps {
  children: React.ReactNode
  requireProfile?: boolean
}

export interface DashboardMainProps {
  onUploadInvoice?: () => void
  onCreateInvoice?: () => void
  onSearchInvoices?: () => void
  onExportData?: () => void
  onSettings?: () => void
}

// 统计卡片类型
export interface StatCardProps {
  title: string
  value: number | string
  subValue?: string
  icon: React.ComponentType<any>
  variant?: 'primary' | 'success' | 'warning' | 'info' | 'error'
  loading?: boolean
  trend?: {
    value: number
    direction: 'up' | 'down'
    label: string
  }
}

// 图表组件类型
export interface InvoiceChartProps {
  type: 'line' | 'area' | 'bar' | 'pie'
  data: MonthlyData[] | CategoryData[]
  title?: string
  height?: number
  loading?: boolean
}

// 工具函数类型
export type Logger = {
  log: (...args: any[]) => void
  error: (...args: any[]) => void
  warn: (...args: any[]) => void
  info: (...args: any[]) => void
}

// React Query相关类型
export interface QueryOptions {
  enabled?: boolean
  staleTime?: number
  retry?: number | ((failureCount: number, error: any) => boolean)
}

// 导出所有类型作为命名空间
export namespace Types {
  export type TUser = User
  export type TProfile = Profile
  export type TActivityItem = ActivityItem
  export type TDashboardStats = DashboardStats
  export type TAuthError = AuthError
  export type TAuthResponse<T = any> = AuthResponse<T>
  export type TApiResponse<T = any> = ApiResponse<T>
}