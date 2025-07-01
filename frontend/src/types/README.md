# Types

这个目录用于存放TypeScript类型定义。

## 类型组织建议

- 按功能模块组织类型定义
- 导出共用的类型和接口
- 示例：
  ```
  types/
  ├── index.ts        # 统一导出
  ├── api.ts          # API相关类型
  ├── invoice.ts      # 发票相关类型
  ├── user.ts         # 用户相关类型
  └── common.ts       # 通用类型
  ```

## 示例用法

```typescript
// invoice.ts
export interface Invoice {
  id: string
  amount: number
  date: string
  seller: string
  status: 'pending' | 'processed' | 'error'
}

// api.ts
export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

// index.ts
export * from './invoice'
export * from './user'
export * from './api'
export * from './common'
```