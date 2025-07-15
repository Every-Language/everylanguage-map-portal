import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './features/auth';
import { LoginPage, RegisterPage, ForgotPasswordPage, UnauthorizedPage } from './features/auth/pages';
import { DashboardPage } from './app/pages/DashboardPage';
import { AudioUploadPage } from './features/upload/pages/AudioUploadPage';
import { ComponentDemoPage } from './app/pages/ComponentDemoPage';
import { ProjectCreationPage } from './features/projects/pages/ProjectCreationPage';
import { ThemeProvider } from './shared/theme';
import { ToastManager } from './shared/design-system/hooks/useToast';

function App() {
  return (
    <ThemeProvider>
      <ToastManager>
        <AuthProvider>
          <Router>
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            
            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <AudioUploadPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/components"
              element={
                <ProtectedRoute>
                  <ComponentDemoPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/projects/new"
              element={
                <ProtectedRoute>
                  <ProjectCreationPage />
                </ProtectedRoute>
              }
            />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
      </ToastManager>
    </ThemeProvider>
  );
}

export default App;
