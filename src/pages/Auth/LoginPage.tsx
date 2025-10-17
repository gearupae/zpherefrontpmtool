import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { login, clearError } from '../../store/slices/authSlice';
import { addNotification } from '../../store/slices/uiSlice';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import GoogleSignIn from '../../components/Auth/GoogleSignIn';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const fromPath = (location.state as any)?.from?.pathname as string | undefined;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      dispatch(addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all fields',
        duration: 5000,
      }));
      return;
    }

    try {
      const result = await dispatch(login({ email, password }));
      
      if (login.fulfilled.match(result)) {
        dispatch(addNotification({
          type: 'success',
          title: 'Welcome back!',
          message: 'You have been successfully logged in.',
          duration: 3000,
        }));
        
        // Navigate back to the originally requested route if available
        const user = result.payload.user;
        if (fromPath && fromPath !== '/login') {
          navigate(fromPath);
        } else if (user?.organization && user.organization.slug) {
          navigate(`/${user.organization.slug}/dashboard`);
        } else if ((user?.role || '').toUpperCase() === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        // Error is already handled by the Redux slice
        dispatch(addNotification({
          type: 'error',
          title: 'Login Failed',
          message: result.payload as string || 'Invalid email or password',
          duration: 5000,
        }));
      }
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Login Failed',
        message: 'An unexpected error occurred',
        duration: 5000,
      }));
    }
  };

  React.useEffect(() => {
    // If already authenticated and a return path exists, go there
    if (isAuthenticated) {
      if (fromPath && fromPath !== '/login') {
        navigate(fromPath);
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, navigate, fromPath]);

  React.useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-502 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-text-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">Z</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-secondary-600">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-gray-600 hover:text-primary-500 cursor-pointer transition-colors duration-200 underline-offset-2 hover:underline"
            >
              create a new account
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full py-2 border border-secondary-300 placeholder-secondary-500 text-secondary-900 rounded-t-md focus:outline-none focus:ring-gray-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="relative block w-full py-2 pr-10 border border-secondary-300 placeholder-secondary-500 text-secondary-900 rounded-b-md focus:outline-none focus:ring-gray-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-secondary-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-secondary-400" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-secondary-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-secondary-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a
                href="#"
                className="font-medium text-gray-600 hover:text-primary-500"
              >
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-md bg-error-50 p-4">
              <div className="text-sm text-error-700">
                {error}
              </div>
            </div>
          )}
        </form>
        {/* Google Sign-in */}
        <div className="mt-4">
          <GoogleSignIn />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
