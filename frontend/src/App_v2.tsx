// 优化后的主应用组件 - 集成React Query
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryProvider } from './providers/QueryProvider'
import { AuthProvider } from './contexts/AuthContext_v2'
import ProtectedRoute from './components/ProtectedRoute_v2'
import SignUp from './components/auth/SignUp_v2'
import SignIn from './components/auth/SignIn_v2'
import Dashboard from './components/Dashboard_v2'
import SetupProfile from './components/SetupProfile_v2'
import './App.css'

function App() {
  return (
    <QueryProvider>
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
              
              {/* 默认重定向 */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryProvider>
  )
}

export default App