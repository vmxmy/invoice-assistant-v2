import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeGlobalErrorHandler } from './utils/globalErrorHandler'

// 初始化全局错误处理器
initializeGlobalErrorHandler()

// 开发环境下加载测试工具
if (import.meta.env.DEV) {
  import('./test/testApiMigration').catch(console.error)
  import('./test/debugDataMapping').catch(console.error)
  import('./test/verifyModalData').catch(console.error)
  import('./test/verifyCategoryDisplay').catch(console.error)
  import('./test/mobileViewTest').catch(console.error)
}

createRoot(document.getElementById('root')!).render(
  <App />
)
