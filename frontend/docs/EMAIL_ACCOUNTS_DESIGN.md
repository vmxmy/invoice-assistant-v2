# 邮箱配置管理页面设计方案

## 概述

本文档详细描述了邮箱配置管理页面的设计方案，包括页面架构、组件设计、用户体验和技术实现。

## 页面架构设计

### 页面路由
- **路径**: `/settings/email-accounts`
- **保护**: 使用 `ProtectedRoute` 保护，要求用户已登录且完成Profile设置
- **导航**: 在 `AppNavbar` 中添加"邮箱配置"入口

### 页面布局
```
┌─────────────────────────────────────────────────────────────┐
│ 页面标题: "邮箱配置管理"           [添加邮箱账户] 按钮          │
├─────────────────────────────────────────────────────────────┤
│ 邮箱账户网格 (响应式卡片布局)                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│ │ Gmail账户   │ │ QQ邮箱账户  │ │ 163邮箱账户 │              │
│ │ ✅ 已连接   │ │ ⚠️ 未连接   │ │ ❌ 连接失败  │              │
│ │ [编辑][删除] │ │ [编辑][删除] │ │ [编辑][删除] │              │
│ └─────────────┘ └─────────────┘ └─────────────┘              │
├─────────────────────────────────────────────────────────────┤
│ 配置指南 (可折叠)                                            │
│ • Gmail OAuth2 配置指南                                      │
│ • QQ邮箱授权码获取方法                                        │
│ • 163邮箱SMTP设置                                           │
└─────────────────────────────────────────────────────────────┘
```

## 核心组件设计

### 1. EmailAccountsPage (主页面)
```typescript
interface EmailAccountsPageProps {
  // 主页面组件，无需额外props
}

const EmailAccountsPage: React.FC<EmailAccountsPageProps> = () => {
  // 页面状态管理
  // 邮箱账户列表获取
  // 模态框状态控制
  // 错误处理
}
```

### 2. EmailAccountCard (账户卡片)
```typescript
interface EmailAccountCardProps {
  account: EmailAccount
  onEdit: (account: EmailAccount) => void
  onDelete: (accountId: string) => void
  onTestConnection: (accountId: string) => void
}

const EmailAccountCard: React.FC<EmailAccountCardProps> = ({
  account,
  onEdit,
  onDelete,
  onTestConnection
}) => {
  // 账户状态显示
  // 操作按钮
  // 连接状态指示器
}
```

### 3. AddAccountModal (添加账户模态框)
```typescript
interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (accountData: EmailAccountData) => void
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  // 多步骤表单
  // 邮箱提供商选择
  // 认证配置表单
  // 连接测试
}
```

### 4. AuthConfigForm (认证配置表单)
```typescript
interface AuthConfigFormProps {
  provider: EmailProvider
  onSubmit: (config: EmailAuthConfig) => void
  onTestConnection: (config: EmailAuthConfig) => void
}

const AuthConfigForm: React.FC<AuthConfigFormProps> = ({
  provider,
  onSubmit,
  onTestConnection
}) => {
  // 动态表单字段
  // 实时验证
  // 敏感信息保护
}
```

## 用户体验设计

### 用户流程图
```
开始 → 访问邮箱配置页面 → 查看现有账户
  ↓
是否有现有账户？
  ├─ 是 → 显示账户列表 → 选择操作
  │       ├─ 编辑 → 打开编辑模态框
  │       ├─ 删除 → 确认删除
  │       └─ 测试连接 → 显示连接状态
  └─ 否 → 显示空状态 → 引导添加账户
  ↓
添加新账户 → 选择邮箱提供商 → 填写认证信息 → 测试连接 → 保存配置 → 完成
```

### 交互状态设计

#### 加载状态
- 页面加载时的骨架屏
- 账户列表加载中的占位符
- 连接测试时的加载动画
- 保存配置时的按钮Loading状态

#### 错误状态
- 网络错误的友好提示
- 认证失败的具体错误信息
- 表单验证错误的实时反馈
- 连接测试失败的错误说明

#### 成功状态
- 配置保存成功的toast提示
- 连接测试成功的视觉反馈
- 账户添加成功的动画效果

## 技术实现规格

### 状态管理Hook
```typescript
// 邮箱账户管理Hook
export const useEmailAccounts = () => {
  const queryClient = useQueryClient()
  
  // 获取账户列表
  const accounts = useQuery({
    queryKey: ['emailAccounts'],
    queryFn: fetchEmailAccounts,
    staleTime: 5 * 60 * 1000,
  })
  
  // 添加账户
  const addAccount = useMutation({
    mutationFn: addEmailAccount,
    onSuccess: () => {
      queryClient.invalidateQueries(['emailAccounts'])
    }
  })
  
  // 更新账户
  const updateAccount = useMutation({
    mutationFn: updateEmailAccount,
    onSuccess: () => {
      queryClient.invalidateQueries(['emailAccounts'])
    }
  })
  
  // 删除账户
  const deleteAccount = useMutation({
    mutationFn: deleteEmailAccount,
    onSuccess: () => {
      queryClient.invalidateQueries(['emailAccounts'])
    }
  })
  
  // 测试连接
  const testConnection = useMutation({
    mutationFn: testEmailConnection,
  })
  
  return {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    testConnection
  }
}
```

### API接口设计
```typescript
// 邮箱账户数据类型
interface EmailAccount {
  id: string
  user_id: string
  email: string
  provider: EmailProvider
  display_name?: string
  is_active: boolean
  connection_status: 'connected' | 'disconnected' | 'error'
  last_sync_at?: string
  created_at: string
  updated_at: string
}

// 邮箱提供商类型
type EmailProvider = 'gmail' | 'outlook' | 'qq' | '163' | '126'

// 认证配置类型
interface EmailAuthConfig {
  provider: EmailProvider
  email: string
  credentials: OAuth2Credentials | PasswordCredentials
}

// API函数定义
export const emailAccountsApi = {
  // 获取账户列表
  getAccounts: (): Promise<EmailAccount[]> => {},
  
  // 添加账户
  addAccount: (config: EmailAuthConfig): Promise<EmailAccount> => {},
  
  // 更新账户
  updateAccount: (id: string, config: Partial<EmailAuthConfig>): Promise<EmailAccount> => {},
  
  // 删除账户
  deleteAccount: (id: string): Promise<void> => {},
  
  // 测试连接
  testConnection: (config: EmailAuthConfig): Promise<{ success: boolean; error?: string }> => {},
}
```

### 表单验证规则
```typescript
// 表单验证schema
const emailAccountSchema = z.object({
  provider: z.enum(['gmail', 'outlook', 'qq', '163', '126']),
  email: z.string().email('请输入有效的邮箱地址'),
  credentials: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('oauth2'),
      accessToken: z.string().min(1, '访问令牌不能为空'),
      refreshToken: z.string().min(1, '刷新令牌不能为空'),
    }),
    z.object({
      type: z.literal('password'),
      password: z.string().min(1, '密码不能为空'),
    }),
  ]),
})
```

### 样式规范
```typescript
// 使用DaisyUI类名保持一致性
const styles = {
  // 主页面容器
  pageContainer: "container mx-auto p-4 max-w-6xl",
  
  // 页面标题
  pageTitle: "text-3xl font-bold mb-6",
  
  // 账户卡片
  accountCard: "card bg-base-100 shadow-lg border border-base-200",
  
  // 账户状态指示器
  statusIndicator: {
    connected: "badge badge-success",
    disconnected: "badge badge-warning",
    error: "badge badge-error"
  },
  
  // 按钮样式
  buttons: {
    primary: "btn btn-primary",
    secondary: "btn btn-secondary",
    danger: "btn btn-error",
    ghost: "btn btn-ghost"
  },
  
  // 表单样式
  form: {
    container: "form-control w-full",
    label: "label-text",
    input: "input input-bordered w-full",
    select: "select select-bordered w-full",
    textarea: "textarea textarea-bordered w-full"
  }
}
```

## 安全性设计

### 敏感信息保护
1. **前端处理**:
   - 密码/令牌字段使用`type="password"`
   - 不在前端存储完整的认证信息
   - 使用掩码显示敏感信息

2. **后端处理**:
   - 认证信息在数据库中加密存储
   - 使用环境变量管理加密密钥
   - API响应不包含敏感信息

### 权限控制
1. **页面级别**:
   - 使用`ProtectedRoute`保护页面访问
   - 要求用户已登录且完成Profile设置

2. **数据级别**:
   - 基于用户ID的行级安全策略
   - 只允许用户管理自己的邮箱账户
   - 使用Supabase RLS确保数据安全

## 响应式设计

### 断点设计
- **移动端** (< 768px): 单列布局，卡片全宽
- **平板端** (768px - 1024px): 双列布局
- **桌面端** (> 1024px): 三列布局

### 移动端优化
- 简化操作按钮
- 优化表单输入体验
- 适配触摸操作
- 考虑屏幕键盘影响

## 可访问性设计

### 键盘导航
- 支持Tab键在所有交互元素间导航
- 提供清晰的焦点指示器
- 支持回车键和空格键操作

### 屏幕阅读器
- 为所有交互元素提供适当的aria-label
- 使用语义化的HTML标签
- 提供状态变化的声明

### 颜色对比
- 确保文本和背景的对比度符合WCAG标准
- 不仅仅依赖颜色来传达信息
- 为色盲用户提供替代方案

## 性能优化

### 组件优化
- 使用React.memo优化重渲染
- 合理使用useMemo和useCallback
- 实现虚拟滚动（如果账户数量很大）

### 数据获取优化
- 使用React Query的缓存机制
- 实现乐观更新
- 合理设置staleTime和cacheTime

### 资源优化
- 图片懒加载
- 代码分割和按需加载
- 压缩和缓存静态资源

## 测试策略

### 单元测试
- 组件渲染测试
- Hook功能测试
- 工具函数测试
- 表单验证测试

### 集成测试
- 页面交互流程测试
- API集成测试
- 错误处理测试
- 状态管理测试

### 端到端测试
- 完整的用户流程测试
- 跨浏览器兼容性测试
- 响应式设计测试
- 可访问性测试

这个设计方案为邮箱配置管理页面提供了完整的技术规格和实现指导，确保了与现有系统的一致性和良好的用户体验。