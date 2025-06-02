import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import Login from '../../components/Login';
import UserRegistration from '../../components/UserRegistration';
import UserProfile from '../../components/UserProfile';
import MainLayout from '../../components/MainLayout';

// Mock the API services
jest.mock('../../services/api', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn()
  }
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

const { authApi } = require('../../services/api');

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('User Login Workflow', () => {
    it('should authenticate user with valid credentials', async () => {
      const mockUser = {
        id: 1,
        username: 'john.doe',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'admin'
      };

      const mockAuthResponse = {
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
        user: mockUser
      };

      authApi.login.mockResolvedValue({ data: mockAuthResponse });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // Fill login form
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(usernameInput, { target: { value: 'john.doe' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      // Verify login API call
      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith({
          username: 'john.doe',
          password: 'password123'
        });
      });

      // Verify tokens are stored
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('access_token', 'mock-access-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refresh_token', 'mock-refresh-token');

      // Verify navigation to dashboard
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should show error for invalid credentials', async () => {
      authApi.login.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Invalid credentials' }
        }
      });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(usernameInput, { target: { value: 'wrong.user' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(loginButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Verify no tokens are stored
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should validate required login fields', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(loginButton);

      // Check for validation errors
      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      // Verify API was not called
      expect(authApi.login).not.toHaveBeenCalled();
    });

    it('should handle network errors during login', async () => {
      authApi.login.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(usernameInput, { target: { value: 'john.doe' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Registration Workflow', () => {
    it('should register new user successfully', async () => {
      const newUser = {
        username: 'jane.smith',
        email: 'jane@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        password: 'securepassword123',
        role: 'technician'
      };

      const mockRegistrationResponse = {
        id: 2,
        ...newUser,
        password: undefined // Password not returned
      };

      authApi.register.mockResolvedValue({ data: mockRegistrationResponse });

      render(
        <TestWrapper>
          <UserRegistration />
        </TestWrapper>
      );

      // Fill registration form
      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const roleSelect = screen.getByLabelText(/role/i);

      fireEvent.change(usernameInput, { target: { value: 'jane.smith' } });
      fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
      fireEvent.change(lastNameInput, { target: { value: 'Smith' } });
      fireEvent.change(passwordInput, { target: { value: 'securepassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'securepassword123' } });
      fireEvent.change(roleSelect, { target: { value: 'technician' } });

      const registerButton = screen.getByRole('button', { name: /register/i });
      fireEvent.click(registerButton);

      // Verify registration API call
      await waitFor(() => {
        expect(authApi.register).toHaveBeenCalledWith(expect.objectContaining({
          username: 'jane.smith',
          email: 'jane@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          password: 'securepassword123',
          role: 'technician'
        }));
      });

      // Verify success message and navigation
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should validate password confirmation', async () => {
      render(
        <TestWrapper>
          <UserRegistration />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });

      const registerButton = screen.getByRole('button', { name: /register/i });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      expect(authApi.register).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      render(
        <TestWrapper>
          <UserRegistration />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      const registerButton = screen.getByRole('button', { name: /register/i });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('should handle username already exists error', async () => {
      authApi.register.mockRejectedValue({
        response: {
          status: 400,
          data: { username: ['Username already exists'] }
        }
      });

      render(
        <TestWrapper>
          <UserRegistration />
        </TestWrapper>
      );

      const usernameInput = screen.getByLabelText(/username/i);
      fireEvent.change(usernameInput, { target: { value: 'existing.user' } });

      // Fill other required fields
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

      const registerButton = screen.getByRole('button', { name: /register/i });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Profile Management Workflow', () => {
    it('should load and display user profile', async () => {
      const mockUser = {
        id: 1,
        username: 'john.doe',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'admin',
        phone: '555-1234',
        address: '123 Main St'
      };

      authApi.getCurrentUser.mockResolvedValue({ data: mockUser });

      render(
        <TestWrapper>
          <UserProfile />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('john.doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument();
      });
    });

    it('should update user profile information', async () => {
      const mockUser = {
        id: 1,
        username: 'john.doe',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '555-1234'
      };

      const updatedUser = {
        ...mockUser,
        phone: '555-5678',
        address: '456 Oak Ave'
      };

      authApi.getCurrentUser.mockResolvedValue({ data: mockUser });
      authApi.updateProfile.mockResolvedValue({ data: updatedUser });

      render(
        <TestWrapper>
          <UserProfile />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument();
      });

      // Update phone number
      const phoneInput = screen.getByDisplayValue('555-1234');
      fireEvent.change(phoneInput, { target: { value: '555-5678' } });

      // Add address
      const addressInput = screen.getByLabelText(/address/i);
      fireEvent.change(addressInput, { target: { value: '456 Oak Ave' } });

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(authApi.updateProfile).toHaveBeenCalledWith(expect.objectContaining({
          phone: '555-5678',
          address: '456 Oak Ave'
        }));
      });

      expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
    });

    it('should change user password', async () => {
      const mockUser = {
        id: 1,
        username: 'john.doe',
        email: 'john@example.com'
      };

      authApi.getCurrentUser.mockResolvedValue({ data: mockUser });
      authApi.changePassword.mockResolvedValue({ data: { message: 'Password changed successfully' } });

      render(
        <TestWrapper>
          <UserProfile />
        </TestWrapper>
      );

      // Click change password button
      const changePasswordButton = screen.getByText(/change password/i);
      fireEvent.click(changePasswordButton);

      // Fill password form
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmNewPasswordInput = screen.getByLabelText(/confirm new password/i);

      fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
      fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
      fireEvent.change(confirmNewPasswordInput, { target: { value: 'newpassword123' } });

      const submitPasswordButton = screen.getByRole('button', { name: /update password/i });
      fireEvent.click(submitPasswordButton);

      await waitFor(() => {
        expect(authApi.changePassword).toHaveBeenCalledWith({
          current_password: 'oldpassword',
          new_password: 'newpassword123'
        });
      });

      expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
    });
  });

  describe('Authentication State Management', () => {
    it('should maintain authentication state across app navigation', async () => {
      const mockUser = {
        id: 1,
        username: 'john.doe',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      // Mock stored token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'access_token') return 'mock-access-token';
        if (key === 'refresh_token') return 'mock-refresh-token';
        return null;
      });

      authApi.getCurrentUser.mockResolvedValue({ data: mockUser });

      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Verify user is authenticated and navigation is available
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument(); // User name in nav
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/customers/i)).toBeInTheDocument();
        expect(screen.getByText(/jobs/i)).toBeInTheDocument();
      });
    });

    it('should logout user and clear authentication state', async () => {
      const mockUser = {
        id: 1,
        username: 'john.doe',
        email: 'john@example.com'
      };

      mockLocalStorage.getItem.mockReturnValue('mock-access-token');
      authApi.getCurrentUser.mockResolvedValue({ data: mockUser });
      authApi.logout.mockResolvedValue({});

      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('john.doe')).toBeInTheDocument();
      });

      // Click logout
      const logoutButton = screen.getByText(/logout/i);
      fireEvent.click(logoutButton);

      // Verify logout API call and token cleanup
      await waitFor(() => {
        expect(authApi.logout).toHaveBeenCalled();
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token');
      });

      // Verify navigation to login
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should handle expired token and redirect to login', async () => {
      mockLocalStorage.getItem.mockReturnValue('expired-token');
      authApi.getCurrentUser.mockRejectedValue({
        response: { status: 401 }
      });

      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Verify redirect to login for expired token
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });

      // Verify tokens are cleared
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('Role-based Access Control', () => {
    it('should show admin features for admin users', async () => {
      const adminUser = {
        id: 1,
        username: 'admin.user',
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User'
      };

      mockLocalStorage.getItem.mockReturnValue('mock-admin-token');
      authApi.getCurrentUser.mockResolvedValue({ data: adminUser });

      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/user management/i)).toBeInTheDocument();
        expect(screen.getByText(/analytics/i)).toBeInTheDocument();
        expect(screen.getByText(/settings/i)).toBeInTheDocument();
      });
    });

    it('should hide admin features for technician users', async () => {
      const technicianUser = {
        id: 2,
        username: 'tech.user',
        role: 'technician',
        first_name: 'Tech',
        last_name: 'User'
      };

      mockLocalStorage.getItem.mockReturnValue('mock-tech-token');
      authApi.getCurrentUser.mockResolvedValue({ data: technicianUser });

      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/jobs/i)).toBeInTheDocument();
        expect(screen.getByText(/customers/i)).toBeInTheDocument();
      });

      // Admin features should not be visible
      expect(screen.queryByText(/user management/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/analytics/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Recovery in Authentication', () => {
    it('should recover from network errors during login', async () => {
      // First attempt fails
      authApi.login.mockRejectedValueOnce(new Error('Network error'));
      
      // Second attempt succeeds
      const mockAuthResponse = {
        access: 'mock-token',
        user: { id: 1, username: 'john.doe' }
      };
      authApi.login.mockResolvedValueOnce({ data: mockAuthResponse });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(usernameInput, { target: { value: 'john.doe' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // First attempt
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Retry
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle session timeout gracefully', async () => {
      const mockUser = { id: 1, username: 'john.doe' };
      
      mockLocalStorage.getItem.mockReturnValue('valid-token');
      authApi.getCurrentUser.mockResolvedValueOnce({ data: mockUser });

      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('john.doe')).toBeInTheDocument();
      });

      // Simulate session timeout
      authApi.getCurrentUser.mockRejectedValue({
        response: { status: 401, data: { message: 'Token expired' } }
      });

      // Trigger a request that would check authentication
      const profileButton = screen.getByText(/profile/i);
      fireEvent.click(profileButton);

      await waitFor(() => {
        expect(screen.getByText(/session expired/i)).toBeInTheDocument();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });
});