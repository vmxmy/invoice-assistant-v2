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

// 发票类型枚举
export enum InvoiceType {
  GENERAL = 'general',              // 通用发票
  VAT = 'vat',                     // 增值税发票
  TRAIN = 'train',                 // 火车票
  FLIGHT = 'flight',               // 机票
  TAXI = 'taxi',                   // 出租车票
  HOTEL = 'hotel',                 // 酒店发票
  RESTAURANT = 'restaurant',       // 餐饮发票
  TOLL = 'toll',                   // 过路费发票
  PARKING = 'parking',             // 停车费发票
}

// 火车票专有信息
export interface TrainInvoiceDetails {
  departure_time: string           // 发车时间
  arrival_time: string             // 到达时间
  train_number: string             // 车次
  seat_class: string               // 座位级别（二等座、一等座、商务座等）
  seat_number: string              // 座位号
  departure_station: string        // 出发站
  arrival_station: string          // 到达站
  distance?: number                // 里程
}

// 机票专有信息
export interface FlightInvoiceDetails {
  flight_number: string            // 航班号
  departure_time: string           // 起飞时间
  arrival_time: string             // 降落时间
  seat_number: string              // 座位号
  cabin_class: string              // 舱位等级
  departure_airport: string        // 出发机场
  arrival_airport: string          // 到达机场
  airline: string                  // 航空公司
}

// 出租车票专有信息
export interface TaxiInvoiceDetails {
  pickup_time: string              // 上车时间
  dropoff_time: string             // 下车时间
  distance: number                 // 里程（公里）
  unit_price: number               // 单价（元/公里）
  waiting_fee?: number             // 等待费
  license_plate?: string           // 车牌号
}

// 酒店发票专有信息
export interface HotelInvoiceDetails {
  checkin_date: string             // 入住日期
  checkout_date: string            // 离店日期
  room_type: string                // 房型
  room_number?: string             // 房间号
  nights: number                   // 住宿晚数
  daily_rate?: number              // 日均房价
}

// 餐饮发票专有信息
export interface RestaurantInvoiceDetails {
  meal_type?: string               // 餐型（早餐、午餐、晚餐）
  customer_count?: number          // 就餐人数
  table_number?: string            // 桌号
}

// 增值税发票专有信息
export interface VATInvoiceDetails {
  tax_rate: number                 // 税率（%）
  tax_amount: number               // 税额
  amount_without_tax: number       // 不含税金额
  items?: VATInvoiceItem[]         // 商品明细
}

export interface VATInvoiceItem {
  name: string                     // 商品名称
  specification?: string           // 规格型号
  unit?: string                    // 单位
  quantity: number                 // 数量
  unit_price: number               // 单价
  amount: number                   // 金额
  tax_rate: number                 // 税率
  tax_amount: number               // 税额
}

// 费用分类枚举
export enum ExpenseCategory {
  TRANSPORT = '交通',
  ACCOMMODATION = '住宿', 
  DINING = '餐饮',
  OFFICE = '办公',
  OTHER = '其他'
}

export enum ExpenseSubcategory {
  // 交通子分类
  HIGH_SPEED_RAIL = '高铁',
  FLIGHT = '飞机', 
  TAXI = '出租车',
  // 住宿子分类
  HOTEL = '酒店',
  HOMESTAY = '民宿',
  // 餐饮子分类 - 目前没有具体子分类
  // 办公子分类
  CONSULTATION = '咨询',
  SEAL = '印章',
  // 其他子分类 - 目前没有具体子分类
}

// 分类信息接口（与 v_invoice_detail 视图字段匹配）
export interface CategoryInfo {
  primary_category_name?: string   // 一级分类名称
  secondary_category_name?: string // 二级分类名称
  category_full_path?: string      // 完整分类路径
  category_level?: string          // 分类级别
  category_icon?: string           // 分类图标
  category_color?: string          // 分类颜色
  parent_category_name?: string    // 父分类名称
  parent_category_icon?: string    // 父分类图标
  parent_category_color?: string   // 父分类颜色
}

// 发票相关类型
export interface Invoice {
  id: string
  invoice_number: string
  invoice_code?: string            // 发票代码
  invoice_date: string
  consumption_date?: string        // 消费日期（实际消费/服务发生的日期）
  invoice_type?: string            // 发票类型
  seller_name?: string
  seller_tax_number?: string       // 销售方纳税人识别号
  buyer_name?: string
  buyer_tax_number?: string        // 购买方纳税人识别号
  amount?: number                  // 金额（兼容API）
  total_amount?: number
  amount_without_tax?: number      // 不含税金额
  tax_amount?: number              // 税额
  status: string
  processing_status?: string
  source?: string
  tags?: string[]
  notes?: string
  remarks?: string                 // 发票备注（来自OCR）
  file_url?: string
  file_name?: string               // 文件名
  file_path?: string               // 文件路径
  file_size?: number               // 文件大小
  ocr_confidence_score?: number    // OCR置信度分数
  is_verified?: boolean            // 是否已验证
  verified_at?: string             // 验证时间
  category?: string                // 分类（已废弃，使用 expense_category）
  expense_category?: string        // 费用分类（枚举值）
  expense_category_code?: string   // 分类代码
  primary_category_name?: string   // 一级分类名称
  secondary_category_name?: string // 二级分类名称
  category_full_path?: string      // 完整分类路径
  category_level?: string          // 分类级别
  category_icon?: string           // 分类图标
  category_color?: string          // 分类颜色
  parent_category_name?: string    // 父分类名称
  category_info?: any              // 分类详细信息（JSON字段）
  currency?: string                // 币种
  source_metadata?: Record<string, any>  // 来源元数据
  extracted_data?: Record<string, any>   // OCR提取的完整数据
  created_at: string
  updated_at: string
  user_id?: string
  // 不同类型发票的专有信息
  train_details?: TrainInvoiceDetails
  flight_details?: FlightInvoiceDetails
  taxi_details?: TaxiInvoiceDetails
  hotel_details?: HotelInvoiceDetails
  restaurant_details?: RestaurantInvoiceDetails
  vat_details?: VATInvoiceDetails
}

export interface InvoiceFilters {
  search: string
  status: string[]
  source: string[]
  dateFrom: string | null
  dateTo: string | null
  amountMin: number | null
  amountMax: number | null
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
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