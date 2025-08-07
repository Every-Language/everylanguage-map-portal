import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { Button, Input } from '../../../shared/design-system';
import { OtpVerificationForm } from './OtpVerificationForm';
import { CustomPhoneInput } from './CustomPhoneInput';
import { validatePhoneNumber } from '../utils/phoneValidation';

interface PhoneLoginFormData {
  phone: string;
  password: string;
}

interface PhoneLoginFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const PhoneLoginForm: React.FC<PhoneLoginFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { signInWithPhone, requestPhoneOtp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setError,
    watch,
  } = useForm<PhoneLoginFormData>({
    mode: 'onBlur',
  });

  const phoneValue = watch('phone');

  const onSubmit = async (data: PhoneLoginFormData) => {
    try {
      setIsLoading(true);
      setGeneralError(null);

      if (!data.phone) {
        setError('phone', { type: 'manual', message: 'Phone number is required' });
        return;
      }

      if (loginMethod === 'password') {
        if (!data.password) {
          setError('password', { type: 'manual', message: 'Password is required' });
          return;
        }
        
        await signInWithPhone(data.phone, data.password);
        onSuccess?.();
      } else {
        // OTP method
        await requestPhoneOtp(data.phone);
        setPhoneNumber(data.phone);
        setShowOtpVerification(true);
      }

    } catch (error: unknown) {
      console.error('Phone login error:', error);
      
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
    onSuccess?.();
  };

  const handleOtpCancel = () => {
    setShowOtpVerification(false);
    setPhoneNumber('');
  };

  if (showOtpVerification) {
    return (
      <OtpVerificationForm
        phone={phoneNumber}
        onSuccess={handleOtpSuccess}
        onCancel={handleOtpCancel}
        type="sms"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Sign in with phone
        </h3>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          {loginMethod === 'password' 
            ? 'Enter your phone number and password' 
            : 'We\'ll send you a verification code'
          }
        </p>
      </div>

      {/* Login Method Toggle */}
      <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1">
        <button
          type="button"
          onClick={() => setLoginMethod('password')}
          className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors ${
            loginMethod === 'password'
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setLoginMethod('otp')}
          className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors ${
            loginMethod === 'otp'
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}
        >
          SMS Code
        </button>
      </div>

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

        {loginMethod === 'password' && (
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
              {...register('password', loginMethod === 'password' ? {
                required: 'Password is required',
              } : undefined)}
              error={errors.password?.message}
              disabled={isLoading}
            />
          </div>
        )}

        <div className="flex space-x-3">
          <Button
            type="submit"
            className="flex-1"
            disabled={isLoading || !phoneValue}
            size="lg"
            loading={isLoading}
          >
            {isLoading 
              ? (loginMethod === 'password' ? 'Signing in...' : 'Sending code...')
              : (loginMethod === 'password' ? 'Sign in' : 'Send verification code')
            }
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