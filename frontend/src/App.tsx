/**
 * 主应用组件 - 纯Supabase架构
 * React + Supabase + Router + 认证
 */
import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { OnboardingGuard } from './components/onboarding/OnboardingGuard'
import PageSuspense from './components/common/PageSuspense'
import { createLazyPage, pagePreloader } from './utils/lazyPageLoader'
import './App.css'
import './styles/compact-ui.css'
import './styles/compact-design-system.css'
import './styles/modal-compact-fix.css'
import './styles/animations.css'
import './styles/performance-optimizations.css'
import { initializeCriticalOptimization } from './utils/criticalCSSInliner'
import debugEnvironmentVariables from './utils/debugEnv'

// 调试环境变量（仅在开发环境显示）
if (import.meta.env.DEV) {
  debugEnvironmentVariables()
}

// 初始化关键资源优化
initializeCriticalOptimization();

// 懒加载页面组件
const DashboardPage = createLazyPage(() => import('./pages/DashboardPage'), {
  preloadDelay: 1000,
  preloadOnIdle: true
});
const InvoiceManagePage = createLazyPage(() => import('./pages/InvoiceManagePage'), {
  preloadDelay: 1500
});
const InvoiceUploadPage = createLazyPage(() => import('./pages/InvoiceUploadPage'));
const AccountSettingsPage = createLazyPage(() => import('./pages/AccountSettingsPage'));
const StatisticsPage = createLazyPage(() => import('./pages/StatisticsPage'));

// 认证相关页面（同步加载以确保快速响应）
import EmailConfirmationPage from './pages/EmailConfirmationPage'
import MagicLinkCallbackPage from './pages/MagicLinkCallbackPage'
import SupabaseSignIn from './components/auth/SupabaseSignIn'
import SupabaseSignUp from './components/auth/SupabaseSignUp'

// 懒加载 Inbox 组件
const InboxPage = createLazyPage(() => import('./components/inbox/InboxPage'));

// 智能预加载组件
const IntelligentPreloader: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthContext();

  useEffect(() => {
    // 用户登录后预加载关键页面
    if (user) {
      pagePreloader.preloadCriticalPages();
      
      // 基于当前路径智能预加载
      setTimeout(() => {
        pagePreloader.intelligentPreload(location.pathname);
      }, 2000);
    }
  }, [user, location.pathname]);

  return null;
};

// 创建QueryClient实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AppContent() {
  const { user, loading } = useAuthContext()
  const location = useLocation()
  
  // 路由状态监控
  useEffect(() => {
    console.log('🔗 [Navigation] 路由变化:', location.pathname)
    console.log('🔗 [Navigation] 完整路径:', location.pathname + location.search + location.hash)
    console.log('🔗 [Navigation] 用户状态:', user ? `已登录: ${user.email}` : '未登录')
    console.log('🔗 [Navigation] 时间戳:', new Date().toISOString())
    console.log('---')
  }, [location.pathname, location.search, location.hash, user])

  if (loading) {
    return (
      <div className="min-h-screen min-h-[100vh] min-h-[100dvh] flex items-center justify-center mobile-full-container">
        <div className="flex flex-col items-center space-y-4">
          <div className="loading loading-spinner loading-lg"></div>
          <p>正在加载...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={<SupabaseSignIn />} />
      <Route path="/signup" element={<SupabaseSignUp />} />
      <Route path="/email-confirmation" element={<EmailConfirmationPage />} />
      <Route path="/magic-link-callback" element={<MagicLinkCallbackPage />} />
      
      {/* 受保护的路由 - 包含引导流程检查和懒加载 */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <PageSuspense>
                <DashboardPage />
              </PageSuspense>
            </OnboardingGuard>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <PageSuspense>
                <DashboardPage />
              </PageSuspense>
            </OnboardingGuard>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/invoices" 
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <PageSuspense>
                <InvoiceManagePage />
              </PageSuspense>
            </OnboardingGuard>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/invoices/upload" 
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <PageSuspense>
                <InvoiceUploadPage />
              </PageSuspense>
            </OnboardingGuard>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <PageSuspense>
                <AccountSettingsPage />
              </PageSuspense>
            </OnboardingGuard>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inbox" 
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <PageSuspense>
                <InboxPage />
              </PageSuspense>
            </OnboardingGuard>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/statistics" 
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <PageSuspense>
                <StatisticsPage />
              </PageSuspense>
            </OnboardingGuard>
          </ProtectedRoute>
        } 
      />
      
      {/* 默认重定向 */}
      <Route path="*" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <div className="compact-mode">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <Router>
              <AppContent />
              <IntelligentPreloader />
            </Router>
        </AuthProvider>
      </QueryClientProvider>
    </div>
  )
}

export default App