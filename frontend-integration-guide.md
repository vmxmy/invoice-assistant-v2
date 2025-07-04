# 前端应用集成指南

## 📦 安装依赖

### React 项目
```bash
npm install @supabase/supabase-js
# 或
yarn add @supabase/supabase-js
```

### Vue 项目
```bash
npm install @supabase/supabase-js
# 或
yarn add @supabase/supabase-js
```

## ⚙️ 环境配置

### 创建环境变量文件
```bash
# .env.local (React) 或 .env (Vue)
REACT_APP_SUPABASE_URL=https://sfenhhtvcyslxplvewmt.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE
REACT_APP_API_URL=http://localhost:8090

# Vue 项目使用 VUE_APP_ 前缀
VUE_APP_SUPABASE_URL=https://sfenhhtvcyslxplvewmt.supabase.co
VUE_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE
VUE_APP_API_URL=http://localhost:8090
```

## 🔧 Supabase 客户端配置

### 创建 Supabase 客户端
```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VUE_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VUE_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
```

## 🔐 认证上下文 (React)

```javascript
// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 获取初始会话
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        await loadUserProfile(session.access_token)
      }
      setLoading(false)
    }

    getSession()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user)
          await loadUserProfile(session.access_token)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (accessToken) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/profiles/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const profileData = await response.json()
        setProfile(profileData)
      }
    } catch (error) {
      console.error('加载用户资料失败:', error)
    }
  }

  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setProfile(null)
    }
    return { error }
  }

  const createProfile = async (profileData) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('未登录')

    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/profiles/me`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    })

    if (response.ok) {
      const profile = await response.json()
      setProfile(profile)
      return profile
    } else {
      throw new Error('创建资料失败')
    }
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    createProfile,
    loadUserProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
```

## 🔄 状态管理 (Vuex/Pinia)

### Pinia Store 示例
```javascript
// src/stores/auth.js
import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    profile: null,
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isProfileComplete: (state) => !!state.profile?.display_name
  },

  actions: {
    async initialize() {
      this.loading = true
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          this.user = session.user
          await this.loadProfile()
        }
      } finally {
        this.loading = false
      }

      // 监听认证状态
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          this.user = session.user
          await this.loadProfile()
        } else {
          this.user = null
          this.profile = null
        }
      })
    },

    async signUp(email, password, metadata = {}) {
      this.loading = true
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: metadata }
        })
        return { data, error }
      } finally {
        this.loading = false
      }
    },

    async signIn(email, password) {
      this.loading = true
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        return { data, error }
      } finally {
        this.loading = false
      }
    },

    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (!error) {
        this.user = null
        this.profile = null
      }
      return { error }
    },

    async loadProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      try {
        const response = await fetch(`${import.meta.env.VUE_APP_API_URL}/api/v1/profiles/me`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (response.ok) {
          this.profile = await response.json()
        }
      } catch (error) {
        console.error('加载用户资料失败:', error)
      }
    },

    async createProfile(profileData) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('未登录')

      const response = await fetch(`${import.meta.env.VUE_APP_API_URL}/api/v1/profiles/me`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      })

      if (response.ok) {
        this.profile = await response.json()
        return this.profile
      } else {
        throw new Error('创建资料失败')
      }
    }
  }
})
```

## 🛡️ 路由保护

### React Router 保护
```javascript
// src/components/ProtectedRoute.jsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children, requireProfile = false }) => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <div className="flex justify-center items-center h-screen">加载中...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireProfile && !profile) {
    return <Navigate to="/setup-profile" replace />
  }

  return children
}

export default ProtectedRoute
```

### Vue Router 保护
```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/signup',
      name: 'SignUp',
      component: () => import('../views/SignUp.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true, requiresProfile: true }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next('/dashboard')
  } else if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresProfile && !authStore.isProfileComplete) {
    next('/setup-profile')
  } else {
    next()
  }
})

export default router
```

## 🚀 部署配置

### 生产环境变量
```bash
# 生产环境
REACT_APP_SUPABASE_URL=https://sfenhhtvcyslxplvewmt.supabase.co
REACT_APP_SUPABASE_ANON_KEY=你的生产环境anon_key
REACT_APP_API_URL=https://your-backend-domain.com
```

### CORS 配置确认
后端已配置支持前端域名：
- 开发环境: `localhost:3000`, `localhost:5173`
- 生产环境: 需要在后端配置中添加你的前端域名

## 📝 使用示例

### 在组件中使用
```javascript
// React
import { useAuth } from '../contexts/AuthContext'

function MyComponent() {
  const { user, profile, signOut } = useAuth()
  
  return (
    <div>
      <p>欢迎, {profile?.display_name || user?.email}</p>
      <button onClick={signOut}>退出登录</button>
    </div>
  )
}

// Vue
import { useAuthStore } from '../stores/auth'

export default {
  setup() {
    const authStore = useAuthStore()
    
    return {
      user: computed(() => authStore.user),
      profile: computed(() => authStore.profile),
      signOut: authStore.signOut
    }
  }
}
```

## 🔧 故障排除

### 常见问题
1. **CORS 错误**: 确认后端CORS配置包含你的前端域名
2. **认证失败**: 检查Supabase URL和API密钥是否正确
3. **Profile创建失败**: 确认后端服务正在运行且API端点可访问
4. **邮箱确认**: 检查垃圾邮件文件夹，确认Supabase邮件配置

### 调试技巧
```javascript
// 启用Supabase调试
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    debug: true
  }
})

// 添加网络请求日志
const apiCall = async (url, options) => {
  console.log('API Request:', url, options)
  const response = await fetch(url, options)
  console.log('API Response:', response.status, await response.clone().json())
  return response
}
```