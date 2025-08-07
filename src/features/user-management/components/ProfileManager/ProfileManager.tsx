import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../auth';
import { Card, Button, Input, Alert } from '../../../../shared/design-system';
import { CustomPhoneInput } from '../../../auth/components/CustomPhoneInput';
import { validatePhoneNumber } from '../../../auth/utils/phoneValidation';
import { useForm, Controller } from 'react-hook-form';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const ProfileManager: React.FC = () => {
  const { user, dbUser, updatePassword, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      firstName: dbUser?.first_name || '',
      lastName: dbUser?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
    mode: 'onBlur',
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    mode: 'onBlur',
  });

  // Update form when user data changes
  useEffect(() => {
    profileForm.reset({
      firstName: dbUser?.first_name || '',
      lastName: dbUser?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  }, [user, dbUser, profileForm]);

  const handleProfileUpdate = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      await updateProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });
      
      setSuccessMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (data: PasswordFormData) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (data.newPassword !== data.confirmPassword) {
        passwordForm.setError('confirmPassword', {
          type: 'manual',
          message: 'Passwords do not match',
        });
        return;
      }

      await updatePassword(data.newPassword);
      setSuccessMessage('Password updated successfully!');
      passwordForm.reset();
    } catch (error) {
      console.error('Password update error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Status Messages */}
      {successMessage && (
        <Alert variant="success" dismissible onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}
      
      {errorMessage && (
        <Alert variant="error" dismissible onDismiss={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Personal Information */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Personal Information
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Update your personal details and contact information
          </p>
        </div>

        <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                id="firstName"
                label="First Name"
                placeholder="Enter your first name"
                {...profileForm.register('firstName', {
                  required: 'First name is required',
                  minLength: { value: 2, message: 'First name must be at least 2 characters' },
                })}
                error={profileForm.formState.errors.firstName?.message}
                disabled={isLoading}
                variant="filled"
              />
            </div>
            
            <div>
              <Input
                id="lastName"
                label="Last Name"
                placeholder="Enter your last name"
                {...profileForm.register('lastName', {
                  required: 'Last name is required',
                  minLength: { value: 2, message: 'Last name must be at least 2 characters' },
                })}
                error={profileForm.formState.errors.lastName?.message}
                disabled={isLoading}
                variant="filled"
              />
            </div>
          </div>

          <div>
            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="Enter your email address"
              {...profileForm.register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Please enter a valid email address',
                },
              })}
              error={profileForm.formState.errors.email?.message}
              disabled={true} // Email changes usually require re-verification
              variant="filled"
              className="opacity-60"
              helperText="Contact support to change your email address"
            />
          </div>

          <div>
            <Controller
              name="phone"
              control={profileForm.control}
              rules={{
                validate: validatePhoneNumber,
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <CustomPhoneInput
                  label="Phone Number"
                  placeholder="Enter your phone number"
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  error={profileForm.formState.errors.phone?.message}
                  disabled={isLoading}
                />
              )}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={isLoading}
              disabled={!profileForm.formState.isDirty || !profileForm.formState.isValid}
            >
              Update Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* Password Change */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Change Password
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Update your password to keep your account secure
          </p>
        </div>

        <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)} className="space-y-6">
          <div>
            <Input
              id="currentPassword"
              type="password"
              label="Current Password"
              placeholder="Enter your current password"
              {...passwordForm.register('currentPassword', {
                required: 'Current password is required',
              })}
              error={passwordForm.formState.errors.currentPassword?.message}
              disabled={isLoading}
              variant="filled"
            />
          </div>

          <div>
            <Input
              id="newPassword"
              type="password"
              label="New Password"
              placeholder="Enter your new password"
              {...passwordForm.register('newPassword', {
                required: 'New password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
                },
              })}
              error={passwordForm.formState.errors.newPassword?.message}
              disabled={isLoading}
              variant="filled"
            />
          </div>

          <div>
            <Input
              id="confirmPassword"
              type="password"
              label="Confirm New Password"
              placeholder="Confirm your new password"
              {...passwordForm.register('confirmPassword', {
                required: 'Please confirm your new password',
              })}
              error={passwordForm.formState.errors.confirmPassword?.message}
              disabled={isLoading}
              variant="filled"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={isLoading}
              disabled={!passwordForm.formState.isValid}
              variant="primary"
            >
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Account Information */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Account Information
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            View your account details
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              User ID
            </label>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 font-mono">
              {user?.id}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Account Created
            </label>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Last Sign In
            </label>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Email Verified
            </label>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {user?.email_confirmed_at ? '✅ Verified' : '❌ Not verified'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}; 