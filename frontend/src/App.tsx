import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/store'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Landing from '@/pages/Landing'
import { LoginPage } from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import { CallbackPage } from '@/pages/Callback'
import { DashboardPage } from '@/pages/Dashboard'
import { ProfilePage } from '@/pages/Profile'
import { ProjectsPage } from '@/pages/Projects'
import { ResumesPage } from '@/pages/Resumes'
import { CreateResumePage } from '@/pages/CreateResume'
import { JobsPage } from '@/pages/Jobs'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <Landing />}
      />
      
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <LoginPage />}
      />
      
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <ForgotPassword />}
      />
      
      {/* Auth0 callback route */}
      <Route path="/callback" element={<CallbackPage />} />

      {/* Protected routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="resumes" element={<ResumesPage />} />
        <Route path="create-resume" element={<CreateResumePage />} />
        <Route path="jobs" element={<JobsPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/app/dashboard" : "/"} replace />} />
    </Routes>
  )
}

export default App
