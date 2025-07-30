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
import { DashboardPage } from './pages/DashboardPage'
import { InvoiceManagePage } from './pages/InvoiceManagePage'
import InvoiceUploadPage from './pages/InvoiceUploadPage'
import { TrashPage } from './pages/TrashPage'
import EmailAccountsPage from './pages/EmailAccountsPage'
import EmailScanJobsPage from './pages/EmailScanJobsPage'
import SimpleEmailConfigPage from './pages/SimpleEmailConfigPage'
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="loading loading-spinner loading-lg"></div>
          <p>正在加载...</p>
        </div>
      </div>
    )
  }

  return user ? (
    <Routes>
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
        path="/trash" 
        element={
          <ProtectedRoute>
            <TrashPage />
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
        path="/settings/email-config" 
        element={
          <ProtectedRoute>
            <SimpleEmailConfigPage />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  ) : (
    <LoginPage />
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