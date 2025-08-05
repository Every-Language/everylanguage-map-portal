import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './features/auth';
import { ProjectProvider } from './features/dashboard';
import { LoginPage, RegisterPage, ForgotPasswordPage, UnauthorizedPage } from './features/auth/pages';
import { DashboardPage } from './app/pages/DashboardPage';
import { AppLayout } from './shared/components/Layout';
import { GlobalAudioPlayer } from './shared/components/GlobalAudioPlayer';
import { GlobalUploadProgress } from './shared/components/GlobalUploadProgress';
import { ThemeProvider } from './shared/theme';
import { ToastManager } from './shared/design-system/hooks/useToast';
import { LoadingSpinner } from './shared/design-system';
import { TextUploadProgress } from './features/upload/components/TextUploadProgress';
import { UploadResumeHandler } from './features/upload/components/UploadResumeHandler';

// Lazy load non-critical pages for better performance
const BibleProgressPage = React.lazy(() => import('./app/pages/BibleProgressPage').then(module => ({ default: module.BibleProgressPage })));
const AudioFilesPage = React.lazy(() => import('./app/pages/AudioFilesPage').then(module => ({ default: module.AudioFilesPage })));
const BibleTextPage = React.lazy(() => import('./app/pages/BibleTextPage').then(module => ({ default: module.BibleTextPage })));
const ImagesPage = React.lazy(() => import('./features/image-management/pages').then(module => ({ default: module.ImagesPage })));
const CommunityCheckPage = React.lazy(() => import('./features/community-check').then(module => ({ default: module.CommunityCheckPage })));
const UsersPage = React.lazy(() => import('./features/user-management/pages').then(module => ({ default: module.UsersPage })));
const AudioUploadPage = React.lazy(() => import('./features/upload/pages/AudioUploadPage').then(module => ({ default: module.AudioUploadPage })));

// Helper component to reduce repetition
const ProtectedLayoutRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <ToastManager>
        <AuthProvider>
          <ProjectProvider>
            <Router>
              <GlobalAudioPlayer />
              <GlobalUploadProgress />
              <TextUploadProgress />
              <UploadResumeHandler />
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                
                {/* Protected routes with layout */}
                <Route path="/dashboard" element={<ProtectedLayoutRoute><DashboardPage /></ProtectedLayoutRoute>} />
                <Route path="/bible-progress" element={<ProtectedLayoutRoute><Suspense fallback={<PageLoadingFallback />}><BibleProgressPage /></Suspense></ProtectedLayoutRoute>} />
                <Route path="/audio-files" element={<ProtectedLayoutRoute><Suspense fallback={<PageLoadingFallback />}><AudioFilesPage /></Suspense></ProtectedLayoutRoute>} />
                <Route path="/bible-text" element={<ProtectedLayoutRoute><Suspense fallback={<PageLoadingFallback />}><BibleTextPage /></Suspense></ProtectedLayoutRoute>} />
                <Route path="/images" element={<ProtectedLayoutRoute><Suspense fallback={<PageLoadingFallback />}><ImagesPage /></Suspense></ProtectedLayoutRoute>} />
                <Route path="/community-check" element={<ProtectedLayoutRoute><Suspense fallback={<PageLoadingFallback />}><CommunityCheckPage /></Suspense></ProtectedLayoutRoute>} />
                <Route path="/users" element={<ProtectedLayoutRoute><Suspense fallback={<PageLoadingFallback />}><UsersPage /></Suspense></ProtectedLayoutRoute>} />
                
                {/* Other protected routes without layout */}
                <Route path="/upload" element={<ProtectedRoute><Suspense fallback={<PageLoadingFallback />}><AudioUploadPage /></Suspense></ProtectedRoute>} />
                
                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                {/* Catch all - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Router>
          </ProjectProvider>
        </AuthProvider>
      </ToastManager>
    </ThemeProvider>
  );
}

export default App;
