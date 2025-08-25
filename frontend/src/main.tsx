import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// 使用标准命名的主应用
import App from './App.tsx'
import { initializeGlobalErrorHandler } from './utils/globalErrorHandler'
import { logger } from './utils/logger'
// 导入Cally日历组件
import 'cally'

// 初始化全局错误处理器
initializeGlobalErrorHandler()

// 开发环境下加载测试工具
if (import.meta.env.DEV) {
  // 移除FastAPI相关的测试，保留必要的调试工具
  logger.info('🚀 启动纯Supabase架构模式')
}

// 暂时禁用Service Worker注册用于调试
// if (import.meta.env.PROD) {
//   if ('serviceWorker' in navigator) {
//     navigator.serviceWorker.register('/sw.js', { scope: '/' })
//       .then(registration => {
//         logger.info('PWA: Service Worker 注册成功', registration)
//       })
//       .catch(error => {
//         logger.error('PWA: Service Worker 注册失败', error)
//       })
//   }
// }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
