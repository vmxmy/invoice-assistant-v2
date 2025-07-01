# Context

这个目录用于存放React Context相关的文件。

## Context组织建议

- 按功能创建独立的Context
- 包含Provider组件和相关hooks
- 示例：
  ```
  context/
  ├── index.ts           # 统一导出
  ├── AuthContext.tsx    # 认证上下文
  ├── ThemeContext.tsx   # 主题上下文
  └── AppContext.tsx     # 应用全局上下文
  ```

## 示例用法

```typescript
// AuthContext.tsx
import React, { createContext, useContext, useState } from 'react'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)

  // 认证逻辑...

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```