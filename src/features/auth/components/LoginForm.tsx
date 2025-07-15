import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { Button, Input } from '../../../shared/design-system';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onSignUpRedirect?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onForgotPassword,
  onSignUpRedirect,
}) => {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setGeneralError(null);

      await signIn(data.email, data.password);

      // Auth state will be updated and navigation will happen automatically
      // onSuccess is no longer needed since signIn now waits for auth state update
      onSuccess?.();
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Check if it's a field-specific error
      if (errorMessage.toLowerCase().includes('email')) {
        setError('email', {
          type: 'manual',
          message: errorMessage,
        });
      } else if (errorMessage.toLowerCase().includes('password')) {
        setError('password', {
          type: 'manual',
          message: errorMessage,
        });
      } else {
        setGeneralError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {generalError && (
        <div className="rounded-xl bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 p-4 animate-slide-up">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-error-800 dark:text-error-200">
                Authentication Error
              </h3>
              <div className="mt-1 text-sm text-error-700 dark:text-error-300">
                <p>{generalError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <Input
            id="email"
            type="email"
            label="Email address"
            placeholder="Enter your email"
            variant="filled"
            size="lg"
            leftIcon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            }
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
            error={errors.email?.message}
            disabled={isLoading}
          />
        </div>

        <div>
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="Enter your password"
            variant="filled"
            size="lg"
            leftIcon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              },
            })}
            error={errors.password?.message}
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <button
              type="button"
              onClick={onForgotPassword}
              className="font-medium text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors"
              disabled={isLoading}
            >
              Forgot your password?
            </button>
          </div>
        </div>

        <div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-accent-600 to-accent-600 hover:from-accent-600 hover:to-accent-700 dark:from-accent-600 dark:to-accent-600 dark:hover:from-accent-500 dark:hover:to-accent-700 text-white shadow-lg"
            disabled={isLoading}
            size="lg"
            loading={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </div>
      </form>

      {onSignUpRedirect && (
        <div className="text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSignUpRedirect}
              className="font-medium text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors"
              disabled={isLoading}
            >
              Sign up
            </button>
          </p>
        </div>
      )}
    </div>
  );
}; 