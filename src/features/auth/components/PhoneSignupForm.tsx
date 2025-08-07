import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { Button, Input } from '../../../shared/design-system';
import { OtpVerificationForm } from './OtpVerificationForm';
import { CustomPhoneInput } from './CustomPhoneInput';
import { validatePhoneNumber } from '../utils/phoneValidation';

interface PhoneSignupFormData {
  phone: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

interface PhoneSignupFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const PhoneSignupForm: React.FC<PhoneSignupFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { signUpWithPhone } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setError,
    watch,
  } = useForm<PhoneSignupFormData>({
    mode: 'onBlur',
  });

  const password = watch('password');

  const onSubmit = async (data: PhoneSignupFormData) => {
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

      // Store signup data for after verification
      // setSignupData(data); // This line is removed
      
      await signUpWithPhone(data.phone, data.password, {
        first_name: data.firstName,
        last_name: data.lastName,
        phone_number: data.phone,
      });

      setPhoneNumber(data.phone);
      setSuccessMessage('Account created! Please verify your phone number to complete signup.');
      setShowOtpVerification(true);

    } catch (error: unknown) {
      console.error('Phone signup error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Check if it's a field-specific error
      if (errorMessage.toLowerCase().includes('phone')) {
        setError('phone', {
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

  const handleOtpSuccess = () => {
    // User is automatically signed in after successful OTP verification
    onSuccess?.();
  };

  const handleOtpCancel = () => {
    setShowOtpVerification(false);
    setPhoneNumber('');
    // setSignupData(null); // This line is removed
    setSuccessMessage(null);
  };

  if (showOtpVerification) {
    return (
      <div className="space-y-4">
        {successMessage && (
          <div className="rounded-xl bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-success-800 dark:text-success-200">Success!</h3>
                <div className="mt-1 text-sm text-success-700 dark:text-success-300">
                  <p>{successMessage}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <OtpVerificationForm
          phone={phoneNumber}
          onSuccess={handleOtpSuccess}
          onCancel={handleOtpCancel}
          type="sms"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {generalError && (
        <div className="rounded-xl bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-error-800 dark:text-error-200">
                Registration Error
              </h3>
              <div className="mt-1 text-sm text-error-700 dark:text-error-300">
                <p>{generalError}</p>
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
          <Controller
            name="phone"
            control={control}
            rules={{
              required: 'Phone number is required',
              validate: validatePhoneNumber,
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <CustomPhoneInput
                label="Phone number"
                placeholder="Enter your phone number"
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                error={errors.phone?.message}
                disabled={isLoading}
                required
              />
            )}
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

        <div className="flex space-x-3">
          <Button
            type="submit"
            className="flex-1"
            disabled={isLoading}
            size="lg"
            loading={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
          
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}; 