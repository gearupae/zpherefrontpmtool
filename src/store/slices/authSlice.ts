import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../../api/client';
import { User, LoginCredentials, AuthTokens, RegisterData } from '../../types';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      // Try multiple backend auth patterns to avoid 405s across environments
      const tryJsonLogin = async (url: string) => apiClient.post(url, { email: credentials.email, password: credentials.password });
      const tryFormLogin = async (url: string) => {
        const form = new URLSearchParams();
        form.set('username', credentials.email);
        form.set('password', credentials.password);
        return apiClient.post(url, form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      };

      const attempts: Array<() => Promise<any>> = [
        () => tryJsonLogin('auth/login'),
        () => tryJsonLogin('auth/login/'),
        () => tryFormLogin('auth/login'),
        () => tryFormLogin('auth/login/'),
        () => tryFormLogin('auth/token'),
        () => tryFormLogin('auth/jwt/login'),
        () => tryFormLogin('login/access-token'),
      ];

      let response: any | null = null;
      let lastErr: any = null;
      for (const attempt of attempts) {
        try {
          response = await attempt();
          if (response?.data) break;
        } catch (e: any) {
          lastErr = e;
          // Continue to next attempt on 404/405/415/422
          const st = e?.response?.status;
          if (![404, 405, 415, 422].includes(st)) {
            throw e;
          }
        }
      }

      if (!response?.data) throw lastErr || new Error('Login endpoint not available');

      // Normalize token shape from various backends
      const raw = response.data || {};
      const tokens: AuthTokens = {
        access_token: raw.access_token || raw.access || raw.token || '',
        refresh_token: raw.refresh_token || raw.refresh || raw.refreshToken || '',
        token_type: raw.token_type || raw.tokenType || 'bearer',
      } as AuthTokens;

      if (!tokens.access_token) {
        throw new Error('No access token returned from server');
      }
      
      // Store tokens in localStorage
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token || '');
      
      // Get user profile with explicit Authorization header; try common endpoints
      const userEndpoints = ['auth/me', 'auth/me/', 'users/me', 'users/me/', 'me'];
      let userResponse: any | null = null;
      let uErr: any = null;
      for (const ep of userEndpoints) {
        try {
          const resp = await apiClient.get(ep, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
          if (resp?.data) { userResponse = resp; break; }
        } catch (e) {
          uErr = e;
          continue;
        }
      }
      if (!userResponse?.data) throw uErr || new Error('Failed to fetch current user');
      
      return {
        tokens,
        user: userResponse.data,
      };
    } catch (error: any) {
      const errorDetail = error?.response?.data?.detail;
      let errorMessage = 'Login failed';
      
      if (errorDetail) {
        if (typeof errorDetail === 'string') {
          errorMessage = errorDetail;
        } else if (Array.isArray(errorDetail)) {
          errorMessage = errorDetail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('auth/register', userData);
      return response.data;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Registration failed';
      
      if (errorDetail) {
        if (typeof errorDetail === 'string') {
          errorMessage = errorDetail;
        } else if (Array.isArray(errorDetail)) {
          errorMessage = errorDetail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const endpoints = ['auth/me', 'auth/me/', 'users/me', 'users/me/', 'me'];
      let response: any | null = null;
      let lastErr: any = null;
      for (const ep of endpoints) {
        try {
          const resp = await apiClient.get(ep);
          if (resp?.data) { response = resp; break; }
        } catch (e) {
          lastErr = e;
          continue;
        }
      }
      if (!response?.data) throw lastErr || new Error('Failed to get user');
      return response.data;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to get user';
      
      if (errorDetail) {
        if (typeof errorDetail === 'string') {
          errorMessage = errorDetail;
        } else if (Array.isArray(errorDetail)) {
          errorMessage = errorDetail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post('auth/refresh', {
        refresh_token: refreshToken,
      });

      const tokens = response.data;
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);

      return tokens;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Token refresh failed';
      
      if (errorDetail) {
        if (typeof errorDetail === 'string') {
          errorMessage = errorDetail;
        } else if (Array.isArray(errorDetail)) {
          errorMessage = errorDetail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateCurrentUser = createAsyncThunk(
  'auth/updateCurrentUser',
  async (userData: any, { rejectWithValue }) => {
    try {
      const response = await apiClient.put('users/me', userData);
      return response.data;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      let errorMessage = 'Failed to update user profile';
      
      if (errorDetail) {
        if (typeof errorDetail === 'string') {
          errorMessage = errorDetail;
        } else if (Array.isArray(errorDetail)) {
          errorMessage = errorDetail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      await apiClient.post('auth/logout');
    } catch (error) {
      // Ignore logout errors
    } finally {
      // Always clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.isAuthenticated = true;
        state.error = null;
        // Store user in localStorage for API client
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Get current user
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
        // Store user in localStorage for API client
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      
      // Update current user
      .addCase(updateCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Refresh token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.tokens = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
      })
      
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError, setTokens, clearAuth } = authSlice.actions;
export default authSlice.reducer;
