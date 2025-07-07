// 主应用组件，集成认证和路由
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SignUp from './components/auth/SignUp'
import SignIn from './components/auth/SignIn'
import Dashboard from './components/Dashboard'
import SetupProfile from './components/SetupProfile'
import './App.css'

function App() {
  return (
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
  )
}

export default App
