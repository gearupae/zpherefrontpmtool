/**
 * Enhanced debugging utilities for API requests and authentication issues
 */

interface ApiErrorDetails {
  status?: number;
  statusText?: string;
  data?: any;
  headers?: Record<string, string>;
  config?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  };
}

/**
 * Enhanced error logging for API requests
 */
export function logApiError(error: any, context: string = 'API Request') {
  console.group(`🚨 ${context} Error`);
  
  if (error.response) {
    // Server responded with error status
    const details: ApiErrorDetails = {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data,
      headers: error.response.headers,
      config: {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        headers: error.config?.headers
      }
    };
    
    console.log('📊 Response Status:', details.status);
    console.log('📄 Status Text:', details.statusText);
    console.log('🔗 Request URL:', details.config?.url);
    console.log('🔧 Request Method:', details.config?.method);
    console.log('📦 Error Data:', details.data);
    console.log('🔑 Request Headers:', details.config?.headers);
    console.log('📨 Response Headers:', details.headers);
    
    // Specific error analysis
    if (details.status === 403) {
      console.log('🔍 403 Forbidden Analysis:');
      console.log('  - User is authenticated but lacks permissions');
      console.log('  - Check user role and permissions');
      console.log('  - Verify tenant/organization headers');
      console.log('  - Check if user account is activated');
    } else if (details.status === 401) {
      console.log('🔍 401 Unauthorized Analysis:');
      console.log('  - Authentication failed');
      console.log('  - Token may be expired or invalid');
      console.log('  - Check if user is logged in');
      console.log('  - Verify token format and content');
    }
    
  } else if (error.request) {
    // Request was made but no response received
    console.log('📡 Network Error - No Response Received');
    console.log('Request:', error.request);
  } else {
    // Something else happened
    console.log('⚠️ Request Setup Error:', error.message);
  }
  
  console.log('🔧 Full Error Object:', error);
  console.groupEnd();
}

/**
 * Debug current authentication state
 */
export function debugAuthState() {
  console.group('🔐 Authentication State Debug');
  
  const token = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  const userStr = localStorage.getItem('user');
  
  console.log('🎫 Access Token:', token ? `${token.substring(0, 50)}...` : 'Not found');
  console.log('🔄 Refresh Token:', refreshToken ? `${refreshToken.substring(0, 50)}...` : 'Not found');
  
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      console.log('👤 User Data:', {
        email: user.email,
        role: user.role,
        status: user.status,
        is_active: user.is_active,
        organization_id: user.organization_id,
        organization: user.organization
      });
      
      // Check if user can create customers
      console.log('🎯 User Capabilities:');
      console.log('  - Is Manager:', ['ADMIN', 'MANAGER'].includes(user.role));
      console.log('  - Is Active:', user.is_active);
      console.log('  - Status:', user.status);
      console.log('  - Has Organization:', !!user.organization_id);
      
    } catch (e) {
      console.log('❌ Failed to parse user data:', e);
      console.log('Raw user data:', userStr);
    }
  } else {
    console.log('❌ No user data found in localStorage');
  }
  
  console.groupEnd();
}

/**
 * Test API endpoint with detailed logging
 */
export async function testApiEndpoint(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  additionalHeaders?: Record<string, string>
) {
  console.group(`🧪 Testing ${method} ${url}`);
  
  try {
    const { default: apiClient } = await import('../api/client');
    
    const config = {
      method: method.toLowerCase(),
      url,
      ...(data && { data }),
      ...(additionalHeaders && { headers: additionalHeaders })
    };
    
    console.log('📋 Request Config:', config);
    
    const response = await apiClient.request(config);
    
    console.log('✅ Success!');
    console.log('📊 Status:', response.status);
    console.log('📦 Data:', response.data);
    console.log('🔑 Headers:', response.headers);
    
    return response;
    
  } catch (error) {
    logApiError(error, `${method} ${url}`);
    throw error;
  } finally {
    console.groupEnd();
  }
}

/**
 * Validate tenant headers
 */
export function validateTenantHeaders() {
  console.group('🏢 Tenant Headers Validation');
  
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    console.log('❌ No user data - cannot validate tenant headers');
    console.groupEnd();
    return false;
  }
  
  try {
    const user = JSON.parse(userStr);
    
    console.log('👤 User Role:', user.role);
    console.log('🏢 Organization ID:', user.organization_id);
    console.log('🏷️ Organization:', user.organization);
    
    if (user.role === 'ADMIN' && !user.organization_id) {
      console.log('✅ Platform admin - no organization required');
      return true;
    }
    
    if (!user.organization_id) {
      console.log('❌ User missing organization_id');
      return false;
    }
    
    if (!user.organization?.slug) {
      console.log('❌ User missing organization slug');
      return false;
    }
    
    console.log('✅ Tenant context is valid');
    return true;
    
  } catch (e) {
    console.log('❌ Failed to parse user data:', e);
    return false;
  } finally {
    console.groupEnd();
  }
}

/**
 * Enhanced customer creation with debugging
 */
export async function debugCustomerCreation(customerData: any) {
  console.group('🧪 Debug Customer Creation');
  
  // Pre-flight checks
  debugAuthState();
  validateTenantHeaders();
  
  try {
    const response = await testApiEndpoint('POST', '/customers/', customerData);
    console.log('✅ Customer created successfully!', response.data);
    return response.data;
  } catch (error) {
    console.log('❌ Customer creation failed');
    
    // Additional debugging suggestions
    console.group('🔧 Debugging Suggestions');
    console.log('1. Check if backend server is running');
    console.log('2. Verify user has MANAGER or ADMIN role');
    console.log('3. Confirm user status is ACTIVE');
    console.log('4. Check organization is active');
    console.log('5. Verify all required fields are provided');
    console.log('6. Test with a different user account');
    console.groupEnd();
    
    throw error;
  } finally {
    console.groupEnd();
  }
}
