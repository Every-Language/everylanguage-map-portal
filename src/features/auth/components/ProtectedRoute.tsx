import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasRequiredRole } from '../utils/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallbackPath?: string;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  fallbackPath = '/login',
  requireAuth = true,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if authentication is required and user is not authenticated
  if (requireAuth && !user) {
    // Redirect to login with the current location for return after login
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Check role-based access if roles are specified
  if (requiredRoles.length > 0 && user) {
    const userHasRole = hasRequiredRole(user, requiredRoles);
    
    if (!userHasRole) {
      // Redirect to unauthorized page or dashboard
      return (
        <Navigate 
          to="/unauthorized" 
          state={{ from: location, requiredRoles }} 
          replace 
        />
      );
    }
  }

  // User is authenticated and has required roles, render children
  return <>{children}</>;
}; 