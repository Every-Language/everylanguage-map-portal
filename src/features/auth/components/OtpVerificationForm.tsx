import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../../../shared/design-system';

interface OtpVerificationFormProps {
  phone: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  type?: 'sms' | 'phone_change';
}

export const OtpVerificationForm: React.FC<OtpVerificationFormProps> = ({
  phone,
  onSuccess,
  onCancel,
  type = 'sms',
}) => {
  const { verifyOtp } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '']); // Changed to 4 digits
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(60); // 60 seconds countdown
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) { // Changed from index < 5 to index < 3
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4); // Changed from 6 to 4
    const newOtp = Array(4).fill('').map((_, i) => pastedData[i] || ''); // Changed from 6 to 4
    setOtp(newOtp);
    
    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtp.findIndex(val => !val);
    const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : 3; // Changed from 5 to 3
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    
    if (otpCode.length !== 4) { // Changed from 6 to 4
      setError('Please enter a complete 4-digit code'); // Updated message
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await verifyOtp(phone, otpCode, type);
      onSuccess?.();
    } catch (error: unknown) {
      console.error('OTP verification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify code';
      setError(errorMessage);
      
      // Clear OTP on error
      setOtp(['', '', '', '']); // Changed to 4 empty strings
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Simple phone number formatting for display
    if (phone.length >= 10) {
      const lastFour = phone.slice(-4);
      const masked = '*'.repeat(phone.length - 4);
      return `${masked}${lastFour}`;
    }
    return phone;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Verify your phone number
        </h3>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          We sent a 4-digit code to {formatPhoneNumber(phone)}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-error-800 dark:text-error-200">
                Verification Error
              </h3>
              <div className="mt-1 text-sm text-error-700 dark:text-error-300">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center space-x-3">
          {otp.map((digit, index) => (
                         <input
               key={index}
               ref={el => { inputRefs.current[index] = el; }}
               type="text"
              maxLength={1}
              value={digit}
              onChange={e => handleInputChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-12 h-12 text-center text-lg font-semibold border-2 border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:border-primary-500 focus:ring-primary-500 focus:outline-none transition-colors"
              disabled={isLoading}
            />
          ))}
        </div>

        <div className="flex space-x-3">
          <Button
            type="submit"
            className="flex-1"
            disabled={isLoading || otp.some(digit => !digit)}
            loading={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
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

      <div className="text-center">
        {timeRemaining > 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Resend code in {timeRemaining} seconds
          </p>
        ) : (
          <button
            type="button"
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            disabled={isLoading}
          >
            Resend code
          </button>
        )}
      </div>
    </div>
  );
}; 