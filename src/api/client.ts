import axios, { AxiosResponse, AxiosError } from 'axios';
import { getApiBaseUrl, addTenantHeaders } from '../utils/tenantUtils';

const API_BASE_URL = getApiBaseUrl();

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // fail fast on long-hanging requests to avoid infinite spinners
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and tenant headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // IMPORTANT: Do not alter trailing slashes for mutating requests.
    // FastAPI routes in this project commonly define canonical paths with a trailing slash (e.g., "/customers/").
    // Stripping the slash can cause a 307 redirect, during which proxies or the browser may drop custom headers
    // (Authorization, X-Tenant-*), resulting in 401/403 errors. We therefore leave the URL exactly as the caller provided.
    
    // Add tenant context headers - try to get user info from localStorage as fallback
    let userRole;
    let userOrganization;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        userRole = user.role;
        // Get organization info from user
        if (user.organization_id && user.organization) {
          userOrganization = {
            id: user.organization_id,
            slug: user.organization.slug
          };
        }
      }
    } catch (e) {
      // Fallback - check if current path suggests admin context
      if (window.location.pathname.startsWith('/admin')) {
        userRole = 'ADMIN';
      }
    }
    
    // Add tenant headers if we have user role (admin users don't need organization)
    if (userRole) {
      const tenantHeaders = addTenantHeaders({}, userRole, userOrganization);
      Object.keys(tenantHeaders).forEach(key => {
        config.headers[key] = tenantHeaders[key];
      });
      console.log('🔧 API Request Debug:');
      console.log('  BaseURL:', config.baseURL);
      console.log('  URL:', config.url);
      console.log('  Method:', config.method);
      console.log('  User Role:', userRole);
      console.log('  User Organization:', userOrganization);
      console.log('  Tenant Headers:', tenantHeaders);
      console.log('  Auth Token:', config.headers.Authorization ? 'Present' : 'Missing');
    } else {
      // If no user data, this might be an unauthenticated request
      console.warn('⚠️ Making API request without tenant context - user may not be logged in', {
        url: config.url,
        method: config.method,
        localStorage_user: localStorage.getItem('user'),
        localStorage_token: localStorage.getItem('access_token') ? 'Present' : 'Missing'
      });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    // Handle 403 Forbidden errors (likely missing tenant context)
    if (error.response?.status === 403) {
      console.error('🚨 403 Forbidden Error - Detailed Debug:');
      console.error('  URL:', error.config?.url);
      console.error('  Method:', error.config?.method);
      console.error('  Request Headers:', error.config?.headers);
      console.error('  Response Data:', error.response?.data);
      console.error('  LocalStorage User:', localStorage.getItem('user'));
      console.error('  LocalStorage Token:', localStorage.getItem('access_token') ? 'Present' : 'Missing');
      
      // Check if user is actually logged in
      const token = localStorage.getItem('access_token');
      const user = localStorage.getItem('user');

      // If backend explicitly says not authenticated or tenant context missing, send to login
      try {
        const detail = (error.response?.data as any)?.detail || '';
        if (typeof detail === 'string') {
          const d = detail.toLowerCase();
          if (d.includes('not authenticated') || d.includes('tenant context')) {
            console.warn('↪ Redirecting to /login due to 403 detail:', detail);
            window.location.href = '/login';
            return Promise.reject(error);
          }
        }
      } catch {}
      
      if (!token || !user) {
        console.error('🔄 Redirecting to login - missing auth data');
        window.location.href = '/login';
        return Promise.reject(error);
      } else {
        console.error('🔍 User appears to be logged in but getting 403. Check tenant headers above.');
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
