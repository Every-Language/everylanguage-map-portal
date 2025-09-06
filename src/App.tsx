import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './shared/theme';
import { ToastManager } from './shared/theme/hooks/useToast';

const MapPage = React.lazy(() => import('./features/map/pages/MapPage').then(module => ({ default: module.MapPage })));

function App() {
  return (
    <ThemeProvider>
      <ToastManager>
        <Router>
          <Routes>
            <Route path="/map" element={<React.Suspense fallback={<div />}> <MapPage /> </React.Suspense>} />
            <Route path="/map/language/:id" element={<React.Suspense fallback={<div />}> <MapPage /> </React.Suspense>} />
            <Route path="/map/region/:id" element={<React.Suspense fallback={<div />}> <MapPage /> </React.Suspense>} />
            <Route path="/map/project/:id" element={<React.Suspense fallback={<div />}> <MapPage /> </React.Suspense>} />
            <Route path="/" element={<Navigate to="/map" replace />} />
            <Route path="*" element={<Navigate to="/map" replace />} />
          </Routes>
        </Router>
      </ToastManager>
    </ThemeProvider>
  );
}

export default App;
