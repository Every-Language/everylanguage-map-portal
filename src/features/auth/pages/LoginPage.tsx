import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { PhoneLoginForm } from '../components/PhoneLoginForm';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');

  const handleLoginSuccess = () => {
    const params = new URLSearchParams(location.search)
    const next = params.get('next') || '/dashboard'
    navigate(next);
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  const handleSignUpRedirect = () => {
    navigate('/register');
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

        {/* Login Card */}
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl shadow-xl dark:shadow-dark-card p-8 animate-scale-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="text-left">
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent-600 to-accent-600 dark:from-accent-600 dark:to-accent-600">
                  Log in to Every Language
                </h1>
              </div>
            </div>
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