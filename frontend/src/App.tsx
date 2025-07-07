// 主应用组件，集成认证和路由
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SignUp from './components/auth/SignUp'
import SignIn from './components/auth/SignIn'
import Dashboard from './components/Dashboard'
import SetupProfile from './components/SetupProfile'
import InvoiceListPage from './pages/InvoiceListPage'
import InvoiceUploadPage from './pages/InvoiceUploadPage'
import './App.css'

// 创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5分钟
      refetchOnWindowFocus: false,
      refetchOnMount: false, // 防止重复请求
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
        <div className="App">
          <Routes>
            {/* 公开路由 */}
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<SignIn />} />
            
            {/* 受保护的路由 */}
            <Route 
              path="/setup-profile" 
              element={
                <ProtectedRoute>
                  <SetupProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requireProfile={true}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/invoices" 
              element={
                <ProtectedRoute requireProfile={true}>
                  <InvoiceListPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/invoices/upload" 
              element={
                <ProtectedRoute requireProfile={true}>
                  <InvoiceUploadPage />
                </ProtectedRoute>
              } 
            />
            
            {/* 默认重定向 */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
        </Router>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
