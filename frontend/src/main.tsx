import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeGlobalErrorHandler } from './utils/globalErrorHandler'

// 初始化全局错误处理器
initializeGlobalErrorHandler()

createRoot(document.getElementById('root')!).render(
  <App />
)
