// Mock API client for testing login functionality
// Use this temporarily while the backend relationship issue is being resolved

export const mockLogin = async (email: string, password: string) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test credentials
  if (email === 'test@example.com' && password === 'password123') {
    return {
      data: {
        access_token: 'mock-access-token-12345',
        refresh_token: 'mock-refresh-token-67890',
        token_type: 'bearer',
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'admin'
        }
      }
    };
  } else {
    throw new Error('Invalid credentials');
  }
};

export const mockGetCurrentUser = async () => {
  return {
    data: {
      id: 'test-user-id',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'admin'
    }
  };
};
