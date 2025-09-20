import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './shared/theme';
import { ToastManager } from './shared/theme/hooks/useToast';
import { AppHeader } from '@/shared/components/AppHeader'
import { ProtectedRoute } from '@/features/auth'

const DashboardLandingPage = React.lazy(() => import('./features/dashboard/pages/DashboardLandingPage').then(m => ({ default: m.DashboardLandingPage })))
const MyProfilePage = React.lazy(() => import('./features/pages/MyProfilePage').then(m => ({ default: m.MyProfilePage })))
const PartnerOrgDashboardPage = React.lazy(() => import('./features/partnerorgs/pages/PartnerOrgDashboardPage'))
const PartnerOrgLayout = React.lazy(() => import('./features/partnerorgs/layout/PartnerOrgLayout'))
const PartnerOrgTranslationPage = React.lazy(() => import('./features/partnerorgs/pages/PartnerOrgTranslationPage'))
const PartnerOrgDistributionPage = React.lazy(() => import('./features/partnerorgs/pages/PartnerOrgDistributionPage'))
const PartnerOrgFundingPage = React.lazy(() => import('./features/partnerorgs/pages/PartnerOrgFundingPage'))
const PartnerOrgUpdatesPage = React.lazy(() => import('./features/partnerorgs/pages/PartnerOrgUpdatesPage'))
const ProjectDashboardPage = React.lazy(() => import('./features/projects/pages/ProjectDashboardPage'))
const TeamDashboardPage = React.lazy(() => import('./features/teams/pages/TeamDashboardPage'))
const BaseDashboardPage = React.lazy(() => import('./features/bases/pages/BaseDashboardPage'))

// Auth pages
const LoginPage = React.lazy(() => import('./features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = React.lazy(() => import('./features/auth/pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const ForgotPasswordPage = React.lazy(() => import('./features/auth/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const UnauthorizedPage = React.lazy(() => import('./features/auth/pages/UnauthorizedPage').then(m => ({ default: m.UnauthorizedPage })))

const MapPage = React.lazy(() => import('./features/map/pages/MapPage').then(module => ({ default: module.MapPage })));

function AppRoutes() {
  const location = useLocation();
  const isMapRoute = location.pathname.startsWith('/map');
  return (
    <>
      <AppHeader />
      <div className={isMapRoute ? 'relative h-[calc(100dvh-56px)] overflow-hidden' : 'relative h-[calc(100dvh-56px)] overflow-y-auto'}>
        <Routes>
          <Route path="/map" element={<React.Suspense fallback={<div />}> <MapPage /> </React.Suspense>} />
          <Route path="/map/language/:id" element={<React.Suspense fallback={<div />}> <MapPage /> </React.Suspense>} />
          <Route path="/map/region/:id" element={<React.Suspense fallback={<div />}> <MapPage /> </React.Suspense>} />
          <Route path="/map/project/:id" element={<React.Suspense fallback={<div />}> <MapPage /> </React.Suspense>} />
          {/* Auth routes */}
          <Route path="/login" element={<React.Suspense fallback={<div />}> <LoginPage /> </React.Suspense>} />
          <Route path="/register" element={<React.Suspense fallback={<div />}> <RegisterPage /> </React.Suspense>} />
          <Route path="/forgot-password" element={<React.Suspense fallback={<div />}> <ForgotPasswordPage /> </React.Suspense>} />
          <Route path="/unauthorized" element={<React.Suspense fallback={<div />}> <UnauthorizedPage /> </React.Suspense>} />

          {/* Profile */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <React.Suspense fallback={<div />}> <MyProfilePage /> </React.Suspense>
            </ProtectedRoute>
          } />

          {/* Dashboard routes */}
          <Route path="/dashboard" element={<React.Suspense fallback={<div />}> <DashboardLandingPage /> </React.Suspense>} />
          <Route path="/partner-org/:id" element={
            <ProtectedRoute>
              <React.Suspense fallback={<div />}> <PartnerOrgLayout /> </React.Suspense>
            </ProtectedRoute>
          }>
            <Route index element={<React.Suspense fallback={<div />}> <PartnerOrgDashboardPage /> </React.Suspense>} />
            <Route path="dashboard" element={<React.Suspense fallback={<div />}> <PartnerOrgDashboardPage /> </React.Suspense>} />
            <Route path="progress" element={<React.Suspense fallback={<div />}> <PartnerOrgTranslationPage /> </React.Suspense>} />
            <Route path="distribution" element={<React.Suspense fallback={<div />}> <PartnerOrgDistributionPage /> </React.Suspense>} />
            <Route path="funding" element={<React.Suspense fallback={<div />}> <PartnerOrgFundingPage /> </React.Suspense>} />
            <Route path="updates" element={<React.Suspense fallback={<div />}> <PartnerOrgUpdatesPage /> </React.Suspense>} />
          </Route>
          <Route path="/project/:id/dashboard" element={
            <ProtectedRoute>
              <React.Suspense fallback={<div />}> <ProjectDashboardPage /> </React.Suspense>
            </ProtectedRoute>
          } />
          <Route path="/team/:id/dashboard" element={
            <ProtectedRoute>
              <React.Suspense fallback={<div />}> <TeamDashboardPage /> </React.Suspense>
            </ProtectedRoute>
          } />
          <Route path="/base/:id/dashboard" element={
            <ProtectedRoute>
              <React.Suspense fallback={<div />}> <BaseDashboardPage /> </React.Suspense>
            </ProtectedRoute>
          } />
          {/* Root redirects: logged-out -> map (handled in DashboardLandingPage too), but default root should go to map */}
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastManager>
        <Router>
          <AppRoutes />
        </Router>
      </ToastManager>
    </ThemeProvider>
  );
}

export default App;
