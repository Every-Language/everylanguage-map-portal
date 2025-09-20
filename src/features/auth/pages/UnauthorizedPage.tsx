import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { useAuth } from '../hooks/useAuth';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const requiredRoles = (location.state as { requiredRoles?: string[] })?.requiredRoles || [];

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-error-100 rounded-full flex items-center justify-center mb-6">
            <svg
              className="h-8 w-8 text-error-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          
          <h1 className="text-3xl font-extrabold text-neutral-900 mb-4">
            Access Denied
          </h1>
          
          <p className="text-neutral-600 mb-6">
            You don't have permission to access this page.
            {requiredRoles.length > 0 && (
              <span className="block mt-2 text-sm">
                Required roles: {requiredRoles.join(', ')}
              </span>
            )}
          </p>

          {user && (
            <div className="bg-neutral-100 rounded-lg p-4 mb-6 text-sm">
              <p className="text-neutral-700">
                Signed in as: <strong>{user.email}</strong>
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleGoBack} 
              variant="outline" 
              size="lg"
              className="w-full"
            >
              Go Back
            </Button>
            
            <Button 
              onClick={handleGoHome} 
              size="lg"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 