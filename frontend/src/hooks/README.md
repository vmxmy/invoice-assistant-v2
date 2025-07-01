# Hooks

这个目录用于存放自定义React Hooks。

## Hooks组织建议

- 按功能创建独立的hook文件
- 使用use前缀命名
- 示例：
  ```
  hooks/
  ├── index.ts           # 统一导出
  ├── useApi.ts          # API调用hooks
  ├── useAuth.ts         # 认证相关hooks
  ├── useInvoices.ts     # 发票管理hooks
  └── useLocalStorage.ts # 本地存储hooks
  ```

## 示例用法

```typescript
// useAuth.ts
import { useState, useEffect } from 'react'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 认证逻辑...

  return { user, loading, login, logout }
}

// useInvoices.ts
import { useState, useEffect } from 'react'
import { invoicesApi } from '../services/invoices'

export const useInvoices = () => {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)

  // 发票管理逻辑...

  return { invoices, loading, fetchInvoices, addInvoice }
}
```