# Services

这个目录用于存放API调用相关的服务文件。

## 服务结构建议

- 按功能模块组织API服务
- 使用统一的API客户端配置
- 示例：
  ```
  services/
  ├── api.ts          # API客户端配置
  ├── auth.ts         # 认证相关API
  ├── invoices.ts     # 发票相关API
  ├── users.ts        # 用户相关API
  └── types.ts        # API响应类型定义
  ```

## 示例用法

```typescript
// api.ts
import axios from 'axios'

export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// invoices.ts
import { apiClient } from './api'

export const invoicesApi = {
  getInvoices: () => apiClient.get('/invoices'),
  getInvoice: (id: string) => apiClient.get(`/invoices/${id}`),
  // ...
}
```