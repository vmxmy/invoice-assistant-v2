import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// 使用标准命名的主应用
import App from './App.tsx'
import { initializeGlobalErrorHandler } from './utils/globalErrorHandler'

// 初始化全局错误处理器
initializeGlobalErrorHandler()

// 开发环境下加载测试工具
if (import.meta.env.DEV) {
  // 移除FastAPI相关的测试，保留必要的调试工具
  console.log('🚀 启动纯Supabase架构模式')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
