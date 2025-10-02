import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { addNotification } from '../../store/slices/uiSlice';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import GoogleSignIn from '../../components/Auth/GoogleSignIn';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import apiClient from '../../api/client';

const RegisterPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    acceptTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.organizationName) {
      dispatch(addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields',
        duration: 5000,
      }));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      dispatch(addNotification({
        type: 'error',
        title: 'Password Mismatch',
        message: 'Passwords do not match',
        duration: 5000,
      }));
      return;
    }

    if (formData.password.length < 8) {
      dispatch(addNotification({
        type: 'error',
        title: 'Weak Password',
        message: 'Password must be at least 8 characters long',
        duration: 5000,
      }));
      return;
    }

    if (!formData.acceptTerms) {
      dispatch(addNotification({
        type: 'error',
        title: 'Terms Required',
        message: 'Please accept the terms and conditions',
        duration: 5000,
      }));
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/register', {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        organization_name: formData.organizationName
      });

      if (response.status >= 200 && response.status < 300) {
        dispatch(addNotification({
          type: 'success',
          title: 'Registration Successful!',
          message: 'Your account and organization have been created. Please sign in.',
          duration: 5000,
        }));
        navigate('/pricing');
      }
    } catch (error: any) {
      const errorData = error?.response?.data || {};
      let errorMessage = 'Registration failed';
      if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      console.error('Registration error:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Registration Failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        duration: 7000,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-text-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">Z</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-secondary-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-gray-600 hover:text-primary-500 cursor-pointer"
            >
              Sign in here
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-secondary-700">
                  First Name *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-secondary-700">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Organization Name */}
            <div>
              <label htmlFor="organizationName" className="block text-sm font-medium text-secondary-700">
                Organization Name *
              </label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                placeholder="Your Company Name"
                value={formData.organizationName}
                onChange={handleChange}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-secondary-700">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                placeholder="john@company.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-secondary-700">
                Password *
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="block w-full px-3 py-2 pr-10 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={handleChange}
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700">
                Confirm Password *
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="block w-full px-3 py-2 pr-10 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-secondary-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-secondary-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-center">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                required
                className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-secondary-300 rounded"
                checked={formData.acceptTerms}
                onChange={handleChange}
              />
              <label htmlFor="acceptTerms" className="ml-2 block text-sm text-secondary-900">
                I agree to the{' '}
                <a href="#" className="text-gray-600 hover:text-primary-500">
                  Terms and Conditions
                </a>{' '}
                and{' '}
                <a href="#" className="text-gray-600 hover:text-primary-500">
                  Privacy Policy
                </a>
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-user-blue hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
        {/* Google Sign-up */}
        <div className="mt-4">
          <GoogleSignIn />
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
