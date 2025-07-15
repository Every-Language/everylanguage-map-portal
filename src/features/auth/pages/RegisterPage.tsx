import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button, Input } from '../../../shared/design-system';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm<RegisterFormData>({
    mode: 'onBlur',
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setGeneralError(null);
      setSuccessMessage(null);

      if (data.password !== data.confirmPassword) {
        setError('confirmPassword', {
          type: 'manual',
          message: 'Passwords do not match',
        });
        return;
      }

      await signUp(data.email, data.password, {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
      });

      setSuccessMessage('Registration successful! Please check your email to confirm your account.');
      
      // Redirect to login after a delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error: unknown) {
      console.error('Registration error:', error);
      
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-neutral-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Join us to start uploading and managing your audio content
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10">
          {generalError && (
            <div className="mb-4 rounded-xl bg-error-50 border border-error-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-error-800">Registration Error</h3>
                  <div className="mt-1 text-sm text-error-700">
                    <p>{generalError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-xl bg-success-50 border border-success-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-success-800">Success!</h3>
                  <div className="mt-1 text-sm text-success-700">
                    <p>{successMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  id="firstName"
                  type="text"
                  label="First name"
                  placeholder="Enter your first name"
                  variant="filled"
                  size="lg"
                  {...register('firstName', {
                    required: 'First name is required',
                    minLength: {
                      value: 2,
                      message: 'First name must be at least 2 characters',
                    },
                  })}
                  error={errors.firstName?.message}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Input
                  id="lastName"
                  type="text"
                  label="Last name"
                  placeholder="Enter your last name"
                  variant="filled"
                  size="lg"
                  {...register('lastName', {
                    required: 'Last name is required',
                    minLength: {
                      value: 2,
                      message: 'Last name must be at least 2 characters',
                    },
                  })}
                  error={errors.lastName?.message}
                  disabled={isLoading}
                />
              </div>
            </div>

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
                placeholder="Create a password"
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
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
                  },
                })}
                error={errors.password?.message}
                disabled={isLoading}
              />
            </div>

            <div>
              <Input
                id="confirmPassword"
                type="password"
                label="Confirm password"
                placeholder="Confirm your password"
                variant="filled"
                size="lg"
                leftIcon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) =>
                    value === password || 'Passwords do not match',
                })}
                error={errors.confirmPassword?.message}
                disabled={isLoading}
              />
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                size="lg"
                loading={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 