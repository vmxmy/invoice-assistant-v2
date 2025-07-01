# Utils

这个目录用于存放工具函数和实用程序。

## 工具函数组织建议

- 按功能分类创建工具文件
- 提供纯函数，避免副作用
- 示例：
  ```
  utils/
  ├── index.ts          # 统一导出
  ├── format.ts         # 格式化函数
  ├── validation.ts     # 验证函数
  ├── constants.ts      # 常量定义
  └── helpers.ts        # 辅助函数
  ```

## 示例用法

```typescript
// format.ts
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('zh-CN')
}

// validation.ts
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// constants.ts
export const API_ENDPOINTS = {
  INVOICES: '/api/v1/invoices',
  AUTH: '/api/v1/auth',
  USERS: '/api/v1/users'
}
```