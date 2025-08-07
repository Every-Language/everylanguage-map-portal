import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { PhoneLoginForm } from '../components/PhoneLoginForm';
import { useTheme } from '../../../shared/theme';

export function LoginPage() {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
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

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getThemeIcon = () => {
    if (theme === 'system') {
      return (
        <svg className="h-5 w-5 text-neutral-600 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    } else if (theme === 'dark' || resolvedTheme === 'dark') {
      return (
        <svg className="h-5 w-5 text-neutral-600 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
    } else {
      return (
        <svg className="h-5 w-5 text-neutral-600 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Light mode';
      case 'dark': return 'Dark mode';
      case 'system': return 'System mode';
      default: return 'Toggle theme';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-100 via-primary-50 to-accent-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-600 flex items-center justify-center p-4 transition-theme">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-accent-200/20 to-transparent dark:from-accent-800/20 rounded-full animate-float"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent-300/20 to-transparent dark:from-accent-700/20 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Theme Toggle */}
        <div className="absolute -top-16 right-0 flex items-center space-x-3">
          <span className="text-sm text-neutral-600 dark:text-neutral-400 hidden sm:block">
            {getThemeLabel()}
          </span>
          <div className="relative group">
            <button
              onClick={cycleTheme}
              className="p-3 rounded-xl bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md hover:bg-white dark:hover:bg-neutral-700 transition-all duration-300 shadow-lg hover:shadow-xl border border-neutral-200/50 dark:border-neutral-700/50"
              aria-label={`Current: ${getThemeLabel()}. Click to cycle theme`}
            >
              {getThemeIcon()}
            </button>
            {/* Tooltip */}
            <div className="absolute -bottom-12 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs px-3 py-1 rounded-lg whitespace-nowrap">
                {getThemeLabel()}
                <div className="absolute top-0 right-4 transform -translate-y-1/2 rotate-45 w-2 h-2 bg-neutral-900 dark:bg-neutral-100"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl shadow-xl dark:shadow-dark-card p-8 animate-scale-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="text-left">
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent-600 to-accent-600 dark:from-accent-600 dark:to-accent-600">
                  OMT Project Manager
                </h1>
              </div>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400">
              Upload and manage your OMT projects.
            </p>
          </div>

          {/* Method Selection Tabs */}
          <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1 mb-6">
            <button
              type="button"
              onClick={() => setLoginMethod('email')}
              className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors ${
                loginMethod === 'email'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('phone')}
              className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors ${
                loginMethod === 'phone'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              Phone
            </button>
          </div>

          {loginMethod === 'phone' ? (
            <PhoneLoginForm onSuccess={handleLoginSuccess} />
          ) : (
            <LoginForm
              onSuccess={handleLoginSuccess}
              onForgotPassword={handleForgotPassword}
              onSignUpRedirect={handleSignUpRedirect}
            />
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 