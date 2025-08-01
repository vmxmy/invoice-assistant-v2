/**
 * 主应用组件 - 纯Supabase架构
 * React + Supabase + Router + 认证
 */
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import EmailConfirmationPage from './pages/EmailConfirmationPage'
import SupabaseSignIn from './components/auth/SupabaseSignIn'
import SupabaseSignUp from './components/auth/SupabaseSignUp'
import { DashboardPage } from './pages/DashboardPage'
import { InvoiceManagePage } from './pages/InvoiceManagePage'
import InvoiceUploadPage from './pages/InvoiceUploadPage'
import EmailAccountsPage from './pages/EmailAccountsPage'
import EmailScanJobsPage from './pages/EmailScanJobsPage'
import AccountSettingsPage from './pages/AccountSettingsPage'
import './App.css'

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
      
      {/* 受保护的路由 */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/invoices" 
        element={
          <ProtectedRoute>
            <InvoiceManagePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/invoices/upload" 
        element={
          <ProtectedRoute>
            <InvoiceUploadPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings/email-accounts" 
        element={
          <ProtectedRoute>
            <EmailAccountsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings/email-scan-jobs" 
        element={
          <ProtectedRoute>
            <EmailScanJobsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <AccountSettingsPage />
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App