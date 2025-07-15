import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { useTheme } from '../../../shared/theme';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleLoginSuccess = () => {
    navigate('/dashboard');
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  const handleSignUpRedirect = () => {
    navigate('/register');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-100 via-primary-50 to-accent-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-accent-900/20 flex items-center justify-center p-4 transition-theme">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-accent-200/20 to-transparent dark:from-accent-800/20 rounded-full animate-float"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent-300/20 to-transparent dark:from-accent-700/20 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
            className="p-2 rounded-lg bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-neutral-700 transition-all duration-200"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'light' ? (
              <svg className="h-5 w-5 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl shadow-xl dark:shadow-dark-card p-8 animate-scale-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="text-left">
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent-600 to-accent-600 dark:from-accent-600 dark:to-accent-600">
                  OMT Audio Uploader
                </h1>
              </div>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400">
              Upload and manage your OMT projects.
            </p>
          </div>

          {/* Login Form */}
          <LoginForm
            onSuccess={handleLoginSuccess}
            onForgotPassword={handleForgotPassword}
            onSignUpRedirect={handleSignUpRedirect}
          />
        </div>
      </div>
    </div>
  );
}; 